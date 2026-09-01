import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { docReviewCfg, docRunnerCfg } from '../packages/harness/src/runner.js';
import { timLuatMoi } from '../packages/harness/src/target.js';
import { phanLoaiMay } from '../packages/harness/src/skill-code.js';

/**
 * Bốn quan sát «ngoài phạm vi PR» của cổng trên PR #20 — PO chốt 01/09 xử luôn trong change này.
 *
 * «Ngoài phạm vi» nghĩa là probe đỏ trên CẢ HAI nhánh: hoặc probe sai contract, hoặc LỖI CÓ SẴN của
 * repo. Máy cố ý không dám kết luận cái nào — nên phải tái lập từng cái rồi mới phán. Kết quả tái
 * lập: P8 và P10 là lỗi thật, P6 là chỗ thiếu lưới, P4 thì engine vốn đã đúng.
 */

const tam = (noiDung: string): string => {
  const d = mkdtempSync(join(tmpdir(), 'checkmate-qs-'));
  writeFileSync(join(d, 'checkmate.yml'), noiDung, 'utf8');
  return d;
};

describe('P8 — checkmate.yml sai cú pháp phải FAIL-SAFE về null, không ném (R2.12)', () => {
  it('cả hai cửa đọc hợp đồng đều rơi về null với YAML hỏng — không cửa nào được ném', () => {
    // Lỗi THẬT: docReviewCfg đã gác đúng từ lâu, docRunnerCfg thì không — hợp đồng repo đích sai một
    // dấu nháy là cả lượt chấm chết ở bước đọc, thay vì rơi về đường vitest mặc định như luật khai.
    const d = tam('runner:\n  test_cmd: ["npx vitest run\nreview:\n  khuon_loi: ["thiếu đóng\n');
    try {
      expect(() => docRunnerCfg(d)).not.toThrow();
      expect(docRunnerCfg(d)).toBeNull();
      expect(() => docReviewCfg(d)).not.toThrow();
      expect(docReviewCfg(d)).toBeNull();
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it('YAML đúng cú pháp vẫn đọc được bình thường — lưới không nuốt cấu hình thật', () => {
    const d = tam('runner:\n  test_cmd: npx vitest run\n  framework: vitest\n');
    try {
      expect(docRunnerCfg(d)?.test_cmd).toBe('npx vitest run');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

describe('P8 vòng sáu — CẢ HAI cửa phải NÓI RA khi hợp đồng hỏng, không nuốt im lặng', () => {
  it('docReviewCfg cũng phát thông điệp như docRunnerCfg', () => {
    // Vá một nửa: docRunnerCfg có console.error còn docReviewCfg chỉ trả null lặng lẽ — người vận
    // hành không biết hợp đồng đang hỏng, lượt chấm cứ chạy như thể mọi thứ ổn.
    const d = tam('review:\n  khuon_loi: [\"thiếu đóng\n');
    const goc = console.error;
    let dem = 0;
    console.error = () => {
      dem++;
    };
    try {
      expect(docReviewCfg(d)).toBeNull();
      expect(dem, 'cửa review phải nói ra như cửa runner').toBeGreaterThan(0);
    } finally {
      console.error = goc;
      rmSync(d, { recursive: true, force: true });
    }
  });
});

describe('P6 — timLuatMoi chịu được danh sách spec méo, không ném', () => {
  it('khuyết / không phải mảng / phần tử lạ đều rơi về «không có luật mới»', () => {
    // Hàm nằm trên đường quyết định nhãn `vi_pham_luat_moi`; ném ở đây là cả lượt chấm chết thay vì
    // rơi về hướng an toàn (không quy tội PR).
    for (const x of [undefined, null, 'chuoi', 123, [null], [{ file: 'a' }], [{ noiDung: 5 }]]) {
      expect(() => timLuatMoi('.', 'main', x as never), `${JSON.stringify(x)}`).not.toThrow();
      expect(timLuatMoi('.', 'main', x as never)).toEqual([]);
    }
  });
});

describe('vòng bảy — ÉP KIỂU thay vì NUỐT dữ liệu spec', () => {
  it('noiDung ở dạng object/Buffer vẫn trích được mã luật, không bị biến thành rỗng', () => {
    // Vá «không ném» bằng cách đánh rơi dữ liệu thật: bản trước biến mọi thứ không-phải-string
    // thành '' nên mã luật biến mất cùng nhãn chặn merge.
    const nhu = { toString: () => 'R99 — luật thử' };
    expect(() => timLuatMoi('.', 'main', [{ file: 'specs/R99.md', noiDung: nhu }] as never)).not.toThrow();
  });
});

describe('P6 vòng bảy — mẫu bo_qua_diff sai cú pháp bị bỏ, không làm sập lượt chấm', () => {
  it('mẫu regex hỏng bị loại ngay tại cửa đọc, mẫu đúng vẫn giữ', () => {
    const d = tam('runner:\n  test_cmd: npx vitest run\nreview:\n  bo_qua_diff: ["[[", "lock"]\n');
    try {
      expect(docReviewCfg(d)?.bo_qua_diff).toEqual(['lock']);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

describe('P4 — đỏ ở nhánh PR mà THIẾU đối chứng KHÔNG được phong hồi quy (R1.5, R1.14)', () => {
  it('engine vốn đã đúng: không có kết quả nhánh gốc thì nhãn là nghi_van, không phải hoi_quy', () => {
    // Tái lập cho thấy KHÔNG có lỗi để sửa — ghi lại ca này để lần sau không ai phải tái lập lần nữa.
    const do_ = { title: 't', status: 'failed' as const, message: 'lỗi X', file: 'f' };
    expect(phanLoaiMay(do_, undefined)).toBe('nghi_van');
    expect(phanLoaiMay(do_, { ...do_, status: 'passed' as const })).toBe('hoi_quy');
    expect(phanLoaiMay(undefined, undefined)).toBe('khong_chay');
  });
});
