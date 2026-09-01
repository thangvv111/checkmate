import { chuanMuc, type Verdict } from '../../../packages/shared/src/types.js';
import type { RunMeta } from './runs.js';
import { readVerdictLedger as khoDocSoCai, appendVerdictLedger as khoGhiSoCai, appendVerdictLedgerIfNew, inVerdictLedger } from './kho/kho-socai.js';

// Sổ cái verdict (spec §12 · B4.1): append-only MỌI verdict — bề mặt truy vết cho kiểm soát/kiểm toán.
// Khác review-log.jsonl (sổ HÀNH ĐỘNG cổng merge/reject) — sổ này ghi KẾT LUẬN chấm.

export interface VerdictLedgerEntry {
  luc: string;
  run_id: string;
  skill: 'code' | 'doc';
  artifact: string;
  sha: string;
  verdict: 'PASS' | 'FAIL';
  high: number;
  medium: number;
  low: number;
  pr?: number;
  tac_gia?: string;
  repo?: string;
  model: string;
  token_vao?: number;
  token_ra?: number;
  token_uoc?: boolean;
  backfill?: boolean;
}

function demTheoMuc(v: Verdict): { high: number; medium: number; low: number } {
  const d = { high: 0, medium: 0, low: 0 };
  for (const f of v.findings) d[chuanMuc(f.severity)]++;
  return d;
}

export function entryFromMeta(meta: RunMeta, backfill = false): VerdictLedgerEntry | null {
  if (!meta.verdict) return null;
  const v = meta.verdict;
  return {
    luc: v.finished_at,
    run_id: meta.id,
    skill: meta.skill,
    artifact: meta.tieuDe,
    sha: v.artifact_ref.sha_or_hash.slice(0, 10),
    verdict: v.result,
    ...demTheoMuc(v),
    pr: meta.pr?.so,
    tac_gia: meta.pr?.tacGia,
    repo: meta.repo,
    model: v.model,
    ...(v.chi_phi ? { token_vao: v.chi_phi.token_vao, token_ra: v.chi_phi.token_ra, token_uoc: v.chi_phi.uoc_tinh } : {}),
    ...(backfill ? { backfill: true } : {}),
  };
}

// Sổ cái nay sống trong cơ sở dữ liệu (specs/R9) — hai tên dưới chỉ còn là cửa vào lớp kho,
// giữ lại để chỗ gọi cũ không phải đổi.
export const appendVerdictLedger = khoGhiSoCai;
export const readVerdictLedger = khoDocSoCai;

// Chạy một lần lúc server khởi động: lượt chấm cũ có verdict mà chưa vào sổ → ghi thêm (đánh dấu backfill)
export function backfillVerdictLedger(metas: RunMeta[]): number {
  let them = 0;
  for (const meta of metas) {
    if (!meta.verdict || inVerdictLedger(meta.id)) continue;
    const muc = entryFromMeta(meta, true);
    if (muc && appendVerdictLedgerIfNew(muc)) them++;
  }
  return them;
}
