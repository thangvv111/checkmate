import { createHash } from 'node:crypto';

/**
 * Rào chống dò mật khẩu ở `/login` (capability `login-throttle`).
 *
 * ## Vì sao rào này tồn tại, và vì sao nó không chỉ là «chống đoán mật khẩu»
 *
 * Băm mật khẩu ở đây là scrypt N=16384 — **chậm có chủ đích**, để mỗi lần đoán tốn CPU của người đoán.
 * Nhưng người đoán chỉ gửi request, còn CPU tiêu là của MÁY CHỦ. Nên một vòng lặp gõ `/login` vừa là
 * tấn công đoán mật khẩu vừa là **đòn DoS rẻ** — trên một Lightsail dùng chung máy với tingpos.vn.
 *
 * Hệ quả: gác phải đứng **TRƯỚC** phép băm. Đặt sau thì nó chặn được đoán mật khẩu mà không chặn được
 * chi phí, tức mất đúng nửa lý do nó tồn tại — và nhìn từ ngoài hai cách viết y hệt nhau. Đó là lý do
 * ca khoá quan trọng nhất của capability này đếm **số lần `verifyPassword` được gọi**, không phải kiểm
 * «có bị chặn không».
 *
 * ## File này KHÔNG có side effect
 *
 * Không `Date.now()`, không biến module toàn cục, không đụng `express`. Trạng thái truyền vào, đồng hồ
 * truyền vào. Cùng khuôn `session-gate.ts` / `probe-gate.ts`, và vì cùng một lý do đo được: một ca test
 * muốn kiểm «sai lần thứ tư thì chờ 2 giây» mà phải dựng cả máy chủ thì nó chạm trần 5 giây rồi đỏ.
 */

// ---------- Tham số vận hành ----------

/**
 * Đây là **quyết định vận hành**, không phải hằng số vật lý — để cạnh nhau để đổi được mà không phải
 * lần theo code. Lý do từng trị ghi ở `design.md` D6.
 */
export const IP_FAIL_CAP = 10;
export const IP_WINDOW_MS = 15 * 60_000;
export const IP_BLOCK_MS = 15 * 60_000;
export const ACCOUNT_FREE_TRIES = 2;
export const ACCOUNT_BACKOFF_BASE_MS = 1_000;
export const ACCOUNT_BACKOFF_CAP_MS = 60_000;
export const THROTTLE_MAX_ENTRIES = 4096;
export const LOG_MIN_INTERVAL_MS = 60_000;

/** Khoá dùng khi không xác định được nguồn nào cả. Cùng chung một xô còn hơn không đếm (⛔C2). */
export const FALLBACK_CLIENT_KEY = 'khong-ro-nguon';

// ---------- Hình dạng ----------

export interface ThrottleEntry {
  soLanSai: number;
  /** Mốc đồng hồ ĐƠN ĐIỆU (không phải wall clock) mà trước đó còn bị phạt. */
  phatToiLuc: number;
  lanCuoi: number;
}

export interface ThrottleState {
  theoIp: Map<string, ThrottleEntry>;
  theoTaiKhoan: Map<string, ThrottleEntry>;
  /** Mốc lần GHI LOG gần nhất, và số lượt đã dồn kể từ đó. */
  logLanCuoi: number;
  logDonLai: number;
  /** Mốc lượt BỊ CHẶN gần nhất — dùng để biết một đợt đã kết thúc chưa (khác `logLanCuoi`). */
  logChanCuoi: number;
  /** Tổng số lượt bị chặn trong ĐỢT hiện tại — con số mốc luỹ tiến đếm theo. */
  logTongDot: number;
}

export type LoginThrottleDecision =
  | { choQua: true }
  | { choQua: false; choGiay: number };

export function newThrottleState(): ThrottleState {
  return {
    theoIp: new Map(),
    theoTaiKhoan: new Map(),
    logLanCuoi: -Infinity,
    logDonLai: 0,
    logChanCuoi: -Infinity,
    logTongDot: 0,
  };
}

// ---------- Danh tính client ----------

/**
 * ⛔ Đọc `X-Real-IP`, **KHÔNG** đọc `X-Forwarded-For`. Khác biệt này quyết định rào có tồn tại hay không.
 *
 * nginx của prod đặt hai header khác nhau về BẢN CHẤT:
 *
 *     proxy_set_header X-Real-IP       $remote_addr;              <- GHI ĐÈ: client không chèn được
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; <- NỐI THÊM vào giá trị client gửi
 *
 * `$proxy_add_x_forwarded_for` = `$http_x_forwarded_for, $remote_addr`, nên **phần tử đầu của XFF là do
 * client viết**. Đọc phần tử đầu (cách viết phổ biến nhất) thì kẻ tấn công chỉ cần đổi header mỗi request
 * là mỗi request thành một IP mới ⇒ rào biến mất hoàn toàn, **trong khi mọi ca test đơn vị vẫn xanh và log
 * vẫn trông như đang chặn**. Đúng loại hỏng nguy hiểm nhất: xanh trên hệ đã hỏng.
 *
 * Tiền đề khiến `X-Real-IP` tin được: ứng dụng nghe trên `127.0.0.1` (xem `app.listen` ở `server.ts`), nên
 * proxy là đường vào duy nhất. Đổi địa chỉ nghe thành công khai là header này thành client-tự-khai và rào
 * mất hiệu lực **không triệu chứng** — nên có ca khoá địa chỉ nghe.
 */
