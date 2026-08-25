import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: probe biên và điều kiện kép theo spec R1/R2/R6/R7.
let app: FastifyInstance;

beforeEach(() => {
  app = buildApp(moDb(':memory:'));
});

async function taoDeXuat(soHoSo: string, soTien: number, nguoiTao: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/de-xuat',
    headers: { 'x-user': nguoiTao },
    payload: { so_ho_so: soHoSo, khach_hang: 'Nguyễn Văn A', so_tien: soTien },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

async function duyet(id: string | number, nguoiDuyet: string) {
  return app.inject({
    method: 'POST',
    url: `/api/de-xuat/${id}/duyet`,
    headers: { 'x-user': nguoiDuyet },
  });
}

describe('P1: biên đóng R1 — chuyên viên duyệt đúng trần 500.000.000đ', () => {
  it('P1: lan (chuyên viên) duyệt đề xuất đúng bằng trần vai phải được cho qua', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 500_000_000, 'hung');
    const res = await duyet(dx.id, 'lan');

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
    expect(res.json().nguoi_duyet).toBe('lan');
  });
});

describe('P2: vượt trần đúng 1 đồng — R2 đúng nhưng R1 sai (vượt thẩm quyền)', () => {
  it('P2: lan duyệt đề xuất vượt trần vai 1 đồng phải bị chặn bởi R1, kèm thông báo nêu hạn mức vai', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 500_000_001, 'hung');
    const res = await duyet(dx.id, 'lan');

    expect(res.statusCode).toBe(403);
    const body = res.body;
    expect(body).toMatch(/500[.,]?000[.,]?000/);
  });
});

describe('P3: giám đốc tự duyệt hồ sơ mình tạo dù thẩm quyền không giới hạn', () => {
  it('P3: minh tự tạo rồi tự duyệt đề xuất 3 tỷ phải bị chặn bởi R2 dù R1 thoả', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 3_000_000_000, 'minh');
    const res = await duyet(dx.id, 'minh');

    expect(res.statusCode).toBe(403);
    expect(res.body.toLowerCase()).toContain('tự phê duyệt');
  });
});

describe('P4: giải ngân đề xuất còn ở trạng thái cho_duyet (chưa duyệt)', () => {
  it('P4: gọi giai-ngan khi chưa duyệt phải bị chặn ở tầng ứng dụng bằng 409, không lộ lỗi DB', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 300_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 2 },
    });

    expect(res.statusCode).toBe(409);
    expect(res.statusCode).not.toBe(500);
    expect(res.body).not.toMatch(/SQLITE|stack|at Object\.|at Module\.|ECONNREFUSED/i);
  });
});

describe('P5: chia 500.000.000đ thành 3 kỳ — chia không hết, đúng ví dụ trong spec', () => {
  it('P5: floor + dồn dư về kỳ cuối phải cho tổng cac_ky đúng bằng 500.000.000 tuyệt đối', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 500_000_000, 'lan');
    const dRes = await duyet(dx.id, 'hung');
    expect(dRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(200);
    const kq = res.json();
    const soTienCacKy = kq.cac_ky.map((k: { so_tien: number }) => k.so_tien);
    expect(soTienCacKy).toEqual([166_666_666, 166_666_666, 166_666_668]);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(500_000_000);
  });
});

describe('P6: chia 900.000.000đ thành 3 kỳ đều nhau — hành vi cũ không bị phá', () => {
  it('P6: chia hết không lẻ phải cho 3 kỳ đều 300.000.000, tổng khớp', async () => {
    const dx = await taoDeXuat('HM-2026-8006', 900_000_000, 'lan');
    const dRes = await duyet(dx.id, 'hung');
    expect(dRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(200);
    const kq = res.json();
    expect(kq.de_xuat.trang_thai).toBe('dang_giai_ngan');
    expect(kq.cac_ky).toHaveLength(3);
    expect(kq.cac_ky.every((k: { so_tien: number }) => k.so_tien === 300_000_000)).toBe(true);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(900_000_000);
  });
});