import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { RunEvent, Verdict } from '../../../packages/shared/src/types.js';
import { GOC } from './paths.js';
import { mucTuMeta } from './ledger.js';
import * as kho from './kho/kho-run.js';
import { ghiSoCaiNeuChua } from './kho/kho-socai.js';

export interface StoredEvent {
  t: number; // ms từ lúc bắt đầu run
  e: RunEvent;
}

export interface RunMeta {
  id: string;
  tieuDe: string;
  skill: 'code' | 'doc';
  trangThai: 'dang_chay' | 'xong' | 'loi';
  batDau: string;
  ketThuc?: string; // set khi tiến trình kết thúc — cả lượt xong lẫn lượt lỗi, để tính thời gian chạy
  /** owner/repo của lượt chấm — lịch sử và sổ cái lọc theo trường này */
  repo?: string;
  verdict?: Verdict;
  pr?: { so: number; headSha: string; tacGia?: string };
  /**
   * CHỈ ĐỌC — suy ra từ `so_cong` lúc đọc (R6.26). Đặt giá trị vào đây KHÔNG ghi được xuống đâu cả;
   * muốn khai một hành động cổng thì ghi sổ.
   * `ngoaiCong` — R6.21: hàng do ĐỐI SOÁT ghi phải phân biệt được ở mức DỮ LIỆU, kể cả trên bề mặt này.
   */
  ketQuaCong?: { hanhDong: 'merge' | 'reject'; luc: string; nguoi: string; chiTiet: string; ngoaiCong?: boolean };
}

interface RunState {
  meta: RunMeta;
  events: StoredEvent[];
  subs: Set<(ev: StoredEvent) => void>;
}

export class RunManager {
  private runs = new Map<string, RunState>();
  // hook chế độ trực: gọi khi một run kết thúc CÓ verdict (sau khi đã ghi sổ cái)
  onXong?: (meta: RunMeta) => void;

  /** Dọn xác lượt chấm của lần chạy trước — gọi MỘT lần lúc khởi động, xem kho-run.donLuotMoCoi */
  donLuotMoCoi(): string[] {
    return kho.donLuotMoCoi();
  }

  soDangChay(): number {
    return kho.soDangChay();
  }

