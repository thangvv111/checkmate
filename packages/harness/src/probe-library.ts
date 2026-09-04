import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { ProbePlan } from './skill-code.js';

// Thư viện probe tích luỹ per repo đích (specs/R10): probe đã chứng minh khớp contract (pass trên
// nhánh gốc) được giữ lại làm regression cho các lượt chấm sau.
// Hạt nạp là TỪNG PROBE — một file độc lập, một phép thử. Đời đầu nạp theo bộ (mỗi lượt một file)
// và dedup bằng sha256 cả file, vô hiệu trên thực tế: hai lượt chấm không bao giờ sinh code y hệt
// từng byte, nên thư viện phình bằng bản sao (đo được 4 cặp trùng trong 8 file). Đời bộ được di trú
// tự động ở lần đọc đầu.

const GOC_LIB = process.env.CHECKER_LIB_DIR ?? resolve('probes-lib');
// Trần đếm theo PROBE (R10.4). Đời bộ trần 12 file × ~5 probe; đời probe dedup thật nên 40 là rộng hơn
// về phủ mà nhỏ hơn về rác.
// Env phải là SỐ NGUYÊN sạch mới được nhận: '' cho Number('')=0 rồi bị kẹp về 6 → đào thải hàng loạt
// ngay lượt nạp kế; 'abc' cho NaN làm while(len > NaN) luôn false → trần vô hiệu. Cả hai đều âm thầm
// (dàn review bắt được) — giá trị hỏng thì dùng mặc định, không đoán.
function docTranProbe(): number {
  const tho = (process.env.CHECKER_LIB_TRAN ?? '').trim();
  // Ba con số dưới đây là bản sao của `LIBRARY_CAP` ở `apps/web/src/config.ts` — engine KHÔNG import
  // được từ lớp web (ranh giới gói), nên chúng phải khớp bằng LƯỚI chứ không bằng lời hứa. Ca test
  // của change `settings-screen-ccs` so hai chỗ và ĐỎ khi lệch.
  if (!/^\d+$/.test(tho)) return 100;
  return Math.min(200, Math.max(6, Number(tho)));
}
const TRAN_PROBE = docTranProbe();
const TRAN_LICH_SU = 20;

export interface HistoryEntry {
  sha: string; // commit của NHÁNH PR ở lượt chấm đó — khoá để so hai probe trên cùng một lượt
  luc: string;
  trang_thai: string; // ProbeState của máy phân loại
}

export interface ProbeLibEntry {
  ten: string; // tên file — duy nhất, hậu tố từ hash nội dung
  sha_sinh: string; // commit PR mà lượt sinh ra nó đã chấm
  luc: string;
  hash: string; // sha256 code của RIÊNG probe này
  plan: ProbePlan; // MỘT probe
  lich_su: HistoryEntry[]; // tầng 4 (R10.9): hành vi đo được qua các lượt
  // Hai trường của đào thải theo điểm (R10.22–R10.24). VĨNH VIỄN có chủ đích — lich_su trôi theo
  // trần 20 lượt, mà thành tích bắt hồi quy và tật không-tất-định thì không được phép trôi theo.
  da_bat_hoi_quy?: boolean; // R10.23 — từng mang nhãn hoi_quy ít nhất một lượt
  flaky_diem?: number; // R10.24 — số lần cùng sha cho hai trạng thái hành-vi-riêng khác nhau
}

// Nhãn nói về hành vi RIÊNG của probe (R10.20) — dùng cho tầng 4 và phép đếm flaky R10.24.
const NHAN_HANH_VI_RIENG = new Set<string>(['pass', 'hoi_quy', 'cai_thien']);
// R10.22 — nhãn «hoàn cảnh chết»: probe không chạy được trên repo hiện tại (API đích đã đổi).
const NHAN_CHET = new Set(['nghi_loi_co_san', 'khong_chay']);
const CHET_KEO_DAI_NGUONG = 5;

function chetKeoDai(m: ProbeLibEntry): boolean {
  const ls = m.lich_su ?? [];
  if (ls.length < CHET_KEO_DAI_NGUONG) return false;
  return ls.slice(-CHET_KEO_DAI_NGUONG).every((h) => NHAN_CHET.has(h.trang_thai));
}

/**
 * Chọn nạn nhân đào thải khi thư viện vượt trần (R10.22) — trả về index + lý do để log.
 * Thứ tự: chết kéo dài → flaky nhất (≥2) → cũ nhất chưa từng bắt hồi quy → cũ nhất tuyệt đối.
 * FIFO cũ loại theo tuổi là loại đúng probe im lặng lâu năm — lưới an toàn đang canh biên chưa ai
 * phá lại; điểm chỉ nhìn tín hiệu XẤU đo được (chết, flaky) và miễn trừ thành tích thật (R10.23).
 */
