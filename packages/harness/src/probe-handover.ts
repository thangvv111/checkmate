/**
 * Xếp hạng probe theo CHẤT LƯỢNG BẰNG CHỨNG, và cửa đột biến cho hạng 2.
 *
 * ## Thay cho cái gì
 *
 * Trước change `probe-handover-replaces-library`, probe được **giữ vào một kho** theo tiêu chí
 * «xanh trên nhánh gốc» — tức giữ vì nó **không nổ**. Luật lưới của chính repo này nói một ca xanh chưa
 * chứng minh được gì: ca khoá một gác phải có đột biến làm nó ĐỎ, không thì nó là «ca xanh trên hệ đã
 * hỏng». Đo trên prod 06/09: **0/7 probe từng bắt hồi quy**, mà cả 7 vẫn chạy ở mọi lượt trên cả hai
 * nhánh.
 *
 * Nay probe là **đầu dò dùng một lần**. Giữ lại là một quyết định RIÊNG, dựa trên bằng chứng của riêng
 * probe ấy — và thứ được giữ đi **ra ngoài** dưới dạng đề xuất giao cho repo đích, không ở lại trong một
 * kho engine tự đọc.
 *
 * ## Ba hạng, danh sách ĐÓNG
 *
 *   hang 1  da NO (hoi_quy | vi_pham_luat_moi)   -> bang chung QUAN SAT duoc  -> de xuat giao ngay
 *   hang 2  xanh 2 nhanh + neo LUAT MOI chua phu -> lo hong do duoc, chua no  -> phai qua CUA DOT BIEN
 *   hang 3  con lai                              -> khong co gi de chung minh -> VUT
 *
 * Không có nhánh «giữ tạm», «chờ xét», «giữ vì tiếc». Mỗi nhánh như thế là một đường quay lại chỗ tích
 * luỹ không tiêu chí — đúng thứ change này gỡ.
 *
 * ## Vì sao cửa đột biến chỉ đặt ở hạng 2
 *
 * Hạng 1 đã có bằng chứng bằng **quan sát**: nó đỏ thật, trên nhánh PR, một lần. Bắt nó chứng minh lại
 * là tốn công cho điều đã biết. Hạng 2 chưa có gì, nên phải **tạo ra** bằng chứng.
 */

import type { ProbePlan } from './skill-code.js';

/** Trạng thái probe đủ tư cách hạng 1 — đây là những nhãn mà máy đã xác nhận probe NỔ. */
export const FIRED_STATES: ReadonlySet<string> = new Set(['hoi_quy', 'vi_pham_luat_moi']);

export type HandoverTier = 1 | 2 | 3;

export interface RankInput {
  /** Nhãn máy đã dán cho probe trong lượt này (`ProbeState`). */
  trangThai: string;
  plan: Pick<ProbePlan, 'id' | 'spec_rule'> & { ten?: string };
  /** Luật mà CHÍNH PR này thêm vào — từ `findNewRules`. */
  newRules: readonly string[];
  /** Luật đã được test của repo phủ — từ `ruleCoverage().luat_da_phu`. */
  coveredRules: readonly string[];
  /** Phép hỏi «luật của probe có chạm luật mới không» — tiêm vào để test được (`refHitsNew`). */
  hitsNew: (specRule: string | undefined, newMarks: string[]) => boolean;
}

export interface RankResult {
  hang: HandoverTier;
  ly_do: string;
}

function chuan(s: unknown): string {
  return typeof s === 'string' ? s.trim().toUpperCase() : '';
}

/**
 * Xếp MỘT probe vào đúng một hạng. Hàm thuần: không đọc đĩa, không chạy gì.
 *
 * Đầu vào khuyết (thiếu `plan`, `trangThai` lạ, `null`) rơi về **hạng 3**. Đó là hướng an toàn: không đề
 * xuất thứ chưa chứng minh được gì. Rơi về hạng 1 hay 2 khi không hiểu đầu vào mới là hỏng.
 */
export function rankProbe(input: RankInput): RankResult {
  const inp = input ?? ({} as RankInput);
  const trangThai = typeof inp.trangThai === 'string' ? inp.trangThai : '';

  if (FIRED_STATES.has(trangThai)) {
    return { hang: 1, ly_do: `đã nổ trong lượt này (${trangThai}) — probe đỏ được, và hành vi ấy đã gãy thật` };
  }

  // Chỉ probe XANH CẢ HAI NHÁNH mới được xét hạng 2. `ngoai_pham_vi`, `nghi_van`, `khong_chay`,
  // `bo_qua`, `cai_thien` đều KHÔNG mô tả được một hành vi ổn định của nhánh gốc, nên chúng không dùng
  // làm mốc canh cho tương lai được.
  if (trangThai !== 'pass') return { hang: 3, ly_do: `trạng thái ${trangThai || '(không rõ)'} — không mô tả một hành vi ổn định` };

  const specRule = inp.plan?.spec_rule;
  if (!specRule) return { hang: 3, ly_do: 'xanh cả hai nhánh nhưng không neo vào luật nào' };

  const newRules = Array.isArray(inp.newRules) ? inp.newRules.filter((x): x is string => typeof x === 'string') : [];
  const hitsNew = typeof inp.hitsNew === 'function' ? inp.hitsNew : () => false;
  if (newRules.length === 0 || !hitsNew(specRule, [...newRules])) {
    return { hang: 3, ly_do: 'xanh cả hai nhánh, và luật nó neo không phải luật PR này mới thêm' };
  }

  // Luật MỚI mà test của repo ĐÃ phủ thì không có lỗ hổng để canh.
  const covered = new Set((Array.isArray(inp.coveredRules) ? inp.coveredRules : []).map(chuan).filter(Boolean));
  if (covered.size > 0 && hitsNew(specRule, [...covered].map((x) => x))) {
    return { hang: 3, ly_do: 'luật mới nhưng test của repo đã phủ — không có lỗ hổng để canh' };
  }

  return { hang: 2, ly_do: 'canh một luật PR này mới thêm mà test của repo chưa phủ — chưa từng nổ, phải qua cửa đột biến' };
}

