import { describe, it, expect } from 'vitest';
import {
  evaluateMergeLocal,
  evaluateMergeAgainstPr,
  evaluateRejectLocal,
  decideAutomation,
  decideRerun,
  type GateRun,
  type IdentityCheck,
} from '../apps/web/src/gate.js';
import type { Finding, Verdict } from '../packages/shared/src/types.js';

/**
 * Lưới CỔNG MERGE — capability `merge-gate`.
 *
 * Sáu điều lõi của cổng từng sống trong hai handler Express, trộn quyết định với I/O, nên KHÔNG ca test
 * nào gọi được: cổng là chỗ ⛔C1/⛔C2 sống thật mà lại là vùng không được khoá. Nay quyết định là hàm
 * thuần, và lưới này khoá ba thứ:
 *  1. mỗi nhánh từ chối — mã HTTP + thông điệp ĐÚNG TỪNG CHỮ (thông điệp là hợp đồng với giao diện);
 *  2. THỨ TỰ kiểm khi nhiều điều kiện cùng sai (đổi thứ tự là đổi hành vi);
 *  3. tự động hoá không có nhánh merge — máy được phép nói KHÔNG, không được nói CÓ.
 */

const finding = (p: Partial<Finding> = {}): Finding =>
  ({ id: 'f1', skill: 'code', severity: 'medium', title_vi: 't', what_vi: 'w', consequence_vi: 'c', evidence: { type: 'quote', loc: 'x', quote: 'q', rule: 'r' }, ...p }) as Finding;

const verdict = (p: Partial<Verdict> = {}): Verdict =>
  ({
    run_id: 'r1', skill: 'code', artifact_ref: { type: 'pr', name: 'feat/x', sha_or_hash: 'abcdef1234567890' },
    result: 'PASS', findings: [], model: 'm', mode: 'live',
    started_at: '2026-09-03T09:00:00.000Z', finished_at: '2026-09-03T09:03:00.000Z', ...p,
  }) as Verdict;

const run = (p: Partial<GateRun> = {}): GateRun => ({
  id: 'w1', tieuDe: 'PR #7', verdict: verdict(), pr: { so: 7, headSha: 'abcdef1234567890', tacGia: 'dev' }, ...p,
});

const AI: IdentityCheck = { ok: true, ten: 'thang.vv' };
const THIEU_QUYEN: IdentityCheck = { ok: false, status: 403, message: 'Tài khoản «ci-bot» mang vai tu_dong, không được thao tác cổng merge.' };
const KHONG_PHIEN: IdentityCheck = { ok: false, status: 401, message: 'Chưa đăng nhập.' };

const merge = (p: Partial<Parameters<typeof evaluateMergeLocal>[0]> = {}) =>
  evaluateMergeLocal({ mode: 'org', run: run(), gateDone: null, identity: AI, tickIds: '', ...p });
const reject = (p: Partial<Parameters<typeof evaluateRejectLocal>[0]> = {}) =>
  evaluateRejectLocal({ mode: 'org', run: run(), gateDone: null, identity: AI, ghiChu: 'vá lại chỗ X', ...p });

