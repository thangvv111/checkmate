import { describe, it, expect } from 'vitest';

import { prListSection, homePage, type PrDisplay } from '../apps/web/src/ui.js';
import { probesPage } from '../apps/web/src/ui-probes.js';
import type { RemovalLog } from '../packages/harness/src/probe-library.js';

/**
 * Lưới «rỗng ≠ hỏng» trên Dashboard.
 *
 * Ba trạng thái, ba việc khác nhau người dùng phải làm:
 *   có PR       → chấm đi
 *   hàng đợi [] → không phải làm gì; đây là trạng thái BÌNH THƯỜNG
 *   đọc lỗi     → đi sửa token, và phải biết sửa Ở ĐÂU
 *
 * Một màn rỗng trông giống một màn hỏng là chỗ người dùng ngồi đợi thứ không bao giờ tới. Lưới này
 * canh đúng chuyện đó: hai trạng thái phải cho ra hai câu KHÁC NHAU, và câu lỗi phải nêu cả nguyên
 * nhân lẫn cách sửa chứ không chỉ than là hỏng.
 */

const pr = (p: Partial<PrDisplay> = {}): PrDisplay => ({
  so: 7,
  tieuDe: 'Sửa cổng merge',
  tacGia: 'thangvv111',
  nhanh: 'feat/cong',
  headSha: 'abcdef1234567',
  ...p,
});

describe('hàng đợi PR — rỗng khác hỏng', () => {
  const rong = prListSection('a/b', 'main', [], '');
  const hong = prListSection('a/b', 'main', null, 'HTTP 401 Bad credentials');

  it('hàng đợi sạch nói rõ đây là trạng thái bình thường, không hiện như lỗi', () => {
    expect(rong).toContain('Hàng đợi sạch');
    expect(rong, 'trạng thái rỗng không được mang dấu hiệu lỗi').not.toContain('q-loi');
  });

  it('đọc không được thì nêu CẢ nguyên nhân LẪN cách sửa, kèm lối đi tới nơi sửa', () => {
    expect(hong, 'thiếu nguyên nhân').toMatch(/token thiếu hoặc hết hạn/i);
    expect(hong, 'thiếu cách sửa cụ thể').toMatch(/Cấu hình ▸ Repos/);
    expect(hong, 'thiếu lối đi tới nơi sửa').toContain('href="/settings"');
  });

  it('hai trạng thái cho ra hai câu khác hẳn nhau', () => {
    expect(rong).not.toBe(hong);
    expect(hong).not.toContain('Hàng đợi sạch');
    expect(rong).not.toContain('Không đọc được PR');
  });

  it('lỗi đọc thì KHÔNG bày hàng đợi rỗng — nói không biết, chứ không nói không có', () => {
    // Đây là ⛔C2 ở tầng giao diện: «không đọc được» không được hiện thành «không có gì».
    expect(hong).not.toContain('q-head');
    expect(hong).not.toContain('q-trong');
  });

  it('chi tiết lỗi thô của GitHub có vào thì phải qua escape', () => {
    const doc = prListSection('a/b', 'main', null, '<img src=x onerror=alert(1)>');
    expect(doc).not.toContain('<img src=x');
    expect(doc).toContain('&lt;img');
  });
});

describe('hàng đợi PR — lưới cột và trạng thái per-commit', () => {
  it('dùng đúng lưới sáu cột của gói design', () => {
    const html = prListSection('a/b', 'main', [pr()], '');
    expect(html).toContain('q-grid q-head');
    expect(html).toContain('q-grid q-row');
  });

  it('chưa chấm · PASS · FAIL · stale · đang chấm là năm hình dạng phân biệt được', () => {
    const chua = prListSection('a/b', 'main', [pr()], '');
    const pass = prListSection('a/b', 'main', [pr({ daCham: { runId: 'r1', ketQua: 'PASS', soFinding: 0 } })], '');
    const fail = prListSection('a/b', 'main', [pr({ daCham: { runId: 'r2', ketQua: 'FAIL', soFinding: 3 } })], '');
    const stale = prListSection('a/b', 'main', [pr({ stale: true })], '');
    const chay = prListSection('a/b', 'main', [pr({ dangCham: true })], '');

    expect(chua).toContain('pill-chua');
    expect(pass).toContain('pill-pass');
    expect(fail).toContain('pill-fail');
    expect(fail).toContain('FAIL·3');
    expect(stale).toContain('pill-stale');
    expect(chay).toContain('đang chấm — nút khoá');
  });

  it('đang chấm thì KHÔNG có nút chạy — hai run song song đẻ hai verdict trùng', () => {
    const chay = prListSection('a/b', 'main', [pr({ dangCham: true })], '');
    expect(chay).not.toContain('Chạy kiểm');
    expect(chay).not.toContain('Vẫn chạy lại');
  });

  it('đã chấm thì có lối xem verdict, và chạy lại là nút phụ chứ không phải nút chính', () => {
    const pass = prListSection('a/b', 'main', [pr({ daCham: { runId: 'r1', ketQua: 'PASS', soFinding: 0 } })], '');
    expect(pass).toContain('href="/runs/r1"');
    expect(pass).toMatch(/btn-ghost[^>]*>\s*Vẫn chạy lại/);
    expect(pass, 'chạy lại không được là nút chính').not.toMatch(/btn-primary[^>]*>\s*Vẫn chạy lại/);
  });

  it('tiêu đề PR từ GitHub luôn qua escape', () => {
    const html = prListSection('a/b', 'main', [pr({ tieuDe: '<script>x</script>', tacGia: '"><b>' })], '');
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('"><b>');
  });
});

