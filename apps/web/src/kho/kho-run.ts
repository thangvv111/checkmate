import { moDb } from './db.js';
import type { RunMeta, StoredEvent } from '../runs.js';
import type { Verdict } from '../../../../packages/shared/src/types.js';

// Kho lượt chấm (specs/R9). Thay cho cách cũ: mỗi lượt một file JSON, và mỗi lần cần danh sách thì
// đọc TOÀN BỘ thư mục rồi nạp cả dòng sự kiện lên bộ nhớ. Ở đây danh sách chỉ đụng bảng `run`,
// còn dòng sự kiện chỉ được đọc khi thật sự phát lại một lượt.

export interface LocRun {
  repo?: string;
  skill?: 'code' | 'doc';
  trang_thai?: RunMeta['trangThai'];
  gioi_han?: number;
  bo_qua?: number;
}

type Hang = Record<string, unknown>;

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
  if (h.cong_hanh_dong != null) {
    meta.ketQuaCong = {
      hanhDong: String(h.cong_hanh_dong) as 'merge' | 'reject',
      luc: String(h.cong_luc ?? ''),
      nguoi: String(h.cong_nguoi ?? ''),
      chiTiet: String(h.cong_chi_tiet ?? ''),
    };
  }
  return meta;
}

export function luuMeta(m: RunMeta): void {
  moDb()
    .prepare(
      `INSERT INTO run (id, tieu_de, skill, trang_thai, bat_dau, ket_thuc, repo,
                        pr_so, pr_head_sha, pr_tac_gia, verdict,
                        cong_hanh_dong, cong_luc, cong_nguoi, cong_chi_tiet)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         tieu_de=excluded.tieu_de, skill=excluded.skill, trang_thai=excluded.trang_thai,
         bat_dau=excluded.bat_dau, ket_thuc=excluded.ket_thuc, repo=excluded.repo,
         pr_so=excluded.pr_so, pr_head_sha=excluded.pr_head_sha, pr_tac_gia=excluded.pr_tac_gia,
         verdict=excluded.verdict, cong_hanh_dong=excluded.cong_hanh_dong, cong_luc=excluded.cong_luc,
         cong_nguoi=excluded.cong_nguoi, cong_chi_tiet=excluded.cong_chi_tiet`,
    )
    .run(
      m.id, m.tieuDe, m.skill, m.trangThai, m.batDau, m.ketThuc ?? null, m.repo ?? null,
      m.pr?.so ?? null, m.pr?.headSha ?? null, m.pr?.tacGia ?? null,
      m.verdict ? JSON.stringify(m.verdict) : null,
      m.ketQuaCong?.hanhDong ?? null, m.ketQuaCong?.luc ?? null,
      m.ketQuaCong?.nguoi ?? null, m.ketQuaCong?.chiTiet ?? null,
    );
}

/**
 * Cập nhật RIÊNG cụm cột hành động cổng của một lượt — dùng cho đối soát (R6.20).
 *
 * Không dùng `luuMeta` vì nó ghi đè cả hàng: đối soát chỉ biết chuyện xảy ra ở cổng, không có bản
 * meta đầy đủ trong tay, và ghi đè bằng dữ liệu thiếu là làm hỏng hàng đang đúng.
 */
export function capNhatCongRun(id: string, hanhDong: 'merge' | 'reject', luc: string, nguoi: string, chiTiet?: string): void {
  moDb()
    .prepare('UPDATE run SET cong_hanh_dong=?, cong_luc=?, cong_nguoi=?, cong_chi_tiet=? WHERE id=?')
    .run(hanhDong, luc, nguoi, chiTiet ?? null, id);
}

