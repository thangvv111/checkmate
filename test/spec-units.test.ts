import { describe, it, expect } from 'vitest';
import { splitSpecUnits, splitAllSpecUnits, resolveRule, findNewUnits, refHitsNew, MAX_UNIT_DEPTH } from '../packages/harness/src/spec-units.js';

/**
 * Lưới canh ĐƠN VỊ LUẬT — thứ engine thật sự cần từ spec.
 *
 * Bản trước ép «luật = mã ngắn R4.21». Repo không đánh mã thì neo probe, tìm luật mới và độ phủ đều
 * lặng lẽ vô nghĩa, trong khi cổng vẫn ra verdict trông y như thật. Lưới này canh hai chiều: spec
 * KHÔNG mã vẫn có đơn vị; spec CÓ mã thì mã vẫn neo đúng — thiếu vế sau, một bản «bỏ hẳn đường mã»
 * cũng xanh, và cả thư viện probe cũ mất neo.
 */

const KHONG_MA = `# Phê duyệt đề xuất

## Ngưỡng theo vai
Chuyên viên duyệt tối đa 500 triệu. Bằng đúng mức trần vẫn hợp lệ.

## Người duyệt khác người tạo
Người tạo đề xuất không được tự duyệt, kể cả giám đốc.

### Ngoại lệ khẩn
Chỉ khi có xác nhận bằng văn bản.

#### Ghi chú sâu
Không mở đơn vị mới.
`;

const CO_MA = `# Spec — Phê duyệt

## R1 — Ngưỡng phê duyệt theo vai (biên ĐÓNG)
Số tiền bằng đúng trần PHẢI hợp lệ.

## R2 — Người duyệt khác người tạo
- **R2.1** Người tạo không tự duyệt.
- **R2.2** Giám đốc cũng không.
`;

describe('chia spec thành đơn vị có địa chỉ', () => {
  it('spec KHÔNG mã nào vẫn ra đơn vị, địa chỉ là đường tiêu đề', () => {
    const u = splitSpecUnits('specs/duyet.md', KHONG_MA);
    expect(u.map((x) => x.address)).toEqual([
      'Phê duyệt đề xuất',
      'Phê duyệt đề xuất › Ngưỡng theo vai',
      'Phê duyệt đề xuất › Người duyệt khác người tạo',
      'Phê duyệt đề xuất › Người duyệt khác người tạo › Ngoại lệ khẩn',
    ]);
    expect(u.every((x) => x.code === undefined)).toBe(true);
  });

  it('tiêu đề sâu hơn trần KHÔNG mở đơn vị mới — nằm trong thân đơn vị cha', () => {
    const u = splitSpecUnits('a.md', KHONG_MA, MAX_UNIT_DEPTH);
    const cha = u.find((x) => x.address.endsWith('Ngoại lệ khẩn'))!;
    expect(cha.body).toContain('Ghi chú sâu');
    expect(u.some((x) => x.address.includes('Ghi chú sâu'))).toBe(false);
  });

  it('vế đối chứng: spec CÓ mã → mã ở đầu tiêu đề thành `code`, mã trong list item vào `codes`', () => {
    const u = splitSpecUnits('specs/spec-phe-duyet.md', CO_MA);
    const r2 = u.find((x) => x.code === 'R2')!;
    expect(r2).toBeDefined();
    expect(r2.address).toBe('Spec — Phê duyệt › R2 — Người duyệt khác người tạo');
    expect(r2.codes).toEqual(expect.arrayContaining(['R2.1', 'R2.2']));
  });

  it('file không có tiêu đề nào → cả file là một đơn vị, địa chỉ là tên file', () => {
    const u = splitSpecUnits('docs/ghi-chu.txt', 'Chỉ một đoạn văn thuần.\nKhông tiêu đề.');
    expect(u).toHaveLength(1);
    expect(u[0]!.address).toBe('ghi-chu.txt');
  });

  it('hai mục cùng tên không đè nhau — địa chỉ được đánh số', () => {
    const u = splitSpecUnits('a.md', '## Lỗi\nmột\n## Lỗi\nhai');
    expect(u.map((x) => x.address)).toEqual(['Lỗi', 'Lỗi#2']);
  });

  it('mã ngắn nhiều kiểu đều nhận: R4.21 · US-12 · AC3 · FR-7.2', () => {
    const u = splitSpecUnits('a.md', '## R4.21 a\n## US-12 b\n## AC3 c\n## FR-7.2 d');
    expect(u.map((x) => x.code)).toEqual(['R4.21', 'US-12', 'AC3', 'FR-7.2']);
  });
});

