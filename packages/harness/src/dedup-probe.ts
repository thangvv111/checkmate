import type { ProbePlan } from './skill-code.js';
import type { LibraryProbe } from './probe-library.js';
import type { Fence } from './fence.js';
import { FENCE_NOTICE } from './fence.js';

// Xử trùng lặp probe theo bốn tầng (specs/R10.6–R10.8). File này giữ ba tầng đầu:
//   tầng 1 — cơ học: bản chạy-lại cùng commit (sha sinh + id + luật) → loại thẳng
//   tầng 2 — cơ học: cùng luật spec hoặc cùng commit sinh → DIỆN NGHI, chưa loại
//   tầng 3 — model phân xử trên diện nghi, bằng đúng một câu hẹp
// Tầng 4 (hành vi đo được) sống ở thu-vien.ts vì nó cần lịch sử lưu cùng probe.
//
// Nguyên tắc rủi ro không đối xứng: loại nhầm một probe thật là mất tài sản regression trong im lặng;
// giữ nhầm một bản sao chỉ tốn chỗ. Mọi đường mờ đều nghiêng về GIỮ.

// splitRule sống ở thu-vien.ts để CẢ tầng cơ học lẫn tầng 4 so luật qua cùng một bản chuẩn hoá —
// hai bản so lệch nhau ('R1,R2' vs 'R1, R2') là tầng 4 mù đúng ở cặp cần bắt nhất (dàn review bắt được).
export { splitRule } from './probe-library.js';
import { splitRule } from './probe-library.js';

function giaoRule(a: string | undefined, b: string | undefined): boolean {
  const tb = new Set(splitRule(b));
  return splitRule(a).some((r) => tb.has(r));
}

/** Tầng 1 (R10.6): bản chạy-lại của cùng lượt chấm — trùng cả commit sinh, id và luật. */
export function findRerunDuplicate(library: LibraryProbe[], plan: ProbePlan, shaSinh: string): LibraryProbe | null {
  return (
    library.find(
      (m) => m.sha_sinh === shaSinh && m.plan.id === plan.id && splitRule(m.plan.spec_rule).join(',') === splitRule(plan.spec_rule).join(','),
    ) ?? null
  );
}

/** Tầng 2 (R10.7): diện nghi — luật spec giao nhau, hoặc cùng commit sinh. Chưa loại. */
export function findSuspectedDuplicate(library: LibraryProbe[], plan: ProbePlan, shaSinh: string): LibraryProbe[] {
  return library.filter((m) => giaoRule(m.plan.spec_rule, plan.spec_rule) || m.sha_sinh === shaSinh);
}

export interface RulingCandidate {
  ma: string; // N1, N2... — khoá model phải trỏ vào
  moi: { plan: ProbePlan; code: string };
  nghi: LibraryProbe[];
}

export interface Ruling {
  ma: string;
  trung: boolean;
  chac_chan: boolean;
  voi?: string; // tên file probe thư viện bị trùng
  ly_do?: string;
}

const CAT_CODE = 1400;

/** Tầng 3 (R10.8): câu hỏi HẸP cho model — có cho ra cùng một finding không, không phải "có giống nhau không". */
export function promptDuplicateRuling(ung: RulingCandidate[], rao: Fence): string {
  const duLieu = ung.map((u) => ({
    ma: u.ma,
    probe_moi: {
      id: u.moi.plan.id,
      ten: u.moi.plan.ten,
      muc_dich: u.moi.plan.muc_dich,
      spec_rule: u.moi.plan.spec_rule,
      ky_vong: u.moi.plan.ky_vong,
      code: u.moi.code.slice(0, CAT_CODE),
    },
    thu_vien_nghi_trung: u.nghi.map((n) => ({
      ten_file: n.ten,
      id: n.plan.id,
      ten: n.plan.ten,
      muc_dich: n.plan.muc_dich,
      spec_rule: n.plan.spec_rule,
      ky_vong: n.plan.ky_vong,
      code: n.code.slice(0, CAT_CODE),
    })),
  }));
  return `Bạn là TRỌNG TÀI xét trùng lặp phép thử trong thư viện regression. Với TỪNG ứng viên, trả lời đúng MỘT câu hỏi hẹp: probe mới có cho ra CÙNG MỘT FINDING với một probe thư viện nào không?

Hai probe cho ra CÙNG MỘT finding khi chúng kiểm CÙNG một hành vi theo CÙNG một luật spec với CÙNG dữ liệu/biên — tức khi code sai, cả hai cùng đỏ vì cùng một nguyên nhân và người đọc chỉ cần một trong hai. Hai probe kiểm cùng một luật nhưng ở BIÊN KHÁC NHAU, ACTOR KHÁC NHAU hay NHÁNH DỮ LIỆU KHÁC NHAU là KHÔNG trùng — chúng bắt được những cách hỏng khác nhau.

LUẬT RỦI RO: loại nhầm một probe thật là mất tài sản regression trong im lặng; giữ nhầm chỉ tốn chỗ. Vì vậy chỉ đặt "trung": true kèm "chac_chan": true khi bạn CHẮC CHẮN; mọi phân vân đều trả "trung": false.

${FENCE_NOTICE}

# ỨNG VIÊN
${rao('UNG_VIEN_TRUNG', JSON.stringify(duLieu, null, 2))}

Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"phan_xu": [{"ma": "N?", "trung": true|false, "chac_chan": true|false, "voi": "<ten_file probe thư viện trùng, nếu trung>", "ly_do": "≤2 câu"}]}`;
}

export interface AdmitDecision {
  bo: boolean;
  voi?: string;
  ly_do?: string;
}

/**
 * Áp phán xử của model — nghiêng về GIỮ (R10.8): chỉ bỏ khi trung && chac_chan && chỉ đúng tên probe
 * thư viện có thật trong diện nghi. Model trả thiếu, trả thừa, hay trỏ tên lạ đều là GIỮ.
 */
export function applyRuling(ung: RulingCandidate[], phanXu: Ruling[]): Map<string, AdmitDecision> {
  const ra = new Map<string, AdmitDecision>();
  for (const u of ung) {
    const cacPx = phanXu.filter((p) => p.ma === u.ma);
    // Model trả CÙNG một mã hai lần (tự sửa lời trong cùng khối JSON) = output mơ hồ — mơ hồ là GIỮ,
    // không lấy bản đầu rồi bỏ probe theo một lời phán đã bị chính model rút lại.
    const px = cacPx.length === 1 ? cacPx[0] : undefined;
    if (!px || !px.trung || !px.chac_chan) {
      ra.set(u.ma, { bo: false });
      continue;
    }
    const voiThat = u.nghi.find((n) => n.ten === px.voi);
    if (!voiThat) {
      // model trỏ vào một tên không nằm trong diện nghi — không tin, giữ
      ra.set(u.ma, { bo: false });
      continue;
    }
    ra.set(u.ma, { bo: true, voi: voiThat.ten, ly_do: px.ly_do });
  }
  return ra;
}
