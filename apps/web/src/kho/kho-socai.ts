import { moDb } from './db.js';
import type { MucSoCai } from '../ledger.js';

// Kho sổ cái (specs/R9). Lọc chạy bằng SQL chứ không nạp cả bảng lên rồi lọc trong bộ nhớ,
// và mọi giá trị người dùng nhập đều đi qua tham số ràng buộc — không ghép chuỗi SQL.

export interface LocSoCai {
  repo?: string;
  verdict?: 'PASS' | 'FAIL';
  skill?: 'code' | 'doc';
  tac_gia?: string;
  q?: string; // tìm trong tên artifact và SHA
  gioi_han?: number;
  bo_qua?: number;
}

type Hang = Record<string, unknown>;

function veMuc(h: Hang): MucSoCai {
  const so = (k: string): number | undefined => (h[k] == null ? undefined : Number(h[k]));
  const chu = (k: string): string | undefined => (h[k] == null ? undefined : String(h[k]));
  return {
    run_id: String(h.run_id),
    luc: String(h.luc),
    skill: String(h.skill) as MucSoCai['skill'],
    artifact: String(h.artifact),
    sha: String(h.sha),
    verdict: String(h.verdict) as MucSoCai['verdict'],
    high: Number(h.high),
    medium: Number(h.medium),
    low: Number(h.low),
    pr: so('pr'),
    tac_gia: chu('tac_gia'),
    repo: chu('repo'),
    model: String(h.model),
    token_vao: so('token_vao'),
    token_ra: so('token_ra'),
    token_uoc: h.token_uoc == null ? undefined : Boolean(h.token_uoc),
    backfill: Boolean(h.backfill),
  };
}

/** Lỗi khi verdict của một run đã có trong sổ — sổ chỉ ghi thêm, một run vào đúng một lần (R9.5). */
export class LoiTrungRun extends Error {}

