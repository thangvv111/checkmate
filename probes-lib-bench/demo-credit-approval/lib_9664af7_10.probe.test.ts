import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { moDb } from '../src/db.js';
import { buildApp } from '../src/app.js';

// Probe đối kháng: kiểm R1/R2/R6/R7 sau khi logic thẩm quyền được tách hàm.
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

async function duyet(id: number | string, nguoiDuyet: string) {
  return app.inject({
    method: 'POST',
    url: `/api/de-xuat/${id}/duyet`,
    headers: { 'x-user': nguoiDuyet },
  });
}

describe('P1: Trưởng phòng vượt trần 2 tỷ bị chặn 403', () => {
  it('P1: đề xuất 2.500.000.000đ do lan tạo, hung (truong_phong) duyệt -> 403 vượt hạn mức', async () => {
    const dx = await taoDeXuat('HM-2026-8001', 2_500_000_000, 'lan');
    const res = await duyet(dx.id, 'hung');

    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).toContain('vượt hạn mức');
  });
});

describe('P2: Trưởng phòng duyệt đúng trần 2.000.000.000đ hợp lệ (biên đóng)', () => {
  it('P2: đề xuất đúng 2.000.000.000đ do lan tạo, hung duyệt -> 200 da_duyet', async () => {
    const dx = await taoDeXuat('HM-2026-8002', 2_000_000_000, 'lan');
    const res = await duyet(dx.id, 'hung');

    expect(res.statusCode).toBe(200);
    expect(res.json().trang_thai).toBe('da_duyet');
  });
});

describe('P3: Vi phạm ĐỒNG THỜI R1 và R2 vẫn bị chặn 403', () => {
  it('P3: lan (chuyen_vien) tạo 1 tỷ rồi tự duyệt chính hồ sơ -> 403, không lộ 500', async () => {
    const dx = await taoDeXuat('HM-2026-8003', 1_000_000_000, 'lan');
    const res = await duyet(dx.id, 'lan');

    expect(res.statusCode).not.toBe(500);
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).toBe(403);

    const body = res.json();
    expect(typeof body).toBe('object');
  });
});

describe('P4: Duyệt lại hồ sơ đã ở trạng thái da_duyet -> 409', () => {
  it('P4: duyệt lần 2 bởi người hợp lệ khác -> 409, không ở trạng thái Chờ duyệt', async () => {
    const dx = await taoDeXuat('HM-2026-8004', 300_000_000, 'hung');
    const lanDau = await duyet(dx.id, 'lan');
    expect(lanDau.statusCode).toBe(200);
    expect(lanDau.json().trang_thai).toBe('da_duyet');

    const lanHai = await duyet(dx.id, 'minh');

    expect(lanHai.statusCode).toBe(409);
    expect(JSON.stringify(lanHai.json())).toContain('không ở trạng thái Chờ duyệt');
  });
});

describe('P5: Giải ngân 500tr chia 3 kỳ — dư dồn kỳ cuối, cấm round-per-kỳ', () => {
  it('P5: cac_ky = [166.666.666, 166.666.666, 166.666.668], tổng khớp 500tr', async () => {
    const dx = await taoDeXuat('HM-2026-8005', 500_000_000, 'lan');
    const daDuyet = await duyet(dx.id, 'hung');
    expect(daDuyet.statusCode).toBe(200);

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

describe('P6: Giải ngân với de_xuat_id không tồn tại -> 404, không vỡ 500', () => {
  it('P6: id không tồn tại -> 404, Không tìm thấy đề xuất', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/de-xuat/999999/giai-ngan',
      payload: { so_ky: 3 },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).toContain('Không tìm thấy đề xuất');
  });
});