import { describe, it, expect } from 'vitest';
import { KHO_KHUON, TRAN_KHUON, layKhuonCode, layKhuonDoc } from '../packages/harness/src/khuon-loi.js';

// Kho khuôn lỗi common (specs/R12) — tri thức đúc từ finding thật, phát vào prompt của cả hai skill.

describe('kho khuôn lỗi common (R12)', () => {
  it('mỗi khuôn PHẢI kèm án lệ TRUY ĐƯỢC NGUỒN — mốc định vị, không mô tả suông (R12.2)', () => {
    // Vòng một của cổng bắt 5 mục «khuôn đời đầu» không mốc: người đọc không lần ngược được khuôn
    // ra đời từ finding nào để sửa/loại khi nó sinh probe sai. Mốc = số PR / vòng chấm / tên file /
    // tên repo — thứ trỏ thẳng vào một nơi có thật.
    for (const k of KHO_KHUON) {
      expect(k.an_le, `${k.id} án lệ thiếu mốc định vị`).toMatch(/#\d+|vòng \d+|\.(md|ts|yml)|demo-[a-z-]+/);
      expect(k.khuon.trim().length, `${k.id} khuôn rỗng`).toBeGreaterThan(20);
    }
  });

  it('khuôn BẮT BUỘC (len_dau) sống sót trần — sắp trước, cắt sau (vòng một của cổng bắt)', () => {
    // Dựng kho giả vượt trần: 25 khuôn thường + KL5 bắt buộc đứng CUỐI danh sách khai
    const khoGia = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `T${i}`, loai: 'code' as const, khuon: `khuôn thường ${i} đủ dài để qua ngưỡng kiểm tra`, an_le: 'test.ts' })),
      { id: 'BB', loai: 'code' as const, khuon: 'BẮT BUỘC có probe thử VƯỢT QUYỀN — khuôn đứng cuối danh sách khai', an_le: 'test.ts', dieu_kien: /quyền/, len_dau: true },
    ];
    const goc = KHO_KHUON.splice(0, KHO_KHUON.length, ...khoGia as never[]);
    try {
      const ra = layKhuonCode('spec có luật về quyền');
      expect(ra.length).toBeLessThanOrEqual(TRAN_KHUON);
      expect(ra[0], 'khuôn bắt buộc phải đứng đầu, không bị cắt lặng').toContain('VƯỢT QUYỀN');
    } finally {
      KHO_KHUON.splice(0, KHO_KHUON.length, ...goc);
    }
  });

  it('trần 20 khuôn mỗi loại (R12.3) — prompt phình là loãng chú ý model', () => {
    for (const loai of ['code', 'doc'] as const) {
      expect(KHO_KHUON.filter((k) => k.loai === loai).length).toBeLessThanOrEqual(TRAN_KHUON);
    }
    // và hai hàm phát không bao giờ vượt trần dù kho về sau có phình
    expect(layKhuonCode('quyền http validate đầu vào').length).toBeLessThanOrEqual(TRAN_KHUON);
    expect(layKhuonDoc().length).toBeLessThanOrEqual(TRAN_KHUON);
  });

  it('id không trùng nhau', () => {
    const ids = KHO_KHUON.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('khuôn điều kiện chỉ bật khi spec repo có loại luật đó (R12.4)', () => {
    const khongQuyen = layKhuonCode('spec chỉ nói về tính tổng tiền');
    expect(khongQuyen.some((k) => k.includes('VƯỢT QUYỀN'))).toBe(false);
    const coQuyen = layKhuonCode('chỉ vai trò duyệt cấp 2 được phê duyệt hồ sơ');
    expect(coQuyen.some((k) => k.includes('VƯỢT QUYỀN'))).toBe(true);
    // khuôn bắt buộc đứng ĐẦU danh sách — giữ ngữ nghĩa unshift của đời trước
    expect(coQuyen[0]).toContain('VƯỢT QUYỀN');
  });

  it('khuôn vô điều kiện phát cho MỌI repo — gồm các khuôn đúc từ chuỗi PR #12', () => {
    const bat = layKhuonCode('spec tối giản không khớp regex nào');
    for (const manh of ['KHUYẾT ở MỌI TẦNG', 'CỬA SONG SINH', 'NGUYÊN VĂN', 'thay LẶNG', 'ảnh-với-ảnh']) {
      expect(bat.some((k) => k.includes(manh)), `thiếu khuôn «${manh}»`).toBe(true);
    }
  });

  it('khuôn doc là «nơi hay giấu lỗi», không mở rộng rubric — không dòng nào tự đặt loại finding mới', () => {
    for (const k of layKhuonDoc()) {
      expect(k).not.toMatch(/rubric mới|loại mới|loại thứ 8/i);
    }
    expect(layKhuonDoc().length).toBeGreaterThanOrEqual(3);
  });
});
