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
    const a = nhanProbe('cửa đọc cấu hình máy chủ và repo đích > P1: khuyết trường model', ['P1', 'P2']);
    const b = nhanProbe('cửa đọc cấu hình máy chủ và repo đích > P2: khuyết trường phương thức', ['P1', 'P2']);
    expect(a).not.toBe(b);
    expect(a).toContain('P1');
    expect(b).toContain('P2');
    // đúng lỗi cũ: cắt từ đầu title thì cả hai đều ra tên describe dùng chung
    expect(a.startsWith('cửa đọc cấu hình')).toBe(false);
  });

  it('«>» trong TÊN TEST không được làm mất mã probe (vòng hai của cổng)', () => {
    // `>` là ký tự bình thường trong tên test; lấy đoạn cuối vô điều kiện thì «kỳ vọng a > phải chặn»
    // ném mất «P1», và hai probe khác nhau lại ra cùng một nhãn.
    const a = nhanProbe('nhóm chung > P1: kỳ vọng a > phải chặn', ['P1', 'P2']);
    const b = nhanProbe('nhóm chung > P2: kỳ vọng b > phải chặn', ['P1', 'P2']);
    expect(a).toContain('P1');
    expect(b).toContain('P2');
    expect(a).not.toBe(b);
  });

  it('hai cửa đọc title KHÔNG lệch nhau: khopIdProbe nối được id thì nhãn cũng phải mang id', () => {
    const title = 'nhóm > P1: kỳ vọng a > b';
    expect(khopIdProbe(title, 'P1')).toBe(true);
    expect(nhanProbe(title, ['P1'])).toContain('P1');
  });

  it('title KHÔNG có dấu «>» vẫn cho nhãn đọc được — probe thư viện đời cũ', () => {
    const n = nhanProbe('P7: tổ hợp bị cấm không mở cổng', ['P7']);
    expect(n).toContain('P7');
    expect(n.length).toBeGreaterThan(3);
  });

  it('title rỗng / toàn khoảng trắng → nhãn không rỗng, không ném', () => {
    for (const t of ['', '   ', '>', ' > > ']) {
      expect(() => nhanProbe(t)).not.toThrow();
      // Vân tay vẫn đi kèm: hai title rỗng-khác-nhau ('' vs '>') là hai probe khác nhau, nhãn không
      // được gộp chúng làm một.
      expect(nhanProbe(t)).toMatch(/·[0-9a-f]{4}$/); // luôn có vân tay
      expect(nhanProbe(t).length).toBeGreaterThan(4);
    }
    expect(nhanProbe(''), 'hai title khác nhau → hai nhãn khác nhau').not.toBe(nhanProbe('>'));
  });

  it('nhãn dài bị cắt nhưng GIỮ đầu tên it (nơi mã probe nằm) và báo còn nữa bằng dấu …', () => {
    const n = nhanProbe(`nhóm > P3: ${'x'.repeat(200)}`, ['P3']);
    expect(n).toContain('P3');
    expect(n.length).toBeLessThanOrEqual(40); // biết mã thì nhãn gọn hẳn, không cần cắt chữ
  });

  it('KHÔNG đoán mã: describe tên «P1 hay P2» không được làm nhãn mang mã SAI (vòng hai, HIGH)', () => {
    // Lối đoán bằng regex lấy đoạn khớp P\d+ ĐẦU TIÊN — trúng ngay tên describe, nên nhãn mang «P1»
    // trong khi khopIdProbe nối đúng «P10». Nhãn mang mã sai còn tệ hơn nhãn không mã.
    const n = nhanProbe('P1 hay P2 > P10: nối đúng id', ['P10']);
    expect(n).toContain('P10');
    expect(khopIdProbe('P1 hay P2 > P10: nối đúng id', 'P10')).toBe(true);
    // Vòng ba của cổng bắt tiếp: ghép tên describe vào đuôi ⟨…⟩ vẫn là mang mã SAI vào nhãn
    expect(n, 'nhãn KHÔNG được chứa mã của describe').not.toMatch(/P1 hay P2|⟨/);
  });

  it('probe KHÔNG mang mã: hai title khác describe vẫn ra hai nhãn khác nhau (vòng hai, MEDIUM)', () => {
    const a = nhanProbe('cửa đọc cấu hình máy chủ > phải chặn');
    const b = nhanProbe('cửa đọc cấu hình repo đích > phải chặn');
    expect(a).not.toBe(b);
  });

  it('title dạng «P1: …» KHÔNG có describe mà tên test chứa «>» vẫn giữ mã (vòng bốn, HIGH)', () => {
    // vitest JSON trả tên `it` THUẦN, JUnit XML của repo đích trả tên đã gộp «describe > it» — không
    // phép đoán cấu trúc nào đúng cho cả hai. Hỏi chính cửa nối id thì cả hai nguồn đều đúng.
    expect(nhanProbe('P1: kỳ vọng a > phải chặn', ['P1'])).toContain('P1');
    expect(nhanProbe('nhóm > P1: kỳ vọng a > phải chặn', ['P1'])).toContain('P1');
  });

  it('KHÔNG biết mã thì vẫn cho nhãn đọc được và không trùng', () => {
    const a = nhanProbe('cửa đọc cấu hình máy chủ > phải chặn');
    const b = nhanProbe('cửa đọc cấu hình repo đích > phải chặn');
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(5);
  });

  it('VÂN TAY bảo đảm không bao giờ trùng — kể cả khi phần chữ bị cắt trùng khít (vòng ba)', () => {
    // Ca vòng ba: mã nằm CUỐI tên it dài thì thân bị cắt, hai nhãn trùng khít và mất luôn mã.
    const dai = 'x'.repeat(60);
    const a = nhanProbe(`nhóm > ${dai} P1`);
    const b = nhanProbe(`nhóm > ${dai} P2`);
    expect(a).not.toBe(b);
    // và hai describe trùng 9 ký tự cuối cũng không được ra cùng nhãn
    const c = nhanProbe('nhóm alpha chung cuối > phải chặn');
    const d = nhanProbe('nhóm beta chung cuối > phải chặn');
    expect(c).not.toBe(d);
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
