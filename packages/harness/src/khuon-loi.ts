/**
 * Kho khuôn lỗi COMMON (specs/R12) — tri thức tái dùng giữa các repo.
 *
 * Probe không chạy được cross-repo (nó import hàm thật của repo đích); thứ mang đi được là KHUÔN:
 * mẫu lỗi trừu tượng đúc từ finding thật, phát vào prompt sinh probe (code) và prompt tìm lỗi (doc).
 * Mỗi khuôn PHẢI kèm án lệ (R12.2) — không án lệ là phỏng đoán, không nhận. Án lệ không vào prompt.
 *
 * Khuôn per-repo vẫn ở `review.khuon_loi` của checkmate.yml repo đích — hai tầng, không trộn (R12.1).
 */

import { TRIGGER_CATALOG, laTriggerHopLe, tapKichHoat, type TriggerDef, type TriggerId } from './trigger-catalog.js';

export interface KhuonLoi {
  id: string;
  loai: 'code' | 'doc';
  /**
   * Trigger sở hữu ví dụ này (R-mới, bắt buộc với `loai='code'`). Khuôn KHÔNG còn là danh sách
   * phẳng — nó là VÍ DỤ ÁN LỆ trực thuộc một trigger trong `trigger-catalog.ts`. Khuôn code thiếu
   * trigger bị TỪ CHỐI ngay cửa phát: một ví dụ không thuộc trigger nào là mảnh án lệ mồ côi, đúng
   * thứ cấu trúc này sinh ra để chấm dứt.
   */
  trigger?: TriggerId;
  /** MỘT dòng mệnh lệnh kiểm được, phát thẳng vào prompt (R12.5) */
  khuon: string;
  /** Finding thật đã đúc ra khuôn — cho người duyệt kho, KHÔNG phát vào prompt (R12.2) */
  an_le: string;
  /** Chỉ bật khi spec repo đích khớp (R12.4); bỏ trống = phát cho mọi repo */
  dieu_kien?: RegExp;
  /** Khuôn bắt buộc dạng «BẮT BUỘC có probe…» được đẩy lên đầu danh sách */
  len_dau?: boolean;
}

export const TRAN_KHUON = 20; // mỗi loại (R12.3) — trần TỔNG của kho, giữ nguyên

/**
 * Trần VÍ DỤ mỗi trigger — THAM SỐ, không phải hằng kiến trúc, và KHÔNG neo vào trần nào của hệ
 * luật cũ (lấy hằng của hệ sắp tái cấu trúc ép kích thước hệ mới là giữ tương thích với thứ sắp bị
 * đập). Chỉnh bằng `CHECKER_VI_DU_MOI_TRIGGER`; giá trị hỏng dùng mặc định và NÓI RA.
 */
export const VI_DU_MOI_TRIGGER = ((): number => {
  const raw = process.env.CHECKER_VI_DU_MOI_TRIGGER;
  if (raw === undefined) return 2;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`[khuon-loi] CHECKER_VI_DU_MOI_TRIGGER="${raw}" không phải số nguyên ≥ 1 — dùng mặc định 2`);
    return 2;
  }
  return n;
})();

