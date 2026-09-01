import { openDb } from './db.js';
import type { RunMeta, StoredEvent } from '../runs.js';
import type { Verdict } from '../../../../packages/shared/src/types.js';

// Kho lượt chấm (specs/R9). Thay cho cách cũ: mỗi lượt một file JSON, và mỗi lần cần danh sách thì
// đọc TOÀN BỘ thư mục rồi nạp cả dòng sự kiện lên bộ nhớ. Ở đây danh sách chỉ đụng bảng `run`,
// còn dòng sự kiện chỉ được đọc khi thật sự phát lại một lượt.

export interface RunFilter {
  repo?: string;
  skill?: 'code' | 'doc';
  trang_thai?: RunMeta['trangThai'];
  gioi_han?: number;
  bo_qua?: number;
}

type Hang = Record<string, unknown>;

/**
 * R6.26 — cụm hành động cổng trên bề mặt lượt chấm là bản PHÁI SINH của sổ, đọc bằng phép nối này.
 *
 * Trước đây nó là bốn cột trên chính bảng `run`, tức một nguồn sự thật thứ hai đứng cạnh sổ
 * chỉ-ghi-thêm — và mọi cửa ghi vào cụm cột ấy đều là một chỗ để bề mặt nói khác sổ. Nay không còn
 * cột, nên không còn cửa ghi: chỉ có một phép ĐỌC, lấy hàng sổ mới nhất của mỗi lượt.
 */
const NOI_SO_CONG = `LEFT JOIN (
       SELECT run_id, hanh_dong, luc, nguoi, chi_tiet, ngoai_cong,
              ROW_NUMBER() OVER (PARTITION BY run_id ORDER BY luc DESC, id DESC) AS rn
       FROM so_cong
     ) sc ON sc.run_id = run.id AND sc.rn = 1`;

const CHON_RUN = `SELECT run.*, sc.hanh_dong AS sc_hanh_dong, sc.luc AS sc_luc, sc.nguoi AS sc_nguoi,
            sc.chi_tiet AS sc_chi_tiet, sc.ngoai_cong AS sc_ngoai_cong
     FROM run ${NOI_SO_CONG}`;

function veMeta(h: Hang): RunMeta {
  const chu = (k: string): string | undefined => (h[k] == null ? undefined : String(h[k]));
  const meta: RunMeta = {
    id: String(h.id),
    tieuDe: String(h.tieu_de),
    skill: String(h.skill) as RunMeta['skill'],
    trangThai: String(h.trang_thai) as RunMeta['trangThai'],
    batDau: String(h.bat_dau),
    ketThuc: chu('ket_thuc'),
    repo: chu('repo'),
  };
  if (h.verdict != null) {
    try {
      meta.verdict = JSON.parse(String(h.verdict)) as Verdict;
    } catch {
      /* verdict hỏng thì coi như chưa có — lượt chấm vẫn tra cứu được */
    }
  }
  if (h.pr_so != null) {
    meta.pr = { so: Number(h.pr_so), headSha: String(h.pr_head_sha ?? ''), tacGia: chu('pr_tac_gia') };
  }
  // Suy TỪ SỔ (R6.26) — không có hàng sổ thì bề mặt không khai hành động nào, đúng theo cấu trúc
  // chứ không nhờ một phép kiểm nào phải nhớ gọi.
  if (h.sc_hanh_dong != null) {
    meta.ketQuaCong = {
      hanhDong: String(h.sc_hanh_dong) as 'merge' | 'reject',
      luc: String(h.sc_luc ?? ''),
      nguoi: String(h.sc_nguoi ?? ''),
      chiTiet: String(h.sc_chi_tiet ?? ''),
      ngoaiCong: Number(h.sc_ngoai_cong ?? 0) === 1,
    };
  }
  return meta;
}

