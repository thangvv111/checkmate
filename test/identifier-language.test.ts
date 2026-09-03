import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới cưỡng chế luật «định danh cấp module viết tiếng Anh» (capability `identifier-language-gate`).
 *
 * Vì sao repo chịu tốn một lưới cho việc đặt tên: luật ấy được chốt 01/09/2026 lúc 17:00 và ghi vào
 * CLAUDE.md — file nạp vào đầu mỗi phiên agent. Định danh tiếng Việt đầu tiên vi phạm nó sinh lúc 17:16
 * CÙNG NGÀY, bởi chính agent đã đọc luật. 48 giờ sau có 10 định danh cấp module vi phạm, không cái nào bị
 * máy phát hiện: tất cả lọt qua tsc, qua 764 ca test, qua sáu lượt review PR.
 *
 * Đối chứng nằm trong cùng file CLAUDE.md: ⛔C5 cũng dễ quên như thế, nhưng có test/hop-dong-repo.test.ts,
 * nên quên là đỏ ngay trong phiên. Khác biệt duy nhất giữa hai luật là cái lưới.
 */

const ROOTS = ['packages/harness/src', 'packages/shared/src', 'apps/web/src'];
const ALLOWLIST_PATH = 'docs/identifier-allowlist.md';

/**
 * Âm tiết tiếng Việt không dấu. Đây là TÍN HIỆU, không phải phép quyết định đúng-sai: nó có âm tính giả
 * (tên tiếng Việt dùng âm ngoài danh sách vẫn lọt). Chấp nhận được vì lưới này gác quy ước viết code chứ
 * không gác verdict hay cổng merge — một âm tính giả làm luật phủ chưa hết, không làm PR sai lọt cổng.
 * Đánh đổi này KHÔNG được đem áp cho ⛔C3, nơi âm tính giả là một bí mật rò ra và không thu hồi được.
 *
 * Mở rộng được: phát hiện âm nào lọt thì thêm vào đây, lưới bắt từ đó trở đi.
 */
const VIETNAMESE_SYLLABLES = new Set(
  `loi ly do la thu muc quy trinh tran song ung vien toi thieu hoi noi duoc dieu gi sinh bang chung khong
   luu ghi doc xac nhan dong hang cong cua viec luat nguon dich chay dung moi cu phap toan ngoai nguoi
   cham diem duyet cong tac gia nhanh goc bao ve tao xoa sua them bot dem so luong ket qua trang thai
   phan loai nhan mo ta chi tiet danh sach bang tra khuon mau vet dau van tay tho chat giu goi nhac
   tim kiem loc sap xep gop tach chuyen doi kiem soat quan he tap hop phan tich tong hop
   mot hai ba bon nam sau bay tam chin muoi nhieu it lon nho cao thap dai ngan rong hep
   neu thi con lai het xong roi chua dang se vua moi luon cung deu tung moi
   truoc sau tren duoi trong ngoai giua canh ben phia huong den tu voi`.split(/\s+/),
);

/**
 * Âm trùng từ tiếng Anh thông dụng — phải loại, nếu không lưới bắt nhầm `API_DOC_CANDIDATES` («doc» là
 * *document*), `ChatCompletionsProvider` («chat» là *chat*), `getDocExamples`. Đo 03/09: từ điển thô bắt
 * 16 tên trong bảng module, 6 trong đó là dương tính giả; bỏ danh sách này đi thì còn 6 tên, cả 6 đúng.
 */
const ENGLISH_COLLIDING =
  `doc chat so tu la mo ve thu tap tim hai can dung ban con ma cha cao dai den ken men pin ton`.split(/\s+/);
for (const s of ENGLISH_COLLIDING) VIETNAMESE_SYLLABLES.delete(s);

/** Khai báo ở CỘT 0 = cấp module. Biến trong thân hàm luôn thụt vào, nên nằm ngoài phạm vi (D2). */
const MODULE_DECL =
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

/** Tách camelCase / snake_case / SCREAMING_CASE thành âm tiết, trả những âm khớp từ điển. */
export function vietnameseSyllables(name: string): string[] {
  const out: string[] = [];
  for (const part of name.split(/[_-]/)) {
    const tokens =
      part === part.toUpperCase() ? [part.toLowerCase()] : (part.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) ?? []);
    for (const t of tokens) if (VIETNAMESE_SYLLABLES.has(t.toLowerCase())) out.push(t.toLowerCase());
  }
  return out;
}

/** Hàm thuần: quét một nội dung file, trả định danh cấp module mang âm tiếng Việt. */
export function scanSource(text: string): string[] {
  const found: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = MODULE_DECL.exec(line);
    if (m && vietnameseSyllables(m[1]).length > 0) found.push(m[1]);
  }
  return found;
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTs(p, acc);
    else if (name.endsWith('.ts')) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

