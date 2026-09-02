import { createHash } from 'node:crypto';

/**
 * Đơn vị luật có địa chỉ — thứ engine THẬT SỰ cần từ một spec.
 *
 * Bản trước giả định «luật = một mã ngắn kiểu R4.21» (`extractRuleIds`), và mọi thứ phía sau — neo
 * probe, tìm luật mới, đếm độ phủ — đều đứng trên giả định đó. Repo không đánh mã thì cả ba thứ ấy
 * lặng lẽ vô nghĩa, trong khi cổng vẫn ra verdict trông y như thật. Repo demo của chính dự án khớp
 * được chỉ vì nó được viết để khớp.
 *
 * Yêu cầu thật không phải «phải có mã» mà «phải TRỎ TỚI ĐƯỢC». Đơn vị = khối dưới một tiêu đề,
 * địa chỉ = đường tiêu đề. Mã ngắn không bị bỏ: nó thành trường hợp riêng — tiêu đề (hay dòng trong
 * khối) tình cờ mang mã, và mã đó cũng trỏ được vào đơn vị ấy.
 */
export interface SpecUnit {
  /** Đường tiêu đề, ví dụ `Phê duyệt › Ngưỡng theo vai`. Duy nhất trong một tập spec. */
  address: string;
  /** Mã ngắn ở đầu tiêu đề nếu có (`R4.21`, `US-12`, `AC3`) — trường hợp riêng, tuỳ chọn. */
  code?: string;
  /** Mọi mã ngắn xuất hiện TRONG khối (kể cả trong list item) — để probe khai mã con vẫn neo được. */
  codes: string[];
  file: string;
  /** Tiêu đề + thân, tới tiêu đề kế cùng cấp hoặc cao hơn. */
  body: string;
  /** Vân tay thân khối — so hai nhánh: cùng địa chỉ mà khác nội dung cũng là "đã đổi". */
  hash: string;
}

/**
 * Tiêu đề sâu hơn mức này KHÔNG mở đơn vị mới — nó nằm trong thân đơn vị cha. Tài liệu chia tiêu
 * đề tới `#####` mà không có trần thì một spec 30 trang vỡ thành hàng trăm đơn vị, và độ phủ thành
 * mẫu số vô nghĩa theo chiều ngược lại.
 */
export const MAX_UNIT_DEPTH = 3;

/** Mã ngắn: `R4.21` · `R4` · `US-12` · `AC3` · `FR-7.2`. Chữ hoa 1–4 ký tự, có thể có gạch, số, số con. */
const RE_CODE = /\b([A-Z]{1,4}-?\d{1,3}(?:\.\d{1,3})?)\b/g;
const RE_CODE_AT_START = /^([A-Z]{1,4}-?\d{1,3}(?:\.\d{1,3})?)\b/;

/** Mọi mã ngắn trong một đoạn văn bản. Giữ nguyên hàm cũ của `target.ts` về ngữ nghĩa, chỉ nới mẫu. */
export function extractCodes(text: string): Set<string> {
  const ra = new Set<string>();
  for (const m of text.matchAll(RE_CODE)) ra.add(m[1]);
  return ra;
}

