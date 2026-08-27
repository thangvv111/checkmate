import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckmateConfig } from './config.js';

// Trạng thái hai nguồn model. Người vận hành cần biết nguồn nào DÙNG ĐƯỢC trước khi chọn,
// thay vì chọn xong chạy cả lượt chấm mấy phút mới biết là hỏng.

export interface TrangThaiNguon {
  cli: { san_sang: boolean; chi_tiet: string };
  api: { san_sang: boolean; chi_tiet: string };
  dang_dung: 'cli' | 'api';
}

export function docTrangThaiNguon(cfg: CheckmateConfig): TrangThaiNguon {
  // CLI: có lệnh trên máy không (nhanh, không tốn gì)
  let cli = { san_sang: false, chi_tiet: 'Không tìm thấy lệnh `claude` trên máy này' };
  try {
    const r = spawnSync('claude', ['--version'], { shell: true, encoding: 'utf8', timeout: 20_000 });
    if (r.status === 0) {
      const ver = (r.stdout || '').trim().split('\n')[0].slice(0, 40);
      // Đã CÀI khác đã ĐĂNG NHẬP — chỉ cái sau mới quyết định lượt chấm tiêu gói thuê bao hay credit API.
      const coToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
      const nha = process.env.HOME ?? process.env.USERPROFILE ?? '';
      const daLogin = coToken || (nha ? existsSync(join(nha, '.claude', '.credentials.json')) : false);
      cli = daLogin
        ? { san_sang: true, chi_tiet: `Đã cài ${ver} · ${coToken ? 'có token gói thuê bao trong biến môi trường' : 'đã đăng nhập trên máy'}` }
        : { san_sang: false, chi_tiet: `Đã cài ${ver} nhưng CHƯA ĐĂNG NHẬP gói thuê bao — chạy \`claude login\` bằng đúng user chạy dịch vụ` };
    }
  } catch {
    /* giữ mặc định */
  }

  // API: có key trong môi trường không (không in key ra, chỉ nói có/không + độ dài)
  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? '';
  const api = key
    ? { san_sang: true, chi_tiet: `Có ANTHROPIC_API_KEY (${key.length} ký tự, ${key.slice(0, 11)}…)` }
    : { san_sang: false, chi_tiet: 'Chưa có ANTHROPIC_API_KEY trong môi trường' };

  return { cli, api, dang_dung: cfg.agent.provider };
}

export interface KetQuaThu {
  ok: boolean;
  nguon: 'cli' | 'api';
  giay: number;
  thong_diep: string;
}

// Gọi thử MỘT lượt cực nhẹ đúng nguồn đang chọn — bấm nút là biết ngay, không phải chấm cả PR.
export async function thuNguon(cfg: CheckmateConfig): Promise<KetQuaThu> {
  const t0 = Date.now();
  const giay = (): number => Math.round((Date.now() - t0) / 100) / 10;
  const model = cfg.agent.model;

  if (cfg.agent.provider === 'cli') {
    // Cắt ANTHROPIC_API_KEY y như lúc chấm thật: tài liệu Claude Code nói API key THẮNG cả token
    // gói thuê bao lẫn phiên đăng nhập — để nguyên thì phép thử báo xanh trong khi tiền vẫn ra từ ví API.
    const envThu: NodeJS.ProcessEnv = { ...process.env };
    delete envThu.ANTHROPIC_API_KEY;
    const r = spawnSync('claude', ['-p', '--model', model, '--tools', '""', '--no-session-persistence'], {
      input: 'Trả lời đúng hai ký tự: OK',
      shell: true,
      encoding: 'utf8',
      timeout: 120_000,
      cwd: process.env.TEMP ?? '/tmp',
      env: envThu,
    });
    const raCli = (r.stdout ?? '').trim();
    if (r.status === 0 && raCli && !/not logged in/i.test(raCli)) {
      return { ok: true, nguon: 'cli', giay: giay(), thong_diep: `Gói thuê bao trả lời: “${raCli.slice(0, 40)}” (model ${model}) — KHÔNG tiêu credit API` };
    }
    const loi = (r.stderr || raCli || r.error?.message || 'không rõ').trim().slice(0, 300);
    return {
      ok: false,
      nguon: 'cli',
      giay: giay(),
      thong_diep: /login|auth|credential|not logged/i.test(loi)
        ? 'Claude Code CLI CHƯA đăng nhập gói thuê bao trên máy này. Chủ máy chạy `claude login` bằng ĐÚNG user chạy dịch vụ (không dùng sudo), hoặc chạy `claude setup-token` trên máy có trình duyệt rồi đặt CLAUDE_CODE_OAUTH_TOKEN vào file môi trường của dịch vụ. Lưu ý: nếu máy có ANTHROPIC_API_KEY thì CLI vẫn chạy được, nhưng khi đó tiền ra từ VÍ API — CheckMate cố ý không cho hai nguồn lẫn nhau.'
        : `CLI lỗi: ${loi}`,
    };
  }

  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (!key) return { ok: false, nguon: 'api', giay: giay(), thong_diep: 'Chưa có ANTHROPIC_API_KEY — điền vào file môi trường của dịch vụ rồi khởi động lại.' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'Trả lời đúng hai ký tự: OK' }] }),
    });
    const raw = await res.text();
    if (res.ok) {
      const data = JSON.parse(raw) as { content: Array<{ text?: string }>; usage?: { input_tokens: number; output_tokens: number } };
      const ra = (data.content?.[0]?.text ?? '').trim().slice(0, 40);
      return { ok: true, nguon: 'api', giay: giay(), thong_diep: `Anthropic API trả lời: “${ra}” (model ${model}, ${data.usage?.input_tokens ?? '?'}+${data.usage?.output_tokens ?? '?'} token)` };
    }
    const msg = raw.slice(0, 300);
    return {
      ok: false,
      nguon: 'api',
      giay: giay(),
      thong_diep: /credit balance/i.test(msg)
        ? 'API từ chối: ví credit của tổ chức chứa key này đang hết. Nạp tại console.anthropic.com → Plans & Billing (lưu ý credit phải nằm ĐÚNG tổ chức/workspace của key).'
        : /authentication|invalid x-api-key/i.test(msg)
          ? 'API từ chối xác thực: key sai hoặc đã bị thu hồi.'
          : `API lỗi ${res.status}: ${msg}`,
    };
  } catch (e) {
    return { ok: false, nguon: 'api', giay: giay(), thong_diep: `Không gọi được API: ${(e as Error).message.slice(0, 200)}` };
  }
}
