import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';

/**
 * Bảng đường dẫn module trong `checkmate.yml` phải KHỚP với export thật của repo — cả hai chiều.
 *
 * Bảng đó là thứ model đọc để biết import cái gì từ đâu. Nó được khai bằng tay, và bốn lượt chấm đã
 * hỏng vì nó sai theo bốn kiểu khác nhau: thiếu một thư mục (`kho/`), không khai chữ ký hàm, khai tên
 * hàm ở nhầm file cộng một alias cục bộ, và — ca mới nhất — module mới thêm mà quên khai hẳn.
 *
 * Ba ca đầu là «tên đã khai nhưng sai». Ca thứ tư là «module có thật nhưng chưa khai» — chiều mà bản
 * đầu của lưới này không soi tới. Một lưới chỉ soi chiều mình nhớ soi thì bỏ đúng chiều kia.
 */

const GOC = resolve('.');
const YML = readFileSync(join(GOC, 'checkmate.yml'), 'utf8');

// Dòng bảng có dạng:  ../duong/dan/mod.js   → tenA · tenB · tenC
const DONG_BANG = /^\s*(\.\.\/[\w./-]+\.js)\s+→\s+(.+)$/gm;

/**
 * File KHÔNG cần khai trong bảng:
 *  · test và khai báo kiểu — model không import chúng để viết probe;
 *  · `server.ts` (điểm khởi động, probe không gọi trực tiếp), `paths.ts` (hằng số đường dẫn);
 *  · lớp dựng giao diện `ui*.ts` — probe kiểm hành vi, không kiểm HTML;
 *  · `apps/mcp/` — bề mặt khác, có hợp đồng riêng.
 */
const KHONG_CAN_KHAI =
  /\.(test|d)\.ts$|^apps\/web\/src\/(server|paths)\.ts$|^apps\/web\/src\/ui[\w-]*\.ts$|^apps\/mcp\/|(^|\/)cli[\w-]*\.ts$/;

function exportThat(fileTs: string): Set<string> {
  const src = readFileSync(fileTs, 'utf8');
  const ten = new Set<string>();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/gm)) {
    ten.add(m[1]);
  }
  // `export { a, b as c }` — tên xuất ra là tên SAU `as`
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const phan of m[1].split(',')) {
      const t = phan.trim().split(/\s+as\s+/).pop()?.trim();
      if (t) ten.add(t);
    }
  }
  return ten;
}

describe('bảng đường dẫn module trong checkmate.yml khớp export thật', () => {
  const dong = [...YML.matchAll(DONG_BANG)];

  it('bảng có tồn tại và không rỗng — model dựa vào nó để viết import', () => {
    expect(dong.length).toBeGreaterThan(5);
  });

  it('mọi file khai trong bảng đều có thật trong repo', () => {
    const thieu = dong
      .map(([, duong]) => duong)
      .filter((d) => !existsSync(join(GOC, d.replace(/^\.\.\//, '').replace(/\.js$/, '.ts'))));
    expect(thieu, `file khai trong bảng nhưng không có trong repo: ${thieu.join(', ')}`).toEqual([]);
  });

  it('mọi TÊN khai trong bảng đều là export thật của đúng file đó', () => {
    const sai: string[] = [];
    for (const [, duong, dsTen] of dong) {
      const fileTs = join(GOC, duong.replace(/^\.\.\//, '').replace(/\.js$/, '.ts'));
      if (!existsSync(fileTs)) continue;
      const that = exportThat(fileTs);
      for (const ten of dsTen.split('·').map((x) => x.trim()).filter(Boolean)) {
        if (!that.has(ten)) sai.push(`${duong} khai '${ten}' — file đó KHÔNG export tên này`);
      }
    }
    expect(sai, `\n${sai.join('\n')}`).toEqual([]);
  });

  it('module ĐÃ khai thì phải khai đủ HÀM của nó — chiều thứ ba, cũng đã lọt một lần', () => {
    // Ca thật: target.js đã có trong bảng với đúng `buildDiff`, rồi lát sau thêm extractRuleIds/findNewRules
    // mà không ai phải khai. Probe gọi vào, chết với «extractRuleIds is not a function», và lượt chấm biến
    // hai probe hỏng thành hai finding HIGH chặn merge với lời văn sai hẳn bản chất.
    //
    // Chỉ soi `export function` và `export class` — đó là thứ probe gọi. Hằng số và kiểu thì không bắt,
    // kẻo lưới nghiêm tới mức người ta khai cho xong thay vì khai cho đúng.
    const thieu: string[] = [];
    for (const [, duong, dsTen] of dong) {
      const tuongDoi = duong.replace(/^\.\.\//, '').replace(/\.js$/, '.ts');
      // Lớp dựng giao diện có mặt trong bảng vì vài hàm tiện ích (escHtml), nhưng probe kiểm hành vi
      // chứ không kiểm HTML — ép khai đủ mọi hàm dựng trang chỉ làm bảng phình mà không ai dùng.
      if (KHONG_CAN_KHAI.test(tuongDoi)) continue;
      const fileTs = join(GOC, tuongDoi);
      if (!existsSync(fileTs)) continue;
      const daKhaiTen = new Set(dsTen.split('·').map((x) => x.trim()).filter(Boolean));
      const src = readFileSync(fileTs, 'utf8');
      for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z0-9_]+)/gm)) {
        if (!daKhaiTen.has(m[1])) thieu.push(`${duong} chưa khai hàm '${m[1]}'`);
      }
    }
    expect(thieu, `\n${thieu.join('\n')}`).toEqual([]);
  });

  it('module sản phẩm mới thêm PHẢI được khai vào bảng — chiều mà lưới bản đầu không soi', () => {
    // Ca thật: lát L3 thêm danh-tinh.ts nhưng quên khai. Model đoán đường import, probe chết với
    // «requireGateRole is not a function» dù hàm đó có export thật — mất một probe của cả lượt chấm.
    const daKhai = new Set(dong.map(([, d]) => d.replace(/^\.\.\//, '')));
    const dsFile = execSync('git ls-files "apps/web/src/*.ts" "apps/web/src/kho/*.ts" "packages/harness/src/*.ts"', {
      cwd: GOC,
      encoding: 'utf8',
    })
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    const thieu = dsFile.filter((f) => !KHONG_CAN_KHAI.test(f)).filter((f) => !daKhai.has(f.replace(/\.ts$/, '.js')));
    expect(thieu, `module chưa khai trong bảng checkmate.yml: ${thieu.join(', ')}`).toEqual([]);
  });
});
