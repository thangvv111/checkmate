import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: probe theo spec_rule (R1, R2, R4, R5, R6), không theo hành vi hiện tại của code.
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

describe('P1: Giám đốc tự phê duyệt hồ sơ do chính mình tạo — phải bị chặn dù không giới hạn số tiền', () => {
  it('P1: minh tạo rồi minh tự duyệt → 403, trạng thái không đổi', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 3_000_000_000, 'minh');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'minh' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toContain('không được tự phê duyệt');

    const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
    const dxSau = ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === 'HM-2026-8001');
    expect(dxSau.trang_thai).toBe('cho_duyet');
  });
});

describe('P2: Trưởng phòng duyệt vượt trần 2 tỷ, khác người tạo — vẫn phải chặn vì vượt hạn mức', () => {
  it('P2: hung (truong_phong) duyệt hồ sơ 2,5 tỷ do lan tạo → 403 vượt hạn mức', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 2_500_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(403);
    const err: string = res.json().error;
    expect(err.includes('2.000.000.000') || err.toLowerCase().includes('vượt hạn mức')).toBe(true);
  });
});

describe('P3: Biên đóng trần truong_phong đúng 2.000.000.000 đ phải được duyệt hợp lệ', () => {
  it('P3: hung duyệt hồ sơ đúng 2 tỷ do lan tạo → 200 da_duyet', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 2_000_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
  });
});

describe('P4: Duyệt lần hai trên hồ sơ đã da_duyet phải bị chặn 409', () => {
  it('P4: duyệt lại hồ sơ đã duyệt → 409', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 300_000_000, 'lan');

    const lan1 = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });
    expect(lan1.statusCode).toBe(200);
    expect(lan1.json().trang_thai).toBe('da_duyet');

    const lan2 = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'minh' },
    });

    expect(lan2.statusCode).toBe(409);
  });
});

describe('P5: Duyệt hồ sơ với id không tồn tại phải bị chặn ở tầng ứng dụng, không 500', () => {
  it('P5: POST duyet id không tồn tại → 4xx, không phải 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/duyet',
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    expect(typeof res.json().error).toBe('string');
  });
});

describe('P6: Giải ngân 500 triệu chia 3 kỳ — phần dư dồn về kỳ cuối, không round-per-kỳ', () => {
  it('P6: 500.000.000 chia 3 kỳ → 166.666.666, 166.666.666, 166.666.668', async () => {
    const dx = await taoDeXuat('HM-2026-8006', 500_000_000, 'lan');
    const duyet = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });
    expect(duyet.statusCode).toBe(200);

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