export function clientKey(headers: unknown, socketAddr?: unknown): string {
  const h = (headers ?? {}) as Record<string, unknown>;
  const tho = h['x-real-ip'];
  const ip = Array.isArray(tho) ? tho[0] : tho;
  if (typeof ip === 'string' && ip.trim()) return ip.trim();
  if (typeof socketAddr === 'string' && socketAddr.trim()) return socketAddr.trim();
  return FALLBACK_CLIENT_KEY;
}

/**
 * Che tên tài khoản trước khi ghi sổ (⛔C3).
 *
 * Tên đăng nhập trông như dữ liệu vô hại, nên dễ bị ghi nguyên văn. Nhưng **ô tên là chỗ người ta gõ nhầm
 * mật khẩu vào** — chuyện xảy ra thật, không phải giả thuyết. Ghi tên thử nguyên văn là ghi mật khẩu của
 * chính người vận hành vào một file log không có vòng đời.
 *
 * Bản che PHẢI phân biệt được hai giá trị khác nhau (⛔C3). Che thành một hằng (`***`) hỏng theo hướng ít
 * ai nghĩ tới: người vận hành mất khả năng phân biệt «một tên bị dò mười nghìn lần» (dò mật khẩu một tài
 * khoản) với «mười nghìn tên khác nhau bị thử một lần» (quét danh sách tên) — hai trận tấn công khác nhau,
 * hai phản ứng khác nhau.
 */
