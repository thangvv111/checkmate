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

describe('Đối kháng - Phê duyệt / Giải ngân', () => {
  it('P1: trùng so_ho_so phải trả 422 tiếng Việt, không vỡ thành 500', async () => {
    await taoDeXuat('HM-2026-8001', 300_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat',
      headers: { 'x-user': 'hung' },
      payload: { so_ho_so: 'HM-2026-8001', khach_hang: 'Trần Thị B', so_tien: 400_000_000 },
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.stringify(res.json())).toContain('Mã hồ sơ đã tồn tại');
  });

  it('P2: giải ngân đề_xuat_id không tồn tại phải trả 404, không crash 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/giai-ngan',
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).toContain('Không tìm thấy đề xuất');
  });

  it('P3: chuyên viên vượt quyền không được duyệt hồ sơ vượt trần vai', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 500_000_001, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).toContain('hạn mức');
  });

  it('P4: người tạo không được tự duyệt hồ sơ của chính mình dù đủ thẩm quyền số tiền', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 300_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).toContain('Người tạo đề xuất không được tự phê duyệt');
  });

  it('P5: biên đóng - số tiền đúng bằng trần vai chuyên viên vẫn phải duyệt được', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 500_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
  });

  it('P6: chia kỳ giải ngân không hết phải dồn dư về kỳ cuối, tổng khớp tuyệt đối', async () => {
    const dx = await taoDeXuat('HM-2026-8006', 500_000_000, 'lan');
    await app.inject({ method: 'POST', url: `/api/de-xuat/${dx.id}/duyet`, headers: { 'x-user': 'hung' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(200);
    const kq = res.json();
    expect(kq.cac_ky.map((k: { so_tien: number }) => k.so_tien)).toEqual([166_666_666, 166_666_666, 166_666_668]);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(500_000_000);
  });
});