export function ghiSoCai(m: MucSoCai): void {
  const d = moDb();
  try {
    d.prepare(
      `INSERT INTO so_cai (run_id, luc, skill, artifact, sha, verdict, high, medium, low,
                           pr, tac_gia, repo, model, token_vao, token_ra, token_uoc, backfill)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      m.run_id, m.luc, m.skill, m.artifact, m.sha, m.verdict, m.high, m.medium, m.low,
      m.pr ?? null, m.tac_gia ?? null, m.repo ?? null, m.model,
      m.token_vao ?? null, m.token_ra ?? null, m.token_uoc == null ? null : (m.token_uoc ? 1 : 0),
      m.backfill ? 1 : 0,
    );
  } catch (e) {
    // Ghi đè im lặng là mất bản ghi cũ mà không ai biết — báo đúng bản chất để chỗ gọi tự quyết.
    if (/UNIQUE|PRIMARY KEY/i.test((e as Error).message)) {
      throw new LoiTrungRun(`Run ${m.run_id} đã có trong sổ cái — sổ chỉ ghi thêm, không ghi đè`);
    }
    throw e;
  }
}

/** Đã có trong sổ thì bỏ qua, không ném. Dùng cho di trú và backfill, nơi chạy lại là chuyện bình thường. */
export function ghiSoCaiNeuChua(m: MucSoCai): boolean {
  try {
    ghiSoCai(m);
    return true;
  } catch (e) {
    if (e instanceof LoiTrungRun) return false;
    throw e;
  }
}

function dungWhere(loc: LocSoCai): { sql: string; tham: unknown[] } {
  const dk: string[] = [];
  const tham: unknown[] = [];
  if (loc.repo) { dk.push('repo = ?'); tham.push(loc.repo); }
  if (loc.verdict) { dk.push('verdict = ?'); tham.push(loc.verdict); }
  if (loc.skill) { dk.push('skill = ?'); tham.push(loc.skill); }
  if (loc.tac_gia) { dk.push('tac_gia = ?'); tham.push(loc.tac_gia); }
  if (loc.q?.trim()) {
    dk.push('(artifact LIKE ? OR sha LIKE ?)');
    const mau = `%${loc.q.trim()}%`;
    tham.push(mau, mau);
  }
  return { sql: dk.length ? ` WHERE ${dk.join(' AND ')}` : '', tham };
}

export function docSoCai(loc: LocSoCai = {}): MucSoCai[] {
  const { sql, tham } = dungWhere(loc);
  let cau = `SELECT * FROM so_cai${sql} ORDER BY luc DESC`;
  const t = [...tham];
  if (loc.gioi_han != null) { cau += ' LIMIT ?'; t.push(loc.gioi_han); }
  if (loc.bo_qua != null) { cau += loc.gioi_han == null ? ' LIMIT -1 OFFSET ?' : ' OFFSET ?'; t.push(loc.bo_qua); }
  return (moDb().prepare(cau).all(...(t as never[])) as Hang[]).map(veMuc);
}

export function demSoCai(loc: LocSoCai = {}): number {
  const { sql, tham } = dungWhere(loc);
  const h = moDb().prepare(`SELECT COUNT(*) AS n FROM so_cai${sql}`).get(...(tham as never[])) as Hang;
  return Number(h.n);
}

export function coTrongSoCai(runId: string): boolean {
  return moDb().prepare('SELECT 1 FROM so_cai WHERE run_id = ?').get(runId) !== undefined;
}

// ---- Sổ hành động cổng ----

export interface MucSoCong {
  run_id: string;
  luc: string;
  hanh_dong: 'merge' | 'reject';
  nguoi: string;
  /** R11.16 — tác giả PR ĐÓNG BĂNG tại thời điểm bấm; bảng `run` sửa được nên không nối sang đó để tra */
  tac_gia_pr?: string;
  /** R6.21 — hàng này do ĐỐI SOÁT ghi: hành động đã xảy ra NGOÀI CheckMate, không qua cổng */
  ngoai_cong?: boolean;
  chi_tiet?: string;
}

export function ghiSoCong(m: MucSoCong): void {
  moDb()
    .prepare('INSERT INTO so_cong (run_id, luc, hanh_dong, nguoi, tac_gia_pr, ngoai_cong, chi_tiet) VALUES (?,?,?,?,?,?,?)')
    .run(m.run_id, m.luc, m.hanh_dong, m.nguoi, m.tac_gia_pr ?? null, m.ngoai_cong ? 1 : 0, m.chi_tiet ?? null);
}

/**
 * Run đã chấm một pull request nhưng sổ cổng chưa có hàng nào cho nó (R6.20).
 *
 * Đây là danh sách cần ĐỐI SOÁT: hoặc PR còn mở (chưa có hành động nào, đúng), hoặc PR đã merge/đóng
 * bằng đường khác và sổ đang im lặng ở đúng chỗ cần nói.
 */
/**
 * Mỗi pull request ĐÃ CHẤM một dòng: repo, số PR, và lượt chấm MỚI NHẤT của nó (R6.20).
 *
 * KHÔNG lọc bỏ theo «đã có hàng sổ nào chưa». Bản trước lọc như thế nên một lượt đã mang hàng
 * `reject` do người bấm bị loại khỏi diện, và khi PR đó sau này bị merge thẳng bằng đường khác thì
 * lần merge KHÔNG được ghi; tệ hơn, lượt mới nhất bị loại làm hàng ngoài-cổng rơi xuống lượt CŨ —
 * lượt có verdict đã hết hiệu lực (vòng hai của cổng bắt cả hai).
 * Quyết định ghi hay không thuộc về phép so HÀNH ĐỘNG (`hanhDongCongCuaPr`), không thuộc phép lọc này.
 */
export function prCanDoiSoat(): Array<{ run_id: string; pr_so: number; repo: string }> {
  const hang = moDb()
    .prepare(
      // Lượt MỚI NHẤT của mỗi cặp (repo, PR) — `id` của hàng có rowid lớn nhất.
      // Run không gắn repo thì không đối soát được: không biết hỏi GitHub ở đâu.
      `SELECT r.id AS run_id, r.pr_so, r.repo
         FROM run r
        WHERE r.pr_so IS NOT NULL
          AND r.repo IS NOT NULL AND r.repo <> ''
          AND r.rowid = (SELECT MAX(r2.rowid) FROM run r2
                          WHERE r2.pr_so = r.pr_so AND r2.repo = r.repo)
        ORDER BY r.rowid DESC`,
    )
    .all() as Array<{ run_id: unknown; pr_so: unknown; repo: unknown }>;
  return hang.map((h) => ({ run_id: String(h.run_id), pr_so: Number(h.pr_so), repo: String(h.repo ?? '') }));
}

/**
 * Những HÀNH ĐỘNG cổng đã ghi cho một pull request (mọi lượt chấm của nó), trong cùng một repo.
 *
 * Dùng để trả lời «PR này đã qua cổng với hành động X chưa» — khác hẳn «PR này đã có hàng sổ nào
 * chưa»: một PR từng bị trả về dev qua cổng rồi sau đó bị merge thẳng bằng `gh` thì lần MERGE đó vẫn
 * là hành động ngoài cổng chưa ai ghi (vòng hai của cổng bắt).
 */
export function hanhDongCongCuaPr(repo: string, prSo: number): Array<{ hanh_dong: 'merge' | 'reject'; ngoai_cong: boolean }> {
  // R6.21 — MỌI phép đếm/lọc hành động cổng phải xét cờ `ngoai_cong`: một PR có hàng merge do NGƯỜI
  // bấm trong CheckMate và một PR chỉ có hàng merge do MÁY đối soát ghi lại là hai chuyện khác hẳn
  // nhau, mà bản trước trả về cùng một thứ (vòng ba của cổng bắt).
  const hang = moDb()
    .prepare(
      `SELECT DISTINCT s.hanh_dong AS hd, s.ngoai_cong AS nc
         FROM so_cong s JOIN run r ON r.id = s.run_id
        WHERE r.pr_so = ? AND r.repo = ?`,
    )
    .all(prSo, repo) as Array<{ hd: unknown; nc: unknown }>;
  return hang.map((h) => ({ hanh_dong: String(h.hd) as 'merge' | 'reject', ngoai_cong: Number(h.nc ?? 0) === 1 }));
}

export function docSoCong(runId?: string): MucSoCong[] {
  const d = moDb();
  const hang = (runId
    ? d.prepare('SELECT * FROM so_cong WHERE run_id = ? ORDER BY luc DESC').all(runId)
    : d.prepare('SELECT * FROM so_cong ORDER BY luc DESC').all()) as Hang[];
  return hang.map((h) => ({
    tac_gia_pr: h.tac_gia_pr == null ? undefined : String(h.tac_gia_pr),
    run_id: String(h.run_id),
    luc: String(h.luc),
    hanh_dong: String(h.hanh_dong) as MucSoCong['hanh_dong'],
    nguoi: String(h.nguoi),
    ngoai_cong: Number(h.ngoai_cong ?? 0) === 1,
    chi_tiet: h.chi_tiet == null ? undefined : String(h.chi_tiet),
  }));
}