function stripHeading(raw: string): string {
  // Bỏ ký hiệu markdown quanh tiêu đề và dấu nối «—»/«-» sau mã: `## R1 — Ngưỡng` → `R1 — Ngưỡng`
  return raw.replace(/^#+\s*/, '').replace(/\s*#+\s*$/, '').replace(/\*\*/g, '').trim();
}

/**
 * Chia MỘT file spec thành đơn vị. File không có tiêu đề nào → cả file là một đơn vị, địa chỉ là tên
 * file: văn bản thuần vẫn neo được, chỉ là thô hơn.
 */
export function splitSpecUnits(file: string, text: string, maxDepth = MAX_UNIT_DEPTH): SpecUnit[] {
  const lines = text.split(/\r?\n/);
  const units: SpecUnit[] = [];
  const path: string[] = []; // đường tiêu đề hiện tại theo cấp
  let cur: { address: string; code?: string; lines: string[] } | null = null;
  const dung = new Map<string, number>(); // chống trùng địa chỉ giữa hai mục cùng tên

  const dong = (): void => {
    if (!cur) return;
    const body = cur.lines.join('\n').trim();
    units.push({
      address: cur.address,
      code: cur.code,
      codes: [...extractCodes(body)],
      file,
      body,
      hash: createHash('sha256').update(body).digest('hex').slice(0, 12),
    });
    cur = null;
  };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m && m[1].length <= maxDepth) {
      dong();
      const depth = m[1].length;
      const title = stripHeading(line);
      path.length = depth - 1; // tiêu đề cấp n cắt mọi cấp ≥ n
      path.push(title);
      // Tài liệu mở đầu bằng `##`, hay nhảy cấp `#` → `###`, để lại ô trống trong `path` —
      // bỏ ô trống khi ghép, kẻo địa chỉ thành ` › Lỗi` và không probe nào neo được vào nó.
      let address = path.filter(Boolean).join(' › ');
      const lan = (dung.get(address) ?? 0) + 1;
      dung.set(address, lan);
      if (lan > 1) address = `${address}#${lan}`;
      const code = RE_CODE_AT_START.exec(title)?.[1];
      cur = { address, code, lines: [line] };
      continue;
    }
    if (!cur) {
      // Văn bản trước tiêu đề đầu tiên (hoặc file không có tiêu đề): dồn vào đơn vị lấy tên file
      cur = { address: file.replace(/^.*[\\/]/, ''), lines: [] };
    }
    cur.lines.push(line);
  }
  dong();
  // Bỏ hai loại không phải luật: khối "mở đầu" rỗng (chỉ dòng trắng trước tiêu đề đầu), và khối
  // KHÔNG CÓ ĐỊA CHỈ (không tên file, không tiêu đề) — một đơn vị không trỏ tới được thì không phải
  // đơn vị, và để nó lọt là để một mẩu văn bản vô danh trở thành "luật mới" chặn merge.
  return units.filter((u) => u.address.length > 0 && (u.body.length > 0 || u.code !== undefined));
}

/** Chia cả tập spec, giữ thứ tự file. */
export function splitAllSpecUnits(specs: Array<{ file: string; noiDung: string }>, maxDepth = MAX_UNIT_DEPTH): SpecUnit[] {
  return specs.flatMap((s) => splitSpecUnits(s.file, s.noiDung == null ? '' : String(s.noiDung), maxDepth));
}

