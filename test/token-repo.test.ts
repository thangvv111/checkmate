import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Token GitHub theo TỪNG repo (specs/R4.18–R4.27). Ba chỗ dễ hỏng mà lưới này giữ:
//   • chọn nhầm chìa — gọi API của repo A bằng token repo B (im lặng, chỉ lộ ra bằng 404 khó hiểu);
//   • di trú làm mất kết nối repo đang chạy được;
//   • gỡ repo để lại chìa mồ côi trong kho bí mật.

const goc = mkdtempSync(join(tmpdir(), 'checkmate-token-'));
process.env.CHECKMATE_GOC = goc;
delete process.env.GITHUB_TOKEN;

const kho = await import('../apps/web/src/kho-bi-mat.js');
const gh = await import('../apps/web/src/github.js');
const cfg = await import('../apps/web/src/config.js');

const FILE_SECRET = join(goc, '.secrets.json');
const FILE_CONFIG = join(goc, 'config.json');

beforeEach(() => {
  rmSync(FILE_SECRET, { force: true });
  rmSync(FILE_CONFIG, { force: true });
  delete process.env.GITHUB_TOKEN;
});

describe('suy chìa từ đường dẫn API (R4.18)', () => {
  it('lấy đúng owner/repo ở đầu path', () => {
    expect(gh.repoTuPath('/repos/acme/web/pulls/12')).toBe('acme/web');
    expect(gh.repoTuPath('/repos/acme/web')).toBe('acme/web');
  });

  it('không để query hay neo lọt vào tên repo', () => {
    expect(gh.repoTuPath('/repos/acme/web/pulls?state=open&per_page=100')).toBe('acme/web');
  });

  it('path không nhắm vào repo nào thì trả rỗng, KHÔNG đoán bừa', () => {
    // `/user/repos` là của cả tài khoản — gán nó cho một repo cụ thể là chọn nhầm chìa
    expect(gh.repoTuPath('/user/repos?per_page=100')).toBe('');
    expect(gh.repoTuPath('/rate_limit')).toBe('');
  });
});

describe('tách owner/repo từ thứ người dùng dán (R4.5)', () => {
  it('nhận URL đầy đủ trên thanh địa chỉ', () => {
    expect(gh.tachOwnerRepo('https://github.com/thangvv111/demo-credit-approval')).toBe('thangvv111/demo-credit-approval');
  });

  it('nhận URL có đuôi .git, có nhánh, có dấu / thừa', () => {
    expect(gh.tachOwnerRepo('https://github.com/acme/web.git')).toBe('acme/web');
    expect(gh.tachOwnerRepo('https://github.com/acme/web/tree/main')).toBe('acme/web');
  });

  it('nhận dạng git@ và dạng owner/repo gõ tay', () => {
    expect(gh.tachOwnerRepo('git@github.com:acme/web.git')).toBe('acme/web');
    expect(gh.tachOwnerRepo('acme/web')).toBe('acme/web');
  });

  it('rác thì trả rỗng chứ không dựng ra một repo không có thật', () => {
    expect(gh.tachOwnerRepo('')).toBe('');
    expect(gh.tachOwnerRepo('https://gitlab.com/acme/web')).toBe('');
    expect(gh.tachOwnerRepo('chỉ-một-đoạn')).toBe('');
  });
});

