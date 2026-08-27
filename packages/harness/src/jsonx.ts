import type { ModelProvider } from './model.js';

// Gọi model lấy JSON — parse fail thì nhắc lại đúng một lần (model đôi khi trả văn thay vì JSON)
export async function goiJson<T>(model: ModelProvider, prompt: string): Promise<T> {
  const lan1 = await model.complete(prompt);
  try {
    return bocJson<T>(lan1);
  } catch {
    const lan2 = await model.complete(
      `${prompt}

NHẮC LẠI: bạn KHÔNG có tool hay quyền đọc file nào — làm việc CHỈ với dữ liệu trong prompt. Trả lời CHỈ MỘT khối JSON đúng schema đã yêu cầu, không giải thích.`,
    );
    return bocJson<T>(lan2);
  }
}

// Bóc JSON khỏi trả lời model (chấp nhận có hoặc không có code fence).
export function bocJson<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const ung = fence ? fence[1] : raw;
  const dau = ung.indexOf('{');
  const cuoi = ung.lastIndexOf('}');
  if (dau === -1 || cuoi === -1) throw new Error(`Không tìm thấy JSON trong trả lời model: ${raw.slice(0, 200)}`);
  return JSON.parse(ung.slice(dau, cuoi + 1)) as T;
}

// Bóc code khỏi trả lời model — nhận MỌI language tag (```ts, ```python, ```java...),
// tag phải bị BỎ, tuyệt đối không được lọt vào dòng đầu file code.
export function bocCode(raw: string): string {
  const fence = raw.match(/```[a-zA-Z0-9_+-]*[ \t]*\r?\n([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  // không fence: coi toàn bộ là code nếu có dấu hiệu mã nguồn
  if (/^\s*(import|from|def |package |public )/m.test(raw)) return raw.trim();
  // Model phát ra LỜI GỌI TOOL thay vì code — báo đúng bản chất để chỗ gọi biết đường nhắc lại
  if (/<invoke|<function_calls|<invoke/i.test(raw)) {
    throw new LoiModelDungTool(`Model trả về lời gọi tool thay vì code: ${raw.slice(0, 160)}`);
  }
  throw new Error(`Không tìm thấy code trong trả lời model: ${raw.slice(0, 200)}`);
}

export class LoiModelDungTool extends Error {}

// Lấy code từ model, nhắc lại MỘT lần nếu model đi dùng tool hoặc quên fence.
export async function goiCode(model: ModelProvider, prompt: string): Promise<string> {
  const lan1 = await model.complete(prompt);
  try {
    return bocCode(lan1);
  } catch (e) {
    const nhac =
      e instanceof LoiModelDungTool
        ? 'LẦN TRƯỚC BẠN PHÁT RA LỜI GỌI TOOL. Bạn KHÔNG có tool nào, KHÔNG đọc được file, KHÔNG chạy được lệnh.'
        : 'LẦN TRƯỚC BẠN KHÔNG TRẢ VỀ KHỐI CODE NÀO.';
    return bocCode(
      await model.complete(
        `${prompt}\n\n${nhac} Làm việc CHỈ với dữ liệu trong prompt này. Trả lời DUY NHẤT một khối code trong một fence, không giải thích, không lời gọi tool.`,
      ),
    );
  }
}