// ---------- Cửa đột biến: PHỦ ĐỊNH KHẲNG ĐỊNH ----------

/**
 * Đảo mọi khẳng định trong code probe. Probe **phải ĐỎ** sau phép đảo này; còn xanh nghĩa là khẳng định
 * của nó **không ràng buộc gì** hoặc **không hề chạy** — cả hai đều là dằn tàu, không phải phép thử.
 *
 * ⛔ **Đây là điều kiện CẦN, không ĐỦ, và điều đó phải được nói ra.** `expect(1).toBe(1)` bị phủ định
 * cũng đỏ, mà nó chẳng canh gì. Cửa này **lọc rác**, nó KHÔNG chứng minh probe có giá trị. Cửa mạnh hơn
 * là đột biến **hiện thực** repo đích, nhưng nó đòi biết phá chỗ nào cho đúng — tri thức engine không có.
 * Ghi thành nợ có tên N1 thay vì để tài liệu ngụ ý cửa này kín.
 *
 * Vì sao chọn phủ định thay vì nhờ model viết bản hỏng: phép này **tất định** và không tốn model — đúng
 * nguyên tắc «máy phân loại, model chỉ viết lời văn».
 */
export function negateAssertions(code: string, ext = '.ts'): { code: string; soKhangDinh: number } {
  const src = typeof code === 'string' ? code : '';
  if (ext.endsWith('.py')) {
    // Python: `assert X` -> `assert not (X)`; chỉ đảo dòng assert ở đầu câu lệnh.
    let dem = 0;
    const ra = src.replace(/(^|\n)(\s*)assert\s+(?!not\s)([^\n]+)/g, (_m, dau: string, thut: string, ve: string) => {
      dem++;
      return `${dau}${thut}assert not (${ve.replace(/\s*$/, '')})`;
    });
    return { code: ra, soKhangDinh: dem };
  }
  // JS/TS: expect(X).foo(...)  ->  expect(X).not.foo(...)
  // Đã có `.not.` thì GỠ đi — đảo hai lần là không đảo, và một probe viết bằng `.not` phải được đảo
  // đúng như mọi probe khác.
  let dem = 0;
  const ra = src.replace(/\bexpect(\.[A-Za-z]+)?\(([\s\S]*?)\)\s*\.\s*(not\s*\.\s*)?([A-Za-z])/g, (_m, hau: string | undefined, ve: string, co: string | undefined, kyTu: string) => {
    dem++;
    const dauExpect = `expect${hau ?? ''}(${ve})`;
    return co ? `${dauExpect}.${kyTu}` : `${dauExpect}.not.${kyTu}`;
  });
  return { code: ra, soKhangDinh: dem };
}

export interface MutationGateInput {
  code: string;
  ext: string;
  /** Chạy code đã đảo, trả về `true` nếu probe ĐỎ. Tiêm vào để ca test không phải dựng sandbox. */
  chayVaHoiCoDo: (codeDaDao: string) => boolean;
}

export type MutationGateResult = { qua: true; soKhangDinh: number } | { qua: false; ly_do: string };

/**
 * Cửa đột biến cho probe hạng 2.
 *
 * ⛔ Mọi nhánh KHÔNG chắc chắn đều dẫn về **trượt cửa** (⛔C2): không có khẳng định nào để đảo, phép chạy
 * ném lỗi, hay probe vẫn xanh — cả ba đều là «chưa chứng minh được», và «chưa chứng minh được là sai»
 * không phải «đã chứng minh là đúng». Đề xuất một probe chưa qua cửa là đưa dằn tàu sang repo người khác.
 */
export function mutationGate(input: MutationGateInput): MutationGateResult {
  const inp = input ?? ({} as MutationGateInput);
  const { code, soKhangDinh } = negateAssertions(inp.code ?? '', inp.ext ?? '.ts');
  if (soKhangDinh === 0) return { qua: false, ly_do: 'không tìm thấy khẳng định nào để đảo — probe không kiểm gì' };

  let coDo: boolean;
  try {
    coDo = inp.chayVaHoiCoDo(code) === true;
  } catch (e) {
    return { qua: false, ly_do: `chạy bản đã đảo gặp lỗi (${(e as Error)?.message?.slice(0, 120) ?? 'không rõ'}) — không chứng minh được` };
  }
  if (!coDo) return { qua: false, ly_do: 'đảo hết khẳng định mà probe vẫn XANH — khẳng định không ràng buộc, hoặc không hề chạy' };
  return { qua: true, soKhangDinh };
}

// ---------- Đề xuất giao ----------

/** Hạng của một ĐỀ XUẤT chỉ có thể là 1 hoặc 2 — hạng 3 bị vứt, nên nó không bao giờ thành đề xuất. */
export type ProposedTier = 1 | 2;

export interface HandoverProposal {
  probe_id: string;
  spec_rule?: string;
  hang: ProposedTier;
  ly_do: string;
  /** Mã nguồn chạy được, đã tách thành file độc lập. */
  code: string;
}

/** Đề xuất KHÔNG có trần: nó rỗng dần vì repo đích NHẬN, không vì đụng trần rồi bị loại. */
export function buildProposal(
  plan: Pick<ProbePlan, 'id' | 'spec_rule'>,
  hang: ProposedTier,
  ly_do: string,
  code: string,
): HandoverProposal {
  return { probe_id: plan?.id ?? '?', spec_rule: plan?.spec_rule, hang, ly_do, code };
}
