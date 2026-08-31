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

  const khoGiaVao = (kho: unknown[]): unknown[] => KHO_KHUON.splice(0, KHO_KHUON.length, ...(kho as never[]));
  const khuonThuong = (id: string, loai: 'code' | 'doc', phu: Record<string, unknown> = {}) =>
    ({ id, loai, khuon: `${id} mọi nhánh lỗi phải có probe kiểm đủ dài qua ngưỡng`, an_le: 'test.ts — ca dựng trong test', ...phu });

  it('dieu_kien mang cờ g/y KHÔNG được giữ trạng thái — hai lượt gọi cùng spec phải giống hệt (vòng hai, HIGH)', () => {
    const goc = khoGiaVao([khuonThuong('GY', 'code', { dieu_kien: /quyền/g, len_dau: true })]);
    try {
      const lan1 = layKhuonCode('spec có luật về quyền');
      const lan2 = layKhuonCode('spec có luật về quyền');
      expect(lan1).toHaveLength(1);
      expect(lan2, 'lastIndex của cờ g làm lượt hai trả rỗng — khuôn biến mất từ repo thứ hai').toEqual(lan1);
    } finally { khoGiaVao(goc); }
  });

  it('khuôn KHÔNG án lệ bị TỪ CHỐI ngay cửa phát — luật R12.2 là gác chạy được (vòng hai, HIGH)', () => {
    const goc = khoGiaVao([khuonThuong('OK', 'code'), khuonThuong('RONG', 'code', { an_le: '' }), khuonThuong('THIEU', 'code', { an_le: undefined })]);
    try {
      const ra = layKhuonCode('spec bất kỳ');
      expect(ra).toHaveLength(1);
      expect(ra[0]).toContain('OK');
    } finally { khoGiaVao(goc); }
  });

  it('cửa doc là CỬA SONG SINH: dieu_kien được đánh trên văn bản tài liệu, không bị bỏ qua lặng (vòng hai)', () => {
    const goc = khoGiaVao([khuonThuong('KDT', 'doc'), khuonThuong('KDDK', 'doc', { dieu_kien: /không-bao-giờ-khớp/ })]);
    try {
      const ra = layKhuonDoc('tài liệu thường không chứa cụm điều kiện');
      expect(ra).toHaveLength(1);
      expect(ra[0]).toContain('KDT');
      expect(layKhuonDoc('văn bản có cụm không-bao-giờ-khớp hẳn hoi')).toHaveLength(2);
    } finally { khoGiaVao(goc); }
  });

  it('cửa doc cũng log khi chạm trần — không cắt lặng (vòng hai)', () => {
    const goc = khoGiaVao(Array.from({ length: TRAN_KHUON + 3 }, (_, i) => khuonThuong(`D${i}`, 'doc')));
    const daLog: string[] = [];
    const logGoc = console.log;
    console.log = (m: string) => { daLog.push(String(m)); };
    try {
      expect(layKhuonDoc('văn bản')).toHaveLength(TRAN_KHUON);
      expect(daLog.some((m) => m.includes('vượt trần') && m.includes('D')), 'phải log id khuôn bị bỏ').toBe(true);
    } finally { console.log = logGoc; khoGiaVao(goc); }
  });

  it('khuôn nhiều dòng bị ÉP về một dòng — không vỡ danh sách bullet của prompt (vòng hai)', () => {
    const goc = khoGiaVao([khuonThuong('ML', 'doc', { khuon: 'vế đầu của khuôn dài đủ ngưỡng\n   vế sau bị thụt dòng' })]);
    try {
      const ra = layKhuonDoc('văn bản');
      expect(ra[0]).not.toContain('\n');
      expect(ra[0]).toContain('vế đầu');
      expect(ra[0]).toContain('vế sau');
    } finally { khoGiaVao(goc); }
  });

  it('án lệ CÓ chữ nhưng KHÔNG mốc định vị cũng bị từ chối — gác theo đúng mức luật khai (vòng ba, HIGH)', () => {
    const goc = khoGiaVao([khuonThuong('CO_MOC', 'code'), khuonThuong('KHONG_MOC', 'code', { an_le: 'đúc từ trực giác của người viết, nghe rất hợp lý' })]);
    try {
      const ra = layKhuonCode('spec bất kỳ');
      expect(ra).toHaveLength(1);
      expect(ra[0]).toContain('CO_MOC');
    } finally { khoGiaVao(goc); }
  });

  it('điều kiện đánh KHÔNG phân biệt hoa thường trên văn bản GỐC — regex chữ hoa vẫn bật (vòng ba, HIGH)', () => {
    // Bản trước toLowerCase đầu vào rồi test /PHẢI|HTTP/ — không bao giờ khớp, khuôn biến mất lặng (họ KL11)
    const goc = khoGiaVao([khuonThuong('HOA', 'code', { dieu_kien: /PHẢI có probe|HTTP/ })]);
    try {
      expect(layKhuonCode('spec nói route http phải có probe đối kháng')).toHaveLength(1);
      expect(layKhuonCode('spec Nói Rõ: HTTP route')).toHaveLength(1);
      expect(layKhuonCode('spec không liên quan')).toHaveLength(0);
    } finally { khoGiaVao(goc); }
  });

  it('khuôn RỖNG/toàn khoảng trắng bị từ chối + log, không thành bullet trống (vòng ba)', () => {
    const goc = khoGiaVao([khuonThuong('OK2', 'doc'), khuonThuong('TRANG', 'doc', { khuon: '   ' })]);
    try {
      const ra = layKhuonDoc('văn bản');
      expect(ra).toHaveLength(1);
      expect(ra[0]).toContain('OK2');
    } finally { khoGiaVao(goc); }
  });

  it('trần đo TRÊN KHO, không đo trên tập đã lọc — kho quá tải phải kêu dù tập phát nhỏ (vòng ba)', () => {
    const goc = khoGiaVao([
      ...Array.from({ length: TRAN_KHUON + 5 }, (_, i) => khuonThuong(`C${i}`, 'code', i >= 15 ? { dieu_kien: /không-khớp-đâu/ } : {})),
    ]);
    const daLog: string[] = [];
    const logGoc = console.log;
    console.log = (m: string) => { daLog.push(String(m)); };
    try {
      const ra = layKhuonCode('spec thường');
      expect(ra.length).toBeLessThanOrEqual(TRAN_KHUON);
      expect(daLog.some((m) => m.includes('đang giữ') && m.includes(String(TRAN_KHUON + 5))), 'phải cảnh báo kích thước KHO').toBe(true);
    } finally { console.log = logGoc; khoGiaVao(goc); }
  });

  it('hai cửa CÙNG hành vi với đầu vào khuyết — không cửa nào ném (vòng ba, KL9 + KL16)', () => {
    expect(() => layKhuonCode(undefined as never)).not.toThrow();
    expect(() => layKhuonDoc(undefined as never)).not.toThrow();
    expect(layKhuonCode(undefined as never).length).toBeGreaterThan(0); // khuôn vô điều kiện vẫn phát
  });

  it('khuôn doc là «nơi hay giấu lỗi», không mở rộng rubric — không dòng nào tự đặt loại finding mới', () => {
    for (const k of layKhuonDoc()) {
      expect(k).not.toMatch(/rubric mới|loại mới|loại thứ 8/i);
    }
    expect(layKhuonDoc().length).toBeGreaterThanOrEqual(3);
  });
});
