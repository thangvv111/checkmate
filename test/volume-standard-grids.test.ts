import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Lưới TẦNG 3 cho capability `finding-volume-standard` — quét source, có CẶP fixture (test-grid-integrity).
 *
 * Bản đầu của change định dùng «giá trị mốc không được xuất hiện trong prompt» — không sound: `docCoSoDong`
 * gắn `N| ` vào mỗi dòng nên mốc 100 LUÔN có mặt, hunk diff có `@@ -100,7`, prompt có «≥ 8 từ», «≤80 ký
 * tự», «7 loại». Lưới này quét đúng HÌNH của câu định mức, không quét con số.
 */

const DOC = readFileSync('packages/harness/src/skill-doc.ts', 'utf8');
const CODE = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
const VOLUME = readFileSync('packages/harness/src/volume-standard.ts', 'utf8');
const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
const CLI = readFileSync('packages/harness/src/cli.ts', 'utf8');

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** Thân các hàm `function prompt*(`, cắt tới `\n}` đầu dòng kế tiếp. */
function promptBodies(src: string): Array<{ name: string; line: number; body: string }> {
  const out: Array<{ name: string; line: number; body: string }> = [];
  for (const m of src.matchAll(/^(?:export )?function (prompt[A-Za-z0-9_]*)\(/gm)) {
    const start = m.index ?? 0;
    const end = src.indexOf('\n}', start);
    const body = src.slice(start, end === -1 ? src.length : end);
    out.push({ name: m[1], line: src.slice(0, start).split('\n').length, body });
  }
  return out;
}

const QUOTA = /(tối đa|toi da|không quá|khong qua|nhiều nhất|nhieu nhat|at most|max(?:imum)?)\s*(\$\{[^}]*\}|\d+)\s*(finding|probe)/i;
const CAP_INTERP = /\$\{[^}]*\b(cap|Cap|MAX_PROBE|MAX_FINDING|findingCap|probeCap|finding_cap|probe_cap)\b[^}]*\}/;

/** Câu định mức hoặc trần nội suy nằm trong thân một hàm dựng prompt — trả `hàm:dòng: đoạn`. */
export function scanPromptQuota(src: string): string[] {
  const hits: string[] = [];
  for (const p of promptBodies(src)) {
    const body = stripComments(p.body);
    const lines = body.split('\n');
    lines.forEach((l, i) => {
      const q = l.match(QUOTA) ?? l.match(CAP_INTERP);
      if (q) hits.push(`${p.name}:${p.line + i}: ${q[0].slice(0, 60)}`);
    });
  }
  return hits;
}

/** `.slice(0, <trần>)` ngoài hàm cắt duy nhất — mỗi dòng một vi phạm. */
export function scanRawCapCuts(src: string): string[] {
  const hits: string[] = [];
  stripComments(src)
    .split('\n')
    .forEach((l, i) => {
      if (/\.slice\(\s*0\s*,\s*[^)]*\b(cap|Cap|MAX_FINDING|MAX_PROBE|findingCap|probeCap|finding_cap|probe_cap)\b[^)]*\)/.test(l)) hits.push(`${i + 1}: ${l.trim().slice(0, 80)}`);
    });
  return hits;
}

/** Lệnh doc CÓ `--repo` (tức chấm trong pull request) mà THIẾU `--base` — chuẩn sẽ rơi về ref `main` đóng băng. */
export function scanDocCommandsWithoutBase(src: string): string[] {
  const hits: string[] = [];
  src.split('\n').forEach((l, i) => {
    if (l.includes("'--skill', 'doc'") && l.includes("'--repo'") && !l.includes("'--base'")) hits.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
  });
  return hits;
}

describe('scanPromptQuota — cặp fixture', () => {
  it('ĐỎ: câu «Tối đa 8 finding» gõ cứng', () => {
    const src = 'function promptX(a: string): string {\n  return `Bạn là checker.\nTối đa 8 finding, chỉ lấy những cái chắc chắn nhất.`;\n}\n';
    expect(scanPromptQuota(src)).toHaveLength(1);
  });
  it('ĐỎ: trần nội suy «TỐI ĐA ${MAX_PROBE} probe»', () => {
    const src = 'export function promptY(t: unknown): string {\n  return `# YÊU CẦU\nĐề xuất TỐI ĐA ${MAX_PROBE} probe độc lập.`;\n}\n';
    expect(scanPromptQuota(src)).toHaveLength(1);
  });
  it('XANH: số dòng `100| `, hunk diff, «≥ 8 từ», «≤80 ký tự», «7 loại» — KHÔNG phải con số trần', () => {
    const src =
      'function promptZ(doc: string): string {\n  // Tối đa 8 finding — chú thích, không phải prompt\n' +
      '  return `100| dòng một trăm\n@@ -100,7 +100,9 @@\n(≥ 8 từ hoặc trọn một ô bảng)\n"title_vi":"≤80 ký tự"\nvẫn chỉ ${Object.keys(NHAN_RUBRIC).length} loại rubric\nKhông cần finding cho mọi loại rubric.`;\n}\n';
    expect(scanPromptQuota(src)).toEqual([]);
  });
  it('mã nguồn hiện tại: cả năm hàm dựng prompt đều sạch', () => {
    expect(scanPromptQuota(DOC), 'skill-doc').toEqual([]);
    expect(scanPromptQuota(CODE), 'skill-code').toEqual([]);
  });
  it('phép quét TÌM THẤY đúng năm hàm dựng prompt — nếu không thì ca trên xanh oan', () => {
    const names = [...promptBodies(DOC), ...promptBodies(CODE)].map((p) => p.name).sort();
    expect(names).toEqual(['promptPhanTich', 'promptSinhCode', 'promptSkeptic', 'promptTim', 'promptVietFinding']);
  });
});

