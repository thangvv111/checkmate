import { describe, it, expect, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Di trú R6.26 — bỏ cụm cột `cong_*` khỏi bảng `run`.
 *
 * Ca này chạy trên cơ sở dữ liệu ĐỜI CŨ dựng bằng tay, vì đó mới là thứ có trên máy chủ: máy dev
 * luôn tạo bảng theo schema mới nên không bao giờ đi qua đường di trú. Hai điều phải giữ:
 *   1. Hàng bề mặt đang khai một hành động mà SỔ KHÔNG CÓ thì được CỨU vào sổ, không biến mất theo cột.
 *   2. Hàng đã có trong sổ thì KHÔNG bị nhân đôi — sổ chỉ-ghi-thêm nên một hàng thừa là sai vĩnh viễn.
 */

const goc = mkdtempSync(join(tmpdir(), 'checkmate-ditru-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
const duongDan = join(goc, 'web-runs', 'run.db');
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = duongDan;

// Dựng cơ sở dữ liệu ĐỜI CŨ trước khi nạp module — đúng thứ tự xảy ra trên máy chủ.
{
  const d = new DatabaseSync(duongDan);
  d.exec(`
    CREATE TABLE run (
      id TEXT PRIMARY KEY, tieu_de TEXT NOT NULL, skill TEXT NOT NULL,
      trang_thai TEXT NOT NULL CHECK (trang_thai IN ('dang_chay','xong','loi')),
      bat_dau TEXT NOT NULL, ket_thuc TEXT, repo TEXT,
      pr_so INTEGER, pr_head_sha TEXT, pr_tac_gia TEXT, verdict TEXT,
      cong_hanh_dong TEXT, cong_luc TEXT, cong_nguoi TEXT, cong_chi_tiet TEXT
    );
    CREATE TABLE so_cong (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, luc TEXT NOT NULL,
      hanh_dong TEXT NOT NULL CHECK (hanh_dong IN ('merge','reject')), nguoi TEXT NOT NULL,
      tac_gia_pr TEXT, ngoai_cong INTEGER NOT NULL DEFAULT 0, chi_tiet TEXT
    );
    CREATE TRIGGER so_cong_cam_sua BEFORE UPDATE ON so_cong
      BEGIN SELECT RAISE(ABORT, 'so cong chi ghi them: khong duoc SUA'); END;
    CREATE TRIGGER so_cong_cam_xoa BEFORE DELETE ON so_cong
      BEGIN SELECT RAISE(ABORT, 'so cong chi ghi them: khong duoc XOA'); END;
  `);
  const themRun = d.prepare(
    `INSERT INTO run (id, tieu_de, skill, trang_thai, bat_dau, repo, pr_so, pr_head_sha,
                      cong_hanh_dong, cong_luc, cong_nguoi, cong_chi_tiet)
     VALUES (?,?,?,'xong',?,?,?,?,?,?,?,?)`,
  );
  // (a) bề mặt khai merge, SỔ KHÔNG CÓ — đúng cái bệnh change này chữa, phải được cứu
  themRun.run('r-mo-coi', 'PR #101', 'code', '2026-08-30T09:00:00.000Z', 'a/b', 101, 'sha101',
    'merge', '2026-08-30T10:00:00.000Z', 'vinac', 'merge tay đời cũ');
  // (b) bề mặt khai reject VÀ sổ đã có hàng — không được nhân đôi
  themRun.run('r-co-so', 'PR #102', 'code', '2026-08-30T09:00:00.000Z', 'a/b', 102, 'sha102',
    'reject', '2026-08-30T11:00:00.000Z', 'thang.vv', 'trả về dev');
  d.prepare('INSERT INTO so_cong (run_id, luc, hanh_dong, nguoi, chi_tiet) VALUES (?,?,?,?,?)')
    .run('r-co-so', '2026-08-30T11:00:00.000Z', 'reject', 'thang.vv', 'trả về dev');
  // (c) lượt chưa có hành động nào
  d.prepare(`INSERT INTO run (id, tieu_de, skill, trang_thai, bat_dau) VALUES (?,?,?,'xong',?)`)
    .run('r-trong', 'PR #103', 'code', '2026-08-30T09:00:00.000Z');
  d.close();
}

const db = await import('../apps/web/src/kho/db.js');
const kho = await import('../apps/web/src/kho/kho-run.js');
const so = await import('../apps/web/src/kho/kho-socai.js');

afterAll(() => {
  db.dongDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('di trú R6.26 trên cơ sở dữ liệu đời cũ', () => {
  it('M16 — tiền đề: file này chạy ở chế độ DEMO, và di trú VẪN phải chạy', async () => {
    // PO chốt phương án A (01/09): R6.12 cấm THAO TÁC CỔNG, không cấm DI TRÚ DỮ LIỆU lúc khởi động.
    // Gác cửa di trú lại thì cột vẫn bị bỏ mà dữ liệu KHÔNG được cứu — biến một bước bảo toàn thành
    // một bước mất dữ liệu. Ca này đỏ nếu ai đó về sau thêm gác demo vào cửa ấy.
    const { MODE } = await import('../apps/web/src/config.js');
    expect(MODE, 'không đặt CHECKMATE_MODE thì mặc định là demo').toBe('demo');
  });

  it('bỏ sạch cụm cột cong_* khỏi bảng run', () => {
    const cot = (db.moDb().prepare('PRAGMA table_info(run)').all() as Array<{ name: string }>).map((c) => c.name);
    for (const c of ['cong_hanh_dong', 'cong_luc', 'cong_nguoi', 'cong_chi_tiet', 'cong_ngoai_cong']) {
      expect(cot).not.toContain(c);
    }
  });

  it('hàng bề mặt KHÔNG có trong sổ được CỨU vào sổ, không mất theo cột', () => {
    const hang = so.docSoCong('r-mo-coi');
    expect(hang, 'mất hàng này là mất dấu vết một hành động cổng đã xảy ra thật').toHaveLength(1);
    expect(hang[0].hanh_dong).toBe('merge');
    expect(hang[0].nguoi).toBe('vinac');
    expect(hang[0].luc).toBe('2026-08-30T10:00:00.000Z');
    expect(hang[0].chi_tiet, 'phải nói rõ hàng này từ đâu ra').toMatch(/di trú từ cụm cột bề mặt đời cũ/);
    expect(hang[0].chi_tiet, 'giữ nguyên phần mô tả cũ, không nuốt').toMatch(/merge tay đời cũ/);
  });

  it('hàng đã có trong sổ KHÔNG bị nhân đôi', () => {
    expect(so.docSoCong('r-co-so'), 'sổ chỉ-ghi-thêm: một hàng thừa là sai vĩnh viễn').toHaveLength(1);
  });

  it('lượt chưa có hành động nào thì sổ vẫn trống', () => {
    expect(so.docSoCong('r-trong')).toHaveLength(0);
    expect(kho.docMeta('r-trong')?.ketQuaCong).toBeUndefined();
  });

  it('bề mặt đọc lại đúng sau di trú — suy từ sổ', () => {
    expect(kho.docMeta('r-mo-coi')?.ketQuaCong?.hanhDong).toBe('merge');
    expect(kho.docMeta('r-mo-coi')?.ketQuaCong?.nguoi).toBe('vinac');
    expect(kho.docMeta('r-co-so')?.ketQuaCong?.hanhDong).toBe('reject');
  });

  it('chạy lại lần hai không đẻ thêm hàng nào (idempotent)', () => {
    db.dongDb();
    db.moDb();
    expect(so.docSoCong('r-mo-coi')).toHaveLength(1);
    expect(so.docSoCong('r-co-so')).toHaveLength(1);
  });
});
