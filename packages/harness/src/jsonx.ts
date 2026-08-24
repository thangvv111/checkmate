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
