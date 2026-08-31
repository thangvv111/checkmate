import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dinhNghia, docKhoa, modelHopLe, type CauHinhNcc, type MaNcc } from './ncc.js';
import { docKho, ghiKho, docTokenRieng, ghiTokenRepo } from './kho-bi-mat.js';

// Chế độ vận hành (spec §9): demo = deploy public, khoá repo demo, Settings chỉ-đọc (fail-closed);
// org = self-host trong tổ chức, mở toàn bộ cấu hình. Bật org bằng --org hoặc CHECKMATE_MODE=org.
export const MODE: 'demo' | 'org' =
  process.argv.includes('--org') || process.env.CHECKMATE_MODE === 'org' ? 'org' : 'demo';

export interface AgentConfig {
  /** Nhà cung cấp đang dùng để chấm — chỉ đặt được sau khi kiểm thành công */
  ncc: MaNcc;
  /** Cấu hình riêng của TỪNG nhà cung cấp, giữ lại khi đổi qua đổi lại */
  ncc_cau_hinh: Partial<Record<MaNcc, CauHinhNcc>>;
  max_probe: number;
  skeptic: boolean;
  /** @deprecated giữ để đọc được config đời cũ (provider cli|api + model phẳng) */
  provider?: 'cli' | 'api';
  /** @deprecated */
  model?: string;
}

export interface RepoConfig {
  github: string; // owner/repo
  base_branch: string;
  local_path: string; // clone local mà harness chạy trên đó
  /** Chế độ trực riêng từng repo — repo này tự chấm PR mới hay không */
  truc?: boolean;
  them_luc?: string;
}

export interface TrucConfig {
  bat: boolean; // chế độ trực: poller tự chấm PR mới — mặc định TẮT (không tự đốt model khi chưa ai bật)
  chu_ky_giay: number;
  /**
   * R6.15 — BA công tắc RIÊNG, không gộp, vì mức gây hại khác hẳn nhau. Gộp làm một nghĩa là ai muốn có
   * comment tự động cũng phải chấp nhận máy đóng pull request của mình.
   */
  /** Đăng verdict + finding lên PR. Gần như vô hại, và chạy cả với lượt bấm tay (R6.16) */
  tu_dong_comment: boolean;
  /** Gắn trạng thái commit success/failure — chặn nút merge trên GitHub, gỡ được */
  tu_dong_trang_thai: boolean;
  /** ĐÓNG pull request, trả về dev. Người viết phải mở lại — mặc định TẮT (R6.15, R6.17) */
  tu_dong_tra_ve: boolean;
}

export interface CheckmateConfig {
  /** Danh sách repo đã kết nối. Nguồn sự thật kể từ bản đa repo. */
  repos: RepoConfig[];
  /** owner/repo đang chọn — quyết định ngữ cảnh của Dashboard/Lịch sử */
  repo_dang_chon: string;
  /** View của repo đang chọn — giữ để code cũ (`cfg.repo`) chạy nguyên, không phải sửa rải rác */
  repo: RepoConfig;
  /**
   * @deprecated Token dùng chung cho mọi repo — đã thay bằng token theo TỪNG repo (R4.18).
   * Trường này chỉ còn sống để đọc cấu hình đời cũ và di trú (R4.21); code mới KHÔNG được đọc nó,
   * hãy gọi `docTokenRepo(github)`.
   */
  github_token: string;
  agent: AgentConfig;
  truc: TrucConfig;
}

/** Thư mục chứa các clone local do CheckMate tự quản */
export const GOC_REPO = process.env.CHECKMATE_REPO_DIR ?? join(resolve('.'), 'repos');

