/**
 * Mồi hợp đồng runner ở CỬA THÊM REPO — capability `probe-environment`, change `runner-contract-selftest` (D9).
 *
 * Tầng app: quyết định thuần + DI, không import engine (ma trận `test/kien-truc-tang.test.ts`). Route
 * `/api/repo/them` (tầng delivery) nối dây: truyền `runCanary`, bộ tả kết cục và bộ che của engine vào đây,
 * nhận về danh sách cảnh báo để nối vào `canh_bao_moi_truong` sẵn có. Không route mới, không trường trả lời mới.
 *
 * Ba điều khác đường chấm, và vì sao (design D9):
 *   · kết cục chặn ⇒ CẢNH BÁO, đăng ký vẫn xong — đăng ký không phải verdict (cùng luật với cửa môi trường);
 *   · thời hạn riêng `min(runner.timeout_s, trần cửa)` — đây là một yêu cầu HTTP, không phải bộ test;
 *   · hết giờ ⇒ «chưa kết luận», KHÔNG tên bệnh — một bộ test Java hợp lệ có thể cần hơn thế.
 *
 * ⛔ Một mồi cửa-thêm-repo một lúc (single-flight): mồi ở cửa này KHÔNG nằm dưới trần lượt chạy đồng thời
 * của `runs.ts`, nên không có gì khác chặn N yêu cầu thêm repo dựng N container.
 */

/** Hình dạng tối thiểu của báo cáo mồi mà tầng app cần — bản đầy đủ là `CanaryReport` ở engine. */
export interface CanaryReportLike {
  outcome: string;
  timedOut: boolean;
  seconds: number;
  probePath: string;
  note?: string;
  runnerOutput?: { stdout: string; stderr: string };
}

export interface AddTimeCanaryInput {
  repo: string;
  sha: string;
  /** Đã tính ở engine (`probeFileNameFor` · `probeDirFor`) — tầng app không tự ghép tên probe. */
  fileName: string;
  probeDir: string;
  probeExt: string;
  hasTestCmd: boolean;
  /** `runner.timeout_s` nếu repo khai; vắng ⇒ dùng trần cửa. */
  runnerTimeoutS?: number;
}

export interface AddTimeCanaryDeps {
  /** `runCanary` của engine đã bọc sẵn runner/image/parseJUnit/matchId — tầng app chỉ đưa sha và thời hạn. */
  runCanary: (input: { repo: string; sha: string; fileName: string; probeDir: string; timeoutS: number }) => CanaryReportLike;
  /** `describeCanaryOutcome` của engine — chỉ nhận bốn kết cục chặn. */
  describeOutcome: (kind: string, ctx: { probePath: string; probeDir: string; probeExt: string; hasTestCmd: boolean }) => string;
  /** Bộ che ⛔C3 cho đầu ra bộ chạy repo đích trước khi nối vào cảnh báo. */
  redact: (text: string) => string;
  /** `CANARY_BLOCKING.has` của engine. */
  isBlocking: (outcome: string) => boolean;
  /** Trần thời hạn của cửa (giây) — `CANARY_TIMEOUT_AT_ADD_S`. */
  timeoutCapS: number;
  /** Log máy chủ — bỏ qua mồi LUÔN có một dòng ở đây, dù không có cảnh báo cho người vận hành. */
  log: (msg: string) => void;
}

export const ADD_TIME_CANARY_INCONCLUSIVE =
  'Mồi hợp đồng runner chưa kết luận: bộ chạy test của repo không kết thúc trong thời hạn của cửa thêm repo. ' +
  'Đây không phải bệnh — lượt chấm đầu tiên sẽ kiểm lại với thời hạn đầy đủ.';

export const ADD_TIME_CANARY_BUSY = 'Mồi hợp đồng runner đang chạy cho repo khác — lượt chấm đầu tiên sẽ kiểm.';

export const ADD_TIME_CANARY_FAILED = 'Mồi hợp đồng runner không chạy được ở cửa thêm repo — lượt chấm đầu tiên sẽ kiểm.';

export interface AddTimeCanary {
  /**
   * Chạy mồi cho một repo vừa thêm; trả về danh sách cảnh báo (rỗng = im lặng là tín hiệu tốt).
   * `blockedByEnvironment` = cửa môi trường đã có điều kiện mức chặn ⇒ mồi không chạy, không cảnh báo thêm.
   * Không ném: mọi lỗi của mồi thành một cảnh báo chung — đăng ký đã xong trước khi mồi chạy.
   */
  run(input: AddTimeCanaryInput, blockedByEnvironment: boolean): string[];
  /** Cho lưới và cho log: đang có mồi chạy không. */
  busy(): boolean;
}

export function newAddTimeCanary(deps: AddTimeCanaryDeps): AddTimeCanary {
  let dangChay = false;
  return {
    busy: () => dangChay,
    run(input, blockedByEnvironment) {
      // Cửa môi trường chặn thì mồi không chạy — mồi đứng sau cửa ấy, không thay nó.
      if (blockedByEnvironment) return [];
      if (dangChay) {
        deps.log(`Mồi hợp đồng runner (thêm repo): bỏ qua ${input.repo} — đang chạy cho repo khác`);
        return [ADD_TIME_CANARY_BUSY];
      }
      dangChay = true;
      try {
        const timeoutS = Math.max(1, Math.min(input.runnerTimeoutS ?? deps.timeoutCapS, deps.timeoutCapS));
        const bao = deps.runCanary({ repo: input.repo, sha: input.sha, fileName: input.fileName, probeDir: input.probeDir, timeoutS });
        // Hết giờ đọc TRƯỚC kết cục: ở cửa này nó là «chưa kết luận», không phải bệnh.
        if (bao.timedOut) {
          deps.log(`Mồi hợp đồng runner (thêm repo): chưa kết luận sau ${bao.seconds}s — ${input.repo}`);
          return [ADD_TIME_CANARY_INCONCLUSIVE];
        }
        if (deps.isBlocking(bao.outcome)) {
          const loi = deps.describeOutcome(bao.outcome, { probePath: bao.probePath, probeDir: input.probeDir, probeExt: input.probeExt, hasTestCmd: input.hasTestCmd });
          // ⛔C3: đầu ra bộ chạy repo đích qua bộ che trước khi ra JSON trả lời.
          const dauRa = bao.runnerOutput ? deps.redact([bao.runnerOutput.stderr, bao.runnerOutput.stdout].filter(Boolean).join('\n').slice(0, 600)) : '';
          deps.log(`Mồi hợp đồng runner (thêm repo): ${bao.outcome} sau ${bao.seconds}s — ${input.repo}`);
          return [`Hợp đồng chạy probe chưa tự chứng minh được (${bao.outcome}): ${loi}${dauRa ? ` Bộ chạy nói: ${dauRa}` : ''}`];
        }
        if (bao.outcome === 'proven') {
          deps.log(`Mồi hợp đồng runner (thêm repo): đã chứng minh — ${bao.seconds}s — ${input.repo}`);
          return [];
        }
        // Bỏ qua: không làm phiền người vận hành (CheckMate chưa viết mồi cho khuôn này), nhưng LUÔN có log.
        deps.log(`Mồi hợp đồng runner (thêm repo): bỏ qua — ${bao.outcome}: ${bao.note ?? 'không rõ'} — ${input.repo}`);
        return [];
      } catch (e) {
        deps.log(`Mồi hợp đồng runner (thêm repo): hỏng — ${deps.redact((e as Error).message ?? String(e)).slice(0, 300)} — ${input.repo}`);
        return [ADD_TIME_CANARY_FAILED];
      } finally {
        dangChay = false;
      }
    },
  };
}
