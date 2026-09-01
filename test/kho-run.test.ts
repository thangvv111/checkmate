import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunMeta } from '../apps/web/src/runs.js';

// Kho lượt chấm (specs/R9). Điểm phải giữ: danh sách lượt chấm KHÔNG kéo theo dòng sự kiện,
// và tra cứu theo cặp (PR, commit) phải chính xác vì luật chấm-lại neo vào đó.

const goc = mkdtempSync(join(tmpdir(), 'checkmate-run-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'run.db');

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const k = await import('../apps/web/src/store/run-store.js');
const soCong = await import('../apps/web/src/store/ledger-store.js');

const meta = (p: Partial<RunMeta> & { id: string }): RunMeta => ({
  tieuDe: 'PR #8 · code',
  skill: 'code',
  trangThai: 'xong',
  batDau: '2026-08-27T09:00:00.000Z',
  ...p,
});

beforeAll(() => {
  openDb();
  k.saveMeta(meta({ id: 'a', repo: 'a/b', pr: { so: 8, headSha: 'sha8aaa', tacGia: 'thang' }, batDau: '2026-08-27T09:00:00.000Z' }));
  k.saveMeta(meta({ id: 'b', repo: 'a/b', skill: 'doc', batDau: '2026-08-27T10:00:00.000Z' }));
  k.saveMeta(meta({ id: 'c', repo: 'khac/repo', trangThai: 'dang_chay', pr: { so: 9, headSha: 'sha9bbb' }, batDau: '2026-08-27T11:00:00.000Z' }));
  k.saveMeta(meta({ id: 'd', trangThai: 'loi', batDau: '2026-08-27T08:00:00.000Z' }));
});
afterAll(() => {
  closeDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('lưu và đọc lượt chấm', () => {
  it('đọc lại đủ trường, kể cả thông tin PR', () => {
    const m = k.readMeta('a')!;
    expect(m.repo).toBe('a/b');
    expect(m.pr).toEqual({ so: 8, headSha: 'sha8aaa', tacGia: 'thang' });
  });

  it('lưu lại cùng id là cập nhật, không đẻ bản trùng', () => {
    k.saveMeta(meta({ id: 'a', repo: 'a/b', trangThai: 'loi' }));
    expect(k.countRuns({ repo: 'a/b' })).toBe(2);
    expect(k.readMeta('a')!.trangThai).toBe('loi');
    k.saveMeta(meta({ id: 'a', repo: 'a/b', pr: { so: 8, headSha: 'sha8aaa', tacGia: 'thang' } }));
  });

  it('verdict hỏng không làm hỏng cả bản ghi', () => {
    openDb().prepare("UPDATE run SET verdict = '{ khong phai json' WHERE id = 'd'").run();
    const m = k.readMeta('d');
    expect(m).toBeTruthy();
    expect(m!.verdict).toBeUndefined();
  });

  it('kết quả cổng đọc lại được nguyên vẹn — từ SỔ, không từ cột trên bảng run (R6.26)', () => {
    soCong.appendGateLedger({ run_id: 'b', luc: '2026-08-27T12:00:00.000Z', hanh_dong: 'reject', nguoi: 'thang', chi_tiet: 'thiếu test' });
    // R6.21 — hàng do NGƯỜI bấm trong CheckMate KHÔNG mang cờ ngoài-cổng; cờ là thứ phân biệt hai
    // loại hành động ở mức DỮ LIỆU, nên nó phải có mặt và bằng false, không phải vắng mặt.
    expect(k.readMeta('b')!.ketQuaCong).toEqual({ hanhDong: 'reject', luc: '2026-08-27T12:00:00.000Z', nguoi: 'thang', chiTiet: 'thiếu test', ngoaiCong: false });
  });
});

describe('dòng sự kiện tách khỏi danh sách', () => {
  beforeAll(() => {
    k.saveEvents('a', [
      { t: 0, e: { type: 'stage', stage: 1, ten: 'Nhận artifact' } },
      { t: 120, e: { type: 'log', msg: 'diff 57362 ký tự' } },
    ]);
  });

  it('đọc lại đúng thứ tự đã ghi', () => {
    const ev = k.readEvents('a');
    expect(ev).toHaveLength(2);
    expect(ev[1].e).toMatchObject({ type: 'log', msg: 'diff 57362 ký tự' });
  });

  it('ghi lại lần nữa thì thay thế, không nối thêm', () => {
    k.saveEvents('a', [{ t: 5, e: { type: 'log', msg: 'chạy lại' } }]);
    expect(k.readEvents('a')).toHaveLength(1);
  });

  it('một dòng sự kiện hỏng không làm hỏng cả lượt phát lại', () => {
    openDb().prepare("INSERT INTO run_su_kien (run_id, thu_tu, t, e) VALUES ('a', 99, 9, '{ hong')").run();
    expect(k.readEvents('a')).toHaveLength(1);
  });

  it('lượt chưa có sự kiện thì trả danh sách rỗng', () => {
    expect(k.readEvents('c')).toEqual([]);
  });
});

describe('truy vấn danh sách', () => {
  it('sắp xếp mới nhất trước', () => {
    expect(k.listRuns({ gioi_han: 2 }).map((m) => m.id)).toEqual(['c', 'b']);
  });

  it('lọc theo repo tách bạch, lượt chưa gắn repo không lọt vào', () => {
    expect(k.listRuns({ repo: 'a/b' }).map((m) => m.id).sort()).toEqual(['a', 'b']);
    expect(k.countRuns({ repo: 'khac/repo' })).toBe(1);
  });

  it('đếm số lượt đang chạy không cần nạp gì lên bộ nhớ', () => {
    expect(k.runningCount()).toBe(1);
  });
});

describe('tra cứu theo PR — nền của luật chấm lại', () => {
  it('khớp đúng cặp PR và commit, chỉ nhận lượt đã xong', () => {
    expect(k.findByPr(8, 'sha8aaa')?.id).toBe('a');
  });

  it('cùng PR nhưng commit khác thì KHÔNG khớp — verdict cũ hết hiệu lực', () => {
    expect(k.findByPr(8, 'sha-moi')).toBeUndefined();
  });

  it('lượt đang chạy không được tính là đã có verdict', () => {
    expect(k.findByPr(9, 'sha9bbb')).toBeUndefined();
    expect(k.isPrRunning(9)).toBe(true);
  });

  it('các lượt đã trả về dev tra ra được', () => {
    expect(k.returnedToDev().map((m) => m.id)).toEqual(['b']);
  });
});

describe('dọn lượt chấm mồ côi khi khởi động lại (R8.1, đối chiếu R8.7)', () => {
  it('hàng dang_chay của lần chạy trước bị đánh dấu lỗi, trần song song được giải phóng', () => {
    // Ca thật: Ctrl-C server lúc đang chấm 2 PR ⇒ hai hàng nằm lại dang_chay VĨNH VIỄN ⇒ runningCount()
    // trả 2 mãi mãi ⇒ mọi lượt bấm tay nhận 429 và chế độ trực dừng ngay vòng đầu. Không log gì bất
    // thường, chỉ sửa được bằng cách mở SQL.
    k.cleanupOrphanRuns(); // các ca trước trong file này cũng để lại hàng dang_chay — về mốc 0 rồi mới đo
    k.saveMeta(meta({ id: 'mc-1', trangThai: 'dang_chay', pr: { so: 12, headSha: 'aaa1' } }));
    k.saveMeta(meta({ id: 'mc-2', trangThai: 'dang_chay', pr: { so: 15, headSha: 'bbb2' } }));
    expect(k.runningCount()).toBe(2);
    expect(k.isPrRunning(12)).toBe(true);

    const daDon = k.cleanupOrphanRuns();
    expect(daDon.sort()).toEqual(['mc-1', 'mc-2']);
    expect(k.runningCount()).toBe(0);
    expect(k.isPrRunning(12)).toBe(false);
    expect(k.readMeta('mc-1')?.trangThai).toBe('loi');
  });

  it('nói RÕ vì sao lượt đó thành lỗi, không để người đọc tự đoán', () => {
    k.saveMeta(meta({ id: 'mc-3', trangThai: 'dang_chay' }));
    k.cleanupOrphanRuns();
    const sk = k.readEvents('mc-3');
    expect(JSON.stringify(sk)).toMatch(/bỏ dở|dừng giữa chừng/);
  });

  it('không có lượt mồ côi thì không đụng gì tới lượt đã xong', () => {
    k.saveMeta(meta({ id: 'mc-4', trangThai: 'xong' }));
    expect(k.cleanupOrphanRuns()).toEqual([]);
    expect(k.readMeta('mc-4')?.trangThai).toBe('xong');
  });
});
