import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { KeHoachProbe } from './skill-code.js';

// Thư viện probe tích luỹ per repo đích (spec §11-C): file probe đã chứng minh khớp contract
// (mọi probe pass trên nhánh gốc) được giữ lại làm regression suite cho các lượt chấm sau.

const GOC_LIB = process.env.CHECKER_LIB_DIR ?? resolve('probes-lib');
const TRAN_FILE = 12;

export interface MucThuVien {
  ten: string; // tên file, vd lib-ab12cd3-1.probe.test.ts
  sha_sinh: string; // commit PR mà lượt sinh ra nó đã chấm
  luc: string;
  hash: string; // sha256 nội dung — dedup
  plan: KeHoachProbe[];
}

export interface BoProbeThuVien {
  ten: string;
  code: string;
  plan: KeHoachProbe[];
}

interface MetaLib {
  files: MucThuVien[];
}

export function slugRepo(repoPath: string): string {
  return basename(repoPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function docMeta(slug: string): MetaLib {
  const f = join(GOC_LIB, slug, 'meta.json');
  if (!existsSync(f)) return { files: [] };
  return JSON.parse(readFileSync(f, 'utf8')) as MetaLib;
}

function ghiMeta(slug: string, meta: MetaLib): void {
  mkdirSync(join(GOC_LIB, slug), { recursive: true });
  writeFileSync(join(GOC_LIB, slug, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
}

export function docThuVien(slug: string): BoProbeThuVien[] {
  const meta = docMeta(slug);
  const kq: BoProbeThuVien[] = [];
  for (const m of meta.files) {
    const f = join(GOC_LIB, slug, m.ten);
    if (existsSync(f)) kq.push({ ten: m.ten, code: readFileSync(f, 'utf8'), plan: m.plan });
  }
  return kq;
}

// Nhận file probe mới vào thư viện. Trả về tên file nếu nhận, null nếu trùng nội dung đã có.
export function nhanVaoThuVien(slug: string, code: string, plan: KeHoachProbe[], shaSinh: string): string | null {
  const hash = createHash('sha256').update(code).digest('hex');
  const meta = docMeta(slug);
  if (meta.files.some((m) => m.hash === hash)) return null;

  const ten = `lib-${shaSinh.slice(0, 7)}-${meta.files.length + 1}.probe.test.ts`;
  mkdirSync(join(GOC_LIB, slug), { recursive: true });
  writeFileSync(join(GOC_LIB, slug, ten), code, 'utf8');
  meta.files.push({ ten, sha_sinh: shaSinh, luc: new Date().toISOString(), hash, plan });

  // trần FIFO — evict file cũ nhất
  while (meta.files.length > TRAN_FILE) {
    const cu = meta.files.shift()!;
    try {
      rmSync(join(GOC_LIB, slug, cu.ten));
    } catch {
      /* file đã mất thì thôi */
    }
  }
  ghiMeta(slug, meta);
  return ten;
}
