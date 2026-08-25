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
  return res;
}

describe('Đối kháng', () => {
  it('P1: trùng so_ho_so trả 422 nghiệp vụ, không vỡ 500, không ghi thêm bản ghi', async () => {
    const soHoSo = 'HM-2026-8001';

    const res1 = await taoDeXuat(soHoSo, 300_000_000, 'hung');
    expect(res1.statusCode).toBe(201);

    const res2 = await taoDeXuat(soHoSo, 300_000_000, 'lan');
    expect(res2.statusCode).toBe(422);
    expect(res2.statusCode).not.toBe(500);
    expect(res2.body).toContain('Mã hồ sơ đã tồn tại');

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    expect(ds.statusCode).toBe(200);
    const trung = ds
      .json()
      .filter((d: { so_ho_so: string }) => d.so_ho_so === soHoSo);
    expect(trung).toHaveLength(1);
  });

  it('P2: giai-ngan với de_xuat_id không tồn tại trả 404, không vỡ 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/giai-ngan',
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(404);
    expect(res.statusCode).not.toBe(500);
    expect(res.body).toContain('Không tìm thấy đề xuất');
  });

  it('P3: chuyên viên vượt thẩm quyền duyệt 600 triệu bị chặn 403, trạng thái giữ nguyên', async () => {
    const taoRes = await taoDeXuat('HM-2026-8003', 600_000_000, 'minh');
    expect(taoRes.statusCode).toBe(201);
    const dx = taoRes.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('hạn mức');

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    const sau = ds
      .json()
      .find((d: { id: number }) => d.id === dx.id);
    expect(sau.trang_thai).toBe('cho_duyet');
  });

  it('P4: đủ thẩm quyền số tiền nhưng tự duyệt hồ sơ mình tạo bị chặn 403', async () => {
    const taoRes = await taoDeXuat('HM-2026-8004', 300_000_000, 'hung');
    expect(taoRes.statusCode).toBe(201);
    const dx = taoRes.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Người tạo đề xuất không được tự phê duyệt');
  });

  it('P5: biên đóng — chuyên viên duyệt đúng 500.000.000đ là hợp lệ', async () => {
    const taoRes = await taoDeXuat('HM-2026-8005', 500_000_000, 'hung');
    expect(taoRes.statusCode).toBe(201);
    const dx = taoRes.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
    expect(res.json().nguoi_duyet).toBe('lan');
  });

  it('P6: chia 500 triệu thành 3 kỳ không hết — phần dư dồn kỳ cuối', async () => {
    const taoRes = await taoDeXuat('HM-2026-8006', 500_000_000, 'hung');
    expect(taoRes.statusCode).toBe(201);
    const dx = taoRes.json();

    const duyetRes = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(duyetRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(200);
    const kq = res.json();
    expect(kq.cac_ky).toHaveLength(3);
    expect(kq.cac_ky.map((k: { so_tien: number }) => k.so_tien)).toEqual([
      166_666_666, 166_666_666, 166_666_668,
    ]);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(500_000_000);
  });
});