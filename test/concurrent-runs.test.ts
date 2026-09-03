import { describe, it, expect } from 'vitest';
import { evaluateStartRun, TRAN_SONG_SONG } from '../apps/web/src/runs.js';
import { refNames } from '../apps/web/src/github.js';

/**
 * Lưới CHẠY SONG SONG — capability `concurrent-runs` (backfill R8 + nợ có tên #10).
 *
 * Bốn thứ giữ cho việc chấm nhiều PR cùng lúc không hỏng: trần lượt đồng thời · một PR một lượt · ref git
 * riêng theo PR · môi trường tiến trình con dựng bằng danh sách cho phép (ca của vế cuối ở `env-cli`).
 * Trước change này, hai gác đầu chỉ khoá được nửa DỮ LIỆU (`runningCount`, `isPrRunning` ở kho); nửa
 * QUYẾT ĐỊNH nằm trong handler nên không ca nào gọi tới, và hai đường (bấm tay, chế độ trực) mỗi đường
 * viết điều kiện riêng — đúng khuôn «cửa song sinh».
 */

describe('R-1 — trần lượt chạy đồng thời', () => {
  it('[T1.1] đủ trần → từ chối 429, lý do quá tải', () => {
    expect(evaluateStartRun({ soDangChay: 2, tran: 2 })).toEqual({ chay: false, ma: 429, lyDo: 'qua_tai' });
  });

  it('[T1.2] dưới trần, PR không chạy → cho khởi động', () => {
    expect(evaluateStartRun({ soDangChay: 1, tran: 2, prDangChay: false })).toEqual({ chay: true });
    expect(evaluateStartRun({ soDangChay: 0, tran: 2 })).toEqual({ chay: true });
  });

  it('[T1.3] VƯỢT trần (dọn mồ côi hụt) vẫn từ chối — không âm thầm cho qua', () => {
    expect(evaluateStartRun({ soDangChay: 3, tran: 2 })).toMatchObject({ chay: false, ma: 429 });
  });

  it('trần mặc định là hằng có tên, dùng chung cho mọi đường', () => {
    expect(TRAN_SONG_SONG).toBe(2);
    // Không truyền `tran` → dùng hằng, không phải một số viết tay ở chỗ gọi.
    expect(evaluateStartRun({ soDangChay: TRAN_SONG_SONG })).toMatchObject({ chay: false, ma: 429 });
    expect(evaluateStartRun({ soDangChay: TRAN_SONG_SONG - 1 })).toEqual({ chay: true });
  });
});

describe('R-2 — một pull request chỉ có một lượt chấm đang chạy', () => {
  it('[T1.4] PR đang chạy, dưới trần → từ chối 409', () => {
    expect(evaluateStartRun({ soDangChay: 0, tran: 2, prDangChay: true })).toEqual({ chay: false, ma: 409, lyDo: 'pr_dang_cham' });
  });

  it('[T1.5] PR khác vẫn chạy được khi còn chỗ trong trần', () => {
    expect(evaluateStartRun({ soDangChay: 1, tran: 2, prDangChay: false })).toEqual({ chay: true });
  });

  it('[T1.6] THỨ TỰ: đủ trần VÀ PR đang chạy → lời của TRẦN (429), không phải 409', () => {
    // Gác rẻ hơn và chung hơn đứng trước: khi cả hai cùng đúng, người dùng cần biết «hệ đang bận».
    expect(evaluateStartRun({ soDangChay: 2, tran: 2, prDangChay: true })).toMatchObject({ ma: 429, lyDo: 'qua_tai' });
  });
});

describe('fail-closed: đầu vào méo KHÔNG được cho qua', () => {
  it('[T1.7] số đang chạy sai kiểu/khuyết → chặn, không ném', () => {
    for (const x of [undefined, null, 'hai', NaN, {}, []] as unknown[]) {
      expect(() => evaluateStartRun({ soDangChay: x })).not.toThrow();
      expect(evaluateStartRun({ soDangChay: x }), `soDangChay=${JSON.stringify(x)}`).toMatchObject({ chay: false, ma: 429 });
    }
  });

  it('[T1.7b] trần méo → rơi về hằng, KHÔNG rơi về «không giới hạn»', () => {
    for (const t of [0, -1, NaN, 'nhieu', null, undefined] as unknown[]) {
      expect(evaluateStartRun({ soDangChay: TRAN_SONG_SONG, tran: t }), `tran=${JSON.stringify(t)}`).toMatchObject({ chay: false });
      expect(evaluateStartRun({ soDangChay: 0, tran: t })).toEqual({ chay: true });
    }
  });
});

describe('R-3 — lượt chấm không dùng chung ref git', () => {
  it('[T1.8] ref head và ref base đều mang số PR, và khác nhau', () => {
    const { headRef, baseRef } = refNames(7);
    expect(headRef).toContain('7');
    expect(baseRef).toContain('7');
    expect(headRef).not.toBe(baseRef);
  });

  it('[T1.9] hai PR khác nhau → bốn ref đôi một khác nhau, kể cả ref NHÁNH GỐC', () => {
    // Đây là chỗ hỏng im lặng: dùng chung ref base thì lượt sau force-update, lượt trước đối chứng nhầm
    // commit — verdict vẫn ra, không dấu hiệu nào cho người đọc.
    const a = refNames(7);
    const b = refNames(8);
    expect(new Set([a.headRef, a.baseRef, b.headRef, b.baseRef]).size).toBe(4);
  });
});
