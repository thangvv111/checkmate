/**
 * Cổng PHÁT RA cho thông điệp lỗi của repo đích (capability `error-message-egress-gate`).
 *
 * Thông điệp lỗi do bộ chạy test của repo đích sinh ra là dữ liệu KHÔNG TIN ĐƯỢC, và nó đi tới ba bề mặt
 * rời khỏi máy chủ: log sự kiện, comment pull request, prompt gửi model. Nếu bộ chạy test in một bí mật của
 * repo đích vào thông điệp lỗi, bí mật đó ra ngoài — ⛔C3, và với comment pull request thì không thu hồi được.
 *
 * Vì sao KHÔNG dò bí mật theo hình dạng (`ghp_`, `sk-`, entropy cao): đó là danh sách cấm, và một âm tính
 * giả ở đây LÀ một bí mật rò ra công khai. Cổng này làm ngược lại — danh sách CHO PHÉP: tách dòng thành
 * CẤU TRÚC + các Ô GIÁ TRỊ, phát cấu trúc, và bắt từng ô tự đi qua cửa.
 *
 * Vì sao không khớp tiền tố: đo 03/09 trên 180 thông điệp thật, khuôn `^(AssertionError|assert )` phủ 76%
 * và chặn được 0 — nó cho qua nguyên vẹn mọi thứ đứng sau, mà «mọi thứ đứng sau» chính là chỗ giá trị nằm.
 */

/** Số dài quá ngưỡng này không còn là «status code / số đếm» mà có thể là một khoá gồm chữ số. */
const MAX_SAFE_DIGITS = 12;

const SAFE_KEYWORDS = new Set(['undefined', 'null', 'true', 'false', 'NaN', 'Infinity', '-Infinity']);

const TYPE_NAMES = new Set(['string', 'number', 'object', 'array', 'function', 'boolean', 'symbol', 'bigint']);

/**
 * Nguồn đối chiếu của tầng 3 — văn bản ĐÃ CÓ MẶT ở chính bề mặt sắp phát ra.
 *
 * Đây là tham số chứ không phải thứ cổng tự đi lấy, vì mỗi bề mặt đã biết một lượng khác nhau (D2b):
 * comment pull request và log đối chiếu diff + source của PR (người đọc được comment thì đọc được repo);
 * prompt gửi model chỉ được đối chiếu những khối THẬT SỰ đã gửi tới model — diff bản đã cắt theo trần,
 * spec, test mẫu. Một chuỗi nằm trong phần diff bị cắt thì CÓ trong PR nhưng model chưa từng thấy, và
 * dùng nguồn chung cho cả hai là gửi bí mật tới một nơi nó chưa có mặt.
 */
export type EgressSource = string;

/** Chỉ báo cắt bớt của vitest (`…(24)`) — không mang nội dung nào của repo đích. */
const ELLIPSIS_COUNT = /^…\(\d+\)$|^\.\.\.\(\d+\)$/;

