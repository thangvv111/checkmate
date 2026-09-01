import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Di trú dữ liệu đời file sang cơ sở dữ liệu (specs/R9.7–R9.9).

const goc = mkdtempSync(join(tmpdir(), 'checkmate-ditru-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'checkmate.db');

const soCaiJsonl = join(goc, 'web-runs', 'verdict-ledger.jsonl');
const reviewJsonl = join(goc, 'web-runs', 'review-log.jsonl');

const dong = (o: unknown) => JSON.stringify(o);
writeFileSync(
  soCaiJsonl,
  [
    dong({ run_id: 'a1', luc: '2026-08-20T01:00:00.000Z', skill: 'code', artifact: 'PR #1', sha: 'aaa1111', verdict: 'PASS', high: 0, medium: 0, low: 0, model: 'm/x' }),
    '{ dong hong khong parse duoc',
    dong({ run_id: 'a2', luc: '2026-08-21T01:00:00.000Z', skill: 'doc', artifact: 'Tài liệu', sha: 'bbb2222', verdict: 'FAIL', high: 1, medium: 0, low: 0, model: 'm/x' }),
    dong({ luc: '2026-08-22T01:00:00.000Z', verdict: 'PASS' }), // thiếu run_id
    '',
  ].join('\n'),
  'utf8',
);
writeFileSync(
  reviewJsonl,
  [
    dong({ luc: '2026-08-20T02:00:00.000Z', hanhDong: 'merge', run_id: 'a1', nguoi: 'vinac', xac_nhan_medium: ['F1', 'F2'] }),
    dong({ luc: '2026-08-21T02:00:00.000Z', hanhDong: 'khong_hop_le', run_id: 'a2', nguoi: 'vinac' }),
    '',
  ].join('\n'),
  'utf8',
);

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const { migrateAll, migrationSummary } = await import('../apps/web/src/store/migrate.js');
const { readVerdictLedger, readGateLedger, countVerdictLedger } = await import('../apps/web/src/store/ledger-store.js');

let lan1: ReturnType<typeof migrateAll>;
let lan2: ReturnType<typeof migrateAll>;

beforeAll(() => {
  openDb();
  lan1 = migrateAll();
  lan2 = migrateAll();
});
afterAll(() => {
  closeDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('di trú sổ cái', () => {
  it('nạp được các bản ghi hợp lệ', () => {
    expect(countVerdictLedger()).toBe(2);
    expect(readVerdictLedger().map((m) => m.run_id).sort()).toEqual(['a1', 'a2']);
  });

  it('dòng hỏng và bản ghi thiếu khoá bị bỏ qua nhưng ĐƯỢC ĐẾM, không im lặng nuốt', () => {
    const b = lan1.find((k) => k.buoc === 'so-cai-jsonl')!;
    expect(b.soDong).toBe(2);
    expect(b.boQua).toBe(2); // một dòng không parse được + một bản ghi thiếu run_id
  });

  it('tóm tắt nói ra số bỏ qua để người vận hành thấy', () => {
    expect(migrationSummary(lan1)).toMatch(/bỏ qua 2 dòng hỏng/);
  });
});

describe('di trú sổ hành động cổng', () => {
  it('nạp hành động hợp lệ và dựng lại phần chi tiết', () => {
    const c = readGateLedger('a1');
    expect(c).toHaveLength(1);
    expect(c[0].nguoi).toBe('vinac');
    expect(c[0].chi_tiet).toMatch(/2 cảnh báo medium/);
  });

  it('hành động không hợp lệ bị bỏ qua và đếm vào phần hỏng', () => {
    expect(readGateLedger('a2')).toHaveLength(0);
    expect(lan1.find((k) => k.buoc === 'so-cong-jsonl')!.boQua).toBe(1);
  });
});

describe('chạy đúng một lần', () => {
  it('lượt sau không làm gì nữa', () => {
    expect(lan2.every((k) => !k.daChay)).toBe(true);
    expect(migrationSummary(lan2)).toBe('');
  });

  it('không nhân đôi bản ghi khi gọi lại', () => {
    migrateAll();
    expect(countVerdictLedger()).toBe(2);
    expect(readGateLedger()).toHaveLength(1);
  });

  it('KHÔNG xoá file gốc — chúng ở lại làm bản đối chứng', () => {
    expect(existsSync(soCaiJsonl)).toBe(true);
    expect(existsSync(reviewJsonl)).toBe(true);
  });
});
