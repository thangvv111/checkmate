import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { probesPage, tierTone, emptyState, type QueueItem } from '../apps/web/src/ui-probes.js';

/**
 * Lưới cho màn **Hàng đợi giao** (capability `probe-library-screen`, đổi đối tượng ở change
 * `probe-handover-replaces-library`).
 *
 * ## Bản trước của file này có 47 ca. Bản này ít hơn hẳn — và đó là quyết định, không phải đánh rơi.
 *
 * 33 ca cũ nói về **một cái kho không còn tồn tại**: sổ gỡ bỏ, chỉ mục thư viện, đọc code từ đĩa, dải
 * hành vi qua nhiều lượt, hai đường gỡ probe, trần đọc từ cấu hình. Chúng chết cùng cái kho.
 *
 * 14 ca **còn sống** và được mang sang nguyên tinh thần — chúng khoá những luật không phụ thuộc vào việc
 * màn đang bày cái gì:
 *
 *   · ⛔C4 — mọi trường ngoài đi qua `escHtml`, và code đặt bằng `textContent` chứ không `innerHTML`
 *   · ⛔C3 — màn không mang đường dẫn máy chủ, token, hay giá trị người vận hành gõ vào ô cấu hình
 *   · ⛔C1 — đường của màn là GET, không đường nào chạm cổng
 *   · đầu vào KHUYẾT ở mọi tầng vẫn dựng được màn
 *
 * ⛔ Luật ⛔C4 nay **quan trọng hơn trước**: mã trên màn không còn chỉ để đọc — nó là thứ người vận hành
 * sắp **copy sang một repo khác**.
 */

const UI_PROBES = readFileSync('apps/web/src/ui-probes.ts', 'utf8');
const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
const YML = readFileSync('checkmate.yml', 'utf8');

const dx = (over: Partial<QueueItem['de_xuat']> = {}): QueueItem => ({
  de_xuat: { probe_id: 'P1', spec_rule: 'R1.2', hang: 1, ly_do: 'đã nổ', code: 'expect(1).toBe(2);', ...over },
  run_id: 'r1',
  luc: '2026-09-06T00:00:00Z',
  artifact: 'pr/1',
});

// ---------- ⛔C4: mọi trường ngoài phải thoát ----------

/** Trường do model / repo đích sinh ra — không cái nào được nội suy trần vào HTML. */
const TRUONG_NGOAI = ['probe_id', 'spec_rule', 'ly_do', '.code', 'run_id', 'repoFull', 'artifact', 'nhan', 'giaiThich', 'tieuDe', '.than'];

export function scanEscapedFields(src: string, quaHam: readonly string[] = []): string[] {
  const loi: string[] = [];
  for (const m of src.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    const bt = m[1] ?? '';
    if (!TRUONG_NGOAI.some((f) => bt.includes(f))) continue;
    if (bt.includes('escHtml(')) continue;
    // Trường đi qua một hàm thoát trung gian trong CÙNG file thì thân hàm ấy đã bị chính phép quét này
    // soi. Không có ngoại lệ này, lưới đỏ oan trên code đang đúng — lỗi lưới loại 3.
    if (quaHam.some((h) => bt.trim().startsWith(h))) continue;
    loi.push(`nội suy KHÔNG thoát: \${${bt.trim().slice(0, 90)}}`);
  }
  return loi;
}

/** Hàm thoát trung gian được miễn ở trên — danh sách phải NGẮN, và mỗi cái có ca riêng bên dưới. */
const HAM_THOAT: string[] = [];

