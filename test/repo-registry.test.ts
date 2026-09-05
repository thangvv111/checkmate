import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { coRepo, laRepoDaKhai, resolveRepoShape, timRepoDaKhai } from '../apps/web/src/config.js';
import { decideWebhookAction } from '../apps/web/src/webhook.js';

/**
 * Lưới cho capability `repo-registry`.
 *
 * Luật ở đây sinh ra từ MỘT sự cố đo được trên prod: người vận hành xoá sạch repo, và trong vòng một phút
 * chế độ trực tự khởi hai lượt chấm trên một repo hard-code — dựng lại đúng clone và thư viện probe vừa
 * được dọn. Không lỗi nào nổ ra, không cảnh báo nào hiện lên, vì bản cũ thay danh sách rỗng bằng một repo
 * mặc định ngay trong đường đọc cấu hình.
 *
 * Nên file này khoá hai vế, và vế thứ hai mới là vế khó:
 *   1. Danh sách rỗng đọc ra RỖNG — không đoán.
 *   2. Ba đường khởi lượt chấm hỏi **cùng một** gác. Bản trước gác chỉ có ở webhook; hai đường còn lại
 *      hoặc không có gác, hoặc dựa vào một khung nhìn đã bị suy đoán. Khuôn «hai cửa cùng vai viết bằng
 *      hai biểu thức riêng» đã bị bắt chín lần trong repo này, nên «dùng chung» phải là tính chất của mã
 *      nguồn, không phải một lời hứa trong tài liệu.
 */

const NL = String.fromCharCode(10);
const repoGia = (github: string) => ({ github, base_branch: 'main', local_path: `/tmp/${github}` }) as never;