export function saveMeta(m: RunMeta): void {
  openDb()
    .prepare(
      `INSERT INTO run (id, tieu_de, skill, trang_thai, bat_dau, ket_thuc, repo,
                        pr_so, pr_head_sha, pr_tac_gia, verdict)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         tieu_de=excluded.tieu_de, skill=excluded.skill, trang_thai=excluded.trang_thai,
         bat_dau=excluded.bat_dau, ket_thuc=excluded.ket_thuc, repo=excluded.repo,
         pr_so=excluded.pr_so, pr_head_sha=excluded.pr_head_sha, pr_tac_gia=excluded.pr_tac_gia,
         verdict=excluded.verdict`,
    )
    .run(
      m.id, m.tieuDe, m.skill, m.trangThai, m.batDau, m.ketThuc ?? null, m.repo ?? null,
      m.pr?.so ?? null, m.pr?.headSha ?? null, m.pr?.tacGia ?? null,
      m.verdict ? JSON.stringify(m.verdict) : null,
    );
  // `m.ketQuaCong` KHÔNG được ghi ở đây và không có chỗ nào để ghi nữa (R6.26): nó là bản đọc ra từ
  // sổ. Hai vòng chấm liên tiếp bắt đúng cửa này — một lần nó đóng dấu hành động lên bề mặt trong khi
  // sổ trống, một lần nó xoá trắng hành động trong khi sổ vẫn còn hàng. Cả hai chết cùng cụm cột.
}