describe('bề mặt màn — ⛔C4 · ⛔C3 · ⛔C1', () => {
  it('T_khongtincay ⛔C4 — mọi trường chuỗi ngoài đi qua escHtml', () => {
    expect(scanEscapedFields(UI_PROBES, HAM_THOAT)).toEqual([]);
  });

  it('T_khongtincay [fixture đối kháng] — bỏ escHtml quanh MỘT trường thì lưới ĐỎ', () => {
    expect(scanEscapedFields('<b>${q.de_xuat.probe_id}</b>')).toHaveLength(1);
    expect(scanEscapedFields('<pre>${q.de_xuat.code}</pre>')).toHaveLength(1);
  });

  it('T_khongtincay [fixture đối chứng] — trường đã thoát, và trường số, đều XANH', () => {
    expect(scanEscapedFields('<b>${escHtml(q.de_xuat.probe_id)}</b>')).toEqual([]);
    expect(scanEscapedFields('<b>${dsach.length}</b>')).toEqual([]);
    expect(scanEscapedFields('')).toEqual([]);
  });

  it('T_khongtincay — mã probe hiện nguyên văn, KHÔNG thành phần tử', () => {
    // Mã probe là thứ dài nhất và giống «mã của mình» nhất trên màn, nên là thứ dễ được miễn thoát nhất.
    // Nay nó còn sắp được copy sang repo khác — một đoạn dựng sai ở đây có đường đi thẳng sang hệ khác.
    const html = probesPage({
      repoFull: 'a/one',
      soLuot: 1,
      queue: [dx({ code: '</pre><script>alert(1)</script>' })],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('T_khongtincay — chuỗi cài bẫy ở MỌI trường, không riêng code', () => {
    const bay = '"><img src=x onerror=alert(1)>';
    const html = probesPage({
      repoFull: bay,
      soLuot: 1,
      queue: [dx({ probe_id: bay, spec_rule: bay, ly_do: bay })],
    });
    expect(html).not.toContain('onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('T_khongtincay — màn KHÔNG dùng innerHTML ở đâu cả', () => {
    expect(UI_PROBES).not.toContain('innerHTML');
  });

  it('T_bimat ⛔C3 — màn không mang đường dẫn máy chủ hay token nào', () => {
    const html = probesPage({ repoFull: 'a/one', soLuot: 1, queue: [dx()] });
    // Chỉ kiểm thứ THẬT SỰ có thể rò: đường dẫn máy chủ và thư mục kho. KHÔNG kiểm từ «token» — vỏ chung
    // có văn giải thích chứa từ ấy, nên assert trên một TỪ trong lời văn là lỗi lưới loại 3: ca đỏ trên
    // hệ thống đang đúng.
    for (const cam of ['local_path', 'probes-lib', 'C:\\', '/home/', 'ghp_']) {
      expect(html, `màn rò «${cam}»`).not.toContain(cam);
    }
  });

  it('T_bimat — đường API không trả local_path', () => {
    // Đường dẫn trên máy chủ là thông tin hạ tầng; màn không cần, nên nó không được đi ra.
    // Bỏ chú thích trước khi quét: câu «KHÔNG trả local_path» trong comment không phải một lần trả
    // local_path. Không bỏ thì lưới đỏ trên chính dòng giải thích vì sao nó không đỏ.
    const than = SERVER.slice(SERVER.indexOf("app.get('/api/probes'"), SERVER.indexOf("app.get('/lich-su'")).replace(
      /\/\/[^\n]*/g,
      '',
    );
    expect(than).not.toContain('local_path');
  });

  it('T_cong ⛔C1 — đường của màn đều là GET, không đường nào chạm cổng', () => {
    // Ba đường PHÁ HUỶ cũ (xoá probe · bỏ cách ly · dọn thư viện) đã gỡ cùng cái kho: không còn kho thì
    // không có gì để xoá. Màn này nay chỉ ĐỌC.
    const than = SERVER.slice(SERVER.indexOf("function readHandoverQueue"), SERVER.indexOf("app.get('/lich-su'"));
    expect(than).not.toContain("app.post('/api/probes");
    expect(than).toContain("app.get('/probes'");
    expect(than).toContain("app.get('/api/probes'");
  });

  it('T_hopdong ⛔C5 — export của màn khai đủ trong checkmate.yml', () => {
    for (const ten of ['probesPage', 'tierTone', 'emptyState']) {
      expect(YML, `thiếu ${ten} trong bảng module`).toContain(ten);
    }
  });
});

// ---------- Bày cả phần YẾU ----------

describe('hàng đợi bày cả phần YẾU của bằng chứng', () => {
  it('hạng 1 và hạng 2 phân biệt được — hai mức bằng chứng khác nhau', () => {
    const html = probesPage({ repoFull: 'a/one', soLuot: 2, queue: [dx({ hang: 1 }), dx({ hang: 2, probe_id: 'P2' })] });
    expect(html).toContain('đã bắt được lỗi thật');
    expect(html).toContain('chưa từng bắt được lỗi nào');
  });

  it('⛔ hạng 2 nói THẲNG là chưa bắt được gì, không để trống chỗ ấy', () => {
    // Bày hạng 2 ngang hàng 1 làm người đọc tưởng hai thứ cùng sức nặng. Chúng không.
    // Dòng tóm tắt đầu màn nêu CẢ HAI hạng kèm số («0 đã bắt được lỗi thật, 1 chưa từng…»), nên phải soi
    // phần THÂN chứ không cả trang — soi cả trang là ca đỏ trên hệ thống đang đúng.
    const html = probesPage({ repoFull: 'a/one', soLuot: 1, queue: [dx({ hang: 2 })] });
    const than = html.slice(html.indexOf('class="dx"'));
    expect(than).toContain('chưa từng bắt được lỗi nào');
    expect(than).not.toContain('đã bắt được lỗi thật');
  });

  it('đọc được khi không phân biệt được màu — hạng nói bằng CHỮ', () => {
    for (const h of [1, 2] as const) {
      expect(tierTone(h).nhan, 'nhãn chữ rỗng thì màu thành kênh duy nhất').not.toBe('');
    }
  });

  it('hạng lạ vẫn vẽ được, và nói ra là nó lạ', () => {
    for (const la of [9, 'x', null, undefined, NaN]) {
      expect(() => tierTone(la)).not.toThrow();
      expect(tierTone(la).nhan).toContain('hạng lạ');
    }
  });

  it('⛔ probe không giao được HIỆN RA kèm lý do, không biến mất im lặng', () => {
    // Một probe ĐÃ BẮT ĐƯỢC LỖI THẬT mà không giao được là mất mát người vận hành cần thấy — và nó chỉ ra
    // chỗ máy tách hoặc cửa đột biến cần sửa. Giấu đi thì màn chỉ bày phần đẹp.
    const html = probesPage({
      repoFull: 'a/one',
      soLuot: 3,
      queue: [],
      boQua: [{ probe_id: 'P7', ly_do: 'không tách được thành file độc lập', run_id: 'r9' }],
    });
    expect(html).toContain('P7');
    expect(html).toContain('không tách được thành file độc lập');
    expect(html).toContain('KHÔNG giao được');
  });

  it('probe không giao được hiện ra KỂ CẢ khi hàng đợi rỗng', () => {
    // Trạng thái rỗng không được nuốt phần yếu: «chưa có gì để giao» và «có thứ đáng giao mà giao không
    // được» là hai câu khác nhau, và câu thứ hai là câu cần hành động.
    const html = probesPage({ repoFull: 'a/one', soLuot: 3, queue: [], boQua: [{ probe_id: 'P7', ly_do: 'trượt cửa đột biến', run_id: 'r9' }] });
    expect(html).toContain('Đã chấm 3 lượt');
    expect(html).toContain('P7');
  });

  it('⛔ KHÔNG có trần hàng đợi — 1000 đề xuất thì cả 1000 còn đó', () => {
    // Đề xuất bị vứt vì đụng trần là mất bằng chứng đã kiếm được, không phải dọn rác.
    const nhieu = Array.from({ length: 1000 }, (_, i) => dx({ probe_id: `P${i}` }));
    const html = probesPage({ repoFull: 'a/one', soLuot: 1000, queue: nhieu });
    expect(html).toContain('P999');
    expect(html).toContain('1000 đề xuất đang chờ');
  });
});

// ---------- Trạng thái rỗng (hàm thuần) ----------

describe('emptyState — bốn câu, không câu nào mượn câu nào', () => {
  it('chưa kết nối repo', () => {
    expect(emptyState({ queue: null, soLuot: 0 })?.tieuDe).toContain('Chưa kết nối repo');
  });

  it('chưa chấm lượt nào', () => {
    expect(emptyState({ queue: [], soLuot: 0 })?.tieuDe).toContain('Chưa chấm lượt nào');
  });

  it('⛔ đã chấm mà chưa đủ bằng chứng → KÈM SỐ LƯỢT', () => {
    // Im lặng có số đo thì đọc được; im lặng trơ bị đọc thành «hỏng». Hạng 1 hiếm theo cấu tạo, nên
    // trạng thái này là trạng thái THƯỜNG GẶP NHẤT sau change.
    const r = emptyState({ queue: [], soLuot: 12 });
    expect(r?.tieuDe).toContain('12');
    expect(r?.than).toContain('BÌNH THƯỜNG');
  });

  it('không đọc được ≠ không có gì', () => {
    const r = emptyState({ queue: [], soLuot: 5, loiDoc: 'sổ rách' });
    expect(r?.tieuDe).toContain('Không đọc được');
    expect(r?.than).toContain('sổ rách');
  });

  it('có đề xuất thì KHÔNG phải trạng thái rỗng', () => {
    expect(emptyState({ queue: [dx()], soLuot: 1 })).toBeNull();
  });
});

// ---------- Đầu vào khuyết mọi tầng ----------

describe('đầu vào KHUYẾT mọi tầng', () => {
  it('đề xuất thiếu trường · null · sai kiểu → màn vẫn dựng, không ném', () => {
    const xau = [
      { de_xuat: {}, run_id: '', luc: '', artifact: '' },
      { de_xuat: null, run_id: null, luc: null, artifact: null },
      null,
    ] as unknown as QueueItem[];
    expect(() => probesPage({ repoFull: 'a/one', soLuot: 1, queue: xau })).not.toThrow();
  });

  it('queue undefined · soLuot lạ → không ném', () => {
    for (const v of [
      { repoFull: '', queue: undefined, soLuot: NaN },
      { repoFull: '', queue: null, soLuot: -1 },
    ] as never[]) {
      expect(() => probesPage(v)).not.toThrow();
    }
  });
});
