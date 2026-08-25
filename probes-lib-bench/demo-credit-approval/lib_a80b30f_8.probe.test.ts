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

async function layDanhSach() {
  const res = await app.inject({ method: 'GET', url: '/api/de-xuat' });
  expect(res.statusCode).toBe(200);
  return res.json() as Array<{ id: number; so_ho_so: string; trang_thai: string }>;
}

describe('P1: Trùng so_ho_so sau khi PR bỏ kiểm tra app-layer', () => {
  it('P1: request thứ 2 trùng so_ho_so phải trả 422 nghiệp vụ, không phải 500', async () => {
    await taoDeXuat('HM-2026-9001', 300_000_000, 'hung');

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/de-xuat',
      headers: { 'x-user': 'hung' },
      payload: { so_ho_so: 'HM-2026-9001', khach_hang: 'Trần Văn B', so_tien: 200_000_000 },
    });

    expect(res2.statusCode).toBe(422);
    expect(JSON.stringify(res2.json())).toContain('Mã hồ sơ đã tồn tại');

    const ds = await layDanhSach();
    const soBanGhiTrung = ds.filter((d) => d.so_ho_so === 'HM-2026-9001').length;
    expect(soBanGhiTrung).toBe(1);
  });
});

describe('P2: Giải ngân với de_xuat_id không tồn tại', () => {
  it('P2: id không tồn tại phải trả 404, không phải 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/giai-ngan',
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).toContain('Không tìm thấy đề xuất');
  });
});

describe('P3: Chuyên viên vượt quyền duyệt hồ sơ trên trần', () => {
  it('P3: lan (chuyên viên) không được duyệt hồ sơ 600 triệu', async () => {
    const dx = await taoDeXuat('HM-2026-9003', 600_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).toContain('500.000.000');

    const ds = await layDanhSach();
    const sau = ds.find((d) => d.id === dx.id);
    expect(sau?.trang_thai).toBe('cho_duyet');
  });
});

describe('P4: Tự phê duyệt hồ sơ của chính mình dù đủ thẩm quyền số tiền', () => {
  it('P4: lan không được tự duyệt hồ sơ 300 triệu do chính lan tạo', async () => {
    const dx = await taoDeXuat('HM-2026-9004', 300_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).toContain('Người tạo đề xuất không được tự phê duyệt');

    const ds = await layDanhSach();
    const sau = ds.find((d) => d.id === dx.id);
    expect(sau?.trang_thai).toBe('cho_duyet');
  });
});

describe('P5: Biên đóng — duyệt đúng bằng trần vai chuyên viên', () => {
  it('P5: lan duyệt hồ sơ đúng 500.000.000 do người khác tạo phải thành công', async () => {
    const dx = await taoDeXuat('HM-2026-9005', 500_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
  });
});

describe('P6: Chia kỳ giải ngân không hết — dồn dư về kỳ cuối', () => {
  it('P6: giải ngân 500 triệu / 3 kỳ, kỳ cuối nhận phần dư', async () => {
    const dx = await taoDeXuat('HM-2026-9006', 500_000_000, 'hung');
    await app.inject({ method: 'POST', url: `/api/de-xuat/${dx.id}/duyet`, headers: { 'x-user': 'lan' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(200);
    const kq = res.json();
    expect(kq.cac_ky).toHaveLength(3);
    expect(kq.cac_ky[0].so_tien).toBe(166_666_666);
    expect(kq.cac_ky[1].so_tien).toBe(166_666_666);
    expect(kq.cac_ky[2].so_tien).toBe(166_666_668);

    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(500_000_000);
  });
});