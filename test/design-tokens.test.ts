import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới token — canh «một nguồn cho màu», và canh ranh giới giữa HAI HỌ token.
 *
 * Vì sao lưới này tồn tại: gói design CCS có accent hệ thống #ec3013, còn CheckMate có màu FAIL
 * #D0342C. Hai màu đều là đỏ, nhìn gần giống nhau, và cám dỗ thường trực là gộp chúng thành một
 * biến cho gọn. Gộp thì một lần đổi look kéo theo đổi NGHĨA của verdict: nút «bấm đi» và nhãn
 * «hỏng rồi» cùng đổi màu. Lưới này khoá chuyện đó thành tính chất của cấu trúc.
 *
 * Ranh giới lưới đặt ra — nói rõ để người sau không nới nhầm:
 *   ĐƯỢC   khai mã màu bên trong khối `:root { … }` (đó chính là chỗ token được định nghĩa)
 *   KHÔNG  viết mã màu ở bất kỳ chỗ nào khác trong file giao diện
 *
 * Không cấm hex ở khắp nơi, vì bộ semantic BẮT BUỘC phải hard-code đâu đó — gói design khai thẳng
 * ba màu này là hard-code có chủ đích. Lưới cấm sạch sẽ báo oan đúng chỗ gói bảo phải làm; mà lưới
 * báo oan thì người ta tắt, chứ không sửa code.
 */

const THU_MUC_UI = 'apps/web/src';

/** Chín mã semantic — nghĩa nghiệp vụ, KHÔNG thuộc Modernist. */
const SEMANTIC: Record<string, string> = {
  '--pass': '#0E9F7E',
  '--pass-ink': '#08655A',
  '--pass-tint': '#E2F3EE',
  '--fail': '#D0342C',
  '--fail-ink': '#A3271F',
  '--fail-tint': '#F9E4E2',
  '--medium': '#C77A16',
  '--medium-ink': '#8F5810',
  '--medium-tint': '#F7ECDA',
};

function uiFiles(): string[] {
  return readdirSync(THU_MUC_UI)
    .filter((t) => /^ui.*\.ts$/.test(t))
    .map((t) => join(THU_MUC_UI, t));
}