export function pickEvictionVictim(probes: readonly ProbeLibEntry[], tenVuaNap?: string): { i: number; ly_do: string } {
  const iChet = probes.findIndex(chetKeoDai);
  if (iChet >= 0) return { i: iChet, ly_do: `chết kéo dài — ${CHET_KEO_DAI_NGUONG} lượt gần nhất đều ${[...NHAN_CHET].join('/')} (R10.22.1)` };
  let iFlaky = -1;
  for (let i = 0; i < probes.length; i++) {
    const d = probes[i].flaky_diem ?? 0;
    if (d >= 2 && (iFlaky < 0 || d > (probes[iFlaky].flaky_diem ?? 0))) iFlaky = i;
  }
  if (iFlaky >= 0) return { i: iFlaky, ly_do: `flaky — ${probes[iFlaky].flaky_diem} lần cùng sha khác kết quả (R10.22.2)` };
  // Nấc 3 loại trừ probe VỪA NẠP — nhận diện bằng DẤU HIỆU DỮ LIỆU (tên truyền từ chỗ nạp), không
  // đoán theo vị trí cuối mảng: pickEvictionVictim là hàm export, bản đoán-vị-trí bỏ sót nạn nhân hợp lệ
  // đứng cuối và rơi sai xuống nấc 4 — xoá vĩnh viễn một probe từng bắt hồi quy trong khi còn nạn
  // nhân thường (vòng hai của cổng bắt trên chính PR này). Kho toàn hàng miễn trừ mà đá luôn probe
  // mới thì van nấc 4 không bao giờ mở, kho hoá thạch — nên probe vừa nạp vẫn phải được miễn ở nấc 3.
  const iThuong = probes.findIndex((m) => !m.da_bat_hoi_quy && m.ten !== tenVuaNap);
  if (iThuong >= 0) return { i: iThuong, ly_do: 'cũ nhất chưa từng bắt hồi quy (R10.22.3)' };
  return { i: 0, ly_do: 'mọi probe cũ đều từng bắt hồi quy — loại cũ nhất tuyệt đối, van chống kẹt trần (R10.22.4)' };
}

export interface LibraryProbe extends ProbeLibEntry {
  code: string;
}

interface MetaLib {
  probes: ProbeLibEntry[];
  di_tru?: string; // ghi chú lượt di trú bộ→probe, để người vận hành tra lại được
}

// Định dạng ĐỜI CŨ (bộ) — chỉ còn dùng cho di trú
interface MucBoCu {
  ten: string;
  sha_sinh: string;
  luc: string;
  hash: string;
  plan: ProbePlan[];
}

