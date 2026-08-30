import { describe, it, expect } from 'vitest';
import { phanLoaiMay, vanTayLoi, vanTayChat, khopIdProbe, laLuatMoi, coVeLaProbeHong } from '../packages/harness/src/skill-code.js';
import type { KetQuaProbe } from '../packages/harness/src/sandbox.js';

// Lưới test cho TẦNG MÁY của skill code (specs/R1-phan-loai-probe.md).
// Đây là chỗ nguy hiểm nhất trong toàn hệ: sai một nhánh ở đây là verdict sai mà không ai thấy,
// vì model không được phép tự giác luật phân loại — nó chỉ nhận nhãn máy đã dán.

const probe = (status: KetQuaProbe['status'], message = ''): KetQuaProbe => ({
  title: 'P1: thử',
  status,
  message,
  file: 'checker.probe.test.ts',
});

describe('phanLoaiMay — bảng chân trị đối chứng hai nhánh', () => {
  it('không có kết quả nhánh PR thì là khong_chay, không được suy đoán', () => {
    expect(phanLoaiMay(undefined, probe('passed'))).toBe('khong_chay');
  });

  it('probe bị skip KHÔNG được tính pass (lách lưới bằng it.skip)', () => {
    expect(phanLoaiMay(probe('skipped'), probe('passed'))).toBe('bo_qua');
  });

  it('xanh cả hai nhánh là pass', () => {
    expect(phanLoaiMay(probe('passed'), probe('passed'))).toBe('pass');
  });

  it('nhánh gốc đỏ mà PR xanh là cai_thien — PR sửa được lỗi cũ', () => {
    expect(phanLoaiMay(probe('passed'), probe('failed', 'expected 500 to be 200'))).toBe('cai_thien');
  });

  it('PR đỏ mà gốc xanh là hoi_quy — bằng chứng đủ để chặn merge', () => {
    expect(phanLoaiMay(probe('failed', 'expected 500 to be 200'), probe('passed'))).toBe('hoi_quy');
  });

  it('PR đỏ nhưng KHÔNG có dữ liệu đối chứng thì chỉ là nghi_van, không được phong hồi quy', () => {
    expect(phanLoaiMay(probe('failed', 'expected 500 to be 200'), undefined)).toBe('nghi_van');
  });

  it('đỏ cả hai nhánh cùng nguyên nhân là ngoai_pham_vi — không quy tội PR, cũng không kết luận probe hỏng', () => {
    const msg = 'TypeError: cannot read property id of undefined';
    expect(phanLoaiMay(probe('failed', msg), probe('failed', msg))).toBe('ngoai_pham_vi');
  });

  it('đỏ hai nhánh nhưng khác status code thì là nghi_van — vân tay thô trùng KHÔNG đủ để loại', () => {
    // Cả hai gột số về "expected # to be #", nhưng 500 ≠ 404 nên nguyên nhân có thể khác nhau.
    expect(phanLoaiMay(probe('failed', 'expected 500 to be 200'), probe('failed', 'expected 404 to be 200'))).toBe('nghi_van');
  });

  it('đỏ hai nhánh khác hẳn thông điệp thì đẩy cho model phân xử', () => {
    expect(phanLoaiMay(probe('failed', 'timeout waiting for server'), probe('failed', 'assertion failed on role'))).toBe('nghi_van');
  });
});

describe('khopIdProbe — nối id probe với tên testcase bộ chạy trả về', () => {
  it('nhận dạng vitest reporter json', () => {
    expect(khopIdProbe('P1: người ngoài chi nhánh không xem được đơn', 'P1')).toBe(true);
  });

  it('nhận dạng pytest/junit có tiền tố test_', () => {
    expect(khopIdProbe('test_P2_khong_vuot_quyen', 'P2')).toBe(true);
  });

  it('nhận dạng JUnit XML có tên describe/class ghép phía trước', () => {
    expect(khopIdProbe('cổng phê duyệt > P3: hạn mức vượt trần bị chặn', 'P3')).toBe(true);
    expect(khopIdProbe('CheckerProbeTest > test_P4_bien_dong', 'P4')).toBe(true);
  });

  it('P1 KHÔNG được nuốt kết quả của P10 — chạy từ 10 probe trở lên là dính', () => {
    expect(khopIdProbe('P10: hạn mức biên', 'P1')).toBe(false);
    expect(khopIdProbe('nhóm > P12: xxx', 'P1')).toBe(false);
    expect(khopIdProbe('P10: hạn mức biên', 'P10')).toBe(true);
  });

  it('id không có trong tên thì không khớp', () => {
    expect(khopIdProbe('P2: chuyện khác', 'P1')).toBe(false);
  });
});

