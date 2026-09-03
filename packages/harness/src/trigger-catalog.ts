/**
 * TRIGGER CATALOG — vốn từ vựng «cách nào LÀM LỘ lỗi», nền ODC (IBM, IEEE TSE 1992; bản 5.2/2013).
 *
 * Vì sao tồn tại: 17 khuôn lỗi đời trước là một danh sách PHẲNG toàn án lệ, không có tầng trục ở
 * trên, nên mỗi bài học mới chỉ có một chỗ để đi — thêm một khuôn nữa. Kho đầy trần là chuyện thời
 * gian, và một năm sau thì không ai quét hết nổi. ODC không phình vì nó tách ba thứ: cái gì làm LỘ
 * lỗi (trigger — file này), lỗi LÀ GÌ (defect type — `Finding.odc_type`), và lần nào ĐÃ hỏng (án lệ
 * — dữ liệu, sống TRONG trigger, có trần và đào thải).
 *
 * DANH MỤC ≠ TẬP KÍCH HOẠT (PO chốt 01/09):
 *  · DANH MỤC (file này) là vốn từ vựng — mỗi mã có định nghĩa + ranh giới với mã cạnh. Mở rộng
 *    ĐƯỢC, nhưng thêm mã phải đi qua một change có định nghĩa rõ. KỶ LUẬT đó (không phải con số)
 *    mới là thứ ngăn quay về kho phẳng tự phình.
 *  · TẬP KÍCH HOẠT là tập trigger thật sự phát cho MỘT repo đích — khai ở `review.triggers` trong
 *    checkmate.yml. Repo cần 2 thì bật 2, cần 30 thì danh mục mở rộng tới đó. Vắng khai = toàn danh
 *    mục. Số lượng KHÔNG phải hằng kiến trúc.
 *
 * Trigger là thuộc tính của PROBE, không phải của FINDING — đừng nhầm với `odc_type` (bản chất lỗi)
 * hay nhãn máy R1 (`hoi_quy`/`pass`… — kết quả chạy trên hai nhánh). Bốn trục trực giao, mỗi trục
 * trả lời đúng một câu hỏi.
 */

export type TriggerId =
  | 'spec_conformance'
  | 'logic_flow'
  | 'backward_compat'
  | 'side_effects'
  | 'language_dependency'
  | 'coverage'
  | 'variation'
  | 'sequencing'
  | 'interaction'
  | 'recovery_exception';

export interface TriggerDef {
  id: TriggerId;
  /** Gốc ODC 5.2 — giữ tên tiếng Anh nguyên bản để truy được về tài liệu nguồn */
  odc: string;
  /** MỘT dòng phát vào prompt: bảo model probe kiểu này tìm cái gì */
  huong_dan: string;
  /** Ranh giới với mã cạnh — KHÔNG phát vào prompt; để người duyệt danh mục biết chỗ dễ lẫn */
  ranh_gioi: string;
}

/**
 * Nội dung KHỞI ĐIỂM của danh mục: 10 mã, đối chiếu từ 21 trigger ODC với mô hình chấm của
 * CheckMate (probe TẤT ĐỊNH chạy trong sandbox worktree hai nhánh).
 *
 * Bảy trigger ODC bị loại và lý do — ghi ở đây vì «vì sao KHÔNG có» cũng là tri thức của danh mục:
 *  · Concurrency/Timing — chỉ loại phần RACE XÁC SUẤT: probe fail 1/10 lần rơi vào bảng chân trị R1
 *    sẽ sinh `hoi_quy` OAN, mà cổng kêu oan vài lần là bị tắt. Concurrency TẤT ĐỊNH không mất:
 *    deadlock làm treo → lưới treo tự sinh finding mức chặn (không cần trigger nào); interleaving
 *    dựng tay + lock ordering → `sequencing`; cơ chế khoá không được tôn trọng → `spec_conformance`.
 *    Race xác suất vào lại danh mục khi có chính sách rerun-N + nhãn `khong_on_dinh`.
 *  · Workload/Stress — sandbox không kiểm soát tài nguyên đồng đều; probe phân biệt nhánh bằng thời
 *    gian là nguồn flaky vô hạn.
 *  · Lateral Compatibility — probe cross-repo/cross-service không chạy được trong sandbox; phần
 *    trong-repo đã có `interaction`.
 *  · Internal Document — comment lệch code không làm probe fail được (không có evidence chạy);
 *    trigger này thuộc cổng DOC.
 *  · Hardware/Software Configuration — sandbox một máy đồng nhất; ma trận version nhân đôi chi phí.
 *  · Simple/Complex Path — ở mô hình này trùng vai `logic_flow` (đều là white-box theo diff); hai
 *    tên cho một việc là mời phân loại tuỳ tiện.
 *  · Startup/Restart — có giá trị (migration lên/xuống) nhưng chưa repo đích nào cần; ứng viên đầu
 *    tiên VÀO danh mục khi có bằng chứng.
 */
