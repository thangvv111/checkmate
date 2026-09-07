import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunEvent } from '../packages/shared/src/types.js';
import { runDocSkill } from '../packages/harness/src/skill-doc.js';
import { defaultStandards, type ResolvedStandards } from '../packages/harness/src/volume-standard.js';
import { decideResult } from '../packages/harness/src/verdict.js';

/**
 * Capability `finding-volume-standard` — đường ENGINE thật của skill-doc với model giả.
 *
 * Ba điều phải khoá được bằng hành vi, không bằng đọc code:
 *   · số đếm theo tầng KHÔNG đổi khi đổi trần (đếm trước cắt) — hạ `finding_cap` xuống 4 không hạ được mật độ;
 *   · mật độ VƯỢT không đổi verdict, không bỏ vòng nào (bước này chỉ đo);
 *   · con số trần KHÔNG có mặt trong prompt, nhưng phanh precision thì CÓ.
 */

const DONG = 40;
/** 40 dòng × 10 token = 400 từ (v1) — trên sàn 300, dải ≤1000, ngưỡng 20/1000. */
function taiLieu(): string {
  const lines: string[] = [];
  for (let i = 1; i <= DONG; i++) lines.push(`Dong ${i} noi dung muc ${i} gia tri ${i} ket`);
  return lines.join('\n');
}
const dongThu = (i: number) => `Dong ${i} noi dung muc ${i} gia tri ${i} ket`;

/** Model giả: trả lần lượt các câu dựng sẵn, ghi lại mọi prompt đã nhận. */
function modelGia(traLoi: string[]) {
  const prompts: string[] = [];
  let i = 0;
  return {
    prompts,
    model: {
      ten: 'gia',
      complete: async (p: string) => {
        prompts.push(p);
        return traLoi[Math.min(i++, traLoi.length - 1)];
      },
    },
  };
}

/** `tot` ứng viên neo được (trích nguyên một dòng) + `xau` ứng viên trích câu không có trong tài liệu. */
function vong1(tot: number, xau: number, severity = 'medium'): string {
  const fs: unknown[] = [];
  for (let i = 1; i <= tot; i++) {
    fs.push({ id: `D${i}`, rubric: 'khong_do_duoc', severity, title_vi: `tieu chi ${i} khong do duoc`, what_vi: 'x', consequence_vi: 'y', quotes: [{ quote: dongThu(i), vi_tri: `dong ${i}` }] });
  }
  for (let j = 1; j <= xau; j++) {
    fs.push({ id: `X${j}`, rubric: 'khong_do_duoc', severity, title_vi: `bia ${j}`, what_vi: 'x', consequence_vi: 'y', quotes: [{ quote: `cau nay hoan toan khong ton tai trong tai lieu so ${j}`, vi_tri: 'dau do' }] });
  }
  return JSON.stringify({ findings: fs });
}
const vong2Rong = JSON.stringify({ findings: [] });
const skepticGiuHet = (ids: string[]) => JSON.stringify({ giu: ids, loai: [] });

let dir: string;
let file: string;
const logs: string[] = [];
const phat = (e: RunEvent) => {
  if (e.type === 'log') logs.push(e.msg);
};
let skepticCu: string | undefined;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cm-volume-'));
  file = join(dir, 'tai-lieu.md');
  writeFileSync(file, taiLieu(), 'utf8');
  skepticCu = process.env.CHECKER_SKEPTIC;
  process.env.CHECKER_SKEPTIC = '1'; // vòng phản biện PHẢI chạy — ca T2.3 đếm nó
});
afterAll(() => {
  if (skepticCu === undefined) delete process.env.CHECKER_SKEPTIC;
  else process.env.CHECKER_SKEPTIC = skepticCu;
  rmSync(dir, { recursive: true, force: true });
});

function chuan(findingCap: number): ResolvedStandards {
  const s = defaultStandards();
  return { ...s, finding_cap: { value: findingCap, source: 'repo' } };
}

