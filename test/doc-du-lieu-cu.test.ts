import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Verdict } from '../packages/shared/src/types.js';
import { chuanMuc } from '../packages/shared/src/types.js';

/**
 * Lưới canh LỚP B của đợt đổi tên — dữ liệu ĐÃ LƯU phải đọc lại được nguyên vẹn.
 *
 * Lớp A (tên hàm/biến/kiểu/file) có trình biên dịch làm lưới: sót một chỗ là `tsc` đỏ ngay. Lớp B
 * thì KHÔNG AI BẮT — tên trường nằm trong JSON tự do trên đĩa và trong cột SQLite; đổi nhầm thì dữ
 * liệu cũ đọc ra khuyết, âm thầm, và mọi test dùng object dựng-trong-test vẫn xanh.
 *
 * Vì vậy fixture ở đây BẮT BUỘC là FILE DỮ LIỆU ĐỜI THẬT chép từ `runs/` và `probes-lib/` trước đợt
 * đổi tên. Object dựng trong test mang tên MỚI nên nó xanh cả khi đã đổi hỏng — đó là test mồ côi,
 * không phải lưới.
 */

const FIX = join(resolve('.'), 'test', 'fixtures');
const doc = (f: string): unknown => JSON.parse(readFileSync(join(FIX, f), 'utf8'));

describe('verdict đời cũ đọc lại được nguyên vẹn (lớp B)', () => {
  const v = doc('verdict-doi-cu.json') as Verdict;

  it('trường gốc của verdict còn đủ', () => {
    for (const k of ['run_id', 'skill', 'artifact_ref', 'result', 'findings', 'model'] as const) {
      expect(v[k], `verdict đời cũ mất trường ${k}`).toBeDefined();
    }
    expect(v.artifact_ref.sha_or_hash, 'verdict phải còn ghim SHA').toBeTruthy();
    expect(['PASS', 'FAIL']).toContain(v.result);
  });

  it('finding còn đủ trường, và severity vẫn chuẩn hoá được', () => {
    expect(v.findings.length, 'fixture phải có finding thật để canh được').toBeGreaterThan(0);
    for (const f of v.findings) {
      for (const k of ['id', 'skill', 'severity', 'title_vi', 'what_vi', 'consequence_vi', 'evidence'] as const) {
        expect(f[k], `finding ${f.id} mất trường ${k}`).toBeDefined();
      }
      expect(['high', 'medium', 'low']).toContain(chuanMuc(f.severity));
      expect(f.evidence.type, 'evidence phải còn phân biệt được loại').toBeTruthy();
    }
  });

  it('probe_stats còn đủ 13 trường — đây là chỗ tên Việt dày nhất trong dữ liệu', () => {
    const ps = v.probe_stats;
    expect(ps, 'fixture phải có probe_stats').toBeDefined();
    for (const k of [
      'ke_hoach', 'ghi_nhan', 'pass', 'hoi_quy', 'vi_pham_luat_moi', 'luat_da_phu', 'luat_tong',
      'ngoai_pham_vi', 'nghi_loi_co_san', 'nghi_van', 'cai_thien', 'bo_qua', 'that_lac',
    ] as const) {
      expect(ps?.[k], `probe_stats đời cũ mất trường ${k} — đổi nhầm lớp B`).toBeDefined();
    }
  });

  it('chi_phi còn đủ trường', () => {
    const c = v.chi_phi;
    expect(c).toBeDefined();
    for (const k of ['calls', 'token_vao', 'token_ra', 'uoc_tinh'] as const) {
      expect(c?.[k], `chi_phi đời cũ mất trường ${k}`).toBeDefined();
    }
  });
});

describe('sổ thư viện probe đời cũ đọc lại được nguyên vẹn (lớp B)', () => {
  const m = doc('thu-vien-doi-cu.json') as { probes?: Array<Record<string, unknown>> };

  it('mỗi probe còn đủ trường sổ', () => {
    expect(m.probes?.length, 'fixture phải có probe thật').toBeGreaterThan(0);
    for (const p of m.probes ?? []) {
      for (const k of ['ten', 'sha_sinh', 'luc', 'hash', 'plan', 'lich_su']) {
        expect(p[k], `probe trong sổ mất trường ${k}`).toBeDefined();
      }
    }
  });

  it('kế hoạch probe trong sổ còn đủ 5 trường — bẫy KeHoachProbe nửa-A-nửa-B', () => {
    // Tên KIỂU `KeHoachProbe` thuộc lớp A (đổi được). Nhưng 5 field của nó được ghi vào sổ này ở
    // trường `plan`, nên CHÚNG thuộc lớp B. Cùng một kiểu, hai lớp — chỗ chắc chắn đổi nhầm nếu chỉ
    // dựa vào mắt.
    for (const p of m.probes ?? []) {
      const plan = p.plan as Record<string, unknown>;
      for (const k of ['id', 'ten', 'muc_dich', 'spec_rule', 'ky_vong']) {
        expect(plan?.[k], `plan của probe mất trường ${k} — đây là lớp B, không được đổi`).toBeDefined();
      }
    }
  });
});

describe('fixture phải là DỮ LIỆU CŨ đọc từ đĩa, không phải object dựng trong test', () => {
  it('hai fixture đọc được từ test/fixtures và mang trường tên Việt của đời cũ', () => {
    // Ca này canh chính cái lưới: nếu ai đó thay fixture bằng object dựng trong test (mang tên MỚI)
    // thì lưới trên xanh cả khi đã đổi hỏng. Đọc từ đĩa + assert tên Việt còn đó là bằng chứng
    // fixture chưa bị «hiện đại hoá».
    const v = readFileSync(join(FIX, 'verdict-doi-cu.json'), 'utf8');
    const t = readFileSync(join(FIX, 'thu-vien-doi-cu.json'), 'utf8');
    expect(v).toContain('"ke_hoach"');
    expect(v).toContain('"luat_da_phu"');
    expect(t).toContain('"sha_sinh"');
    expect(t).toContain('"muc_dich"');
  });
});
