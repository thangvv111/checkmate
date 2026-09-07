import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { configForRepo, resolveRepoShape } from '../apps/web/src/config.js';
import { computeProfile } from '../apps/web/src/trust.js';
import { trustPage } from '../apps/web/src/ui-trust.js';

/**
 * Lưới cho capability `repo-history` — 13 điều R4 chưa được ca nào khoá.
 *
 * 17 điều còn lại đã có ca ở `token-repo` · `web-loc` · `nhan-probe-log` · `boc-model`; file này không lặp
 * lại chúng.
 */

const repoGia = (github: string) => ({ github, nhanh_goc: 'main', duong: `/tmp/${github}` }) as never;

describe('hình dạng cấu hình repo (R4.1 · R4.2 · R4.3 · R4.4)', () => {
  it('R4.1 — `repos[]` là nguồn sự thật, và `repo` là KHUNG NHÌN khớp `repo_dang_chon`', () => {
    // Hai chỗ giữ cùng một sự thật thì sẽ có ngày lệch nhau, và người sửa không biết bên nào đúng.
    const ra = resolveRepoShape({
      repos: [repoGia('a/one'), repoGia('b/two')],
      repo_dang_chon: 'b/two',
    } as never);
    expect(ra.repos.map((r) => r.github)).toEqual(['a/one', 'b/two']);
    expect(ra.repo_dang_chon).toBe('b/two');
    expect(ra.repo.github).toBe('b/two');
  });

  it('R4.3 — cấu hình đời cũ chỉ có một `repo` được nâng thành danh sách một phần tử', () => {
    const ra = resolveRepoShape({ repo: repoGia('cu/doi-cu') } as never);
    expect(ra.repos).toHaveLength(1);
    expect(ra.repos[0].github).toBe('cu/doi-cu');
    expect(ra.repo.github).toBe('cu/doi-cu');
  });

  it('R4.4 — `repo_dang_chon` trỏ repo đã bị gỡ thì rơi về phần tử ĐẦU, KHÔNG ném', () => {
    // Một repo bị gỡ mà cấu hình còn trỏ tới nó là trạng thái BÌNH THƯỜNG, không phải lỗi — làm màn hình
    // chết vì nó là báo sai bản chất.
    const ra = resolveRepoShape({
      repos: [repoGia('a/one'), repoGia('b/two')],
      repo_dang_chon: 'da/bi-go',
    } as never);
    expect(ra.repo_dang_chon).toBe('a/one');
    expect(ra.repo.github).toBe('a/one');
  });

  /**
   * Ca này ĐỔI cùng change `empty-repo-list-is-a-real-state`, và nó đỏ là Ý MUỐN.
   *
   * Bản trước đòi `repos.length > 0` với MỌI cấu hình khuyết — tức khoá đúng hành vi «không biết repo nào
   * thì đoán lấy một», thứ đã tự khởi hai lượt chấm trên repo ma ngay sau khi người vận hành dọn sạch
   * prod. Vế «KHÔNG được để trống» của R4.4 sinh ra để chống **màn hình chết vì trỏ nhầm** khi danh sách
   * còn phần tử khác, không phải để cấm trạng thái «chưa kết nối repo nào»; biên ấy nay khai rõ ở
   * capability `repo-history`.
   *
   * Giữ nguyên vế vẫn đúng và là vế thật sự load-bearing: **không ném**. Cấu hình khuyết vẫn phải đọc
   * được — nếu không thì màn Cấu hình, đúng cái lối thoát duy nhất để thêm repo, cũng chết theo.
   */
  it('R4.4 — cấu hình khuyết đọc được, KHÔNG ném, và không đoán ra repo nào', () => {
    for (const luu of [{}, { repos: [] }, { repo_dang_chon: 'x/y' }]) {
      expect(() => resolveRepoShape(luu as never)).not.toThrow();
      const ra = resolveRepoShape(luu as never);
      expect(ra.repos).toEqual([]);
      expect(ra.repo).toBeUndefined();
      expect(ra.repo_dang_chon).toBe('');
    }
  });

  it('R4.4 — khuyết trường danh sách nhưng CÓ repo đời cũ thì vẫn dùng được ngay', () => {
    // Chiều hại ngược của ca trên: nghiêng quá tay thì người dùng đời cũ mở lên thấy trắng trơn.
    const ra = resolveRepoShape({ repo: repoGia('cu/doi-cu'), repo_dang_chon: 'x/y' } as never);
    expect(ra.repos).toHaveLength(1);
    expect(ra.repo?.github).toBe('cu/doi-cu');
    expect(ra.repo_dang_chon).toBe('cu/doi-cu');
  });
});