export function repoSlug(repoPath: string): string {
  return basename(repoPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function ghiMeta(slug: string, meta: MetaLib): void {
  mkdirSync(join(GOC_LIB, slug), { recursive: true });
  // Ghi ATOMIC: file tạm rồi rename đè (rename của Node thay được file có sẵn trên cả Windows).
  // writeFileSync trơ mà bị kill/mất điện giữa chừng là để lại meta.json cụt — và vì đường đọc coi
  // file rách như thư viện rỗng, một lần rách đủ xoá sổ tài sản tích luỹ (dàn review tái lập được).
  const dich = join(GOC_LIB, slug, 'meta.json');
  const tam = `${dich}.tmp-${process.pid}`;
  writeFileSync(tam, JSON.stringify(meta, null, 2), 'utf8');
  renameSync(tam, dich);
}

// ---- Khoá liên tiến trình (R8.4–R8.8) — mkdir là thao tác nguyên tử trên cả Windows lẫn Linux ----

const CHO_KHOA_MS = 10_000;
const KHOA_QUA_HAN_MS = 60_000;

function nguNgan(ms: number): void {
  // ngủ ĐỒNG BỘ: nhánh gọi là hàm sync, không có chỗ để await
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function withLibraryLock<T>(slug: string, viec: () => T): T {
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

// ---- Tách file bộ thành file per-probe (R10.2) ----

function laPython(tenHayExt: string): boolean {
  return tenHayExt.endsWith('.py');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tìm khối `it('P?: ...', ...)` bằng QUÉT CÂN BẰNG NGOẶC — không phụ thuộc indent.
 * Regex đóng-ở-indent-2 đời đầu trượt sạch khi model bọc probe trong describe() (đo được trên thư
 * viện thật: 5/41 probe không tách được chỉ vì indent 4). Máy quét đếm ngoặc tròn từ dấu `(` của
 * `it(`, hiểu chuỗi ' " ` và chú thích // /* để không đếm ngoặc nằm trong đó; ngoặc về 0 là hết khối.
 * Regex literal chứa ngoặc vẫn có thể lừa được máy đếm — ca đó bản cắt hỏng và ba lưới phía sau
 * (kept-check, sibling-check, verify-trên-gốc R10.3) chặn lại, không lọt vào thư viện.
 */
// Ký tự đứng TRƯỚC một dấu / mở regex literal trong JS — heuristic chuẩn của các tokenizer nhẹ.
// Sau một giá trị (identifier, số, `)`, `]`) thì / là phép chia; sau toán tử/mở ngoặc thì / mở regex.
function laBatDauRegex(code: string, i: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    const c = code[j];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue;
    if ('(,=:[!&|?{};+*%~^<>'.includes(c)) return true;
    return /\b(?:return|typeof|case|in|of|new|do|else|void|delete)$/.test(code.slice(Math.max(0, j - 7), j + 1));
  }
  return true;
}

/**
 * Nếu tại vị trí i mở một vùng "không cấu trúc" (chuỗi ' " `, chú thích // và /*, regex literal),
 * trả về vị trí NGAY SAU vùng đó; không phải thì trả về chính i.
 * Regex literal phải được nhận — /x\)/ chứa ngoặc đóng, máy đếm ngây thơ tụt nhầm về 0 và cắt cụt
 * giữa khối (dàn review đối kháng tái lập được nguyên văn ca này).
 */
function buocQuaVungPhang(code: string, i: number): number {
  const c = code[i];
  if (c === "'" || c === '"' || c === '`') {
    for (let j = i + 1; j < code.length; j++) {
      if (code[j] === '\\') j++;
      else if (code[j] === c) return j + 1;
    }
    return code.length;
  }
  if (c === '/' && code[i + 1] === '/') {
    const xd = code.indexOf('\n', i);
    return xd < 0 ? code.length : xd;
  }
  if (c === '/' && code[i + 1] === '*') {
    const dong = code.indexOf('*/', i + 2);
    return dong < 0 ? code.length : dong + 2;
  }
  if (c === '/' && laBatDauRegex(code, i)) {
    let trongLop = false; // trong [...] của regex, / không đóng
    for (let j = i + 1; j < code.length; j++) {
      const d = code[j];
      if (d === '\\') j++;
      else if (d === '[') trongLop = true;
      else if (d === ']') trongLop = false;
      else if (d === '/' && !trongLop) return j + 1;
      else if (d === '\n') return i + 1; // không phải regex thật — coi như phép chia
    }
    return code.length;
  }
  return i;
}

/** Đếm cân bằng () {} [] ngoài chuỗi/chú thích/regex. Bản cắt làm lệch cân bằng = bản cắt hỏng. */
export function checkBalanced(code: string): boolean {
  const dem: Record<string, number> = { '(': 0, '{': 0, '[': 0 };
  for (let i = 0; i < code.length; i++) {
    const sau = buocQuaVungPhang(code, i);
    if (sau !== i) {
      i = sau - 1;
      continue;
    }
    const c = code[i];
    if (c === '(') dem['(']++;
    else if (c === ')') dem['(']--;
    else if (c === '{') dem['{']++;
    else if (c === '}') dem['{']--;
    else if (c === '[') dem['[']++;
    else if (c === ']') dem['[']--;
    if (dem['('] < 0 || dem['{'] < 0 || dem['['] < 0) return false;
  }
  return dem['('] === 0 && dem['{'] === 0 && dem['['] === 0;
}

/**
 * Bản CHE của code: ruột chuỗi/chú thích/regex bị thay bằng khoảng trắng (giữ nguyên xuống dòng và
 * độ dài, nên chỉ số hai bản trùng nhau). Soi cấu trúc trên bản che thì `it('P2:` nằm TRONG một
 * chuỗi văn bản không còn đánh lừa được — đời soi trên bản thô từng vừa chặn oan probe tách được,
 * vừa suýt nạp một probe ma không có phép thử nào (test tự bắt được khi dựng ca này).
 */
function lamMoVungPhang(code: string): string {
  let ra = '';
  for (let i = 0; i < code.length; i++) {
    const sau = buocQuaVungPhang(code, i);
    if (sau !== i) {
      ra += code.slice(i, sau).replace(/[^\n]/g, ' ');
      i = sau - 1;
    } else ra += code[i];
  }
  return ra;
}

/** Vị trí (trên code gốc) của các khối it/test/describe mang nhãn id — chỉ tính chỗ là CODE thật. */
function viTriKhoiTest(code: string, id: string): number[] {
  const mo = lamMoVungPhang(code);
  const ra: number[] = [];
  const re = /(^|\n)[ \t]*(?:it|test|describe)\(/g;
  for (let m = re.exec(mo); m; m = re.exec(mo)) {
    const sauMo = m.index + m[0].length; // ngay sau dấu (
    if (new RegExp(`^['"\`]${escapeRegex(id)}:`).test(code.slice(sauMo, sauMo + id.length + 2))) {
      ra.push(m.index + m[1].length);
    }
  }
  return ra;
}

function timKhoiIt(code: string, id: string): { dau: number; cuoi: number } | null {
  // Bắt it('P2:') / test('P2:') / describe('P2:') — bộ sinh probe có đời bọc mỗi probe trong một
  // describe mang nhãn id (đo trên thư viện thật). Cắt describe là cắt trọn ruột bên trong.
  const viTri = viTriKhoiTest(code, id);
  if (viTri.length === 0) return null;
  const m = { index: viTri[0] };
  const moNgoac = code.indexOf('(', m.index);
  let sau = 0;
  let i = moNgoac;
  for (; i < code.length; i++) {
    const nhay = buocQuaVungPhang(code, i);
    if (nhay !== i) {
      i = nhay - 1;
      continue;
    }
    const c = code[i];
    if (c === '(') sau++;
    else if (c === ')') {
      sau--;
      if (sau === 0) break;
    }
  }
  if (sau !== 0) return null;
  let cuoi = i + 1;
  while (cuoi < code.length && /[ \t]/.test(code[cuoi])) cuoi++;
  if (code[cuoi] === ';') cuoi++;
  return { dau: m.index, cuoi };
}

/**
 * Cắt MỌI khối phép thử mang id khỏi code (một probe có thể có nhiều it cùng id, hoặc một describe
 * mang nhãn id chứa nhiều it — đo cả hai trên thư viện thật). Không tìm thấy thì trả nguyên văn.
 */
export function cutTestBlock(code: string, id: string, ext: string): string {
  const e = escapeRegex(id);
  if (laPython(ext)) {
    // def test_P1_... (kèm decorator của chính nó). (?=[_(]) là ranh giới id: thiếu nó thì cắt P1
    // nuốt luôn P10 — cùng họ lỗi với matchProbeId (R2.14). Khối kết thúc ở dòng KHÔNG-TRẮNG đầu tiên
    // tại cột 0 (\n\S): nhờ vậy helper cấp module nằm giữa hai def KHÔNG bị nuốt theo (dàn review bắt
    // được ca này). Decorator NHIỀU DÒNG của sibling vẫn là giới hạn đã biết — mảnh mồ côi làm file
    // tách hỏng và bị lưới verify-trên-gốc chặn, không lọt vào thư viện trong im lặng.
    return code.replace(new RegExp(`\\n(?:@[^\\n]*\\n)*def test_${e}(?=[_(])[\\s\\S]*?(?=\\n\\S|$)`, 'g'), '\n');
  }
  let ra = code;
  for (let khoi = timKhoiIt(ra, id); khoi; khoi = timKhoiIt(ra, id)) {
    ra = ra.slice(0, khoi.dau) + '\n' + ra.slice(khoi.cuoi);
  }
  return ra;
}

export function hasTestBlock(code: string, id: string, ext: string): boolean {
  const e = escapeRegex(id);
  if (laPython(ext)) return new RegExp(`\\bdef test_${e}(?=[_(])`).test(code);
  // Soi trên BẢN CHE (lamMoVungPhang): 'it(\'P2:' nhắc tới trong một chuỗi văn bản không phải là khối test
  return viTriKhoiTest(code, id).length > 0;
}

/**
 * Tách một probe thành file độc lập: giữ phần đầu (import, helper), cắt mọi phép thử khác.
 * Trả về null khi không tách được — chỗ gọi PHẢI bỏ qua và nói ra, không nạp mù (R10.2).
 */
export function splitOneProbe(code: string, giuId: string, cacIdKhac: string[], ext: string): string | null {
  if (!hasTestBlock(code, giuId, ext)) return null;
  let ra = code;
  for (const id of cacIdKhac) ra = cutTestBlock(ra, id, ext);
  // cắt xong mà khối giữ lại biến mất (regex nuốt lố) thì cũng là tách hỏng
  if (!hasTestBlock(ra, giuId, ext)) return null;
  // Cắt TRƯỢT cũng là tách hỏng: code ngoài khuôn (it lồng trong describe, indent lạ) làm regex không
  // khớp, anh em còn nguyên trong file — nạp vào là file "per-probe" mang lậu cả bộ, phá R10.1 trong
  // im lặng và mọi tầng dedup phía sau soi nhầm hạt. Sót một anh em nào là bỏ, không nạp mù.
  if (cacIdKhac.some((id) => hasTestBlock(ra, id, ext))) return null;
  // Bản cắt làm lệch cân bằng ngoặc là bản cắt hỏng (mảnh vỡ dính lại sau một pha cắt cụt) — chặn
  // tại đây thay vì để file vỡ cú pháp lọt vào thư viện thành probe chết im lặng.
  if (!laPython(ext) && !checkBalanced(ra)) return null;
  return ra.trimEnd() + '\n';
}

// ---- Đọc meta + di trú đời bộ (R10.5) ----

/** Chuẩn hoá chuỗi luật: 'R1,R2' · 'R3+R4' · 'R3, R4' đều thành cùng một tập (R10.7). */
export function splitRule(s: string | undefined): string[] {
  return (s ?? '')
    .split(/[,+\s]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

// So luật ở MỌI nơi trong thư viện đều qua bản chuẩn hoá. Đời đầu so trim() thô: 'R1,R2' với
// 'R1, R2' bị coi là hai luật khác nhau, và tầng 1 lẫn tầng 4 mù đúng ở cặp cần bắt nhất.
function chuanRule(s: string | undefined): string {
  return splitRule(s).join(',');
}

function docMetaTho(slug: string): { moi?: MetaLib; cu?: { files: MucBoCu[] } } {
  const f = join(GOC_LIB, slug, 'meta.json');
  if (!existsSync(f)) return { moi: { probes: [] } };
  try {
    const raw = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
    if (Array.isArray(raw.probes)) return { moi: raw as unknown as MetaLib };
    if (Array.isArray(raw.files)) return { cu: raw as unknown as { files: MucBoCu[] } };
    return { moi: { probes: [] } };
  } catch {
    // L10: meta hỏng không được giết run — NHƯNG cũng không được để đường ghi phía sau đè mất bằng
    // chứng: fallback-rỗng-rồi-ghi-đè biến một file rách thành xoá sổ cả thư viện trong im lặng.
    // Đổi tên file hỏng để giữ lại cho người vận hành, rồi mới coi thư viện như rỗng.
    try {
      renameSync(f, `${f}.hong-${Date.now()}`);
      console.error(`Thư viện ${slug}: meta.json rách — giữ bằng chứng ở meta.json.hong-*, thư viện coi như rỗng`);
    } catch {
      /* đổi tên không được thì thôi — vẫn không mất gì thêm vì ghi meta nay là atomic */
    }
    return { moi: { probes: [] } };
  }
}

function tenFileProbe(daCo: ProbeLibEntry[], shaSinh: string, hash: string, ext: string): string {
  // underscore + hậu tố từ hash: tên là module hợp lệ với mọi stack và không đụng nhau giữa hai
  // lượt song song cùng chấm một commit (R8.5). 6 hex vẫn có thể đụng giữa hai probe KHÁC nội dung
  // cùng commit — đụng là ghi đè file của nhau trong im lặng, nên nới dài hậu tố tới khi hết đụng.
  for (const dai of [6, 12, 24, 64]) {
    const ten = `lib_${shaSinh.slice(0, 7)}_${hash.slice(0, dai)}${ext}`;
    if (!daCo.some((q) => q.ten === ten && q.hash !== hash)) return ten;
  }
  return `lib_${shaSinh.slice(0, 7)}_${hash}${ext}`;
}

function diTruBoSangProbe(slug: string, cu: { files: MucBoCu[] }): MetaLib {
  const probes: ProbeLibEntry[] = [];
  const daBo: string[] = []; // từng probe bị loại: cái nào, trùng với ai, vì sao (R10 bắt log chi tiết)
  const khongTach: string[] = [];
  const fileMat: string[] = [];
  const xoaDuoc: string[] = []; // chỉ xoá file bộ đã di trú TRỌN VẸN — tách hỏng một probe là GIỮ cả file
  for (const f of cu.files) {
    const duong = join(GOC_LIB, slug, f.ten);
    if (!existsSync(duong)) {
      fileMat.push(f.ten); // file mất KHÔNG phải "không tách được" — đếm riêng, đừng đổ oan cho máy tách
      continue;
    }
    const code = readFileSync(duong, 'utf8');
    const ext = laPython(f.ten) ? '.py' : f.ten.slice(f.ten.indexOf('.'));
    const cacId = f.plan.map((p) => p.id);
    let honTron = true;
    for (const p of f.plan) {
      const rieng = splitOneProbe(code, p.id, cacId.filter((x) => x !== p.id), ext);
      if (!rieng) {
        khongTach.push(`${f.ten}·${p.id}`);
        honTron = false;
        continue;
      }
      // Bản chạy-lại cùng commit (R10.6): meta đời bộ xếp theo thứ tự nạp, nên bản gặp trước là bản cũ hơn — giữ nó
      const chayLai = probes.find((q) => q.sha_sinh === f.sha_sinh && q.plan.id === p.id && chuanRule(q.plan.spec_rule) === chuanRule(p.spec_rule));
      const hash = createHash('sha256').update(rieng).digest('hex');
      const trungHash = chayLai ? undefined : probes.find((q) => q.hash === hash);
      if (chayLai || trungHash) {
        daBo.push(`${f.ten}·${p.id} ${chayLai ? 'chạy-lại của' : 'trùng nội dung'} ${(chayLai ?? trungHash)!.ten}`);
        continue;
      }
      const ten = tenFileProbe(probes, f.sha_sinh, hash, ext);
      writeFileSync(join(GOC_LIB, slug, ten), rieng, 'utf8');
      probes.push({ ten, sha_sinh: f.sha_sinh, luc: f.luc, hash, plan: p, lich_su: [] });
    }
    if (honTron) xoaDuoc.push(f.ten);
  }
  const meta: MetaLib = {
    probes,
    di_tru:
      `bộ→probe ${new Date().toISOString()}: ${cu.files.length} file → ${probes.length} probe` +
      (daBo.length ? ` · bỏ ${daBo.length}: [${daBo.join(' | ')}]` : '') +
      (khongTach.length ? ` · KHÔNG tách được ${khongTach.length}: [${khongTach.join(' | ')}] — file bộ tương ứng ĐƯỢC GIỮ LẠI trên đĩa` : '') +
      (fileMat.length ? ` · file bộ mất sẵn: [${fileMat.join(' | ')}]` : ''),
  };
  // THỨ TỰ SỐNG CÒN: ghi meta mới TRƯỚC, xoá file bộ SAU — sập giữa hai bước thì chỉ thừa file mồ côi
  // (vô hại, có ghi chú), còn thứ tự ngược lại thì sập là mất trọn thư viện: meta vẫn đời bộ, file bộ
  // đã bay, lượt sau di trú lại ra 0 probe (dàn review tái lập được).
  ghiMeta(slug, meta);
  for (const ten of xoaDuoc) {
    try {
      rmSync(join(GOC_LIB, slug, ten));
    } catch {
      /* file đã mất thì thôi */
    }
  }
  if (khongTach.length) {
    console.error(`Thư viện ${slug}: di trú GIỮ LẠI ${new Set(khongTach.map((x) => x.split('·')[0])).size} file bộ vì có probe không tách được — xem di_tru trong meta.json`);
  }
  return meta;
}

/** Đọc meta, tự di trú đời bộ nếu gặp (một lần, trong khoá). */
function napMeta(slug: string): MetaLib {
  const tho = docMetaTho(slug);
  if (tho.moi) return tho.moi;
  return withLibraryLock(slug, () => {
    const lai = docMetaTho(slug); // đọc lại TRONG khoá — tiến trình khác có thể vừa di trú xong
    if (lai.moi) return lai.moi;
    return diTruBoSangProbe(slug, lai.cu!);
  });
}

// ---- API ----

export function readProbeLibrary(slug: string): LibraryProbe[] {
  const meta = napMeta(slug);
  const kq: LibraryProbe[] = [];
  for (const m of meta.probes) {
    // Đọc NGOÀI khoá (R10.11) nên file có thể bị lượt song song evict/prune xoá giữa existsSync và
    // readFileSync — mất một probe thư viện ở lượt này thì bỏ qua nó, không được đổ cả lượt chấm.
    try {
      kq.push({ ...m, code: readFileSync(join(GOC_LIB, slug, m.ten), 'utf8') });
    } catch {
      /* file vừa bị dọn — lượt sau đọc meta mới sẽ hết mục này */
    }
  }
  return kq;
}

export interface AdmitResult {
  ten?: string;
  bo?: string; // lý do bỏ — để log nói được vì sao (R10 nguyên tắc: mọi lần loại đều ghi log)
  voi?: string; // trùng với probe nào
}

/** Nhận MỘT probe vào thư viện. Toàn bộ đọc→sửa→ghi trong khoá, kiểm trùng lại BÊN TRONG khoá (R8.4). */
export function admitToLibrary(slug: string, code: string, plan: ProbePlan, shaSinh: string, ext = '.probe.test.ts'): AdmitResult {
  const hash = createHash('sha256').update(code).digest('hex');
  return withLibraryLock(slug, () => {
    const meta = napMetaTrongKhoa(slug);
    const trungNoiDung = meta.probes.find((m) => m.hash === hash);
    if (trungNoiDung) return { bo: 'trùng nội dung probe đã có', voi: trungNoiDung.ten };
    const trungChayLai = meta.probes.find(
      (m) => m.sha_sinh === shaSinh && m.plan.id === plan.id && chuanRule(m.plan.spec_rule) === chuanRule(plan.spec_rule),
    );
    if (trungChayLai) return { bo: 'bản chạy-lại cùng commit', voi: trungChayLai.ten };

    const ten = tenFileProbe(meta.probes, shaSinh, hash, ext);
    mkdirSync(join(GOC_LIB, slug), { recursive: true });
    writeFileSync(join(GOC_LIB, slug, ten), code, 'utf8');
    meta.probes.push({ ten, sha_sinh: shaSinh, luc: new Date().toISOString(), hash, plan, lich_su: [] });

    // trần theo PROBE (R10.4), đào thải theo điểm GIỮ/LOẠI (R10.22) — xoá cả file, không để mồ côi
    while (meta.probes.length > TRAN_PROBE) {
      const { i, ly_do } = pickEvictionVictim(meta.probes, ten);
      const cu = meta.probes.splice(i, 1)[0];
      console.log(`[thu-vien] đào thải «${cu.ten}»: ${ly_do}`);
      try {
        rmSync(join(GOC_LIB, slug, cu.ten));
      } catch {
        /* file đã mất thì thôi */
      }
    }
    ghiMeta(slug, meta);
    return { ten };
  });
}

// napMeta khi ĐÃ ở trong khoá — không lấy khoá lần hai (mkdir lần hai sẽ tự chờ chính mình)
function napMetaTrongKhoa(slug: string): MetaLib {
  const tho = docMetaTho(slug);
  if (tho.moi) return tho.moi;
  return diTruBoSangProbe(slug, tho.cu!);
}

/**
 * Tầng 4a (R10.9–R10.10): ghi kết quả lượt chấm này vào lịch sử từng probe thư viện.
 * Cùng một lượt (cùng sha) chạy lại thì THAY bản ghi cũ, không nhân đôi.
 */
export function updateHistory(slug: string, shaLuot: string, ghi: Array<{ ten: string; trangThai: string }>): void {
  if (ghi.length === 0) return;
  withLibraryLock(slug, () => {
    const meta = napMetaTrongKhoa(slug);
    const luc = new Date().toISOString();
    for (const g of ghi) {
      const m = meta.probes.find((x) => x.ten === g.ten);
      if (!m) continue;
      // R10.23 — thành tích bắt hồi quy là VĨNH VIỄN, không trôi theo trần lịch sử 20 lượt.
      if (g.trangThai === 'hoi_quy') m.da_bat_hoi_quy = true;
      // R10.24 — cùng sha mà hai lần chạy cho hai trạng thái hành-vi-riêng khác nhau = không tất
      // định. Nhãn hoàn cảnh (nghi_loi_co_san…) đổi qua lại là chuyện của lượt, không tính.
      const cuSha = (m.lich_su ?? []).find((h) => h.sha === shaLuot);
      if (cuSha && cuSha.trang_thai !== g.trangThai && NHAN_HANH_VI_RIENG.has(cuSha.trang_thai) && NHAN_HANH_VI_RIENG.has(g.trangThai)) {
        m.flaky_diem = (m.flaky_diem ?? 0) + 1;
      }
      // Nhãn HOÀN CẢNH không đè nhãn hành-vi-riêng cùng sha (R10.20 — nó nói về lượt, không về
      // probe): đè là xoá dấu để lần chạy lại kế so flaky (pass→nghi_loi→hoi_quy sót mất cặp
      // pass↔hoi_quy — quan sát P2), và làm tầng 4 mất lượt so được.
      if (cuSha && NHAN_HANH_VI_RIENG.has(cuSha.trang_thai) && !NHAN_HANH_VI_RIENG.has(g.trangThai)) continue;
      m.lich_su = [...(m.lich_su ?? []).filter((h) => h.sha !== shaLuot), { sha: shaLuot, luc, trang_thai: g.trangThai }].slice(-TRAN_LICH_SU);
    }
    ghiMeta(slug, meta);
  });
}

export interface BehaviorDuplicateDrop {
  go: string; // probe bị gỡ (mới hơn)
  giu: string; // probe được giữ (cũ hơn — đã được chứng minh lâu hơn)
  bangChung: string;
}

/**
 * Tầng 4b (R10.9): gỡ trùng bằng hành vi ĐO ĐƯỢC — cùng luật spec, ≥3 lượt chung, kết quả giống hệt
 * ở mọi lượt chung, và ít nhất một lượt không phải pass. Hai probe cùng xanh suốt KHÔNG bị coi là
 * trùng: đồng thuận khi không có gì xảy ra không phải bằng chứng.
 */
/**
 * Nhãn nói về hành vi RIÊNG của một probe — nó chạy được, và kết quả là do chính nó quyết định.
 * Mọi nhãn khác nói về hoàn cảnh chung của lượt chấm, không phân biệt được probe này với probe kia.
 */

export function findAndDropBehaviorDuplicates(slug: string): BehaviorDuplicateDrop[] {
  return withLibraryLock(slug, () => {
    const meta = napMetaTrongKhoa(slug);
    const sx = [...meta.probes].sort((a, b) => a.luc.localeCompare(b.luc));
    const daGo = new Set<string>();
    const ra: BehaviorDuplicateDrop[] = [];
    for (let i = 0; i < sx.length; i++) {
      if (daGo.has(sx[i].ten)) continue;
      for (let j = i + 1; j < sx.length; j++) {
        const cu = sx[i];
        const moi = sx[j];
        if (daGo.has(moi.ten)) continue;
        if (chuanRule(cu.plan.spec_rule) !== chuanRule(moi.plan.spec_rule)) continue;
        const theoSha = new Map((cu.lich_su ?? []).map((h) => [h.sha, h.trang_thai]));
        // Chỉ so trên những lượt mà trạng thái nói về HÀNH VI RIÊNG của probe. `ngoai_pham_vi`,
        // `nghi_loi_co_san`, `nghi_van`, `khong_chay`, `bo_qua` phản ánh nguyên nhân CHUNG của môi
        // trường (spec-code đã đổi, API đổi mã lỗi, fixture đổi) — mọi probe neo cùng một luật sẽ
        // đồng loạt mang nhãn đó dù chúng kiểm những biên hoàn toàn khác nhau. Đem chúng ra so là
        // kết luận "trùng" từ một sự kiện không liên quan tới probe nào cả, rồi xoá VĨNH VIỄN cả
        // nhóm. Rủi ro không đối xứng: giữ nhầm một probe thừa thì tốn vài giây mỗi lượt, gỡ nhầm
        // một probe thật thì mất một phép thử đã từng bắt được hồi quy.
        const chung = (moi.lich_su ?? []).filter(
          (h) => NHAN_HANH_VI_RIENG.has(h.trang_thai) && NHAN_HANH_VI_RIENG.has(theoSha.get(h.sha) ?? ''),
        );
        if (chung.length < 3) continue;
        if (!chung.every((h) => theoSha.get(h.sha) === h.trang_thai)) continue;
        // Cùng im lặng không chứng minh trùng nhau — chỉ chứng minh chưa có gì để bắt. Phải có ít nhất
        // một lượt CẢ HAI cùng bắt được một thứ.
        if (!chung.some((h) => h.trang_thai === 'hoi_quy' || h.trang_thai === 'cai_thien')) continue;
        daGo.add(moi.ten);
        ra.push({
          go: moi.ten,
          giu: cu.ten,
          bangChung: `${chung.length} lượt chung kết quả giống hệt: ${chung.map((h) => `${h.sha.slice(0, 7)}=${h.trang_thai}`).join(' · ')}`,
        });
      }
    }
    if (ra.length > 0) {
      meta.probes = meta.probes.filter((m) => !daGo.has(m.ten));
      for (const g of ra) {
        try {
          rmSync(join(GOC_LIB, slug, g.go));
        } catch {
          /* file đã mất thì thôi */
        }
      }
      ghiMeta(slug, meta);
    }
    return ra;
  });
}
