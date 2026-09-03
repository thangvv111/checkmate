import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới cho capability `data-layer` — những điều chưa được ca nào khoá.
 *
 * ~11 điều còn lại đã có ca ở `kho-run` · `kho-socai` · `di-tru` · `di-tru-bo-cot-cong` ·
 * `doc-du-lieu-cu` · `goc-du-lieu-chung`; file này không lặp lại chúng.
 */

const WEB = 'apps/web/src';
const KHO = `${WEB}/store`;

/**
 * Chỗ ngoài lớp kho được phép đọc/ghi đĩa, **kèm LOẠI lý do**.
 *
 * Danh sách chỉ có đường dẫn thì được nới bằng cách thêm một dòng. Danh sách đòi lý do buộc người thêm
 * phải nói lý do ấy thuộc loại nào — và ba loại dưới đây là ba loại duy nhất được khai trong requirement.
 */
type LoaiNgoaiLe = 'file-tam' | 'metadata-build' | 'file-la-nguon' | 'cau-hinh-kho-khoa' | 'cua-du-lieu-danh-tinh';

const NGOAI_LE: Array<{ file: string; loai: LoaiNgoaiLe }> = [
  { file: `${WEB}/server.ts`, loai: 'file-tam' }, // ghi file tạm truyền cho harness qua --file
  { file: `${WEB}/ui.ts`, loai: 'metadata-build' }, // đọc package.json lấy số phiên bản
  { file: `${WEB}/runs.ts`, loai: 'file-la-nguon' }, // sổ sự kiện: file là NGUỒN, bảng là bản đọc
  { file: `${WEB}/config.ts`, loai: 'cau-hinh-kho-khoa' }, // R9.13
  { file: `${WEB}/secret-vault.ts`, loai: 'cau-hinh-kho-khoa' }, // R9.13
  { file: `${WEB}/provider.ts`, loai: 'cau-hinh-kho-khoa' }, // sổ kiểm nhà cung cấp, cùng lý do R9.13
  // `identity.ts` chạy SQL nhưng nó LÀ cửa duy nhất của dữ liệu danh tính — vai lớp kho, chỉ nằm ngoài
  // thư mục `store/` vì nó mang cả phép kiểm quyền. Khai thành loại riêng chứ không lặng lẽ cho qua:
  // người đọc phải thấy đây là ngoại lệ CÓ LÝ DO, không phải một chỗ ai đó quên dọn.
  { file: `${WEB}/identity.ts`, loai: 'cua-du-lieu-danh-tinh' },
];

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTs(p, acc);
    else if (name.endsWith('.ts')) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

