import { spawnSync } from 'node:child_process';
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
      cli = { san_sang: true, chi_tiet: `Đã cài: ${(r.stdout || '').trim().split('\n')[0].slice(0, 60)}` };
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
    const r = spawnSync('claude', ['-p', '--model', model, '--tools', '""', '--no-session-persistence'], {
      input: 'Trả lời đúng hai ký tự: OK',
      shell: true,
      encoding: 'utf8',
      timeout: 120_000,
      cwd: process.env.TEMP ?? '/tmp',
    });
    if (r.status === 0 && (r.stdout ?? '').trim()) {
      return { ok: true, nguon: 'cli', giay: giay(), thong_diep: `Claude Code CLI trả lời: “${r.stdout.trim().slice(0, 40)}” (model ${model})` };
    }
    const loi = (r.stderr || r.stdout || r.error?.message || 'không rõ').trim().slice(0, 300);
    return {
      ok: false,
      nguon: 'cli',
      giay: giay(),
      thong_diep: /login|auth|credential|not logged/i.test(loi)
        ? `CLI chưa đăng nhập trên máy này. Chủ máy chạy \`claude login\` (hoặc \`claude setup-token\`) bằng user chạy dịch vụ. Chi tiết: ${loi}`
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
