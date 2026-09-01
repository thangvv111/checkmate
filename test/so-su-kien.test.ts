import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunMeta } from '../apps/web/src/runs.js';

/**
 * Lưới canh SỔ SỰ KIỆN TRÊN ĐĨA — nguồn sự thật của một lượt chấm.
 *
 * Trước đợt này, sự kiện đi qua đường ống stdout tới tiến trình web và nằm trong bộ nhớ của nó cho
 * tới khi lượt chấm kết thúc. Tiến trình web dừng — khởi động lại, deploy, hay hỏng — thì mọi thứ
 * tích luỹ được đều bay, kể cả các bước đã chạy xong và đã trả tiền cho lời gọi model. Tiến trình
 * con vẫn chạy tiếp, nhưng nó đang nói vào một đường ống mà đầu kia đã tắt.
 *
 * Nay tiến trình con ghi thẳng ra `runs/<id>/events.jsonl`, và tiến trình web ĐỌC FILE. Điều đó đổi
 * chỗ hỏng: sổ có thể cụt ở dòng cuối, và đó là chuyện BÌNH THƯỜNG chứ không phải hư hỏng — tiến
 * trình chết giữa lúc ghi thì để lại đúng như vậy. «Đọc được tới đây» là câu trả lời đúng; «không
 * có gì» thì không (⛔C2).
 */

