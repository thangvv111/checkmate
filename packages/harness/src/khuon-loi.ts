/**
 * Kho khuôn lỗi COMMON (specs/R12) — tri thức tái dùng giữa các repo.
 *
 * Probe không chạy được cross-repo (nó import hàm thật của repo đích); thứ mang đi được là KHUÔN:
 * mẫu lỗi trừu tượng đúc từ finding thật, phát vào prompt sinh probe (code) và prompt tìm lỗi (doc).
 * Mỗi khuôn PHẢI kèm án lệ (R12.2) — không án lệ là phỏng đoán, không nhận. Án lệ không vào prompt.
 *
 * Khuôn per-repo vẫn ở `review.khuon_loi` của checkmate.yml repo đích — hai tầng, không trộn (R12.1).
 */

export interface KhuonLoi {
  id: string;
  loai: 'code' | 'doc';
  /** MỘT dòng mệnh lệnh kiểm được, phát thẳng vào prompt (R12.5) */
  khuon: string;
  /** Finding thật đã đúc ra khuôn — cho người duyệt kho, KHÔNG phát vào prompt (R12.2) */
  an_le: string;
  /** Chỉ bật khi spec repo đích khớp (R12.4); bỏ trống = phát cho mọi repo */
  dieu_kien?: RegExp;
  /** Khuôn bắt buộc dạng «BẮT BUỘC có probe…» được đẩy lên đầu danh sách */
  len_dau?: boolean;
}

export const TRAN_KHUON = 20; // mỗi loại (R12.3)