describe('thang tin cậy lọc theo repo (R4.17) — HAI vế, hai ca', () => {
  const soCai = [
    { run_id: 'r1', repo: 'a/one', tac_gia: 'nam', pr: 1, verdict: 'PASS', luc: '2026-09-01T00:00:00Z', high: 0, medium: 0, low: 0 },
    { run_id: 'r2', repo: 'b/two', tac_gia: 'nam', pr: 2, verdict: 'FAIL', luc: '2026-09-02T00:00:00Z', high: 1, medium: 0, low: 0 },
    { run_id: 'r3', repo: 'b/two', tac_gia: 'nam', pr: 3, verdict: 'FAIL', luc: '2026-09-03T00:00:00Z', high: 1, medium: 0, low: 0 },
  ] as never[];

  it('vế 1 — lọc theo repo TRƯỚC khi tính thì hồ sơ chỉ tính từ repo ấy', () => {
    // Track record của một người ở repo này không nói thay cho repo khác: một người cẩn thận ở repo mình
    // thạo có thể ẩu ở repo mình mới vào.
    const chiRepoA = computeProfile(soCai.filter((m: never) => (m as { repo: string }).repo === 'a/one'));
    const chiRepoB = computeProfile(soCai.filter((m: never) => (m as { repo: string }).repo === 'b/two'));
    expect(chiRepoA[0].soVerdict).toBe(1);
    expect(chiRepoB[0].soVerdict).toBe(2);
    // Gộp lại thì ra một con số thứ ba, không nói lên điều gì về repo nào.
    expect(computeProfile(soCai)[0].soVerdict).toBe(3);
  });

  it('vế 1b — ROUTE phải lọc TRƯỚC khi gọi, không phải test tự lọc', () => {
    // Ca trên chỉ khoá rằng `computeProfile` tôn trọng dữ liệu vào — nó VẪN XANH nếu ai đó bỏ phép lọc ở
    // route, vì test tự lọc lấy. Luật R4.17 nói «lọc TRƯỚC KHI tính», tức nó là luật về CHỖ GỌI.
    //
    // Ca này chứng minh thứ tự trong code (design D4 khai rõ cái mất so với ca gọi hàm).
    const web = readFileSync('apps/web/src/server.ts', 'utf8');
    const iTrang = web.indexOf("app.get('/tin-cay'");
    expect(iTrang).toBeGreaterThan(0);
    const khoi = web.slice(iTrang, iTrang + 700);
    const iLoc = khoi.indexOf('filter');
    const iTinh = khoi.indexOf('computeProfile');
    expect(iLoc, 'route phải lọc theo repo').toBeGreaterThan(0);
    expect(iLoc, 'phép lọc phải đứng TRƯỚC computeProfile').toBeLessThan(iTinh);
  });

  it('vế 2 — KHÔNG lọc thì trang phải NÓI RA là đang gộp mọi repo', () => {
    // Vế này chỉ là một câu trên màn hình: KHÔNG có gì gãy khi nó biến mất. Một lần dọn giao diện là đủ
    // để mất nó, và sau đó trang gộp mọi repo mà không ai biết — thang tin cậy là thứ người duyệt nhìn
    // TRƯỚC KHI bấm merge, nên một con số không có nghĩa ở đây đi thẳng vào quyết định.
    const trangGop = trustPage(computeProfile(soCai), ['a/one', 'b/two'], undefined, 'nguoi');
    expect(trangGop).toContain('gộp mọi repo');

    const trangRieng = trustPage(computeProfile(soCai), ['a/one', 'b/two'], 'a/one', 'nguoi');
    expect(trangRieng).not.toContain('gộp mọi repo');
    expect(trangRieng).toContain('a/one');
  });
});

