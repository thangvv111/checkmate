import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { RunEvent, Verdict } from '../../../packages/shared/src/types.js';
import { GOC } from './paths.js';
import { ghiSoCai, mucTuMeta } from './ledger.js';

export interface StoredEvent {
  t: number; // ms từ lúc bắt đầu run
  e: RunEvent;
}

export interface RunMeta {
  id: string;
  tieuDe: string;
  skill: 'code' | 'doc';
  trangThai: 'dang_chay' | 'xong' | 'loi';
  batDau: string;
  verdict?: Verdict;
  pr?: { so: number; headSha: string; tacGia?: string };
  ketQuaCong?: { hanhDong: 'merge' | 'reject'; luc: string; nguoi: string; chiTiet: string };
}

interface RunState {
  meta: RunMeta;
  events: StoredEvent[];
  subs: Set<(ev: StoredEvent) => void>;
}

const KHO = join(GOC, 'web-runs');
mkdirSync(KHO, { recursive: true });

export class RunManager {
  private runs = new Map<string, RunState>();

  soDangChay(): number {
    return [...this.runs.values()].filter((r) => r.meta.trangThai === 'dang_chay').length;
  }

  batDau(tieuDe: string, skill: 'code' | 'doc', args: string[], envThem: NodeJS.ProcessEnv = {}, pr?: { so: number; headSha: string; tacGia?: string }): string {
    const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const meta: RunMeta = { id, tieuDe, skill, trangThai: 'dang_chay', batDau: new Date().toISOString(), pr };
    const state: RunState = { meta, events: [], subs: new Set() };
    this.runs.set(id, state);

    const t0 = Date.now();
    const ghi = (e: RunEvent): void => {
      const ev: StoredEvent = { t: Date.now() - t0, e };
      state.events.push(ev);
      for (const s of state.subs) s(ev);
    };

    const child = spawn('npx', ['tsx', 'packages/harness/src/cli.ts', 'run', ...args, '--json'], {
      cwd: GOC,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...envThem },
    });
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const e = JSON.parse(line) as RunEvent;
        ghi(e);
        if (e.type === 'verdict') meta.verdict = e.verdict;
      } catch {
        ghi({ type: 'log', msg: line.slice(0, 300) });
      }
    });
    const rlErr = createInterface({ input: child.stderr });
    rlErr.on('line', (line) => {
      // chỉ chuyển tiếp thông báo hữu ích (retry model...), bỏ noise npm/npx
      if (/model/i.test(line)) ghi({ type: 'log', msg: line.trim() });
    });
    child.on('close', (code) => {
      if (meta.verdict) {
        meta.trangThai = 'xong';
        const muc = mucTuMeta(meta);
        if (muc) ghiSoCai(muc); // sổ cái verdict (B4.1) — append-only mọi kết luận chấm
      }
      else {
        meta.trangThai = 'loi';
        ghi({ type: 'error', msg: `Run kết thúc không có verdict (exit ${code})` });
      }
      this.luu(state);
      for (const s of state.subs) s({ t: Date.now() - t0, e: { type: 'log', msg: '__END__' } });
    });
    return id;
  }

  lay(id: string): RunState | undefined {
    if (this.runs.has(id)) return this.runs.get(id);
    // nạp lại từ đĩa (sau restart) để replay
    const f = join(KHO, `${id}.json`);
    if (existsSync(f)) {
      const data = JSON.parse(readFileSync(f, 'utf8')) as { meta: RunMeta; events: StoredEvent[] };
      const state: RunState = { meta: data.meta, events: data.events, subs: new Set() };
      this.runs.set(id, state);
      return state;
    }
    return undefined;
  }

  danhSach(): RunMeta[] {
    const daNap = new Set(this.runs.keys());
    for (const f of readdirSync(KHO).filter((x) => x.endsWith('.json'))) {
      const id = f.replace(/\.json$/, '');
      if (!daNap.has(id)) this.lay(id);
    }
    return [...this.runs.values()]
      .map((r) => r.meta)
      .sort((a, b) => b.batDau.localeCompare(a.batDau))
      .slice(0, 30);
  }

  // Verdict đã chấm cho đúng cặp (PR, commit) — nền tảng cho idempotent theo SHA
  timTheoPr(so: number, sha: string): RunMeta | undefined {
    return this.danhSach().find((m) => m.pr?.so === so && m.pr.headSha === sha && m.trangThai === 'xong');
  }

  // Các PR đã bị trả về dev (đọc từ meta đã lưu) — để hàng đợi không đánh mất việc
  daTraVe(): RunMeta[] {
    return this.danhSach().filter((m) => m.ketQuaCong?.hanhDong === 'reject');
  }

  ghiKetQuaCong(id: string, kq: RunMeta['ketQuaCong']): void {
    const st = this.lay(id);
    if (!st) return;
    st.meta.ketQuaCong = kq;
    this.luu(st);
  }

  private luu(state: RunState): void {
    writeFileSync(join(KHO, `${state.meta.id}.json`), JSON.stringify({ meta: state.meta, events: state.events }), 'utf8');
  }
}
