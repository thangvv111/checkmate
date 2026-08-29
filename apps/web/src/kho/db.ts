import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GOC } from '../paths.js';

// Tầng dữ liệu (specs/R9). Đây là nơi DUY NHẤT trong hệ biết mình đang chạy trên SQLite.
// node:sqlite còn ở diện thử nghiệm, nhưng bề mặt dùng ở đây rất hẹp (exec · prepare · run · get · all),
// nên đổi sang thư viện khác về sau chỉ phải sửa file này.

export const DUONG_DB = process.env.CHECKMATE_DB ?? join(GOC, 'web-runs', 'checkmate.db');

const SCHEMA = `
-- Sổ cái verdict: CHỈ GHI THÊM. Trigger bên dưới là thứ thi hành luật đó, không phải kỷ luật người viết code.
CREATE TABLE IF NOT EXISTS so_cai (
  run_id      TEXT PRIMARY KEY,
  luc         TEXT NOT NULL,
  skill       TEXT NOT NULL,
  artifact    TEXT NOT NULL,
  sha         TEXT NOT NULL,
  verdict     TEXT NOT NULL CHECK (verdict IN ('PASS','FAIL')),
  high        INTEGER NOT NULL DEFAULT 0,
  medium      INTEGER NOT NULL DEFAULT 0,
  low         INTEGER NOT NULL DEFAULT 0,
  pr          INTEGER,
  tac_gia     TEXT,
  repo        TEXT,
  model       TEXT NOT NULL,
  token_vao   INTEGER,
  token_ra    INTEGER,
  token_uoc   INTEGER,
  backfill    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_so_cai_luc ON so_cai(luc DESC);
-- Index KÉP (repo, luc): lọc theo repo luôn kèm sắp xếp mới-nhất-trước. Chỉ đánh trên cột repo thì
-- SQLite phải dựng b-tree tạm để sắp xếp — phép thử 10.000 dòng ở bench/quy-mo-so-cai.ts bắt được
-- đúng chỗ này. Index kép cũng phục vụ luôn truy vấn chỉ lọc theo repo (tiền tố trái).
DROP INDEX IF EXISTS ix_so_cai_repo;
CREATE INDEX IF NOT EXISTS ix_so_cai_repo_luc ON so_cai(repo, luc DESC);
CREATE INDEX IF NOT EXISTS ix_so_cai_tac_gia  ON so_cai(tac_gia);

CREATE TRIGGER IF NOT EXISTS so_cai_cam_sua
BEFORE UPDATE ON so_cai
BEGIN SELECT RAISE(ABORT, 'so cai chi ghi them: khong duoc SUA'); END;

CREATE TRIGGER IF NOT EXISTS so_cai_cam_xoa
BEFORE DELETE ON so_cai
BEGIN SELECT RAISE(ABORT, 'so cai chi ghi them: khong duoc XOA'); END;

-- Sổ hành động cổng: ai merge, ai trả về dev, chấp nhận cảnh báo nào. Cũng chỉ ghi thêm.
CREATE TABLE IF NOT EXISTS so_cong (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id    TEXT NOT NULL,
  luc       TEXT NOT NULL,
  hanh_dong TEXT NOT NULL CHECK (hanh_dong IN ('merge','reject')),
  nguoi     TEXT NOT NULL,
  chi_tiet  TEXT
);
CREATE INDEX IF NOT EXISTS ix_so_cong_run ON so_cong(run_id);

CREATE TRIGGER IF NOT EXISTS so_cong_cam_sua
BEFORE UPDATE ON so_cong
BEGIN SELECT RAISE(ABORT, 'so cong chi ghi them: khong duoc SUA'); END;

CREATE TRIGGER IF NOT EXISTS so_cong_cam_xoa
BEFORE DELETE ON so_cong
BEGIN SELECT RAISE(ABORT, 'so cong chi ghi them: khong duoc XOA'); END;

-- Lượt chấm. Khác sổ cái: bảng này SỬA ĐƯỢC (trạng thái đổi khi chạy xong, kết quả cổng ghi sau).
-- Sổ cái mới là nơi kết luận đóng băng.
CREATE TABLE IF NOT EXISTS run (
  id             TEXT PRIMARY KEY,
  tieu_de        TEXT NOT NULL,
  skill          TEXT NOT NULL,
  trang_thai     TEXT NOT NULL CHECK (trang_thai IN ('dang_chay','xong','loi')),
  bat_dau        TEXT NOT NULL,
  ket_thuc       TEXT,
  repo           TEXT,
  pr_so          INTEGER,
  pr_head_sha    TEXT,
  pr_tac_gia     TEXT,
  verdict        TEXT,
  cong_hanh_dong TEXT,
  cong_luc       TEXT,
  cong_nguoi     TEXT,
  cong_chi_tiet  TEXT
);
CREATE INDEX IF NOT EXISTS ix_run_bat_dau      ON run(bat_dau DESC);
CREATE INDEX IF NOT EXISTS ix_run_repo_bat_dau ON run(repo, bat_dau DESC);
CREATE INDEX IF NOT EXISTS ix_run_pr           ON run(pr_so, pr_head_sha);

-- Dòng sự kiện của mỗi lượt, dùng để phát lại. Tách bảng riêng để danh sách lượt chấm không phải
-- kéo theo hàng nghìn dòng log — đúng chỗ mà bản đời file trước đây làm sai.
CREATE TABLE IF NOT EXISTS run_su_kien (
  run_id  TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  thu_tu  INTEGER NOT NULL,
  t       INTEGER NOT NULL,
  e       TEXT NOT NULL,
  PRIMARY KEY (run_id, thu_tu)
);

-- Sổ di trú: ghi nhận mỗi bước nạp dữ liệu cũ đã chạy, để lần khởi động sau không nạp lại.
CREATE TABLE IF NOT EXISTS da_di_tru (
  buoc   TEXT PRIMARY KEY,
  luc    TEXT NOT NULL,
  so_dong INTEGER NOT NULL DEFAULT 0,
  bo_qua  INTEGER NOT NULL DEFAULT 0
);
`;

let db: DatabaseSync | null = null;

export function moDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DUONG_DB), { recursive: true });
  const d = new DatabaseSync(DUONG_DB);
  // WAL: nhiều lượt chấm chạy song song cùng ghi (R8) — nhật ký nối tiếp thì chúng chặn nhau.
  d.exec('PRAGMA journal_mode = WAL');
  d.exec('PRAGMA foreign_keys = ON');
  d.exec('PRAGMA busy_timeout = 5000');
  d.exec(SCHEMA);
  db = d;
  return d;
}

/** Đóng và quên kết nối — dùng cho test, và cho lệnh cần mở lại cơ sở dữ liệu khác. */
export function dongDb(): void {
  if (!db) return;
  db.close();
  db = null;
}
