import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
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
  -- R11.16: dong bang tai thoi diem bam. Bang run SUA DUOC, nen tra loi cau hoi kiem toan bang cach
  -- noi sang do la pha dung tinh chat ma trigger chi-ghi-them sinh ra de giu.
  tac_gia_pr TEXT,
  -- R6.21: hang do DOI SOAT ghi (hanh dong xay ra NGOAI CheckMate) phai phan biet duoc voi hang do
  -- nguoi bam trong cong, o muc DU LIEU chu khong chi bang chu trong ghi chu.
  ngoai_cong INTEGER NOT NULL DEFAULT 0,
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

-- ============ Danh tính người thao tác (specs/R11) ============
-- Ngoại lệ CÓ CHỦ ĐÍCH với R9.13: hash mật khẩu không mở được gì bên ngoài hệ này, còn tài khoản thì
-- cần truy vấn và nối. Cái giá là R11.8 — file này từ nay là dữ liệu nhạy cảm, phải ở quyền 600.
CREATE TABLE IF NOT EXISTS nguoi_dung (
  ten       TEXT PRIMARY KEY,
  hash      TEXT NOT NULL,
  muoi      TEXT NOT NULL,
  vai       TEXT NOT NULL CHECK (vai IN ('nguoi_xem','van_hanh','duyet_cong')),
  tao_luc   TEXT NOT NULL,
  doi_mk_luc TEXT
);

-- Chỉ lưu HASH của token phiên (R11.11): ai đọc được file này cũng không dựng lại được phiên đang sống.
-- Hệ quả có chủ đích — hệ thống không có bí mật ký dùng chung nào, tức không có thứ để rò.
CREATE TABLE IF NOT EXISTS phien (
  token_hash TEXT PRIMARY KEY,
  ten        TEXT NOT NULL REFERENCES nguoi_dung(ten) ON DELETE CASCADE,
  tao_luc    TEXT NOT NULL,
  het_han    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_phien_ten ON phien(ten);
CREATE INDEX IF NOT EXISTS ix_phien_het_han ON phien(het_han);

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
  // recursive_triggers mặc định TẮT, và khi tắt thì lệnh xoá NGẦM do `INSERT OR REPLACE` sinh ra KHÔNG
  // kích hoạt trigger DELETE. Nghĩa là `so_cai_cam_xoa` chặn được DELETE viết thẳng nhưng thủng với
  // REPLACE — hàng FAIL bị ghi đè thành PASS, không ném lỗi, không để lại bản cũ. Đã dựng lại được.
  // R9.4 nói tính chỉ-ghi-thêm phải do CƠ SỞ DỮ LIỆU thi hành, nên bịt bằng pragma chứ không bằng
  // kỷ luật "đừng ai viết REPLACE".
  d.exec('PRAGMA recursive_triggers = ON');
  d.exec(SCHEMA);
  napCotThieu(d);
  d.exec('PRAGMA foreign_keys = ON'); // đặt lại sau ALTER, phòng khi bước trên tắt nó đi
  sietQuyenDb();
  db = d;
  return d;
}

/**
 * `CREATE TABLE IF NOT EXISTS` KHÔNG thêm cột vào bảng đã tồn tại — nó lặng lẽ bỏ qua cả câu lệnh.
 * Nghĩa là thêm một cột vào SCHEMA chỉ có tác dụng trên máy có cơ sở dữ liệu RỖNG: máy dev chạy ngon,
 * máy chủ đã có dữ liệu thì thiếu cột và chết lúc ghi. Đúng loại hỏng chỉ lộ ra ở production.
 *
 * Mỗi cột thêm về sau phải khai ở đây một dòng. Bảng mới thì không cần — `CREATE TABLE` lo được.
 */
function napCotThieu(d: DatabaseSync): void {
  const them: Array<[string, string, string]> = [
    // [bảng, cột, kiểu] — R11.16: đóng băng tên tác giả PR vào chính hàng sổ cổng
    ['so_cong', 'tac_gia_pr', 'TEXT'],
    // R6.21 — cờ hàng NGOÀI CỔNG. Thêm CỘT chứ không thêm giá trị cho `hanh_dong`: đổi `CHECK` đòi
    // dựng lại bảng (SQLite không ALTER được CHECK), mà bảng này là sổ kiểm toán đang giữ dữ liệu
    // thật và có trigger cấm XOÁ — dựng lại nó là thao tác nguy hiểm nhất có thể làm với một cuốn sổ.
    ['so_cong', 'ngoai_cong', 'INTEGER NOT NULL DEFAULT 0'],
    // R6.21 — cờ phải sang CẢ bảng `run`: `ketQuaCong` là bề mặt mà giao diện và API đọc, nếu chỉ
    // sổ mang cờ thì hàng máy-đối-soát và hàng người-bấm nhìn giống hệt nhau ở đó.
    ['run', 'cong_ngoai_cong', 'INTEGER NOT NULL DEFAULT 0'],
  ];
  for (const [bang, cot, kieu] of them) {
    const daCo = (d.prepare(`PRAGMA table_info(${bang})`).all() as Array<{ name: string }>).some((c) => c.name === cot);
    if (!daCo) d.exec(`ALTER TABLE ${bang} ADD COLUMN ${cot} ${kieu}`);
  }
}

/**
 * R11.8 — từ khi tài khoản vào cơ sở dữ liệu (R11.7), file này mang hash mật khẩu, tức là dữ liệu nhạy
 * cảm. Siết quyền cả ba file: `-wal` và `-shm` chứa dữ liệu chưa dồn vào file chính, để hở chúng thì
 * siết mỗi file chính là siết nửa vời.
 */
function sietQuyenDb(): void {
  for (const duoi of ['', '-wal', '-shm']) {
    try {
      chmodSync(DUONG_DB + duoi, 0o600);
    } catch {
      /* file chưa tồn tại, hoặc hệ không chmod được (Windows) — bỏ qua */
    }
  }
}

/** Đóng và quên kết nối — dùng cho test, và cho lệnh cần mở lại cơ sở dữ liệu khác. */
export function dongDb(): void {
  if (!db) return;
  db.close();
  db = null;
}
