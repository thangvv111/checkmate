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

// Bóc JSON / code khỏi trả lời model (chấp nhận có hoặc không có code fence).

export function bocJson<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const ung = fence ? fence[1] : raw;
  const dau = ung.indexOf('{');
  const cuoi = ung.lastIndexOf('}');
  if (dau === -1 || cuoi === -1) throw new Error(`Không tìm thấy JSON trong trả lời model: ${raw.slice(0, 200)}`);
  return JSON.parse(ung.slice(dau, cuoi + 1)) as T;
}

export function bocCode(raw: string): string {
  const fence = raw.match(/```(?:ts|typescript)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  // không fence: coi toàn bộ là code nếu có import
  if (/^\s*import\s/m.test(raw)) return raw.trim();
  throw new Error(`Không tìm thấy code trong trả lời model: ${raw.slice(0, 200)}`);
}
