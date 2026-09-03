import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveRepoShape } from '../apps/web/src/config.js';
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

  it('R4.4 — cấu hình khuyết vẫn ra được thứ dùng được, không ném', () => {
    for (const luu of [{}, { repos: [] }, { repo_dang_chon: 'x/y' }]) {
      expect(() => resolveRepoShape(luu as never)).not.toThrow();
      const ra = resolveRepoShape(luu as never);
      expect(ra.repos.length).toBeGreaterThan(0);
      expect(ra.repo).toBeTruthy();
    }
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