export const TRIGGER_CATALOG: readonly TriggerDef[] = [
  {
    id: 'spec_conformance',
    odc: 'Design Conformance',
    huong_dan: 'neo thẳng vào MỘT luật trong nguồn luật của repo đích và thử đúng điều luật đó khai;',
    ranh_gioi: 'khác logic_flow: chỗ neo là VĂN BẢN LUẬT, không phải nhánh code trong diff.',
  },
  {
    id: 'logic_flow',
    odc: 'Logic/Flow',
    huong_dan: 'đi theo nhánh và luồng dữ liệu trong diff: điều kiện kép tách từng vế, giá trị BIÊN đúng ngưỡng (biên đóng/mở), phép tính tổng-các-phần phải bằng tổng gốc kể cả số chia không hết;',
    ranh_gioi: 'khác variation: đây là nhánh/luồng đọc từ CODE, không phải biến thể của ĐẦU VÀO.',
  },
  {
    id: 'backward_compat',
    odc: 'Backward Compatibility',
    huong_dan: 'hành vi cũ đang chạy đúng ở nhánh gốc phải còn nguyên sau PR (probe kỳ vọng QUA, để chứng minh PASS xứng đáng khi PR sạch);',
    ranh_gioi: 'khác side_effects: đây là hành vi ĐÃ CAM KẾT, không phải trạng thái ngoài phạm vi.',
  },
  {
    id: 'side_effects',
    odc: 'Side Effects',
    huong_dan: 'trạng thái NGOÀI phạm vi diff bị đổi: luật vừa cài ở một cửa thì soi các CỬA SONG SINH cùng vai (đường ghi / đường đọc / cửa kiểm / đường hiển thị) — mọi cửa phải cùng luật và cùng lời; giá trị gõ-tay-được không được vọng nguyên văn ra log/sổ;',
    ranh_gioi: 'khác interaction: không cần hai chức năng cùng chạy — một đường ghi cũng đủ.',
  },
  {
    id: 'language_dependency',
    odc: 'Language Dependency',
    huong_dan: 'bẫy đặc thù ngôn ngữ: ép kiểu ngầm, so sánh lỏng, đọc thuộc tính trên undefined/null, chuỗi rỗng falsy bị hiểu thành vắng mặt;',
    ranh_gioi: 'khác variation: lỗi nằm ở NGỮ NGHĨA NGÔN NGỮ, không ở miền giá trị nghiệp vụ.',
  },
  {
    id: 'coverage',
    odc: 'Coverage',
    huong_dan: 'gọi thẳng hàm/endpoint mới trong diff với đầu vào thường, một bộ tham số — phép thử rẻ nhất, nền của PASS-phải-có-bằng-chứng;',
    ranh_gioi: 'khác variation: ĐÚNG MỘT bộ tham số bình thường, không biến thể.',
  },
  {
    id: 'variation',
    odc: 'Variation (gộp Rare Situation)',
    huong_dan: 'cùng một chức năng nhưng đa dạng đầu vào: trường bắt buộc khuyết ở MỌI TẦNG (thiếu trường, phần tử null, cả cụm null, sai kiểu), giá trị ngoài miền, tổ hợp bị CẤM, tổ hợp hiếm — phải ra lỗi nghiệp vụ đọc được nói rõ trường nào, không TypeError/500, và KHÔNG được rơi-mềm sang mặc định;',
    ranh_gioi: 'gộp Rare Situation vì ranh giới hai cái mờ — hai ô mờ là hai ô bịa.',
  },
  {
    id: 'sequencing',
    odc: 'Sequencing',
    huong_dan: 'nhiều thao tác theo MỘT trình tự cụ thể (tạo→sửa→xoá→đọc lại), và interleaving dựng TAY tất định (nửa đầu thao tác A → trọn B → nửa sau A) để dựng lại deadlock, transaction lồng, lock ordering, khoá rò sau khi tiến trình chết;',
    ranh_gioi: 'chỉ chọn khi TỪNG thao tác chạy riêng đều qua, chỉ trình tự này mới hỏng.',
  },
  {
    id: 'interaction',
    odc: 'Interaction',
    huong_dan: 'hai khối chức năng hợp lệ riêng lẻ nhưng hỏng khi ghép: hàm che/chuẩn hoá áp sai miền theo ngữ cảnh gọi, đối chiếu dữ liệu ĐÃ QUA biến đổi phải so ảnh-với-ảnh;',
    ranh_gioi: 'khác sequencing: phức tạp hơn một chuỗi tuần tự — là tương tác, không phải thứ tự.',
  },
  {
    id: 'recovery_exception',
    odc: 'Recovery/Exception',
    huong_dan: 'đường LỖI: đầu vào sai phải trả lỗi nghiệp vụ đọc được (4xx) chứ không vỡ 500; hàm đứng CUỐI nhiều đường (format lỗi / che / ghi log) không được ném khi đầu vào khuyết; hai nguyên nhân khác nhau không được chung một thông điệp;',
    ranh_gioi: 'khác variation: đích là HÀNH VI KHI LỖI, không phải việc đầu vào có bị chặn không.',
  },
] as const;

