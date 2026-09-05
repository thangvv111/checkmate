import type { Verdict } from '../../../packages/shared/src/types.js';
import { shell, escHtml } from './ui.js';

/**
 * Hàng đợi GIAO — màn đọc những probe đủ bằng chứng để đề nghị repo đích thêm vào bộ test của họ.
 *
 * ## Màn này thay cho cái gì
 *
 * Trước change `probe-handover-replaces-library`, đây là màn «Thư viện probe»: nó bày một kho tích luỹ.
 * Kho đã gỡ — probe nay là **đầu dò dùng một lần**, và thứ đáng giữ đi **ra ngoài** thay vì ở lại.
 *
 * Màn **đổi đối tượng, không đổi ba luật** đã có ở đây:
 *
 * 1. **Bày cả phần YẾU.** Trước là probe mục/flaky/bị cách ly; nay là hạng 2 (chưa từng nổ), probe không
 *    tách được, và đề xuất đã ra lâu mà repo chưa nhận. Một màn chỉ bày phần đẹp làm người vận hành tin
 *    cơ chế chạy tốt hơn thực tế — sai lầm ấy không đổi khi đối tượng đổi.
 * 2. **Trạng thái rỗng nói ĐÚNG câu.** Nay có BA, không phải hai: chưa kết nối repo · chưa chấm lượt nào ·
 *    đã chấm N lượt mà chưa đủ bằng chứng. Câu thứ ba là câu thường gặp nhất — hạng 1 hiếm theo cấu tạo
 *    (đo trên prod trước change: 0/7 probe từng nổ) — nên nó phải nói **kèm số lượt**, không im lặng trơ.
 * 3. **Nội dung là DỮ LIỆU** (⛔C4), kể cả khi nó là mã nguồn. Luật này KHÔNG đổi một chữ, nhưng **quan
 *    trọng hơn trước**: mã trên màn nay là thứ người vận hành sắp **copy sang một repo khác**, không còn
 *    chỉ để đọc.
 *
 * ⛔ Hàng đợi **KHÔNG có trần**. Nó rỗng dần vì repo đích NHẬN, không vì đụng trần rồi bị loại — một trần
 * ở đây sẽ âm thầm vứt bằng chứng vừa kiếm được, đúng thứ change này gỡ đi.
 */

export type Proposal = NonNullable<Verdict['handover']>[number];

/** Một đề xuất kèm ngữ cảnh lượt chấm sinh ra nó — màn cần biết nó ra đời khi nào và từ đâu. */
export interface QueueItem {
  de_xuat: Proposal;
  run_id: string;
  luc: string;
  artifact: string;
}

/** Probe đủ bằng chứng mà KHÔNG giao được — phần YẾU của hàng đợi, phải hiện ra. */
export interface SkippedItem {
  probe_id: string;
  ly_do: string;
  run_id: string;
}

export interface ProbesView {
  repoFull: string;
  /** Probe không giao được. Rỗng là bình thường; giấu đi thì màn chỉ bày phần đẹp. */
  boQua?: SkippedItem[];
  /** `null` = chưa kết nối repo nào. Mảng rỗng = đã kết nối, xem `soLuot` để biết câu nào đúng. */
  queue: QueueItem[] | null;
  /** Số lượt chấm đã chạy trên repo này — con số biến im lặng thành thứ đọc được. */
  soLuot: number;
  /** Lý do không đọc được dữ liệu, nếu có. «Không đọc được» KHÁC «không có gì». */
  loiDoc?: string;
  /** Tên người đang đăng nhập — rỗng thì shell hiện nhãn chung, KHÔNG bịa tên. */
  nguoi?: string;
}

const TIER: Record<number, { nhan: string; nen: string; mau: string; giaiThich: string }> = {
  1: {
    nhan: 'đã bắt được lỗi thật',
    nen: 'var(--fail-tint)',
    mau: 'var(--fail-ink)',
    giaiThich: 'Probe này đỏ trên nhánh PR và xanh trên nhánh gốc — nó đã chứng minh cả hai điều: nó đỏ được, và hành vi ấy đã gãy thật một lần.',
  },
  2: {
    nhan: 'chưa từng bắt được lỗi nào',
    nen: 'var(--medium-tint)',
    mau: 'var(--medium-ink)',
    giaiThich: 'Probe này xanh cả hai nhánh. Nó vào đây vì canh một luật PR mới thêm mà bộ test của repo chưa phủ, và vì đảo hết khẳng định thì nó ĐỎ (tức khẳng định của nó có ràng buộc thật).',
  },
};

