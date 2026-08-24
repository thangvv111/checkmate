// Schema dùng chung CLI ↔ web ↔ replay — theo spec MVP §2 (msb-hackathon-ai-checker-spec-mvp.md)

export type Severity = 'blocking' | 'non_blocking';
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