/**
 * Bỏ phần chú thích trước khi soi — lưới phải bắt việc DÙNG mã màu, không bắt việc NHẮC TÊN nó.
 *
 * Án lệ: bản đầu của lưới này báo đỏ ngay chính dòng comment giải thích luật («--color-accent
 * (#ec3013) và --fail (#D0342C) đều là đỏ…»). Cùng khuôn với lưới M11 hôm trước. Lưới báo oan thì
 * người ta tắt, chứ không sửa code — nên chỗ nới này là cố ý và có lý do, không phải cho dễ xanh.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

/** Các dòng có mã màu mà KHÔNG nằm trong khối khai token `:root { … }`. */
function hexOutsideTokenBlock(file: string): string[] {
  const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/);
  const found: string[] = [];
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const opensRoot = /:root\s*\{/.test(line);
    if (opensRoot) depth++;
    if (depth === 0 && /#[0-9a-fA-F]{3,8}\b/.test(line)) {
      found.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`);
    }
    if (depth > 0 && !opensRoot && /\}/.test(line)) depth--;
  }
  return found;
}

describe('lưới token — màu chỉ đến từ token', () => {
  it('không file giao diện nào viết mã màu ngoài khối khai token', () => {
    const pham = uiFiles().flatMap(hexOutsideTokenBlock);
    expect(pham, `Mã màu viết thẳng ngoài khối :root:\n${pham.join('\n')}`).toEqual([]);
  });

  it('vế đối chứng: chín mã semantic khai trong :root thì lưới XANH', () => {
    // Thiếu ca này thì một lưới «cấm mọi hex» cũng xanh ở ca trên, và nó sẽ báo oan đúng chỗ gói
    // design bảo phải hard-code. Ca này chứng minh lưới phân biệt được KHAI TOKEN với VIẾT BỪA.
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    for (const [ten, ma] of Object.entries(SEMANTIC)) {
      expect(css, `thiếu khai ${ten}: ${ma}`).toContain(`${ten}:`);
      expect(css.toLowerCase(), `${ten} phải mang đúng mã ${ma} như gói design khai`).toContain(
        ma.toLowerCase(),
      );
    }
    expect(hexOutsideTokenBlock(join(THU_MUC_UI, 'ui.ts'))).toEqual([]);
  });
});

describe('lưới token — hai họ token không trộn', () => {
  it('accent hệ thống và FAIL là hai biến riêng, mang hai giá trị khác nhau', () => {
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    const accent = /--color-accent:\s*(#[0-9a-fA-F]{3,8})/.exec(css)?.[1]?.toLowerCase();
    const fail = /--fail:\s*(#[0-9a-fA-F]{3,8})/.exec(css)?.[1]?.toLowerCase();
    expect(accent, 'không tìm thấy --color-accent').toBeTruthy();
    expect(fail, 'không tìm thấy --fail').toBeTruthy();
    expect(accent, 'accent hệ thống và FAIL bị gộp — đổi look sẽ đổi nghĩa verdict').not.toBe(fail);
  });

  it('màu verdict không bao giờ lấy từ biến accent của hệ thống', () => {
    // Đây là vế còn lại của cùng một luật: hai biến riêng nhưng nếu .verdict/.vd-*/.finding lại
    // trỏ vào var(--color-accent) thì việc tách biến chỉ tách trên giấy.
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    const pham: string[] = [];
    for (const line of css.split(/\r?\n/)) {
      if (/^\s*\.(verdict|vd-|finding)/.test(line) && /var\(--color-accent/.test(line)) {
        pham.push(line.trim().slice(0, 100));
      }
    }
    expect(pham, `Lớp mang nghĩa verdict lấy màu từ accent hệ thống:\n${pham.join('\n')}`).toEqual(
      [],
    );
  });
});

/** Tên biến này thuộc họ SEMANTIC hay họ LOOK — suy từ chính cái tên. */
export function tokenFamily(ten: string): 'semantic' | 'look' {
  return /(^|-)(pass|fail|medium)(-|$)/.test(ten.replace(/^--/, '')) ? 'semantic' : 'look';
}

/**
 * Bí danh TRỘN HAI HỌ — biến mang tên họ này lại khai bằng token họ kia.
 *
 * Vì sao phải quét KHAI BÁO chứ không cấm chỗ dùng: cấm `var(--teal)` là cấm triệu chứng. Ai đó đặt
 * bí danh tên khác (`--xanh`, `--ok`) là lại lọt, và danh sách cấm phải nuôi bằng tay mãi mãi. Quét
 * khai báo thì bắt được MỌI tên, kể cả tên chưa ai nghĩ ra.
 *
 * Đo được (05/09): khối bí danh `--teal: var(--pass)` · `--amber: var(--medium)` … đã đưa **38 chỗ**
 * trong giao diện đi vòng qua lưới cấm hex — trong đó có tag «đang chọn», tag «đang dùng», mục nav
 * đang mở và một con số đếm, tất cả tô bằng đúng màu PASS. Lưới xanh suốt thời gian đó, vì nó soi mã
 * màu mà chỗ hỏng không có mã màu nào.
 */
export function scanTokenAliases(css: string): string[] {
  const loi: string[] = [];
  let depth = 0;
  for (const line of String(css ?? '').split(/\r?\n/)) {
    const mo = /:root\s*\{/.test(line);
    if (mo) depth++;
    if (depth > 0) {
      const m = /(--[a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(line);
      // Trộn họ theo CẢ HAI CHIỀU: look mang tên semantic, và semantic mang tên look. Bản đầu chỉ
      // nghĩ tới chiều thứ nhất vì đó là chiều đang có bệnh — mà chiều kia gây đúng cùng hậu quả.
      if (m && tokenFamily(m[1]!) !== tokenFamily(m[2]!)) {
        loi.push(`${m[1]} -> ${m[2]}`);
      }
    }
    if (depth > 0 && !mo && /\}/.test(line)) depth--;
  }
  return loi;
}

/** Chỗ mang TRẠNG THÁI GIAO DIỆN mà lại lấy màu từ bộ semantic. */
export function scanSemanticOnUiState(src: string): string[] {
  const NHAN = ['đang chọn', 'đang dùng', 'Đã lưu cấu hình', 'docs-nav a.on'];
  return String(src ?? '')
    .split(/\r?\n/)
    .filter((d) => NHAN.some((n) => d.includes(n)))
    .filter((d) => /var\(--pass|var\(--fail|var\(--medium/.test(d))
    .map((d) => d.trim().slice(0, 110));
}

describe('lưới token — CẤM BÍ DANH trộn hai họ', () => {
  it('mã nguồn hiện tại: không bí danh nào trộn họ', () => {
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    expect(scanTokenAliases(css), 'bí danh trộn hai họ token').toEqual([]);
  });

  it('phép quét BẮT được cả hai chiều trộn — fixture đối kháng', () => {
    expect(scanTokenAliases(':root {\n  --teal: var(--pass);\n}')).toHaveLength(1);
    expect(scanTokenAliases(':root {\n  --pass: var(--color-accent);\n}')).toHaveLength(1);
    expect(scanTokenAliases(':root {\n  --amber: var(--medium);\n}')).toHaveLength(1);
  });

  it('bí danh trong CÙNG một họ thì XANH — fixture đối chứng', () => {
    // Không có vế này thì một phép quét «cấm mọi bí danh» cũng xanh ở ca đối kháng, rồi báo oan
    // trên năm bí danh look→look đang có và hoàn toàn hợp lệ.
    expect(scanTokenAliases(':root {\n  --surface: var(--color-bg);\n}')).toEqual([]);
    expect(scanTokenAliases(':root {\n  --fail-soft: var(--fail-tint);\n}')).toEqual([]);
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    for (const ten of ['--bg', '--surface', '--ink', '--muted', '--line']) {
      expect(css, `bí danh look→look ${ten} phải còn`).toContain(`${ten}: var(--color-`);
    }
  });

  it('không xét dòng ngoài :root, và không ném trên đầu vào khuyết', () => {
    expect(scanTokenAliases('--teal: var(--pass);')).toEqual([]);
    expect(scanTokenAliases('')).toEqual([]);
    expect(scanTokenAliases(null as never)).toEqual([]);
  });

  it('tokenFamily phân loại đúng hai họ', () => {
    for (const t of ['--pass', '--pass-tint', '--fail', '--fail-ink', '--medium', '--medium-tint']) {
      expect(tokenFamily(t), t).toBe('semantic');
    }
    for (const t of ['--color-accent', '--color-bg', '--surface', '--line', '--color-neutral-800']) {
      expect(tokenFamily(t), t).toBe('look');
    }
  });
});

describe('lưới token — TRẠNG THÁI GIAO DIỆN không mang màu verdict', () => {
  it('không chỗ nào của «đang chọn / đang dùng / nav đang mở / đã lưu» lấy màu semantic', () => {
    // Hướng rò thứ hai của cùng một luật. Scenario cũ canh «đổi accent không đổi nghĩa verdict»;
    // đây canh chiều ngược lại — đổi màu PASS không được đổi vẻ của một trạng thái giao diện.
    const pham = uiFiles().flatMap((f) => scanSemanticOnUiState(readFileSync(f, 'utf8')).map((d) => `${f}: ${d}`));
    expect(pham, `trạng thái giao diện mang màu verdict:\n${pham.join('\n')}`).toEqual([]);
  });

  it('phép quét BẮT được cái sai — fixture đối kháng', () => {
    expect(scanSemanticOnUiState('<span style="background:var(--pass-tint)">đang chọn</span>')).toHaveLength(1);
  });

  it('vế ĐỐI CHỨNG: chỗ ĐÚNG LÀ kết quả phép kiểm thì VẪN dùng semantic', () => {
    // Thiếu ca này thì ca trên xanh cả khi ai đó xoá sạch màu semantic khỏi giao diện.
    const repo = readFileSync(join(THU_MUC_UI, 'ui-repo.ts'), 'utf8');
    const ncc = readFileSync(join(THU_MUC_UI, 'ui-provider.ts'), 'utf8');
    expect(repo, '«chìa riêng» là mức TỐT của một trục ba mức').toContain('var(--pass-tint);color:var(--pass-ink)">chìa riêng');
    expect(repo, '«thiếu token» là mức HỎNG của cùng trục ấy').toContain('color:var(--fail)" title="Không chấm được');
    expect(ncc, '«✓ đã kiểm» là kết quả một phép kiểm').toContain('color:var(--pass-ink);font-weight:600" title="kiểm lúc');
  });

  it('badge «trực» dùng jade, không dùng amber — bật trực không phải một cảnh báo', () => {
    const repo = readFileSync(join(THU_MUC_UI, 'ui-repo.ts'), 'utf8');
    expect(repo).toContain('var(--pass-tint);color:var(--pass-ink)">trực');
  });
});

describe('lưới token — hình dạng Modernist', () => {
  it('radius 0 mọi nơi, ngoại lệ duy nhất là pill và hình tròn', () => {
    const pham: string[] = [];
    for (const f of uiFiles()) {
      const lines = readFileSync(f, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/border-radius:\s*([^;}"']+)/g)) {
          const v = m[1]!.trim();
          const ok =
            /^0(px)?$/.test(v) ||
            /^var\(--radius-/.test(v) ||
            /^calc\(var\(--radius-/.test(v) ||
            v === '50%' ||
            v === '99px';
          if (!ok) pham.push(`${f}:${i + 1}  border-radius:${v}`);
        }
      });
    }
    expect(pham, `Modernist là radius 0; bo góc lạ:\n${pham.join('\n')}`).toEqual([]);
  });

  it('phông khai kèm fallback stack thật — prod không giả định mạng ra ngoài luôn thông', () => {
    const css = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    for (const bien of ['--font-heading', '--font-body', '--font-mono']) {
      const dong = new RegExp(`${bien}:\\s*([^;]+);`).exec(css)?.[1] ?? '';
      expect(dong.split(',').length, `${bien} thiếu fallback: ${dong}`).toBeGreaterThan(1);
    }
  });
});
