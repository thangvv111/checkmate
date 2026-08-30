import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tầng dữ liệu (specs/R9). Điểm quan trọng nhất được kiểm ở đây: tính CHỈ-GHI-THÊM của sổ cái phải do
// cơ sở dữ liệu thi hành, không phải do người viết code tự giữ kỷ luật.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-db-'));
process.env.CHECKMATE_DB = join(thuMuc, 'thu.db');

const { moDb, dongDb } = await import('../apps/web/src/kho/db.js');
const { ghiSoCai, ghiSoCaiNeuChua, docSoCai, demSoCai, coTrongSoCai, ghiSoCong, docSoCong, LoiTrungRun } =
  await import('../apps/web/src/kho/kho-socai.js');
type MucSoCai = Parameters<typeof ghiSoCai>[0];

const muc = (p: Partial<MucSoCai> & { run_id: string }): MucSoCai => ({
  luc: '2026-08-27T10:00:00.000Z',
  skill: 'code',
  artifact: 'PR #8 · code',
  sha: 'e711ced0a1',
  verdict: 'PASS',
  high: 0,
  medium: 0,
  low: 0,
  model: 'claude-cli/claude-sonnet-5',
  ...p,
});

beforeAll(() => {
  const d = moDb();
  d.exec('DELETE FROM da_di_tru');
});
afterAll(() => {
  dongDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('sổ cái chỉ ghi thêm — do cơ sở dữ liệu thi hành', () => {
  it('ghi rồi đọc lại được nguyên vẹn', () => {
    ghiSoCai(muc({ run_id: 'r1', repo: 'a/b', tac_gia: 'thang', pr: 8, token_vao: 41000, token_ra: 3000, token_uoc: true }));
    const ra = docSoCai({ repo: 'a/b' });
    expect(ra).toHaveLength(1);
    expect(ra[0]).toMatchObject({ run_id: 'r1', repo: 'a/b', tac_gia: 'thang', pr: 8, token_uoc: true });
  });

  it('UPDATE lên bảng sổ cái bị TỪ CHỐI ở tầng cơ sở dữ liệu', () => {
    expect(() => moDb().exec("UPDATE so_cai SET verdict = 'FAIL' WHERE run_id = 'r1'")).toThrow(/chi ghi them/i);
    expect(docSoCai({ repo: 'a/b' })[0].verdict).toBe('PASS');
  });

  it('DELETE lên bảng sổ cái bị TỪ CHỐI ở tầng cơ sở dữ liệu', () => {
    expect(() => moDb().exec("DELETE FROM so_cai WHERE run_id = 'r1'")).toThrow(/chi ghi them/i);
    expect(coTrongSoCai('r1')).toBe(true);
  });

  it('cùng một run vào sổ hai lần thì bị từ chối, không ghi đè âm thầm', () => {
    expect(() => ghiSoCai(muc({ run_id: 'r1', verdict: 'FAIL' }))).toThrow(LoiTrungRun);
  });

  it('đường dành cho di trú thì bỏ qua bản trùng thay vì ném', () => {
    expect(ghiSoCaiNeuChua(muc({ run_id: 'r1' }))).toBe(false);
    expect(ghiSoCaiNeuChua(muc({ run_id: 'r2', repo: 'a/b' }))).toBe(true);
  });
});

describe('lọc bằng SQL', () => {
  beforeAll(() => {
    ghiSoCai(muc({ run_id: 'r3', repo: 'khac/repo', verdict: 'FAIL', high: 2, luc: '2026-08-26T09:00:00.000Z' }));
    ghiSoCai(muc({ run_id: 'r4', repo: 'a/b', skill: 'doc', tac_gia: 'mai', sha: 'abc9999' }));
  });

  it('lọc theo repo tách bạch từng repo', () => {
    expect(demSoCai({ repo: 'a/b' })).toBe(3);
    expect(demSoCai({ repo: 'khac/repo' })).toBe(1);
  });

  it('các bộ lọc chồng nhau theo kiểu VÀ', () => {
    expect(docSoCai({ repo: 'a/b', skill: 'doc' }).map((m) => m.run_id)).toEqual(['r4']);
  });

  it('tìm chữ khớp cả tên artifact lẫn SHA', () => {
    expect(docSoCai({ q: 'abc9999' }).map((m) => m.run_id)).toEqual(['r4']);
    expect(demSoCai({ q: 'PR #8' })).toBe(4);
  });

  it('sắp xếp mới nhất trước', () => {
    expect(docSoCai().at(-1)?.run_id).toBe('r3');
  });

  it('phân trang bằng giới hạn và bỏ qua', () => {
    expect(docSoCai({ gioi_han: 2 })).toHaveLength(2);
    expect(docSoCai({ bo_qua: 3 })).toHaveLength(1);
  });

  it('dấu nháy trong chuỗi tìm không phá được câu truy vấn', () => {
    expect(() => docSoCai({ q: "'; DROP TABLE so_cai; --" })).not.toThrow();
    expect(demSoCai()).toBe(4);
  });
});

describe('sổ hành động cổng', () => {
  it('ghi và đọc theo run', () => {
    ghiSoCong({ run_id: 'r1', luc: '2026-08-27T11:00:00.000Z', hanh_dong: 'merge', nguoi: 'thang', chi_tiet: '1 cảnh báo medium được chấp nhận' });
    expect(docSoCong('r1')).toHaveLength(1);
    expect(docSoCong('r1')[0].hanh_dong).toBe('merge');
  });

  it('cũng chỉ ghi thêm — sửa và xoá đều bị từ chối', () => {
    expect(() => moDb().exec("UPDATE so_cong SET nguoi = 'ai do'")).toThrow(/chi ghi them/i);
    expect(() => moDb().exec('DELETE FROM so_cong')).toThrow(/chi ghi them/i);
  });

  it('hành động ngoài merge và reject bị chặn', () => {
    expect(() => moDb().exec("INSERT INTO so_cong (run_id, luc, hanh_dong, nguoi) VALUES ('r1','x','xoa_het','ke_gian')")).toThrow();
  });
});

describe('sổ cái thủng đường REPLACE nếu thiếu recursive_triggers (R9.4, R9.5)', () => {
  it('INSERT OR REPLACE lên sổ cái bị TỪ CHỐI, không âm thầm ghi đè', () => {
    // Ca thật dựng lại được: trigger cấm-xoá là BEFORE DELETE, mà lệnh xoá NGẦM do REPLACE sinh ra
    // không kích hoạt trigger khi recursive_triggers TẮT (mặc định của SQLite). Hàng FAIL biến thành
    // PASS, không ném lỗi, không còn bản cũ — đúng thứ R9.5 gọi là "âm thầm ghi đè".
    ghiSoCai(muc({ run_id: 'r-replace', verdict: 'FAIL', high: 3 }));
    expect(() =>
      moDb().exec(
        "INSERT OR REPLACE INTO so_cai (run_id, luc, skill, artifact, sha, verdict, high, medium, low, model) " +
          "VALUES ('r-replace', '2026-08-30T00:00:00.000Z', 'code', 'PR #8 - code', 'e711ced0a1', 'PASS', 0, 0, 0, 'x')",
      ),
    ).toThrow(/chi ghi them|khong duoc XOA|khong duoc SUA/i);
    const con = docSoCai().find((m) => m.run_id === 'r-replace');
    expect(con?.verdict).toBe('FAIL');
    expect(con?.high).toBe(3);
  });
});
