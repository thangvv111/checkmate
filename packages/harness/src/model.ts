import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

export interface ModelProvider {
  ten: string;
  complete(prompt: string): Promise<string>;
}

// L3: đo chi phí mỗi lượt chấm — CLI không trả usage nên ước theo ký tự (~3.5 ký tự/token với text Việt+code);
// API dùng usage thật khi có. Đủ để trả lời "mỗi PR tốn bao nhiêu?" bằng số.
export const doChiPhi = { calls: 0, kyTuVao: 0, kyTuRa: 0, tokenVao: 0, tokenRa: 0 };
export function tomTatChiPhi(): string {
  const inTok = doChiPhi.tokenVao || Math.round(doChiPhi.kyTuVao / 3.5);
  const outTok = doChiPhi.tokenRa || Math.round(doChiPhi.kyTuRa / 3.5);
  const uoc = doChiPhi.tokenVao ? '' : ' (ước từ ký tự)';
  return `${doChiPhi.calls} call model · ~${Math.round(inTok / 1000)}k token vào + ~${Math.round(outTok / 1000)}k token ra${uoc}`;
}

const MODEL_MAC_DINH = process.env.CHECKER_MODEL ?? 'claude-sonnet-5';

// Dev local: đi qua Claude Code CLI (đăng nhập sẵn), prompt truyền qua stdin để né giới hạn arg Windows.
export class ClaudeCliProvider implements ModelProvider {
  ten = `claude-cli/${MODEL_MAC_DINH}`;

  async complete(prompt: string): Promise<string> {
    doChiPhi.calls += 1;
    doChiPhi.kyTuVao += prompt.length;
    try {
      return await this.goiMotLan(prompt);
    } catch (e) {
      // transient (mạng/CLI) — thử lại đúng một lần, thông báo thân thiện cho người xem run
      console.error(`   Lượt gọi model gặp trục trặc (${(e as Error).message.slice(0, 60)}) — hệ thống tự thử lại, lần 2/2…`);
      return this.goiMotLan(prompt);
    }
  }

  private goiMotLan(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // --tools "": tắt toàn bộ tool — call là pure completion, model không tự đi đọc file
      // cwd = temp: kể cả có tool cũng không có gì để đọc; --no-session-persistence: không tích session rác
      const child = spawn('claude', ['-p', '--model', MODEL_MAC_DINH, '--tools', '""', '--no-session-persistence'], {
        shell: true,
        cwd: tmpdir(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDECODE: '' },
      });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        // Windows + shell:true: kill() chỉ giết cmd vỏ — phải giết cả cây kẻo claude mồ côi
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
        } else {
          child.kill('SIGKILL');
        }
        reject(new Error('model không phản hồi sau 300 giây'));
      }, 300_000);
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0 && !out.trim()) return reject(new Error(`claude CLI exit ${code}: ${err.slice(0, 500)}`));
        resolve(out.trim());
      });
      child.stdin.write(prompt);
      child.stdin.end();
    });
  }
}

// Deploy: gọi thẳng Anthropic API (cần ANTHROPIC_API_KEY).
export class AnthropicApiProvider implements ModelProvider {
  ten = `anthropic-api/${MODEL_MAC_DINH}`;

  async complete(prompt: string): Promise<string> {
    doChiPhi.calls += 1;
    doChiPhi.kyTuVao += prompt.length;
    // L2: 429/529/5xx là lỗi thoáng qua — retry 2 lần với backoff, đừng chết run giữa sân khấu
    let res!: Response;
    for (let lan = 0; lan < 3; lan++) {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_MAC_DINH,
          max_tokens: 8000,
          temperature: 0, // C10: verdict phải tái lập được trên cùng commit
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok || ![429, 500, 502, 503, 529].includes(res.status) || lan === 2) break;
      await new Promise((r) => setTimeout(r, (lan + 1) * 4000));
    }
    if (!res.ok) {
      const chiTiet = (await res.text()).slice(0, 300);
      if (res.status === 401 || res.status === 403) {
        throw new LoiCauHinhProvider(
          `Anthropic API từ chối xác thực (HTTP ${res.status}) — ANTHROPIC_API_KEY sai hoặc hết hạn. ` +
            'Vào ⚙ Cài đặt → mục Agent review kiểm tra provider, hoặc đặt lại ANTHROPIC_API_KEY. ' +
            `Chi tiết: ${chiTiet}`,
        );
      }
      throw new Error(`Anthropic API ${res.status}: ${chiTiet}`);
    }
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }>; usage?: { input_tokens: number; output_tokens: number } };
    if (data.usage) { doChiPhi.tokenVao += data.usage.input_tokens; doChiPhi.tokenRa += data.usage.output_tokens; }
    const ra = data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    doChiPhi.kyTuRa += ra.length;
    return ra;
  }
}

// Lỗi cấu hình provider — phân biệt hẳn với lỗi nghiệp vụ để UI hướng người dùng vào ⚙ Cài đặt
export class LoiCauHinhProvider extends Error {
  readonly loai = 'cau_hinh_provider' as const;
}

// Kiểm cấu hình TRƯỚC khi tốn thời gian dựng sandbox — sai thì báo ngay, kèm cách sửa
export function kiemTraProvider(): void {
  const ep = process.env.CHECKER_PROVIDER;
  const model = MODEL_MAC_DINH;
  if (ep === 'api' || (!ep && process.env.ANTHROPIC_API_KEY)) {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      throw new LoiCauHinhProvider(
        'Cấu hình provider không hợp lệ: đang chọn "Anthropic API" nhưng KHÔNG có ANTHROPIC_API_KEY trong môi trường. ' +
          'Vào ⚙ Cài đặt → mục Agent review: đổi provider sang "Claude Code CLI", hoặc đặt biến môi trường ANTHROPIC_API_KEY rồi khởi động lại CheckMate.',
      );
    }
    return;
  }
  // provider = cli: phải có lệnh claude trên máy
  const thu = spawnSync('claude', ['--version'], { shell: true, encoding: 'utf8', timeout: 30_000 });
  if (thu.status !== 0) {
    throw new LoiCauHinhProvider(
      'Cấu hình provider không hợp lệ: đang chọn "Claude Code CLI" nhưng không chạy được lệnh `claude` trên máy này' +
        (thu.error ? ` (${thu.error.message})` : '') +
        '. Vào ⚙ Cài đặt → mục Agent review: đổi provider sang "Anthropic API" (cần ANTHROPIC_API_KEY), hoặc cài/đăng nhập Claude Code trên máy chạy CheckMate.',
    );
  }
  if (!model.trim()) {
    throw new LoiCauHinhProvider('Cấu hình provider không hợp lệ: chưa chọn model. Vào ⚙ Cài đặt → mục Agent review để chọn model.');
  }
}

export function chonProvider(): ModelProvider {
  const ep = process.env.CHECKER_PROVIDER;
  if (ep === 'api') return new AnthropicApiProvider();
  if (ep === 'cli') return new ClaudeCliProvider();
  return process.env.ANTHROPIC_API_KEY ? new AnthropicApiProvider() : new ClaudeCliProvider();
}