export function maskAccountKey(ten: unknown): string {
  const s = typeof ten === 'string' ? ten : '';
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

// ---------- Quyết định ----------

function readEntry(bang: Map<string, ThrottleEntry>, khoa: string): ThrottleEntry | undefined {
  const m = bang.get(khoa);
  if (!m || typeof m.phatToiLuc !== 'number' || Number.isNaN(m.phatToiLuc)) return undefined;
  return m;
}

/**
 * Hai gác tính RIÊNG, và request bị từ chối khi BẤT KỲ gác nào từ chối.
 *
 * Vì sao hai chứ không một: đếm-theo-IP một mình bị nguồn phân tán đi vòng; còn chặn-theo-tài-khoản một
 * mình là **cửa DoS ngược** — kẻ tấn công gõ sai vài lần là khoá được người vận hành ra khỏi chính hệ của
 * họ. Nên gác tài khoản là **lùi dần** chứ không **khoá cứng**: nó chặn được dò tự động (thứ cần hàng
 * nghìn lần thử mỗi giây) mà vẫn để người thật vào được sau vài giây, tức thiệt hại của việc bị nhắm có
 * trần.
 *
 * `now` là mốc đồng hồ ĐƠN ĐIỆU. Wall clock nhảy tiến (NTP chỉnh giờ) sẽ làm án phạt **hết sớm** — tức
 * fail-open, đúng thứ ⛔C2 cấm.
 */
export function evaluateLoginAttempt(input: {
  ipKey: string;
  accountKey: string;
  state: ThrottleState;
  now: number;
}): LoginThrottleDecision {
  const st = input?.state;
  // `state` hỏng ⇒ code đã hỏng. Chọn CHO QUA chứ không chặn hết: chặn hết biến một bug thành mất hẳn
  // đường đăng nhập, kể cả của người vận hành, kể cả khi không có ai tấn công. Đây là LỰA CHỌN có ghi ở
  // security.md S7.1, không phải sót.
  if (!st || !(st.theoIp instanceof Map) || !(st.theoTaiKhoan instanceof Map)) return { choQua: true };

  const now = typeof input.now === 'number' && !Number.isNaN(input.now) ? input.now : 0;
  let conLai = 0;
  for (const [bang, khoa] of [
    [st.theoIp, input.ipKey],
    [st.theoTaiKhoan, input.accountKey],
  ] as const) {
    const m = readEntry(bang, khoa);
    if (m) conLai = Math.max(conLai, m.phatToiLuc - now);
  }
  if (conLai <= 0) return { choQua: true };
  return { choQua: false, choGiay: Math.max(1, Math.ceil(conLai / 1000)) };
}

/** Thời gian phạt của gác tài khoản: hai lần đầu miễn, rồi 1s · 2s · 4s… tới trần. */
export function accountPenaltyMs(soLanSai: number): number {
  const qua = soLanSai - ACCOUNT_FREE_TRIES;
  if (qua <= 0) return 0;
  const mu = ACCOUNT_BACKOFF_BASE_MS * 2 ** (qua - 1);
  return Math.min(mu, ACCOUNT_BACKOFF_CAP_MS);
}

/**
 * Ghi nhận một lần đăng nhập SAI vào cả hai xô.
 *
 * Tên tài khoản **không tồn tại** được đếm y như tên có thật. Bỏ qua chúng thì hành vi chặn tự tố cáo tài
 * khoản nào có thật — đúng cửa dò mà R11.10 đã đóng ở tầng thông điệp. Mà đếm mọi tên nghĩa là kẻ tấn công
 * gửi tên ngẫu nhiên là làm bảng phình vô hạn ⇒ bảng phải có trần (xem `evictWhenFull`).
 */
export function recordFailure(input: {
  ipKey: string;
  accountKey: string;
  state: ThrottleState;
  now: number;
}): void {
  const st = input?.state;
  if (!st || !(st.theoIp instanceof Map) || !(st.theoTaiKhoan instanceof Map)) return;
  const now = typeof input.now === 'number' && !Number.isNaN(input.now) ? input.now : 0;

  const ip = st.theoIp.get(input.ipKey) ?? { soLanSai: 0, phatToiLuc: 0, lanCuoi: now };
  // Cửa sổ trượt: lần sai cách đây quá `IP_WINDOW_MS` không cộng dồn nữa.
  ip.soLanSai = now - ip.lanCuoi > IP_WINDOW_MS ? 1 : ip.soLanSai + 1;
  ip.lanCuoi = now;
  if (ip.soLanSai > IP_FAIL_CAP) ip.phatToiLuc = now + IP_BLOCK_MS;
  st.theoIp.set(input.ipKey, ip);

  const tk = st.theoTaiKhoan.get(input.accountKey) ?? { soLanSai: 0, phatToiLuc: 0, lanCuoi: now };
  tk.soLanSai += 1;
  tk.lanCuoi = now;
  tk.phatToiLuc = now + accountPenaltyMs(tk.soLanSai);
  st.theoTaiKhoan.set(input.accountKey, tk);

  evictWhenFull(st.theoIp, now);
  evictWhenFull(st.theoTaiKhoan, now);
}

/** Đăng nhập ĐÚNG xoá chuỗi phạt của tên đó. KHÔNG xoá xô IP — xem chú thích trong thân hàm. */
export function clearAccount(state: ThrottleState, accountKey: string): void {
  if (!state || !(state.theoTaiKhoan instanceof Map)) return;
  // Chỉ xoá xô tài khoản. Một người vừa vào được không phải lý do để xoá án của cả một IP đang bị dò:
  // kẻ tấn công có một tài khoản hợp lệ sẽ dùng đúng đường đó để reset xô IP sau mỗi loạt thử.
  state.theoTaiKhoan.delete(accountKey);
}

/**
 * Giữ bảng dưới trần.
 *
 * ⛔ Thứ tự loại bỏ **không được** là LRU thuần. Kẻ tấn công bơm tên rác để đẩy mục phạt của chính mình ra
 * khỏi bảng là **tự xoá án**. Nên: (1) bỏ mục đã hết hạn phạt trước, (2) rồi tới mục có chuỗi sai THẤP
 * NHẤT — mục bị phạt nặng là mục đắt nhất để mất, nên nó ra sau cùng.
 */
export function evictWhenFull(bang: Map<string, ThrottleEntry>, now: number): void {
  if (!(bang instanceof Map) || bang.size <= THROTTLE_MAX_ENTRIES) return;
  for (const [k, v] of bang) {
    if (bang.size <= THROTTLE_MAX_ENTRIES) return;
    if (v.phatToiLuc <= now) bang.delete(k);
  }
  if (bang.size <= THROTTLE_MAX_ENTRIES) return;
  const theoDo = [...bang.entries()].sort((a, b) => a[1].soLanSai - b[1].soLanSai);
  for (const [k] of theoDo) {
    if (bang.size <= THROTTLE_MAX_ENTRIES) return;
    bang.delete(k);
  }
}

export type LoginOutcome<T> =
  | { ket: 'bi_chan'; choGiay: number }
  | { ket: 'sai' }
  | { ket: 'dung'; danhTinh: T };

/**
 * Cả lượt đăng nhập, gồm **THỨ TỰ** — và thứ tự chính là thứ hàm này tồn tại để khoá.
 *
 * Phép kiểm mật khẩu đi vào qua tham số `verify` chứ không được gọi thẳng, để một ca test đếm được **số
 * lần nó được gọi**. Đó là phép đo duy nhất phân biệt hai cách viết trông y hệt nhau từ ngoài:
 *
 *   - gác TRƯỚC băm → request tấn công tốn một phép tra bảng bộ nhớ
 *   - gác SAU băm   → request tấn công vẫn tốn một lượt scrypt N=16384 của MÁY CHỦ
 *
 * Cả hai đều trả «bị chặn», cả hai đều chống được đoán mật khẩu, và chỉ cách thứ nhất chống được DoS.
 *
 * Vì sao không để thứ tự nằm trong handler rồi quét mã nguồn: án lệ `probe-quarantine` — một ca quét
 * source kiểu `toMatch(/xacNhan !== g\.repo/)` vẫn khớp với `if (false && xacNhan !== g.repo)`, tức lưới
 * xanh trên gác đã bị vô hiệu. Thứ tự đo được bằng hành vi thì không lừa được như thế.
 */
export function runLoginAttempt<T>(input: {
  ipKey: string;
  accountKey: string;
  state: ThrottleState;
  now: number;
  verify: () => T | null;
}): LoginOutcome<T> {
  const { ipKey, accountKey, state, now } = input;
  const rao = evaluateLoginAttempt({ ipKey, accountKey, state, now });
  if (!rao.choQua) return { ket: 'bi_chan', choGiay: rao.choGiay };

  const danhTinh = input.verify();
  if (!danhTinh) {
    recordFailure({ ipKey, accountKey, state, now });
    return { ket: 'sai' };
  }
  clearAccount(state, accountKey);
  return { ket: 'dung', danhTinh };
}

/**
 * Có nên ghi một dòng log lần này không — trần tần suất của riêng việc ghi sổ.
 *
 * Ghi một dòng cho mỗi lần thử biến một trận dò thành một trận làm đầy đĩa: rào lại đẻ ra đường DoS thứ
 * hai. Nên phải có trần. Nhưng **trần thời gian một mình nói dối về độ lớn** — đo được trên prod 06/09
 * (§7 của change `login-gate-replaces-basic-auth`): **13 lượt bị chặn, log ghi «chặn 1 lượt»**. Bản đầu
 * báo số dồn ở lần phát KẾ TIẾP, nên một đợt ngắn hơn `LOG_MIN_INTERVAL_MS` kết thúc bằng đúng một dòng
 * nói «1». Đúng luật, sai sự thật: người vận hành ước lượng thấp đi một bậc độ lớn.
 *
 * Nên có **hai** điều kiện phát, và chúng bù cho nhau:
 *
 *   - **MỐC luỹ tiến** (lượt thứ 1, 10, 100, 1000…) — cho tín hiệu NGAY và cho ĐỘ LỚN.
 *   - **trần thời gian** — cho nhịp đều khi một đợt kéo dài không chạm mốc mới.
 *
 * Vẫn không mở lại đường làm đầy đĩa: mốc là luỹ thừa của 10, nên một đợt N lượt phát nhiều nhất
 * `log10(N)+1` dòng — một triệu lượt là bảy dòng.
 *
 * Trả về cả `donLai` (từ lần phát trước) lẫn `tongDot` (cả đợt), vì hai con số trả lời hai câu khác nhau:
 * «vừa rồi có gì mới» và «đợt này lớn cỡ nào».
 */
function laMoc(n: number): boolean {
  if (n < 1) return false;
  for (let m = 1; m <= n; m *= 10) if (m === n) return true;
  return false;
}

export function shouldLog(
  state: ThrottleState,
  now: number,
): { ghi: boolean; donLai: number; tongDot: number } {
  if (!state) return { ghi: false, donLai: 0, tongDot: 0 };
  const moc = typeof now === 'number' && !Number.isNaN(now) ? now : 0;

  // Đợt MỚI khi đã im lặng trọn một khoảng — mốc đếm theo ĐỢT, không đếm tích luỹ từ lúc khởi động, để
  // một đợt hôm nay không thừa hưởng con số của đợt hôm qua.
  if (moc - (state.logChanCuoi ?? -Infinity) >= LOG_MIN_INTERVAL_MS) {
    state.logTongDot = 0;
    state.logDonLai = 0;
  }
  state.logChanCuoi = moc;
  state.logTongDot = (state.logTongDot ?? 0) + 1;
  state.logDonLai = (state.logDonLai ?? 0) + 1;

  const quaHan = moc - (state.logLanCuoi ?? -Infinity) >= LOG_MIN_INTERVAL_MS;
  if (!laMoc(state.logTongDot) && !quaHan) return { ghi: false, donLai: 0, tongDot: 0 };

  const donLai = state.logDonLai;
  const tongDot = state.logTongDot;
  state.logLanCuoi = moc;
  state.logDonLai = 0;
  return { ghi: true, donLai, tongDot };
}
