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

export interface Finding {
  id: string;
  skill: SkillId;
  severity: Severity;
  title_vi: string;
  what_vi: string;
  consequence_vi: string;
  evidence: Evidence;
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
  // C5: PASS/FAIL nói trên cơ sở nào — độ phủ probe đưa thẳng vào verdict
  probe_stats?: {
    ke_hoach: number; // số probe model đề ra
    ghi_nhan: number; // số probe thực chạy và được ghi nhận
    pass: number;
    hoi_quy: number;
    ngoai_pham_vi: number; // fail cả hai nhánh cùng nguyên nhân — không quy tội PR
    nghi_loi_co_san: number; // probe THƯ VIỆN fail cả hai nhánh — đã chứng minh contract nên nghi lỗi có sẵn/spec đổi
    nghi_van: number;
    cai_thien: number;
    bo_qua: number;
    that_lac: string[]; // id probe trong kế hoạch nhưng không thấy khi chạy
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
  mode: 'live' | 'replay';
  started_at: string;
  finished_at: string;
}

export type RunEvent =
  | { type: 'stage'; stage: number; ten: string }
  | { type: 'log'; msg: string }
  | { type: 'finding'; finding: Finding }
  | { type: 'verdict'; verdict: Verdict }
  | { type: 'error'; msg: string };
