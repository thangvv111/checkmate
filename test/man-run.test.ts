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
    expect(html, 'thiếu verdict').toContain('class="vd-kq">FAIL<');
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
    expect(html, 'bước đã xong').toContain('class="buoc done" data-s="1"');
    expect(html, 'bước đang chạy').toContain('class="buoc on" data-s="4"');
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
    expect(html, 'phải có lối thoát về bản thật').toContain('href="/runs/w1"');
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

describe('màn Run nói thật về chính lượt chấm', () => {
  const ps = {
    ke_hoach: 10, ghi_nhan: 8, pass: 5, hoi_quy: 1, vi_pham_luat_moi: 0,
    ngoai_pham_vi: 1, nghi_loi_co_san: 0, nghi_van: 0, cai_thien: 0, bo_qua: 0,
    that_lac: [] as string[], luat_da_phu: [] as string[], luat_tong: 0, trigger_distribution: {},
  };

  it('vùng xám probe hiện đủ BỐN số, kể cả khi bằng không', () => {
    // Bốn số này nói lượt chấm KHÔNG nhìn thấy gì. Giấu chúng đi thì một verdict PASS mỏng trông
    // giống hệt một verdict PASS dày — và người đọc mất đúng thứ cần để biết nên tin đến đâu.
    const html = verdictHtml(verdict({ probe_stats: ps }));
    for (const k of ['nghi vấn', 'bỏ qua', 'thất lạc', 'nghi lỗi có sẵn']) {
      expect(html, `vùng xám thiếu «${k}»`).toContain(k);
    }
    expect(html, 'giá trị không vẫn phải hiện').toContain('class="v">0<');
  });

  it('vùng mù của diff: file MÃ NGUỒN vượt trần → CÓ banner', () => {
    const html = runPage(
      meta({ verdict: verdict({ diff_blind_spots: [{ file: 'src/gate.ts', reason: 'vượt trần kích thước diff' }] }) }),
      false,
      suKien,
    );
    expect(html).toContain('Vùng mù của diff');
    expect(html).toContain('src/gate.ts');
  });

  it('vế đối chứng: KHÔNG có file mã nguồn bị loại → KHÔNG banner', () => {
    // Thiếu ca này thì banner nổi lên ở mọi PR có lockfile, và người ta học cách bỏ qua nó — một
    // cảnh báo bị bỏ qua thì tệ hơn không có cảnh báo, vì nó tạo cảm giác đã được canh.
    expect(runPage(meta(), false, suKien)).not.toContain('Vùng mù của diff');
  });

  it('không có đối chứng → banner đứng TRONG bước 4, trước phần log của nó', () => {
    const html = runPage(meta({ verdict: verdict({ no_baseline: true }) }), false, suKien);
    const b4 = html.indexOf('data-s="4"');
    const ban = html.indexOf('Không có đối chứng');
    const log4 = html.indexOf('id="logs-4"');
    expect(ban, 'thiếu banner không-đối-chứng').toBeGreaterThan(-1);
    expect(ban, 'banner phải nằm sau đầu bước 4').toBeGreaterThan(b4);
    expect(ban, 'banner phải đứng TRƯỚC log — nó đổi cách đọc toàn bộ phần sau').toBeLessThan(log4);
  });

  it('thư viện: không-nạp và gỡ-khỏi phân biệt được ở mức DẤU HIỆU', () => {
    // Hai việc hậu quả khác hẳn: một cái không thêm tài sản, cái kia MẤT một tài sản đã tự chứng
    // minh được mình. Dùng chung ký hiệu là để người đọc lướt qua cái đắt hơn.
    const html = verdictHtml(
      verdict({
        library_changes: [
          { probe_id: 'p-1', action: 'not_admitted', reason: 'trùng nội dung' },
          { probe_id: 'p-2', action: 'evicted', reason: 'hành vi trùng đo được' },
        ],
      }),
    );
    expect(html).toContain('⊘');
    expect(html).toContain('✕');
    expect(html).toContain('khong-nap');
    expect(html).toContain('go-khoi');
  });

  it('thư viện không đổi → khối không hiện', () => {
    expect(verdictHtml(verdict())).not.toContain('Thư viện');
  });

  it('người chạy: vắng là KHẲNG ĐỊNH lượt máy chạy, không phải thiếu dữ liệu', () => {
    expect(verdictHtml(verdict())).toContain('máy chạy (chế độ trực)');
    expect(verdictHtml(verdict({ run_by: 'thang.vv' }))).toContain('thang.vv');
  });

  it('KHÔNG RA VERDICT khác hẳn PASS/FAIL, và không lẫn vào hộp lỗi chung', () => {
    const html = runPage(meta({ trangThai: 'loi', verdict: undefined }), false, [
      { t: 10, e: { type: 'error', msg: 'Không đủ cơ sở kết luận: 6 probe đều KHÔNG chứng minh được gì' } },
    ]);
    expect(html).toContain('KHÔNG RA VERDICT');
    expect(html).toContain('vd-khoi trong');
    expect(html, 'không được lặp lại trong hộp lỗi chung').not.toContain('<b>LỖI:</b>');
  });

  it('vế đối chứng: lỗi hệ thống thật vẫn vào hộp lỗi chung, không đội lốt «không đủ cơ sở»', () => {
    const html = runPage(meta({ trangThai: 'loi', verdict: undefined }), false, [
      { t: 10, e: { type: 'error', msg: 'Run dừng giữa chừng, không có verdict (mã thoát 4)' } },
    ]);
    expect(html).not.toContain('KHÔNG RA VERDICT');
    expect(html).toContain('<b>LỖI:</b>');
  });
});