export const KHO_KHUON: KhuonLoi[] = [
  // ---- code · gốc từ đời đầu của prompt ----
  {
    id: 'KL1',
    loai: 'code',
    khuon: 'điều kiện KÉP bị gộp sai: thử TỪNG VẾ riêng (vế này đúng + vế kia sai, và ngược lại);',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts, trước specs/R12) — repo demo-credit-approval, điều kiện duyệt gộp hai vế sai một',
  },
  {
    id: 'KL2',
    loai: 'code',
    khuon: 'giá trị BIÊN đúng ngưỡng của hằng số trong spec (biên đóng/mở);',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, off-by-one quanh ngưỡng hạn mức phê duyệt',
  },
  {
    id: 'KL3',
    loai: 'code',
    khuon: 'phép tính số học: tổng các phần phải bằng đúng tổng gốc, thử số CHIA KHÔNG HẾT / làm tròn;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, chia kỳ trả góp số lẻ lệch tổng gốc',
  },
  {
    id: 'KL4',
    loai: 'code',
    khuon: 'hành vi cũ không bị PR phá (probe kỳ vọng qua, để chứng minh PASS xứng đáng khi PR sạch).',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — nền phân loại R1 (specs/R1-phan-loai-probe.md): PASS phải được chứng minh, không phải mặc định',
  },
  {
    id: 'KL5',
    loai: 'code',
    khuon:
      'PHÂN QUYỀN (spec repo này có luật về quyền/vai): BẮT BUỘC có probe thử VƯỢT QUYỀN — actor không đủ quyền thực hiện hành động của actor đủ quyền, và tự thao tác trên đối tượng của chính mình nếu spec cấm;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, nhân viên tự duyệt hồ sơ mình; và P4 vòng 11–12 PR #12 checkmate (vai tu_dong ở cổng, specs/R11.18b)',
    dieu_kien: /quyền|vai trò|role|permission|phân cấp|thẩm quyền|actor|chỉ .* được/,
    len_dau: true,
  },
  {
    id: 'KL6',
    loai: 'code',
    khuon: 'đường SAI phải trả lỗi nghiệp vụ 4xx kèm thông báo (trùng khoá, tham chiếu không tồn tại) — app-guard, không được vỡ thành 500;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, POST trùng mã hồ sơ vỡ 500 thay vì 4xx nghiệp vụ',
    dieu_kien: /4\d\d|http|route|endpoint|api|status/,
  },
  {
    id: 'KL7',
    loai: 'code',
    khuon: 'VALIDATION đầu vào: trường bắt buộc bỏ trống / kiểu sai / giá trị ngoài miền — phải bị chặn đúng như spec khai;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, trường bắt buộc bỏ trống đi lọt validate',
    dieu_kien: /đầu vào|validate|bắt buộc|không được rỗng|required/,
  },

  // ---- code · đúc từ chuỗi 13 vòng PR #12 checkmate (26 finding, 2 hồi quy thật) ----
  {
    id: 'KL8',
    loai: 'code',
    khuon:
      'đầu vào KHUYẾT ở MỌI TẦNG — trường thiếu, phần tử null, cả cụm null/undefined, sai kiểu: phải ra lỗi nghiệp vụ đọc được nói rõ trường nào khuyết, không TypeError/500/reject;',
    an_le: 'PR #12 checkmate vòng 4, 8, 9, 10, 11 — năm vòng cùng một họ ở năm tầng sâu dần',
  },
  {
    id: 'KL9',
    loai: 'code',
    khuon:
      'luật vừa được cài/vá ở một cửa: soi các CỬA SONG SINH cùng vai (đường ghi / đường đọc / cửa kiểm / đường hiển thị) — mọi cửa phải cùng luật và cùng lời cho cùng bản chất;',
    an_le: 'PR #12 vòng 3 (khai «MỌI cửa» sót cửa đọc), vòng 9–10 (gác kiemConHieuLuc, quên thuNcc), vòng 12 (hai cửa hai lời)',
  },
  {
    id: 'KL10',
    loai: 'code',
    khuon:
      'giá trị gõ-tay-được không được vọng NGUYÊN VĂN ra thông điệp lỗi, log, hay sổ lưu (có thể là khoá dán nhầm) — và bản che phải PHÂN BIỆT được hai giá trị khác nhau;',
    an_le: 'PR #12 vòng 2 (rò model ra thông điệp), vòng 7 (che theo độ dài trùng hàng sổ), vòng 8 (phuong_thuc vọng)',
  },
  {
    id: 'KL11',
    loai: 'code',
    khuon:
      'giá trị CÓ MẶT nhưng sai/lạ bị thay LẶNG bằng mặc định là giấu nguyên nhân đang chặn — mặc định chỉ được điền khi trường THIẾU HẲN;',
    an_le: 'PR #12 vòng 5 (fable→sonnet lặng lẽ), vòng 8 (phuong_thuc lạ bị thay), vòng 10 (model sai kiểu bị thay)',
  },
  {
    id: 'KL12',
    loai: 'code',
    khuon: 'tổ hợp bị CẤM không được rơi-mềm sang tổ hợp khác chưa qua kiểm — phải từ chối với lời nói rõ;',
    an_le: 'PR #12 vòng 5 — rơi-mềm-về-model-khác bị bác là lách cổng kiểm bắt buộc (thành luật R5.17)',
  },
  {
    id: 'KL13',
    loai: 'code',
    khuon:
      'hàm che/chuẩn hoá áp SAI MIỀN: giá trị enum hệ thống hợp lệ bị che/băm làm mất nguyên nhân — miền của phép biến đổi đi theo BẢN CHẤT trường, không theo ngữ cảnh gọi;',
    an_le: 'PR #12 vòng 11 — «thue_bao» với ncc chỉ-API bị băm sha256 trong chính thông điệp giải thích',
  },
  {
    id: 'KL14',
    loai: 'code',
    khuon:
      'đối chiếu với dữ liệu ĐÃ QUA biến đổi (che/chuẩn hoá/băm): phải so ảnh-với-ảnh — so ảnh-với-thô, hoặc biến đổi hai lần một vế, thì không bao giờ khớp;',
    an_le: 'PR #12 vòng 8 (sổ lưu bản che, đối chiếu so thô) + lỗi che-của-che bị test nhà bắt trước khi push',
  },
  {
    id: 'KL15',
    loai: 'code',
    khuon: 'hai nguyên nhân khác nhau chung một thông điệp lỗi: thử TỪNG nguyên nhân riêng — mỗi cái phải nhận đúng lời của nó;',
    an_le: 'PR #12 vòng 1 (gộp «model không có» vào chuyện phương thức), vòng 12 (thiếu-hẳn nói «không hỗ trợ»)',
  },
  {
    id: 'KL16',
    loai: 'code',
    khuon:
      'hàm đứng CUỐI nhiều đường (format lỗi / che / ghi log) mà ném với đầu vào khuyết là đánh sập cả lượt ở đúng chỗ được chỉ định hiển thị — thử nó với undefined/null/sai kiểu;',
    an_le: 'PR #12 vòng 10 — chieuGiaTri gọi .length trên undefined làm thuNcc reject cả lượt kiểm',
  },
  {
    id: 'KL17',
    loai: 'code',
    khuon:
      'danh mục/danh sách hằng trong code: spec nói nó là GỢI Ý hay TRẦN CỨNG? — trần cứng chặn cả giá trị mới hợp lệ là hồi quy đường cứu hộ cấu hình;',
    an_le: 'PR #12 vòng 6 — ba finding cùng chỉ một hướng: danh mục model làm trần cứng chặn model mới ra',
  },

  // ---- doc · đúc từ các lượt chấm tài liệu (DEPLOY.md PR #11, PRD demo) ----
  {
    id: 'KD1',
    loai: 'doc',
    khuon:
      'lệnh, đường dẫn, tên file, tên bước xuất hiện ở NHIỀU chỗ trong tài liệu: đối chiếu từng cặp — hai chỗ nhắc cùng một thứ mà lệch nhau là mau_thuan/lech_cheo;',
    an_le: 'DEPLOY.md PR #11 checkmate — hai vòng liền bắt lệnh ở mục quy trình lệch với mục ví dụ',
  },
  {
    id: 'KD2',
    loai: 'doc',
    khuon: 'con số xuất hiện ≥ 2 chỗ (ngưỡng, tổng, số bước, số lượng): đối chiếu từng cặp số — kể cả giữa văn và bảng/ví dụ;',
    an_le: 'PRD demo-credit-approval — ví dụ minh hoạ mang số vượt ngưỡng của bảng quy tắc',
  },
  {
    id: 'KD3',
    loai: 'doc',
    khuon:
      'tài liệu VỪA SỬA một quy trình/quy tắc: quét mọi mục khác còn nhắc bản cũ — sửa mâu thuẫn hay đẻ mâu thuẫn mới ở chỗ chưa sửa theo là lỗi hay gặp nhất sau chỉnh sửa;',
    an_le: 'DEPLOY.md PR #11 — vòng hai của Opus bắt 2 finding do chính bản sửa vòng một đẻ ra',
  },
];

