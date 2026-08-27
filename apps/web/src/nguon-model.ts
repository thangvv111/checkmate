import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cauHinhHienTai, docTokenThueBao, type CheckmateConfig } from './config.js';
import { dinhNghia, docKhoa, ghiSoKiem, type CauHinhNcc, type KetQuaKiem, type MaNcc } from './ncc.js';

// Kiểm một nhà cung cấp: gọi thử MỘT câu cực ngắn đúng cấu hình của nó.
// Vừa là nút "Kiểm tra" trong giao diện, vừa là CỔNG: chưa kiểm thành công thì không được chọn để chấm.

export interface TrangThaiNcc {
  ma: MaNcc;
  ten: string;
  co_khoa: boolean;
  mo_ta_khoa: string;
  san_sang_thue_bao?: boolean; // riêng anthropic: CLI đã đăng nhập chưa
  mo_ta_thue_bao?: string;
}

export function docTrangThaiNcc(ma: MaNcc): TrangThaiNcc {
  const dn = dinhNghia(ma);
  const khoa = docKhoa(ma);
  const t: TrangThaiNcc = {
    ma,
    ten: dn.ten,
    co_khoa: !!khoa,
    mo_ta_khoa: khoa ? `đã có (${khoa.length} ký tự, ${khoa.slice(0, 8)}…)` : 'chưa có',
  };
  if (ma === 'anthropic') {
    let mo = 'Không tìm thấy lệnh `claude` trên máy này';
    let ok = false;
    try {
      const r = spawnSync('claude', ['--version'], { shell: true, encoding: 'utf8', timeout: 20_000 });
      if (r.status === 0) {
        const ver = (r.stdout || '').trim().split('\n')[0].slice(0, 30);
        const coToken = !!docTokenThueBao();
        const nha = process.env.HOME ?? process.env.USERPROFILE ?? '';
        ok = coToken || (nha ? existsSync(join(nha, '.claude', '.credentials.json')) : false);
        mo = ok
          ? `Đã cài ${ver} · ${coToken ? 'có token gói thuê bao' : 'đã đăng nhập trên máy'}`
          : `Đã cài ${ver} nhưng CHƯA đăng nhập gói thuê bao`;
      }
    } catch {
      /* giữ mặc định */
    }
    t.san_sang_thue_bao = ok;
    t.mo_ta_thue_bao = mo;
  }
  return t;
}

const CAU_THU = 'Trả lời đúng hai ký tự: OK';

// Khoá của nhà cung cấp nào cũng có hình dạng riêng — nhận ra ngay khi người dùng dán nhầm thẻ,
// thay vì để họ đọc "Incorrect API key" rồi tưởng khoá hỏng.
function doanChuNha(khoa: string): string | null {
  if (/^AQ\.|^AIza/.test(khoa)) return 'Google AI Studio';
  if (/^sk-ant-api/.test(khoa)) return 'Anthropic';
  if (/^sk-ant-oat/.test(khoa)) return 'token gói thuê bao Claude Code';
  if (/^gh[pousr]_|^github_pat_/.test(khoa)) return 'GitHub';
  if (/^sk-proj-|^sk-[A-Za-z0-9]{20,}/.test(khoa)) return 'OpenAI';
  return null;
}

async function goiChatCompletions(endpoint: string, khoa: string, model: string, nhan: string, tenNcc: string): Promise<{ ok: boolean; thong_diep: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${khoa}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: CAU_THU }] }),
    });
    const raw = await res.text();
    if (res.ok) {
      const d = JSON.parse(raw) as { choices: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens: number; completion_tokens: number } };
      const ra = (d.choices?.[0]?.message?.content ?? '').trim().slice(0, 40);
      return { ok: true, thong_diep: `${nhan} trả lời: “${ra}” (model ${model}${d.usage ? `, ${d.usage.prompt_tokens}+${d.usage.completion_tokens} token` : ''})` };
    }
    const msg = raw.slice(0, 240);
    if (res.status === 401 || res.status === 403) {
      const chuNha = doanChuNha(khoa);
      if (chuNha && chuNha !== tenNcc) {
        return {
          ok: false,
          thong_diep: `Khoá này trông giống khoá của ${chuNha}, không phải của ${nhan} — nhiều khả năng dán nhầm thẻ nhà cung cấp. Mở thẻ ${chuNha} và dán vào đó.`,
        };
      }
      return { ok: false, thong_diep: `${nhan} từ chối xác thực (HTTP ${res.status}) — khoá sai, hết hạn hoặc thiếu quyền. Chi tiết: ${msg}` };
    }
    if (res.status === 404) {
      return { ok: false, thong_diep: `${nhan} không có model “${model}” (HTTP 404) — chọn model khác trong danh sách. Chi tiết: ${msg}` };
    }
    if (res.status === 429) return { ok: false, thong_diep: `${nhan} chặn vì vượt hạn mức (HTTP 429). Chi tiết: ${msg}` };
    return { ok: false, thong_diep: `${nhan} lỗi ${res.status}: ${msg}` };
  } catch (e) {
    return { ok: false, thong_diep: `Không gọi được ${nhan}: ${(e as Error).message.slice(0, 200)}` };
  }
}