/** Tách chuỗi `spec_rule` model khai («R9», «R9.4», «R4.21+R4.27», «Phê duyệt › Ngưỡng») thành từng vế. */
export function splitRuleRefs(specRule: string | undefined): string[] {
  return (specRule ?? '')
    .split(/[,+;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Chuẩn hoá để so địa chỉ: bỏ ký hiệu, gộp khoảng trắng, thường hoá. */
function norm(s: string): string {
  return s.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Probe khai `spec_rule` → nó neo vào đơn vị nào.
 *
 * Một vế khớp một đơn vị khi:
 *  - vế là mã và bằng `code` của đơn vị, hoặc là mã cha của nó (`R9` neo được `R9.4`) — một chiều,
 *    đúng như luật cũ của `isNewRule`;
 *  - vế là mã xuất hiện TRONG khối (list item `- **R6.26**`) — để repo viết luật con dạng gạch đầu
 *    dòng vẫn neo được, chỉ là ở độ hạt của khối cha;
 *  - vế là chữ và là một phần của địa chỉ (không phân biệt hoa thường).
 *
 * Trả về đơn vị KHỚP ĐƯỢC; vế nào không khớp thì bỏ qua — probe khai lỏng không được làm hàm ném.
 */
export function resolveRule(specRule: string | undefined, units: SpecUnit[]): SpecUnit[] {
  const ra = new Set<SpecUnit>();
  for (const ve of splitRuleRefs(specRule)) {
    const laMa = RE_CODE_AT_START.test(ve) && RE_CODE_AT_START.exec(ve)![1].length === ve.length;
    const veChuan = norm(ve);
    for (const u of units) {
      if (laMa) {
        if (u.code === ve || (u.code !== undefined && u.code.startsWith(`${ve}.`))) ra.add(u);
        else if (u.codes.includes(ve) || u.codes.some((c) => c.startsWith(`${ve}.`))) ra.add(u);
      } else if (veChuan && norm(u.address).includes(veChuan)) {
        ra.add(u);
      }
    }
  }
  return [...ra];
}

/**
 * Luật CHỈ có ở nhánh PR — so theo ĐƠN VỊ, không so theo mã.
 *
 * Trả về danh sách «dấu hiệu mới» gồm cả địa chỉ đơn vị mới lẫn mã mới. Vì sao cả hai:
 *  - chỉ so địa chỉ thì thêm một mục con `R6.31` dạng list item vào khối `R6` có sẵn sẽ LỌT —
 *    bỏ sót là hướng nguy hiểm (PR khai luật rồi vi phạm ngay luật vừa khai mà cổng không thấy);
 *  - chỉ so vân tay thì sửa một lỗi chính tả cũng biến cả khối thành "mới" và mọi probe neo vào đó
 *    mất đối chứng — chặn oan hàng loạt.
 * Nên: địa chỉ mới ∪ (mã mới xuất hiện trong khối đã đổi nội dung).
 */
export function findNewUnits(pr: SpecUnit[], base: SpecUnit[]): string[] {
  const baseByAddr = new Map(base.map((u) => [u.address, u] as const));
  const baseCodes = new Set(base.flatMap((u) => [...(u.code ? [u.code] : []), ...u.codes]));
  const moi = new Set<string>();
  for (const u of pr) {
    const cu = baseByAddr.get(u.address);
    if (!cu) {
      moi.add(u.address);
      if (u.code && !baseCodes.has(u.code)) moi.add(u.code);
      for (const c of u.codes) if (!baseCodes.has(c)) moi.add(c);
      continue;
    }
    if (cu.hash === u.hash) continue;
    for (const c of u.codes) if (!baseCodes.has(c)) moi.add(c);
    if (u.code && !baseCodes.has(u.code)) moi.add(u.code);
  }
  return [...moi];
}

/**
 * Độ phủ luật của một lượt: đơn vị nào có probe neo vào, trên bao nhiêu đơn vị.
 * KHÔNG có đơn vị nào → trả về hai trường VẮNG, không trả `0/0`: `0` là một phép đo đã thực hiện,
 * không-đo-được là không có mẫu số. Một chữ số cho hai tình trạng là để người đọc tin nhầm.
 */
export function ruleCoverage(units: SpecUnit[], specRules: Array<string | undefined>): { luat_da_phu?: string[]; luat_tong?: number } {
  if (units.length === 0) return {};
  const daPhu = new Set<string>();
  for (const r of specRules) for (const u of resolveRule(r, units)) daPhu.add(u.address);
  return { luat_da_phu: [...daPhu].sort(), luat_tong: units.length };
}

/** Một vế `spec_rule` có trỏ vào dấu hiệu luật-mới nào không — khớp mã một chiều như luật cũ, và khớp địa chỉ. */
export function refHitsNew(specRule: string | undefined, newMarks: string[]): boolean {
  if (!specRule || newMarks.length === 0) return false;
  for (const ve of splitRuleRefs(specRule)) {
    for (const n of newMarks) {
      if (ve === n || ve.startsWith(`${n}.`)) return true;
      if (norm(n).includes(norm(ve)) && norm(ve).length >= 3 && !RE_CODE_AT_START.test(n)) return true;
    }
  }
  return false;
}
