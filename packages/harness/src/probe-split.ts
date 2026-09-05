/**
 * Máy TÁCH một probe ra khỏi file nhiều probe.
 *
 * File này là phần DUY NHẤT sống sót của `probe-library.ts` cũ (973 dòng) sau change
 * `probe-handover-replaces-library`. Việc của nó đổi, bản thân nó thì không: trước tách ra để **nạp
 * vào kho tích luỹ**, nay tách ra để **giao cho repo đích**.
 *
 * Nội dung dưới đây GIỮ NGUYÊN TỪNG KÝ TỰ khi chuyển nhà — nó là regex dày, và chép tay một khối như
 * thế là rước một lỗi không ai đọc ra. Chuyển bằng `git mv` + lược bớt, không bằng gõ lại.
 *
 * ⛔ Tách sai thì thứ giao cho repo đích là code KHÔNG CHẠY ĐƯỢC, và đội nhận một file hỏng kèm lời
 * khuyên thêm nó vào bộ test — hỏng uy tín của cả cơ chế giao ở đúng lần đầu tiên.
 */

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
