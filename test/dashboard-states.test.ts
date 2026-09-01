import { describe, it, expect } from 'vitest';

import { prListSection, homePage, type PrDisplay } from '../apps/web/src/ui.js';
import { probesPage } from '../apps/web/src/ui-probes.js';

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

describe('Thư viện probe — chưa dựng thì nói vì sao', () => {
  const html = probesPage();

  it('nêu lý do chưa có, không phải trang trắng cũng không phải «coming soon»', () => {
    expect(html).toMatch(/đường đọc dữ liệu chưa dựng|chưa có API/i);
    expect(html.toLowerCase()).not.toContain('coming soon');
  });

  it('KHÔNG mượn trạng thái rỗng của gói để khoả lấp chỗ chưa dựng', () => {
    // «thư viện dựng dần từ các lượt chấm trên repo này» nghĩa là ĐÃ TRA, CHƯA CÓ GÌ.
    // Sự thật là CHƯA HỀ TRA — probe vẫn tích luỹ thật trong probes-lib/. Dùng câu đó ở đây là
    // nói dối đúng kiểu mà luật «rỗng ≠ hỏng» của chính sản phẩm này cấm.
    expect(html).not.toContain('thư viện dựng dần');
    expect(html).not.toMatch(/chưa có probe nào/i);
  });
});
