import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runPage, findingHtml, verdictHtml } from '../apps/web/src/ui.js';
import type { RunMeta, StoredEvent } from '../apps/web/src/runs.js';
import type { Finding, Verdict } from '../packages/shared/src/types.js';

/**
 * Lưới màn Run — canh hai tính chất mà `tsc` không nhìn thấy:
 *
 *  1. **Lượt đã kết thúc là dữ liệu tĩnh.** Trước đợt này, mở một lượt của tuần trước cũng phải phát
 *     lại TOÀN BỘ dòng sự kiện vào DOM mới có nội dung — nên không có kịch bản là trang trắng, và
 *     mất kết nối là hỏng. Nay máy chủ dựng thẳng.
 *  2. **Chế độ xem-lại không được chứa hành động một chiều.** Bản trước bày một nút Merge THẬT trên
 *     `/runs/<id>?replay=1`, và chế độ đó vốn dựng cho lúc trình bày trước người khác — tức đúng lúc
 *     một cú bấm nhầm gây hậu quả không lùi được.
 */

const finding = (p: Partial<Finding> = {}): Finding =>
  ({
    id: 'f1',
    severity: 'blocking',
    title_vi: 'Cổng bỏ qua nhánh gốc',
    what_vi: 'Hàm phân loại không đọc kết quả nhánh gốc',
    consequence_vi: 'Mọi probe đỏ thành hồi quy, kể cả lỗi có sẵn',
    evidence: { type: 'test_run', probe_name: 'probe-7', expected: 'pass', actual: 'AssertionError' },
    ...p,
  }) as unknown as Finding;

const verdict = (p: Partial<Verdict> = {}): Verdict =>
  ({
    run_id: 'r1',
    skill: 'code',
    artifact_ref: { type: 'pr', name: 'feat/cong', sha_or_hash: 'abcdef1234567890' },
    result: 'FAIL',
    findings: [finding()],
    model: 'claude-opus-5',
    mode: 'live',
    started_at: '2026-09-02T09:00:00.000Z',
    finished_at: '2026-09-02T09:03:00.000Z',
    ...p,
  }) as Verdict;

const meta = (p: Partial<RunMeta> = {}): RunMeta => ({
  id: 'w1',
  tieuDe: 'PR #7 · Sửa cổng',
  skill: 'code',
  trangThai: 'xong',
  batDau: '2026-09-02T09:00:00.000Z',
  pr: { so: 7, headSha: 'abcdef1234567890', tacGia: 'thangvv111' },
  verdict: verdict(),
  ...p,
});

const suKien: StoredEvent[] = [
  { t: 0, e: { type: 'stage', stage: 1, ten: 'Nhận artifact' } },
  { t: 50, e: { type: 'log', msg: 'diff 3400 ký tự' } },
  { t: 900, e: { type: 'stage', stage: 4, ten: 'Chạy & đối chiếu' } },
  { t: 950, e: { type: 'log', msg: 'Nhánh gốc: 4 pass' } },
];

describe('lượt đã kết thúc — máy chủ dựng sẵn, không cần luồng', () => {
  const html = runPage(meta(), false, suKien);

  it('phản hồi ĐẦU TIÊN đã có verdict, finding và log — không cần lượt gọi thứ hai', () => {
    expect(html, 'thiếu verdict').toContain('✗ FAIL — bị bác');
    expect(html, 'thiếu finding').toContain('Cổng bỏ qua nhánh gốc');
    expect(html, 'thiếu log đã chạy').toContain('Nhánh gốc: 4 pass');
  });

  it('KHÔNG mở luồng sự kiện cho lượt đã kết thúc', () => {
    // Đây là chỗ đổi bản chất: dữ liệu tĩnh thì giao như dữ liệu tĩnh. Mở luồng ở đây nghĩa là mỗi
    // lần ai đó mở lại một lượt cũ, máy chủ lại đọc và đẩy cả dòng sự kiện qua mạng.
    expect(html).not.toContain('EventSource');
  });

  it('log rơi đúng bước của nó, không dồn hết vào bước một', () => {
    const b4 = /id="logs-4">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    expect(b4).toContain('Nhánh gốc: 4 pass');
    const b1 = /id="logs-1">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    expect(b1).toContain('diff 3400');
    expect(b1, 'log của bước 4 không được lọt vào bước 1').not.toContain('Nhánh gốc');
  });

  it('không còn chỗ nào bảo người dùng tự tải lại trang để mở cổng', () => {
    // Câu đó là triệu chứng của nửa server nửa client: cổng do máy chủ dựng lúc chưa có verdict,
    // verdict do trình duyệt dựng sau — và người dùng gánh chỗ nối.
    const nguon = readFileSync('apps/web/src/ui.ts', 'utf8');
    expect(nguon).not.toContain('Tải lại trang để mở cổng');
  });
});