describe('vòng đời repo (R4.7 · R4.22 · R4.25)', () => {
  const src = (f: string) => readFileSync(f, 'utf8');

  it('R4.7 — gỡ repo xoá TOKEN riêng, nhưng KHÔNG đụng clone và lịch sử', () => {
    // «Thôi theo dõi» khác «xoá dấu vết»: người gỡ nhầm phải thêm lại được mà không mất gì, và lịch sử
    // chấm là bằng chứng — xoá nó là xoá thứ dùng để đối chất.
    const s = src('apps/web/src/secret-vault.ts');
    expect(s).toContain('deleteRepoToken');
    // Không hàm nào trên đường gỡ repo được xoá clone hay sổ.
    const web = src('apps/web/src/server.ts');
    const khoiGo = web.slice(web.indexOf("'/api/repo/"), web.indexOf("'/api/repo/") + 3000);
    for (const cam of ['rmSync', 'unlinkSync', 'DELETE FROM so_cai', 'DELETE FROM run']) {
      expect(khoiGo, `đường gỡ repo không được dùng ${cam}`).not.toContain(cam);
    }
  });

  it('R4.25 — phép chặn «repo thiếu chìa» đứng TRƯỚC khi khởi chạy lượt chấm', () => {
    // Người dùng mất vài phút chờ một lượt chấm sẽ hỏng là thứ tránh được bằng một phép kiểm ở đầu.
    // Ca này chứng minh THỨ TỰ TRONG CODE, không chứng minh hành vi lúc chạy (design D4 khai rõ cái mất).
    const web = src('apps/web/src/server.ts');
    const viTriChan = web.indexOf('R4.25');
    expect(viTriChan).toBeGreaterThan(0);
    const sauChan = web.slice(viTriChan, viTriChan + 900);
    expect(sauChan).toMatch(/return res\.status\(\d+\)/);
  });

  it('R4.22 — bốn bước thêm repo có mặt', () => {
    const web = src('apps/web/src/server.ts');
    expect(web).toContain('R4.22');
    // Bước kiểm phải là lời gọi THẬT tới GitHub, không đoán từ hình dạng chuỗi (R4.23), và trả về nhánh
    // mặc định để gợi ý nhánh gốc (R4.24).
    expect(web).toMatch(/checkRepo|default_branch/);
  });
});

// ---------------------------------------------------------------------------------------------------
// Hành động GitHub của một lượt phải theo repo CỦA LƯỢT (change `github-actions-follow-run-repo`).
//
// Bug đo được trên prod 07/09, ngay sau khi thêm repo thứ ba: verdict của lượt thuộc `thangvv111/checkmate`
// bị đăng lên `thangvv111/admin-fe` (repo đang chọn) — 404 vì repo ấy không có PR số 79, và 422 vì sha
// thuộc repo kia. Hôm ấy may vì số PR không trùng; nếu trùng thì một đội nhận finding của cây mã nguồn
// khác, và ở cổng merge thì máy merge nhầm trunk (⛔C1).
//
// Lỗi ẩn được lâu vì khi hệ chỉ có MỘT repo thì «repo đang chọn» luôn trùng «repo của lượt».
// ---------------------------------------------------------------------------------------------------

const SERVER_SRC = readFileSync('apps/web/src/server.ts', 'utf8');

