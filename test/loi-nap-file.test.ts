import { describe, it, expect } from 'vitest';
import { fileLoadError } from '../packages/harness/src/sandbox.js';
import type { ProbeResult } from '../packages/harness/src/sandbox.js';

// specs/R2.15 — file probe không nạp được thì bộ chạy vẫn xuất JUnit XML hợp lệ, nhưng bên trong chỉ
// có đúng một testcase mang tên file. Đếm nó như một test đã chạy là tự báo xanh trên lượt chưa chạy gì.

const tc = (title: string, status: ProbeResult['status'], message = ''): ProbeResult => ({
  title,
  status,
  message,
  file: 'checker_probe.probe.test.ts',
});

describe('fileLoadError', () => {
  it('nhận ra ca file không nạp được và trả về nguyên nhân', () => {
    const kq = fileLoadError([tc('test/checker_probe.probe.test.ts', 'failed', "Cannot find package 'yaml'")], 'test/checker_probe.probe.test.ts');
    expect(kq).toContain('Cannot find package');
  });

  it('nhận cả khi bộ chạy chỉ ghi tên file, không ghi đường dẫn', () => {
    expect(fileLoadError([tc('checker_probe.probe.test.ts', 'failed', 'SyntaxError')], 'test/checker_probe.probe.test.ts')).toBe('SyntaxError');
  });

  it('không nói được lý do thì vẫn phải báo là không nạp được, không trả null', () => {
    expect(fileLoadError([tc('test/x.probe.test.ts', 'failed')], 'test/x.probe.test.ts')).toBe('bộ chạy test không nói lý do');
  });

  it('một probe thật bị đỏ KHÔNG phải lỗi nạp file', () => {
    expect(fileLoadError([tc('P1: hạn mức biên', 'failed', 'expected 500 to be 200')], 'test/x.probe.test.ts')).toBeNull();
  });

  it('nhiều testcase nghĩa là file đã nạp được', () => {
    expect(fileLoadError([tc('P1: a', 'failed'), tc('P2: b', 'passed')], 'test/x.probe.test.ts')).toBeNull();
  });

  it('HAI testcase cùng mang tên file vẫn là file đã nạp được — phép đếm là gác riêng', () => {
    // Ca sinh ra từ đột biến ở change `requirements-for-covered-rules`: bỏ điều kiện «đúng MỘT testcase»
    // mà không ca nào đỏ, vì mọi ca hiện có đều bị phép kiểm title chặn trước. Tức vế đếm chưa được gác.
    //
    // Nó là gác riêng thật: một bộ chạy xuất hai testcase cùng mang tên file (lỗi nạp báo hai lần) thì
    // phép kiểm title cho qua, và chỉ phép đếm mới phân biệt được «file không nạp được» với «file nạp
    // được và có hai test».
    const ten = 'test/x.probe.test.ts';
    expect(fileLoadError([tc(ten, 'failed'), tc(ten, 'failed')], ten)).toBeNull();
  });

  it('một testcase xanh duy nhất không phải lỗi nạp', () => {
    expect(fileLoadError([tc('P1: a', 'passed')], 'test/x.probe.test.ts')).toBeNull();
  });

  it('không có testcase nào thì để đường khác xử lý, không nhận vơ', () => {
    expect(fileLoadError([], 'test/x.probe.test.ts')).toBeNull();
  });
});
