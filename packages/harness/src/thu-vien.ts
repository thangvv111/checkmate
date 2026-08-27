import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as MetaLib;
  } catch {
    return { files: [] }; // L10: meta hỏng không được giết run — thư viện coi như rỗng, admission sẽ ghi lại
  }
}

function ghiMeta(slug: string, meta: MetaLib): void {
  mkdirSync(join(GOC_LIB, slug), { recursive: true });
  writeFileSync(join(GOC_LIB, slug, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
}

// Hai lượt chấm cùng một repo chạy song song là chuyện bình thường (trần hiện tại 2 lượt), và mỗi lượt
// là một TIẾN TRÌNH riêng nên không dùng chung biến khoá được. Nạp probe vào thư viện là đọc → sửa →
// ghi: không khoá thì lượt về sau ghi đè meta của lượt trước — probe vừa nạp biến mất khỏi sổ trong khi
// file vẫn nằm lại trên đĩa, vừa mất tài sản regression vừa để rác không ai dọn.
// mkdir là thao tác nguyên tử trên cả Windows lẫn Linux nên dùng luôn làm khoá giữa các tiến trình.
const CHO_KHOA_MS = 10_000;
const KHOA_QUA_HAN_MS = 60_000;

function nguNgan(ms: number): void {
  // ngủ ĐỒNG BỘ: nhánh gọi là hàm sync, không có chỗ để await
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function voiKhoaThuVien<T>(slug: string, viec: () => T): T {
  const duong = join(GOC_LIB, slug, '.khoa');
  mkdirSync(join(GOC_LIB, slug), { recursive: true });
  const hetHan = Date.now() + CHO_KHOA_MS;
  let giuKhoa = false;
  for (;;) {
    try {
      mkdirSync(duong);
      giuKhoa = true;
      break;
    } catch {
      // Khoá của một tiến trình đã chết phải được phá, kẻo cả thư viện đứng hình vĩnh viễn
      try {
        if (Date.now() - statSync(duong).mtimeMs > KHOA_QUA_HAN_MS) {
          rmSync(duong, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // khoá vừa được tiến trình khác nhả — thử lại ngay
      }
      if (Date.now() > hetHan) break; // chờ đủ lâu rồi: thà đua nhau còn hơn bỏ mất probe
      nguNgan(60);
    }
  }
  try {
    return viec();
  } finally {
    if (giuKhoa) {
      try {
        rmSync(duong, { recursive: true, force: true });
      } catch {
        /* khoá đã bị tiến trình khác phá vì quá hạn */
      }
    }
  }
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
export function nhanVaoThuVien(slug: string, code: string, plan: KeHoachProbe[], shaSinh: string, ext = '.probe.test.ts'): string | null {
  const hash = createHash('sha256').update(code).digest('hex');
  // Toàn bộ đọc → sửa → ghi nằm TRONG khoá, và meta được đọc lại bên trong: đọc ngoài khoá là đọc
  // bản có thể đã cũ, ghi đè lên phần lượt song song vừa thêm.
  return voiKhoaThuVien(slug, () => {
    const meta = docMeta(slug);
    if (meta.files.some((m) => m.hash === hash)) return null;

    // underscore + không dấu chấm thừa: tên phải là module hợp lệ với MỌI stack (bài học pytest)
    // Hậu tố lấy từ hash chứ không từ số thứ tự: hai lượt song song cùng chấm một commit sẽ ra cùng
    // số thứ tự và đạp lên file của nhau.
    const ten = `lib_${shaSinh.slice(0, 7)}_${hash.slice(0, 6)}${ext}`;
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
  });
}