describe('probe neo vào đơn vị', () => {
  const uKhongMa = splitSpecUnits('a.md', KHONG_MA);
  const uCoMa = splitSpecUnits('b.md', CO_MA);

  it('probe khai theo CHỮ neo vào đơn vị có địa chỉ chứa chữ đó', () => {
    const r = resolveRule('Ngưỡng theo vai', uKhongMa);
    expect(r.map((x) => x.address)).toEqual(['Phê duyệt đề xuất › Ngưỡng theo vai']);
  });

  it('probe khai theo MÃ neo vào đơn vị mang mã — kể cả mã cha (R2 → R2.x) và mã trong list item (R2.1)', () => {
    expect(resolveRule('R2', uCoMa).map((x) => x.code)).toEqual(['R2']);
    expect(resolveRule('R2.1', uCoMa).map((x) => x.code)).toEqual(['R2']);
  });

  it('spec_rule ghép «R1+R2» hay «R1, R2» neo vào cả hai', () => {
    expect(resolveRule('R1+R2', uCoMa)).toHaveLength(2);
    expect(resolveRule('R1, R2', uCoMa)).toHaveLength(2);
  });

  it('vế không khớp gì thì bỏ qua, không ném — probe khai lỏng không được làm sập lượt', () => {
    expect(() => resolveRule('R99+Không có mục này', uCoMa)).not.toThrow();
    expect(resolveRule('R99', uCoMa)).toEqual([]);
    expect(resolveRule(undefined, uCoMa)).toEqual([]);
  });
});

describe('luật mới — so theo đơn vị, không so theo mã', () => {
  it('nhánh PR thêm một mục KHÔNG mã → là luật mới', () => {
    const base = splitSpecUnits('a.md', '## Ngưỡng\nx');
    const pr = splitSpecUnits('a.md', '## Ngưỡng\nx\n## Hạn mức khẩn\ny');
    expect(findNewUnits(pr, base)).toEqual(['Hạn mức khẩn']);
  });

  it('thêm một mục con dạng list item VÀO khối có sẵn → mã con là luật mới (không lọt)', () => {
    // Chỉ so địa chỉ thì ca này LỌT — bỏ sót là hướng nguy hiểm: PR khai luật rồi vi phạm ngay.
    const base = splitSpecUnits('a.md', '## R2 — Duyệt\n- **R2.1** a');
    const pr = splitSpecUnits('a.md', '## R2 — Duyệt\n- **R2.1** a\n- **R2.2** b');
    expect(findNewUnits(pr, base)).toEqual(['R2.2']);
  });

  it('vế đối chứng: sửa chính tả trong khối có sẵn → KHÔNG luật mới nào — chặn oan là hướng còn lại', () => {
    const base = splitSpecUnits('a.md', '## R2 — Duyệt\n- **R2.1** nguoi tao khong tu duyet');
    const pr = splitSpecUnits('a.md', '## R2 — Duyệt\n- **R2.1** người tạo không tự duyệt');
    expect(findNewUnits(pr, base)).toEqual([]);
  });

  it('refHitsNew: mã cha mới phủ probe neo mã con, chiều ngược lại thì KHÔNG (luật cũ giữ nguyên)', () => {
    expect(refHitsNew('R9.4', ['R9'])).toBe(true);
    expect(refHitsNew('R1', ['R1.18'])).toBe(false);
    expect(refHitsNew('Hạn mức khẩn', ['Phê duyệt › Hạn mức khẩn'])).toBe(true);
    expect(refHitsNew(undefined, ['R9'])).toBe(false);
  });
});

describe('demo-credit-approval vẫn đọc được — hệ quả, không phải mục tiêu', () => {
  it('spec kiểu «## R1 — …» cho ra đúng số đơn vị bằng số mã như trước', () => {
    const u = splitAllSpecUnits([{ file: 'specs/x.md', noiDung: CO_MA }]);
    expect(u.filter((x) => x.code).map((x) => x.code)).toEqual(['R1', 'R2']);
  });
});

describe('đơn vị KHÔNG địa chỉ không phải đơn vị', () => {
  it('văn bản không tên file, không tiêu đề → không đơn vị nào; nó không được thành «luật mới» chặn merge', () => {
    // Án lệ: findNewRules với [{ noiDung: 5 }] từng đẻ ra một đơn vị địa chỉ rỗng rồi coi nó là mới.
    expect(splitSpecUnits('', '5')).toEqual([]);
    expect(splitAllSpecUnits([{ file: '', noiDung: 'một mẩu vô danh' }])).toEqual([]);
  });
});
