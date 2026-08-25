import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: probe P1-P6 theo spec R1/R2/R6/R7.
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

async function layTrangThai(soHoSo: string) {
  const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
  expect(ds.statusCode).toBe(200);
  const dx = ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === soHoSo);
  return dx?.trang_thai;
}

describe('P1: Duyệt đúng biên trần chuyên viên (500tr), người khác tạo', () => {
  it('P1: lan (chuyên viên) duyệt hồ sơ 500tr đúng trần do hung tạo -> 200 da_duyet', async () => {
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
});

describe('P2: Chuyên viên vượt quyền duyệt hồ sơ 600 triệu', () => {
  it('P2: lan (chuyên viên) cố duyệt hồ sơ 600tr vượt trần 500tr -> 403, hồ sơ vẫn cho_duyet', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 600_000_000, 'hung');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('500.000.000');

    const trangThai = await layTrangThai('HM-2026-8002');
    expect(trangThai).toBe('cho_duyet');
  });
});

describe('P3: Tự duyệt hồ sơ trong hạn mức của chính mình', () => {
  it('P3: lan tự duyệt hồ sơ 300tr do chính lan tạo -> 403 dù trong hạn mức số tiền', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 300_000_000, 'lan');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('tự phê duyệt');

    const trangThai = await layTrangThai('HM-2026-8003');
    expect(trangThai).toBe('cho_duyet');
  });
});

describe('P4: Giải ngân 500 triệu chia 3 kỳ — chia không hết, tổng phải khớp', () => {
  it('P4: floor + dồn dư về kỳ cuối, tổng 3 kỳ đúng 500.000.000', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 500_000_000, 'hung');
    const duyet = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });
    expect(duyet.statusCode).toBe(200);

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

describe('P5: Giải ngân khi đề xuất còn ở trạng thái cho_duyet', () => {
  it('P5: giải ngân hồ sơ chưa duyệt -> 409, trang_thai vẫn cho_duyet', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 500_000_000, 'hung');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(409);

    const trangThai = await layTrangThai('HM-2026-8005');
    expect(trangThai).toBe('cho_duyet');
  });
});

describe('P6: Giải ngân với de_xuat_id không tồn tại', () => {
  it('P6: id không có trong DB -> 404 rõ ràng, không vỡ thành 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/giai-ngan',
      payload: { so_ky: 3 },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('Không tìm thấy đề xuất');
  });
});