const goc = mkdtempSync(join(tmpdir(), 'checkmate-so-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'so-su-kien.db');

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const kho = await import('../apps/web/src/store/run-store.js');
const { duongSoSuKien, docSoSuKienTuDia, RunManager } = await import('../apps/web/src/runs.js');

const meta = (p: Partial<RunMeta> & { id: string }): RunMeta => ({
  tieuDe: 'PR #1 · code',
  skill: 'code',
  trangThai: 'dang_chay',
  batDau: '2026-09-02T09:00:00.000Z',
  ...p,
});

/** Ghi một sổ như tiến trình con vẫn ghi: mỗi sự kiện một dòng JSON, nối tiếp. */
function ghiSo(id: string, dong: string[]): void {
  const p = duongSoSuKien(id);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, '', 'utf8');
  for (const d of dong) appendFileSync(p, `${d}\n`, 'utf8');
}

beforeAll(() => openDb());
afterAll(() => {
  closeDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('đọc sổ sự kiện từ đĩa', () => {
  it('đọc lại đúng thứ tự và đúng nội dung', () => {
    ghiSo('r1', [
      JSON.stringify({ t: 0, e: { type: 'stage', stage: 1, ten: 'Nhận artifact' } }),
      JSON.stringify({ t: 120, e: { type: 'log', msg: 'diff 3400 ký tự' } }),
      JSON.stringify({ t: 900, e: { type: 'log', msg: 'Nhánh gốc: 4 pass' } }),
    ]);
    const su = docSoSuKienTuDia('r1');
    expect(su.map((x) => x.e.type)).toEqual(['stage', 'log', 'log']);
    expect(su[2]!.t).toBe(900);
  });

  it('giữ nguyên tiếng Việt — sổ toàn log tiếng Việt, hỏng dấu là hỏng nội dung', () => {
    ghiSo('r2', [JSON.stringify({ t: 5, e: { type: 'log', msg: 'Nhánh gốc không chạy được probe nào' } })]);
    const su = docSoSuKienTuDia('r2');
    expect((su[0]!.e as { msg: string }).msg).toBe('Nhánh gốc không chạy được probe nào');
  });

  it('dòng cuối CỤT (tiến trình chết giữa lúc ghi) → giữ phần đọc được, không thành sổ rỗng', () => {
    // Đây là ca quan trọng nhất của lưới này. Một sổ cụt là dấu vết của lượt chấm bị giết — nếu
    // chỗ đọc coi cả sổ là hỏng thì lượt đó biến thành «chưa từng chạy», tức mất luôn bằng chứng
    // về việc nó đã chạy tới đâu.
    const p = duongSoSuKien('r3');
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, `${JSON.stringify({ t: 1, e: { type: 'log', msg: 'xong bước 1' } })}\n`, 'utf8');
    appendFileSync(p, '{"t":2,"e":{"type":"log","msg":"đang ghi thì ch', 'utf8');
    const su = docSoSuKienTuDia('r3');
    expect(su.length, 'phải giữ được sự kiện đã ghi trọn').toBe(1);
    expect((su[0]!.e as { msg: string }).msg).toBe('xong bước 1');
  });

  it('sổ chưa tồn tại → mảng rỗng, không ném lỗi', () => {
    expect(docSoSuKienTuDia('chua-co-bao-gio')).toEqual([]);
  });
});

describe('bảng sự kiện là BẢN ĐỌC — dựng lại được từ sổ', () => {
  it('dựng lại bảng từ sổ cho ra đúng dòng sự kiện', () => {
    // Câu «file là nguồn, bảng là bản đọc» chỉ có hiệu lực khi tồn tại đường một chiều dựng lại
    // bảng từ file. Không có nó thì hai bên là hai nguồn ngang hàng — đúng khuôn «cửa song sinh».
    kho.saveMeta(meta({ id: 'r4', trangThai: 'xong' }));
    ghiSo('r4', [
      JSON.stringify({ t: 0, e: { type: 'stage', stage: 1, ten: 'Nhận artifact' } }),
      JSON.stringify({ t: 50, e: { type: 'log', msg: 'một dòng log' } }),
    ]);
    expect(kho.readEvents('r4'), 'bảng phải trống trước khi dựng lại').toEqual([]);

    const rm = new RunManager();
    expect(rm.dungLaiSoTuDia('r4')).toBe(2);

    const trongBang = kho.readEvents('r4');
    expect(trongBang.map((x) => x.e.type)).toEqual(['stage', 'log']);
    expect(trongBang.map((x) => x.t)).toEqual([0, 50]);
  });
});

describe('lượt mồ côi — nối lại được thì KHÔNG phải mồ côi', () => {
  it('lượt còn sổ trên đĩa được nối lại, và không bị đánh dấu hỏng', () => {
    kho.saveMeta(meta({ id: 'song', trangThai: 'dang_chay' }));
    ghiSo('song', [JSON.stringify({ t: 0, e: { type: 'stage', stage: 2, ten: 'Đọc spec' } })]);

    const rm = new RunManager();
    const noiLai = rm.noiLaiLuotDangChay();
    expect(noiLai, 'lượt còn sổ phải nối lại được').toContain('song');

    const moCoi = rm.cleanupOrphanRuns(noiLai);
    expect(moCoi, 'lượt đã nối lại KHÔNG được đếm là mồ côi').not.toContain('song');
    expect(kho.readMeta('song')?.trangThai, 'lượt đang chạy đúng thì trạng thái phải giữ nguyên').toBe('dang_chay');
  });

  it('lượt KHÔNG còn sổ thì vẫn thành mồ côi, và có ghi lý do', () => {
    // Vế đối chứng: thiếu ca này thì một bản «nối lại tất» cũng xanh ở ca trên, và trần chạy song
    // song sẽ bị khoá vĩnh viễn bởi những lượt đã chết từ đời nào.
    kho.saveMeta(meta({ id: 'chet', trangThai: 'dang_chay' }));
    const rm = new RunManager();
    const noiLai = rm.noiLaiLuotDangChay();
    expect(noiLai, 'không có sổ thì không nối lại được gì').not.toContain('chet');

    expect(rm.cleanupOrphanRuns(noiLai)).toContain('chet');
    expect(kho.readMeta('chet')?.trangThai).toBe('loi');
    const lyDo = kho.readEvents('chet').map((x) => (x.e as { msg?: string }).msg ?? '').join(' ');
    expect(lyDo, 'chuyển sang lỗi mà không nói vì sao cũng là báo thiếu bản chất').toMatch(/bỏ dở|dừng giữa chừng/);
  });
});
