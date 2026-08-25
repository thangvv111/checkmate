import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Checker đối kháng: probe các biên/luật R1, R2, R6, R7, R4 theo spec.
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

async function layDeXuatTheoSoHoSo(soHoSo: string) {
  const ds = await app.inject({ method: 'GET', url: '/api/de-xuat' });
  return ds.json().find((d: { so_ho_so: string }) => d.so_ho_so === soHoSo);
}

describe('R1: Thẩm quyền duyệt theo số tiền — biên trần chuyên viên', () => {
  it('P1: chuyên viên duyệt đúng trần 500.000.000đ (biên đóng) → hợp lệ', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 500_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'lan' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.trang_thai).toBe('da_duyet');
    expect(body.nguoi_duyet).toBe('lan');
  });
});

describe('R2: Không tự duyệt hồ sơ do chính mình tạo', () => {
  it('P3: trưởng phòng tự duyệt hồ sơ trong thẩm quyền số tiền của chính mình → vẫn bị chặn', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 1_000_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/duyet`,
      headers: { 'x-user': 'hung' },
    });

    expect(res.statusCode).toBe(403);
    const bodyStr = JSON.stringify(res.json()).toLowerCase();
    expect(bodyStr).toMatch(/tự phê duyệt|tự duyệt/);

    const sau = await layDeXuatTheoSoHoSo('HM-2026-8003');
    expect(sau.trang_thai).toBe('cho_duyet');
  });
});

describe('R6: Chia kỳ giải ngân — dồn dư về kỳ cuối', () => {
  it('P4: 500.000.000đ chia 3 kỳ — floor từng kỳ đầu, dư dồn kỳ cuối, tổng khớp', async () => {
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
    expect(kq.cac_ky.map((k: { so_tien: number }) => k.so_tien)).toEqual([
      166_666_666, 166_666_666, 166_666_668,
    ]);
    const tong = kq.cac_ky.reduce((s: number, k: { so_tien: number }) => s + k.so_tien, 0);
    expect(tong).toBe(500_000_000);
  });
});

describe('R7: Giải ngân chỉ hợp lệ khi đã duyệt', () => {
  it('P5: giải ngân đề xuất còn ở trạng thái cho_duyet → bị chặn ở tầng app, không vỡ 500', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 400_000_000, 'hung');

    const res = await app.inject({
      method: 'POST',
      url: `/api/de-xuat/${dx.id}/giai-ngan`,
      payload: { so_ky: 2 },
    });

    expect(res.statusCode).toBe(409);

    const sau = await layDeXuatTheoSoHoSo('HM-2026-8005');
    expect(sau.trang_thai).toBe('cho_duyet');
  });
});

describe('R4: Whitelist lọc trang_thai — chống giá trị dạng SQL-injection-like', () => {
});