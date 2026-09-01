import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tầng dữ liệu (specs/R9). Điểm quan trọng nhất được kiểm ở đây: tính CHỈ-GHI-THÊM của sổ cái phải do
// cơ sở dữ liệu thi hành, không phải do người viết code tự giữ kỷ luật.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-db-'));
process.env.CHECKMATE_DB = join(thuMuc, 'thu.db');

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const { appendVerdictLedger, appendVerdictLedgerIfNew, readVerdictLedger, countVerdictLedger, inVerdictLedger, appendGateLedger, readGateLedger, DuplicateRunError } =
  await import('../apps/web/src/store/ledger-store.js');
type VerdictLedgerEntry = Parameters<typeof appendVerdictLedger>[0];

const muc = (p: Partial<VerdictLedgerEntry> & { run_id: string }): VerdictLedgerEntry => ({
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
  const d = openDb();
  d.exec('DELETE FROM da_di_tru');
});
afterAll(() => {
  closeDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('sổ cái chỉ ghi thêm — do cơ sở dữ liệu thi hành', () => {
  it('ghi rồi đọc lại được nguyên vẹn', () => {
    appendVerdictLedger(muc({ run_id: 'r1', repo: 'a/b', tac_gia: 'thang', pr: 8, token_vao: 41000, token_ra: 3000, token_uoc: true }));
    const ra = readVerdictLedger({ repo: 'a/b' });
    expect(ra).toHaveLength(1);
    expect(ra[0]).toMatchObject({ run_id: 'r1', repo: 'a/b', tac_gia: 'thang', pr: 8, token_uoc: true });
  });

  it('UPDATE lên bảng sổ cái bị TỪ CHỐI ở tầng cơ sở dữ liệu', () => {
    expect(() => openDb().exec("UPDATE so_cai SET verdict = 'FAIL' WHERE run_id = 'r1'")).toThrow(/chi ghi them/i);
    expect(readVerdictLedger({ repo: 'a/b' })[0].verdict).toBe('PASS');
  });

  it('DELETE lên bảng sổ cái bị TỪ CHỐI ở tầng cơ sở dữ liệu', () => {
    expect(() => openDb().exec("DELETE FROM so_cai WHERE run_id = 'r1'")).toThrow(/chi ghi them/i);
    expect(inVerdictLedger('r1')).toBe(true);
  });

  it('cùng một run vào sổ hai lần thì bị từ chối, không ghi đè âm thầm', () => {
    expect(() => appendVerdictLedger(muc({ run_id: 'r1', verdict: 'FAIL' }))).toThrow(DuplicateRunError);
  });

  it('đường dành cho di trú thì bỏ qua bản trùng thay vì ném', () => {
    expect(appendVerdictLedgerIfNew(muc({ run_id: 'r1' }))).toBe(false);
    expect(appendVerdictLedgerIfNew(muc({ run_id: 'r2', repo: 'a/b' }))).toBe(true);
  });
});

describe('lọc bằng SQL', () => {
  beforeAll(() => {
    appendVerdictLedger(muc({ run_id: 'r3', repo: 'khac/repo', verdict: 'FAIL', high: 2, luc: '2026-08-26T09:00:00.000Z' }));
    appendVerdictLedger(muc({ run_id: 'r4', repo: 'a/b', skill: 'doc', tac_gia: 'mai', sha: 'abc9999' }));
  });

  it('lọc theo repo tách bạch từng repo', () => {
    expect(countVerdictLedger({ repo: 'a/b' })).toBe(3);
    expect(countVerdictLedger({ repo: 'khac/repo' })).toBe(1);
  });

  it('các bộ lọc chồng nhau theo kiểu VÀ', () => {
    expect(readVerdictLedger({ repo: 'a/b', skill: 'doc' }).map((m) => m.run_id)).toEqual(['r4']);
  });

  it('tìm chữ khớp cả tên artifact lẫn SHA', () => {
    expect(readVerdictLedger({ q: 'abc9999' }).map((m) => m.run_id)).toEqual(['r4']);
    expect(countVerdictLedger({ q: 'PR #8' })).toBe(4);
  });

  it('sắp xếp mới nhất trước', () => {
    expect(readVerdictLedger().at(-1)?.run_id).toBe('r3');
  });

  it('phân trang bằng giới hạn và bỏ qua', () => {
    expect(readVerdictLedger({ gioi_han: 2 })).toHaveLength(2);
    expect(readVerdictLedger({ bo_qua: 3 })).toHaveLength(1);
  });

  it('dấu nháy trong chuỗi tìm không phá được câu truy vấn', () => {
    expect(() => readVerdictLedger({ q: "'; DROP TABLE so_cai; --" })).not.toThrow();
    expect(countVerdictLedger()).toBe(4);
  });
});

describe('sổ hành động cổng', () => {
  it('ghi và đọc theo run', () => {
    appendGateLedger({ run_id: 'r1', luc: '2026-08-27T11:00:00.000Z', hanh_dong: 'merge', nguoi: 'thang', chi_tiet: '1 cảnh báo medium được chấp nhận' });
    expect(readGateLedger('r1')).toHaveLength(1);
    expect(readGateLedger('r1')[0].hanh_dong).toBe('merge');
  });

  it('cũng chỉ ghi thêm — sửa và xoá đều bị từ chối', () => {
    expect(() => openDb().exec("UPDATE so_cong SET nguoi = 'ai do'")).toThrow(/chi ghi them/i);
    expect(() => openDb().exec('DELETE FROM so_cong')).toThrow(/chi ghi them/i);
  });

  it('hành động ngoài merge và reject bị chặn', () => {
    expect(() => openDb().exec("INSERT INTO so_cong (run_id, luc, hanh_dong, nguoi) VALUES ('r1','x','xoa_het','ke_gian')")).toThrow();
  });
});

describe('sổ cái thủng đường REPLACE nếu thiếu recursive_triggers (R9.4, R9.5)', () => {
  it('INSERT OR REPLACE lên sổ cái bị TỪ CHỐI, không âm thầm ghi đè', () => {
    // Ca thật dựng lại được: trigger cấm-xoá là BEFORE DELETE, mà lệnh xoá NGẦM do REPLACE sinh ra
    // không kích hoạt trigger khi recursive_triggers TẮT (mặc định của SQLite). Hàng FAIL biến thành
    // PASS, không ném lỗi, không còn bản cũ — đúng thứ R9.5 gọi là "âm thầm ghi đè".
    appendVerdictLedger(muc({ run_id: 'r-replace', verdict: 'FAIL', high: 3 }));
    expect(() =>
      openDb().exec(
        "INSERT OR REPLACE INTO so_cai (run_id, luc, skill, artifact, sha, verdict, high, medium, low, model) " +
          "VALUES ('r-replace', '2026-08-30T00:00:00.000Z', 'code', 'PR #8 - code', 'e711ced0a1', 'PASS', 0, 0, 0, 'x')",
      ),
    ).toThrow(/chi ghi them|khong duoc XOA|khong duoc SUA/i);
    const con = readVerdictLedger().find((m) => m.run_id === 'r-replace');
    expect(con?.verdict).toBe('FAIL');
    expect(con?.high).toBe(3);
  });
});
