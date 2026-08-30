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

const { moDb, dongDb } = await import('../apps/web/src/kho/db.js');
const k = await import('../apps/web/src/kho/kho-run.js');

const meta = (p: Partial<RunMeta> & { id: string }): RunMeta => ({
  tieuDe: 'PR #8 · code',
  skill: 'code',
  trangThai: 'xong',
  batDau: '2026-08-27T09:00:00.000Z',
  ...p,
});

beforeAll(() => {
  moDb();
  k.luuMeta(meta({ id: 'a', repo: 'a/b', pr: { so: 8, headSha: 'sha8aaa', tacGia: 'thang' }, batDau: '2026-08-27T09:00:00.000Z' }));
  k.luuMeta(meta({ id: 'b', repo: 'a/b', skill: 'doc', batDau: '2026-08-27T10:00:00.000Z' }));
  k.luuMeta(meta({ id: 'c', repo: 'khac/repo', trangThai: 'dang_chay', pr: { so: 9, headSha: 'sha9bbb' }, batDau: '2026-08-27T11:00:00.000Z' }));
  k.luuMeta(meta({ id: 'd', trangThai: 'loi', batDau: '2026-08-27T08:00:00.000Z' }));
});
afterAll(() => {
  dongDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('lưu và đọc lượt chấm', () => {
  it('đọc lại đủ trường, kể cả thông tin PR', () => {
    const m = k.docMeta('a')!;
    expect(m.repo).toBe('a/b');
    expect(m.pr).toEqual({ so: 8, headSha: 'sha8aaa', tacGia: 'thang' });
  });

  it('lưu lại cùng id là cập nhật, không đẻ bản trùng', () => {
    k.luuMeta(meta({ id: 'a', repo: 'a/b', trangThai: 'loi' }));
    expect(k.demRun({ repo: 'a/b' })).toBe(2);
    expect(k.docMeta('a')!.trangThai).toBe('loi');
    k.luuMeta(meta({ id: 'a', repo: 'a/b', pr: { so: 8, headSha: 'sha8aaa', tacGia: 'thang' } }));
  });

  it('verdict hỏng không làm hỏng cả bản ghi', () => {
    moDb().prepare("UPDATE run SET verdict = '{ khong phai json' WHERE id = 'd'").run();
    const m = k.docMeta('d');
    expect(m).toBeTruthy();
    expect(m!.verdict).toBeUndefined();
  });

  it('kết quả cổng đọc lại được nguyên vẹn', () => {
    k.luuMeta({ ...k.docMeta('b')!, ketQuaCong: { hanhDong: 'reject', luc: '2026-08-27T12:00:00.000Z', nguoi: 'thang', chiTiet: 'thiếu test' } });
    expect(k.docMeta('b')!.ketQuaCong).toEqual({ hanhDong: 'reject', luc: '2026-08-27T12:00:00.000Z', nguoi: 'thang', chiTiet: 'thiếu test' });
  });
});

describe('dòng sự kiện tách khỏi danh sách', () => {
  beforeAll(() => {
    k.luuSuKien('a', [
      { t: 0, e: { type: 'stage', stage: 1, ten: 'Nhận artifact' } },
      { t: 120, e: { type: 'log', msg: 'diff 57362 ký tự' } },
    ]);
  });

  it('đọc lại đúng thứ tự đã ghi', () => {
    const ev = k.docSuKien('a');
    expect(ev).toHaveLength(2);
    expect(ev[1].e).toMatchObject({ type: 'log', msg: 'diff 57362 ký tự' });
  });

  it('ghi lại lần nữa thì thay thế, không nối thêm', () => {
    k.luuSuKien('a', [{ t: 5, e: { type: 'log', msg: 'chạy lại' } }]);
    expect(k.docSuKien('a')).toHaveLength(1);
  });

  it('một dòng sự kiện hỏng không làm hỏng cả lượt phát lại', () => {
    moDb().prepare("INSERT INTO run_su_kien (run_id, thu_tu, t, e) VALUES ('a', 99, 9, '{ hong')").run();
    expect(k.docSuKien('a')).toHaveLength(1);
  });

  it('lượt chưa có sự kiện thì trả danh sách rỗng', () => {
    expect(k.docSuKien('c')).toEqual([]);
  });
});

describe('truy vấn danh sách', () => {
  it('sắp xếp mới nhất trước', () => {
    expect(k.danhSachRun({ gioi_han: 2 }).map((m) => m.id)).toEqual(['c', 'b']);
  });

  it('lọc theo repo tách bạch, lượt chưa gắn repo không lọt vào', () => {
    expect(k.danhSachRun({ repo: 'a/b' }).map((m) => m.id).sort()).toEqual(['a', 'b']);
    expect(k.demRun({ repo: 'khac/repo' })).toBe(1);
  });

  it('đếm số lượt đang chạy không cần nạp gì lên bộ nhớ', () => {
    expect(k.soDangChay()).toBe(1);
  });
});

describe('tra cứu theo PR — nền của luật chấm lại', () => {
  it('khớp đúng cặp PR và commit, chỉ nhận lượt đã xong', () => {
    expect(k.timTheoPr(8, 'sha8aaa')?.id).toBe('a');
  });

  it('cùng PR nhưng commit khác thì KHÔNG khớp — verdict cũ hết hiệu lực', () => {
    expect(k.timTheoPr(8, 'sha-moi')).toBeUndefined();
  });

  it('lượt đang chạy không được tính là đã có verdict', () => {
    expect(k.timTheoPr(9, 'sha9bbb')).toBeUndefined();
    expect(k.dangChayPr(9)).toBe(true);
  });

  it('các lượt đã trả về dev tra ra được', () => {
    expect(k.daTraVe().map((m) => m.id)).toEqual(['b']);
  });
});

describe('dọn lượt chấm mồ côi khi khởi động lại (R8.1, đối chiếu R8.7)', () => {
  it('hàng dang_chay của lần chạy trước bị đánh dấu lỗi, trần song song được giải phóng', () => {
    // Ca thật: Ctrl-C server lúc đang chấm 2 PR ⇒ hai hàng nằm lại dang_chay VĨNH VIỄN ⇒ soDangChay()
    // trả 2 mãi mãi ⇒ mọi lượt bấm tay nhận 429 và chế độ trực dừng ngay vòng đầu. Không log gì bất
    // thường, chỉ sửa được bằng cách mở SQL.
    k.donLuotMoCoi(); // các ca trước trong file này cũng để lại hàng dang_chay — về mốc 0 rồi mới đo
    k.luuMeta(meta({ id: 'mc-1', trangThai: 'dang_chay', pr: { so: 12, headSha: 'aaa1' } }));
    k.luuMeta(meta({ id: 'mc-2', trangThai: 'dang_chay', pr: { so: 15, headSha: 'bbb2' } }));
    expect(k.soDangChay()).toBe(2);
    expect(k.dangChayPr(12)).toBe(true);

    const daDon = k.donLuotMoCoi();
    expect(daDon.sort()).toEqual(['mc-1', 'mc-2']);
    expect(k.soDangChay()).toBe(0);
    expect(k.dangChayPr(12)).toBe(false);
    expect(k.docMeta('mc-1')?.trangThai).toBe('loi');
  });

  it('nói RÕ vì sao lượt đó thành lỗi, không để người đọc tự đoán', () => {
    k.luuMeta(meta({ id: 'mc-3', trangThai: 'dang_chay' }));
    k.donLuotMoCoi();
    const sk = k.docSuKien('mc-3');
    expect(JSON.stringify(sk)).toMatch(/bỏ dở|dừng giữa chừng/);
  });

  it('không có lượt mồ côi thì không đụng gì tới lượt đã xong', () => {
    k.luuMeta(meta({ id: 'mc-4', trangThai: 'xong' }));
    expect(k.donLuotMoCoi()).toEqual([]);
    expect(k.docMeta('mc-4')?.trangThai).toBe('xong');
  });
});