function unquote(raw: string): string {
  const s = raw.trim();
  const m = /^(['"`])([\s\S]*)\1$/.exec(s);
  return m ? m[2] : s;
}

/** Tách một danh sách ở MỨC NGOẶC 0 — `a, [b, c], {d: e}` → ba phần tử, không cắt nhầm bên trong. */
function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      cur += c;
      if (c === quote && body[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      cur += c;
      continue;
    }
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x.length > 0);
}

/** Mô tả thay cho một ô bị gột. Mang LOẠI và ĐỘ DÀI — không được là chuỗi trống hay nhãn trơ (D5). */
function redactedSlot(raw: string): string {
  const s = raw.trim();
  const inner = unquote(s);
  return s !== inner ? `<chuỗi ${inner.length} ký tự>` : `<${s.length} ký tự>`;
}

/**
 * Một ô giá trị qua cửa hay không, và nếu qua thì phát ra cái gì.
 *
 * Ba tầng, thứ tự là hợp đồng: hình dạng an toàn → đệ quy (mảng/object) → đối chiếu nguồn. Tầng đệ quy
 * đứng TRƯỚC tầng đối chiếu vì một mảng số hợp lệ không cần và không nên phụ thuộc vào việc nó có xuất
 * hiện nguyên văn trong diff hay không.
 */
export function redactSlot(raw: string, source: EgressSource): string {
  const s = raw.trim();
  if (s.length === 0) return s;

  // --- tầng 1: hình dạng an toàn ---
  if (SAFE_KEYWORDS.has(s) || TYPE_NAMES.has(s)) return s;
  if (ELLIPSIS_COUNT.test(s)) return s;
  if (new RegExp(`^-?\\d{1,${MAX_SAFE_DIGITS}}(\\.\\d{1,6})?$`).test(s)) return s;
  if (/^\[\s*\]$/.test(s) || /^\{\s*\}$/.test(s)) return s;

  // --- tầng 2: đệ quy ---
  const arr = /^\[([\s\S]*)\]$/.exec(s);
  if (arr) {
    const parts = splitTopLevel(arr[1]).map((p) => redactSlot(p, source));
    return `[ ${parts.join(', ')} ]`;
  }
  const obj = /^\{([\s\S]*)\}$/.exec(s);
  if (obj) {
    const parts = splitTopLevel(obj[1]).map((p) => {
      const kv = /^([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:\s*([\s\S]*)$/.exec(p);
      if (!kv) return redactSlot(p, source);
      // Khoá KHÔNG nháy là một định danh — tên trường lấy từ khai báo kiểu/schema của repo đích, tức là
      // CẤU TRÚC chứ không phải nội dung: bí mật nằm ở giá trị, không nằm ở tên ô chứa nó. Gột khoá làm
      // cả dòng thành vô dụng (`{ <2 ký tự>: 25 }`), đúng thứ án lệ `loiHaTang` cấm.
      // Khoá CÓ nháy thì khác: nó là dữ liệu (khoá của map), nên phải qua cửa như mọi ô giá trị.
      const key = /^[A-Za-z_$][\w$]*$/.test(kv[1]) ? kv[1] : redactSlot(kv[1], source);
      return `${key}: ${redactSlot(kv[2], source)}`;
    });
    return `{ ${parts.join(', ')} }`;
  }

  // --- tầng 3: đối chiếu nguồn ---
  const inner = unquote(s);
  if (inner.length > 0 && source.includes(inner)) return s;

  return redactedSlot(s);
}

/**
 * Bộ khuôn cấu trúc. Mỗi khuôn khai RÕ ô nào là giá trị bằng nhóm bắt; phần ngoài nhóm bắt là cấu trúc và
 * được phát nguyên vẹn. Thêm khuôn nghĩa là thêm một cửa — nên khuôn phải hẹp, và mọi chỗ tự do trong nó
 * phải nằm trong một nhóm bắt để đi qua cửa ô.
 */
const PATTERNS: Array<{ re: RegExp; build: (m: RegExpExecArray, redact: (s: string) => string) => string }> = [
  // expected <A> to be|equal|deeply equal <B> [// đuôi]
  {
    re: /^(?<pre>[A-Za-z_$][\w$]*:\s+)?expected\s+(?<a>[\s\S]+?)\s+to\s+(?<verb>be|equal|deeply equal|contain|match|include)\s+(?<b>[\s\S]+?)(?<tail>\s*\/\/[\s\S]*)?$/,
    build: (m, r) =>
      `${m.groups!.pre ?? ''}expected ${r(m.groups!.a)} to ${m.groups!.verb} ${r(m.groups!.b)}${m.groups!.tail ?? ''}`,
  },
  // expected <A> to have a length of <B> [but got <C>]
  {
    re: /^(?<pre>[A-Za-z_$][\w$]*:\s+)?expected\s+(?<a>[\s\S]+?)\s+to have a length of\s+(?<b>\S+)(?:\s+but got\s+(?<c>\S+))?$/,
    build: (m, r) =>
      `${m.groups!.pre ?? ''}expected ${r(m.groups!.a)} to have a length of ${r(m.groups!.b)}` +
      (m.groups!.c ? ` but got ${r(m.groups!.c)}` : ''),
  },
  // expected <A> to throw ...
  {
    re: /^(?<pre>[A-Za-z_$][\w$]*:\s+)?expected\s+(?<a>[\s\S]+?)\s+to throw(?<tail>[\s\S]*)$/,
    build: (m, r) => `${m.groups!.pre ?? ''}expected ${r(m.groups!.a)} to throw${r(m.groups!.tail ?? '')}`,
  },
  // Cannot find module '<path>' / ModuleNotFoundError: No module named '<path>'
  {
    re: /^(?<pre>[\s\S]*?)(?<kw>Cannot find module|No module named|Failed to load|Failed to resolve import)\s+(?<p>\S+)(?<tail>[\s\S]*)$/,
    build: (m, r) => `${m.groups!.pre ?? ''}${m.groups!.kw} ${r(m.groups!.p)}${r(m.groups!.tail ?? '')}`,
  },
  // <X> is not a function
  {
    re: /^(?<x>[\s\S]+?)\s+is not a function(?<tail>[\s\S]*)$/,
    build: (m, r) => `${r(m.groups!.x)} is not a function${r(m.groups!.tail ?? '')}`,
  },
  // TIMEOUT: … — thông điệp do CHÍNH CheckMate sinh (sandbox.ts), không mang dữ liệu repo đích
  { re: /^TIMEOUT:[\s\S]*$/, build: (m) => m[0] },
  // <ErrorClass>: <message> — khuôn cuối, message tự do nên phải qua cửa ô
  {
    re: /^(?<cls>[A-Z][A-Za-z0-9_]*(?:Error|Exception|Warning)):\s+(?<msg>[\s\S]+)$/,
    build: (m, r) => `${m.groups!.cls}: ${r(m.groups!.msg)}`,
  },
];

/** Một dòng không khớp khuôn nào: giữ lớp lỗi nếu nhận ra được, và luôn giữ độ dài (D5). */
function redactUnknownLine(line: string): string {
  const cls = /^([A-Z][A-Za-z0-9_]*(?:Error|Exception|Warning)):/.exec(line);
  return cls ? `${cls[1]}: <${line.length - cls[1].length - 2} ký tự>` : `<không nhận dạng được, ${line.length} ký tự>`;
}

/**
 * Lọc một thông điệp lỗi trước khi phát ra một bề mặt rời khỏi máy chủ.
 *
 * `source` phải là văn bản ĐÃ CÓ MẶT ở đúng bề mặt ấy (D2b) — truyền nhầm nguồn của bề mặt khác là mở lại
 * lỗ này. Nguồn rỗng thì tầng 3 từ chối mọi chuỗi: fail-closed, không phải cho qua mọi chuỗi.
 */
export function redactMessage(message: unknown, source: EgressSource): string {
  if (typeof message !== 'string' || message.length === 0) return '';
  const src = typeof source === 'string' ? source : '';
  return message
    .split(/\r?\n/)
    .map((line) => {
      const s = line.trim();
      if (s.length === 0) return line;
      for (const p of PATTERNS) {
        const m = p.re.exec(s);
        if (m) return p.build(m, (x) => redactSlot(x, src));
      }
      return redactUnknownLine(s);
    })
    .join('\n');
}