/** Hạng lạ (bản ghi đời sau, sổ sửa tay) vẫn phải vẽ được, và phải nói ra là nó lạ. */
export function tierTone(hang: unknown): { nhan: string; nen: string; mau: string; giaiThich: string } {
  const k = typeof hang === 'number' ? hang : NaN;
  return (
    TIER[k] ?? {
      nhan: `hạng lạ: ${String(hang)}`,
      nen: 'var(--color-surface)',
      mau: 'var(--color-neutral-600)',
      giaiThich: 'Bản ghi mang một hạng mà màn này không biết — không suy đoán, bày nguyên trạng.',
    }
  );
}

/**
 * Ba trạng thái rỗng, ba câu khác nhau.
 *
 * Gộp chúng là làm người vận hành đọc nhầm: «chưa kết nối repo» là lỗi cấu hình, «chưa chấm lượt nào» là
 * chưa bắt đầu, còn «đã chấm N lượt mà chưa đủ bằng chứng» là **cơ chế đang chạy đúng**. Câu thứ ba nếu
 * nói trơ sẽ bị đọc thành «hỏng», nên nó bắt buộc mang con số.
 */
export function emptyState(v: Pick<ProbesView, 'queue' | 'soLuot' | 'loiDoc'>): { tieuDe: string; than: string } | null {
  if (v.loiDoc) {
    return {
      tieuDe: 'Không đọc được dữ liệu hàng đợi',
      than: `Không đo được số đề xuất — nguyên nhân: ${v.loiDoc}. Đây KHÔNG phải «không có đề xuất nào»: không đọc được và không có là hai chuyện khác nhau.`,
    };
  }
  // `undefined` xử như `null`: cả hai đều là «không có danh sách», và phân biệt chúng ở đây chỉ tạo một
  // nhánh nữa để quên.
  if (!Array.isArray(v.queue)) {
    return {
      tieuDe: 'Chưa kết nối repo nào',
      than: 'Hàng đợi giao dựng theo repo. Thêm một repo ở màn Cấu hình rồi quay lại đây.',
    };
  }
  if (v.queue.length > 0) return null;
  if (!(Number(v.soLuot) > 0)) {
    return {
      tieuDe: 'Chưa chấm lượt nào trên repo này',
      than: 'Hàng đợi dựng dần từ các lượt chấm. Chạy một lượt rồi quay lại.',
    };
  }
  return {
    tieuDe: `Đã chấm ${v.soLuot} lượt, chưa probe nào đủ bằng chứng để giao`,
    than:
      'Đây là trạng thái BÌNH THƯỜNG, không phải cơ chế hỏng. Probe chỉ được đề nghị giao khi nó đã bắt được ' +
      'lỗi thật, hoặc canh một luật mới mà bộ test của repo chưa phủ và đảo khẳng định thì nó đỏ. Phần lớn ' +
      'probe không đạt — chúng đã làm xong việc của mình trong lượt chấm và được vứt đi, đúng như thiết kế.',
  };
}

const CSS_PROBES = `
  .dx { border:1px solid var(--color-divider); padding:14px 16px; margin-bottom:12px; }
  .dx-dau { display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; }
  .dx-ma { font:600 14px/1.4 var(--font-mono); }
  .dx-hang { font-size:11.5px; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; }
  .dx-luat { font:12px/1.5 var(--font-mono); color:var(--color-neutral-600); }
  .dx-vi { font-size:12.5px; color:var(--color-neutral-600); margin-top:6px; }
  .dx-ma-nguon { font:11.5px/1.6 var(--font-mono); background:var(--color-surface); padding:10px 12px;
    overflow-x:auto; margin-top:10px; white-space:pre; max-height:340px; }
  .rong { border:1px dashed var(--color-divider); padding:22px; text-align:center; }
  .rong h3 { margin:0 0 8px; font-size:15px; }
  .rong p { margin:0; font-size:13px; color:var(--color-neutral-600); max-width:62ch;
    margin-inline:auto; line-height:1.65; }
`;

