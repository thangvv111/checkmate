import { describe, it, expect } from 'vitest';
import { khopIdProbe, nhanProbe } from '../packages/harness/src/skill-code.js';
import { phanLoaiPr } from '../apps/web/src/github.js';

/**
 * Bề mặt HIỂN THỊ phải phân biệt được hai thứ khác nhau.
 *
 * Hai lỗi cùng họ, cùng hậu quả: người đọc log/verdict thấy nhiều dòng giống hệt nhau và không lần
 * ra được thứ nào là thứ nào.
 *  A · log tóm tắt probe cắt 24 ký tự TỪ ĐẦU title, mà đầu title là tên `describe` DÙNG CHUNG — năm
 *    phép thử khác nhau hiện ra y hệt («cửa đọc cấu hình máy chủ=f» ×5), phần phân biệt (mã probe)
 *    nằm ở đoạn cuối thì bị cắt mất.
 *  B · `phanLoaiPr` dựng vị trí phần tử bằng `indexOf` — hai phần tử méo giống hệt nhau đều báo cùng
 *    một vị trí (nợ medium công khai của PR #19).
 */

describe('A · nhãn probe trong log giữ đúng phần phân biệt', () => {
  it('hai probe cùng describe, khác it → hai nhãn KHÁC nhau và mang mã probe', () => {
    const a = nhanProbe('cửa đọc cấu hình máy chủ và repo đích > P1: khuyết trường model');
    const b = nhanProbe('cửa đọc cấu hình máy chủ và repo đích > P2: khuyết trường phương thức');
    expect(a).not.toBe(b);
    expect(a).toContain('P1');
    expect(b).toContain('P2');
    // đúng lỗi cũ: cắt từ đầu title thì cả hai đều ra tên describe dùng chung
    expect(a.startsWith('cửa đọc cấu hình')).toBe(false);
  });

  it('«>» trong TÊN TEST không được làm mất mã probe (vòng hai của cổng)', () => {
    // `>` là ký tự bình thường trong tên test; lấy đoạn cuối vô điều kiện thì «kỳ vọng a > phải chặn»
    // ném mất «P1», và hai probe khác nhau lại ra cùng một nhãn.
    const a = nhanProbe('nhóm chung > P1: kỳ vọng a > phải chặn');
    const b = nhanProbe('nhóm chung > P2: kỳ vọng b > phải chặn');
    expect(a).toContain('P1');
    expect(b).toContain('P2');
    expect(a).not.toBe(b);
  });

  it('hai cửa đọc title KHÔNG lệch nhau: khopIdProbe nối được id thì nhãn cũng phải mang id', () => {
    const title = 'nhóm > P1: kỳ vọng a > b';
    expect(khopIdProbe(title, 'P1')).toBe(true);
    expect(nhanProbe(title)).toContain('P1');
  });

  it('title KHÔNG có dấu «>» vẫn cho nhãn đọc được — probe thư viện đời cũ', () => {
    const n = nhanProbe('P7: tổ hợp bị cấm không mở cổng');
    expect(n).toContain('P7');
    expect(n.length).toBeGreaterThan(3);
  });

  it('title rỗng / toàn khoảng trắng → nhãn không rỗng, không ném', () => {
    for (const t of ['', '   ', '>', ' > > ']) {
      expect(() => nhanProbe(t)).not.toThrow();
      expect(nhanProbe(t)).toBe('(probe không tên)');
    }
  });

  it('nhãn dài bị cắt nhưng GIỮ đầu tên it (nơi mã probe nằm) và báo còn nữa bằng dấu …', () => {
    const n = nhanProbe(`nhóm > P3: ${'x'.repeat(200)}`);
    expect(n).toContain('P3');
    expect(n).toContain('…');
    expect(n.length).toBeLessThanOrEqual(45);
  });

  it('KHÔNG đoán mã: describe tên «P1 hay P2» không được làm nhãn mang mã SAI (vòng hai, HIGH)', () => {
    // Lối đoán bằng regex lấy đoạn khớp P\d+ ĐẦU TIÊN — trúng ngay tên describe, nên nhãn mang «P1»
    // trong khi khopIdProbe nối đúng «P10». Nhãn mang mã sai còn tệ hơn nhãn không mã.
    const n = nhanProbe('P1 hay P2 > P10: nối đúng id');
    expect(n).toContain('P10');
    expect(khopIdProbe('P1 hay P2 > P10: nối đúng id', 'P10')).toBe(true);
    expect(n.startsWith('P1:')).toBe(false);
  });

  it('probe KHÔNG mang mã: hai title khác describe vẫn ra hai nhãn khác nhau (vòng hai, MEDIUM)', () => {
    const a = nhanProbe('cửa đọc cấu hình máy chủ > phải chặn');
    const b = nhanProbe('cửa đọc cấu hình repo đích > phải chặn');
    expect(a).not.toBe(b);
  });
});

describe('B · vị trí phần tử trong lý do định tuyến là vị trí THẬT', () => {
  it('hai phần tử méo GIỐNG HỆT nhau phải mang hai vị trí khác nhau', () => {
    const kq = phanLoaiPr(['docs.md', null, null] as never);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toContain('vị trí 1');
    expect(kq.lyDo).toContain('vị trí 2'); // trước fix: indexOf trả 1 cho cả hai
  });

  it('ba phần tử rỗng giống hệt nhau vẫn đếm đủ ba vị trí', () => {
    const kq = phanLoaiPr(['a.md', '  ', '  ', '  '] as never);
    for (const v of ['vị trí 1', 'vị trí 2', 'vị trí 3']) expect(kq.lyDo).toContain(v);
  });
});