/** Bỏ chú thích để phép quét không bắt nhầm chữ trong lời giải thích. */
function boChuThich(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/**
 * Đường hành động GitHub thuộc một lượt mà vẫn dựng cấu hình bằng `readConfig()` trơ — tức lấy repo ĐANG
 * CHỌN. Quét theo MỎ NEO của từng đường: lấy khối ngay sau mỏ neo, tìm `const cfg... = readConfig()`
 * không đi qua `configForRepo`.
 */
export function scanSelectedRepoActions(src: string): string[] {
  const loi: string[] = [];
  const s = boChuThich(src);
  const duong: Array<{ ten: string; moNeo: string }> = [
    { ten: 'chế độ trực (onXong)', moNeo: 'rm.onXong = ' },
    { ten: 'theo dõi head đổi', moNeo: 'function theoDoiHead(' },
    { ten: 'cổng merge', moNeo: "app.post('/api/runs/:id/merge'" },
    { ten: 'cổng trả về dev', moNeo: "app.post('/api/runs/:id/reject'" },
  ];
  for (const d of duong) {
    const i = s.indexOf(d.moNeo);
    if (i < 0) {
      loi.push(`${d.ten}: KHÔNG tìm thấy mỏ neo «${d.moNeo}» — phép quét này đang mù`);
      continue;
    }
    const khoi = s.slice(i, i + 900);
    const gan = khoi.match(/const\s+cfg\w*\s*=\s*([^;]+);/);
    if (!gan) {
      loi.push(`${d.ten}: không thấy chỗ dựng cấu hình`);
      continue;
    }
    if (!gan[1].includes('configForRepo')) {
      loi.push(`${d.ten}: dựng cấu hình bằng «${gan[1].trim().slice(0, 60)}» — phải qua configForRepo(…, repo của lượt)`);
    }
  }
  return loi;
}

describe('hành động GitHub theo repo của LƯỢT, không theo repo đang chọn', () => {
  const c = {
    repos: [repoGia('a/one'), repoGia('b/two')],
    repo_dang_chon: 'b/two',
    repo: repoGia('b/two'),
  } as never;

  it('configForRepo trả cấu hình gắn ĐÚNG repo được nêu tên, không phải repo đang chọn', () => {
    const ra = configForRepo(c, 'a/one');
    expect(ra?.repo.github).toBe('a/one');
    expect(ra?.repo_dang_chon).toBe('a/one');
    // Danh sách giữ nguyên — đây là khung nhìn mới, không phải cấu hình mới.
    expect(ra?.repos.map((r) => r.github)).toEqual(['a/one', 'b/two']);
  });

  it('GitHub coi Owner/Repo và owner/repo là một — phép tra cũng vậy', () => {
    expect(configForRepo(c, 'A/One')?.repo.github).toBe('a/one');
  });

  it('⛔ thiếu repo hoặc repo đã bị gỡ ⇒ null, KHÔNG rơi về repo đang chọn', () => {
    // Thà không đăng còn hơn đăng nhầm repo; thà không merge còn hơn merge nhầm trunk.
    for (const x of [undefined, null, '', '   ', 'da/bi-go']) {
      expect(configForRepo(c, x as never), `«${String(x)}» phải ra null`).toBeNull();
    }
  });

  it('scanSelectedRepoActions — ĐỎ: đường hành động dựng cấu hình bằng readConfig() trơ', () => {
    const gia = [
      'rm.onXong = (meta) => {',
      '  const cfg = readConfig();',
      '  if (!coRepo(cfg)) return;',
      '};',
    ].join('\n');
    expect(scanSelectedRepoActions(gia)).toHaveLength(4); // 1 vi phạm + 3 mỏ neo không có trong fixture
    expect(scanSelectedRepoActions(gia)[0]).toContain('chế độ trực');
  });

  it('scanSelectedRepoActions — XANH: dựng qua configForRepo thì không vi phạm', () => {
    const gia = [
      'rm.onXong = (meta) => {',
      '  const cfg = configForRepo(readConfig(), meta.repo);',
      '  if (!cfg) return;',
      '};',
      'function theoDoiHead(id, soPr) {',
      '  const cfgH = configForRepo(readConfig(), rm.lay(id)?.meta.repo);',
      '}',
      "app.post('/api/runs/:id/merge', async (req, res) => {",
      '  const cfg = configForRepo(readConfig(), st?.meta.repo);',
      '});',
      "app.post('/api/runs/:id/reject', async (req, res) => {",
      '  const cfg = configForRepo(readConfig(), st?.meta.repo);',
      '});',
    ].join('\n');
    expect(scanSelectedRepoActions(gia)).toEqual([]);
  });

  it('mã nguồn hiện tại: cả BỐN đường hành động đều theo repo của lượt', () => {
    expect(scanSelectedRepoActions(SERVER_SRC)).toEqual([]);
  });

  it('thiếu repo thì đường tự động NÓI RA thay vì im lặng bỏ qua', () => {
    // Im lặng ở đây nguy hiểm: người vận hành tưởng verdict đã lên PR, còn đội repo đích không thấy gì.
    const i = boChuThich(SERVER_SRC).indexOf('rm.onXong = ');
    const khoi = boChuThich(SERVER_SRC).slice(i, i + 900);
    expect(khoi).toMatch(/console\.(error|log)\(/);
    expect(khoi).toContain('không còn trong danh sách');
  });
});
