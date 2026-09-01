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
