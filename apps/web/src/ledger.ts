import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chuanMuc, type Verdict } from '../../../packages/shared/src/types.js';
import { GOC } from './paths.js';
import type { RunMeta } from './runs.js';

// Sổ cái verdict (spec §12 · B4.1): append-only MỌI verdict — bề mặt truy vết cho kiểm soát/kiểm toán.
// Khác review-log.jsonl (sổ HÀNH ĐỘNG cổng merge/reject) — sổ này ghi KẾT LUẬN chấm.

const SO = join(GOC, 'web-runs', 'verdict-ledger.jsonl');

export interface MucSoCai {
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
  model: string;
  backfill?: boolean;
}

function demTheoMuc(v: Verdict): { high: number; medium: number; low: number } {
  const d = { high: 0, medium: 0, low: 0 };
  for (const f of v.findings) d[chuanMuc(f.severity)]++;
  return d;
}

export function mucTuMeta(meta: RunMeta, backfill = false): MucSoCai | null {
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
    model: v.model,
    ...(backfill ? { backfill: true } : {}),
  };
}

export function ghiSoCai(muc: MucSoCai): void {
  appendFileSync(SO, JSON.stringify(muc) + '\n', 'utf8');
}

export function docSoCai(): MucSoCai[] {
  if (!existsSync(SO)) return [];
  return readFileSync(SO, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      // W6: một dòng hỏng (sập giữa lúc ghi, sửa tay nhầm) không được brick cả trang sổ cái
      try { return [JSON.parse(l) as MucSoCai]; } catch { return []; }
    });
}

// Chạy một lần lúc server khởi động: run cũ có verdict mà chưa vào sổ → append (đánh dấu backfill)
export function backfillSoCai(metas: RunMeta[]): number {
  const daCo = new Set(docSoCai().map((m) => m.run_id));
  let them = 0;
  for (const meta of metas.filter((m) => m.verdict && !daCo.has(m.id))) {
    const muc = mucTuMeta(meta, true);
    if (muc) {
      ghiSoCai(muc);
      them++;
    }
  }
  return them;
}