describe('kho chìa theo repo (R4.19, R4.20)', () => {
  it('chìa riêng của repo được lấy đúng, repo khác không thấy nó', () => {
    kho.ghiTokenRepo('acme/web', 'ghp_A');
    expect(kho.docTokenRepo('acme/web')).toBe('ghp_A');
    expect(kho.docTokenRepo('acme/khac')).toBe('');
    expect(kho.coToken('acme/khac')).toBe(false);
  });

  it('GitHub không phân biệt hoa thường nên kho không được lưu hai chìa cho một repo', () => {
    kho.ghiTokenRepo('Acme/Web', 'ghp_A');
    expect(kho.docTokenRepo('acme/web')).toBe('ghp_A');
  });

  it('chìa riêng THẮNG token chung của môi trường', () => {
    process.env.GITHUB_TOKEN = 'ghp_MOI_TRUONG';
    kho.ghiTokenRepo('acme/web', 'ghp_RIENG');
    expect(kho.docTokenRepo('acme/web')).toBe('ghp_RIENG');
    // repo chưa có chìa riêng thì mới rơi về chìa chung
    expect(kho.docTokenRepo('acme/khac')).toBe('ghp_MOI_TRUONG');
    expect(kho.docTokenRieng('acme/khac')).toBe('');
  });

  it('gỡ repo thì chìa đi theo, các chìa khác còn nguyên (R4.27)', () => {
    kho.ghiTokenRepo('acme/web', 'ghp_A');
    kho.ghiTokenRepo('acme/api', 'ghp_B');
    kho.xoaTokenRepo('acme/web');
    expect(kho.docTokenRepo('acme/web')).toBe('');
    expect(kho.docTokenRepo('acme/api')).toBe('ghp_B');
  });

  it('ghi chìa không được đạp mất bí mật khác trong cùng kho', () => {
    writeFileSync(FILE_SECRET, JSON.stringify({ claude_code_oauth_token: 'sk-cu', khoa: { anthropic: 'sk-ant' } }), 'utf8');
    kho.ghiTokenRepo('acme/web', 'ghp_A');
    const s = JSON.parse(readFileSync(FILE_SECRET, 'utf8'));
    expect(s.claude_code_oauth_token).toBe('sk-cu');
    expect(s.khoa.anthropic).toBe('sk-ant');
    expect(s.repo_token['acme/web']).toBe('ghp_A');
  });
});

describe('di trú token dùng chung (R4.21)', () => {
  const configCu = {
    repos: [
      { github: 'acme/web', base_branch: 'main', local_path: '/x/web' },
      { github: 'acme/api', base_branch: 'main', local_path: '/x/api' },
    ],
    repo_dang_chon: 'acme/web',
    github_token: 'ghp_CHUNG',
    truc: { bat: false, chu_ky_giay: 300, tu_dong_comment: true },
  };

  it('token cũ thành chìa riêng của MỌI repo, rồi biến khỏi config.json', () => {
    writeFileSync(FILE_CONFIG, JSON.stringify(configCu), 'utf8');
    const { chuyen } = cfg.diTruTokenRepo();
    expect(chuyen.sort()).toEqual(['acme/api', 'acme/web']);
    expect(kho.docTokenRepo('acme/web')).toBe('ghp_CHUNG');
    expect(kho.docTokenRepo('acme/api')).toBe('ghp_CHUNG');
    expect(JSON.parse(readFileSync(FILE_CONFIG, 'utf8')).github_token).toBeUndefined();
  });

  it('chạy lần hai không đổi gì thêm', () => {
    writeFileSync(FILE_CONFIG, JSON.stringify(configCu), 'utf8');
    cfg.diTruTokenRepo();
    const sau1 = readFileSync(FILE_CONFIG, 'utf8');
    expect(cfg.diTruTokenRepo().chuyen).toEqual([]);
    expect(readFileSync(FILE_CONFIG, 'utf8')).toBe(sau1);
  });

  it('repo đã có chìa riêng thì KHÔNG bị chìa chung cũ đè lên', () => {
    writeFileSync(FILE_CONFIG, JSON.stringify(configCu), 'utf8');
    kho.ghiTokenRepo('acme/api', 'ghp_RIENG_MOI');
    cfg.diTruTokenRepo();
    expect(kho.docTokenRepo('acme/api')).toBe('ghp_RIENG_MOI');
    expect(kho.docTokenRepo('acme/web')).toBe('ghp_CHUNG');
  });

  it('VẪN di trú khi máy chủ có GITHUB_TOKEN — biến môi trường không phải chìa riêng của repo nào', () => {
    // Lỗi thật CheckMate bắt được, cả lưới review lẫn bộ test này đều bỏ sót vì beforeEach xoá sạch
    // GITHUB_TOKEN — tức đã tự dọn mất đúng điều kiện làm lộ lỗi.
    //
    // Hỏi `docTokenRepo` để biết "repo đã có chìa chưa" là sai: hàm đó có bậc dự phòng đọc biến môi
    // trường, nên trên máy chủ có GITHUB_TOKEN thì mọi repo trông như đã có chìa và không repo nào
    // được di trú. Thứ tự ưu tiên R4.20 chỉ áp lúc ĐỌC token, không phải lúc quyết định di trú.
    process.env.GITHUB_TOKEN = 'ghp_CUA_MOI_TRUONG';
    writeFileSync(FILE_CONFIG, JSON.stringify(configCu), 'utf8');
    const { chuyen } = cfg.diTruTokenRepo();
    expect(chuyen.sort()).toEqual(['acme/api', 'acme/web']);
    expect(kho.docTokenRieng('acme/web')).toBe('ghp_CHUNG');
    expect(kho.docTokenRieng('acme/api')).toBe('ghp_CHUNG');
  });

  it('cấu hình ĐỜI CŨ chỉ có repo đơn vẫn được di trú, không mất token (R4.3 + R4.21)', () => {
    // Lỗi thật CheckMate bắt được ở lượt chấm thứ hai: hàm lặp thẳng `luu.repos` nên với cấu hình đời
    // cũ (chỉ có `repo`, không có mảng `repos`) vòng lặp không chạy lần nào — mà cuối hàm vẫn xoá
    // `github_token`. Token biến mất khỏi CẢ config lẫn kho bí mật, repo mất kết nối trong im lặng.
    writeFileSync(
      FILE_CONFIG,
      JSON.stringify({
        repo: { github: 'acme/legacy-repo', base_branch: 'main', local_path: '/x/legacy' },
        github_token: 'ghp_CHUNG',
      }),
      'utf8',
    );
    const { chuyen } = cfg.diTruTokenRepo();
    expect(chuyen).toEqual(['acme/legacy-repo']);
    expect(kho.docTokenRieng('acme/legacy-repo')).toBe('ghp_CHUNG');
  });

  it('chìa cũ chỉ rời config khi MỌI repo đã có chìa riêng nằm an toàn trong kho', () => {
    // Lưới fail-closed. Kiểm bằng cách đọc lại kho chứ không tin vào việc vừa gọi hàm ghi: kho không
    // ghi được (quyền sai, đĩa đầy) mà vẫn xoá token khỏi config là làm bốc hơi thứ duy nhất mở được
    // các repo đó.
    writeFileSync(FILE_CONFIG, JSON.stringify(configCu), 'utf8');
    cfg.diTruTokenRepo();
    expect(JSON.parse(readFileSync(FILE_CONFIG, 'utf8')).github_token).toBeUndefined();
    expect(kho.docTokenRieng('acme/web')).toBe('ghp_CHUNG');
    expect(kho.docTokenRieng('acme/api')).toBe('ghp_CHUNG');
  });

  it('không có config.json hay không có token cũ thì không tạo ra file rác', () => {
    expect(cfg.diTruTokenRepo().chuyen).toEqual([]);
    expect(existsSync(FILE_SECRET)).toBe(false);
  });
});