describe('Dashboard — bố cục theo gói', () => {
  const html = homePage([], '', '', 'thang', 'thangvv111/checkmate');

  it('mở bằng kicker repo + tiêu đề Dashboard + dòng định vị', () => {
    expect(html).toContain('class="dash-kicker"');
    expect(html).toContain('thangvv111/checkmate');
    expect(html).toContain('>Dashboard</h2>');
    expect(html).toContain('trust không nới cổng');
  });

  it('có hai thẻ: kiểm nhanh tài liệu và lượt chấm gần đây', () => {
    expect(html).toContain('Kiểm nhanh tài liệu rời');
    expect(html).toContain('Lượt chấm gần đây');
    expect(html).toContain('Toàn bộ lịch sử →');
  });

  it('chưa có lượt chấm nào thì nói thẳng, không để thẻ trống', () => {
    expect(html).toContain('Chưa có lượt chấm nào.');
  });
});

/**
 * Khối này ĐỔI cùng change `probe-library-screen`, và hai ca cũ đỏ là Ý MUỐN.
 *
 * Bản trước khoá hành vi của một tấm biển «chưa dựng»: nó CẤM câu «thư viện dựng dần từ các lượt chấm
 * trên repo này», vì lúc ấy câu đó sẽ là nói dối — nó nghĩa là ĐÃ TRA, CHƯA CÓ GÌ, trong khi sự thật là
 * CHƯA HỀ TRA (không có đường đọc dữ liệu nào lên tới màn).
 *
 * Nay đường đọc có thật, nên chính câu ấy trở thành câu ĐÚNG cho một thư viện rỗng — và điều cần khoá
 * đảo chiều: cấm ngược lại tấm biển «chưa dựng», và bắt hai trạng thái rỗng nói hai câu khác nhau.
 * Luật không đổi; thứ đổi là sự thật mà nó áp lên.
 */
describe('Hàng đợi giao — BA trạng thái rỗng nói BA câu khác nhau', () => {
  // Change `probe-handover-replaces-library` đổi màn này từ «thư viện» sang «hàng đợi giao». Luật KHÔNG
  // đổi — trạng thái rỗng phải nói đúng câu — nhưng số trạng thái tăng từ hai lên BA, vì sau change có
  // thêm một câu, và nó là câu THƯỜNG GẶP NHẤT: «đã chấm N lượt mà chưa probe nào đủ bằng chứng».

  it('chưa kết nối repo nào → câu riêng, không mượn câu của hàng đợi rỗng', () => {
    const html = probesPage({ repoFull: '', queue: null, soLuot: 0 });
    expect(html).toContain('Chưa kết nối repo nào');
    expect(html).not.toContain('Hàng đợi dựng dần');
    expect(html).toContain('/settings');
  });

  it('đã kết nối nhưng CHƯA CHẤM lượt nào → «hàng đợi dựng dần»', () => {
    const html = probesPage({ repoFull: 'a/one', queue: [], soLuot: 0 });
    expect(html).toContain('Hàng đợi dựng dần');
    expect(html).not.toContain('Chưa kết nối repo nào');
  });

  it('⛔ đã chấm N lượt mà chưa đủ bằng chứng → nói KÈM SỐ, và nói rõ đây là BÌNH THƯỜNG', () => {
    // Câu mới, và là chỗ dễ đọc nhầm nhất: hạng 1 hiếm theo cấu tạo (đo trên prod trước change: 0/7
    // probe từng nổ), nên im lặng kéo dài là bình thường. Im lặng TRƠ sẽ bị đọc thành «cơ chế hỏng»,
    // nên con số lượt là bắt buộc — nó biến im lặng thành thứ đọc được.
    const html = probesPage({ repoFull: 'a/one', queue: [], soLuot: 12 });
    expect(html).toContain('Đã chấm 12 lượt');
    expect(html).toContain('BÌNH THƯỜNG');
    expect(html).not.toContain('Hàng đợi dựng dần');
  });

  it('KHÔNG ĐỌC ĐƯỢC khác hẳn KHÔNG CÓ GÌ', () => {
    const html = probesPage({ repoFull: 'a/one', queue: [], soLuot: 5, loiDoc: 'sổ lượt chấm rách' });
    expect(html).toContain('Không đọc được');
    expect(html).toContain('sổ lượt chấm rách');
    expect(html, 'không được rơi về câu «chưa đủ bằng chứng»').not.toContain('Đã chấm 5 lượt');
  });

  it('không dùng màu FAIL cho trạng thái rỗng — chưa có gì để giao không phải là hỏng', () => {
    // Cắt khối style TRƯỚC khi quét: bảng CSS chung của vỏ dĩ nhiên mang biến màu fail vì mọi màn dùng
    // chung một bảng. Bản đầu của ca này quét cả trang và đỏ ngay — lỗi lưới loại 3, ca đỏ trên hệ
    // thống đang đúng, và thứ bắt được nó là đọc thông điệp lỗi chứ không phải chạy lại.
    const than = (h: string) => h.replace(/<style>[\s\S]*?<\/style>/g, '');
    for (const html of [
      probesPage({ repoFull: 'a/one', queue: [], soLuot: 0 }),
      probesPage({ repoFull: '', queue: null, soLuot: 0 }),
      probesPage({ repoFull: 'a/one', queue: [], soLuot: 12 }),
    ]) {
      expect(than(html)).not.toContain('var(--fail)');
      expect(than(html)).not.toContain('vd-fail');
    }
  });
});
