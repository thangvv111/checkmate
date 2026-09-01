// Schema dùng chung CLI ↔ web ↔ replay — theo spec MVP §2 (msb-hackathon-ai-checker-spec-mvp.md)

// 3 mức finding (spec §10). Cổng vẫn nhị phân: FAIL ⟺ có ≥1 high.
// high = chặn merge · medium = merge phải xác nhận từng cảnh báo · low = cho qua, vẫn ghi log.
export type Severity = 'high' | 'medium' | 'low';

// Run cũ còn lưu 'blocking'/'non_blocking' — mọi chỗ đọc phải qua hàm này.
export function chuanMuc(s: string): Severity {
  const t = (s ?? '').toLowerCase().trim();
  if (t === 'high' || t === 'medium' || t === 'low') return t;
  if (t === 'non_blocking') return 'medium';
  return 'high'; // blocking + mọi giá trị lạ → fail-closed
}
export type SkillId = 'code' | 'doc';

export interface EvidenceTestRun {
  type: 'test_run';
  probe_name: string;
  probe_code: string;
  command: string;
  expected: string;
  actual: string;
  exit_code: number;
}

export interface EvidenceQuotePair {
  type: 'quote_pair';
  loc_a: string;
  quote_a: string;
  loc_b: string;
  quote_b: string;
}

export interface EvidenceQuote {
  type: 'quote';
  loc: string;
  quote: string;
  rule: string;
}

export type Evidence = EvidenceTestRun | EvidenceQuotePair | EvidenceQuote;

/**
 * Bảy defect type của ODC (IBM, IEEE TSE 1992; bản 5.2/2013) — «bản vá TỐI THIỂU sửa cái gì».
 * Phân loại theo bản chất bản vá, không theo cách lỗi lộ ra (cái đó là trigger của probe).
 */
export type OdcType =
  | 'assignment_init'       // gán/khởi tạo: giá trị sai, hoặc không được gán
  | 'checking'              // thiếu/sai phép kiểm tham số hay dữ liệu trong điều kiện
  | 'algorithm_method'      // viết lại thuật toán/cấu trúc dữ liệu cục bộ, không cần đổi thiết kế
  | 'function_class'        // đụng năng lực, giao diện, dữ liệu toàn cục ⇒ phải đổi thiết kế
  | 'timing_serialization'  // tuần tự hoá tài nguyên dùng chung: thiếu, sai, hoặc sai kỹ thuật
  | 'interface_messages'    // giao tiếp giữa module/hàm/object — tham số, thông điệp
  | 'relationship'          // quan hệ giữa procedure/dữ liệu/object — giả định chéo giữa hai nơi
  | 'unknown';              // model không suy được, hoặc trả giá trị ngoài danh mục

/** Qualifier ODC — nonexistent / wrong / irrelevant. */
export type OdcQualifier = 'missing' | 'incorrect' | 'extraneous' | 'unknown';

const ODC_TYPE = new Set<string>([
  'assignment_init', 'checking', 'algorithm_method', 'function_class',
  'timing_serialization', 'interface_messages', 'relationship',
]);
const ODC_QUALIFIER = new Set<string>(['missing', 'incorrect', 'extraneous']);

/**
 * Chuẩn hoá hai trường phân loại — cửa validate DUY NHẤT (cửa song sinh của `chuanMuc`).
 *
 * Khác `chuanMuc` một cách CÓ CHỦ ĐÍCH: severity gác cổng merge nên giá trị lạ fail-closed về
 * `high`; hai trường này là TELEMETRY, không gác gì cả, nên giá trị lạ về `unknown`. Cho telemetry
 * quyền đổi verdict là mở đường lách «bịa phân loại khéo thì merge được».
 */
export function normalizeOdcType(x: unknown): OdcType {
  const t = typeof x === 'string' ? x.toLowerCase().trim() : '';
  return ODC_TYPE.has(t) ? (t as OdcType) : 'unknown';
}
export function normalizeOdcQualifier(x: unknown): OdcQualifier {
  const t = typeof x === 'string' ? x.toLowerCase().trim() : '';
  return ODC_QUALIFIER.has(t) ? (t as OdcQualifier) : 'unknown';
}

export interface Finding {
  id: string;
  skill: SkillId;
  severity: Severity;
  title_vi: string;
  what_vi: string;
  consequence_vi: string;
  evidence: Evidence;
  /**
   * Ba trường TELEMETRY (tuỳ chọn — verdict cũ không có chúng vẫn đọc nguyên vẹn).
   * `minimal_fix` viết TRƯỚC, `odc_type` suy TỪ nó: ODC nguyên bản gán type lúc ĐÓNG defect (đã
   * biết vá gì), CheckMate gán lúc MỞ finding, nên phải bắt phác bản vá ra trước rồi mới phân loại.
   * KHÔNG tham gia quyết PASS/FAIL, KHÔNG đổi severity.
   */
  minimal_fix?: string;
  odc_type?: OdcType;
  qualifier?: OdcQualifier;
}

export interface ArtifactRef {
  type: 'pr' | 'doc';
  name: string;
  sha_or_hash: string;
}

