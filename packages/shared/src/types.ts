// Schema dùng chung CLI ↔ web ↔ replay — theo spec MVP §2 (msb-hackathon-ai-checker-spec-mvp.md)

// 3 mức finding (spec §10). Cổng vẫn nhị phân: FAIL ⟺ có ≥1 high.
// high = chặn merge · medium = merge phải xác nhận từng cảnh báo · low = cho qua, vẫn ghi log.
export type Severity = 'high' | 'medium' | 'low';

// Run cũ còn lưu 'blocking'/'non_blocking' — mọi chỗ đọc phải qua hàm này.
//
// Nhận `unknown`, KHÔNG ném: severity là dữ liệu model trả về, và model có thể trả số, boolean, object,
// hay bỏ trống. Bản trước gọi `.toLowerCase()` thẳng nên `severity: 3` làm cả lượt chấm chết thành «lỗi»
// (gate.ts đã phải bọc `safeString` riêng cho web — engine thì không). Một severity không phải chuỗi là
// một GIÁ TRỊ LẠ và đi cùng đường với mọi giá trị lạ khác: fail-closed về `high`. Đo 06/09.
export function chuanMuc(s: unknown): Severity {
  const t = typeof s === 'string' ? s.toLowerCase().trim() : '';
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
  /**
   * Bản `actual` đã qua cổng phát (`error-message-egress-gate`) — thứ DUY NHẤT được đưa lên bề mặt rời
   * khỏi máy chủ (comment pull request, log). `actual` giữ nguyên văn cho sổ, màn hình run và phép so
   * vân tay; hai bản không thay thế nhau được.
   *
   * Optional vì verdict ghi TRƯỚC change này không có nó. Thiếu trường này thì bề mặt công khai phải
   * fail-closed — KHÔNG được rơi về `actual`, vì đó chính là lỗ mà cổng sinh ra để vá.
   */
  actual_redacted?: string;
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

/**
 * Nguồn của một khoá chuẩn khối lượng (capability `finding-volume-standard`).
 *   `default`            — repo không khai khoá này; dùng mặc định của engine.
 *   `repo`               — đọc được từ `checkmate.yml` ở NHÁNH GỐC của repo đích.
 *   `default_unreadable` — repo CÓ file ở nhánh gốc nhưng không đọc được (sai cú pháp / khối sai kiểu).
 *                          Phải phân biệt với `default`: đội đã siết chuẩn mà file hỏng thì lượt này đang
 *                          chấm lỏng hơn ý họ — đó là thứ phải lộ ra, không được trông y hệt «chưa khai».
 *   `no_repo`            — lượt chấm không có repo (tài liệu dán tay / tải lên).
 */
export type KnobSource = 'default' | 'repo' | 'default_unreadable' | 'no_repo';

/** Một khoá số đã KẸP: giá trị áp, nguồn, giá trị gốc nếu bị kẹp, lý do nếu bị bỏ vì sai kiểu. */
export interface Knob {
  value: number;
  source: KnobSource;
  clamped_from?: number;
  reason?: 'invalid_type';
}

/** Dải cỡ tài liệu (theo số từ) — bậc thang dưới tuyến tính, ranh trên. */
export type DensityBand = '<=1000' | '<=5000' | '>5000';

/** Vì sao phép đo mật độ KHÔNG áp ở lượt này. Bước hiện tại luôn `observe_only` khi đo được. */
export type DensityReason = 'observe_only' | 'under_floor' | 'unmeasurable' | 'error';

/**
 * Chuẩn khối lượng mà lượt chấm đã bị chấm theo — TRƯỜNG CÓ KIỂU trên verdict.
 *
 * Vì sao là nghĩa vụ của hợp đồng verdict: chuẩn nay do repo đích khai được, tức mỗi đội chấm theo một
 * ngưỡng khác nhau. Verdict không mang ngưỡng thì PASS của đội chấm theo 20 và PASS của đội chấm theo
 * 200 trông giống hệt nhau. Và số đếm TRƯỚC khi cắt là mẫu số của mọi phép đánh giá xem chuẩn đặt đúng
 * hay sai — để nó ở log là quyết định rằng câu hỏi ấy không bao giờ trả lời được từ dữ liệu đã có.
 *
 * VẮNG cả trường = bản ghi đời cũ, KHÔNG BIẾT — không phải «đã đo và bằng mặc định».
 */
export interface VolumeStandard {
  /** Trần finding của skill-doc. Vắng ở lượt code. */
  finding_cap?: Knob;
  /**
   * Trần probe của skill-code — HIỆU DỤNG = min(repo, operator). Repo đích chỉ ĐỀ NGHỊ; tài nguyên
   * sandbox là của bên chấm. `operator` vắng khi lượt chạy không có núm operator (CLI tay).
   */
  probe_cap?: { value: number; repo: Knob; operator?: number; bound_by: 'repo' | 'operator' };
  /**
   * Số đếm theo tầng. Doc dùng đủ; code dùng `before_cut` (kế hoạch thô) · `after_cut` (sau trần) ·
   * `candidates` (ứng viên probe có kết quả) · `final`. Số nào không có ở skill đó thì VẮNG, không ghi 0.
   */
  counts: {
    raw_round1?: number;
    after_machine_grids?: number;
    raw_round2?: number;
    before_cut: number;
    after_cut: number;
    after_skeptic?: number;
    candidates?: number;
    final: number;
    dropped_by_cap: number;
  };
  /** Phép đo mật độ — CHỈ skill-doc. Vắng ở lượt code, không ghi 0. */
  density?: {
    standard: { per_1000_words: Knob; floor_words: Knob };
    words: number;
    count_method: 'v1';
    band?: DensityBand;
    threshold_per_1000?: number;
    measured_per_1000?: number;
    exceeded?: boolean;
    /** Bước này CHỈ ĐO. `applied` luôn false; change ép chuẩn sẽ đổi nghĩa trường này. */
    applied: false;
    reason: DensityReason;
  };
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
    /**
     * Độ phủ luật: đơn vị luật có probe neo vào, trên tổng số đơn vị đọc được từ spec của repo đích.
     * CẢ HAI VẮNG khi lượt chấm không có đơn vị luật nào — độ phủ khi đó KHÔNG ĐO ĐƯỢC, không phải 0:
     * `0` là đã đếm và không probe nào neo được; không-đo-được là không có mẫu số. Xem `spec_source`.
     */
    luat_da_phu?: string[];
    luat_tong?: number;
    ngoai_pham_vi: number; // fail cả hai nhánh cùng nguyên nhân — không quy tội PR
    /**
     * ĐỜI CŨ — không còn được sinh ra từ `probe-handover-replaces-library`.
     *
     * Nhãn này do đúng một dòng trong `skill-code.ts` sinh ra, gác bằng `nguon === 'thu_vien'`, và chưa
     * bao giờ được khai trong spec `probe-classification`. Gỡ thư viện làm nó không tới được nữa.
     *
     * GIỮ trong kiểu vì `web-runs/` và `runs/` trên prod có bản ghi mang nó — gỡ khỏi kiểu là làm bản
     * ghi đời cũ không đọc được. VẮNG nghĩa là bản ghi đời MỚI, không phải «bằng 0».
     */
    nghi_loi_co_san?: number;
    nghi_van: number;
    cai_thien: number;
    bo_qua: number;
    that_lac: string[]; // id probe ĐÃ ĐƯA VÀO CHẠY nhưng không thấy kết quả
    /**
     * ĐỜI CŨ — không còn được sinh ra từ `probe-handover-replaces-library` (cách ly gỡ cùng thư viện).
     *
     * Số probe thư viện bị CÁCH LY trong lượt này — không nạp được trên nhánh gốc, nên bị loại ra để
     * lượt chấm chạy tiếp được.
     *
     * VẮNG mặt ở verdict đời cũ, và bề mặt đọc phải phân biệt vắng-mặt với `0`: `0` nghĩa là đã đếm và
     * không probe nào bị cách ly; vắng nghĩa là lượt chấm ấy chạy trước khi có phép đo này.
     *
     * Con số này nói lượt chấm **yếu đi bao nhiêu**. Giấu nó đi thì cách ly biến một lỗi ỒN ÀO (lượt chấm
     * chết) thành một lỗi IM LẶNG (PASS mỏng hơn tưởng) — đổi một cái dở lấy một cái nguy hiểm hơn.
     */
    cach_ly?: number;
    /**
     * Mức cô lập THỰC TẾ của môi trường mà code artifact đã chạy trong đó.
     *
     * `container` — chạy trong môi trường cô lập dùng-một-lần. `none` — nền không cô lập được (thiếu
     * runtime, hệ điều hành không hỗ trợ), lượt chấm vẫn chạy nhưng KHAI RA điều đó.
     *
     * VẮNG trường này nghĩa là bản ghi có TRƯỚC phép đo này — **không** có nghĩa là không cô lập. Bản ghi
     * cũ có thể đã chạy ở bất kỳ đâu; không biết là một trạng thái riêng, và bề mặt đọc phải nói vậy.
     */
    co_lap?: { muc: 'container' | 'none'; runtime?: string; ly_do_khong?: string };
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
   * Đề xuất GIAO cho repo đích — thay cho việc âm thầm nạp probe vào một kho tích luỹ
   * (change `probe-handover-replaces-library`).
   *
   * Probe là đầu dò DÙNG MỘT LẦN. Thứ đáng giữ đi ra ngoài ở đây, để đội repo đích thêm vào bộ test
   * của họ — nơi nó chạy ở MỌI commit, chạy MỘT lần (không phải hai nhánh), và có người trông khi nó
   * mục. Cùng test ấy nằm trong CheckMate thì chỉ chạy khi CheckMate chấm, chạy hai lần, và không ai
   * biết nó tồn tại.
   *
   * `hang` là CHẤT LƯỢNG BẰNG CHỨNG, không phải mức ưu tiên:
   *   1 — probe ĐÃ NỔ trong lượt này (`hoi_quy`/`vi_pham_luat_moi`). Bằng chứng bằng quan sát.
   *   2 — probe xanh cả hai nhánh nhưng canh một luật PR mới thêm mà test repo chưa phủ; đã qua cửa
   *       đột biến (đảo khẳng định thì nó ĐỎ).
   *
   * ⛔ Máy KHÔNG tự đưa test vào repo đích (⛔C1). Đây là ĐỀ XUẤT; người quyết.
   *
   * Vắng trường này nghĩa là bản ghi đời cũ HOẶC lượt này không có gì đủ bằng chứng — hai thứ khác
   * nhau, và bề mặt đọc phải phân biệt bằng việc lượt ấy có chạy hay không.
   */
  handover?: Array<{ probe_id: string; spec_rule?: string; hang: 1 | 2; ly_do: string; code: string }>;

  /**
   * Probe ĐỦ BẰNG CHỨNG mà vẫn KHÔNG giao được — kèm lý do.
   *
   * Hai ca: tách không thành file độc lập (cú pháp ngoài khuôn), và trượt cửa đột biến. Cả hai phải hiện
   * ra chứ không biến mất im lặng: một probe đã bắt được lỗi thật mà không giao được là một mất mát
   * người vận hành cần biết, và nó chỉ ra chỗ máy tách hoặc cửa đột biến cần sửa.
   */
  handover_bo_qua?: Array<{ probe_id: string; ly_do: string }>;
  /**
   * Quyết định làm THAY ĐỔI TÀI SẢN regression trong lượt này.
   * `not_admitted` — probe mới bị bỏ, tức không thêm tài sản.
   * `evicted` — probe đã có bị gỡ, tức MẤT tài sản đã chứng minh được mình.
   * Hai việc hậu quả khác hẳn nhau nên tách mã, không gộp thành một cờ.
   */
  /**
   * Ba việc KHÁC NHAU, và không được gộp:
   *   `not_admitted` — probe MỚI của lượt này không được nhận vào thư viện. Thư viện không mất gì.
   *   `evicted`      — probe ĐÃ CÓ bị gỡ (trùng lặp hoặc vượt trần). Thư viện mất một phép thử, vĩnh viễn.
   *   `quarantined`  — probe ĐÃ CÓ bị cách ly vì không nạp được trên nhánh gốc. Nó **vẫn còn**, chỉ thôi
   *                    tham gia lượt chấm cho tới khi người vận hành gỡ dấu — đảo ngược được, khác hẳn `evicted`.
   */
  library_changes?: Array<{ probe_id: string; action: 'not_admitted' | 'evicted' | 'quarantined'; reason: string }>;
  /** Nhánh gốc không chạy được probe nào — probe đỏ khi đó chỉ là nghi vấn, không thành hồi quy. */
  no_baseline?: boolean;
  /**
   * Đối chiếu hai nhánh, dạng ĐỌC ĐƯỢC.
   *
   * Trước đây log đổ ra hai dòng thô kiểu `P1·8213=p P2·bc87=p …` cho từng nhánh — bắt người đọc so
   * 39 cặp bằng mắt, trong khi MÁY ĐÃ SO RỒI (`trangThai` của từng probe). Đó là nguyên tắc của cả
   * sản phẩm bị vi phạm ngay trong log của nó: máy phân loại, người đọc kết luận.
   *
   * Chỉ mang probe KHÔNG pass-cả-hai; số còn lại nằm ở `pass_both`. Một probe xanh ở cả hai nhánh
   * không nói gì về PR này, và 35 dòng như thế chôn mất 4 dòng có nghĩa.
   */
  probe_compare?: {
    pass_both: number;
    rows: Array<{
      /** Nhãn đã nối được mã probe + vân tay title, ví dụ `P2·bc87`. */
      label: string;
      /** Luật mà probe neo vào — nói probe này tồn tại để làm gì. */
      rule?: string;
      /** Tên probe, đã cắt. Do model viết → dữ liệu ngoài, phải escape trước khi vào HTML. */
      name?: string;
      /** Mục đích đầy đủ hơn — dài, nên chỉ hiện khi người dùng hỏi tới (tooltip). */
      purpose?: string;
      pr: 'pass' | 'fail' | 'skip' | 'missing';
      base: 'pass' | 'fail' | 'skip' | 'missing' | 'no_baseline';
      /** Nhãn MÁY đã phong — không tính lại ở chỗ hiển thị, kẻo hai nơi lệch nhau. */
      state: string;
    }>;
  };
  /** Tên người bấm chạy. VẮNG = lượt do máy chạy (chế độ trực) — hai thứ chịu trách nhiệm khác nhau. */
  run_by?: string;
  /**
   * Head của pull request đã đổi TRONG LÚC lượt chấm chạy — verdict này ra đời đã hết hiệu lực.
   * Cổng vốn đã chặn ở đường ghi; trường này để màn hình nói ra TRƯỚC khi người dùng bấm.
   */
  head_moved?: { new_sha: string; at: string };
  /**
   * Nguồn luật của lượt này — lấy từ đâu, đọc được bao nhiêu đơn vị. `units: 0` là lượt chấm KHÔNG
   * CÓ LUẬT ĐỐI CHIẾU: verdict yếu hơn (không phong được «vi phạm luật mới», độ phủ không đo được) và
   * điều đó phải được bày ra TRƯỚC verdict, vì nó đổi cách đọc verdict. `probes` là từng chỗ đã khai
   * hoặc đã dò, kể cả chỗ không thấy gì — dò tìm là phán đoán, phán đoán phải nói ra.
   * Vắng trường = bản ghi đời cũ, KHÔNG BIẾT.
   */
  spec_source?: {
    /** true = repo khai trong checkmate.yml · false = engine tự dò. */
    declared: boolean;
    files: string[];
    units: number;
    probes: Array<{ pattern: string; files: number; units?: number; used: boolean; note?: string }>;
    /** Đường khai bị loại ở cửa đọc (tuyệt đối, có `..`). */
    rejected?: Array<{ key: string; pattern: string; reason: string }>;
  };
  /** Chuẩn khối lượng đã áp + số đếm theo tầng + phép đo mật độ. Vắng = bản ghi đời cũ, KHÔNG BIẾT. */
  volume_standard?: VolumeStandard;
  mode: 'live' | 'replay';
  started_at: string;
  finished_at: string;
}

/**
 * Vì sao một lượt chấm không đủ cơ sở kết luận — MÃ MÁY ĐỌC ĐƯỢC, không phải một câu chữ.
 *
 * Hai loại vì việc người đọc phải làm khác hẳn nhau:
 *   `khong_probe_nao_toi_noi` — probe viết sai, không phép thử nào chạy được đến nơi ⇒ đọc lại probe.
 *   `goc_khong_doi_chung`     — nhánh gốc không chạy được probe nào (thường vì PR thêm module mới),
 *                               và không probe nào pass trên nhánh PR ⇒ không có gì để đối chứng.
 *
 * Bản trước nhận diện kết cục này bằng `/không đủ cơ sở/i.test(thông_điệp_lỗi)` ở đúng đường render.
 * Sửa lời văn là mất tính năng và không lưới nào đỏ.
 */
export type InsufficientBasisKind = 'khong_probe_nao_toi_noi' | 'goc_khong_doi_chung';

export interface InsufficientBasis {
  loai: InsufficientBasisKind;
  /** Số probe đã chạy — người đọc phải biết lượt chấm thử bao nhiêu lần trước khi bỏ cuộc. */
  so_probe: number;
  /** Lý do vài probe đầu, ĐÃ GỘT trước khi ra khỏi engine. */
  ly_do: string;
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
  /**
   * Lượt chấm không đủ cơ sở kết luận. Phát NGAY TRƯỚC cú ném — đường ném giữ nguyên (fail-closed),
   * sự kiện này là DẤU VẾT máy đọc được, không phải đường thoát.
   */
  | { type: 'khong_du_co_so'; chi_tiet: InsufficientBasis }
  | { type: 'error'; msg: string };
