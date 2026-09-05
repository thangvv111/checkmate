import { describe, it, expect } from 'vitest';
import { promptPhanTich } from '../packages/harness/src/skill-code.js';
import { ruleCoverage, splitSpecUnits } from '../packages/harness/src/spec-units.js';
import { makeFence } from '../packages/harness/src/fence.js';
import type { TargetInfo } from '../packages/harness/src/target.js';
import { runPage, verdictHtml } from '../apps/web/src/ui.js';
import type { RunMeta } from '../apps/web/src/runs.js';
import type { Verdict } from '../packages/shared/src/types.js';

/**
 * Lưới canh trạng thái «chấm KHÔNG có luật đối chiếu» — nó phải được KHAI RA ở cả ba chỗ:
 * prompt (đừng bắt model neo vào khối rỗng) · verdict (độ phủ KHÔNG ĐO ĐƯỢC, không phải 0) · màn Run
 * (cảnh báo đứng trước verdict). Bản trước để chuyện này diễn ra hoàn toàn im lặng: cổng vẫn chạy,
 * vẫn ra verdict, vẫn cho merge, và verdict yếu trông giống hệt verdict dày — đúng thứ ⛔C2 cấm.
 * Mỗi nhóm có VẾ ĐỐI CHỨNG: có spec thì không cảnh báo, độ phủ đo bình thường.
 */

const SPEC = '# Duyệt\n\n## Ngưỡng theo vai\nTối đa 500 triệu.\n\n## Người duyệt khác người tạo\nKhông tự duyệt.\n';
const nguonRong = { declared: false, probes: [{ pattern: 'specs/**/*.md', files: 0, used: false }, { pattern: 'docs/spec/**/*.md', files: 0, used: false }], files: [] };

const target = (p: Partial<TargetInfo> = {}): TargetInfo => ({
  repo: '.',
  branch: 'pr',
  base: 'main',
  branchSha: 'a'.repeat(40),
  baseSha: 'b'.repeat(40),
  diff: 'diff --git a/src/a.ts b/src/a.ts\n+export const a = 2;\n',
  ngoaiTamNhin: [],
  specs: [],
  units: [],
  luatMoi: [],
  apiDoc: '# API\nGET /x',
  testMau: 'it()',
  sources: { specs: nguonRong, api_doc: { declared: false, probes: [], files: ['README.md'] }, test_sample: { declared: false, probes: [], files: [] }, rejected: [] },
  ...p,
});
const coSpec = (): TargetInfo => {
  const units = splitSpecUnits('docs/spec/rules.md', SPEC);
  return target({
    specs: [{ file: 'docs/spec/rules.md', noiDung: SPEC }],
    units,
    sources: { ...target().sources, specs: { declared: false, probes: [{ pattern: 'docs/spec/**/*.md', files: 1, units: units.length, used: true }], files: ['docs/spec/rules.md'] } },
  });
};

describe('prompt sinh probe khi không có luật', () => {
  it('không có đơn vị luật → nói thẳng KHÔNG CÓ, bỏ câu «mọi probe phải neo vào một luật», bỏ khuôn mã R?', () => {
    const p = promptPhanTich(target(), null, makeFence());
    expect(p).toContain('SPEC HÀNH VI — KHÔNG CÓ');
    expect(p).toContain('ĐỪNG BỊA LUẬT');
    expect(p).not.toContain('mọi probe phải neo vào một luật');
    expect(p).not.toContain('"spec_rule": "R?"');
    expect(p).toContain('suy từ API|test mẫu|diff');
  });

  it('nguồn khai trong checkmate.yml mà rỗng → lý do nêu đúng là nguồn ĐÃ KHAI không cho ra đơn vị', () => {
    const t = target({ sources: { ...target().sources, specs: { declared: true, probes: [{ pattern: 'docs/nope/*.md', files: 0, used: false, note: 'không khớp file nào' }], files: [] } } });
    expect(promptPhanTich(t, null, makeFence())).toContain('nguồn spec khai trong checkmate.yml không cho ra đơn vị luật nào');
  });

  it('vế đối chứng: CÓ luật → vẫn đòi neo, spec vào prompt, và `spec_rule` nhận cả địa chỉ tiêu đề chứ không chỉ mã', () => {
    const p = promptPhanTich(coSpec(), null, makeFence());
    expect(p).toContain('mọi probe phải neo vào một luật ở đây');
    expect(p).toContain('Ngưỡng theo vai');
    expect(p).not.toContain('KHÔNG CÓ');
    expect(p).toContain('đường tiêu đề «Mục › Mục con»');
    expect(p).not.toContain('"spec_rule": "R?"');
  });
});

describe('độ phủ luật — không đo được ≠ 0', () => {
  it('không có đơn vị → HAI TRƯỜNG VẮNG, không phải 0/0', () => {
    expect(ruleCoverage([], ['R1', 'Ngưỡng'])).toEqual({});
    expect('luat_tong' in ruleCoverage([], [])).toBe(false);
  });

  it('vế đối chứng: có đơn vị → đếm bình thường, kể cả khi KHÔNG probe nào neo được (đó mới là 0)', () => {
    const units = splitSpecUnits('a.md', SPEC);
    expect(ruleCoverage(units, ['Ngưỡng theo vai', 'Ngưỡng theo vai', undefined])).toEqual({ luat_da_phu: ['Duyệt › Ngưỡng theo vai'], luat_tong: 2 });
    expect(ruleCoverage(units, ['không khớp gì'])).toEqual({ luat_da_phu: [], luat_tong: 2 });
  });
});