export interface Verdict {
  run_id: string;
  skill: SkillId;
  artifact_ref: ArtifactRef;
  result: 'PASS' | 'FAIL';
  findings: Finding[];
  model: string;
  // Chi phí lượt chấm — để theo dõi tiền theo từng lượt, không phải suy từ log
  chi_phi?: {
    calls: number;
    token_vao: number;
    token_ra: number;
    uoc_tinh: boolean; // true = ước từ số ký tự (đường CLI không trả usage), false = usage thật của API
  };
  // C5: PASS/FAIL nói trên cơ sở nào — độ phủ probe đưa thẳng vào verdict
  probe_stats?: {
    ke_hoach: number; // số probe model đề ra
    ghi_nhan: number; // số probe thực chạy và được ghi nhận
    pass: number;
    hoi_quy: number;
    /** R1.18 — PR khai luật mới rồi vi phạm ngay luật vừa khai; chặn merge như hồi quy */
    vi_pham_luat_moi?: number;
    /** R1.22 — độ phủ luật: bao nhiêu luật có probe neo vào, trên tổng số luật đọc được từ specs/ */
    luat_da_phu?: string[];
    luat_tong?: number;
    ngoai_pham_vi: number; // fail cả hai nhánh cùng nguyên nhân — không quy tội PR
    nghi_loi_co_san: number; // probe THƯ VIỆN fail cả hai nhánh — đã chứng minh contract nên nghi lỗi có sẵn/spec đổi
    nghi_van: number;
    cai_thien: number;
    bo_qua: number;
    that_lac: string[]; // id probe trong kế hoạch nhưng không thấy khi chạy
    /**
     * Phân bố probe theo trigger — CHỈ bề mặt người xem (màn cấu hình thuật toán sẽ đọc).
     * TUYỆT ĐỐI không phát ngược vào prompt và không có chỉ tiêu «phủ đủ trigger»: trần probe đã
     * từng biến thành chỉ tiêu (ke_hoach = trần ở 14/14 lượt đo được), và probe chiếu lệ rải đều
     * danh mục sẽ làm false-PASS TRÔNG đáng tin hơn thực tế.
     */
    trigger_distribution?: Record<string, number>;
  };
  // Quan sát NGOÀI phạm vi PR: probe fail trên cả hai nhánh — verdict không đổi vì cổng chỉ trả lời
  // "PR này có làm hỏng gì không", nhưng lỗi-có-sẵn không được im lặng: báo tách để đội mở việc riêng.
  quan_sat_ngoai_pr?: Array<{
    probe_id: string;
    ten: string;
    spec_rule: string;
    loai: 'nghi_loi_co_san' | 'ngoai_pham_vi';
    message: string; // dòng đầu lỗi trên nhánh gốc
  }>;
  /**
   * File MÃ NGUỒN bị loại khỏi diff — verdict KHÔNG nói gì về chúng.
   *
   * Engine vốn đã biết điều này (`readTarget` trả `ngoaiTamNhin` kèm lý do từng file), nhưng trước
   * đây nó chỉ đi ra dưới dạng một câu tiếng Việt trong log. Giao diện muốn dựng cảnh báo thì phải
   * dò chữ trong lời văn — vỡ ngay lần ai đó sửa một từ. Nay là dữ liệu.
   *
   * Vắng trường này nghĩa là KHÔNG BIẾT (bản ghi đời cũ), không phải «không có vùng mù».
   */
  diff_blind_spots?: Array<{ file: string; reason: string }>;
  /**
   * Quyết định làm THAY ĐỔI TÀI SẢN regression trong lượt này.
   * `not_admitted` — probe mới bị bỏ, tức không thêm tài sản.
   * `evicted` — probe đã có bị gỡ, tức MẤT tài sản đã chứng minh được mình.
   * Hai việc hậu quả khác hẳn nhau nên tách mã, không gộp thành một cờ.
   */
  library_changes?: Array<{ probe_id: string; action: 'not_admitted' | 'evicted'; reason: string }>;
  /** Nhánh gốc không chạy được probe nào — probe đỏ khi đó chỉ là nghi vấn, không thành hồi quy. */
  no_baseline?: boolean;
  /** Tên người bấm chạy. VẮNG = lượt do máy chạy (chế độ trực) — hai thứ chịu trách nhiệm khác nhau. */
  run_by?: string;
  /**
   * Head của pull request đã đổi TRONG LÚC lượt chấm chạy — verdict này ra đời đã hết hiệu lực.
   * Cổng vốn đã chặn ở đường ghi; trường này để màn hình nói ra TRƯỚC khi người dùng bấm.
   */
  head_moved?: { new_sha: string; at: string };
  mode: 'live' | 'replay';
  started_at: string;
  finished_at: string;
}

export type RunEvent =
  | { type: 'stage'; stage: number; ten: string }
  | { type: 'log'; msg: string }
  | { type: 'finding'; finding: Finding }
  | { type: 'verdict'; verdict: Verdict }
  /**
   * Head pull request đổi giữa lúc chấm. Phát ra NGAY để người đang xem thấy mà không phải tải lại.
   * Lượt chấm vẫn chạy tới hết — verdict trên commit cũ không dùng được ở cổng, nhưng phần lớn
   * finding vẫn đúng với mã nguồn, nên nó còn giá trị đọc.
   */
  | { type: 'head_moved'; new_sha: string; at: string }
  | { type: 'error'; msg: string };
