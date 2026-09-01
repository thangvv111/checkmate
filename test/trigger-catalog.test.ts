import { describe, it, expect, vi, afterEach } from 'vitest';
import { TRIGGER_CATALOG, laTriggerHopLe, tapKichHoat, timTrigger } from '../packages/harness/src/trigger-catalog.js';
import { KHO_KHUON, VI_DU_MOI_TRIGGER, triThucTheoTrigger } from '../packages/harness/src/khuon-loi.js';
import { chuanOdcQualifier, chuanOdcType, chuanMuc } from '../packages/shared/src/types.js';

/**
 * Bộ trục phân loại code (nền ODC — IBM, IEEE TSE 1992).
 *
 * Bốn trục trực giao, mỗi trục một câu hỏi: TRIGGER «cách nào làm lộ lỗi» (thuộc probe) · nhãn máy
 * R1 «probe đỏ ở nhánh nào» · ODC TYPE «lỗi là gì» (thuộc finding) · SEVERITY «chặn merge không».
 * File này khoá trục 1 và 3; hai trục kia đã có lưới riêng.
 */

afterEach(() => vi.restoreAllMocks());

describe('danh mục trigger — bộ ĐÓNG có kỷ luật', () => {
  it('mã nào cũng có định nghĩa + ranh giới, và không trùng nhau', () => {
    // Khoá KỶ LUẬT chứ không khoá CON SỐ: danh mục mở rộng được, nhưng mã mới phải mang đủ hướng
    // dẫn (phát vào prompt) và ranh giới (chống lẫn với mã cạnh) — đó mới là thứ ngăn quay về kho
    // phẳng tự phình. Ca này đỏ khi ai đó thêm mã cho có.
    const id = TRIGGER_CATALOG.map((t) => t.id);
    expect(new Set(id).size, 'mã trigger trùng nhau').toBe(id.length);
    for (const t of TRIGGER_CATALOG) {
      expect(t.huong_dan.trim().length, `${t.id} thiếu hướng dẫn`).toBeGreaterThan(30);
      expect(t.ranh_gioi.trim().length, `${t.id} thiếu ranh giới với mã cạnh`).toBeGreaterThan(20);
      expect(t.odc.trim().length, `${t.id} thiếu gốc ODC — mất đường truy về tài liệu nguồn`).toBeGreaterThan(3);
    }
  });

  it('laTriggerHopLe là cửa validate DUY NHẤT, chịu được đầu vào rác', () => {
    expect(laTriggerHopLe('variation')).toBe(true);
    for (const rac of [undefined, null, 42, {}, [], '', ' variation ', 'VARIATION', 'sang_tao_moi']) {
      expect(laTriggerHopLe(rac), `nhận nhầm ${String(rac)}`).toBe(false);
    }
    expect(timTrigger('khong_co')).toBeUndefined();
  });
});

describe('tập kích hoạt per-repo — số lượng linh hoạt, không phải hằng kiến trúc', () => {
  it('vắng khai = TOÀN danh mục (mặc định không đòi ai cấu hình)', () => {
    expect(tapKichHoat()).toHaveLength(TRIGGER_CATALOG.length);
    expect(tapKichHoat([])).toHaveLength(TRIGGER_CATALOG.length);
  });

  it('repo bật 2 mã thì phát đúng 2 — repo cần ít không bị ép nhận cả danh mục', () => {
    const t = tapKichHoat(['coverage', 'variation']);
    expect(t.map((x) => x.id)).toEqual(['coverage', 'variation']);
  });

  it('mã lạ bị BỎ QUA + nói ra, mã hợp lệ vẫn chạy — gõ nhầm không giết lượt chấm', () => {
    const loi = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = tapKichHoat(['coverage', 'go_nham_ma', 'sequencing']);
    expect(t.map((x) => x.id)).toEqual(['coverage', 'sequencing']);
    expect(loi.mock.calls.flat().join(' ')).toContain('go_nham_ma');
  });

  it('khai TOÀN mã lạ thì rơi về toàn danh mục, KHÔNG phát rỗng', () => {
    // Rơi về rỗng là làm lượt chấm mù mà nhìn vẫn bình thường — cùng họ với «khai dữ liệu không đọc
    // được thành bằng không» mà cổng đã bắt ba lần.
    const loi = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(tapKichHoat(['sai_het', 'cung_sai'])).toHaveLength(TRIGGER_CATALOG.length);
    expect(loi.mock.calls.flat().join(' ')).toMatch(/toàn danh mục|mù/i);
  });
});