export const KHO_KHUON: KhuonLoi[] = [
  // ---- code · gốc từ đời đầu của prompt ----
  {
    id: 'KL1',
    loai: 'code',
    trigger: 'logic_flow',
    khuon: 'điều kiện KÉP bị gộp sai: thử TỪNG VẾ riêng (vế này đúng + vế kia sai, và ngược lại);',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts, trước specs/R12) — repo demo-credit-approval, điều kiện duyệt gộp hai vế sai một',
  },
  {
    id: 'KL2',
    loai: 'code',
    trigger: 'logic_flow',
    khuon: 'giá trị BIÊN đúng ngưỡng của hằng số trong spec (biên đóng/mở);',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, off-by-one quanh ngưỡng hạn mức phê duyệt',
  },
  {
    id: 'KL3',
    loai: 'code',
    trigger: 'logic_flow',
    khuon: 'phép tính số học: tổng các phần phải bằng đúng tổng gốc, thử số CHIA KHÔNG HẾT / làm tròn;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, chia kỳ trả góp số lẻ lệch tổng gốc',
  },
  {
    id: 'KL4',
    loai: 'code',
    trigger: 'backward_compat',
    khuon: 'hành vi cũ không bị PR phá (probe kỳ vọng qua, để chứng minh PASS xứng đáng khi PR sạch).',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — nền phân loại R1 (specs/R1-phan-loai-probe.md): PASS phải được chứng minh, không phải mặc định',
  },
  {
    id: 'KL5',
    loai: 'code',
    trigger: 'variation',
    khuon:
      'PHÂN QUYỀN (spec repo này có luật về quyền/vai): BẮT BUỘC có probe thử VƯỢT QUYỀN — actor không đủ quyền thực hiện hành động của actor đủ quyền, và tự thao tác trên đối tượng của chính mình nếu spec cấm;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, nhân viên tự duyệt hồ sơ mình; và P4 vòng 11–12 PR #12 checkmate (vai tu_dong ở cổng, specs/R11.18b)',
    dieu_kien: /quyền|vai trò|role|permission|phân cấp|thẩm quyền|actor|chỉ .* được/,
    len_dau: true,
  },
  {
    id: 'KL6',
    loai: 'code',
    trigger: 'recovery_exception',
    khuon: 'đường SAI phải trả lỗi nghiệp vụ 4xx kèm thông báo (trùng khoá, tham chiếu không tồn tại) — app-guard, không được vỡ thành 500;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, POST trùng mã hồ sơ vỡ 500 thay vì 4xx nghiệp vụ',
    dieu_kien: /4\d\d|http|route|endpoint|api|status/,
  },
  {
    id: 'KL7',
    loai: 'code',
    trigger: 'variation',
    khuon: 'VALIDATION đầu vào: trường bắt buộc bỏ trống / kiểu sai / giá trị ngoài miền — phải bị chặn đúng như spec khai;',
    an_le: 'prompt xayKhuonLoi đời trước (skill-code.ts) — repo demo-credit-approval, trường bắt buộc bỏ trống đi lọt validate',
    dieu_kien: /đầu vào|validate|bắt buộc|không được rỗng|required/,
  },

  // ---- code · đúc từ chuỗi 13 vòng PR #12 checkmate (26 finding, 2 hồi quy thật) ----
  {
    id: 'KL8',
    loai: 'code',
    trigger: 'variation',
    khuon:
      'đầu vào KHUYẾT ở MỌI TẦNG — trường thiếu, phần tử null, cả cụm null/undefined, sai kiểu: phải ra lỗi nghiệp vụ đọc được nói rõ trường nào khuyết, không TypeError/500/reject;',
    an_le: 'PR #12 checkmate vòng 4, 8, 9, 10, 11 — năm vòng cùng một họ ở năm tầng sâu dần',
  },
  {
    id: 'KL9',
    loai: 'code',
    trigger: 'side_effects',
    khuon:
      'luật vừa được cài/vá ở một cửa: soi các CỬA SONG SINH cùng vai (đường ghi / đường đọc / cửa kiểm / đường hiển thị) — mọi cửa phải cùng luật và cùng lời cho cùng bản chất;',
    an_le: 'PR #12 vòng 3 (khai «MỌI cửa» sót cửa đọc), vòng 9–10 (gác kiemConHieuLuc, quên thuNcc), vòng 12 (hai cửa hai lời)',
  },
  {
    id: 'KL10',
    loai: 'code',
    trigger: 'side_effects',
    khuon:
      'giá trị gõ-tay-được không được vọng NGUYÊN VĂN ra thông điệp lỗi, log, hay sổ lưu (có thể là khoá dán nhầm) — và bản che phải PHÂN BIỆT được hai giá trị khác nhau;',
    an_le: 'PR #12 vòng 2 (rò model ra thông điệp), vòng 7 (che theo độ dài trùng hàng sổ), vòng 8 (phuong_thuc vọng)',
  },
  {
    id: 'KL11',
    loai: 'code',
    trigger: 'variation',
    khuon:
      'giá trị CÓ MẶT nhưng sai/lạ bị thay LẶNG bằng mặc định là giấu nguyên nhân đang chặn — mặc định chỉ được điền khi trường THIẾU HẲN;',
    an_le: 'PR #12 vòng 5 (fable→sonnet lặng lẽ), vòng 8 (phuong_thuc lạ bị thay), vòng 10 (model sai kiểu bị thay)',
  },
  {
    id: 'KL12',
    loai: 'code',
    trigger: 'interaction',
    khuon: 'tổ hợp bị CẤM không được rơi-mềm sang tổ hợp khác chưa qua kiểm — phải từ chối với lời nói rõ;',
    an_le: 'PR #12 vòng 5 — rơi-mềm-về-model-khác bị bác là lách cổng kiểm bắt buộc (thành luật R5.17)',
  },
  {
    id: 'KL13',
    loai: 'code',
    trigger: 'interaction',
    khuon:
      'hàm che/chuẩn hoá áp SAI MIỀN: giá trị enum hệ thống hợp lệ bị che/băm làm mất nguyên nhân — miền của phép biến đổi đi theo BẢN CHẤT trường, không theo ngữ cảnh gọi;',
    an_le: 'PR #12 vòng 11 — «thue_bao» với ncc chỉ-API bị băm sha256 trong chính thông điệp giải thích',
  },
  {
    id: 'KL14',
    loai: 'code',
    trigger: 'interaction',
    khuon:
      'đối chiếu với dữ liệu ĐÃ QUA biến đổi (che/chuẩn hoá/băm): phải so ảnh-với-ảnh — so ảnh-với-thô, hoặc biến đổi hai lần một vế, thì không bao giờ khớp;',
    an_le: 'PR #12 vòng 8 (sổ lưu bản che, đối chiếu so thô) + lỗi che-của-che bị test nhà bắt trước khi push',
  },
  {
    id: 'KL15',
    loai: 'code',
    trigger: 'recovery_exception',
    khuon: 'hai nguyên nhân khác nhau chung một thông điệp lỗi: thử TỪNG nguyên nhân riêng — mỗi cái phải nhận đúng lời của nó;',
    an_le: 'PR #12 vòng 1 (gộp «model không có» vào chuyện phương thức), vòng 12 (thiếu-hẳn nói «không hỗ trợ»)',
  },
  {
    id: 'KL16',
    loai: 'code',
    trigger: 'recovery_exception',
    khuon:
      'hàm đứng CUỐI nhiều đường (format lỗi / che / ghi log) mà ném với đầu vào khuyết là đánh sập cả lượt ở đúng chỗ được chỉ định hiển thị — thử nó với undefined/null/sai kiểu;',
    an_le: 'PR #12 vòng 10 — chieuGiaTri gọi .length trên undefined làm thuNcc reject cả lượt kiểm',
  },
  {
    id: 'KL17',
    loai: 'code',
    trigger: 'backward_compat',
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

/**
 * Cửa phát CHUNG cho cả hai loại — vòng hai của cổng bắt bốn lỗ đều do hai cửa lệch nhau hoặc cửa
 * thiếu gác, nên gom về một chỗ:
 *  · dieu_kien đánh bằng RegExp KHÔNG trạng thái — RegExp khai cờ g/y giữ lastIndex, cùng một spec
 *    cho true lượt đầu rồi false lượt sau, khuôn bắt buộc biến mất từ repo thứ hai trong tiến trình;
 *  · khuôn không án lệ bị TỪ CHỐI ngay cửa (R12.2 — «không án lệ là phỏng đoán, không nhận» phải là
 *    gác chạy được, không phải lời dặn trong test);
 *  · khuôn ép về MỘT dòng (R12.5 — chuỗi mang xuống-dòng vỡ danh sách bullet của prompt);
 *  · SẮP trước CẮT sau + log khuôn bị bỏ khi chạm trần (R12.3) — cho CẢ code lẫn doc.
 */
// Mốc định vị của án lệ (R12.2): số PR · vòng chấm · tên file · tên repo — thứ trỏ vào một nơi có thật.
const MOC_AN_LE = /#\d+|vòng \d+|\.(md|ts|yml)|demo-[a-z-]+/;

function phatKhuon(loai: 'code' | 'doc', vanBanDieuKien?: string): string[] {
  // Chịu đầu vào khuyết như nhau ở CẢ HAI cửa (vòng ba: code ném TypeError còn doc thì không — chính
  // là khuôn KL9 «cửa song sinh» + KL16 «hàm cuối đường không được nổ»).
  const vanBan = String(vanBanDieuKien ?? '');
  const bat: KhuonLoi[] = [];
  for (const k of KHO_KHUON.filter((x) => x.loai === loai)) {
    // R12.2 là GÁC theo đúng mức luật khai: án lệ phải CÓ và phải mang MỐC ĐỊNH VỊ — gác chỉ chặn
    // chuỗi rỗng là luật nằm trong test chứ không nằm trong cửa (vòng ba của cổng bắt).
    if (typeof k.an_le !== 'string' || !k.an_le.trim() || !MOC_AN_LE.test(k.an_le)) {
      console.log(`[khuon-loi] TỪ CHỐI ${k.id}: án lệ thiếu hoặc không mốc định vị — phỏng đoán không được phát vào prompt (R12.2)`);
      continue;
    }
    // R12.5: khuôn rỗng/toàn khoảng trắng thành bullet trống «- » vỡ danh sách mệnh lệnh (vòng ba).
    if (typeof k.khuon !== 'string' || !k.khuon.trim()) {
      console.log(`[khuon-loi] TỪ CHỐI ${k.id}: khuôn rỗng (R12.5)`);
      continue;
    }
    // Ví dụ code PHẢI thuộc một trigger có trong danh mục — mồ côi thì không phát. Gác đứng ở CỬA
    // (không nằm trong test) vì đây đúng là chỗ ví dụ đi vào prompt.
    if (loai === 'code' && !laTriggerHopLe(k.trigger)) {
      console.log(`[khuon-loi] TỪ CHỐI ${k.id}: ví dụ code không thuộc trigger nào trong danh mục (trigger=${String(k.trigger)})`);
      continue;
    }
    if (k.dieu_kien) {
      // Gột cờ trạng thái g/y (lastIndex — vòng hai) và đánh KHÔNG phân biệt hoa thường trên văn bản
      // GỐC: bản trước toLowerCase đầu vào rồi test regex mang chữ hoa (/PHẢI|HTTP/) — không bao giờ
      // khớp, khuôn biến mất lặng, đúng họ KL11 «biến đổi lặng giá trị» (vòng ba của cổng bắt).
      const co = k.dieu_kien.flags.replace(/[gy]/g, '');
      const sach = new RegExp(k.dieu_kien.source, co.includes('i') ? co : co + 'i');
      if (!sach.test(vanBan)) continue;
    }
    bat.push(k);
  }
  // R12.3 đo TRÊN KHO, không đo trên tập đã lọc điều kiện — đo sau lọc thì trần thành ngẫu nhiên
  // theo spec repo đang chấm, kho phình quá mức không ai đo được (vòng ba).
  const tongKho = KHO_KHUON.filter((x) => x.loai === loai);
  if (tongKho.length > TRAN_KHUON) {
    console.log(`[khuon-loi] kho ${loai} đang giữ ${tongKho.length} khuôn, vượt trần ${TRAN_KHUON} — vượt: ${tongKho.slice(TRAN_KHUON).map((k) => k.id).join(', ')} (R12.3: sửa KHO_KHUON, thay khuôn là quyết định nói ra)`);
  }
  const sap = [...bat.filter((k) => k.len_dau), ...bat.filter((k) => !k.len_dau)];
  if (sap.length > TRAN_KHUON) {
    console.log(`[khuon-loi] tập phát ${loai} vượt trần ${TRAN_KHUON} — bỏ: ${sap.slice(TRAN_KHUON).map((k) => k.id).join(', ')}`);
  }
  return sap.slice(0, TRAN_KHUON).map((k) => k.khuon.replace(/\s*\n\s*/g, ' ').trim());
}

/** Khuôn code phát cho repo có spec này (R12.4): bật khuôn điều kiện khớp, khuôn len_dau lên đầu. */
export function layKhuonCode(specText?: string): string[] {
  return phatKhuon('code', specText);
}

export interface NhomTrigger {
  trigger: TriggerDef;
  vi_du: string[];
}

/**
 * Tri thức sinh probe TỔ CHỨC THEO TRIGGER — thay danh sách phẳng đời trước.
 *
 * Mỗi trigger phát: một dòng hướng dẫn (thuộc danh mục, luôn có) + tối đa `VI_DU_MOI_TRIGGER` ví dụ
 * án lệ. Trigger CHƯA có ví dụ nào vẫn được phát — hướng dẫn của nó đứng độc lập, và đó chính là
 * cách vùng mù cũ (`sequencing` trống hoàn toàn trong 17 khuôn) bắt đầu được soi.
 *
 * ĐÀO THẢI: quá trần thì ví dụ dôi rời tập PHÁT (vẫn nằm trong kho cho người đọc) — kho không phình
 * vào prompt theo thời gian nữa. Ưu tiên giữ theo thứ tự khai trong KHO_KHUON: `len_dau` trước, rồi
 * thứ tự khai — ví dụ mới muốn vào tập phát thì phải có người CHỦ ĐỘNG xếp nó lên, không tự chen.
 */
export function triThucTheoTrigger(specText?: string, triggerKhai?: readonly string[]): NhomTrigger[] {
  const batDuoc = new Set(phatKhuon('code', specText));
  const ra: NhomTrigger[] = [];
  for (const trigger of tapKichHoat(triggerKhai)) {
    const ungVien = KHO_KHUON.filter((k) => k.loai === 'code' && k.trigger === trigger.id);
    const sap = [...ungVien.filter((k) => k.len_dau), ...ungVien.filter((k) => !k.len_dau)];
    const mot = (k: KhuonLoi): string => k.khuon.replace(/\s*\n\s*/g, ' ').trim();
    const qua = sap.filter((k) => batDuoc.has(mot(k)));
    if (qua.length > VI_DU_MOI_TRIGGER) {
      console.log(
        `[khuon-loi] trigger ${trigger.id}: ${qua.length} ví dụ vượt trần ${VI_DU_MOI_TRIGGER} — rời tập phát: ${qua.slice(VI_DU_MOI_TRIGGER).map((k) => k.id).join(', ')} (vẫn còn trong kho, người đọc được)`,
      );
    }
    ra.push({ trigger, vi_du: qua.slice(0, VI_DU_MOI_TRIGGER).map(mot) });
  }
  return ra;
}

/**
 * Khuôn doc — «nơi hay giấu lỗi», phát vào prompt tìm lỗi tài liệu. Không mở rộng rubric.
 * dieu_kien (nếu khuôn có) đánh trên chính VĂN BẢN TÀI LIỆU — cửa song sinh của layKhuonCode, vòng
 * hai của cổng bắt đúng ca cửa code được vá mà cửa doc bỏ qua điều kiện lặng lẽ.
 */
export function layKhuonDoc(vanBanTaiLieu?: string): string[] {
  return phatKhuon('doc', vanBanTaiLieu);
}
