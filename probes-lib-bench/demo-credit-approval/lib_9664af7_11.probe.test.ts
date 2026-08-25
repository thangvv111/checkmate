import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: vượt quyền theo vai, tự thao tác, biên trần, chia kỳ, app-guard trạng thái.
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

async function layTrangThai(soHoSo: string) {
  const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
  expect(ds.statusCode).toBe(200);
  const dx = ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === soHoSo);
  return dx?.trang_thai;
}

function coThongBaoTuThaoTac(err: string) {
  return /không\s*được\s*tự/i.test(err) || /tự\s*(phê\s*)?duyệt/i.test(err) || /tự\s*từ\s*chối/i.test(err) || /tự\s*thao\s*tác/i.test(err);
}

describe('P1: Trưởng phòng vượt trần 2 tỷ', () => {
  it('P1: trưởng phòng (hung) không được duyệt hồ sơ 2.500.000.000đ do lan tạo', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 2_500_000_000, 'lan');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/vượt hạn mức/i);
    expect(await layTrangThai('HM-2026-8001')).toBe('cho_duyet');
  });
});

describe('P2: Tự từ chối hồ sơ của chính mình', () => {
  it('P2: trưởng phòng (hung) không được tự từ chối hồ sơ do chính mình tạo', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 800_000_000, 'hung');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/tu-choi`,
      headers: { 'x-user': 'hung' },
      payload: { ly_do: 'Thiếu chứng từ thu nhập' },
    });

    expect(res.statusCode).toBe(403);
    expect(coThongBaoTuThaoTac(res.json().error)).toBe(true);
    expect(await layTrangThai('HM-2026-8002')).toBe('cho_duyet');
  });
});

describe('P3: Giám đốc tự duyệt hồ sơ trong thẩm quyền', () => {
  it('P3: giám đốc (minh) không được tự duyệt hồ sơ 5.000.000.000đ dù trong thẩm quyền số tiền', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 5_000_000_000, 'minh');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'minh' },
    });

    expect(res.statusCode).toBe(403);
    expect(coThongBaoTuThaoTac(res.json().error)).toBe(true);
    expect(await layTrangThai('HM-2026-8003')).toBe('cho_duyet');
  });
});

describe('P4: Duyệt đúng biên trần 2.000.000.000đ của trưởng phòng', () => {
  it('P4: trưởng phòng (hung) duyệt hồ sơ đúng bằng 2.000.000.000đ do lan tạo', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 2_000_000_000, 'lan');
    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
  });
});

describe('P5: Chia kỳ 500 triệu / 3 kỳ — dư dồn về kỳ cuối', () => {
  it('P5: giai-ngan 500.000.000đ chia 3 kỳ, kỳ cuối nhận phần dư', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 500_000_000, 'lan');
    await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

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

describe('P6: Giải ngân khi đề xuất còn cho_duyet', () => {
  it('P6: đề xuất chưa duyệt gọi giai-ngan phải bị chặn 409, không rơi xuống 500', async () => {
    const dx = await taoDeXuat('HM-2026-8006', 400_000_000, 'lan');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(409);
    expect(typeof res.json().error).toBe('string');
    expect(res.json().error.length).toBeGreaterThan(0);
  });
});