export interface KetQuaThu extends KetQuaKiem {
  ncc: MaNcc;
  giay: number;
}

export async function thuNcc(ma: MaNcc, cfg: CauHinhNcc): Promise<KetQuaThu> {
  const t0 = Date.now();
  const giay = (): number => Math.round((Date.now() - t0) / 100) / 10;
  const khoa = docKhoa(ma);
  const xong = (ok: boolean, thong_diep: string): KetQuaThu => {
    const luc = new Date().toISOString();
    ghiSoKiem(ma, { ok, luc, thong_diep, model: cfg.model, phuong_thuc: cfg.phuong_thuc });
    return { ok, thong_diep, ncc: ma, giay: giay(), luc, model: cfg.model, phuong_thuc: cfg.phuong_thuc };
  };

  // ---- Anthropic · gói thuê bao: chạy qua Claude Code CLI ----
  if (ma === 'anthropic' && cfg.phuong_thuc === 'thue_bao') {
    // Cắt ANTHROPIC_API_KEY: tài liệu Claude Code nói API key THẮNG cả token thuê bao lẫn phiên đăng nhập —
    // để nguyên thì phép thử báo xanh trong khi tiền vẫn ra từ ví API.
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const tokenTb = docTokenThueBao();
    if (tokenTb) env.CLAUDE_CODE_OAUTH_TOKEN = tokenTb;
    const r = spawnSync('claude', ['-p', '--model', cfg.model, '--tools', '""', '--no-session-persistence'], {
      input: CAU_THU,
      shell: true,
      encoding: 'utf8',
      timeout: 120_000,
      cwd: process.env.TEMP ?? '/tmp',
      env,
    });
    const ra = (r.stdout ?? '').trim();
    if (r.status === 0 && ra && !/not logged in/i.test(ra)) {
      return xong(true, `Gói thuê bao trả lời: “${ra.slice(0, 40)}” (model ${cfg.model}) — KHÔNG tiêu credit API`);
    }
    const loi = (r.stderr || ra || r.error?.message || 'không rõ').trim().slice(0, 240);
    return xong(
      false,
      /login|auth|credential|not logged/i.test(loi)
        ? 'Claude Code CLI CHƯA đăng nhập gói thuê bao. Chạy `claude login` bằng ĐÚNG user chạy dịch vụ, hoặc dán token `claude setup-token` vào ô Token gói thuê bao.'
        : `CLI lỗi: ${loi}`,
    );
  }

  // ---- Anthropic · API ----
  if (ma === 'anthropic') {
    if (!khoa) return xong(false, 'Chưa có API key Anthropic — dán vào ô bên dưới rồi kiểm lại.');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': khoa, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, max_tokens: 16, messages: [{ role: 'user', content: CAU_THU }] }),
      });
      const raw = await res.text();
      if (res.ok) {
        const d = JSON.parse(raw) as { content: Array<{ text?: string }>; usage?: { input_tokens: number; output_tokens: number } };
        return xong(
          true,
          `Anthropic API trả lời: “${(d.content?.[0]?.text ?? '').trim().slice(0, 40)}” (model ${cfg.model}, ${d.usage?.input_tokens ?? '?'}+${d.usage?.output_tokens ?? '?'} token)`,
        );
      }
      const msg = raw.slice(0, 240);
      return xong(
        false,
        /credit balance/i.test(msg)
          ? 'Ví credit của tổ chức chứa key này đang hết. Nạp tại console.anthropic.com → Plans & Billing (credit phải nằm ĐÚNG tổ chức/workspace của key).'
          : /authentication|invalid x-api-key/i.test(msg)
            ? (() => {
                const chuNha = doanChuNha(khoa);
                return chuNha && chuNha !== 'Anthropic'
                  ? `Khoá này trông giống khoá của ${chuNha}, không phải API key Anthropic — nhiều khả năng dán nhầm thẻ nhà cung cấp.`
                  : 'API từ chối xác thực: key sai hoặc đã bị thu hồi.';
              })()
            : `Anthropic API lỗi ${res.status}: ${msg}`,
      );
    } catch (e) {
      return xong(false, `Không gọi được Anthropic API: ${(e as Error).message.slice(0, 200)}`);
    }
  }

  // ---- GitHub Models / OpenAI: cùng chuẩn chat/completions ----
  if (!khoa) return xong(false, `Chưa có ${dinhNghia(ma).khoa?.nhan ?? 'khoá'} — dán vào ô bên dưới rồi kiểm lại.`);
  const { ok, thong_diep } =
    ma === 'github'
      ? await goiChatCompletions('https://models.github.ai/inference/chat/completions', khoa, cfg.model, 'GitHub Models', 'GitHub')
      : ma === 'google'
        ? await goiChatCompletions('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', khoa, cfg.model, 'Google Gemini', 'Google AI Studio')
        : await goiChatCompletions('https://api.openai.com/v1/chat/completions', khoa, cfg.model, 'OpenAI', 'OpenAI');
  return xong(ok, thong_diep);
}

// Thử đúng nhà cung cấp đang chọn trong cấu hình
export async function thuNguon(c: CheckmateConfig): Promise<KetQuaThu> {
  return thuNcc(c.agent.ncc, cauHinhHienTai(c));
}
