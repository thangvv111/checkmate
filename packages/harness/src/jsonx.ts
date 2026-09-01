import type { ModelProvider } from './model.js';
import { makeFence } from './fence.js';

/**
 * Gọi model lấy JSON — parse fail thì nhắc lại đúng một lần, VÀ đưa cho model chính chỗ nó viết hỏng.
 * Nhắc chung chung ("trả JSON đúng schema") không sửa được một dấu phẩy thiếu ở ký tự thứ 2914 —
 * model không thấy được lỗi của mình thì lượt hai hỏng y hệt lượt một (đo được ở repo này).
 */
export async function callJson<T>(model: ModelProvider, prompt: string): Promise<T> {
  const lan1 = await model.complete(prompt);
  try {
    return unwrapJson<T>(lan1);
  } catch (e) {
    // Thông điệp lỗi mang TRÍCH ĐOẠN trả lời của model, mà trả lời đó dẫn xuất từ diff PR — tức từ
    // nội dung do maker viết và KHÔNG đáng tin. Nhét thẳng vào prompt là mở lại đúng đường tiêm chỉ
    // thị mà rào nonce sinh ra để chặn: kẻ viết diff chỉ cần làm vỡ JSON theo ý mình là câu chữ của
    // họ được chép nguyên vào lượt gọi sau, ở vị trí trông như lời của hệ thống.
    const rao = makeFence();
    const lan2 = await model.complete(
      `${prompt}

NHẮC LẠI: bạn KHÔNG có tool hay quyền đọc file nào — làm việc CHỈ với dữ liệu trong prompt. Trả lời CHỈ MỘT khối JSON đúng schema đã yêu cầu, không giải thích.

LƯỢT TRƯỚC CỦA BẠN HỎNG — SỬA ĐÚNG CHỖ NÀY:
${rao('LOI_PARSE', (e as Error).message.slice(0, 900))}

Chú ý những chỗ hay làm vỡ JSON: dấu nháy hoặc dấu chéo ngược chưa escape trong giá trị chuỗi, dấu phẩy thừa trước dấu ngoặc đóng, xuống dòng thật nằm giữa một chuỗi. Giá trị chuỗi nên viết gọn, tránh ký tự đặc biệt.`,
    );
    return unwrapJson<T>(lan2);
  }
}

// Bóc JSON khỏi trả lời model (chấp nhận có hoặc không có code fence).
export function unwrapJson<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const ung = fence ? fence[1] : raw;
  const dau = ung.indexOf('{');
  const cuoi = ung.lastIndexOf('}');
  if (dau === -1 || cuoi === -1) throw new Error(`Không tìm thấy JSON trong trả lời model: ${raw.slice(0, 200)}`);
  const than = ung.slice(dau, cuoi + 1);
  try {
    return JSON.parse(than) as T;
  } catch (e) {
    // JSON.parse ném "Expected ',' at position 2914" và không nói gì thêm — người đọc log lẫn lượt
    // sinh lại đều mù. Kèm ĐOẠN VĂN quanh vị trí hỏng thì cả hai mới sửa được đúng chỗ.
    const viTri = Number(/position (\d+)/.exec((e as Error).message)?.[1] ?? -1);
    const quanh =
      viTri >= 0
        ? `\n…${than.slice(Math.max(0, viTri - 140), viTri)}⟪HỎNG Ở ĐÂY⟫${than.slice(viTri, viTri + 140)}…`
        : `\nĐầu khối JSON: ${than.slice(0, 240)}…`;
    throw new Error(`JSON của model không parse được (${(e as Error).message}).${quanh}`);
  }
}

// Bóc code khỏi trả lời model — nhận MỌI language tag (```ts, ```python, ```java...),
// tag phải bị BỎ, tuyệt đối không được lọt vào dòng đầu file code.
export function unwrapCode(raw: string): string {
  const fence = raw.match(/```[a-zA-Z0-9_+-]*[ \t]*\r?\n([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  // không fence: coi toàn bộ là code nếu có dấu hiệu mã nguồn
  if (/^\s*(import|from|def |package |public )/m.test(raw)) return raw.trim();
  // Model phát ra LỜI GỌI TOOL thay vì code — báo đúng bản chất để chỗ gọi biết đường nhắc lại
  if (/<invoke|<function_calls|<invoke/i.test(raw)) {
    throw new ModelUsedToolError(`Model trả về lời gọi tool thay vì code: ${raw.slice(0, 160)}`);
  }
  throw new Error(`Không tìm thấy code trong trả lời model: ${raw.slice(0, 200)}`);
}

export class ModelUsedToolError extends Error {}

// Lấy code từ model, nhắc lại MỘT lần nếu model đi dùng tool hoặc quên fence.
export async function callCode(model: ModelProvider, prompt: string): Promise<string> {
  const lan1 = await model.complete(prompt);
  try {
    return unwrapCode(lan1);
  } catch (e) {
    const nhac =
      e instanceof ModelUsedToolError
        ? 'LẦN TRƯỚC BẠN PHÁT RA LỜI GỌI TOOL. Bạn KHÔNG có tool nào, KHÔNG đọc được file, KHÔNG chạy được lệnh.'
        : 'LẦN TRƯỚC BẠN KHÔNG TRẢ VỀ KHỐI CODE NÀO.';
    return unwrapCode(
      await model.complete(
        `${prompt}\n\n${nhac} Làm việc CHỈ với dữ liệu trong prompt này. Trả lời DUY NHẤT một khối code trong một fence, không giải thích, không lời gọi tool.`,
      ),
    );
  }
}
