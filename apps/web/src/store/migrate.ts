import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from './db.js';
import { appendVerdictLedgerIfNew, appendGateLedger } from './ledger-store.js';
import { readEvents, readMeta, saveMeta, saveEvents } from './run-store.js';
import type { RunMeta, StoredEvent } from '../runs.js';
import type { InsufficientBasisKind } from '../../../../packages/shared/src/types.js';
import { GOC } from '../../../../packages/shared/src/paths.js';
import type { VerdictLedgerEntry } from '../ledger.js';

// Di trú dữ liệu đời file sang cơ sở dữ liệu (specs/R9.7–R9.9).
// Ba luật xương sống: chạy đúng MỘT lần cho mỗi bước, KHÔNG xoá file gốc, và dòng hỏng thì bỏ qua
// rồi ĐẾM ra chứ không im lặng nuốt.

export interface MigrationResult {
  buoc: string;
  daChay: boolean; // false = đã di trú từ trước, lượt này không làm gì
  soDong: number;
  boQua: number;
}

function daLam(buoc: string): boolean {
  return openDb().prepare('SELECT 1 FROM da_di_tru WHERE buoc = ?').get(buoc) !== undefined;
}

function ghiNhan(buoc: string, soDong: number, boQua: number): void {
  openDb()
    .prepare('INSERT INTO da_di_tru (buoc, luc, so_dong, bo_qua) VALUES (?,?,?,?)')
    .run(buoc, new Date().toISOString(), soDong, boQua);
}

/** Đọc file JSONL, bỏ qua dòng hỏng và đếm lại — một dòng hỏng không được làm sập cả lượt di trú. */
function docJsonl<T>(duong: string): { muc: T[]; boQua: number } {
  if (!existsSync(duong)) return { muc: [], boQua: 0 };
  const muc: T[] = [];
  let boQua = 0;
  for (const dong of readFileSync(duong, 'utf8').split('\n')) {
    const s = dong.trim();
    if (!s) continue;
    try {
      muc.push(JSON.parse(s) as T);
    } catch {
      boQua++;
    }
  }
  return { muc, boQua };
}

function diTruSoCai(): MigrationResult {
  const buoc = 'so-cai-jsonl';
  if (daLam(buoc)) return { buoc, daChay: false, soDong: 0, boQua: 0 };
  const { muc, boQua } = docJsonl<VerdictLedgerEntry>(join(GOC, 'web-runs', 'verdict-ledger.jsonl'));
  let dem = 0;
  let hong = 0;
  for (const m of muc) {
    if (!m?.run_id || !m.verdict) {
      continue; // bản ghi thiếu khoá thì không dựng được hàng — đếm vào phần bỏ qua bên dưới
    }
    try {
      if (appendVerdictLedgerIfNew(m)) dem++;
    } catch (e) {
      // MỘT dòng hỏng không được giết cả lượt di trú. Sổ JSONL cũ nằm ở file người ta sửa tay được
      // (chính R9.4 nêu điều đó là lý do phải bỏ nó), nên một dòng thiếu cột NOT NULL hoặc mang
      // verdict viết thường là chuyện thường. Trước đây lỗi ràng buộc thoát khỏi đây, làm sập
      // `migrateAll()` NGAY LÚC KHỞI ĐỘNG — server không lên, và lặp lại y hệt mỗi lần restart.
      //
      // Không nuốt im lặng: nói rõ dòng nào, vì sao, để người vận hành sửa được đúng dòng đó.
      hong++;
      console.error(`Di trú sổ cái: bỏ qua bản ghi run_id=${m.run_id} — ${(e as Error).message.slice(0, 200)}`);
    }
  }
  const thieuKhoa = muc.filter((m) => !m?.run_id || !m.verdict).length;
  const boSot = boQua + thieuKhoa + hong;
  ghiNhan(buoc, dem, boSot);
  return { buoc, daChay: true, soDong: dem, boQua: boSot };
}

interface DongReviewLog {
  luc?: string;
  hanhDong?: string;
  run_id?: string;
  nguoi?: string;
  xac_nhan_medium?: string[];
  ghi_chu?: string;
}

function diTruSoCong(): MigrationResult {
  const buoc = 'so-cong-jsonl';
  if (daLam(buoc)) return { buoc, daChay: false, soDong: 0, boQua: 0 };
  const { muc, boQua } = docJsonl<DongReviewLog>(join(GOC, 'web-runs', 'review-log.jsonl'));
  let dem = 0;
  let hong = boQua;
  for (const m of muc) {
    const hd = m.hanhDong === 'merge' ? 'merge' : m.hanhDong === 'reject' ? 'reject' : null;
    if (!m.run_id || !m.luc || !hd) {
      hong++;
      continue;
    }
    const chiTiet = m.ghi_chu ?? (m.xac_nhan_medium?.length ? `${m.xac_nhan_medium.length} cảnh báo medium được chấp nhận` : undefined);
    appendGateLedger({ run_id: m.run_id, luc: m.luc, hanh_dong: hd, nguoi: m.nguoi ?? 'không rõ', chi_tiet: chiTiet });
    dem++;
  }
  ghiNhan(buoc, dem, hong);
  return { buoc, daChay: true, soDong: dem, boQua: hong };
}