/** Ghi trọn dòng sự kiện của một lượt. Xoá bản cũ trước để ghi lại không đẻ ra bản trùng. */
export function luuSuKien(runId: string, events: StoredEvent[]): void {
  const d = moDb();
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

export function docMeta(id: string): RunMeta | undefined {
  const h = moDb().prepare('SELECT * FROM run WHERE id = ?').get(id) as Hang | undefined;
  return h ? veMeta(h) : undefined;
}

export function docSuKien(runId: string): StoredEvent[] {
  const hang = moDb().prepare('SELECT t, e FROM run_su_kien WHERE run_id = ? ORDER BY thu_tu').all(runId) as Hang[];
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

function dungWhere(loc: LocRun): { sql: string; tham: unknown[] } {
  const dk: string[] = [];
  const tham: unknown[] = [];
  if (loc.repo) { dk.push('repo = ?'); tham.push(loc.repo); }
  if (loc.skill) { dk.push('skill = ?'); tham.push(loc.skill); }
  if (loc.trang_thai) { dk.push('trang_thai = ?'); tham.push(loc.trang_thai); }
  return { sql: dk.length ? ` WHERE ${dk.join(' AND ')}` : '', tham };
}

export function danhSachRun(loc: LocRun = {}): RunMeta[] {
  const { sql, tham } = dungWhere(loc);
  let cau = `SELECT * FROM run${sql} ORDER BY bat_dau DESC`;
  const t = [...tham];
  if (loc.gioi_han != null) { cau += ' LIMIT ?'; t.push(loc.gioi_han); }
  if (loc.bo_qua != null) { cau += loc.gioi_han == null ? ' LIMIT -1 OFFSET ?' : ' OFFSET ?'; t.push(loc.bo_qua); }
  return (moDb().prepare(cau).all(...(t as never[])) as Hang[]).map(veMeta);
}

export function demRun(loc: LocRun = {}): number {
  const { sql, tham } = dungWhere(loc);
  const h = moDb().prepare(`SELECT COUNT(*) AS n FROM run${sql}`).get(...(tham as never[])) as Hang;
  return Number(h.n);
}

/** Verdict đã chấm cho đúng cặp (PR, commit) — nền của luật chấm-lại-idempotent theo SHA. */
export function timTheoPr(so: number, sha: string): RunMeta | undefined {
  const h = moDb()
    .prepare("SELECT * FROM run WHERE pr_so = ? AND pr_head_sha = ? AND trang_thai = 'xong' ORDER BY bat_dau DESC LIMIT 1")
    .get(so, sha) as Hang | undefined;
  return h ? veMeta(h) : undefined;
}

export function dangChayPr(so: number): boolean {
  return moDb().prepare("SELECT 1 FROM run WHERE pr_so = ? AND trang_thai = 'dang_chay'").get(so) !== undefined;
}

export function soDangChay(): number {
  const h = moDb().prepare("SELECT COUNT(*) AS n FROM run WHERE trang_thai = 'dang_chay'").get() as Hang;
  return Number(h.n);
}

/** Các PR đã bị trả về dev — để hàng đợi không đánh mất việc. */
/**
 * Dọn lượt chấm MỒ CÔI — hàng còn `dang_chay` từ một tiến trình đã chết (Ctrl-C, deploy, crash).
 *
 * Trước khi trạng thái xuống cơ sở dữ liệu, nó sống trong bộ nhớ tiến trình nên restart là sạch. Nay nó
 * BỀN VỮNG qua restart mà không có đường tự phục hồi: hai hàng mồ côi là `soDangChay()` trả 2 vĩnh
 * viễn ⇒ mọi lượt bấm tay nhận 429 và chế độ trực dừng ngay vòng đầu. CheckMate đứng hình, không log
 * gì bất thường, chỉ sửa được bằng cách mở SQL. Cùng bệnh mà R8.7 đã đặt luật cho khoá thư viện probe.
 *
 * Gọi lúc khởi động: tiến trình web là chủ duy nhất của các lượt nó khởi chạy — nó vừa mới lên thì
 * không có lượt nào của nó đang chạy, nên mọi hàng `dang_chay` còn sót đều là xác của lần chạy trước.
 */
export function donLuotMoCoi(): string[] {
  const db = moDb();
  const moCoi = db.prepare("SELECT id FROM run WHERE trang_thai = 'dang_chay'").all() as Array<{ id: string }>;
  if (!moCoi.length) return [];
  const luc = new Date().toISOString();
  db.prepare("UPDATE run SET trang_thai = 'loi', ket_thuc = ? WHERE trang_thai = 'dang_chay'").run(luc);
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

export function daTraVe(gioiHan = 30): RunMeta[] {
  return (moDb()
    .prepare("SELECT * FROM run WHERE cong_hanh_dong = 'reject' ORDER BY bat_dau DESC LIMIT ?")
    .all(gioiHan) as Hang[]).map(veMeta);
}