describe('scanRawCapCuts — cặp fixture', () => {
  it('ĐỎ: hai chỗ cắt theo trần', () => {
    const src = 'let a = xs.slice(0, MAX_FINDING);\nconst b = ys.slice(0, finding_cap.value);\n';
    expect(scanRawCapCuts(src)).toHaveLength(2);
  });
  it('XANH: slice không theo trần', () => {
    expect(scanRawCapCuts('const c = title.slice(0, 80);\nconst d = arr.slice(0, n);\n')).toEqual([]);
  });
  it('mã nguồn hiện tại: skill-doc KHÔNG còn chỗ cắt thô nào; chỗ cắt duy nhất nằm trong cutBySeverity', () => {
    expect(scanRawCapCuts(DOC)).toEqual([]);
    // Bỏ comment và bỏ `.slice(0, <số nguyên>)` (cắt chuỗi thông điệp) — chỉ đếm cắt theo BIẾN.
    const cuts = [...stripComments(VOLUME).matchAll(/\.slice\(\s*0\s*,\s*([^)]+)\)/g)].filter((m) => !/^\s*\d+\s*$/.test(m[1]));
    expect(cuts.map((m) => m[1].trim()), 'volume-standard.ts phải có ĐÚNG một .slice(0, <biến>) — trong cutBySeverity').toEqual(['c']);
    const viTri = stripComments(VOLUME).indexOf('.slice(0, c)');
    const thanCut = stripComments(VOLUME).indexOf('export function cutBySeverity');
    expect(viTri).toBeGreaterThan(thanCut);
    // skill-code cắt KẾ HOẠCH probe (không có severity để sắp) — đúng một chỗ, sau khi đã ĐẾM.
    expect(scanRawCapCuts(CODE)).toHaveLength(1);
    // Kế hoạch THÔ được gán vào biến riêng TRƯỚC khi cắt — số đếm trước cắt lấy từ biến ấy, không tính lại.
    expect(CODE).toMatch(/const keHoachTho = [\s\S]{0,600}const keHoach = keHoachTho\.slice\(0, probeCap\.value\)/);
  });
});

describe('scanDocCommandsWithoutBase — cặp fixture', () => {
  it('ĐỎ: lệnh doc trong PR thiếu --base', () => {
    const src = "rm.batDau('x', 'doc', ['--skill', 'doc', '--repo', p, '--branch', sha, '--file', f], env);\n";
    expect(scanDocCommandsWithoutBase(src)).toHaveLength(1);
  });
  it('XANH: có --base, và lệnh dán tay (không --repo) được miễn', () => {
    const src =
      "rm.batDau('x', 'doc', ['--skill', 'doc', '--repo', p, '--branch', sha, '--base', b, '--file', f], env);\n" +
      "rm.batDau('y', 'doc', ['--skill', 'doc', '--file', f], env);\n";
    expect(scanDocCommandsWithoutBase(src)).toEqual([]);
  });
  it('mã nguồn hiện tại: mọi lệnh doc trong PR đều truyền --base (T2.9)', () => {
    expect(scanDocCommandsWithoutBase(SERVER)).toEqual([]);
    // Và phải có ít nhất hai lệnh doc trong PR — nếu phép nhận diện hỏng thì ca trên xanh oan.
    expect((SERVER.match(/'--skill', 'doc', '--repo'/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('T_cong — change KHÔNG thêm đường ghi result (⛔C1)', () => {
  it('skill-doc.ts và volume-standard.ts không gán `result:` / `.result =`; luật nhị phân vẫn chỉ ở decideResult', () => {
    for (const [ten, src] of [['skill-doc.ts', DOC], ['volume-standard.ts', VOLUME]] as const) {
      expect(stripComments(src), `${ten} có chỗ gán result`).not.toMatch(/\bresult\s*[:=]\s*['"](PASS|FAIL)['"]/);
      expect(stripComments(src), `${ten} gọi decideResult`).not.toContain('decideResult(');
    }
    const VERDICT = readFileSync('packages/harness/src/verdict.ts', 'utf8');
    expect(VERDICT).toContain("? 'FAIL' : 'PASS'");
  });
});

describe('bề mặt CLI dùng bộ mô tả dùng chung (không đếm lại findings.length cho «trước khi cắt»)', () => {
  it('cli.ts gọi describeVolumeStandard(v.volume_standard) ở chỗ in verdict', () => {
    // cli.ts chạy main() ngay khi import nên không test bằng hành vi; đây là bằng chứng nguồn, ghi rõ là vậy.
    expect(CLI).toContain('describeVolumeStandard(v.volume_standard)');
    expect(CLI).toContain('volume_standard: volumeStandard');
  });
});
