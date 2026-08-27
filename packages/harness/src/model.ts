import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

export interface ModelProvider {
  ten: string;
  complete(prompt: string): Promise<string>;
}

// L3: đo chi phí mỗi lượt chấm — CLI không trả usage nên ước theo ký tự (~3.5 ký tự/token với text Việt+code);
// API dùng usage thật khi có. Đủ để trả lời "mỗi PR tốn bao nhiêu?" bằng số.
export const doChiPhi = { calls: 0, kyTuVao: 0, kyTuRa: 0, tokenVao: 0, tokenRa: 0 };
export function soLieuChiPhi(): { calls: number; token_vao: number; token_ra: number; uoc_tinh: boolean } {
  const that = doChiPhi.tokenVao > 0 || doChiPhi.tokenRa > 0;
  return {
    calls: doChiPhi.calls,
    token_vao: that ? doChiPhi.tokenVao : Math.round(doChiPhi.kyTuVao / 3.5),
    token_ra: that ? doChiPhi.tokenRa : Math.round(doChiPhi.kyTuRa / 3.5),
    uoc_tinh: !that,
  };
}

export function tomTatChiPhi(): string {
  const inTok = doChiPhi.tokenVao || Math.round(doChiPhi.kyTuVao / 3.5);
  const outTok = doChiPhi.tokenRa || Math.round(doChiPhi.kyTuRa / 3.5);
  const uoc = doChiPhi.tokenVao ? '' : ' (ước từ ký tự)';
  return `${doChiPhi.calls} call model · ~${Math.round(inTok / 1000)}k token vào + ~${Math.round(outTok / 1000)}k token ra${uoc}`;
}

const MODEL_MAC_DINH = process.env.CHECKER_MODEL ?? 'claude-sonnet-5';

// Checker phải làm việc CHỈ với dữ liệu trong prompt — không được đọc/ghi file hay chạy lệnh trên máy chủ.
// ⚠ `--tools ""` và `--allowed-tools ""` đều KHÔNG có tác dụng (cờ sai / chuỗi rỗng bị bỏ qua): CLI vẫn bật
// đủ tool, model đi chạy `ls` thật rồi trả về lời gọi tool thay vì code. Chỉ liệt kê tường minh mới chặn được.
// ⚠ Tên tool phải CÓ THẬT trong bản CLI đang cài: một tên lạ làm CLI bỏ chạy với
// «Permission deny rule "X" matches no known tool», tức cả đường gói thuê bao chết. `SlashCommand`
// từng nằm trong danh sách này và là thủ phạm — đã kiểm từng tên với CLI hiện tại trước khi bỏ nó ra.
const TOOL_CAM = 'Bash Read Write Edit Glob Grep WebFetch WebSearch Task NotebookEdit TodoWrite Agent Artifact KillShell BashOutput';

// Trần thời gian cho MỘT lời gọi model. Đừng nhầm với `truc.chu_ky_giay` (chu kỳ quét PR mới) — hai
// con số khác hẳn nhau. Một lượt chấm chạy vài chục phút là bình thường: prompt mang cả spec lẫn diff,
// model phải đọc hết rồi mới sinh probe. Trần ở đây chỉ để cứu khỏi treo vĩnh viễn, không phải để
// giục model. Đặt quá chặt thì giết oan lượt chạy đang tiến triển bình thường.
const TRAN_GOI_MS = Math.max(60_000, Number(process.env.CHECKER_TRAN_GOI_S ?? 1800) * 1000);

/** Lỗi do CẤU HÌNH của chính checker, không phải trục trặc thoáng qua — thử lại vô nghĩa. */
export class LoiCauHinhCli extends Error {}

// Dev local: đi qua Claude Code CLI (đăng nhập sẵn), prompt truyền qua stdin để né giới hạn arg Windows.
export class ClaudeCliProvider implements ModelProvider {
  ten = `claude-cli/${MODEL_MAC_DINH}`;