export function probesPage(v: ProbesView): string {
  const rong = emptyState(v);
  const dsach = v.queue ?? [];
  const dem = (h: number) => dsach.filter((x) => x?.de_xuat?.hang === h).length;

  // ⛔ MỌI trường dưới đây đi qua escHtml. Mã nguồn là thứ dài nhất và giống «code của mình» nhất, nên
  // là thứ dễ được miễn thoát nhất — nó không được miễn. Nay nó còn sắp được copy sang repo khác.
  const dong = (q: QueueItem): string => {
    // ⛔ `q` tự nó có thể null (bản ghi rách, sổ sửa tay). MỘT mục hỏng không được giết cả màn — người
    // vận hành cần thấy 999 mục còn lại hơn là thấy một trang lỗi.
    const d = q?.de_xuat;
    const t = tierTone(d?.hang);
    return `<div class="dx">
      <div class="dx-dau">
        <span class="dx-ma">${escHtml(d?.probe_id ?? '?')}</span>
        <span class="dx-hang" style="background:${t.nen};color:${t.mau}">${escHtml(t.nhan)}</span>
        ${d?.spec_rule ? `<span class="dx-luat">luật ${escHtml(d.spec_rule)}</span>` : '<span class="dx-luat">không neo luật nào</span>'}
        <span class="dx-luat">lượt ${escHtml(q?.run_id ?? '?')} · ${escHtml(q?.luc ?? '')}</span>
      </div>
      <div class="dx-vi">${escHtml(t.giaiThich)}</div>
      <div class="dx-vi">Lý do đề xuất: ${escHtml(d?.ly_do ?? '')}</div>
      <div class="dx-ma-nguon">${escHtml(d?.code ?? '')}</div>
    </div>`;
  };

  // ⛔ Phần YẾU của hàng đợi: probe đủ bằng chứng mà KHÔNG giao được. Bày nó ra kể cả khi hàng đợi rỗng —
  // một probe đã bắt được lỗi thật mà không giao được là mất mát người vận hành cần thấy, và nó chỉ ra
  // chỗ máy tách hoặc cửa đột biến cần sửa. Giấu đi thì màn chỉ bày phần đẹp.
  const boQua = Array.isArray(v.boQua) ? v.boQua : [];
  const khoiBoQua = boQua.length
    ? `<div class="dx" style="border-style:dashed">
         <div class="dx-dau"><span class="dx-ma">${boQua.length} probe đủ bằng chứng nhưng KHÔNG giao được</span></div>
         ${boQua
           .map(
             (b) =>
               `<div class="dx-vi">${escHtml(b?.probe_id ?? '?')} (lượt ${escHtml(b?.run_id ?? '?')}) — ${escHtml(b?.ly_do ?? '')}</div>`,
           )
           .join('')}
       </div>`
    : '';

  const than = rong
    ? `<div class="rong"><h3>${escHtml(rong.tieuDe)}</h3><p>${escHtml(rong.than)}</p></div>${khoiBoQua}`
    : `${khoiBoQua}<p style="font-size:13px;color:var(--color-neutral-600);margin:0 0 14px">
         ${dsach.length} đề xuất đang chờ — ${dem(1)} đã bắt được lỗi thật, ${dem(2)} chưa từng bắt được lỗi nào.
         Thêm chúng vào bộ test của repo thì chúng chạy ở MỌI commit, chạy một lần thay vì hai, và có người trông khi chúng mục.
       </p>
       ${dsach.map(dong).join('')}`;

  return shell(
    'Hàng đợi giao',
    `<style>${CSS_PROBES}</style>
      <h2 style="margin:0 0 4px">Hàng đợi giao${v.repoFull ? ` — ${escHtml(v.repoFull)}` : ''}</h2>
      <p style="font-size:12.5px;color:var(--color-neutral-600);margin:0 0 16px;max-width:78ch;line-height:1.65">
        Probe là đầu dò <strong>dùng một lần</strong>. Cái nào đủ bằng chứng thì được đề nghị giao cho repo đích —
        CheckMate <strong>không</strong> tự thêm test vào repo của ai, đây là đề xuất và người quyết.
      </p>
      ${than}`,
    '',
    { muc: 'probes', nguoi: v.nguoi },
  );
}