// ── Tầng 2: bề mặt ĐẾM BẰNG MÁY, không liệt kê bằng trí nhớ ───────────────────
const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
const GITHUB = readFileSync('apps/web/src/github.ts', 'utf8');
const CONFIG = readFileSync('apps/web/src/config.ts', 'utf8');
const WEBHOOK = readFileSync('apps/web/src/webhook.ts', 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Hàm quét — mỗi hàm khoá MỘT luật kiến trúc, và mỗi hàm có cặp fixture (tầng 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ba cửa khởi lượt chấm: gác phải đứng TRƯỚC hành động, trong cùng khối của cửa ấy.
 *
 * Quét theo thứ tự chứ không chỉ theo sự hiện diện: một gác nằm SAU lời gọi khởi chạy vẫn làm mọi phép
 * `toContain` xanh, trong khi lượt chấm đã chạy rồi.
 */
const CUA_KHOI_CHAM: readonly { ten: string; moc: RegExp; hanhDong: RegExp; gac: RegExp }[] = [
  {
    ten: 'chế độ trực',
    moc: /if \(!cfg\.truc\.bat \|\| dangQuet\) return;/,
    hanhDong: /await chamPr\(/,
    gac: /laRepoDaKhai\(/,
  },
  {
    ten: 'bấm tay',
    moc: /app\.post\('\/api\/runs'/,
    hanhDong: /fetchAndRoute\(cfg,/,
    gac: /coRepo\(cfg\)/,
  },
];

export function scanEntryGates(src: string): string[] {
  const loi: string[] = [];
  for (const c of CUA_KHOI_CHAM) {
    const m = c.moc.exec(src);
    // Nhánh này canh chính phép quét: mốc đổi tên mà không ai sửa đây thì hàm quét thành mù, và một hàm
    // quét mù trả rỗng — trông y hệt «code đang đúng».
    if (!m) {
      loi.push(`không tìm thấy cửa «${c.ten}» — mốc đổi rồi thì phép quét này đang mù`);
      continue;
    }
    const sau = src.slice(m.index);
    const h = c.hanhDong.exec(sau);
    if (!h) {
      loi.push(`cửa «${c.ten}»: không tìm thấy lời gọi khởi lượt chấm`);
      continue;
    }
    if (!c.gac.test(sau.slice(0, h.index))) {
      loi.push(`cửa «${c.ten}» khởi lượt chấm mà chưa qua gác repo-đã-khai`);
    }
  }
  return loi;
}

/** Webhook phải HỎI gác chung, không được tự dựng biểu thức đối chiếu riêng. */
export function scanSharedRepoGate(src: string): string[] {
  const loi: string[] = [];
  if (!/timRepoDaKhai\(repoDaKhai,/.test(src)) {
    loi.push('webhook không gọi gác chung — nó đang tự trả lời câu hỏi «repo này đã khai chưa»');
  }
  for (const d of src.split(NL)) {
    if (/repoDaKhai\s*\.\s*(includes|some|find|indexOf)/.test(d)) {
      loi.push(`webhook dựng biểu thức đối chiếu riêng: ${d.trim()}`);
    }
  }
  return loi;
}

/**
 * `github.ts`: hàm nào nhận cấu hình rồi ĐỌC repo phải khai `CauHinhCoRepo` trong chữ ký.
 *
 * Tham số tên bắt đầu bằng `_` được miễn — đó là tham số không dùng (giữ cho khớp chữ ký), và nó không
 * đọc repo nào. Không miễn thì phép quét báo động giả trên hai hàm đang đúng: lỗi lưới loại 3.
 */
export function scanRepoTypedSignatures(src: string): string[] {
  const loi: string[] = [];
  for (const d of src.split(NL)) {
    if (d.trim().startsWith('import')) continue;
    const m = /(?:^|[(,\s])([A-Za-z_$][\w$]*)\s*:\s*CheckmateConfig/.exec(d);
    if (m && !m[1]!.startsWith('_')) {
      loi.push(`tham số \`${m[1]}\` nhận CheckmateConfig — hàm cần repo phải khai CauHinhCoRepo: ${d.trim()}`);
    }
  }
  return loi;
}

/** Đường đọc cấu hình KHÔNG được mang sẵn một repo nào. */
export function scanSynthesizedRepo(src: string): string[] {
  const loi: string[] = [];
  if (!/repos: \[\],/.test(src)) loi.push('bản mặc định không khai danh sách repo RỖNG');
  for (const d of src.split(NL)) {
    if (/github: '[\w.-]+\/[\w.-]+'/.test(d)) loi.push(`repo hard-code trong đường đọc cấu hình: ${d.trim()}`);
  }
  return loi;
}

/** Màn chính khi chưa có repo: nói đúng chuyện, chỉ đúng đường, và KHÔNG mặc màu hỏng. */
export function scanEmptyStateCopy(src: string): string[] {
  const dau = src.indexOf("app.get('/', async (req, res) => {");
  if (dau < 0) return ['không tìm thấy màn chính — mốc đổi rồi thì phép quét này đang mù'];
  const het = src.slice(dau).indexOf('let prBlock');
  if (het < 0) return ['không tìm thấy cuối nhánh rỗng của màn chính — phép quét này đang mù'];
  const than = src.slice(dau, dau + het);

  const loi: string[] = [];
  if (!/!coRepo\(cfg\)/.test(than)) loi.push('màn chính không có nhánh «chưa kết nối repo nào»');
  if (!than.includes('Chưa kết nối repo nào')) loi.push('nhánh rỗng không nói người dùng đang thiếu gì');
  if (!/href="\/settings"/.test(than)) loi.push('nhánh rỗng không chỉ đường tới chỗ thêm repo');
  // Rỗng và hỏng là hai chuyện: một bản vừa cài chưa hỏng gì cả.
  for (const cam of ['--fail', 'vd-fail', 'btn-danger']) {
    if (than.includes(cam)) loi.push(`nhánh rỗng dùng màu hỏng (${cam}) — vừa cài xong không phải là hỏng`);
  }
  if (/token/i.test(than)) loi.push('nhánh rỗng chạm tới token — chưa có repo thì không có chìa nào để đọc');
  return loi;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('danh sách repo rỗng là trạng thái THẬT (T1 · T2)', () => {
  it('T1.1 — `repos` khai tường minh là rỗng thì đọc ra RỖNG, không repo mặc định', () => {
    expect(resolveRepoShape({ repos: [] } as never).repos).toEqual([]);
  });

  it('T1.2 — cấu hình đời cũ một repo đơn lẻ vẫn được nâng thành danh sách một phần tử', () => {
    // Chiều hại NGƯỢC của change: nghiêng quá tay thì người dùng đời cũ mở lên thấy trắng trơn và mọi
    // đường chấm từ chối. Ở đó người vận hành CÓ khai một repo — ca khác hẳn ca rỗng.
    const ra = resolveRepoShape({ repo: repoGia('cu/doi-cu') } as never);
    expect(ra.repos.map((r) => r.github)).toEqual(['cu/doi-cu']);
    expect(ra.repo?.github).toBe('cu/doi-cu');
  });

  it('T1.3 — cấu hình trắng → rỗng: một bản vừa cài không có repo nào', () => {
    expect(resolveRepoShape({} as never).repos).toEqual([]);
  });

  it('T1.4 — `repos` có phần tử thì giữ nguyên vẹn, không sắp lại, không thêm bớt', () => {
    const ra = resolveRepoShape({ repos: [repoGia('a/one'), repoGia('b/two')] } as never);
    expect(ra.repos.map((r) => r.github)).toEqual(['a/one', 'b/two']);
  });

  it('T1.5 [biên] — trường danh sách CÓ MẶT thì nó là nguồn sự thật, `repo` đời cũ không lấn', () => {
    // Đây đúng chỗ bản cũ gộp hai ca làm một: `luu.repos?.length` cho `undefined` và `[]` cùng một kết
    // quả. Hai ca ấy nói hai điều khác hẳn nhau.
    const ra = resolveRepoShape({ repos: [], repo: repoGia('cu/doi-cu') } as never);
    expect(ra.repos).toEqual([]);
    expect(ra.repo).toBeUndefined();
  });

  it('T2.1 — rỗng: không repo đang chọn, không khung nhìn, không ném', () => {
    const ra = resolveRepoShape({ repos: [] } as never);
    expect(ra.repo_dang_chon).toBe('');
    expect(ra.repo).toBeUndefined();
  });

  it('T2.2 — `repo_dang_chon` trỏ repo đã gỡ mà danh sách còn phần tử → rơi về phần tử đầu (R4.4)', () => {
    const ra = resolveRepoShape({
      repos: [repoGia('a/one'), repoGia('b/two')],
      repo_dang_chon: 'da/bi-go',
    } as never);
    expect(ra.repo_dang_chon).toBe('a/one');
    expect(ra.repo?.github).toBe('a/one');
  });
});

describe('gác repo-đã-khai — MỘT chỗ trả lời (T3)', () => {
  const daKhai = [repoGia('a/one'), repoGia('b/two')];

  it('T3.1 — khớp → true; không khớp → false', () => {
    expect(laRepoDaKhai(daKhai, 'b/two')).toBe(true);
    expect(laRepoDaKhai(daKhai, 'x/khac')).toBe(false);
  });

  it('T3.2 — khác hoa thường vẫn khớp, và trả về ĐÚNG chính tả đã khai', () => {
    // GitHub coi `Owner/Repo` và `owner/repo` là một. Trả về chính tả đã khai chứ không phải chính tả
    // người ngoài gửi tới: tên trong payload là dữ liệu ngoài, nó không được quyết cách hệ thống tự xưng.
    expect(laRepoDaKhai(daKhai, 'A/ONE')).toBe(true);
    expect(timRepoDaKhai(['a/one', 'b/two'], '  B/Two ')).toBe('b/two');
  });

  it('T3.3 — danh sách rỗng → false với mọi tên', () => {
    for (const ten of ['a/one', 'b/two', 'bat/ky']) expect(laRepoDaKhai([], ten)).toBe(false);
  });

  it('T3.4 [đầu vào khuyết] — null · rỗng · sai kiểu → false, KHÔNG ném', () => {
    for (const ds of [null, undefined, [] as never]) {
      for (const ten of ['a/one', '', null, undefined, 123, {}]) {
        expect(() => laRepoDaKhai(ds, ten)).not.toThrow();
        expect(laRepoDaKhai(ds, ten)).toBe(false);
      }
    }
    expect(timRepoDaKhai(daKhai.map((r) => (r as { github: string }).github), '')).toBeUndefined();
  });
});

describe('ràng buộc «phải có repo» do KIỂU cưỡng chế (T4)', () => {
  it('T4.1 — qua `coRepo` rồi thì khung nhìn dùng được, không phải kiểm lại', () => {
    const co = resolveRepoShape({ repos: [repoGia('a/one')] } as never) as never;
    const khong = resolveRepoShape({ repos: [] } as never) as never;
    expect(coRepo(co)).toBe(true);
    expect(coRepo(khong)).toBe(false);
    if (coRepo(co)) expect(co.repo.github).toBe('a/one'); // `tsc` cho phép đọc thẳng ở đây, và CHỈ ở đây
  });

  it('T4.2 — mọi hàm cần repo ở `github.ts` khai điều đó trong CHỮ KÝ', () => {
    // 9 chữ ký. Ràng buộc này do trình biên dịch nhớ hộ, vì có hơn 50 chỗ đọc repo đang chọn và một điều
    // kiện phải nhớ ở 47 chỗ thì sẽ có ngày quên — ngày đó không có lỗi nào nổ ra.
    expect(scanRepoTypedSignatures(GITHUB)).toEqual([]);
  });

  it('T4.2 [fixture đối kháng] — hàm nhận `CheckmateConfig` rồi đọc repo thì lưới ĐỎ', () => {
    const xau = ['export async function listPrs(cfg: CheckmateConfig): Promise<PrSummary[]> {', '  return cfg.repo.github;', '}'].join(NL);
    expect(scanRepoTypedSignatures(xau)).toHaveLength(1);
    expect(scanRepoTypedSignatures(xau)[0]).toContain('cfg');
  });

  it('T4.2 [fixture đối chứng] — tham số KHÔNG dùng (`_cfg`) được miễn, không báo động giả', () => {
    const tot = [
      'export async function listPrs(cfg: CauHinhCoRepo): Promise<PrSummary[]> {',
      '  return goiApi(null, `/repos/${cfg.repo.github}/pulls`);',
      '}',
      'async function goiApiGhi(_cfg: CheckmateConfig, method: string): Promise<unknown> {',
      '  return method;',
      '}',
    ].join(NL);
    expect(scanRepoTypedSignatures(tot)).toEqual([]);
  });
});

describe('ba đường một gác (T5)', () => {
  /** Cửa webhook trả về repo nó sẽ chấm, hoặc null. */
  const cuaWebhook = (daKhai: readonly string[], ten: string): string | null => {
    const kq = decideWebhookAction(
      'pull_request',
      {
        action: 'opened',
        number: 7,
        repository: { full_name: ten },
        pull_request: { head: { sha: 'abcdef1234567' } },
      },
      daKhai,
    );
    return kq.lam === 'cham' ? kq.repo : null;
  };

  /** Cửa trực và cửa bấm tay đọc cùng cấu hình; cả hai chỉ chạm repo ĐANG CHỌN. */
  const cauHinh = (daKhai: readonly string[], chon: string) =>
    resolveRepoShape({ repos: daKhai.map(repoGia), repo_dang_chon: chon } as never) as never;
  const cuaTruc = (daKhai: readonly string[], ten: string): string | null => {
    const c = cauHinh(daKhai, ten);
    return coRepo(c) && laRepoDaKhai(c.repos, c.repo.github) ? c.repo.github : null;
  };
  const cuaBamTay = (daKhai: readonly string[], ten: string): string | null => {
    const c = cauHinh(daKhai, ten);
    return coRepo(c) ? c.repo.github : null;
  };

  it('T5.1 — cùng đầu vào, ba đường CÙNG một câu trả lời', () => {
    // Ca này là thứ biến «dùng chung một gác» từ lời hứa thành tính chất. Bộ đầu vào phủ cả khớp, khác
    // hoa thường, và rỗng — ba chỗ mà một biểu thức dựng riêng sẽ lệch.
    for (const [daKhai, ten] of [
      [['a/one'], 'a/one'],
      [['a/one', 'b/two'], 'b/two'],
      [['a/one'], 'A/ONE'],
      [[], 'a/one'],
      [[], ''],
    ] as [string[], string][]) {
      const w = cuaWebhook(daKhai, ten);
      expect([w, cuaTruc(daKhai, ten), cuaBamTay(daKhai, ten)], `đầu vào ${JSON.stringify([daKhai, ten])}`).toEqual([
        w,
        w,
        w,
      ]);
    }
  });

  it('T5.1 [cửa song sinh] — webhook HỎI gác chung, không dựng biểu thức riêng', () => {
    expect(scanSharedRepoGate(WEBHOOK)).toEqual([]);
  });

  it('T5.1 [fixture đối kháng] — webhook so bằng biểu thức của riêng nó thì lưới ĐỎ', () => {
    const xau = ['  const khop = repoDaKhai.includes(repo) ? repo : undefined;', "  if (!khop) return { lam: 'tu_choi' };"].join(NL);
    expect(scanSharedRepoGate(xau).length).toBeGreaterThan(0);
  });

  it('T5.2 · T5.3 — cửa trực và cửa bấm tay đều qua gác TRƯỚC khi khởi lượt chấm', () => {
    expect(scanEntryGates(SERVER)).toEqual([]);
  });

  it('T5.2 [fixture đối kháng] — gỡ gác ở cửa trực thì lưới ĐỎ, và nêu tên cửa', () => {
    const xau = [
      'setInterval(() => {',
      '  const cfg = readConfig();',
      '  if (!cfg.truc.bat || dangQuet) return;',
      '  const kq = await chamPr(cfg, p.so);',
      '});',
      "app.post('/api/runs', async (req, res) => {",
      '  if (!coRepo(cfg)) return res.status(409).json({});',
      '  const pr = fetchAndRoute(cfg, soPr);',
      '});',
    ].join(NL);
    expect(scanEntryGates(xau)).toHaveLength(1);
    expect(scanEntryGates(xau)[0]).toContain('chế độ trực');
  });

  it('T5.3 [fixture đối kháng] — gác đứng SAU lời gọi khởi chạy cũng ĐỎ, không chỉ gác vắng mặt', () => {
    // Vế này quan trọng hơn vế «vắng mặt»: một gác đặt sai chỗ vẫn làm mọi phép `toContain` xanh, trong
    // khi lượt chấm đã chạy xong từ dòng trước.
    const xau = [
      'setInterval(() => {',
      '  if (!cfg.truc.bat || dangQuet) return;',
      '  if (!coRepo(cfg) || !laRepoDaKhai(cfg.repos, cfg.repo.github)) return;',
      '  const kq = await chamPr(cfg, p.so);',
      '});',
      "app.post('/api/runs', async (req, res) => {",
      '  const pr = fetchAndRoute(cfg, soPr);',
      '  if (!coRepo(cfg)) return res.status(409).json({});',
      '});',
    ].join(NL);
    expect(scanEntryGates(xau)).toHaveLength(1);
    expect(scanEntryGates(xau)[0]).toContain('bấm tay');
  });

  it('T5.4 — webhook: payload hợp lệ nhưng chưa khai repo nào → TỪ CHỐI', () => {
    const kq = decideWebhookAction(
      'pull_request',
      { action: 'opened', number: 7, repository: { full_name: 'a/one' }, pull_request: { head: { sha: 'abcdef1' } } },
      [],
    );
    expect(kq.lam).toBe('tu_choi');
  });
});

describe('bề mặt khi chưa có repo (T6)', () => {
  it('T6.1 · T6.3 — màn chính nói đúng chuyện, chỉ đúng đường, không mặc màu hỏng', () => {
    expect(scanEmptyStateCopy(SERVER)).toEqual([]);
  });

  it('T6.1 [fixture đối kháng] — nhánh rỗng thiếu lối đi, hoặc mặc màu FAIL, thì lưới ĐỎ', () => {
    const xau = [
      "app.get('/', async (req, res) => {",
      '  if (!coRepo(cfg)) {',
      "    return res.send('<div class=\"vd-fail\">Chưa kết nối repo nào</div>');",
      '  }',
      '  let prBlock;',
      '});',
    ].join(NL);
    const ra = scanEmptyStateCopy(xau);
    expect(ra.length).toBeGreaterThan(0);
    expect(ra.join(' ')).toContain('màu hỏng');
  });

  it('T6.2 — không bề mặt nào bày repo mặc định cũ', () => {
    // Bản cũ có `REPO_DEMO` ngay trong đường đọc cấu hình, nên tên ấy hiện lên như một repo THẬT trên mọi
    // màn — kể cả trên một máy chủ chưa ai khai repo nào.
    expect(scanSynthesizedRepo(CONFIG)).toEqual([]);
    expect(SERVER).not.toContain('demo-credit-approval');
  });

  it('T6.2 [fixture đối kháng] — repo hard-code quay lại đường đọc cấu hình thì lưới ĐỎ', () => {
    const xau = [
      'const REPO_DEMO: RepoConfig = {',
      "  github: 'thangvv111/demo-credit-approval',",
      '};',
      'const MAC_DINH: CheckmateConfig = {',
      '  repos: [REPO_DEMO],',
      '};',
    ].join(NL);
    expect(scanSynthesizedRepo(xau).length).toBeGreaterThan(0);
  });
});

describe('đối kháng & hồi quy (T7)', () => {
  it('T7.2 [đầu vào KHUYẾT mọi tầng] — không hàm nào ném', () => {
    const rac = [
      {},
      { repos: null },
      { repos: 'khong-phai-mang' },
      { repos: [null] },
      { repos: [{}] },
      { repo_dang_chon: 'x/y' },
      { repo: null },
    ];
    for (const luu of rac) {
      expect(() => resolveRepoShape(luu as never), JSON.stringify(luu)).not.toThrow();
      const ra = resolveRepoShape(luu as never) as never;
      expect(() => coRepo(ra)).not.toThrow();
      expect(() => laRepoDaKhai((ra as { repos: never }).repos, 'a/one')).not.toThrow();
    }
  });

  it('T7.2b [đường cứu hộ] — mục repo sai hình dạng bị bỏ và NÓI RA, không làm chết cả bản cài', () => {
    // Ca này sinh từ chính lượt chạy đầu của T7.2: `repos: [null]` làm `readConfig` ném. Ném ở đây thì
    // MỌI màn chết — kể cả màn Cấu hình, đúng lối thoát duy nhất để sửa lại dòng vừa gõ sai. `config.json`
    // là đường cứu hộ sửa tay (⛔C6), nên nó phải chịu được thứ người ta gõ nhầm.
    const keu: string[] = [];
    const cu = console.error;
    console.error = (m: unknown) => void keu.push(String(m));
    try {
      const ra = resolveRepoShape({ repos: [null, repoGia('a/one'), {}] } as never);
      expect(ra.repos.map((r) => r.github)).toEqual(['a/one']);
      expect(ra.repo?.github).toBe('a/one');
    } finally {
      console.error = cu;
    }
    // Bỏ trong im lặng cũng không được: người vừa gõ cần biết dòng của mình không có tác dụng.
    expect(keu.join(' ')).toContain('repos[0]');
    expect(keu.join(' ')).toContain('repos[2]');
  });

  it('T7.3 [biên] — đúng MỘT repo thì mọi đường hoạt động y như trước change', () => {
    const c = resolveRepoShape({ repos: [repoGia('a/one')], repo_dang_chon: 'a/one' } as never) as never;
    expect(coRepo(c)).toBe(true);
    expect(laRepoDaKhai((c as { repos: never }).repos, 'a/one')).toBe(true);
  });
});

describe('trục nhạy cảm', () => {
  it('T_failclosed ⛔C2 — «không biết repo nào» ⇒ TỪ CHỐI, không phải «đoán lấy một»', () => {
    const rong = resolveRepoShape({ repos: [] } as never) as never;
    expect(coRepo(rong)).toBe(false);
    expect(laRepoDaKhai([], 'a/one')).toBe(false);
    expect(
      decideWebhookAction(
        'pull_request',
        { action: 'opened', number: 7, repository: { full_name: 'a/one' }, pull_request: { head: { sha: 'abcdef1' } } },
        [],
      ).lam,
    ).toBe('tu_choi');
  });

  it('T_cong ⛔C1 — gác mới chỉ CHẶN: mọi lời gọi `coRepo` ở server đều ở thế phủ định', () => {
    // Một gác dùng để MỞ (`if (coRepo(cfg)) merge(...)`) là một đường cho máy nói CÓ. Change này không
    // được thêm đường nào như thế, và phép quét dưới đây là chỗ nói điều đó bằng máy.
    const lanGoi = [...SERVER.matchAll(/(.?)coRepo\(/g)];
    expect(lanGoi.length).toBeGreaterThan(0);
    for (const g of lanGoi) expect(g[1], `lời gọi coRepo không ở thế phủ định: ${g[0]}`).toBe('!');
  });

  it('T_bimat ⛔C3 — trạng thái rỗng không chạm tới chìa nào', () => {
    expect(scanEmptyStateCopy(SERVER)).toEqual([]); // nhánh rỗng không đọc token — canh trong chính phép quét
  });

  it('T_hopdong ⛔C5 — export mới khai đủ trong `checkmate.yml`', () => {
    const yml = readFileSync('checkmate.yml', 'utf8');
    for (const ten of ['coRepo', 'laRepoDaKhai', 'timRepoDaKhai']) expect(yml).toContain(ten);
  });
});