describe('cổng merge', () => {
  it('lượt KHÔNG gắn PR nói thẳng là không có cổng, không để trống chỗ đó', () => {
    // Một chỗ trống trông giống hệt một chỗ hỏng, và người dùng sẽ đi tìm cái nút không tồn tại.
    const html = runPage(meta({ pr: undefined }), false, suKien);
    expect(html).toContain('Không có cổng merge');
    expect(html).not.toContain('/merge');
  });

  it('FAIL → Merge khoá cứng, nhưng Trả về dev VẪN dùng được', () => {
    const html = runPage(meta(), false, suKien);
    expect(html).toContain('Merge khoá cứng');
    expect(html, 'khoá merge không được khoá luôn đường trả về dev').toContain('/reject');
    expect(html, 'không được còn nút merge khi đã khoá cứng').not.toContain('id="nut-merge"');
  });

  it('verdict stale → khoá cứng kèm lý do riêng, khác lý do finding HIGH', () => {
    const html = runPage(
      meta({ verdict: verdict({ result: 'PASS', findings: [], head_moved: { new_sha: 'fedcba9', at: 'x' } }) }),
      false,
      suKien,
    );
    expect(html).toContain('Merge khoá cứng');
    expect(html).toMatch(/không còn nói về thứ sắp được merge/);
  });

  it('PASS + medium → có checklist, nút Merge khoá tới khi tick đủ', () => {
    const med = finding({ id: 'm1', severity: 'non_blocking', title_vi: 'Thiếu test ca biên' });
    const html = runPage(meta({ verdict: verdict({ result: 'PASS', findings: [med] }) }), false, suKien);
    expect(html).toContain('tick-med');
    expect(html).toContain('data-fid="m1"');
    expect(html, 'nút merge phải khoá khi chưa tick').toMatch(/id="nut-merge"[^>]*disabled/);
  });

  it('PASS không cảnh báo nào → nút Merge mở sẵn', () => {
    // Vế đối chứng: thiếu ca này thì một bản «khoá nút merge mãi mãi» cũng xanh ở ca trên.
    const html = runPage(meta({ verdict: verdict({ result: 'PASS', findings: [] }) }), false, suKien);
    expect(html).toContain('id="nut-merge"');
    expect(html).not.toMatch(/id="nut-merge"[^>]*disabled/);
  });

  it('ô ghi chú trả về dev khai BẮT BUỘC, và nút khoá sẵn', () => {
    const html = runPage(meta(), false, suKien);
    expect(html).toContain('bắt buộc');
    expect(html).toMatch(/id="ghi-chu-tra-ve"[^>]*required/);
    expect(html, 'nút trả về phải khoá tới khi có ghi chú').toMatch(/id="nut-tra-ve"[^>]*disabled/);
  });

  it('MÁY CHỦ cũng ép ghi chú — `required` phía trình duyệt không chặn được POST thẳng', () => {
    const nguon = readFileSync('apps/web/src/server.ts', 'utf8');
    expect(nguon, 'thiếu chặn phía máy chủ cho ghi chú rỗng').toMatch(/Trả về dev phải có ghi chú/);
  });

  it('receipt sau khi trả về dev có hướng dẫn reopen', () => {
    const html = runPage(
      meta({ ketQuaCong: { hanhDong: 'reject', luc: '2026-09-02T10:00:00.000Z', nguoi: 'thang.vv', chiTiet: 'thiếu test' } }),
      false,
      suKien,
    );
    expect(html).toContain('ĐÃ TRẢ VỀ DEV');
    expect(html).toContain('Reopen pull request');
    expect(html, 'receipt là trạng thái cuối — không được còn nút hành động').not.toContain('id="nut-merge"');
  });
});

