import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Lưới khoá M11 — MỘT nguồn duy nhất cho gốc dữ liệu.
 *
 * Trước khi vá, bốn module tự dựng gốc theo BA cách khác nhau:
 *   packages/shared/src/paths.ts  CHECKMATE_GOC ? resolve(env) : resolve('.')   <- nguồn chuẩn
 *   apps/web/src/config.ts        CHECKMATE_GOC ?? resolve('.')                 <- KHÔNG resolve env
 *   apps/web/src/secret-vault.ts  CHECKMATE_GOC ?? resolve('.')                 <- KHÔNG resolve env
 *   apps/web/src/provider.ts      resolve('.')                                  <- BỎ QUA env hẳn
 *
 * Hai hệ quả đo được:
 *  1. `provider.ts` bỏ qua env nên `.ncc-verify.json` luôn rơi vào gốc repo THẬT, kể cả khi test
 *     trỏ gốc riêng — mọi file test dùng sổ kiểm ghi đè lên nhau, và suite đỏ ngẫu nhiên (M11).
 *  2. Hai chỗ «không resolve env» lệch với nguồn chuẩn khi ai đó đặt đường TƯƠNG ĐỐI:
 *     `CHECKMATE_GOC=./tmp` cho paths.ts một đường tuyệt đối, cho hai chỗ kia một đường tương đối
 *     phụ thuộc cwd lúc join. Cùng một biến, ba nghĩa.
 *
 * Đây đúng là khuôn «cửa song sinh» ở tầng hằng số, và cũng đúng thứ kiến trúc tầng khai: tầng nền
 * giữ nguồn chung, mọi tầng trên dùng nó chứ không tự dựng lại.
 */

const GOC_REPO = resolve('.');

function dsFileTs(thuMuc: string): string[] {
  const ra: string[] = [];
  const di = (d: string): void => {
    for (const ten of readdirSync(d)) {
      const p = join(d, ten);
      if (statSync(p).isDirectory()) di(p);
      else if (ten.endsWith('.ts')) ra.push(p);
    }
  };
  di(thuMuc);
  return ra;
}

describe('gốc dữ liệu có ĐÚNG MỘT nguồn (M11)', () => {
  it('chỉ paths.ts được tự dựng gốc — không module nào khác đọc CHECKMATE_GOC hay resolve(.)', () => {
    const pham: string[] = [];
    for (const f of [...dsFileTs(join(GOC_REPO, 'apps')), ...dsFileTs(join(GOC_REPO, 'packages'))]) {
      const ten = f.replace(/\\/g, '/');
      if (ten.endsWith('/packages/shared/src/paths.ts')) continue; // nguồn chuẩn, được phép
      const s = readFileSync(f, 'utf8');
      // `resolve('.')` = tự dựng gốc từ cwd; `CHECKMATE_GOC` = tự đọc biến gốc.
      if (/resolve\(\s*['"]\.['"]\s*\)/.test(s)) pham.push(`${ten}: tự dựng gốc bằng resolve('.')`);
      // Bắt việc ĐỌC biến, không bắt việc NHẮC TÊN: một comment giải thích neo dữ liệu là tài liệu
      // có ích, chặn nó là lưới báo oan — và lưới báo oan thì người ta tắt, chứ không sửa code.
      if (/process\.env(\.CHECKMATE_GOC|\[['"]CHECKMATE_GOC['"]\])/.test(s)) {
        pham.push(`${ten}: tự đọc CHECKMATE_GOC`);
      }
    }
    expect(pham, 'gốc dữ liệu phải lấy từ packages/shared/src/paths.ts, không tự dựng lại').toEqual([]);
  });

  it('nguồn chuẩn RESOLVE biến môi trường, không dùng thô', async () => {
    // Đây là điểm lệch thật giữa ba cách cũ: `?? resolve('.')` giữ nguyên giá trị env, nên
    // `CHECKMATE_GOC=./tmp` cho ra đường TƯƠNG ĐỐI — join sau đó phụ thuộc cwd.
    const s = readFileSync(join(GOC_REPO, 'packages/shared/src/paths.ts'), 'utf8');
    expect(s).toMatch(/resolve\(\s*process\.env\.CHECKMATE_GOC\s*\)/);
  });

  it('ba module từng lệch nay đều import GOC từ tầng nền', () => {
    for (const f of ['apps/web/src/provider.ts', 'apps/web/src/config.ts', 'apps/web/src/secret-vault.ts']) {
      const s = readFileSync(join(GOC_REPO, f), 'utf8');
      expect(s, `${f} phải lấy GOC từ tầng nền`).toMatch(/import \{ GOC \} from '.*packages\/shared\/src\/paths\.js'/);
    }
  });
});
