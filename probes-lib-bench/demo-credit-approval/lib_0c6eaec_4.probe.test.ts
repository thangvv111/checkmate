import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp(moDb(':memory:'));
});

async function taoDeXuat(soHoSo: string, soTien: number, nguoiTao = 'hung') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/de-xuat',
    headers: { 'x-user': nguoiTao },
    payload: { so_ho_so: soHoSo, khach_hang: 'Nguyễn Văn A', so_tien: soTien },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe('Đối kháng - Phê duyệt & Giải ngân', () => {
  it('P1: chuyên viên duyệt hồ sơ đúng bằng trần thẩm quyền (500tr, biên đóng)', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 500_000_000, 'hung');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
    expect(res.json().nguoi_duyet).toBe('lan');
  });

  it('P2: chuyên viên thử duyệt hồ sơ vượt rõ thẩm quyền (600tr)', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 600_000_000, 'hung');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(403);

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    const hoSo = ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === 'HM-2026-8002');
    expect(hoSo.trang_thai).toBe('cho_duyet');
  });

  it('P3: người tạo tự duyệt dù số tiền trong thẩm quyền của chính mình', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 300_000_000, 'lan');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(403);

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    const hoSo = ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === 'HM-2026-8003');
    expect(hoSo.trang_thai).toBe('cho_duyet');
  });

  it('P4: giải ngân 500 triệu chia 3 kỳ - chia không hết, dư dồn kỳ cuối', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 500_000_000, 'hung');
    await app.inject({ method: 'POST', url: `/api/de-xuat/${dx.id}/duyet`, headers: { 'x-user': 'lan' } });

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

  it('P5: giải ngân 600 triệu chia 3 kỳ đều nhau (hồi quy theo test mẫu)', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 600_000_000, 'lan');
    await app.inject({ method: 'POST', url: `/api/de-xuat/${dx.id}/duyet`, headers: { 'x-user': 'hung' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(200);
    const kq = res.json();
    expect(kq.de_xuat.trang_thai).toBe('dang_giai_ngan');
    expect(kq.cac_ky).toHaveLength(3);
    expect(kq.cac_ky.every((k: { so_tien: number }) => k.so_tien === 200_000_000)).toBe(true);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(600_000_000);
  });

  it('P6: giải ngân với de_xuat_id không tồn tại', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/999999/giai-ngan`,
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(404);
  });
});