  async complete(prompt: string): Promise<string> {
    doChiPhi.calls += 1;
    doChiPhi.kyTuVao += prompt.length;
    try {
      return await this.goiMotLan(prompt);
    } catch (e) {
      // Lỗi CẤU HÌNH thì thử lại chỉ tốn thêm một lượt y hệt — ném thẳng để người vận hành đi sửa
      if (e instanceof LoiCauHinhCli) throw e;
      // transient (mạng/CLI) — thử lại đúng một lần, thông báo thân thiện cho người xem run
      console.error(`   Lượt gọi model gặp trục trặc (${(e as Error).message.slice(0, 60)}) — hệ thống tự thử lại, lần 2/2…`);
      return this.goiMotLan(prompt);
    }
  }

  private goiMotLan(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // --tools "": tắt toàn bộ tool — call là pure completion, model không tự đi đọc file
      // cwd = temp: kể cả có tool cũng không có gì để đọc; --no-session-persistence: không tích session rác
      // Provider 'cli' nghĩa là DÙNG GÓI THUÊ BAO. Nếu để ANTHROPIC_API_KEY trong môi trường,
      // Claude Code sẽ lặng lẽ dùng key đó và tính tiền API — người vận hành tưởng đang tiêu gói
      // thuê bao mà thực ra đang đốt credit. Cắt key khỏi env để hai nguồn không lẫn vào nhau.
      const envCli: NodeJS.ProcessEnv = { ...process.env, CLAUDECODE: '' };
      delete envCli.ANTHROPIC_API_KEY;
      const child = spawn('claude', ['-p', '--model', MODEL_MAC_DINH, '--disallowed-tools', `"${TOOL_CAM}"`, '--no-session-persistence'], {
        shell: true,
        cwd: tmpdir(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: envCli,
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
        const daNoi = err.trim() || out.trim();
        reject(
          new Error(
            `model không phản hồi sau ${Math.round(TRAN_GOI_MS / 60_000)} phút${daNoi ? ` — CLI có nói: ${daNoi.slice(0, 300)}` : ''}`,
          ),
        );
      }, TRAN_GOI_MS);
      // Có loại lời kêu mà chờ thêm cũng vô ích: cấu hình sai thì lần thử nào cũng sai như nhau.
      // CLI vẫn giữ ống mở sau khi kêu, nên không cắt sớm là ngồi chờ hết trần rồi mới biết.
      const chetNgay = (van: string): void => {
        const ten = van.match(/deny rule "([^"]+)" matches no known tool/i)?.[1];
        if (!ten) return;
        clearTimeout(timer);
        if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
        else child.kill('SIGKILL');
        reject(
          new LoiCauHinhCli(
            `Claude Code CLI không biết tool "${ten}" nên từ chối chạy. Danh sách tool bị cấm trong CHECKER ` +
              `(model.ts · TOOL_CAM) có tên không tồn tại ở bản CLI đang cài — bỏ tên đó ra, hoặc nâng cấp CLI.`,
          ),
        );
      };
      child.stdout.on('data', (d) => {
        out += d;
        chetNgay(String(d));
      });
      child.stderr.on('data', (d) => {
        err += d;
        chetNgay(String(d));
      });
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        if (/not logged in|please run \/login/i.test(out) || /not logged in|please run \/login/i.test(err)) {
          return reject(
            new Error(
              'Claude Code CLI chưa đăng nhập trên máy này nên không dùng được gói thuê bao. ' +
                'Chủ máy chạy `claude login` (hoặc `claude setup-token` rồi đặt CLAUDE_CODE_OAUTH_TOKEN) bằng ĐÚNG user chạy dịch vụ; ' +
                'hoặc chuyển Provider sang "Anthropic API" trong ⚙ Cài đặt nếu chấp nhận tính tiền theo API.',
            ),
          );
        }
        if (code !== 0 && !out.trim()) return reject(new Error(`claude CLI exit ${code}: ${err.slice(0, 500)}`));
        const ra = out.trim();
        doChiPhi.kyTuRa += ra.length; // CLI không trả usage — đếm ký tự để ước token ra
        resolve(ra);
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
          // C10 (tái lập verdict): KHÔNG gửi temperature — model đời mới từ chối tham số này
          // ("temperature is deprecated for this model"). Tính tái lập của CheckMate không dựa vào
          // temperature mà dựa vào lưới máy tất định (đường CLI vốn cũng không set temperature,
          // benchmark vẫn cho verdict trùng 18/18 lượt).
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
  const ncc = process.env.CHECKER_NCC;
  if (ncc && ncc !== 'anthropic') {
    const bien = ncc === 'github' ? 'GITHUB_MODELS_TOKEN' : ncc === 'google' ? 'GOOGLE_API_KEY' : 'OPENAI_API_KEY';
    if (!process.env.CHECKER_KHOA?.trim() && !process.env[bien]?.trim()) {
      throw new LoiCauHinhProvider(`Cấu hình nhà cung cấp không hợp lệ: đang chọn ${ncc} nhưng chưa có khoá (${bien}). Vào ⚙ Cài đặt điền khoá cho nhà cung cấp này rồi kiểm lại.`);
    }
    return;
  }
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

// Nhà cung cấp dùng chuẩn chat/completions (GitHub Models, OpenAI) — cùng một hình dạng request/response,
// chỉ khác endpoint + tên biến khoá, nên gộp một lớp thay vì chép hai lần.
class ChatCompletionsProvider implements ModelProvider {
  ten: string;

  constructor(
    private readonly nhan: string,
    private readonly endpoint: string,
    private readonly khoa: string,
  ) {
    this.ten = `${nhan}/${MODEL_MAC_DINH}`;
  }

  async complete(prompt: string): Promise<string> {
    doChiPhi.calls += 1;
    doChiPhi.kyTuVao += prompt.length;
    if (!this.khoa) throw new LoiCauHinhProvider(`Chưa có khoá cho nhà cung cấp ${this.nhan} — điền trong ⚙ Cài đặt.`);
    let res!: Response;
    for (let lan = 0; lan < 3; lan++) {
      res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.khoa}`, 'content-type': 'application/json' },
        // 16000: model đời mới tiêu một phần token cho suy nghĩ nội bộ trước khi sinh chữ —
        // để 8000 như trước thì probe/finding dễ bị cắt cụt giữa chừng.
        body: JSON.stringify({ model: MODEL_MAC_DINH, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }),
      });
      if (res.ok || ![429, 500, 502, 503].includes(res.status) || lan === 2) break;
      await new Promise((r) => setTimeout(r, (lan + 1) * 4000));
    }
    if (!res.ok) {
      const chiTiet = (await res.text()).slice(0, 300);
      if (res.status === 401 || res.status === 403) {
        throw new LoiCauHinhProvider(`${this.nhan} từ chối xác thực (HTTP ${res.status}) — khoá sai, hết hạn hoặc thiếu quyền. Chi tiết: ${chiTiet}`);
      }
      throw new Error(`${this.nhan} ${res.status}: ${chiTiet}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    if (data.usage) {
      doChiPhi.tokenVao += data.usage.prompt_tokens;
      doChiPhi.tokenRa += data.usage.completion_tokens;
    }
    const ra = (data.choices?.[0]?.message?.content ?? '').trim();
    doChiPhi.kyTuRa += ra.length;
    return ra;
  }
}

export function chonProvider(): ModelProvider {
  // Nhà cung cấp mới (github/openai) đi đường chat/completions; anthropic giữ hai đường cũ.
  const ncc = process.env.CHECKER_NCC;
  // CHECKER_KHOA là khoá do web bơm xuống theo nhà cung cấp đang chọn; biến riêng chỉ là đường lùi
  // cho ai chạy harness thẳng bằng dòng lệnh.
  const khoaChung = process.env.CHECKER_KHOA?.trim();
  if (ncc === 'github') {
    return new ChatCompletionsProvider('github-models', 'https://models.github.ai/inference/chat/completions', khoaChung || (process.env.GITHUB_MODELS_TOKEN?.trim() ?? ''));
  }
  if (ncc === 'openai') {
    return new ChatCompletionsProvider('openai', 'https://api.openai.com/v1/chat/completions', khoaChung || (process.env.OPENAI_API_KEY?.trim() ?? ''));
  }
  if (ncc === 'google') {
    // Google có đường tương thích chuẩn chat/completions nên dùng chung lớp, không cần adapter riêng
    return new ChatCompletionsProvider('google-gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', khoaChung || (process.env.GOOGLE_API_KEY?.trim() ?? ''));
  }
  const ep = process.env.CHECKER_PROVIDER;
  if (ep === 'api') return new AnthropicApiProvider();
  if (ep === 'cli') return new ClaudeCliProvider();
  return process.env.ANTHROPIC_API_KEY ? new AnthropicApiProvider() : new ClaudeCliProvider();
}
