import { describe, it, expect } from 'vitest';
import { decideResult, regressionFloor, missingRegressionFindings, hasBasis, type MinimalCandidate } from '../packages/harness/src/verdict.js';
import type { Finding } from '../packages/shared/src/types.js';

/**
 * Lưới HỢP ĐỒNG CỦA VERDICT — capability `verdict-contract`.
 *
 * Chín điều định nghĩa verdict từng thi hành mà không có ca test nào. Nguy hiểm nhất: câu «có hồi quy thì
 * FAIL» KHÔNG được cưỡng chế ở chỗ tính `result` (nó chỉ nhìn finding mức `high`) mà ở HAI LƯỚI MÁY — ép
 * sàn severity, và bù finding khi model im lặng. Lưới này khoá cả hai, và nối chúng lại ở ca T3.x để
 * chứng minh đúng cái luật mà không hàm nào một mình chứng minh được.
 */

const f = (p: Partial<Finding> = {}): Finding =>
  ({ id: 'f1', skill: 'code', severity: 'medium', title_vi: 't', what_vi: 'w', consequence_vi: 'c', evidence: { type: 'quote', loc: 'x', quote: 'q', rule: 'r' }, ...p }) as Finding;

const uv = (p: Partial<MinimalCandidate> = {}): MinimalCandidate => ({
  ma: 'U1',
  trangThai: 'pass',
  probe: { id: 'P1', ten: 'probe 1', spec_rule: 'R1', muc_dich: 'kiểm X' },
  br: { message: 'AssertionError: expected 200 to be 404\n  at ...' },
  ...p,
});

describe('R-1 — verdict nhị phân, fail-closed với severity không đọc được', () => {
  it('[T1.1] một finding high giữa các medium → FAIL', () => {
    expect(decideResult([f(), f({ severity: 'high' }), f({ severity: 'low' })])).toBe('FAIL');
  });

  it('[T1.2] toàn medium/low, hoặc rỗng → PASS', () => {
    expect(decideResult([f(), f({ severity: 'low' })])).toBe('PASS');
    expect(decideResult([])).toBe('PASS');
  });

  it('[T1.3] severity đời cũ và giá trị lạ đi qua chuẩn hoá fail-closed', () => {
    // `blocking` là giá trị đời cũ; chuỗi rác là bản ghi hỏng. Cả hai KHÔNG được rơi về mức thấp.
    expect(decideResult([f({ severity: 'blocking' as never })])).toBe('FAIL');
    expect(decideResult([f({ severity: 'rác' as never })])).toBe('FAIL');
    expect(decideResult([f({ severity: undefined as never })])).toBe('FAIL');
    // `non_blocking` là medium đời cũ — có nghĩa xác định, không phải giá trị lạ
    expect(decideResult([f({ severity: 'non_blocking' as never })])).toBe('PASS');
  });

  it('[T1.4] danh sách finding méo KHÔNG được thành PASS', () => {
    // Không đọc được finding thì không chứng minh được gì — «không đọc được» ≠ «không có».
    for (const x of [null, undefined, 'PASS', 42, {}] as unknown[]) {
      expect(decideResult(x), `đầu vào ${JSON.stringify(x)} phải fail-closed`).toBe('FAIL');
    }
  });
});

describe('R-2 — sàn cứng cho hồi quy máy-xác-nhận', () => {
  it('[T1.5] model gán thấp cho hồi quy → ép về high', () => {
    expect(regressionFloor('hoi_quy', 'medium')).toBe('high');
    expect(regressionFloor('hoi_quy', 'low')).toBe('high');
    expect(regressionFloor('vi_pham_luat_moi', 'low')).toBe('high');
  });

  it('[T1.6] đã high thì không đổi gì', () => {
    expect(regressionFloor('hoi_quy', 'high')).toBe('high');
  });

  it('[T1.7] sàn KHÔNG lan sang nhãn khác — mức model giữ nguyên', () => {
    expect(regressionFloor('nghi_van', 'medium')).toBe('medium');
    expect(regressionFloor('pass', 'low')).toBe('low');
    expect(regressionFloor('ngoai_pham_vi', 'medium')).toBe('medium');
  });

  it('[T1.8] severity lạ: hồi quy → high; nhãn khác → high theo chuẩn hoá fail-closed, KHÔNG phải medium', () => {
    expect(regressionFloor('hoi_quy', 'rác')).toBe('high');
    expect(regressionFloor('nghi_van', 'rác')).toBe('high');
    expect(regressionFloor('nghi_van', undefined)).toBe('high');
  });
});