describe('lượt đang chạy — dựng phần đã có, luồng nối phần còn lại', () => {
  const html = runPage(meta({ trangThai: 'dang_chay', verdict: undefined }), false, suKien);

  it('trang mở ra đã có log tới thời điểm này, không trống', () => {
    expect(html).toContain('diff 3400 ký tự');
    expect(html).toContain('Nhánh gốc: 4 pass');
  });

  it('luồng nối TỪ ĐÚNG CHỖ đã dựng — không nhận lại thứ đã hiện', () => {
    expect(html, `phải mở luồng từ tu=${suKien.length}`).toContain(`/events?tu=${suKien.length}`);
  });

  it('bước đang chạy được đánh dấu khác bước đã xong', () => {
    expect(html).toMatch(/data-s="1" class="done"/);
    expect(html).toMatch(/data-s="4" class="on"/);
  });
});

describe('trình diễn — chế độ xem lại, cổng phải chỉ-đọc', () => {
  const html = runPage(meta(), true, suKien);

  it('KHÔNG có đường nào tới hành động cổng', () => {
    expect(html, 'còn form merge').not.toContain('/merge');
    expect(html, 'còn form trả về dev').not.toContain('/reject');
    expect(html).toContain('Cổng merge — chỉ đọc');
  });

  it('nói rõ đây là bản phát lại, không chỉ vô hiệu hoá nút trong im lặng', () => {
    expect(html).toMatch(/trình diễn/i);
    expect(html).toContain('Thoát trình diễn');
  });

  it('vế đối chứng: KHÔNG trình diễn thì cổng hoạt động thật', () => {
    // Thiếu ca này thì một bản «khoá cổng mọi lúc» cũng xanh ở ca trên.
    const that = runPage(meta({ verdict: verdict({ result: 'PASS', findings: [] }) }), false, suKien);
    expect(that).toContain('/merge');
    expect(that).toContain('/reject');
  });

  it('máy chủ không còn nhánh phát-theo-nhịp — chỉ MỘT đường phát sự kiện', () => {
    const nguon = readFileSync('apps/web/src/server.ts', 'utf8');
    expect(nguon, 'còn tham số timed').not.toContain("req.query.timed");
    expect(nguon, 'còn tham số speed').not.toContain('req.query.speed');
  });
});

describe('verdict hết hiệu lực — nói ra TRƯỚC khi người dùng bấm', () => {
  it('head đổi giữa lượt chấm → banner hiện ngay khi mở trang', () => {
    const html = runPage(
      meta({ verdict: verdict({ head_moved: { new_sha: 'fedcba9876543210', at: '2026-09-02T09:02:00.000Z' } }) }),
      false,
      suKien,
    );
    expect(html).toContain('Verdict hết hiệu lực');
    expect(html).toContain('fedcba9');
  });

  it('vế đối chứng: head không đổi → không banner nào', () => {
    expect(runPage(meta(), false, suKien)).not.toContain('Verdict hết hiệu lực');
  });
});

describe('một hàm dựng, dùng chung hai đường', () => {
  it('trình duyệt KHÔNG tự ghép HTML của finding — nó nhận chuỗi đã dựng', () => {
    // Hai bản dựng song song thì bản ít người nhìn hơn sẽ lệch trước, và lệch im lặng.
    const nguon = readFileSync('apps/web/src/ui.ts', 'utf8');
    const js = /const JS_VE = `([\s\S]*?)`;/.exec(nguon)?.[1] ?? '';
    expect(js.length, 'không tách được kịch bản phía trình duyệt').toBeGreaterThan(200);
    expect(js, 'kịch bản đang tự ghép finding').not.toContain('class="finding');
    expect(js, 'kịch bản đang tự ghép verdict').not.toContain('class="verdict');
    expect(js).toContain('insertAdjacentHTML');
  });

  it('bản ghi verdict ĐỜI CŨ (thiếu mọi trường mới) vẫn dựng được, không ném lỗi', () => {
    const cu = verdict();
    delete (cu as Record<string, unknown>).head_moved;
    expect(() => runPage(meta({ verdict: cu }), false, [])).not.toThrow();
    expect(() => findingHtml(finding())).not.toThrow();
    expect(() => verdictHtml(cu)).not.toThrow();
  });

  it('nội dung ngoài đi qua escape — tiêu đề PR và lời văn finding do model viết', () => {
    const doc = runPage(
      meta({ tieuDe: '<script>x</script>', verdict: verdict({ findings: [finding({ title_vi: '"><img onerror=1>' })] }) }),
      false,
      [],
    );
    expect(doc).not.toContain('<script>x</script>');
    expect(doc).not.toContain('<img onerror=1>');
    expect(doc).toContain('&lt;script&gt;');
  });
});
