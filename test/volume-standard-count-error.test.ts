import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * T2.4 — `countDocWords` NÉM giữa chừng: lượt chấm KHÔNG được chết, phép đo ghi `reason: 'error'`, mọi số đếm
 * khác vẫn đủ, verdict như không có chuẩn. Mutation «bỏ try/catch quanh countDocWords» ⇒ lượt ném ⇒ ca này đỏ.
 *
 * File riêng vì `vi.mock` áp cho cả file: mock hàm đếm từ ở module gốc, skill-doc import cùng module nên
 * nhận bản mock.
 */
vi.mock('../packages/harness/src/volume-standard.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../packages/harness/src/volume-standard.js')>();
  return {
    ...actual,
    countDocWords: () => {
      throw new Error('boom: đếm từ hỏng');
    },
  };
});

import { runDocSkill } from '../packages/harness/src/skill-doc.js';
import { defaultStandards } from '../packages/harness/src/volume-standard.js';

let dir: string;
let file: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cm-count-err-'));
  file = join(dir, 'doc.md');
  writeFileSync(file, Array.from({ length: 40 }, (_, i) => `Dong ${i + 1} noi dung muc ${i + 1} gia tri ${i + 1} ket`).join('\n'), 'utf8');
  process.env.CHECKER_SKEPTIC = '0';
});
afterAll(() => {
  delete process.env.CHECKER_SKEPTIC;
  rmSync(dir, { recursive: true, force: true });
});

describe('T2.4 — đếm từ ném thì KHÔNG giết lượt chấm', () => {
  it('reason error · words 0 · counts đủ · finding vẫn ra · không ném', async () => {
    const traLoi = JSON.stringify({
      findings: [{ id: 'D1', rubric: 'khong_do_duoc', severity: 'medium', title_vi: 't', what_vi: 'x', consequence_vi: 'y', quotes: [{ quote: 'Dong 3 noi dung muc 3 gia tri 3 ket', vi_tri: 'd3' }] }],
    });
    const model = { ten: 'gia', complete: async () => traLoi };
    const logs: string[] = [];
    const kq = await runDocSkill(model, file, (e) => { if (e.type === 'log') logs.push(e.msg); }, defaultStandards());
    expect(kq.findings).toHaveLength(1);
    const d = kq.volume_standard.density!;
    expect(d.reason).toBe('error');
    expect(d.applied).toBe(false);
    expect(d.words).toBe(0);
    expect(d.measured_per_1000).toBeUndefined();
    expect(kq.volume_standard.counts).toMatchObject({ raw_round1: 1, after_machine_grids: 1, before_cut: 1, after_cut: 1, final: 1, dropped_by_cap: 0 });
    expect(logs.some((m) => m.includes('không đếm được từ'))).toBe(true);
  });
});