describe('R-2 — model bỏ sót hồi quy thì máy tự bù', () => {
  const hai = [uv({ ma: 'U1', trangThai: 'hoi_quy' }), uv({ ma: 'U2', trangThai: 'hoi_quy' })];

  it('[T1.9] model viết cho một, còn một → trả đúng ứng viên còn lại', () => {
    expect(missingRegressionFindings(hai, new Set(['U1'])).map((u) => u.ma)).toEqual(['U2']);
  });

  it('[T1.10] model viết đủ → không bù gì', () => {
    expect(missingRegressionFindings(hai, new Set(['U1', 'U2']))).toEqual([]);
  });

  it('[T1.11] chỉ hồi quy mới BẮT BUỘC có finding — nghi vấn model bỏ qua thì thôi', () => {
    const tron = [uv({ ma: 'U1', trangThai: 'hoi_quy' }), uv({ ma: 'U2', trangThai: 'nghi_van' })];
    expect(missingRegressionFindings(tron, new Set()).map((u) => u.ma)).toEqual(['U1']);
  });

  it('[T1.12] `maDaCo` rỗng hay méo → trả mọi hồi quy, không ném', () => {
    expect(missingRegressionFindings(hai, new Set()).map((u) => u.ma)).toEqual(['U1', 'U2']);
    for (const x of [null, undefined, 'U1', 42] as unknown[]) {
      expect(() => missingRegressionFindings(hai, x)).not.toThrow();
      expect(missingRegressionFindings(hai, x)).toHaveLength(2);
    }
    // mảng cũng nhận (không chỉ Set) — chỗ gọi đổi kiểu thì hàm không lặng lẽ bù thừa
    expect(missingRegressionFindings(hai, ['U1', 'U2'])).toEqual([]);
  });
});

describe('R-3 — PASS phải có bằng chứng', () => {
  it('[T1.13] mọi probe ngoài phạm vi → không đủ cơ sở, lý do nêu probe và thông điệp lỗi', () => {
    const ds = [
      uv({ ma: 'U1', trangThai: 'ngoai_pham_vi', probe: { id: 'P1' }, br: { message: "Cannot find module '../src/x.js'\n  at ..." } }),
      uv({ ma: 'U2', trangThai: 'nghi_loi_co_san', probe: { id: 'P2' }, br: { message: 'Cannot find module' } }),
    ];
    const r = hasBasis(ds);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.soProbe).toBe(2);
    expect(r.lyDo).toContain('P1 (ngoai_pham_vi)');
    expect(r.lyDo).toContain("Cannot find module '../src/x.js'");
    expect(r.lyDo, 'chỉ lấy DÒNG ĐẦU của thông điệp lỗi').not.toContain('  at ...');
  });

  it('[T1.14] bốn nhãn nói được điều gì đó về PR đều đủ cơ sở', () => {
    for (const nhan of ['pass', 'hoi_quy', 'vi_pham_luat_moi', 'cai_thien']) {
      const ds = [uv({ trangThai: 'ngoai_pham_vi' }), uv({ ma: 'U2', trangThai: nhan })];
      expect(hasBasis(ds).ok, `nhãn ${nhan} phải đủ cơ sở`).toBe(true);
    }
  });

  it('[T1.15] danh sách rỗng hoặc méo → KHÔNG đủ cơ sở, không ném', () => {
    expect(hasBasis([]).ok).toBe(false);
    for (const x of [null, undefined, 'P1', 42] as unknown[]) {
      expect(() => hasBasis(x as never)).not.toThrow();
      expect(hasBasis(x as never).ok).toBe(false);
    }
  });

  it('[T3.3 — án lệ TRẠNG THÁI HÚT] 8 probe import sai module, đỏ cả hai nhánh cùng nguyên nhân', () => {
    // Cả bộ probe bị dán `ngoai_pham_vi` rồi loại khỏi finding → verdict cũ sẽ ra PASS trên một lượt
    // không có lấy một phép thử chạy được. Đây là án lệ của luật này.
    const tam = Array.from({ length: 8 }, (_, i) =>
      uv({ ma: `U${i}`, trangThai: 'ngoai_pham_vi', probe: { id: `P${i}` }, br: { message: "Cannot find module '../src/gate.js'" } }),
    );
    expect(hasBasis(tam).ok).toBe(false);
    expect(decideResult([]), 'không finding nào → decideResult một mình sẽ nói PASS').toBe('PASS');
    // Chính vì thế `hasBasis` phải chặn TRƯỚC khi tới verdict — hai hàm gác hai chỗ khác nhau.
  });
});

describe('nối hai hàm: chứng minh «có hồi quy thì FAIL» (R1.12)', () => {
  it('[T3.1] model gán medium cho hồi quy → sàn cứng ép high → verdict FAIL', () => {
    const u = uv({ ma: 'U1', trangThai: 'hoi_quy' });
    const sev = regressionFloor(u.trangThai, 'medium');
    expect(decideResult([f({ severity: sev })])).toBe('FAIL');
    // Đối chứng: KHÔNG có sàn cứng thì đúng lượt đó ra PASS — đây là chỗ luật thật sự sống.
    expect(decideResult([f({ severity: 'medium' })])).toBe('PASS');
  });

  it('[T3.2] model im lặng → máy bù finding high → verdict FAIL', () => {
    const ds = [uv({ ma: 'U1', trangThai: 'hoi_quy' })];
    const thieu = missingRegressionFindings(ds, new Set());
    expect(thieu).toHaveLength(1);
    const buApp = thieu.map(() => f({ severity: 'high' }));
    expect(decideResult(buApp)).toBe('FAIL');
    // Đối chứng: model im lặng mà không bù thì danh sách rỗng → PASS.
    expect(decideResult([])).toBe('PASS');
  });
});
