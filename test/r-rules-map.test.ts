import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readTrackedText, scanBlindness } from './tracked-files.js';

/**
 * Lưới «không con trỏ mồ côi» — change `retire-r-rules`.
 *
 * `specs/R*.md` đã rời vai trò luật; ~780 chỗ trong code, test và tài liệu vẫn trích mã `R<n>.<m>`.
 * Chúng được phép ở lại (PO chốt: không sửa hàng loạt) với MỘT điều kiện: mỗi mã tra được nhà mới ở
 * `docs/r-rules-map.md`. Lưới này giữ điều kiện đó, và giữ cả hai tính chất khiến bảng tra không thành
 * hố quên: hàng `pending` phải trỏ một change có trong bảng chia; hàng `housed` phải trỏ một requirement
 * CÓ THẬT trong `openspec/specs/` — đúng loại mất mát đã xảy ra với R6.24b (án lệ «cột người» không
 * theo kịp capability `doi-soat-cong`).
 */

const GOC = process.cwd();
const MAP = join(GOC, 'docs', 'r-rules-map.md');
const ARCHIVE = join(GOC, 'docs', 'archive', 'r-rules');
const RE_CODE = /\bR\d{1,2}(?:\.\d{1,2}[a-z]?)?\b/g;
const BUCKETS = new Set(['invariant', 'housed', 'pending', 'precedent', 'minutes', 'obsolete', 'dropped']);
// Bảng chia change backfill — proposal của retire-r-rules. Thêm change thì thêm ở đây VÀ ở bảng tra.
const PARTITION = new Set([
  'merge-gate', 'verdict-contract', 'identity-session', 'probe-classification', 'data-layer', 'probe-library',
  'target-contract', 'repo-history', 'provider-gate', 'model-reply-parsing', 'diff-visibility', 'concurrent-runs',
]);
// Chỗ KHÔNG quét: bản gốc đã archive, chính bảng tra, và change đã archive (lịch sử, không phải mã nguồn).
const KHONG_QUET = [/^docs\/archive\/r-rules\//, /^docs\/r-rules-map\.md$/, /^openspec\/changes\/archive\//];

interface Row { code: string; title: string; bucket: string; home: string; evidence: string; line: number }

function docBang(): Row[] {
  const rows: Row[] = [];
  let trongBang = false; // chỉ đọc mục «## Bảng tra» — các bảng phụ phía sau không phải hàng tra
  readFileSync(MAP, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (/^## /.test(l)) trongBang = l.startsWith('## Bảng tra');
    if (!trongBang || !/^\| R\d/.test(l)) return;
    const c = l.split('|').map((x) => x.trim().replace(/\\\|/g, '|'));
    rows.push({ code: c[1]!, title: c[2]!, bucket: c[3]!, home: c[4]!, evidence: c[5]!, line: i + 1 });
  });
  return rows;
}

function tieuDeRequirement(): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const goc = join(GOC, 'openspec', 'specs');
  for (const d of readdirSync(goc)) {
    const f = join(goc, d, 'spec.md');
    if (!existsSync(f)) continue;
    m.set(d, new Set([...readFileSync(f, 'utf8').matchAll(/^### Requirement: (.+)$/gm)].map((x) => x[1]!.trim())));
  }
  return m;
}

describe('bảng tra docs/r-rules-map.md', () => {
  const rows = docBang();

  it('có hàng và mỗi hàng đủ năm cột, rổ thuộc danh sách đóng', () => {
    expect(rows.length).toBeGreaterThan(200);
    const sai = rows.filter((r) => !BUCKETS.has(r.bucket) || !r.code || !r.home);
    expect(sai.map((r) => `dòng ${r.line}: ${r.code} ${r.bucket}`)).toEqual([]);
  });

  it('không hai hàng cùng mã cùng rổ (luật + án lệ thì khác rổ, được)', () => {
    const seen = new Set<string>();
    const trung: string[] = [];
    for (const r of rows) {
      const k = `${r.code}|${r.bucket}`;
      if (seen.has(k)) trung.push(`${r.code} (${r.bucket}) dòng ${r.line}`);
      seen.add(k);
    }
    expect(trung).toEqual([]);
  });

  it('hàng `pending` trỏ change có trong bảng chia — pending không được thành hố vô hạn', () => {
    const sai = rows
      .filter((r) => r.bucket === 'pending')
      .flatMap((r) => r.home.split(' · ').map((h) => h.trim()).filter((h) => !PARTITION.has(h)).map((h) => `${r.code} → ${h}`));
    expect(sai).toEqual([]);
  });

  it('hàng `housed` trỏ capability có thật, và requirement có thật khi nêu tiêu đề', () => {
    const titles = tieuDeRequirement();
    const sai: string[] = [];
    for (const r of rows.filter((x) => x.bucket === 'housed')) {
      const [cap, req] = r.home.split(' › ').map((x) => x.trim());
      if (!cap || !titles.has(cap)) sai.push(`${r.code}: capability lạ «${cap}»`);
      else if (req && !titles.get(cap)!.has(req)) sai.push(`${r.code}: ${cap} không có requirement «${req}»`);
    }
    expect(sai).toEqual([]);
  });

  it('mọi mã định nghĩa trong bản gốc (docs/archive/r-rules) có hàng', () => {
    if (!existsSync(ARCHIVE)) return; // trước khi dời — change này dời trong cùng PR
    const co = new Set(rows.map((r) => r.code));
    const thieu: string[] = [];
    for (const f of readdirSync(ARCHIVE).filter((x) => /^R\d+-.*\.md$/.test(x))) {
      const text = readFileSync(join(ARCHIVE, f), 'utf8');
      const h1 = /^# (R\d+) — /m.exec(text);
      if (h1 && !co.has(h1[1]!)) thieu.push(`${h1[1]} (${f})`);
      for (const m of text.matchAll(/^\s*-\s+\*\*(R\d+\.\d+[a-z]?)(?:\s+·[^*]*)?\*\*\s+—/gm)) if (!co.has(m[1]!)) thieu.push(`${m[1]} (${f})`);
    }
    expect(thieu).toEqual([]);
  });
});

describe('không con trỏ mồ côi — mọi mã R trích trong repo có hàng', () => {
  it('quét mọi file text git theo dõi VÀ file mới chưa add (không bị ignore)', () => {
    // Chỉ quét file đã add thì một file test mới mang mã lạ xanh cho tới lúc commit — lưới mù đúng lúc
    // người viết đang cần nó. `--others --exclude-standard` lấy cả file chưa add, bỏ file bị ignore.
    const co = new Set(docBang().map((r) => r.code));
    const files = execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '--cached', '--others', '--exclude-standard'], { cwd: GOC, encoding: 'utf8' })
      .split('\n')
      .map((x) => x.trim())
      .filter((p) => p && /\.(ts|js|md|yml|yaml|json|txt)$/i.test(p) && !KHONG_QUET.some((re) => re.test(p)));
    // `openspec archive` DỜI thư mục change; giữa lúc dời và lúc commit, chỉ mục git còn trỏ đường cũ.
    // Đọc thẳng thì nổ ENOENT giữa một lượt test đang xanh — đã gãy BA lần trong ngày 05/09.
    // `readTrackedText` bỏ qua file vắng mặt và ĐẾM; `scanBlindness` giữ cho việc bỏ qua ấy không âm thầm
    // biến lưới thành «xanh mà không quét gì». Chi tiết: test/tracked-files.ts.
    const daQuet = readTrackedText(files, (p) => readFileSync(join(GOC, p), 'utf8'));
    expect(scanBlindness(daQuet), 'phép quét mã R mồ côi đang mù').toEqual([]);
    const moCoi: string[] = [];
    for (const { p, text } of daQuet.daDoc) {
      text.split(/\r?\n/).forEach((l, i) => {
        for (const m of l.matchAll(RE_CODE)) if (!co.has(m[0])) moCoi.push(`${p}:${i + 1} ${m[0]}`);
      });
    }
    // Mã mới xuất hiện mà không có hàng: thêm hàng vào docs/r-rules-map.md (rổ `obsolete` nếu chỉ là ví dụ).
    expect(moCoi).toEqual([]);
  });
});