const CHI_MUC = new Map<string, TriggerDef>(TRIGGER_CATALOG.map((t) => [t.id, t]));

/** Mã có trong danh mục không — cửa validate DUY NHẤT, dùng chung cho mọi đường (probe, config). */
export function isValidTrigger(x: unknown): x is TriggerId {
  return typeof x === 'string' && CHI_MUC.has(x);
}

export function timTrigger(id: string): TriggerDef | undefined {
  return CHI_MUC.get(id);
}

/**
 * Tập kích hoạt cho một repo: lọc theo danh sách repo khai, giữ THỨ TỰ của danh mục.
 *
 * Vắng khai (undefined/rỗng) = toàn danh mục — hành vi mặc định không đòi ai cấu hình.
 * Mã lạ trong config bị BỎ QUA + nói ra, KHÔNG làm chết lượt chấm: repo đích gõ nhầm một chữ không
 * được phép giết cổng (cùng nguyên tắc với `bo_qua_diff` sai cú pháp ở `readReviewCfg`).
 * Khai toàn mã lạ thì rơi về toàn danh mục — «không hiểu cấu hình» không được biến thành «không
 * phát khuôn nào», vì im lặng ở đây làm lượt chấm mù mà nhìn vẫn bình thường.
 */
export function tapKichHoat(khai?: readonly string[]): readonly TriggerDef[] {
  if (!Array.isArray(khai) || khai.length === 0) return TRIGGER_CATALOG;
  const la = khai.filter((x) => !isValidTrigger(x));
  if (la.length) {
    console.error(
      `checkmate.yml review.triggers: mã trigger không có trong danh mục, đã bỏ qua: ${la.join(', ')} — danh mục hiện có: ${TRIGGER_CATALOG.map((t) => t.id).join(', ')}`,
    );
  }
  const bat = new Set(khai.filter(isValidTrigger));
  if (bat.size === 0) {
    console.error('checkmate.yml review.triggers: không mã nào hợp lệ — rơi về TOÀN danh mục (không phát khuôn nào là làm lượt chấm mù trong im lặng)');
    return TRIGGER_CATALOG;
  }
  return TRIGGER_CATALOG.filter((t) => bat.has(t.id));
}
