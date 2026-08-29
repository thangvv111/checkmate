import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Phép thử quy mô cho tầng dữ liệu (specs/R9.10–R9.11): sổ cái 10.000 bản ghi thì các truy vấn mà
// trang lịch sử và trang tin cậy dùng còn nhanh không, và index có ăn không.
// Chạy: npx tsx bench/quy-mo-so-cai.ts

const goc = mkdtempSync(join(tmpdir(), 'checkmate-bench-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'bench.db');

const { moDb, dongDb } = await import('../apps/web/src/kho/db.js');
const { ghiSoCai, docSoCai, demSoCai } = await import('../apps/web/src/kho/kho-socai.js');

const N = Number(process.env.BENCH_N ?? 10_000);
const REPOS = ['thangvv111/checkmate', 'thangvv111/demo-credit-approval', 'thangvv111/menuting', 'khac/repo'];
const TAC_GIA = ['thang', 'mai', 'hung', 'lan', 'bot'];

const d = moDb();
const t0 = Date.now();
d.exec('BEGIN');
for (let i = 0; i < N; i++) {
  const ngay = new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString();
  ghiSoCai({
    run_id: `r${i}`,
    luc: ngay,
    skill: i % 5 === 0 ? 'doc' : 'code',
    artifact: `PR #${i % 400} · ${i % 5 === 0 ? 'tài liệu' : 'code'} (${i % 30} file đổi)`,
    sha: (i * 2654435761).toString(16).padStart(10, '0').slice(0, 10),
    verdict: i % 7 === 0 ? 'FAIL' : 'PASS',
    high: i % 7 === 0 ? 1 + (i % 3) : 0,
    medium: i % 4,
    low: i % 3,
    pr: i % 400,
    tac_gia: TAC_GIA[i % TAC_GIA.length],
    repo: REPOS[i % REPOS.length],
    model: i % 3 === 0 ? 'claude-cli/claude-opus-5' : 'anthropic-api/claude-sonnet-5',
    token_vao: 30_000 + (i % 20_000),
    token_ra: 2_000 + (i % 3_000),
    token_uoc: i % 2 === 0,
  });
}
d.exec('COMMIT');
const tNap = Date.now() - t0;

const do_ = (ten: string, viec: () => unknown): void => {
  viec(); // lượt khởi động, không tính
  const t = Date.now();
  const lan = 20;
  let kq: unknown;
  for (let i = 0; i < lan; i++) kq = viec();
  const ms = (Date.now() - t) / lan;
  const soLuong = Array.isArray(kq) ? `${kq.length} dòng` : String(kq);
  console.log(`  ${ten.padEnd(46)} ${ms.toFixed(2).padStart(7)} ms   ${soLuong}`);
};

console.log(`\nSổ cái ${N.toLocaleString('vi')} bản ghi · nạp mất ${(tNap / 1000).toFixed(1)}s\n`);
console.log('Truy vấn (trung bình 20 lượt):');
do_('trang lịch sử — 25 dòng đầu', () => docSoCai({ gioi_han: 25 }));
do_('lọc theo repo + phân trang', () => docSoCai({ repo: REPOS[0], gioi_han: 25 }));
do_('lọc repo + verdict + skill', () => docSoCai({ repo: REPOS[0], verdict: 'FAIL', skill: 'code', gioi_han: 25 }));
do_('đếm tổng để phân trang', () => demSoCai({ repo: REPOS[0] }));
do_('tìm chữ trong artifact/SHA', () => docSoCai({ q: 'PR #37', gioi_han: 25 }));
do_('trang tin cậy — gom theo tác giả', () =>
  moDb()
    .prepare(`SELECT tac_gia, COUNT(*) n, SUM(verdict='PASS') pass, SUM(high) high
              FROM so_cai WHERE tac_gia IS NOT NULL GROUP BY tac_gia ORDER BY n DESC`)
    .all(),
);
do_('phân trang sâu — bỏ qua 9.000 dòng', () => docSoCai({ gioi_han: 25, bo_qua: 9_000 }));

console.log('\nKế hoạch truy vấn của câu lọc-theo-repo (xem index có ăn không):');
for (const r of moDb().prepare('EXPLAIN QUERY PLAN SELECT * FROM so_cai WHERE repo = ? ORDER BY luc DESC LIMIT 25').all(REPOS[0]) as Array<Record<string, unknown>>) {
  console.log('  ' + String(r.detail));
}

dongDb();
rmSync(goc, { recursive: true, force: true });