export function slugRepoGithub(github: string): string {
  return github.replace('/', '-').toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

export function timRepo(c: CheckmateConfig, github: string): RepoConfig | undefined {
  return c.repos.find((r) => r.github.toLowerCase() === github.toLowerCase());
}

const GOC = process.env.CHECKMATE_GOC ?? resolve('.');
const FILE = join(GOC, 'config.json');
// Secrets KHÔNG nằm chung config.json (kho riêng quyền 600 — xem kho-bi-mat.ts)

const REPO_DEMO: RepoConfig = {
  github: 'thangvv111/demo-credit-approval',
  base_branch: 'main',
  local_path: process.env.CHECKMATE_DEMO_REPO ?? resolve(GOC, '../demo-credit-approval'),
};

const MAC_DINH: CheckmateConfig = {
  repos: [REPO_DEMO],
  repo_dang_chon: REPO_DEMO.github,
  repo: REPO_DEMO,
  github_token: '',
  agent: {
    ncc: 'anthropic',
    ncc_cau_hinh: { anthropic: { phuong_thuc: 'thue_bao', model: 'claude-sonnet-5' } },
    max_probe: 6,
    skeptic: true,
  },
  truc: { bat: false, chu_ky_giay: 300, tu_dong_comment: true, tu_dong_trang_thai: true, tu_dong_tra_ve: false },
};

// Cấu hình và kho khoá CỐ Ý không vào cơ sở dữ liệu (specs/R9.13): sửa file bằng tay là đường cứu hộ
// khi cấu hình sai làm giao diện không lên, và bí mật nằm trong cơ sở dữ liệu thì mọi bản sao lưu đều
// mang theo khoá. File này đóng vai lớp kho cho phần đó.
// Cache theo thời điểm sửa file: đọc lại chỉ khi file thật sự đổi, nên sửa tay vẫn có hiệu lực ngay.
// Khoá cache theo mtime NANO giây, không phải mili giây. Với mili giây, hai lần ghi trong cùng một
// mili giây cho cùng một khoá — lần thứ hai bị cache che, và R9.14 («sửa file bằng tay phải có hiệu lực
// ở lượt đọc kế tiếp») không còn đúng. Hiếm khi xảy ra lúc người dùng bấm, nhưng chắc chắn xảy ra khi
// một script ghi liên tiếp — và một đường cứu hộ chỉ đúng «hầu hết thời gian» thì không phải đường cứu hộ.
let cache: { mtimeNs: bigint; token: string; c: CheckmateConfig } | null = null;

/**
 * Danh sách repo suy từ cấu hình đã lưu — R4.3: bản đời cũ chỉ có MỘT `repo` phải được nâng thành
 * danh sách một phần tử. Tách thành hàm riêng vì có hơn một chỗ cần trả lời câu hỏi này, và hai chỗ
 * trả lời khác nhau là cách sinh ra lỗi im lặng: di trú từng đọc thẳng `luu.repos` nên với cấu hình
 * đời cũ nó không thấy repo nào, không di trú gì, mà vẫn xoá token dùng chung đi.
 */
function dsRepoTuLuu(luu: Partial<CheckmateConfig>): RepoConfig[] {
  return luu.repos?.length ? luu.repos : [{ ...MAC_DINH.repos[0], ...(luu.repo ?? {}) }];
}

export function docConfig(): CheckmateConfig {
  // `GITHUB_TOKEN` của môi trường vẫn có hiệu lực, nhưng ở bậc 2 của R4.20 và do kho bí mật lo —
  // không còn nhồi vào `config.github_token` nữa. Giữ trong khoá cache để sửa env rồi restart vẫn ăn.
  const tokenEnv = process.env.GITHUB_TOKEN?.trim() ?? '';
  if (!existsSync(FILE)) {
    return structuredClone(MAC_DINH);
  }
  const mtimeNs = statSync(FILE, { bigint: true }).mtimeNs;
  if (cache && cache.mtimeNs === mtimeNs && cache.token === tokenEnv) return cache.c;
  const luu = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<CheckmateConfig>;
  // Config đời cũ chỉ có MỘT repo — nâng thành danh sách mà không mất thiết lập nào
  const repos = dsRepoTuLuu(luu);
  const chon = luu.repo_dang_chon && repos.some((r) => r.github === luu.repo_dang_chon) ? luu.repo_dang_chon : repos[0].github;
  const c: CheckmateConfig = {
    repos,
    repo_dang_chon: chon,
    repo: repos.find((r) => r.github === chon) ?? repos[0],
    github_token: luu.github_token ?? '',
    agent: nangCapAgent(luu.agent),
    truc: { ...MAC_DINH.truc, ...luu.truc },
  };
  cache = { mtimeNs, token: tokenEnv, c };
  return c;
}

// Config đời cũ chỉ có provider 'cli'|'api' + model phẳng — nâng lên mô hình nhà-cung-cấp
// mà không bắt người dùng cấu hình lại từ đầu.
function nangCapAgent(a?: Partial<AgentConfig>): AgentConfig {
  if (!a) return structuredClone(MAC_DINH.agent);
  if (a.ncc && a.ncc_cau_hinh) {
    return { ...MAC_DINH.agent, ...a, ncc_cau_hinh: { ...MAC_DINH.agent.ncc_cau_hinh, ...a.ncc_cau_hinh } } as AgentConfig;
  }
  return {
    ncc: 'anthropic',
    ncc_cau_hinh: {
      anthropic: { phuong_thuc: a.provider === 'api' ? 'api' : 'thue_bao', model: a.model ?? 'claude-sonnet-5' },
    },
    max_probe: a.max_probe ?? 6,
    skeptic: a.skeptic ?? true,
  };
}

export function cauHinhHienTai(c: CheckmateConfig): CauHinhNcc {
  const dn = dinhNghia(c.agent.ncc);
  const tho = c.agent.ncc_cau_hinh[c.agent.ncc];
  // Chuẩn hoá TRƯỚC khi gác: config sửa tay có thể KHUYẾT trường (đường cứu hộ R9.13 không hứa hình
  // dạng đủ), mà đường cứu hộ ném TypeError thì không còn là đường cứu hộ. Vòng bốn của Opus bắt đúng
  // ca này trên bản vá vòng ba — bản gác cửa gọi cfg.model.length khi model là undefined.
  const cfg: CauHinhNcc = {
    ...tho,
    phuong_thuc: tho?.phuong_thuc && dn.phuong_thuc.includes(tho.phuong_thuc) ? tho.phuong_thuc : dn.phuong_thuc[0],
    model: typeof tho?.model === 'string' && tho.model.trim() ? tho.model : dn.models[0],
  };
  // Đường HIỂN THỊ: trả nguyên vẹn (kể cả tổ hợp cấm) để màn Cấu hình còn render được cho người dùng
  // sửa. Gác giới hạn nằm ở cauHinhDeCham — đường CHẤM (R5.17).
  return cfg;
}

/** Lỗi cấu hình nhà cung cấp — chỗ khởi chạy chấm bắt cái này để từ chối với lời rõ, không phải 500 */
export class LoiCauHinhNcc extends Error {}

/**
 * Cấu hình cho ĐƯỜNG CHẤM — mọi lượt chấm phải lấy cấu hình qua đây, không qua cauHinhHienTai.
 *
 * R5.15 + R5.17, chốt sau HAI vòng cổng bắt hai hướng ngược nhau: vòng ba bắt «tổ hợp cấm từ config
 * sửa tay sống tới lượt chấm» (ba cửa giao diện đều gác nhưng cửa đọc — cửa thật — thì không); bản vá
 * rơi-mềm-về-model-khác bị vòng năm bắt tiếp «âm thầm thay model, mở cổng kiểm cho tổ hợp chưa kiểm».
 * Giao của hai yêu cầu chỉ còn một đáp án: TỪ CHỐI CHẠY, nói rõ, để người dùng tự sửa — không dùng
 * nguyên, không thay hộ. Không vọng nguyên văn giá trị ngoài danh mục (có thể là khoá dán nhầm).
 */
export function cauHinhDeCham(c: CheckmateConfig): CauHinhNcc {
  const dn = dinhNghia(c.agent.ncc);
  const cfg = cauHinhHienTai(c);
  if (!modelHopLe(dn, cfg.phuong_thuc, cfg.model)) {
    const che = dn.models.includes(cfg.model) ? cfg.model : `(ngoài danh mục — ${cfg.model.length} ký tự)`;
    throw new LoiCauHinhNcc(
      `Cấu hình ${dn.ten} đang mang tổ hợp không được phép: model ${che} với phương thức «${cfg.phuong_thuc}» (R5.15). ` +
        `Lượt chấm không chạy — vào ⚙ Cấu hình chọn lại model hoặc phương thức, rồi bấm Kiểm tra.`,
    );
  }
  return cfg;
}

export function ghiConfig(c: CheckmateConfig): void {
  if (MODE === 'demo') throw new Error('Chế độ demo không cho sửa cấu hình');
  // `repo` chỉ là VIEW của repo đang chọn — không ghi xuống đĩa, kẻo có hai nguồn sự thật lệch nhau
  const { repo: _view, ...luu } = c;
  writeFileSync(FILE, JSON.stringify(luu, null, 2) + '\n', 'utf8');
  cache = null; // bỏ cache ngay khi ghi, không dựa vào độ phân giải mili giây của mtime
}

/**
 * R4.21 — di trú token dùng chung sang token theo từng repo. Chạy lúc khởi động, một lần là đủ, và
 * chạy lại lần hai không đổi gì thêm (`github_token` đã bị gỡ khỏi file).
 *
 * Ghi THẲNG xuống file chứ không đi qua `ghiConfig`: đây là bảo trì dữ liệu của chính hệ thống, không
 * phải người dùng sửa cấu hình — chặn nó ở chế độ demo chỉ để lại token nằm sai chỗ.
 */
export function diTruTokenRepo(): { chuyen: string[] } {
  if (!existsSync(FILE)) return { chuyen: [] };
  const luu = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<CheckmateConfig>;
  const cu = luu.github_token?.trim() ?? '';
  if (!cu) return { chuyen: [] };
  const chuyen: string[] = [];
  for (const r of dsRepoTuLuu(luu)) {
    // Hỏi CHÌA RIÊNG, không hỏi docTokenRepo: hàm kia có bậc dự phòng đọc GITHUB_TOKEN của môi trường
    // (R4.20), nên trên máy chủ có biến đó thì MỌI repo chưa có chìa riêng đều trông như "đã có chìa"
    // và bị bỏ qua — token dùng chung cũ không bao giờ được di trú, trái chữ PHẢI của R4.21. Thứ tự ưu
    // tiên R4.20 chỉ áp lúc ĐỌC token để gọi API, không phải lúc quyết định có nên di trú hay không.
    const rieng = docTokenRieng(r.github);
    if (rieng && rieng !== cu) continue;
    ghiTokenRepo(r.github, cu);
    chuyen.push(r.github);
  }
  // Lưới fail-closed: chìa cũ chỉ được gỡ khỏi file khi KHÔNG CÒN repo nào cần tới nó — tức mọi repo
  // trong danh sách đều đã có chìa riêng nằm an toàn trong kho bí mật. Kiểm bằng cách đọc lại kho chứ
  // không tin vào việc vừa gọi hàm ghi: kho không ghi được (quyền sai, đĩa đầy) mà vẫn xoá token khỏi
  // config là làm bốc hơi thứ duy nhất mở được các repo đó. Thà để token nằm sai chỗ còn hơn mất hẳn.
  if (dsRepoTuLuu(luu).some((r) => !docTokenRieng(r.github))) return { chuyen };
  const { github_token: _bo, ...conLai } = luu;
  writeFileSync(FILE, JSON.stringify(conLai, null, 2) + '\n', 'utf8');
  cache = null;
  return { chuyen };
}

/**
 * Che token để hiển thị. KHÔNG lộ ký tự nào của chìa (R4.26): bảy ký tự đầu và bốn ký tự cuối không
 * giúp người dùng phân biệt hai token — `ghp_` chiếm sẵn bốn ký tự đầu — nhưng lại là một phần chìa
 * thật nằm trên ảnh chụp màn hình và trong log. Độ dài là đủ để nhận ra "mình đã dán đúng chỗ chưa".
 */
export function cheToken(token: string): string {
  if (!token) return '(chưa đặt — dùng đăng nhập gh của máy nếu có)';
  return `đã có (${token.length} ký tự)`;
}

// Env truyền xuống harness CLI theo cấu hình agent
// Token gói thuê bao Claude Code (tạo bằng `claude setup-token` trên máy có trình duyệt).
// Ưu tiên biến môi trường của dịch vụ; không có thì lấy từ file secrets do người dùng dán qua giao diện.
export function docTokenThueBao(): string {
  return process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim() || (docKho().claude_code_oauth_token?.trim() ?? '');
}

export function ghiTokenThueBao(token: string): void {
  ghiKho({ ...docKho(), claude_code_oauth_token: token });
}

export function cheToken2(t: string): string {
  return t ? `đã lưu (${t.length} ký tự, ${t.slice(0, 8)}…)` : 'chưa có';
}

export function envAgent(c: CheckmateConfig): NodeJS.ProcessEnv {
  // Đường chấm — tổ hợp cấm ném LoiCauHinhNcc tại đây, mọi đường khởi chạy đều đi qua (R5.17)
  const cfg = cauHinhDeCham(c);
  const ncc = c.agent.ncc;
  const dn = dinhNghia(ncc);
  const tokenTb = docTokenThueBao();
  const khoa = docKhoa(ncc);
  const dungThueBao = ncc === 'anthropic' && cfg.phuong_thuc === 'thue_bao';
  return {
    CHECKER_NCC: ncc,
    // anthropic giữ hai đường cũ (cli = gói thuê bao, api = ví API); nhà cung cấp khác luôn đi API
    CHECKER_PROVIDER: ncc === 'anthropic' ? (cfg.phuong_thuc === 'thue_bao' ? 'cli' : 'api') : 'api',
    CHECKER_MODEL: cfg.model,
    CHECKER_MAX_PROBE: String(c.agent.max_probe),
    CHECKER_SKEPTIC: c.agent.skeptic ? '1' : '0',
    ...(dungThueBao && tokenTb ? { CLAUDE_CODE_OAUTH_TOKEN: tokenTb } : {}),
    // Tên biến khoá lấy TỪ ĐỊNH NGHĨA nhà cung cấp — thêm nhà cung cấp mới không phải nhớ sửa chỗ này nữa
    // (bài học: trước đây liệt kê tay từng ncc nên quên google, harness báo "chưa có GOOGLE_API_KEY").
    ...(!dungThueBao && dn.khoa && khoa ? { [dn.khoa.ten_bien]: khoa, CHECKER_KHOA: khoa } : {}),
  };
}