describe('vân tay lỗi hai tầng', () => {
  it('vân tay thô gột id/hex/số nên hai lần chạy khác dữ liệu vẫn cùng vân tay', () => {
    expect(vanTayLoi('User 1042 not found (req 9af3c21bd)')).toBe(vanTayLoi('User 77 not found (req 41bc09eef)'));
  });

  it('vân tay thô chỉ lấy dòng đầu — stack trace phía dưới không làm lệch', () => {
    expect(vanTayLoi('boom\n  at foo.ts:12\n  at bar.ts:44')).toBe(vanTayLoi('boom\n  at khac.ts:99'));
  });

  it('vân tay chặt GIỮ số ngắn nên phân biệt được 500 với 404', () => {
    expect(vanTayChat('expected 500 to be 200')).not.toBe(vanTayChat('expected 404 to be 200'));
  });

  it('vân tay chặt vẫn gột thời lượng ms và id dài — thứ đổi giữa hai lần chạy', () => {
    expect(vanTayChat('timeout after 5000 ms')).toBe(vanTayChat('timeout after 6200 ms'));
    expect(vanTayChat('order 100493827 rejected')).toBe(vanTayChat('order 200114558 rejected'));
  });
});

describe('luật CHỈ có ở nhánh PR (R1.17–R1.20)', () => {
  const p = (status: 'passed' | 'failed', message = '') => ({ file: 'f', title: 'P1: x', status, message }) as never;

  it('probe neo luật MỚI mà đỏ ở nhánh PR thì CHẶN, dù cũng đỏ ở nhánh gốc', () => {
    // Ca đo được: cùng một luật và cùng dòng code hỏng. Lượt có luật sẵn ở gốc ra FAIL; lượt mà PR mang
    // cả luật lẫn code thì probe bị dán ngoai_pham_vi và verdict ra PASS — bằng chứng nằm sẵn trong tay
    // máy mà cổng vẫn xanh.
    const cung = 'expected 200 to be 422';
    expect(phanLoaiMay(p('failed', cung), p('failed', cung), false)).toBe('ngoai_pham_vi');
    expect(phanLoaiMay(p('failed', cung), p('failed', cung), true)).toBe('vi_pham_luat_moi');
  });

  it('luật mới mà probe XANH ở nhánh PR thì vẫn là pass — luật mới không tự nó thành lỗi', () => {
    expect(phanLoaiMay(p('passed'), p('failed', 'x'), true)).toBe('cai_thien');
    expect(phanLoaiMay(p('passed'), p('passed'), true)).toBe('pass');
  });

  it('probe bị skip vẫn là bo_qua, luật mới không được lấn lưới chống lách', () => {
    expect(phanLoaiMay({ file: 'f', title: 'P1: x', status: 'skipped', message: '' } as never, undefined, true)).toBe('bo_qua');
  });
});

describe('nhận diện probe neo vào luật mới', () => {
  it('khớp cả khi model khai mã cha hoặc mã con', () => {
    expect(laLuatMoi('R9', ['R9'])).toBe(true);
    expect(laLuatMoi('R9.4', ['R9'])).toBe(true);   // luật mới cả cụm R9 thì phủ mục con
    // Chiều ngược lại KHÔNG đúng, và lượt chấm thứ ba đã bác giả định ban đầu: một mục con mới không
    // làm cả họ mã cha thành mới, vì mã cha thường đã có sẵn hàng chục mục ở nhánh gốc.
    expect(laLuatMoi('R9', ['R9.4'])).toBe(false);
  });

  it('probe neo nhiều luật thì chỉ cần MỘT luật mới là đủ', () => {
    expect(laLuatMoi('R4.21+R4.27', ['R4.27'])).toBe(true);
  });

  it('không nhầm sang luật khác, và không có luật mới thì không bật', () => {
    expect(laLuatMoi('R9', ['R10'])).toBe(false);
    expect(laLuatMoi('R9', [])).toBe(false);
    expect(laLuatMoi(undefined, ['R9'])).toBe(false);
  });
});

