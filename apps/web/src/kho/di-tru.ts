import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { moDb } from './db.js';
import { ghiSoCaiNeuChua, ghiSoCong } from './kho-socai.js';
import { docMeta, luuMeta, luuSuKien } from './kho-run.js';
import type { RunMeta, StoredEvent } from '../runs.js';
import { GOC } from '../../../../packages/shared/src/paths.js';
import type { MucSoCai } from '../ledger.js';

// Di trú dữ liệu đời file sang cơ sở dữ liệu (specs/R9.7–R9.9).
// Ba luật xương sống: chạy đúng MỘT lần cho mỗi bước, KHÔNG xoá file gốc, và dòng hỏng thì bỏ qua
// rồi ĐẾM ra chứ không im lặng nuốt.

export interface KetQuaDiTru {
  buoc: string;
  daChay: boolean; // false = đã di trú từ trước, lượt này không làm gì
  soDong: number;
  boQua: number;
}

function daLam(buoc: string): boolean {
  return moDb().prepare('SELECT 1 FROM da_di_tru WHERE buoc = ?').get(buoc) !== undefined;
}

function ghiNhan(buoc: string, soDong: number, boQua: number): void {
  moDb()
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

function diTruSoCai(): KetQuaDiTru {
  const buoc = 'so-cai-jsonl';
  if (daLam(buoc)) return { buoc, daChay: false, soDong: 0, boQua: 0 };
  const { muc, boQua } = docJsonl<MucSoCai>(join(GOC, 'web-runs', 'verdict-ledger.jsonl'));
  let dem = 0;
  let hong = 0;
  for (const m of muc) {
    if (!m?.run_id || !m.verdict) {
      continue; // bản ghi thiếu khoá thì không dựng được hàng — đếm vào phần bỏ qua bên dưới
    }
    try {
      if (ghiSoCaiNeuChua(m)) dem++;
    } catch (e) {
      // MỘT dòng hỏng không được giết cả lượt di trú. Sổ JSONL cũ nằm ở file người ta sửa tay được
      // (chính R9.4 nêu điều đó là lý do phải bỏ nó), nên một dòng thiếu cột NOT NULL hoặc mang
      // verdict viết thường là chuyện thường. Trước đây lỗi ràng buộc thoát khỏi đây, làm sập
      // `diTruTatCa()` NGAY LÚC KHỞI ĐỘNG — server không lên, và lặp lại y hệt mỗi lần restart.
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

function diTruSoCong(): KetQuaDiTru {
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
    ghiSoCong({ run_id: m.run_id, luc: m.luc, hanh_dong: hd, nguoi: m.nguoi ?? 'không rõ', chi_tiet: chiTiet });
    dem++;
  }
  ghiNhan(buoc, dem, hong);
  return { buoc, daChay: true, soDong: dem, boQua: hong };
}


function diTruRun(): KetQuaDiTru {
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
    if (docMeta(meta.id)) continue; // đã nạp từ trước
    luuMeta(meta);
    if (data.events?.length) luuSuKien(meta.id, data.events);
    dem++;
  }
  ghiNhan(buoc, dem, hong);
  return { buoc, daChay: true, soDong: dem, boQua: hong };
}

/**
 * Chạy mọi bước di trú còn thiếu. Gọi ở lúc khởi động; các lần sau là không-làm-gì.
 * File gốc KHÔNG bị xoá — chúng ở lại làm bản đối chứng.
 */
export function diTruTatCa(): KetQuaDiTru[] {
  return [diTruSoCai(), diTruSoCong(), diTruRun()];
}

export function tomTatDiTru(kq: KetQuaDiTru[]): string {
  const daChay = kq.filter((k) => k.daChay);
  if (!daChay.length) return '';
  return daChay
    .map((k) => `${k.buoc}: nạp ${k.soDong} bản ghi${k.boQua ? `, bỏ qua ${k.boQua} dòng hỏng` : ''}`)
    .join(' · ');
}