/** Ghi trọn dòng sự kiện của một lượt. Xoá bản cũ trước để ghi lại không đẻ ra bản trùng. */
export function saveEvents(runId: string, events: StoredEvent[]): void {
  const d = openDb();
  d.exec('BEGIN');
  try {
    d.prepare('DELETE FROM run_su_kien WHERE run_id = ?').run(runId);
    const cau = d.prepare('INSERT INTO run_su_kien (run_id, thu_tu, t, e) VALUES (?,?,?,?)');
    events.forEach((ev, i) => cau.run(runId, i, ev.t, JSON.stringify(ev.e)));
    d.exec('COMMIT');
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export function readMeta(id: string): RunMeta | undefined {
  const h = openDb().prepare(`${CHON_RUN} WHERE run.id = ?`).get(id) as Hang | undefined;
  return h ? veMeta(h) : undefined;
}

export function readEvents(runId: string): StoredEvent[] {
  const hang = openDb().prepare('SELECT t, e FROM run_su_kien WHERE run_id = ? ORDER BY thu_tu').all(runId) as Hang[];
  const ra: StoredEvent[] = [];
  for (const h of hang) {
    try {
      ra.push({ t: Number(h.t), e: JSON.parse(String(h.e)) as StoredEvent['e'] });
    } catch {
      /* một dòng sự kiện hỏng không được làm hỏng cả lượt phát lại */
    }
  }
  return ra;
}

function dungWhere(loc: RunFilter): { sql: string; tham: unknown[] } {
  const dk: string[] = [];
  const tham: unknown[] = [];
  if (loc.repo) { dk.push('repo = ?'); tham.push(loc.repo); }
  if (loc.skill) { dk.push('skill = ?'); tham.push(loc.skill); }
  if (loc.trang_thai) { dk.push('trang_thai = ?'); tham.push(loc.trang_thai); }
  return { sql: dk.length ? ` WHERE ${dk.join(' AND ')}` : '', tham };
}

export function listRuns(loc: RunFilter = {}): RunMeta[] {
  const { sql, tham } = dungWhere(loc);
  let cau = `${CHON_RUN}${sql} ORDER BY bat_dau DESC`;
  const t = [...tham];
  if (loc.gioi_han != null) { cau += ' LIMIT ?'; t.push(loc.gioi_han); }
  if (loc.bo_qua != null) { cau += loc.gioi_han == null ? ' LIMIT -1 OFFSET ?' : ' OFFSET ?'; t.push(loc.bo_qua); }
  return (openDb().prepare(cau).all(...(t as never[])) as Hang[]).map(veMeta);
}

export function countRuns(loc: RunFilter = {}): number {
  const { sql, tham } = dungWhere(loc);
  const h = openDb().prepare(`SELECT COUNT(*) AS n FROM run${sql}`).get(...(tham as never[])) as Hang;
  return Number(h.n);
}

/** Verdict đã chấm cho đúng cặp (PR, commit) — nền của luật chấm-lại-idempotent theo SHA. */
export function findByPr(so: number, sha: string): RunMeta | undefined {
  const h = openDb()
    .prepare(`${CHON_RUN} WHERE pr_so = ? AND pr_head_sha = ? AND trang_thai = 'xong' ORDER BY bat_dau DESC LIMIT 1`)
    .get(so, sha) as Hang | undefined;
  return h ? veMeta(h) : undefined;
}

export function isPrRunning(so: number): boolean {
  return openDb().prepare("SELECT 1 FROM run WHERE pr_so = ? AND trang_thai = 'dang_chay'").get(so) !== undefined;
}

export function runningCount(): number {
  const h = openDb().prepare("SELECT COUNT(*) AS n FROM run WHERE trang_thai = 'dang_chay'").get() as Hang;
  return Number(h.n);
}

/**
 * Các PR đã bị trả về dev — để hàng đợi không đánh mất việc.
 *
 * R6.21 — lọc PHẢI xét cờ `ngoai_cong`. Một pull request bị đóng TRÊN GITHUB thì không ai trả nó về
 * dev cả: hàng sổ tương ứng do máy đối soát **ghi lại**, không phải do người bấm cổng. Đưa nó vào
 * khối «đã trả về dev» là nói với người đọc rằng việc đã được xử, trong khi chưa ai chạm vào — mà
 * khối này tồn tại đúng để hàng đợi không đánh mất việc (M14, nợ tách ra từ chuỗi Đ6).
 */
/**
 * Dọn lượt chấm MỒ CÔI — hàng còn `dang_chay` từ một tiến trình đã chết (Ctrl-C, deploy, crash).
 *
 * Trước khi trạng thái xuống cơ sở dữ liệu, nó sống trong bộ nhớ tiến trình nên restart là sạch. Nay nó
 * BỀN VỮNG qua restart mà không có đường tự phục hồi: hai hàng mồ côi là `runningCount()` trả 2 vĩnh
 * viễn ⇒ mọi lượt bấm tay nhận 429 và chế độ trực dừng ngay vòng đầu. CheckMate đứng hình, không log
 * gì bất thường, chỉ sửa được bằng cách mở SQL. Cùng bệnh mà R8.7 đã đặt luật cho khoá thư viện probe.
 *
 * Gọi lúc khởi động: tiến trình web là chủ duy nhất của các lượt nó khởi chạy — nó vừa mới lên thì
 * không có lượt nào của nó đang chạy, nên mọi hàng `dang_chay` còn sót đều là xác của lần chạy trước.
 */
export function cleanupOrphanRuns(boQua: string[] = []): string[] {
  const db = openDb();
  const tatCa = db.prepare("SELECT id FROM run WHERE trang_thai = 'dang_chay'").all() as Array<{ id: string }>;
  // Lượt ĐÃ NỐI LẠI được (sổ sự kiện còn trên đĩa, tiến trình con còn ghi tiếp) KHÔNG phải mồ côi.
  // Đánh dấu nó hỏng chỉ vì mình vừa khởi động lại là vứt bỏ một lượt đang chạy đúng — và vứt luôn
  // số token đã đốt cho nó.
  const giu = new Set(boQua);
  const moCoi = tatCa.filter((r) => !giu.has(r.id));
  if (!moCoi.length) return [];
  const luc = new Date().toISOString();
  const capNhat = db.prepare("UPDATE run SET trang_thai = 'loi', ket_thuc = ? WHERE id = ?");
  for (const { id } of moCoi) capNhat.run(luc, id);
  // Ghi lý do vào dòng sự kiện: một lượt chuyển sang 'loi' mà không nói vì sao cũng là báo thiếu bản chất
  for (const { id } of moCoi) {
    const n = (db.prepare('SELECT COALESCE(MAX(thu_tu), -1) AS m FROM run_su_kien WHERE run_id = ?').get(id) as { m: number }).m;
    db.prepare('INSERT INTO run_su_kien (run_id, thu_tu, t, e) VALUES (?, ?, ?, ?)').run(
      id,
      n + 1,
      Date.now(),
      JSON.stringify({ type: 'log', msg: 'Lượt chấm bị bỏ dở: tiến trình CheckMate dừng giữa chừng (khởi động lại, deploy hoặc crash). Đánh dấu lỗi khi khởi động lại để trần chạy song song không bị khoá.' }),
    );
  }
  return moCoi.map((r) => r.id);
}

export function returnedToDev(gioiHan = 30): RunMeta[] {
  return (openDb()
    .prepare(`${CHON_RUN} WHERE sc.hanh_dong = 'reject' AND sc.ngoai_cong = 0 ORDER BY bat_dau DESC LIMIT ?`)
    .all(gioiHan) as Hang[]).map(veMeta);
}
