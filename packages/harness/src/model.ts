import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

export interface ModelProvider {
  ten: string;
  complete(prompt: string): Promise<string>;
}

const MODEL_MAC_DINH = process.env.CHECKER_MODEL ?? 'claude-sonnet-5';

// Dev local: đi qua Claude Code CLI (đăng nhập sẵn), prompt truyền qua stdin để né giới hạn arg Windows.
export class ClaudeCliProvider implements ModelProvider {
  ten = `claude-cli/${MODEL_MAC_DINH}`;

  async complete(prompt: string): Promise<string> {
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_MAC_DINH,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
  }
}

export function chonProvider(): ModelProvider {
  const ep = process.env.CHECKER_PROVIDER;
  if (ep === 'api') return new AnthropicApiProvider();
  if (ep === 'cli') return new ClaudeCliProvider();
  return process.env.ANTHROPIC_API_KEY ? new AnthropicApiProvider() : new ClaudeCliProvider();
}
