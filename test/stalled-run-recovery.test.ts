import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Lưới cho capability `stalled-run-recovery`.
 *
 * Ba lỗi cùng một họ: bề mặt nói không đủ để người đọc hành động đúng. Hai trong ba làm người đọc
 * KHÔNG hành động được — lượt chết khoá vĩnh viễn việc chấm lại một pull request, và thông điệp cổng
 * đẩy người đọc đi tìm API key cho một chế độ không dùng API key.
 */

const goc = mkdtempSync(join(tmpdir(), 'checkmate-srr-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'srr.db');

const { closeDb } = await import('../apps/web/src/store/db.js');
const kho = await import('../apps/web/src/store/run-store.js');
const { decideRunLiveness, processAlive, mayKillRun, killRunProcess, RunManager } = await import('../apps/web/src/runs.js');
const { checkMessage } = await import('../apps/web/src/ui-provider.js');
const { describeCandidate } = await import('../packages/harness/src/skill-doc.js');
import type { RunMeta } from '../apps/web/src/runs.js';
import type { ProviderConfig, CheckResult } from '../apps/web/src/provider.js';

afterAll(() => {
  closeDb();
  try {
    rmSync(goc, { recursive: true, force: true });
  } catch {
    /* Windows giữ file một lúc */
  }
});

const meta = (p: Partial<RunMeta> & { id: string }): RunMeta => ({
  tieuDe: 'thử',
  skill: 'code',
  trangThai: 'dang_chay',
  batDau: new Date().toISOString(),
  ...p,
});

describe('R-1 — lượt còn sống phân biệt bằng TIẾN TRÌNH (hàm thuần)', () => {
  it('có pid và tiến trình còn sống → còn sống', () => {
    expect(decideRunLiveness(1234, () => true)).toEqual({ song: true });
  });

  it('có pid nhưng tiến trình đã chết → chết, kèm lý do phân biệt được', () => {
    expect(decideRunLiveness(1234, () => false)).toEqual({ song: false, ly_do: 'tien_trinh_da_chet' });
  });

  it('KHÔNG có pid → chết, và lý do KHÁC hẳn — không suy đoán là còn sống', () => {
    // Lượt đời cũ (ghi trước khi có cột pid). Hướng sai ở đây không đối xứng: đoán nhầm «chết» thì mất
    // một lượt phải chấm lại; đoán nhầm «còn sống» thì khoá một pull request mà không ai gỡ được.
    for (const xau of [undefined, 0, -1, Number.NaN]) {
      expect(decideRunLiveness(xau as number | undefined, () => true)).toEqual({ song: false, ly_do: 'khong_co_pid' });
    }
  });

  it('hai lý do phải PHÂN BIỆT được — thông điệp cho người vận hành khác nhau', () => {
    const a = decideRunLiveness(undefined, () => true);
    const b = decideRunLiveness(999_999_999, () => false);
    expect(a.song).toBe(false);
    expect(b.song).toBe(false);
    expect(a.song === false && b.song === false && a.ly_do !== b.ly_do).toBe(true);
  });

  it('processAlive nói ĐÚNG về tiến trình đang chạy và pid không thể tồn tại', () => {
    expect(processAlive(process.pid)).toBe(true);
    expect(processAlive(2_147_483_646)).toBe(false);
  });
});

describe('R-2 — lượt chết thành LỖI ngay, và tự giải phóng', () => {
  it('không có pid → LỖI ngay dù sổ vẫn còn trên đĩa, và ghi lý do', () => {
    // Ca load-bearing. Bản trước hỏi «sổ có tồn tại không», mà sổ là file trên đĩa nên nó tồn tại MÃI
    // sau khi tiến trình chết — lượt chết được nối lại thành «đang chạy» vĩnh viễn.
    kho.saveMeta(meta({ id: 'chet1', trangThai: 'dang_chay', pr: { so: 77, headSha: 'abc' } }));
    mkdirSync(join(goc, 'runs', 'chet1'), { recursive: true });
    writeFileSync(join(goc, 'runs', 'chet1', 'events.jsonl'), JSON.stringify({ t: 0, e: { type: 'log', msg: 'x' } }) + '\n');

    const rm = new RunManager();
    const { noiLai, danhDauLoi } = rm.noiLaiLuotDangChay();
    expect(noiLai).not.toContain('chet1');
    expect(danhDauLoi).toContain('chet1');
    expect(kho.readMeta('chet1')?.trangThai).toBe('loi');
    const soLy = kho.readEvents('chet1').map((x) => (x.e as { msg?: string }).msg ?? '').join(' ');
    expect(soLy, 'lỗi không nói vì sao là báo thiếu bản chất').toMatch(/bỏ dở/);
  });

  it('giải phóng trần chạy đồng thời VÀ mở khoá pull request', () => {
    // Vế mà nếu thiếu thì cả bản vá vô nghĩa: đo được một lượt chết nằm 17 giờ, khoá PR #7 của repo
    // đích, và không thao tác nào trên giao diện gỡ nổi.
    expect(kho.runningCount(), 'lượt đã thành lỗi không còn được đếm').toBe(0);
    expect(kho.isPrRunning(77), 'và không còn chặn việc chấm lại pull request ấy').toBe(false);
  });

  it('tiến trình còn sống thì KHÔNG bị đánh dấu lỗi', () => {
    // Vế đối chứng. Thiếu nó thì một bản «đánh dấu lỗi tất» cũng xanh ở hai ca trên — mà làm thế là vứt
    // một lượt đang chạy đúng và đốt lại toàn bộ token đã tiêu cho nó.
    kho.saveMeta(meta({ id: 'song1', trangThai: 'dang_chay', pid: process.pid }));
    mkdirSync(join(goc, 'runs', 'song1'), { recursive: true });
    writeFileSync(join(goc, 'runs', 'song1', 'events.jsonl'), JSON.stringify({ t: 0, e: { type: 'log', msg: 'y' } }) + '\n');

    const rm = new RunManager();
    const { noiLai, danhDauLoi } = rm.noiLaiLuotDangChay();
    expect(noiLai).toContain('song1');
    expect(danhDauLoi).not.toContain('song1');
    expect(kho.readMeta('song1')?.trangThai).toBe('dang_chay');
  });
});

describe('R-3 — huỷ lượt đang chạy, và KHÔNG BAO GIỜ kill mù', () => {
  it('chỉ được kill khi dòng lệnh mang chính run id', () => {
    // Ca load-bearing nặng nhất của change: pid bị hệ điều hành TÁI DÙNG, nên sau một lần khởi động máy
    // đúng con số ấy có thể thuộc về tiến trình khác. Kill mù là giết một tiến trình vô can của người
    // dùng — thiệt hại nằm NGOÀI phạm vi sản phẩm này và không đảo ngược được.
    const id = 'wabc123';
    expect(mayKillRun(`npx tsx cli.ts run --events-out runs/${id}/events.jsonl`, id)).toBe(true);
    expect(mayKillRun('C:\\Windows\\System32\\svchost.exe -k netsvcs', id)).toBe(false);
    expect(mayKillRun('npx tsx cli.ts run --events-out runs/wKHAC999/events.jsonl', id)).toBe(false);
  });

  it('không đọc được dòng lệnh ⇒ KHÔNG kill — hướng sai lệch về phía an toàn', () => {
    expect(mayKillRun(null, 'wabc123')).toBe(false);
    expect(mayKillRun(undefined, 'wabc123')).toBe(false);
    expect(mayKillRun('', 'wabc123')).toBe(false);
  });

  it('run id rỗng thì KHÔNG kill gì — chuỗi rỗng nằm trong mọi dòng lệnh', () => {
    // Không có ca này thì một lượt thiếu id biến `includes('')` thành true và kill bất cứ tiến trình nào.
    expect(mayKillRun('bất kỳ dòng lệnh nào', '')).toBe(false);
  });

  it(
    'killRunProcess KHÔNG giết một tiến trình vô can — dù pid còn sống',
    () => {
      // Ca sinh ra từ mutation: bỏ hẳn `if (!mayKillRun(...))` trong `killRunProcess` mà KHÔNG ca nào đỏ.
      // `mayKillRun` có ca cho LOGIC của phép xác minh, nhưng không ca nào khoá việc chỗ gọi thực sự dùng
      // nó — đúng khuôn «cửa song sinh» đã bị bắt chín lần trong repo này.
      //
      // Đây là gác nặng nhất của cả change: pid bị hệ điều hành TÁI DÙNG, nên kill mù là giết một tiến
      // trình vô can của người dùng — thiệt hại NGOÀI phạm vi sản phẩm và không đảo ngược được.
      const nanNhan = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
      try {
        const cho = (ms: number): void => {
          const het = Date.now() + ms;
          while (Date.now() < het) {
            /* chờ đồng bộ */
          }
        };
        cho(600);
        expect(processAlive(nanNhan.pid!), 'tiến trình vô can phải đang sống trước khi thử').toBe(true);

        // Dòng lệnh của nó KHÔNG mang run id này ⇒ không được đụng tới.
        expect(killRunProcess(nanNhan.pid, 'wKHONGPHAICUANO')).toBe(false);
        cho(600);
        expect(processAlive(nanNhan.pid!), 'tiến trình vô can PHẢI còn sống').toBe(true);
      } finally {
        try {
          nanNhan.kill('SIGKILL');
        } catch {
          /* dọn được tới đâu hay tới đó */
        }
      }
    },
    30_000,
  );

  it('huỷ lượt ĐÃ kết thúc thì bị từ chối', () => {
    kho.saveMeta(meta({ id: 'xong1', trangThai: 'xong' }));
    const rm = new RunManager();
    const kq = rm.huyLuot('xong1', 'nam');
    expect(kq.ok).toBe(false);
  });

  it('huỷ lượt không tồn tại thì bị từ chối', () => {
    expect(new RunManager().huyLuot('khong-co', 'nam').ok).toBe(false);
  });

  it('huỷ lượt đang chạy → LỖI, và sổ ghi AI huỷ', () => {
    // Một lượt chuyển sang lỗi mà không nói vì sao là báo thiếu bản chất — người đọc lịch sử sau này
    // không phân biệt được «hỏng vì code» với «người vận hành huỷ».
    kho.saveMeta(meta({ id: 'huy1', trangThai: 'dang_chay' }));
    const rm = new RunManager();
    const kq = rm.huyLuot('huy1', 'chi-lan');
    expect(kq.ok).toBe(true);
    expect(kq.ok === true && kq.daDungTienTrinh, 'không có pid thì không dừng được tiến trình nào').toBe(false);
    expect(kho.readMeta('huy1')?.trangThai).toBe('loi');
    const soLy = kho.readEvents('huy1').map((x) => (x.e as { msg?: string }).msg ?? '').join(' ');
    expect(soLy).toContain('chi-lan');
    expect(soLy, 'phải nói rõ là CHƯA dừng được tiến trình').toMatch(/KHÔNG dừng được/);
  });
});

describe('R-4 — thông điệp cổng nói đúng phương thức đang chọn', () => {
  const cfgThueBao: ProviderConfig = { phuong_thuc: 'thue_bao', model: 'claude-sonnet-5' };
  const cfgApi: ProviderConfig = { phuong_thuc: 'api', model: 'claude-sonnet-5' };
  const soApiThieuKhoa: CheckResult = {
    ok: false,
    luc: '2026-09-03T20:44:14.835Z',
    thong_diep: 'Chưa có API key Anthropic — dán vào ô bên dưới rồi kiểm lại.',
    model: 'claude-sonnet-5',
    phuong_thuc: 'api',
  };

  it('cấu hình THUÊ BAO + sổ kiểm của đường API → nói cần kiểm lại, KHÔNG đòi API key', () => {
    // Chính bệnh PO gặp 04/09: đọc câu «chưa có API key» trong lúc đang ở chế độ thuê bao, rồi đi tìm
    // khoá cho một chế độ không dùng khoá, và kết luận nhầm rằng kho khoá đã phá đường phiên Claude Code.
    const s = checkMessage(soApiThieuKhoa, cfgThueBao);
    expect(s).toMatch(/kiểm lại/);
    expect(s, 'KHÔNG được đòi API key ở chế độ thuê bao').not.toMatch(/API key/);
    expect(s, 'phải nói phương thức đang chọn').toMatch(/thuê bao|Gói thuê bao/i);
  });

  it('cấu hình API + thật sự thiếu khoá → vẫn nói thiếu khoá', () => {
    // Vế ngược. Sửa quá tay thành «không bao giờ nhắc API key» là hỏng theo chiều khác: người dùng đường
    // API mất đúng câu nói cho họ biết phải làm gì.
    expect(checkMessage(soApiThieuKhoa, cfgApi)).toContain('API key');
  });

  it('chưa kiểm lần nào thì nói thế, không bịa', () => {
    expect(checkMessage(undefined, cfgThueBao)).toMatch(/chưa kiểm/i);
  });

  it('model đổi so với lần kiểm → nói cần kiểm lại với model đang chọn', () => {
    expect(checkMessage({ ...soApiThieuKhoa, ok: true, phuong_thuc: 'thue_bao' }, { ...cfgThueBao, model: 'claude-opus-5' })).toMatch(/model/);
  });
});

describe('R-5 — dòng ứng viên phân biệt được từng cái', () => {
  it('hai ứng viên cùng nhãn rubric, khác chỗ nhắm → hai dòng KHÁC nhau', () => {
    // Đo được 04/09: «D1 (mâu thuẫn nội tại) · D2 (mâu thuẫn nội tại)» trông như trùng, trong khi D1 bắt
    // ví dụ để người tạo TỰ DUYỆT và D2 bắt cùng ví dụ ấy VƯỢT THẨM QUYỀN — cả hai đều là finding high.
    const d1 = describeCandidate({ id: 'D1', rubric: 'mau_thuan_noi_tai', title_vi: 'Tự duyệt', quotes: [{ vi_tri: 'dòng 49 (Mục 3.2)' }] });
    const d2 = describeCandidate({ id: 'D2', rubric: 'mau_thuan_noi_tai', title_vi: 'Vượt thẩm quyền', quotes: [{ vi_tri: 'dòng 44 (Bảng thẩm quyền)' }] });
    expect(d1).not.toBe(d2);
    expect(d1).toContain('dòng 49');
    expect(d2).toContain('dòng 44');
  });

  it('không có trích dẫn thì rơi về tiêu đề — vẫn phân biệt được', () => {
    const a = describeCandidate({ id: 'D1', rubric: 'mau_thuan_noi_tai', title_vi: 'Tự duyệt' });
    const b = describeCandidate({ id: 'D2', rubric: 'mau_thuan_noi_tai', title_vi: 'Vượt thẩm quyền' });
    expect(a).not.toBe(b);
  });

  it('không có gì để nói chỗ nhắm thì vẫn ra nhãn hợp lệ, không ném', () => {
    expect(describeCandidate({ id: 'D9', rubric: 'mau_thuan_noi_tai' })).toContain('D9');
  });
});

describe('D6 — GIẢ ĐỊNH NỀN: tiến trình chấm sống sót qua cái chết của server', () => {
  it(
    'giết tiến trình cha thì tiến trình cháu VẪN ghi tiếp vào sổ',
    () => {
      // Đây là giả định mà CẢ `noiLaiLuotDangChay` LẪN `cleanupOrphanRuns` dựa vào, và trước change này
      // nó chỉ tồn tại dưới dạng HAI COMMENT nói ngược nhau — `run-store.ts` bảo «mọi hàng còn sót đều là
      // xác», `runs.ts` bảo «lượt còn sổ đang lớn dần là lượt còn sống». Đo 04/09 phân xử: comment thứ hai
      // đúng, vì tiến trình chấm được spawn qua shell và ghi sự kiện thẳng vào FILE chứ không qua pipe.
      //
      // Không có ca này thì lần sau ai đó đổi `spawn` (thêm `detached`, đổi `stdio`, chuyển sang ghi qua
      // pipe) sẽ phá giả định nền mà KHÔNG GÌ ĐỎ, và bệnh quay lại dưới dạng khác.
      const sp = mkdtempSync(join(tmpdir(), 'cm-song-sot-'));
      const so = join(sp, 'so.jsonl');
      const chau = join(sp, 'chau.cjs');
      const cha = join(sp, 'cha.cjs');
      writeFileSync(
        chau,
        `const fs=require('fs');let n=0;const h=setInterval(()=>{n++;fs.appendFileSync(process.argv[2],n+'\\n');if(n>=30)clearInterval(h);},200);`,
      );
      writeFileSync(
        cha,
        `const {spawn}=require('node:child_process');const {createInterface}=require('node:readline');` +
          `const c=spawn('node',[${JSON.stringify(chau).replace(/\\\\/g, '\\\\\\\\')},process.argv[2]],{shell:true,stdio:['ignore','pipe','pipe']});` +
          `createInterface({input:c.stdout}).on('line',()=>{});setInterval(()=>{},1000);`,
      );

      const p = spawn('node', [cha, so], { stdio: 'ignore' });
      const cho = (ms: number): void => {
        const het = Date.now() + ms;
        while (Date.now() < het) {
          /* chờ đồng bộ — ca này đo hành vi hệ điều hành, không đo tốc độ */
        }
      };
      cho(1500);
      const truoc = existsSync(so) ? readFileSync(so, 'utf8').trim().split('\n').length : 0;
      expect(truoc, 'cháu phải đang ghi trước khi giết cha').toBeGreaterThan(0);

      // Giết ĐÚNG tiến trình cha, không giết cây — đúng cách một server bị dừng.
      if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(p.pid), '/F'], { stdio: 'ignore' });
      else process.kill(p.pid!, 'SIGKILL');
      cho(2000);

      const sau = readFileSync(so, 'utf8').trim().split('\n').length;
      expect(sau, `cháu phải ghi tiếp sau khi cha chết (trước ${truoc}, sau ${sau})`).toBeGreaterThan(truoc);

      try {
        rmSync(sp, { recursive: true, force: true });
      } catch {
        /* cháu có thể còn giữ file — không phải lỗi của ca này */
      }
    },
    30_000,
  );
});

void dirname;
void fileURLToPath;