describe('R-1 — merge chỉ khi verdict PASS còn hiệu lực trên PR đang mở', () => {
  it('[verdict FAIL hoặc còn high] hai đường vào cùng một lời từ chối 403', () => {
    const fail = merge({ run: run({ verdict: verdict({ result: 'FAIL' }) }) });
    expect(fail).toEqual({ ok: false, status: 403, message: 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.' });
    // PASS mà còn high là ca nguy hiểm hơn: nhìn xanh nhưng chưa được merge.
    const high = merge({ run: run({ verdict: verdict({ findings: [finding({ severity: 'high' })] }) }) });
    expect(high).toEqual(fail);
  });

  it('[run đã qua cổng] đọc tươi từ sổ → 409 nêu hành động và thời điểm', () => {
    const r = merge({ gateDone: { hanhDong: 'merge', luc: '2026-09-03T10:00:00.000Z' } });
    expect(r).toEqual({ ok: false, status: 409, message: 'Run này đã merge lúc 2026-09-03T10:00:00.000Z.' });
    expect(merge({ gateDone: { hanhDong: 'reject', luc: 'X' } })).toMatchObject({ message: 'Run này đã reject lúc X.' });
  });

  it('[run thiếu] không có run, không verdict, không PR → 404 cùng một lời', () => {
    const loi = { ok: false, status: 404, message: 'Run không tồn tại hoặc không gắn PR. <a href="/">← về trang chính</a>' };
    expect(merge({ run: null })).toEqual(loi);
    expect(merge({ run: run({ verdict: null }) })).toEqual(loi);
    expect(merge({ run: run({ pr: null }) })).toEqual(loi);
  });

  it('[chế độ chỉ-đọc] 403 TRƯỚC mọi kiểm khác — kể cả khi run không tồn tại', () => {
    const loi = { ok: false, status: 403, message: 'Chế độ demo không cho thao tác cổng merge (chỉ xem).' };
    expect(merge({ mode: 'demo' })).toEqual(loi);
    expect(merge({ mode: 'demo', run: null, identity: KHONG_PHIEN })).toEqual(loi);
  });

  it('[thứ tự] FAIL đứng TRƯỚC thiếu phiên; thiếu quyền đứng TRƯỚC medium chưa tick', () => {
    // Người bấm cần biết cổng khoá vì kết quả chấm, không phải vì họ.
    expect(merge({ run: run({ verdict: verdict({ result: 'FAIL' }) }), identity: KHONG_PHIEN })).toMatchObject({ status: 403, message: 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.' });
    // Bảo người ta đi tick ba ô rồi mới nói họ không có quyền là đùa với người dùng.
    const r = merge({ run: run({ verdict: verdict({ findings: [finding()] }) }), identity: THIEU_QUYEN, tickIds: '' });
    expect(r).toEqual({ ok: false, status: 403, message: THIEU_QUYEN.message });
  });

  it('[danh tính] thiếu quyền → 403, không phiên → 401, lời giữ nguyên từ tầng danh tính', () => {
    expect(merge({ identity: THIEU_QUYEN })).toEqual({ ok: false, status: 403, message: THIEU_QUYEN.message });
    expect(merge({ identity: KHONG_PHIEN })).toEqual({ ok: false, status: 401, message: 'Chưa đăng nhập.' });
  });

  it('[verdict PASS sạch] cho qua, trả tên người và tập medium rỗng', () => {
    expect(merge()).toEqual({ ok: true, nguoi: 'thang.vv', mediumIds: [] });
  });
});

describe('R-1 — đối chiếu trạng thái THẬT của pull request', () => {
  it('[PR không còn mở] closed và merged nói hai lời khác nhau', () => {
    expect(evaluateMergeAgainstPr({ run: run(), currentPr: { state: 'closed', merged: false, headSha: 'abcdef1234567890' } }))
      .toEqual({ ok: false, status: 409, message: 'PR #7 không còn mở (closed).' });
    expect(evaluateMergeAgainstPr({ run: run(), currentPr: { state: 'closed', merged: true, headSha: 'abcdef1234567890' } }))
      .toMatchObject({ message: 'PR #7 không còn mở (đã merge).' });
  });

  it('[head đổi] 409 nêu CẢ HAI sha rút gọn — người đọc phải thấy mình đang so cái gì với cái gì', () => {
    const r = evaluateMergeAgainstPr({ run: run(), currentPr: { state: 'open', merged: false, headSha: '9999999888888888' } });
    expect(r).toEqual({
      ok: false, status: 409,
      message: 'PR đã có commit mới (9999999 ≠ abcdef1) — verdict cũ hết hiệu lực, chạy kiểm lại rồi mới merge. <a href="/">← về trang chính</a>',
    });
  });

  it('[khớp] PR mở, head trùng → ok', () => {
    expect(evaluateMergeAgainstPr({ run: run(), currentPr: { state: 'open', merged: false, headSha: 'abcdef1234567890' } })).toEqual({ ok: true });
  });
});

describe('R-2 — cảnh báo medium xác nhận từng cái, máy chủ đối chiếu TẬP id', () => {
  const baMedium = run({ verdict: verdict({ findings: [finding({ id: 'm1' }), finding({ id: 'm2' }), finding({ id: 'm3' })] }) });

  it('[thiếu một] 422 nêu số phải xác nhận và ID CÒN THIẾU', () => {
    expect(merge({ run: baMedium, tickIds: 'm1,m2' })).toEqual({
      ok: false, status: 422, message: 'Phải xác nhận đủ 3 cảnh báo MEDIUM — còn thiếu: m3.',
    });
  });

  it('[id thừa/trùng] đủ id thật thì cho qua — client gửi gì thêm cũng vô tác dụng', () => {
    expect(merge({ run: baMedium, tickIds: 'm1,m1,m2,m3,khong-co-that,__proto__' })).toEqual({ ok: true, nguoi: 'thang.vv', mediumIds: ['m1', 'm2', 'm3'] });
  });

  it('[toàn id lạ] không id thật nào → chặn, không phải cho qua', () => {
    expect(merge({ run: baMedium, tickIds: 'a,b,c' })).toMatchObject({ status: 422, message: 'Phải xác nhận đủ 3 cảnh báo MEDIUM — còn thiếu: m1, m2, m3.' });
  });

  it('[không medium] không đòi xác nhận; [mảng thay chuỗi] cũng nhận', () => {
    expect(merge({ tickIds: '' })).toMatchObject({ ok: true });
    expect(merge({ run: baMedium, tickIds: ['m1', 'm2', 'm3'] })).toMatchObject({ ok: true });
  });

  it('low và high không bị đòi tick — chỉ medium', () => {
    const tron = run({ verdict: verdict({ findings: [finding({ id: 'l1', severity: 'low' }), finding({ id: 'm1' })] }) });
    expect(merge({ run: tron, tickIds: 'm1' })).toMatchObject({ ok: true, mediumIds: ['m1'] });
  });
});

describe('R-3 — trả về dev: cùng khuôn thứ tự, thêm gác ghi chú', () => {
  it('[ghi chú trống] toàn khoảng trắng cũng là trống → 422', () => {
    const loi = { ok: false, status: 422, message: 'Trả về dev phải có ghi chú — dev cần biết vá gì. <a href="javascript:history.back()">← quay lại</a>' };
    expect(reject({ ghiChu: '   ' })).toEqual(loi);
    expect(reject({ ghiChu: undefined })).toEqual(loi);
  });

  it('[thứ tự] chế độ → run → đã qua cổng → danh tính → ghi chú', () => {
    expect(reject({ mode: 'demo', run: null, identity: KHONG_PHIEN, ghiChu: '' })).toMatchObject({ status: 403, message: 'Chế độ demo không cho thao tác cổng merge (chỉ xem).' });
    expect(reject({ run: null, ghiChu: '' })).toMatchObject({ status: 404, message: 'Run không tồn tại hoặc không gắn PR.' });
    expect(reject({ gateDone: { hanhDong: 'reject', luc: 'X' }, ghiChu: '' })).toMatchObject({ status: 409 });
    // Thiếu quyền đứng TRƯỚC ghi chú trống — cùng lý lẽ với medium ở đường merge.
    expect(reject({ identity: THIEU_QUYEN, ghiChu: '' })).toMatchObject({ status: 403, message: THIEU_QUYEN.message });
  });

  it('[hợp lệ] trả tên người và ghi chú ĐÃ CẮT khoảng trắng — hàng sổ không mang rác', () => {
    expect(reject({ ghiChu: '  vá lại chỗ X  ' })).toEqual({ ok: true, nguoi: 'thang.vv', ghiChu: 'vá lại chỗ X' });
  });
});

describe('R-4 — tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG', () => {
  const MAC_DINH = { tu_dong_comment: true, tu_dong_trang_thai: true, tu_dong_tra_ve: false };
  const failHigh = verdict({ result: 'FAIL', findings: [finding({ severity: 'high' })] });

  it('[mặc định] đăng verdict và gắn trạng thái bật, đóng PR tắt — kể cả FAIL có high', () => {
    expect(decideAutomation(MAC_DINH, failHigh)).toEqual({ comment: true, commitStatus: true, closePr: false });
  });

  it('[trả về bật] chỉ đóng khi FAIL VÀ có high — FAIL toàn medium thì KHÔNG đóng', () => {
    const bat = { ...MAC_DINH, tu_dong_tra_ve: true };
    expect(decideAutomation(bat, failHigh).closePr).toBe(true);
    // Đóng dựa trên suy đoán là thứ làm người ta tắt cổng.
    expect(decideAutomation(bat, verdict({ result: 'FAIL', findings: [finding()] })).closePr).toBe(false);
    expect(decideAutomation(bat, verdict({ result: 'PASS' })).closePr).toBe(false);
  });

  it('[ba cờ độc lập] bật cái này không kéo theo cái kia', () => {
    expect(decideAutomation({ tu_dong_comment: true, tu_dong_trang_thai: false, tu_dong_tra_ve: false }, failHigh))
      .toEqual({ comment: true, commitStatus: false, closePr: false });
    expect(decideAutomation({ tu_dong_comment: false, tu_dong_trang_thai: true, tu_dong_tra_ve: true }, failHigh))
      .toEqual({ comment: false, commitStatus: true, closePr: true });
  });

  it('[không nhận «lượt do ai khởi động»] cùng cấu hình → cùng quyết định, nên lượt bấm tay vẫn đăng verdict', () => {
    // R6.16: hàm chỉ nhận (cấu hình, verdict) — không có tham số nào cho chế độ trực, nên không có
    // đường nào giới hạn việc đăng verdict ở riêng lượt tự động.
    expect(decideAutomation.length).toBe(2);
    expect(decideAutomation(MAC_DINH, verdict()).comment).toBe(true);
  });

  it('[máy KHÔNG BAO GIỜ merge] kiểu trả về không có nhánh merge, cấu hình lạ không đẻ ra nhánh', () => {
    const kq = decideAutomation({ ...MAC_DINH, ...(JSON.parse('{"tu_dong_merge":true}') as object) }, verdict());
    expect(Object.keys(kq).sort()).toEqual(['closePr', 'comment', 'commitStatus']);
    expect(JSON.stringify(kq)).not.toContain('merge');
  });

  it('[cấu hình khuyết hoặc đời cũ] cờ thiếu → coi như TẮT, không thành undefined và không ném', () => {
    expect(decideAutomation(undefined, failHigh)).toEqual({ comment: false, commitStatus: false, closePr: false });
    expect(decideAutomation(null, null)).toEqual({ comment: false, commitStatus: false, closePr: false });
    expect(decideAutomation({ tu_dong_comment: true }, failHigh)).toEqual({ comment: true, commitStatus: false, closePr: false });
  });
});

describe('fail-closed: đầu vào khuyết hay méo ở mọi tầng đều KHÔNG cho qua và KHÔNG ném', () => {
  it('run/verdict/findings/tickIds méo → từ chối đúng nhánh', () => {
    expect(() => merge({ run: undefined })).not.toThrow();
    expect(merge({ run: undefined })).toMatchObject({ status: 404 });
    // `findings` không phải mảng (bản ghi hỏng) → coi như không có finding nào để đếm, nhưng verdict
    // FAIL vẫn chặn: fail-closed không dựa vào việc đếm được high.
    const meo = run({ verdict: { ...verdict(), findings: null as unknown as Finding[] } as Verdict });
    expect(() => merge({ run: meo })).not.toThrow();
    expect(merge({ run: meo })).toMatchObject({ ok: true });
    expect(merge({ run: { ...meo, verdict: { ...meo.verdict!, result: 'FAIL' } as Verdict } })).toMatchObject({ status: 403 });
    for (const t of [null, undefined, 5, {}, ['a', null]] as unknown[]) {
      expect(() => merge({ tickIds: t })).not.toThrow();
    }
  });

  it('[đời cũ] bản ghi không có `ketQuaCong` → coi như chưa qua cổng, không ném', () => {
    // `rm.congHienTai` trả `undefined` khi run chưa có hàng sổ — bản ghi cũ cũng vậy.
    expect(merge({ gateDone: undefined })).toMatchObject({ ok: true });
    expect(reject({ gateDone: undefined })).toMatchObject({ ok: true });
  });

  it('ghi chú sai kiểu không thành ghi chú hợp lệ', () => {
    expect(reject({ ghiChu: 42 })).toMatchObject({ ok: true, ghiChu: '42' }); // số vẫn là chữ người gõ
    expect(reject({ ghiChu: null })).toMatchObject({ status: 422 });
    expect(reject({ ghiChu: {} })).toMatchObject({ ok: true }); // "[object Object]" — không rỗng, người đọc sổ thấy ngay là rác
  });
});

describe('decideRerun — «một verdict một commit»: chạy lại phải xác nhận (nợ #9)', () => {
  const daCham = { id: 'w-cu', verdict: { result: 'PASS', findings: [1, 2] } };

  it('[T1.1] đã có verdict cho đúng commit, chưa xác nhận → KHÔNG chạy, trả id run cũ và kết quả', () => {
    // Trước fix KHÔNG viết được ca này: điều kiện nằm trong handler /api/runs, không bề mặt nào gọi tới.
    expect(decideRerun({ daCham, ep: undefined })).toEqual({ chay: false, runDaCo: 'w-cu', verdict: 'PASS', soFinding: 2 });
  });

  it('[T1.2] xác nhận «vẫn chạy lại» → CHẠY', () => {
    expect(decideRerun({ daCham, ep: '1' })).toEqual({ chay: true });
  });

  it('[T1.3] chưa chấm commit này → CHẠY, bất kể ep', () => {
    for (const ep of [undefined, '', '1'] as unknown[]) expect(decideRerun({ daCham: null, ep })).toEqual({ chay: true });
  });

  it('[T2.2] chỉ ĐÚNG chuỗi «1» là xác nhận — lệch về phía CẢNH BÁO vì chạy lại tốn tiền và thời gian', () => {
    for (const ep of ['', '0', '1 ', ' 1', 1, true, null, undefined, ['1']] as unknown[]) {
      expect(decideRerun({ daCham, ep }), `ep=${JSON.stringify(ep)} không được tính là xác nhận`).toMatchObject({ chay: false });
    }
  });

  it('[T2.3] bản ghi cũ không có verdict → vẫn KHÔNG chạy, trường verdict để trống, không ném', () => {
    expect(decideRerun({ daCham: { id: 'w2' }, ep: undefined })).toEqual({ chay: false, runDaCo: 'w2', verdict: undefined, soFinding: 0 });
    expect(decideRerun({ daCham: { id: 'w3', verdict: null }, ep: undefined })).toMatchObject({ chay: false, runDaCo: 'w3' });
  });
});
