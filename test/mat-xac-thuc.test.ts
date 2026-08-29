import { describe, it, expect } from 'vitest';
import { MAU_MAT_XAC_THUC } from '../packages/harness/src/model.js';

// Claude Code CLI báo mất xác thực bằng cách IN RA STDOUT rồi thoát 0. Không nhận ra thì harness tưởng
// đó là câu trả lời của model, rồi ném tiếp "không tìm thấy JSON" — người đọc log đi sửa nhầm chỗ.

describe('nhận diện mất xác thực của CLI', () => {
  const phaiBat = [
    'Failed to authenticate: OAuth session expired and could not be refreshed',
    'Not logged in. Please run /login',
    'Authentication failed',
    'Session expired',
    'Invalid API key · Please run /login',
    'Error: Unauthorized',
    'OAuth token invalid',
  ];
  for (const v of phaiBat) {
    it(`bắt được: ${v.slice(0, 46)}`, () => expect(MAU_MAT_XAC_THUC.test(v)).toBe(true));
  }

  const khongDuocBat = [
    '```json\n{"probes": [{"id": "P1", "ten": "kiểm quyền truy cập"}]}\n```',
    'Probe P2 kiểm phiên đăng nhập của người dùng cuối hết hạn sau 12 giờ',
    'expected 401 to be 200',
  ];
  for (const v of khongDuocBat) {
    it(`KHÔNG bắt nhầm: ${v.slice(0, 42)}`, () => expect(MAU_MAT_XAC_THUC.test(v)).toBe(false));
  }
});