const verdict = (p: Partial<Verdict> = {}): Verdict =>
  ({
    run_id: 'r1',
    skill: 'code',
    artifact_ref: { type: 'pr', name: 'feat/x', sha_or_hash: 'abcdef1234567890' },
    result: 'PASS',
    findings: [],
    model: 'claude-opus-5',
    mode: 'live',
    started_at: '2026-09-02T09:00:00.000Z',
    finished_at: '2026-09-02T09:03:00.000Z',
    ...p,
  }) as Verdict;
const meta = (v: Verdict): RunMeta => ({ id: 'w1', tieuDe: 'PR #7', skill: 'code', trangThai: 'xong', batDau: '2026-09-02T09:00:00.000Z', verdict: v });
const khongLuat = verdict({ spec_source: { ...nguonRong, units: 0 }, probe_stats: { ke_hoach: 3, ghi_nhan: 3, pass: 3, hoi_quy: 0, ngoai_pham_vi: 0, nghi_loi_co_san: 0, nghi_van: 0, cai_thien: 0, bo_qua: 0, that_lac: [] } });
const coLuat = verdict({
  spec_source: { declared: false, files: ['docs/spec/rules.md'], units: 3, probes: [{ pattern: 'docs/spec/**/*.md', files: 1, units: 3, used: true }] },
  probe_stats: { ke_hoach: 3, ghi_nhan: 3, pass: 3, hoi_quy: 0, ngoai_pham_vi: 0, nghi_loi_co_san: 0, nghi_van: 0, cai_thien: 0, bo_qua: 0, that_lac: [], luat_da_phu: ['Duyệt › Ngưỡng theo vai', 'Duyệt'], luat_tong: 3 },
});

/** Cắt đúng hàng «Độ phủ luật» khỏi bảng số liệu — luật này nói về hàng ấy, không về cả bảng. */
const hangDoPhu = (bang: string): string => {
  const i = bang.indexOf('Độ phủ luật');
  return i < 0 ? '' : bang.slice(i, bang.indexOf('</div>', i) + 6);
};

describe('màn Run và bảng verdict', () => {
  it('không có luật → banner đứng TRƯỚC verdict và nêu đã dò ở đâu; bảng ghi «không đo được», không ghi 0', () => {
    const html = runPage(meta(khongLuat), false, []);
    const ban = html.indexOf('Chấm KHÔNG có luật đối chiếu');
    expect(ban).toBeGreaterThan(-1);
    expect(ban, 'cảnh báo đổi cách đọc verdict nên phải đứng trước verdict').toBeLessThan(html.indexOf('id="verdict-o"'));
    expect(html).toContain('specs/**/*.md · docs/spec/**/*.md');
    expect(html).toContain('sources.specs');
    const bang = verdictHtml(khongLuat);
    expect(bang).toContain('KHÔNG CÓ — chấm không có luật đối chiếu');
    expect(hangDoPhu(bang)).toContain('không đo được');
    expect(bang).not.toMatch(/0\/0/);
  });

  it('nguồn KHAI mà rỗng → banner nêu đúng đường khai và lý do', () => {
    const v = verdict({ spec_source: { declared: true, files: [], units: 0, probes: [{ pattern: 'docs/nope/*.md', files: 0, used: false, note: 'không khớp file nào' }] } });
    const html = runPage(meta(v), false, []);
    expect(html).toContain('không cho ra đơn vị luật nào');
    expect(html).toContain('docs/nope/*.md (không khớp file nào)');
  });

  it('vế đối chứng: có luật → KHÔNG banner, bảng ghi nguồn và độ phủ đo được', () => {
    const html = runPage(meta(coLuat), false, []);
    expect(html).not.toContain('Chấm KHÔNG có luật đối chiếu');
    const bang = verdictHtml(coLuat);
    expect(bang).toContain('3 đơn vị · 1 file · tự dò');
    expect(bang).toContain('2/3 đơn vị có probe');
    // Thu hẹp về ĐÚNG hàng độ phủ. Bản trước quét cả bảng, và nó đỏ khi change `probe-quarantine`
    // thêm hàng «◍ cách ly: không đo được» — hàng ấy nói một chuyện KHÁC (verdict đời cũ chưa có phép
    // đo cách ly) và nó đúng. Một phép quét cả bảng cho một luật về MỘT hàng là lỗi lưới loại 3.
    expect(hangDoPhu(bang)).not.toContain('không đo được');
  });

  it('bản ghi đời cũ (không có spec_source) → không banner, không hàng độ phủ: vắng là KHÔNG BIẾT, không phải «không có»', () => {
    const cu = verdict();
    expect(runPage(meta(cu), false, [])).not.toContain('Chấm KHÔNG có luật đối chiếu');
    const bang = verdictHtml(cu);
    expect(bang).not.toContain('Luật đối chiếu');
    expect(bang).not.toContain('Độ phủ luật');
  });
});