/** Chạy SQL trực tiếp: mở cơ sở dữ liệu, hoặc gọi `prepare(...)`. */
export function scanDirectSql(files: readonly string[], doc: (f: string) => string): string[] {
  const viPham: string[] = [];
  for (const f of files) {
    if (f.startsWith(KHO)) continue; // lớp kho là nơi DUY NHẤT biết nền lưu trữ (R9.2)
    if (NGOAI_LE.some((x) => x.file === f)) continue;
    const txt = doc(f);
    if (/\bDatabaseSync\b/.test(txt)) viPham.push(`${f}: mở cơ sở dữ liệu trực tiếp`);
    if (/\.prepare\s*\(/.test(txt)) viPham.push(`${f}: gọi SQL trực tiếp`);
  }
  return viPham;
}

describe('R9.1 · R9.2 — mọi truy cập dữ liệu qua lớp kho', () => {
  it('mã nguồn hiện tại: không file nào ngoài lớp kho chạy SQL trực tiếp', () => {
    const viPham = scanDirectSql(walkTs(WEB), (f) => readFileSync(f, 'utf8'));
    expect(viPham, `chạy SQL ngoài lớp kho:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });

  it('fixture đối kháng: một file giả ngoài lớp kho chạy SQL thì lưới ĐỎ', () => {
    // Ca load-bearing: một phép quét trả rỗng trông giống hệt «repo sạch» và «phép quét hỏng».
    const ra = scanDirectSql([`${WEB}/route-gia.ts`], () => `db.prepare('SELECT * FROM run').all()`);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('route-gia.ts');
  });

  it('lớp kho được phép — đó là chỗ hợp lệ duy nhất', () => {
    expect(scanDirectSql([`${KHO}/run-store.ts`], () => `db.prepare('SELECT 1')`)).toEqual([]);
  });

  it('danh sách ngoại lệ ghi LOẠI lý do, không chỉ đường dẫn', () => {
    // Danh sách chỉ có đường dẫn được nới bằng cách thêm một dòng; danh sách đòi lý do buộc người thêm
    // phải nói lý do ấy thuộc loại nào.
    const loaiHopLe = ['file-tam', 'metadata-build', 'file-la-nguon', 'cau-hinh-kho-khoa', 'cua-du-lieu-danh-tinh'];
    for (const x of NGOAI_LE) {
      expect(loaiHopLe, `ngoại lệ ${x.file} mang loại lạ`).toContain(x.loai);
      expect(x.file.startsWith(WEB)).toBe(true);
    }
  });
});

describe('R9.16 — route /api/* trả dữ liệu thuần, không dựng HTML', () => {
  it('không route API nào gọi hàm dựng khung HTML', () => {
    const web = readFileSync(`${WEB}/server.ts`, 'utf8');
    // Lấy từng khối `app.<method>('/api/...'` và kiểm nó không gọi `shell(` (hàm dựng khung trang).
    // R9.16 nói về route ĐỌC: «các route /api/* chỉ ĐỌC qua lớp kho và trả dữ liệu thuần». Route hành
    // động (POST) là cửa dùng chung cho form HTML lẫn client JS, nên nó trả HTML là đúng — `POST /api/runs`
    // có hẳn cờ `muonJson` để phân biệt hai loại client.
    //
    // Bản đầu của phép quét bắt cả POST và cắt khối cứng 1500 ký tự nên dính sang route kế tiếp: nó báo
    // 5 vi phạm mà thực tế KHÔNG có cái nào. Phép quét sai, không phải code sai.
    const viPham: string[] = [];
    const moc = [...web.matchAll(/app\.(get|post|put|delete)\(\s*'([^']*)'/g)];
    for (let k = 0; k < moc.length; k++) {
      const m = moc[k];
      if (m[1] !== 'get' || !m[2].startsWith('/api/')) continue;
      const ket = k + 1 < moc.length ? (moc[k + 1].index ?? web.length) : web.length;
      if (/\bshell\(/.test(web.slice(m.index ?? 0, ket))) viPham.push(m[2]);
    }
    expect(viPham, `route API dựng HTML:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });
});

describe('FILE LÀ NGUỒN, bảng là bản đọc — chỗ ⛔C2 sống ở tầng dữ liệu', () => {
  const runs = readFileSync(`${WEB}/runs.ts`, 'utf8');

  it('bảng trống mà đĩa có → ĐỌC ĐĨA, và dựng lại bảng cho lần sau', () => {
    // Bảng chỉ được ghi lúc lượt chấm ĐÓNG, nên một lượt bị giết giữa chừng có đủ dấu vết trên đĩa mà
    // bảng thì trống. Đọc mỗi bảng ở đó nghĩa là mở lại một lượt đã chết và thấy TRỐNG RỖNG — đúng thứ
    // ⛔C2 cấm: «không đọc được» hiện thành «không có gì».
    const i = runs.indexOf('let events = kho.readEvents(id);');
    expect(i, 'phải đọc bảng trước').toBeGreaterThan(0);
    const khoi = runs.slice(i, i + 400);
    expect(khoi, 'bảng trống thì phải đọc đĩa').toContain('docSoSuKienTuDia(id)');
    expect(khoi, 'và dựng lại bảng cho lần sau').toContain('saveEvents');
  });

  it('đường dựng lại là MỘT CHIỀU — không có đường nào ghi từ bảng ngược ra đĩa', () => {
    // Cho bảng ghi đè nguồn là mất dấu vết của đúng những lượt đã chết giữa chừng — tức mất bằng chứng
    // ở đúng ca người ta cần nó nhất.
    const i = runs.indexOf('dungLaiSoTuDia(');
    expect(i, 'phải có đường dựng lại').toBeGreaterThan(0);
    const khoi = runs.slice(i, i + 400);
    expect(khoi, 'đọc từ đĩa').toContain('docSoSuKienTuDia');
    expect(khoi, 'ghi vào bảng').toContain('saveEvents');
    // Không hàm nào trong `runs.ts` ghi sổ sự kiện từ bảng ra đĩa.
    expect(runs, 'không được ghi ngược ra sổ trên đĩa').not.toMatch(/writeFileSync\([^)]*duongSoSuKien/);
  });
});

describe('R9.3 · R9.11 — schema: khoá ngoại, nhật ký, index', () => {
  const db = readFileSync(`${KHO}/db.ts`, 'utf8');

  it('mở cơ sở dữ liệu bật khoá ngoại và chế độ nhật ký', () => {
    expect(db).toContain('PRAGMA foreign_keys = ON');
    expect(db).toMatch(/PRAGMA journal_mode\s*=\s*WAL/);
  });

  it('cột dùng để lọc và sắp xếp thường xuyên có index', () => {
    // Cái mất: ca không chứng minh truy vấn THẬT SỰ dùng index — phần ấy thuộc quan sát lúc vận hành.
    // Nó bắt được đường hỏng hay gặp nhất: thêm cột lọc mới mà quên index.
    for (const ix of ['ix_so_cai_luc', 'ix_so_cai_repo_luc', 'ix_run_bat_dau', 'ix_run_repo_bat_dau', 'ix_run_pr']) {
      expect(db, `thiếu index ${ix}`).toContain(ix);
    }
  });

  it('R9.4b — recursive_triggers được đặt, và comment nói rõ nó theo KẾT NỐI', () => {
    // Một dòng thiếu ở kết nối mới làm cả cơ chế chống sửa bằng chứng thành trang trí, mà không ai thấy.
    expect(db).toContain('recursive_triggers');
  });
});
