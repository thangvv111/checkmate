import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { RunEvent, Verdict } from '../../../packages/shared/src/types.js';
import { GOC } from '../../../packages/shared/src/paths.js';
import { entryFromMeta } from './ledger.js';
import * as kho from './store/run-store.js';
import { appendVerdictLedgerIfNew } from './store/ledger-store.js';

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
  /** Sổ sự kiện trên đĩa của lượt này — NGUỒN SỰ THẬT; bộ nhớ và cơ sở dữ liệu là bản đọc. */
  duongSo?: string;
  /** Đã đọc tới byte nào của sổ. */
  daDoc?: number;
  /**
   * Phần đuôi chưa thành dòng trọn vẹn — tiến trình con có thể đang ghi dở đúng lúc mình đọc.
   * Giữ dạng Buffer chứ KHÔNG phải chuỗi: cắt theo byte có thể rơi vào giữa một ký tự UTF-8 nhiều
   * byte, mà log ở đây toàn tiếng Việt. Ghép ở tầng chuỗi là đẻ ra ký tự thay thế, im lặng.
   */
  du?: Buffer;
  /** Dừng vòng theo dõi sổ. */
  thoiTheoDoi?: () => void;
  /** Head pull request đã đổi giữa chừng — ghi vào verdict lúc lượt chấm kết thúc. */
  headMoi?: { new_sha: string; at: string };
  /** Dừng vòng hỏi lại head. */
  thoiTheoHead?: () => void;
}

/** Sổ sự kiện của một lượt chấm. Nằm trong `runs/` nên KHÔNG được đè khi deploy. */
export function duongSoSuKien(id: string): string {
  return join(GOC, 'runs', id, 'events.jsonl');
}

/**
 * Đọc TRỌN sổ sự kiện từ đĩa.
 *
 * Dòng hỏng bị bỏ đúng dòng đó chứ không làm hỏng cả sổ: tiến trình chết giữa lúc ghi để lại một
 * dòng cụt ở cuối, và đó là chuyện BÌNH THƯỜNG chứ không phải hư hỏng — «đọc được tới đây» là câu
 * trả lời đúng, «không có gì» thì không.
 */
export function docSoSuKienTuDia(id: string): StoredEvent[] {
  const p = duongSoSuKien(id);
  if (!existsSync(p)) return [];
  const ra: StoredEvent[] = [];
  for (const dong of readFileSync(p, 'utf8').split('\n')) {
    if (!dong.trim()) continue;
    try {
      ra.push(JSON.parse(dong) as StoredEvent);
    } catch {
      continue;
    }
  }
  return ra;
}

export class RunManager {
  private runs = new Map<string, RunState>();
  // hook chế độ trực: gọi khi một run kết thúc CÓ verdict (sau khi đã ghi sổ cái)
  onXong?: (meta: RunMeta) => void;

  /** Dọn xác lượt chấm của lần chạy trước — gọi MỘT lần lúc khởi động, xem kho-run.cleanupOrphanRuns */
  cleanupOrphanRuns(boQua: string[] = []): string[] {
    return kho.cleanupOrphanRuns(boQua);
  }

  runningCount(): number {
    return kho.runningCount();
  }