describe('nhận diện probe hỏng không được dương tính giả (R1.18)', () => {
  it('bắt đúng lỗi nạp/gọi của chính probe', () => {
    for (const l of [
      'trichMaLuat is not a function',
      "Cannot find module '../apps/web/src/x.js'",
      'ReferenceError: foo is not defined',
      'SyntaxError: Unexpected token',
      "Cannot read properties of undefined (reading 'chi_tiet')",
    ]) {
      expect(coVeLaProbeHong(l), `phải nhận: ${l}`).toBe(true);
    }
  });

  it('KHÔNG bắt nhầm lỗi nghiệp vụ tiếng Anh tự nhiên', () => {
    // Ca do chính CheckMate tìm ra khi chấm bản vá này: vá false-FAIL bằng cách mở đường false-PASS.
    // Một vi phạm THẬT có thông điệp trùng cụm sẽ bị loại khỏi hoi_quy rồi lọt cổng.
    for (const l of [
      "ValidationError: field 'email' is not defined in schema",
      'expected 200 to be 422',
      'expected [] to have a length of 20 but got 25',
      'Số tiền vượt hạn mức: tài khoản is not defined in policy',
    ]) {
      expect(coVeLaProbeHong(l), `KHÔNG được nhận: ${l}`).toBe(false);
    }
  });
});

describe('nhánh gốc PASS thật thắng nhãn luật-mới (R1.20)', () => {
  const p = (status: 'passed' | 'failed', message = '') => ({ file: 'f', title: 'P1: x', status, message }) as never;

  it('gốc pass + PR đỏ + luật mới → hoi_quy, KHÔNG phải vi_pham_luat_moi', () => {
    // «PR làm hỏng thứ đang chạy» khác «PR chưa làm được thứ nó vừa hứa». Gốc chạy đúng là bằng chứng
    // mạnh nhất có thể có, nó không được bị nhãn luật-mới đè lên.
    expect(phanLoaiMay(p('failed', 'expected 200 to be 422'), p('passed'), true)).toBe('hoi_quy');
  });

  it('đỏ cả hai nhánh + luật mới → vi_pham_luat_moi', () => {
    const cung = 'expected 200 to be 422';
    expect(phanLoaiMay(p('failed', cung), p('failed', cung), true)).toBe('vi_pham_luat_moi');
  });

  it('đỏ cả hai + luật mới NHƯNG probe hỏng → không kết luận', () => {
    const hong = 'trichMaLuat is not a function';
    expect(phanLoaiMay(p('failed', hong), p('failed', hong), true)).toBe('ngoai_pham_vi');
  });
});

describe('hai ca biên do lượt chấm thứ ba tìm ra', () => {
  it('nhận mọi tên lớp lỗi runtime, đúng như chú thích code tự khai', () => {
    // Chú thích viết «tên lớp lỗi runtime JavaScript» mà cài đặt chỉ liệt hai — lời khai lệch cài đặt.
    for (const l of ['TypeError: Assignment to constant variable.', 'RangeError: Maximum call stack size exceeded']) {
      expect(coVeLaProbeHong(l), `phải nhận: ${l}`).toBe(true);
    }
  });

  it('mã cha KHÔNG thành luật mới chỉ vì có một mục con mới', () => {
    // R1 đã có ở nhánh gốc với R1.1–R1.16. Probe khai lỏng spec_rule='R1' mà thực chất kiểm R1.5 thì
    // không được gán nhầm sang nhóm luật-mới rồi chặn oan.
    expect(laLuatMoi('R1', ['R1.18'])).toBe(false);
    // Chiều còn lại vẫn đúng: cả cụm R12 mới thì mục con R12.3 cũng mới
    expect(laLuatMoi('R12.3', ['R12'])).toBe(true);
  });
});
