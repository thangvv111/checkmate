import { Sandbox, type IsolationInfo, type ProbeResult, type VitestResult } from './sandbox.js';
import type { RunnerCfg } from './runner.js';

/**
 * Hợp đồng chạy probe của repo đích — capability `probe-environment` (mồi) và `target-contract`.
 *
 * File này giữ MỘT đường «ghi file probe → chạy → đọc kết quả» cho ba người gọi: đường chấm thật, cửa đột
 * biến, và mồi. Trước 17/09 hai người gọi đầu tự dựng sandbox riêng và đã lệch nhau một lần về tên file
 * probe (chú thích ở cửa đột biến, `skill-code.ts`). Mồi là người gọi thứ ba, và **mồi chỉ có giá trị khi nó
 * đi đúng đường probe thật sẽ đi** — đường riêng thì nó chứng minh một hợp đồng khác.
 */

export interface RunProbeFileInput {
  repo: string;
  sha: string;
  /** Nội dung file probe. */
  code: string;
  /** Tên file probe — CHÍNH tên đường thật dùng (`fileProbeMoi`), không tên riêng. */
  fileName: string;
  /** Thư mục ghi probe trong sandbox — `runner.probe_dir` hoặc mặc định `test`. */
  probeDir: string;
  runner: RunnerCfg | null;
  image?: string;
  parseJUnit: (xml: string, file: string) => ProbeResult[];
  /**
   * Thời hạn riêng (giây). Vắng ⇒ đường vitest dùng mặc định của nó, đường runner dùng `runner.timeout_s` —
   * đúng hành vi trước khi hàm này tồn tại. Chỉ mồi ở cửa thêm repo đặt giá trị này.
   */
  timeoutS?: number;
  /** Mức cô lập THỰC TẾ của sandbox vừa dựng — bên gọi ghi lại để đưa lên verdict. */
  onIsolation?: (info: IsolationInfo) => void;
}

/**
 * Ghi một file probe vào sandbox dựng từ `sha`, chạy qua đúng đường repo đích sẽ dùng (runner khai hay
 * vitest mặc định), trả kết quả. Sandbox được huỷ trong `finally`, kể cả khi bộ chạy ném.
 */
export function runProbeFile(input: RunProbeFileInput): VitestResult {
  const sb = new Sandbox(input.repo, input.sha, input.image);
  input.onIsolation?.(sb.coLap);
  try {
    const files = [sb.ghiProbe(input.code, input.fileName, input.probeDir)];
    if (input.runner) {
      const cfg = input.timeoutS !== undefined ? { ...input.runner, timeout_s: input.timeoutS } : input.runner;
      return sb.chayTheoRunner(files, cfg, input.parseJUnit);
    }
    return sb.chayVitest(files, input.timeoutS);
  } finally {
    sb.huy();
  }
}