describe('đối chiếu hai nhánh — máy đã so, đừng bắt người so lại', () => {
  const dc = {
    pass_both: 35,
    rows: [
      { label: 'P2·bc87', rule: 'R9.6', name: 'ghiSo: xac_nhan_medium rỗng không sinh chữ phantom',
        purpose: 'moTaXacNhan dùng ternary — biên đúng ngay ds.length === 0', pr: 'pass', base: 'fail', state: 'cai_thien' },
      { label: 'P1·afd4', rule: 'R1.17,R1.18', name: 'Điều kiện kép laLuatMoi && brFail',
        purpose: 'Vào phanLoaiMay có cổng gộp hai vế', pr: 'fail', base: 'fail', state: 'ngoai_pham_vi' },
    ],
  } as unknown as NonNullable<Verdict['probe_compare']>;

  const html = verdictHtml(verdict({ probe_compare: dc }));

  it('bày ĐỔI TRẠNG THÁI, không bày bãi mã probe', () => {
    // Bản cũ in `P1·8213=p P2·bc87=p …` hai dòng 39 mã và bỏ mặc người đọc so từng cặp. Cái người
    // ta cần là phần ĐÃ ĐỔI — và máy vốn đã tính nó rồi.
    expect(html).toContain('✗→✓');
    expect(html).toContain('✗→✗');
    expect(html).toContain('PR sửa được');
    expect(html).toContain('không quy tội PR');
  });

  it('cột LUẬT có mặt — probe là phép thử của một luật', () => {
    expect(html).toContain('R9.6');
    expect(html).toContain('R1.17,R1.18');
  });

  it('chi tiết dài nằm ở tooltip, không chiếm dòng', () => {
    expect(html).toMatch(/title="[^"]*ternary[^"]*"/);
    expect(html, 'mục đích dài không được đổ thẳng ra dòng').not.toContain('>moTaXacNhan dùng ternary');
  });

  it('probe pass cả hai chỉ còn là một SỐ, không phải 35 dòng', () => {
    expect(html).toContain('35 probe pass cả hai nhánh');
    expect(html, 'không được liệt kê từng probe pass').not.toContain('=p ');
  });

  it('không có dữ liệu đối chiếu → khối không hiện', () => {
    expect(verdictHtml(verdict())).not.toContain('Đối chiếu hai nhánh');
  });

  it('tên probe do model viết vẫn phải qua escape', () => {
    const doc = verdictHtml(
      verdict({
        probe_compare: {
          pass_both: 0,
          rows: [{ label: 'P1·aaaa', rule: 'R1', name: '"><img onerror=1>', purpose: '<script>x</script>', pr: 'fail', base: 'pass', state: 'hoi_quy' }],
        } as unknown as NonNullable<Verdict['probe_compare']>,
      }),
    );
    expect(doc).not.toContain('<img onerror=1>');
    expect(doc).not.toContain('<script>x</script>');
    expect(doc).toContain('&lt;script&gt;');
  });

  it('engine KHÔNG còn đổ hai bãi dữ liệu ra log', () => {
    const nguon = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
    expect(nguon, 'còn dòng dump Nhánh PR thô').not.toMatch(/Nhánh PR:\s+\$\{tomTatKq/);
    expect(nguon, 'phải có dòng kết luận đối chiếu').toContain('Đối chiếu ${ungVienTatCa.length} probe');
  });
});