describe('cổng kiểm kết nối nói đúng bối cảnh (R4.23)', () => {
  it('404 khi CHƯA có token thì không được đổ lỗi cho quyền của token', async () => {
    // Ca thật gặp lúc chạy tay: lượt kiểm không mang chìa nào mà thông điệp vẫn mở đầu bằng
    // "Token hợp lệ nhưng…" — đẩy người dùng đi kiểm quyền họ chưa cấp cho ai.
    const kq = await gh.kiemTraRepo('vitest-dev/khong-co-repo-nay-dau-2026', '');
    expect(kq.ok).toBe(false);
    expect(kq.ly_do).toBe('khong_thay');
    expect(kq.thong_diep).not.toMatch(/Token hợp lệ/);
    expect(kq.thong_diep).toMatch(/chưa có token nào/i);
  });

  it('repo công khai có thật thì qua, và trả về nhánh mặc định để bước 4 dùng (R4.24)', async () => {
    const kq = await gh.kiemTraRepo('vitest-dev/vitest', '');
    expect(kq.ok).toBe(true);
    expect(kq.github).toBe('vitest-dev/vitest');
    expect(kq.nhanh_mac_dinh).toBeTruthy();
  });
});

describe('token không được rò ra ngoài (R4.6, R9.17)', () => {
  it('lời kêu của git mang URL có token thì phải bị che trước khi đi tiếp', () => {
    const van = "fatal: unable to access 'https://x-access-token:ghp_SIEUBIMAT123@github.com/acme/web.git/': 403";
    const che = gh.cheTokenTrongVan(van);
    expect(che).not.toContain('ghp_SIEUBIMAT123');
    expect(che).toContain('github.com/acme/web');
  });

  it('văn bản không có token thì giữ nguyên, không bôi bẩn thông báo lỗi', () => {
    const van = 'fatal: repository https://github.com/acme/web.git not found';
    expect(gh.cheTokenTrongVan(van)).toBe(van);
  });
});