function readAllowlist(): { names: Set<string>; rows: string[] } {
  const text = readFileSync(ALLOWLIST_PATH, 'utf8');
  const rows = text.split(/\r?\n/).filter((l) => /^\| `/.test(l));
  const names = new Set<string>();
  for (const r of rows) {
    const m = /^\| `([^`]+)`/.exec(r);
    if (m) names.add(m[1]);
  }
  return { names, rows };
}

describe('luật ngôn ngữ định danh — cấp module viết tiếng Anh', () => {
  it('bắt được mười định danh vi phạm đã biết (ca load-bearing)', () => {
    // Một phép quét trả RỖNG trông giống hệt hai chuyện khác nhau: repo sạch, và phép quét hỏng.
    // Ca này phân biệt chúng. Không có nó thì một regex gõ sai làm lưới xanh vĩnh viễn và cả lưới
    // thành nghi lễ. Fixture là mười cái thật, tra bằng `git log -S` nên biết chắc chúng vi phạm.
    const fixture = `
export function laTriggerHopLe(x: string): boolean { return true; }
function lyDoNgoaiRepo(duong: string): string | null { return null; }
function lyDoKhongPhaiThuMuc(duong: string): string | null { return null; }
export function laThuMucQuyTrinh(file: string): boolean { return true; }
export const TRAN_SONG_SONG = 2;
const HOI_QUY = new Set(['hoi_quy']);
const NOI_DUOC_DIEU_GI = new Set(['pass']);
export type TrangThaiProbe = string;
export interface UngVienToiThieu { x: number }
export function loiSinhLaiKhongBangChung(a: unknown, b: string): string { return ''; }
`;
    expect(scanSource(fixture).sort()).toEqual(
      [
        'HOI_QUY',
        'NOI_DUOC_DIEU_GI',
        'TRAN_SONG_SONG',
        'TrangThaiProbe',
        'UngVienToiThieu',
        'laThuMucQuyTrinh',
        'laTriggerHopLe',
        'loiSinhLaiKhongBangChung',
        'lyDoKhongPhaiThuMuc',
        'lyDoNgoaiRepo',
      ].sort(),
    );
  });

  it('mã nguồn hiện tại không còn định danh nào ngoài danh sách miễn trừ', () => {
    const { names } = readAllowlist();
    const viPham: string[] = [];
    for (const root of ROOTS) {
      for (const file of walkTs(root)) {
        for (const ten of scanSource(readFileSync(file, 'utf8'))) {
          if (!names.has(ten)) viPham.push(`${ten}  (${file})`);
        }
      }
    }
    // Thông điệp phải nêu TÊN và FILE — người đọc sửa được ngay, không phải chạy lại phép quét bằng tay.
    expect(viPham, `định danh cấp module tiếng Việt ngoài danh sách miễn trừ:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });

  it('không bắt nhầm tên tiếng Anh có âm trùng', () => {
    // «doc» là document, «chat» là chat. Từ điển thô bắt cả sáu tên này; đó là lý do có ENGLISH_COLLIDING.
    const fixture = `
export const API_DOC_CANDIDATES = ['README.md'];
export const PROCESS_DOC_DIRS = ['openspec/'];
export function getDocExamples(): string[] { return []; }
export async function runDocSkill(): Promise<void> {}
export class ChatCompletionsProvider {}
export const TEST_SAMPLE_CANDIDATES = ['test/**'];
`;
    expect(scanSource(fixture)).toEqual([]);
  });

  it('biến cục bộ trong thân hàm nằm ngoài phạm vi', () => {
    // D2: cấp module là bề mặt người khác đọc; `const dem = 0` trong một hàm 20 dòng thì không.
    const fixture = `
export function countProbes(): number {
  const soLuong = 0;
  let ketQua = 0;
  const dsNguoiCham: string[] = [];
  return soLuong + ketQua + dsNguoiCham.length;
}
`;
    expect(scanSource(fixture)).toEqual([]);
  });

  it('giá trị chuỗi không phải định danh', () => {
    // 'hoi_quy' nằm trong sổ SQLite đã ghi và trong verdict cũ. Đổi chúng là đổi DỮ LIỆU, không phải
    // đổi tên — nên lưới không được đụng tới.
    const fixture = `
export const REGRESSION_STATES = new Set(['hoi_quy', 'vi_pham_luat_moi']);
export const LABEL = { ngoai_pham_vi: 'ngoài phạm vi', nghi_van: 'nghi vấn' };
`;
    expect(scanSource(fixture)).toEqual([]);
  });
});

describe('danh sách miễn trừ là danh sách CHO PHÉP', () => {
  it('mỗi dòng mang một lý do, và lý do thuộc hai loại hợp lệ', () => {
    // Danh sách miễn trừ không lý do là cửa hợp thức hoá vi phạm mới, và khi ấy lưới còn tệ hơn không
    // có lưới vì nó tạo cảm giác đang được gác.
    const { rows } = readAllowlist();
    const hong = rows.filter((r) => {
      const cot = r.split('|').map((c) => c.trim());
      return cot.length < 5 || !/^(code cũ|bắt nhầm)/.test(cot[3] ?? '');
    });
    expect(hong, `dòng miễn trừ thiếu lý do hợp lệ:\n  ${hong.join('\n  ')}`).toEqual([]);
  });

  it('danh sách đóng băng đúng số mục đã chốt', () => {
    // Nới danh sách là cách rẻ nhất để lách lưới. Con số này khoá nó lại: thêm một dòng thì ca đỏ, và
    // người thêm phải giải trình trong PR chứ không lặng lẽ đi qua.
    // Đếm DÒNG chứ không đếm tên riêng biệt: `Hang` và `UngVien` mỗi cái xuất hiện ở hai file khác nhau,
    // và mỗi chỗ là một mục miễn trừ riêng — gộp lại thì hai lần nới danh sách chỉ tính một.
    const { names, rows } = readAllowlist();
    expect(rows.length).toBe(89);
    expect(names.size).toBe(87);
  });

  it('mọi mục miễn trừ đều thực sự bị từ điển bắt — không ai nhét tên tiếng Anh vào cho tiện', () => {
    const { names } = readAllowlist();
    const thua = [...names].filter((n) => vietnameseSyllables(n).length === 0);
    expect(thua, `mục miễn trừ không cần miễn:\n  ${thua.join('\n  ')}`).toEqual([]);
  });
});