  batDau(
    tieuDe: string,
    skill: 'code' | 'doc',
    args: string[],
    envThem: NodeJS.ProcessEnv = {},
    pr?: { so: number; headSha: string; tacGia?: string },
    repo?: string,
    /** Ai bấm chạy. Rỗng = lượt do máy chạy (chế độ trực) — đó là khẳng định, không phải thiếu dữ liệu. */
    nguoi?: string,
  ): string {
    const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const meta: RunMeta = { id, tieuDe, skill, trangThai: 'dang_chay', batDau: new Date().toISOString(), pr, repo };
    const state: RunState = { meta, events: [], subs: new Set() };
    this.runs.set(id, state);
    // Ghi vào kho NGAY khi bắt đầu: trần số lượt song song và cờ "PR này đang chấm" nay đọc từ cơ sở
    // dữ liệu, nên một lượt chưa vào kho là một lượt vô hình với các cổng đó.
    kho.saveMeta(meta);

    const t0 = Date.now();
    const ghi = (e: RunEvent): void => {
      const ev: StoredEvent = { t: Date.now() - t0, e };
      state.events.push(ev);
      for (const s of state.subs) s(ev);
    };

    // Sổ trên đĩa là NGUỒN SỰ THẬT, không phải đường ống stdout. Tiến trình web dừng giữa chừng thì
    // tiến trình con vẫn ghi tiếp vào đây, và web sống lại chỉ việc đọc tiếp từ chỗ đang dở.
    state.duongSo = duongSoSuKien(id);
    const child = spawn(
      'npx',
      ['tsx', 'packages/harness/src/cli.ts', 'run', ...args, '--json', '--events-out', state.duongSo, ...(nguoi ? ['--run-by', nguoi] : [])],
      {
        cwd: GOC,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...envThem },
      },
    );
    // stdout KHÔNG còn là đường sự kiện — nhưng vẫn phải hút cho cạn, kẻo tiến trình con nghẽn ống
    // rồi đứng im, và không ai hiểu vì sao lượt chấm treo.
    createInterface({ input: child.stdout }).on('line', () => {});
    this.batTheoDoiSo(state);
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
      // Đọc nốt phần sổ ghi sau nhịp cuối cùng TRƯỚC khi kết luận. Bỏ qua bước này thì verdict ghi
      // ra ở mili giây chót bị coi như không có, và lượt chấm thành «lỗi» một cách oan uổng.
      this.docSo(state);
      state.thoiTheoDoi?.();
      // Dấu vết head-đổi phải đi vào verdict TRƯỚC khi lưu và trước khi vào sổ cái: lượt mở lại sau
      // này chỉ có verdict để đọc, không có bộ nhớ của tiến trình đã chết.
      if (state.headMoi && meta.verdict) meta.verdict.head_moved = state.headMoi;
      meta.ketThuc = new Date().toISOString();
      const daCoLoi = state.events.some((x) => x.e.type === 'error');
      if (meta.verdict) {
        meta.trangThai = 'xong';
        const muc = entryFromMeta(meta);
        // Sổ cái chỉ ghi thêm (R9.4): chạy lại cùng một run không được ghi đè, và cũng không được
        // làm sập lượt — dùng đường bỏ-qua-nếu-đã-có.
        if (muc) appendVerdictLedgerIfNew(muc);
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
      state.thoiTheoHead?.();
      this.luu(state);
      for (const s of state.subs) s({ t: Date.now() - t0, e: { type: 'log', msg: '__END__' } });
    });
    return id;
  }

  /**
   * Đọc phần sổ mới sinh ra kể từ lần đọc trước.
   *
   * Ba thứ phải chịu được, vì cả ba là chuyện BÌNH THƯỜNG chứ không phải ngoại lệ:
   *  - dòng cuối ghi dở (đang đọc đúng lúc tiến trình con đang ghi) → giữ lại chờ nhịp sau;
   *  - dòng cuối hỏng vĩnh viễn (tiến trình chết giữa lúc ghi) → bỏ đúng dòng đó, giữ phần trước;
   *  - ký tự UTF-8 bị cắt đôi ở ranh giới byte → ghép ở tầng Buffer, không ghép ở tầng chuỗi.
   */
  private docSo(state: RunState): void {
    const p = state.duongSo;
    if (!p || !existsSync(p)) return;
    let co: number;
    try {
      co = statSync(p).size;
    } catch {
      return;
    }
    const tu = state.daDoc ?? 0;
    if (co <= tu) return;

    let doc: Buffer;
    const fd = openSync(p, 'r');
    try {
      const buf = Buffer.alloc(co - tu);
      const n = readSync(fd, buf, 0, buf.length, tu);
      doc = buf.subarray(0, n);
      state.daDoc = tu + n;
    } finally {
      closeSync(fd);
    }

    const gop = state.du && state.du.length ? Buffer.concat([state.du, doc]) : doc;
    const cuoiDong = gop.lastIndexOf(0x0a); // '\n'
    if (cuoiDong < 0) {
      state.du = gop;
      return;
    }
    state.du = gop.subarray(cuoiDong + 1);
    for (const dong of gop.subarray(0, cuoiDong).toString('utf8').split('\n')) {
      if (!dong.trim()) continue;
      let ev: StoredEvent;
      try {
        ev = JSON.parse(dong) as StoredEvent;
      } catch {
        continue; // dòng hỏng: bỏ đúng nó, đừng để cả lượt chấm thành rỗng
      }
      state.events.push(ev);
      if (ev.e.type === 'verdict') state.meta.verdict = ev.e.verdict;
      for (const s of state.subs) s(ev);
    }
  }

  /** Bám sổ theo nhịp. Nhanh hơn thì tốn đọc đĩa vô ích; chậm hơn thì log chảy giật. */
  private batTheoDoiSo(state: RunState): void {
    if (state.thoiTheoDoi) return;
    const h = setInterval(() => this.docSo(state), 250);
    state.thoiTheoDoi = () => {
      clearInterval(h);
      state.thoiTheoDoi = undefined;
    };
  }

  /**
   * Nối lại các lượt còn dang dở sau khi tiến trình web khởi động lại.
   *
   * Gọi TRƯỚC `cleanupOrphanRuns` — lượt còn sổ đang lớn dần là lượt còn sống, và đánh dấu nó hỏng
   * chỉ vì mình vừa khởi động lại là vứt bỏ công việc đang chạy đúng.
   */
  noiLaiLuotDangChay(): string[] {
    const noi: string[] = [];
    for (const m of kho.listRuns({ gioi_han: 200 })) {
      if (m.trangThai !== 'dang_chay') continue;
      const p = duongSoSuKien(m.id);
      if (!existsSync(p)) continue; // không có sổ thì không nối được gì — để cleanup dọn
      const state: RunState = { meta: m, events: [], subs: new Set(), duongSo: p, daDoc: 0 };
      this.runs.set(m.id, state);
      this.docSo(state);
      this.batTheoDoiSo(state);
      noi.push(m.id);
    }
    return noi;
  }

  /**
   * Ghi nhận head pull request đã đổi TRONG LÚC lượt chấm chạy.
   *
   * Lượt chấm VẪN CHẠY TỚI HẾT — cố ý. Dừng giữa chừng là vứt phần việc gần xong, mà verdict trên
   * commit cũ vẫn còn giá trị ĐỌC: nó không dùng được ở cổng, nhưng phần lớn finding vẫn đúng với
   * mã nguồn và dev vẫn biết chỗ nào sai.
   *
   * Điều KHÔNG được phép là im lặng cho tới lúc ai đó bấm — nên sự kiện phát ra NGAY cho người đang
   * xem, và dấu vết đi vào verdict để lượt mở lại sau vẫn thấy.
   */
  ghiHeadDoi(id: string, shaMoi: string): boolean {
    const st = this.runs.get(id);
    if (!st || st.headMoi) return false; // đã ghi rồi thì thôi — một lần là đủ, đừng phát lặp
    const at = new Date().toISOString();
    st.headMoi = { new_sha: shaMoi, at };
    const ev: StoredEvent = { t: Date.now() - Date.parse(st.meta.batDau), e: { type: 'head_moved', new_sha: shaMoi, at } };
    st.events.push(ev);
    for (const sub of st.subs) sub(ev);
    if (st.meta.verdict) st.meta.verdict.head_moved = st.headMoi;
    return true;
  }

  /** Head lượt chấm đang ghim — để chỗ theo dõi biết phải so với cái gì. */
  headDangGhim(id: string): string | undefined {
    return this.runs.get(id)?.meta.pr?.headSha;
  }

  /** Lượt còn đang chạy không — vòng theo dõi head tự dừng khi lượt kết thúc. */
  dangChay(id: string): boolean {
    return this.runs.get(id)?.meta.trangThai === 'dang_chay';
  }

  lay(id: string): RunState | undefined {
    if (this.runs.has(id)) return this.runs.get(id);
    // Lượt đã kết thúc (hoặc do tiến trình khác chạy): dựng lại từ kho.
    const meta = kho.readMeta(id);
    if (!meta) return undefined;
    // Bảng trống mà sổ trên đĩa có → ĐỌC SỔ. Đây là chỗ câu «file là nguồn, bảng là bản đọc» phải
    // có hiệu lực thật: bảng chỉ được ghi lúc lượt chấm đóng, nên một lượt bị giết giữa chừng có
    // đủ dấu vết trên đĩa mà bảng thì trống. Đọc mỗi bảng ở đây nghĩa là mở lại một lượt đã chết
    // và thấy TRỐNG RỖNG — đúng thứ ⛔C2 cấm: «không đọc được» hiện thành «không có gì».
    let events = kho.readEvents(id);
    if (!events.length) {
      events = docSoSuKienTuDia(id);
      // Bảng là bản đọc, nên dựng lại nó ngay — lần sau khỏi phải đọc đĩa.
      if (events.length) kho.saveEvents(id, events);
    }
    const state: RunState = { meta, events, subs: new Set() };
    this.runs.set(id, state);
    return state;
  }

  /**
   * Danh sách lượt chấm. Trước đây hàm này đọc TOÀN BỘ thư mục và nạp cả dòng sự kiện lên bộ nhớ
   * mỗi lần được gọi, rồi cắt còn 30 — nghĩa là trang lịch sử bị chặn ở 30 lượt mà không ai khai.
   * Nay lọc và phân trang chạy dưới cơ sở dữ liệu, dòng sự kiện chỉ đọc khi thật sự phát lại.
   */
  danhSach(loc: kho.RunFilter = {}): RunMeta[] {
    return kho.listRuns({ gioi_han: 30, ...loc });
  }

  dem(loc: kho.RunFilter = {}): number {
    return kho.countRuns(loc);
  }

  // Verdict đã chấm cho đúng cặp (PR, commit) — nền tảng cho idempotent theo SHA
  findByPr(so: number, sha: string): RunMeta | undefined {
    return kho.findByPr(so, sha);
  }

  // Các PR đã bị trả về dev — để hàng đợi không đánh mất việc
  returnedToDev(): RunMeta[] {
    return kho.returnedToDev();
  }

  isPrRunning(so: number): boolean {
    return kho.isPrRunning(so);
  }

  /**
   * R6.26 — bề mặt trong bộ nhớ ĐỌC LẠI từ sổ sau khi sổ vừa được ghi. Không còn hàm nào NHẬN cụm
   * hành động cổng để đặt vào bề mặt: nơi duy nhất khai một hành động cổng là sổ chỉ-ghi-thêm.
   */
  dongBoCongTuSo(id: string): void {
    const st = this.lay(id);
    if (st) st.meta.ketQuaCong = kho.readMeta(id)?.ketQuaCong;
  }

  /** Hành động cổng ĐANG có trong sổ cho lượt này — đọc tươi, không tin bản trong bộ nhớ. */
  congHienTai(id: string): RunMeta['ketQuaCong'] {
    return kho.readMeta(id)?.ketQuaCong;
  }

  /**
   * Dựng lại bảng sự kiện trong cơ sở dữ liệu TỪ SỔ TRÊN ĐĨA.
   *
   * Đây là thứ làm cho câu «file là nguồn, bảng là bản đọc» có hiệu lực thay vì chỉ là lời hứa: khi
   * hai bên lệch nhau — máy chủ chết giữa lúc ghi bảng, hay ai đó chép sổ từ máy khác về — thì có
   * một đường một chiều dựng lại bảng, và không có đường ngược lại.
   */
  dungLaiSoTuDia(id: string): number {
    const su = docSoSuKienTuDia(id);
    if (su.length) kho.saveEvents(id, su);
    return su.length;
  }

  private luu(state: RunState): void {
    kho.saveMeta(state.meta);
    kho.saveEvents(state.meta.id, state.events);
  }
}