describe('ví dụ án lệ trực thuộc trigger — có trần và đào thải', () => {
  it('mọi ví dụ code trong kho đều thuộc một trigger có thật', () => {
    for (const k of KHO_KHUON.filter((x) => x.loai === 'code')) {
      expect(laTriggerHopLe(k.trigger), `${k.id} mồ côi: trigger=${String(k.trigger)}`).toBe(true);
    }
  });

  it('mỗi trigger phát tối đa N ví dụ; vượt thì rời TẬP PHÁT nhưng vẫn ở trong kho', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const nhom = triThucTheoTrigger('spec có luật về quyền và http và validate đầu vào');
    for (const n of nhom) {
      expect(n.vi_du.length, `${n.trigger.id} vượt trần ví dụ`).toBeLessThanOrEqual(VI_DU_MOI_TRIGGER);
    }
    // kho KHÔNG bị cắt — đào thải chỉ áp lên tập phát vào prompt
    expect(KHO_KHUON.filter((k) => k.loai === 'code').length).toBeGreaterThan(VI_DU_MOI_TRIGGER);
    log.mockRestore();
  });

  it('trigger CHƯA có ví dụ nào vẫn được phát — đó là cách vùng mù cũ bắt đầu được soi', () => {
    // `sequencing` trống hoàn toàn trong 17 khuôn đời trước. Nếu chỉ phát trigger-có-ví-dụ thì vùng
    // mù tự duy trì vĩnh viễn: không ví dụ ⇒ không phát ⇒ không probe ⇒ không án lệ ⇒ không ví dụ.
    const nhom = triThucTheoTrigger('spec bất kỳ');
    const seq = nhom.find((n) => n.trigger.id === 'sequencing');
    expect(seq, 'sequencing phải có mặt trong tập phát').toBeDefined();
    expect(seq?.trigger.huong_dan.length).toBeGreaterThan(30);
  });

  it('tập kích hoạt hẹp thì chỉ phát bấy nhiêu nhóm', () => {
    const nhom = triThucTheoTrigger('spec bất kỳ', ['recovery_exception']);
    expect(nhom).toHaveLength(1);
    expect(nhom[0].trigger.id).toBe('recovery_exception');
  });
});

describe('trục phân loại finding — telemetry, KHÔNG có quyền chặn', () => {
  it('bảy defect type + ba qualifier nhận đúng, giá trị lạ về unknown', () => {
    for (const t of ['assignment_init', 'checking', 'algorithm_method', 'function_class', 'timing_serialization', 'interface_messages', 'relationship']) {
      expect(chuanOdcType(t)).toBe(t);
    }
    expect(chuanOdcType('CHECKING')).toBe('checking'); // hoa/thường không phải lý do vứt dữ liệu
    for (const rac of ['sieu_loi', '', undefined, null, 42, {}, []]) expect(chuanOdcType(rac)).toBe('unknown');
    for (const q of ['missing', 'incorrect', 'extraneous']) expect(chuanOdcQualifier(q)).toBe(q);
    for (const rac of ['thieu', undefined, 7]) expect(chuanOdcQualifier(rac)).toBe('unknown');
  });

  it('BẤT ĐỐI XỨNG CÓ CHỦ ĐÍCH: severity lạ fail-closed về high, telemetry lạ về unknown', () => {
    // Trục gác cổng phải nghiêng về NẶNG khi không hiểu; trục telemetry thì không — cho nó quyền
    // đổi verdict là mở đường lách «bịa phân loại khéo thì merge được».
    expect(chuanMuc('gia_tri_la')).toBe('high');
    expect(chuanOdcType('gia_tri_la')).toBe('unknown');
    expect(chuanOdcQualifier('gia_tri_la')).toBe('unknown');
  });
});
