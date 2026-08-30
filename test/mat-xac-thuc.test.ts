import { describe, it, expect } from 'vitest';
import { MAU_MAT_XAC_THUC, coVeLaTraLoiModel, matXacThuc } from '../packages/harness/src/model.js';

// Claude Code CLI báo mất xác thực bằng cách IN RA STDOUT rồi thoát 0 (specs/R3.12–R3.14).
// Nhưng mẫu chữ THÔI thì không đủ: repo nào có spec về xác thực — như chính repo này — sẽ sinh probe
// chứa 'unauthorized', 'session expired'... và bị chặn oan. Đo được: 3/4 câu trả lời hợp lệ bị bắt
// nhầm, lượt chấm PR #2 chết oan dù `claude login` vừa chạy OK. Phân biệt bằng HÌNH DẠNG output.

describe('mẫu chữ — điều kiện CẦN', () => {
  for (const v of [
    'Failed to authenticate: OAuth session expired and could not be refreshed',
    'Not logged in. Please run /login',
    'Authentication failed',
    'Invalid API key · Please run /login',
    'Error: Unauthorized',
  ]) {
    it(`khớp: ${v.slice(0, 46)}`, () => expect(MAU_MAT_XAC_THUC.test(v)).toBe(true));
  }
});

describe('coVeLaTraLoiModel — nhận ra câu trả lời thật qua hình dạng', () => {
  it('khối fence là câu trả lời', () => {
    expect(coVeLaTraLoiModel('```json\n{"probes": []}\n```')).toBe(true);
  });

  it('JSON trần là câu trả lời', () => {
    expect(coVeLaTraLoiModel('{"probes": [{"id": "P1"}]}')).toBe(true);
  });

  it('văn dài là câu trả lời', () => {
    expect(coVeLaTraLoiModel('x'.repeat(500))).toBe(true);
  });

  it('một dòng ngắn trơ KHÔNG phải câu trả lời', () => {
    expect(coVeLaTraLoiModel('Failed to authenticate: OAuth session expired')).toBe(false);
  });
});

describe('matXacThuc — kết luận cuối', () => {
  it('CLI báo lỗi trên stdout, ngắn và trơ → đúng là mất xác thực', () => {
    expect(matXacThuc('Failed to authenticate: OAuth session expired', '')).toBe(true);
  });

  it('stderr khớp mẫu là chắc chắn — model không trả lời qua stderr', () => {
    expect(matXacThuc('{"probes": []}', 'Error: Unauthorized')).toBe(true);
  });

  it('KHÔNG bắt nhầm probe nói về 401 Unauthorized — ca đã làm chết lượt chấm PR #2', () => {
    const traLoi = '```json\n{"probes": [{"id": "P1", "ten": "chọn nhà cung cấp chưa kiểm bị từ chối", "ky_vong": "HTTP 401 Unauthorized"}]}\n```';
    expect(MAU_MAT_XAC_THUC.test(traLoi)).toBe(true); // mẫu chữ vẫn khớp...
    expect(matXacThuc(traLoi, '')).toBe(false); // ...nhưng hình dạng cứu được
  });

  it('KHÔNG bắt nhầm probe nói về authentication failed / session expired', () => {
    expect(matXacThuc('{"probes": [{"id": "P2", "ten": "token sai thì authentication failed"}]}', '')).toBe(false);
    expect(matXacThuc('{"probes": [{"id": "P3", "ten": "phiên hết hạn — session expired"}]}', '')).toBe(false);
  });

  it('output bình thường không liên quan thì không phải mất xác thực', () => {
    expect(matXacThuc('{"probes": [{"id": "P4", "ten": "kiểm biên hạn mức"}]}', '')).toBe(false);
  });
});
