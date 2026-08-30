import { describe, it, expect } from 'vitest';

// Tham số quay-lại sau đăng nhập chỉ được nhận đường NỘI BỘ. Không lọc thì trang đăng nhập của chính
// mình thành bàn đạp chuyển hướng: người dùng thấy tên miền quen, bấm, rồi bị đá sang chỗ khác.

const duongNoiBo = (x: unknown): string => {
  const s = typeof x === 'string' ? x.trim() : '';
  return /^\/[^/\\]/.test(s) ? s : '';
};

describe('lọc đường quay-lại sau đăng nhập', () => {
  it('nhận đường nội bộ bình thường', () => {
    expect(duongNoiBo('/lich-su')).toBe('/lich-su');
    expect(duongNoiBo('/runs/abc?x=1')).toBe('/runs/abc?x=1');
  });

  it('CHẶN chuyển hướng ra ngoài — mọi dạng', () => {
    for (const xau of ['https://ke-xau.example', '//ke-xau.example', '/\/ke-xau', 'javascript:alert(1)', '', '   ']) {
      expect(duongNoiBo(xau), `«${xau}» phải bị từ chối`).toBe('');
    }
  });

  it('không phải chuỗi thì trả rỗng, không ném', () => {
    expect(duongNoiBo(undefined)).toBe('');
    expect(duongNoiBo(['/a'])).toBe('');
  });
});