function diTruRun(): MigrationResult {
  const buoc = 'run-json';
  if (daLam(buoc)) return { buoc, daChay: false, soDong: 0, boQua: 0 };
  const thuMuc = join(GOC, 'web-runs');
  if (!existsSync(thuMuc)) {
    ghiNhan(buoc, 0, 0);
    return { buoc, daChay: true, soDong: 0, boQua: 0 };
  }
  let dem = 0;
  let hong = 0;
  for (const f of readdirSync(thuMuc).filter((x) => x.endsWith('.json'))) {
    let data: { meta?: RunMeta; events?: StoredEvent[] };
    try {
      data = JSON.parse(readFileSync(join(thuMuc, f), 'utf8')) as { meta?: RunMeta; events?: StoredEvent[] };
    } catch {
      hong++; // file cụt vì máy chủ sập giữa lúc ghi — bỏ qua nhưng đếm ra
      continue;
    }
    const meta = data.meta;
    if (!meta?.id || !meta.batDau) {
      hong++;
      continue;
    }
    if (readMeta(meta.id)) continue; // đã nạp từ trước
    saveMeta(meta);
    if (data.events?.length) saveEvents(meta.id, data.events);
    dem++;
  }
  ghiNhan(buoc, dem, hong);
  return { buoc, daChay: true, soDong: dem, boQua: hong };
}

/** Câu mà engine đời cũ ném ra khi không đủ cơ sở. CHỈ dùng ở đây. */
const LEGACY_ERROR_PHRASE = 'Không đủ cơ sở kết luận';
/** Dòng log engine đời cũ ghi khi nhánh gốc không chạy được probe nào. */
const LEGACY_BASE_SILENT_TRACE = 'nhánh gốc KHÔNG chạy được probe';

/**
 * Suy kết cục «không đủ cơ sở» của một lượt đời CŨ từ sổ sự kiện của nó — hàm thuần.
 *
 * ⛔ ĐÂY LÀ CHỖ DUY NHẤT trong repo được phép nhận diện kết cục này bằng cách so khớp nội dung thông
 * điệp. Lượt sinh ra từ hôm nay mang trường có kiểu; phép so chuỗi ở đây chỉ để đọc hàng đã ghép trước
 * khi có trường đó, tức một tập ĐÓNG không sinh thêm.
 *
 * Loại ở đây là SUY ĐOÁN, không phải số đo: hàng đời cũ không có dữ liệu để biết chắc. Chấp nhận
 * được vì cái sai tối đa là hiện nhầm MỘT TRONG HAI lời văn cho một lượt đã chết — cả hai loại đều là
 * thất bại, nên không lượt nào được nâng từ «thất bại» lên «có kết quả».
 */
export function inferLegacyInsufficientBasis(
  events: readonly StoredEvent[],
): { loai: InsufficientBasisKind; so_probe: number; ly_do: string } | undefined {
  const ds = Array.isArray(events) ? events : [];
  const loi = ds.find((x) => x?.e?.type === 'error' && String(x.e.msg ?? '').includes(LEGACY_ERROR_PHRASE));
  if (!loi || loi.e.type !== 'error') return undefined;
  const msg = String(loi.e.msg ?? '');
  const sau = msg.slice(msg.indexOf(LEGACY_ERROR_PHRASE) + LEGACY_ERROR_PHRASE.length + 2);
  const soProbe = Number.parseInt(sau, 10);
  const gocKhongChay = ds.some((x) => x?.e?.type === 'log' && String(x.e.msg ?? '').includes(LEGACY_BASE_SILENT_TRACE));
  return {
    loai: gocKhongChay ? 'goc_khong_doi_chung' : 'khong_probe_nao_toi_noi',
    so_probe: Number.isFinite(soProbe) && soProbe > 0 ? soProbe : 0,
    ly_do: msg.slice(0, 600),
  };
}

/**
 * Điền trường `khongDuCoSo` cho hàng đời cũ.
 *
 * Ghi bản mới TRƯỚC, không xoá gì: câu lỗi cũ ở lại nguyên trong sổ sự kiện — nó là bản ghi lịch sử
 * của lượt chấm, không phải bản sao thừa của trường mới.
 *
 * Chỉ đụng hàng `trang_thai='loi'` — hàng ĐÃ CHẾT, không ai ghi nữa. Hàng `dang_chay` không bị chạm,
 * vì hai lượt chấm chạy song song trên prod là trạng thái BÌNH THƯỜNG chứ không phải ca hiếm.
 */
function migrateInsufficientBasis(): MigrationResult {
  const buoc = 'run-khong-du-co-so';
  if (daLam(buoc)) return { buoc, daChay: false, soDong: 0, boQua: 0 };
  const hang = openDb()
    .prepare("SELECT id FROM run WHERE trang_thai = 'loi' AND khong_du_co_so IS NULL")
    .all() as Array<{ id: string }>;
  let dem = 0;
  let boQua = 0;
  for (const { id } of hang) {
    const meta = readMeta(String(id));
    if (!meta) {
      boQua++;
      continue;
    }
    const ketCuc = inferLegacyInsufficientBasis(readEvents(String(id)));
    if (!ketCuc) continue; // lỗi hạ tầng — không phải không-đủ-cơ-sở, để nguyên
    saveMeta({ ...meta, khongDuCoSo: ketCuc });
    dem++;
  }
  ghiNhan(buoc, dem, boQua);
  return { buoc, daChay: true, soDong: dem, boQua };
}

/**
 * Chạy mọi bước di trú còn thiếu. Gọi ở lúc khởi động; các lần sau là không-làm-gì.
 * File gốc KHÔNG bị xoá — chúng ở lại làm bản đối chứng.
 */
export function migrateAll(): MigrationResult[] {
  return [diTruSoCai(), diTruSoCong(), diTruRun(), migrateInsufficientBasis()];
}

export function migrationSummary(kq: MigrationResult[]): string {
  const daChay = kq.filter((k) => k.daChay);
  if (!daChay.length) return '';
  return daChay
    .map((k) => `${k.buoc}: nạp ${k.soDong} bản ghi${k.boQua ? `, bỏ qua ${k.boQua} dòng hỏng` : ''}`)
    .join(' · ');
}