describe('đếm trước cắt, cắt sau lưới máy — số đếm độc lập với trần (T2.1, T2.2)', () => {
  it('trần 4: raw 25 · sau lưới 8 · trước cắt 8 · sau cắt 4 · bỏ 4 — và mật độ đo trên 8, không trên 4', async () => {
    logs.length = 0;
    const g = modelGia([vong1(8, 17), vong2Rong, skepticGiuHet(['D1', 'D2', 'D3', 'D4'])]);
    const kq = await runDocSkill(g.model, file, phat, chuan(4));
    const c = kq.volume_standard.counts;
    expect(c.raw_round1).toBe(25);
    expect(c.after_machine_grids).toBe(8);
    expect(c.raw_round2).toBe(0);
    expect(c.before_cut).toBe(8);
    expect(c.after_cut).toBe(4);
    expect(c.dropped_by_cap).toBe(4);
    expect(c.after_skeptic).toBe(4);
    expect(c.final).toBe(4);
    expect(kq.findings).toHaveLength(4);
    // mật độ = 8 × 1000 / 400 = 20.0 — ĐÚNG ngưỡng, không vượt (T1.19 biên trùng)
    const d = kq.volume_standard.density!;
    expect(d.words).toBe(400);
    expect(d.band).toBe('<=1000');
    expect(d.threshold_per_1000).toBe(20);
    expect(d.measured_per_1000).toBe(20);
    expect(d.exceeded).toBe(false);
    expect(d.applied).toBe(false);
    expect(d.reason).toBe('observe_only');
    expect(logs.some((m) => m.includes('Trần finding 4 cắn') && m.includes('bỏ 4')), 'trần cắn phải được KHAI, không cắt im lặng').toBe(true);
  });

  it('trần 100 trên CÙNG dữ liệu: ba số trước cắt y hệt, chỉ sau-cắt đổi', async () => {
    const g = modelGia([vong1(8, 17), vong2Rong, skepticGiuHet(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'])]);
    const kq = await runDocSkill(g.model, file, phat, chuan(100));
    const c = kq.volume_standard.counts;
    expect([c.raw_round1, c.after_machine_grids, c.before_cut]).toEqual([25, 8, 8]);
    expect(c.after_cut).toBe(8);
    expect(c.dropped_by_cap).toBe(0);
    expect(kq.volume_standard.density!.measured_per_1000).toBe(20);
    expect(kq.volume_standard.finding_cap).toEqual({ value: 100, source: 'repo' });
  });
});

describe('mật độ VƯỢT không đổi verdict, không bỏ vòng nào (T2.3)', () => {
  it('9 ứng viên/400 từ = 22.5 > 20 ⇒ exceeded=true, vẫn PASS, vòng phản biện vẫn chạy', async () => {
    const g = modelGia([vong1(9, 0), skepticGiuHet(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'])]);
    const kq = await runDocSkill(g.model, file, phat, chuan(100));
    const d = kq.volume_standard.density!;
    expect(d.measured_per_1000).toBe(22.5);
    expect(d.exceeded).toBe(true);
    expect(d.applied).toBe(false);
    // Không finding high (rubric mềm kẹp về medium) ⇒ PASS — y hệt hôm nay. Bước này KHÔNG có lối thoát sớm.
    expect(kq.findings.every((f) => f.severity === 'medium')).toBe(true);
    expect(decideResult(kq.findings)).toBe('PASS');
    // Không quote hỏng ⇒ không vòng 2; skeptic PHẢI được gọi ⇒ đúng 2 lời gọi model.
    expect(g.prompts).toHaveLength(2);
    expect(g.prompts[1]).toContain('NGƯỜI PHẢN BIỆN');
    expect(kq.volume_standard.counts.raw_round2).toBeUndefined();
  });
});

describe('prompt không mang con số trần, nhưng còn phanh precision (T3.6, T3.7)', () => {
  it('mốc 7919 ở CẢ BỐN khoá KHÔNG xuất hiện trong prompt nào, và không có câu ràng buộc số lượng (T_khongtincay)', async () => {
    const g = modelGia([vong1(2, 0), skepticGiuHet(['D1', 'D2'])]);
    const s = defaultStandards();
    const moc = { value: 7919, source: 'repo' as const };
    await runDocSkill(g.model, file, phat, { ...s, finding_cap: moc, probe_cap: moc, density_per_1000_words: moc, density_floor_words: moc });
    expect(g.prompts.length).toBeGreaterThanOrEqual(1);
    for (const p of g.prompts) {
      expect(p).not.toContain('7919');
      expect(p).not.toMatch(/(tối đa|toi da|không quá|nhiều nhất|at most|max(imum)?)\s*(\$\{[^}]*\}|\d+)\s*(finding|probe)/i);
    }
  });
  it('phanh precision còn nguyên văn trong prompt vòng 1', async () => {
    const g = modelGia([vong1(1, 0), skepticGiuHet(['D1'])]);
    await runDocSkill(g.model, file, phat, chuan(100));
    expect(g.prompts[0]).toContain('Ghi MỌI lỗi mà trích dẫn nguyên văn tự chứng minh được, và CHỈ những lỗi đó');
    expect(g.prompts[0]).toContain('Không cần finding cho mọi loại rubric');
  });
});

describe('đầu vào khuyết từ model không giết lượt chấm (T3.1)', () => {
  it('findings: null · phần tử null · thiếu severity ⇒ vẫn ra verdict, số đếm đủ', async () => {
    const tra = JSON.stringify({ findings: [null, { id: 'D1', rubric: 'khong_do_duoc', title_vi: 't', what_vi: 'x', consequence_vi: 'y', quotes: [{ quote: dongThu(1), vi_tri: 'd1' }] }] });
    const g = modelGia([tra, skepticGiuHet(['D1'])]);
    const kq = await runDocSkill(g.model, file, phat, chuan(100));
    expect(kq.volume_standard.counts.raw_round1).toBe(1);
    expect(kq.findings).toHaveLength(1);
    expect(kq.findings[0].severity).toBe('medium'); // thiếu severity → high (fail-closed) → rubric mềm kẹp về medium
  });
  it('findings: null hoàn toàn ⇒ 0 ứng viên, không ném', async () => {
    const g = modelGia([JSON.stringify({ findings: null })]);
    const kq = await runDocSkill(g.model, file, phat, chuan(100));
    expect(kq.volume_standard.counts).toMatchObject({ raw_round1: 0, before_cut: 0, after_cut: 0, final: 0, dropped_by_cap: 0 });
  });
});