/** Khuôn code phát cho repo có spec này (R12.4): bật khuôn điều kiện khớp, khuôn len_dau lên đầu. */
export function layKhuonCode(specText: string): string[] {
  const thap = specText.toLowerCase();
  const bat = KHO_KHUON.filter((k) => k.loai === 'code' && (!k.dieu_kien || k.dieu_kien.test(thap)));
  // SẮP trước, CẮT sau — cắt trước là khuôn bắt buộc (len_dau) đứng cuối danh sách khai bị rơi LẶNG
  // đúng lúc kho chạm trần, cổng âm thầm thôi sinh probe vượt-quyền (vòng một của cổng bắt trên chính
  // PR này). Trần vẫn giữ (R12.3) nhưng nạn nhân phải là khuôn thường cuối danh sách, có log.
  const sap = [...bat.filter((k) => k.len_dau), ...bat.filter((k) => !k.len_dau)];
  if (sap.length > TRAN_KHUON) {
    console.log(`[khuon-loi] kho vượt trần ${TRAN_KHUON} — bỏ: ${sap.slice(TRAN_KHUON).map((k) => k.id).join(', ')} (R12.3: thay khuôn phải là quyết định nói ra, sửa KHO_KHUON thay vì để cắt ở đây)`);
  }
  return sap.slice(0, TRAN_KHUON).map((k) => k.khuon);
}

/** Khuôn doc — «nơi hay giấu lỗi», phát vào prompt tìm lỗi tài liệu. Không mở rộng rubric. */
export function layKhuonDoc(): string[] {
  return KHO_KHUON.filter((k) => k.loai === 'doc').slice(0, TRAN_KHUON).map((k) => k.khuon);
}