  batDau(
    tieuDe: string,
    skill: 'code' | 'doc',
    args: string[],
    envThem: NodeJS.ProcessEnv = {},
    pr?: { so: number; headSha: string; tacGia?: string },
    repo?: string,
  ): string {
    const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const meta: RunMeta = { id, tieuDe, skill, trangThai: 'dang_chay', batDau: new Date().toISOString(), pr, repo };
    const state: RunState = { meta, events: [], subs: new Set() };
    this.runs.set(id, state);
    // Ghi vào kho NGAY khi bắt đầu: trần số lượt song song và cờ "PR này đang chấm" nay đọc từ cơ sở
    // dữ liệu, nên một lượt chưa vào kho là một lượt vô hình với các cổng đó.
    kho.luuMeta(meta);

    const t0 = Date.now();
    const ghi = (e: RunEvent): void => {
      const ev: StoredEvent = { t: Date.now() - t0, e };
      state.events.push(ev);
      for (const s of state.subs) s(ev);
    };

    const child = spawn('npx', ['tsx', 'packages/harness/src/cli.ts', 'run', ...args, '--json'], {
      cwd: GOC,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...envThem },
    });
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        let e: RunEvent;
        try { e = JSON.parse(line) as RunEvent; } catch { return; } // L10: dòng stdout không phải JSON — bỏ qua, đừng chết run
        ghi(e);
        if (e.type === 'verdict') meta.verdict = e.verdict;
      } catch {
        ghi({ type: 'log', msg: line.slice(0, 300) });
      }
    });
    const duoiStderr: string[] = [];
    const rlErr = createInterface({ input: child.stderr });
    rlErr.on('line', (line) => {
      if (line.trim()) {
        duoiStderr.push(line.trim());
        if (duoiStderr.length > 8) duoiStderr.shift();
      }
      // chỉ chuyển tiếp thông báo hữu ích (retry model...), bỏ noise npm/npx
      if (/model/i.test(line)) ghi({ type: 'log', msg: line.trim() });
    });
    child.on('close', (code) => {
      meta.ketThuc = new Date().toISOString();
      const daCoLoi = state.events.some((x) => x.e.type === 'error');
      if (meta.verdict) {
        meta.trangThai = 'xong';
        const muc = mucTuMeta(meta);
        // Sổ cái chỉ ghi thêm (R9.4): chạy lại cùng một run không được ghi đè, và cũng không được
        // làm sập lượt — dùng đường bỏ-qua-nếu-đã-có.
        if (muc) ghiSoCaiNeuChua(muc);
        try {
          this.onXong?.(meta);
        } catch (e) {
          console.error('onXong:', (e as Error).message);
        }
      }
      else {
        meta.trangThai = 'loi';
        if (!daCoLoi) {
          const goiY =
            code === 4
              ? 'Nguyên nhân: cấu hình provider không hợp lệ — kiểm tra ⚙ Cài đặt → mục Agent review (provider / model / API key).'
              : 'Chưa rõ nguyên nhân — xem log máy chủ. Nếu vừa đổi cấu hình, kiểm tra ⚙ Cài đặt → mục Agent review trước tiên.';
          const duoi = duoiStderr.length ? ` · Log cuối: ${duoiStderr.slice(-3).join(' | ').slice(0, 400)}` : '';
          ghi({ type: 'error', msg: `Run dừng giữa chừng, không có verdict (mã thoát ${code}). ${goiY}${duoi}` });
        }
      }
      this.luu(state);
      for (const s of state.subs) s({ t: Date.now() - t0, e: { type: 'log', msg: '__END__' } });
    });
    return id;
  }

  lay(id: string): RunState | undefined {
    if (this.runs.has(id)) return this.runs.get(id);
    // Lượt đã kết thúc (hoặc do tiến trình khác chạy): dựng lại từ kho để phát lại
    const meta = kho.docMeta(id);
    if (!meta) return undefined;
    const state: RunState = { meta, events: kho.docSuKien(id), subs: new Set() };
    this.runs.set(id, state);
    return state;
  }

  /**
   * Danh sách lượt chấm. Trước đây hàm này đọc TOÀN BỘ thư mục và nạp cả dòng sự kiện lên bộ nhớ
   * mỗi lần được gọi, rồi cắt còn 30 — nghĩa là trang lịch sử bị chặn ở 30 lượt mà không ai khai.
   * Nay lọc và phân trang chạy dưới cơ sở dữ liệu, dòng sự kiện chỉ đọc khi thật sự phát lại.
   */
  danhSach(loc: kho.LocRun = {}): RunMeta[] {
    return kho.danhSachRun({ gioi_han: 30, ...loc });
  }

  dem(loc: kho.LocRun = {}): number {
    return kho.demRun(loc);
  }

  // Verdict đã chấm cho đúng cặp (PR, commit) — nền tảng cho idempotent theo SHA
  timTheoPr(so: number, sha: string): RunMeta | undefined {
    return kho.timTheoPr(so, sha);
  }

  // Các PR đã bị trả về dev — để hàng đợi không đánh mất việc
  daTraVe(): RunMeta[] {
    return kho.daTraVe();
  }

  dangChayPr(so: number): boolean {
    return kho.dangChayPr(so);
  }

  /**
   * R6.26 — bề mặt trong bộ nhớ ĐỌC LẠI từ sổ sau khi sổ vừa được ghi. Không còn hàm nào NHẬN cụm
   * hành động cổng để đặt vào bề mặt: nơi duy nhất khai một hành động cổng là sổ chỉ-ghi-thêm.
   */
  dongBoCongTuSo(id: string): void {
    const st = this.lay(id);
    if (st) st.meta.ketQuaCong = kho.docMeta(id)?.ketQuaCong;
  }

  /** Hành động cổng ĐANG có trong sổ cho lượt này — đọc tươi, không tin bản trong bộ nhớ. */
  congHienTai(id: string): RunMeta['ketQuaCong'] {
    return kho.docMeta(id)?.ketQuaCong;
  }

  private luu(state: RunState): void {
    kho.luuMeta(state.meta);
    kho.luuSuKien(state.meta.id, state.events);
  }
}
