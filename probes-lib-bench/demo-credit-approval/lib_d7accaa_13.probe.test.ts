import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: mỗi probe assert đúng theo spec, không theo hành vi hiện tại của code.
let app: FastifyInstance;

beforeEach(() => {
  app = buildApp(moDb(':memory:'));
});

async function taoDeXuatRaw(soHoSo: string, soTien: number, nguoiTao: string) {
  return app.inject({
    method: 'POST',
    url: '/api/de-xuat',
    headers: { 'x-user': nguoiTao },
    payload: { so_ho_so: soHoSo, khach_hang: 'Nguyễn Văn A', so_tien: soTien },
  });
}

async function taoDeXuat(soHoSo: string, soTien: number, nguoiTao: string) {
  const res = await taoDeXuatRaw(soHoSo, soTien, nguoiTao);
  expect(res.statusCode).toBe(201);
  return res.json();
}

async function layTrangThai(id: number | string) {
  const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
  expect(ds.statusCode).toBe(200);
  const found = ds.json().find((d: { id: number | string }) => d.id === id);
  return found?.trang_thai;
}

describe('P1: chuyên viên vượt hạn mức duyệt hồ sơ người khác tạo', () => {
  it('P1: lan (trần 500tr) duyệt hồ sơ 600tr do hung tạo -> 403, trạng thái không đổi', async () => {
    const dx = await taoDeXuat('HM-2026-8101', 600_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(403);
    expect(await layTrangThai(dx.id)).toBe('cho_duyet');
  });
});

describe('P2: người tạo tự duyệt hồ sơ trong hạn mức của mình', () => {
});

describe('P3: duyệt đúng bằng trần vai — biên đóng', () => {
});

describe('P4: giải ngân chia không hết — dư dồn kỳ cuối', () => {
});

describe('P5: giải ngân khi đề xuất chưa được duyệt', () => {
  it('P5: giải ngân thẳng hồ sơ đang cho_duyet -> 409, trạng thái không đổi', async () => {
    const dx = await taoDeXuat('HM-2026-8105', 400_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 2 },
    });

    expect(res.statusCode).toBe(409);
    expect(await layTrangThai(dx.id)).toBe('cho_duyet');
  });
});

describe('P6: tạo trùng mã hồ sơ so_ho_so', () => {
  it('P6: tạo lần 2 với cùng so_ho_so -> 422, không ghi dữ liệu mới', async () => {
    await taoDeXuat('HM-2026-9001', 300_000_000, 'hung');

    const res2 = await taoDeXuatRaw('HM-2026-9001', 700_000_000, 'lan');

    expect(res2.statusCode).toBe(422);
    expect(res2.body).toContain('Mã hồ sơ đã tồn tại');

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    expect(ds.statusCode).toBe(200);
    const trung = ds.json().filter((d: { so_ho_so: string }) => d.so_ho_so === 'HM-2026-9001');
    expect(trung).toHaveLength(1);
  });
});