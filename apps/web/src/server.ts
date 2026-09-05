import express from 'express';
import multer from 'multer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SUPPORTED_FORMATS, extractText } from './extract.js';
import { GOC } from '../../../packages/shared/src/paths.js';
import { RunManager, evaluateStartRun, CONCURRENCY_LIMIT } from './runs.js';
import { escHtml, shell, returnedToDevSection, prListSection, homePage, runPage, settingsPage, findingHtml, verdictHtml } from './ui.js';
import {
  SESSION_COOKIE_NAME,
  hasAnyAccount,
  identityIfAny,
  readCookie,
  requireGateRole,
  getIdentity,
  IdentityError,
  verifyPassword,
  createSession,
  deleteSession,
} from './identity.js';
import { buildSessionCookie, evaluateSessionGate, OPEN_PATHS } from './session-gate.js';
import { verifyWebhookSignature, decideWebhookAction } from './webhook.js';
import { readWebhookSecret } from './secret-vault.js';
import { attachSecretGuard } from './response-secret-guard.js';
import { loginPage, type LoginState } from './ui-login.js';
import { probesPage } from './ui-probes.js';

import { type CauHinhCoRepo, LIBRARY_CAP, MODE, PROBE_DEPTH, ProviderConfigErrorCfg, clampToRange, coRepo, laRepoDaKhai, configForReview, currentConfig, maskToken, maskToken2, readConfig, migrateRepoToken, readSubscriptionToken, agentEnv, writeConfig, writeSubscriptionToken } from './config.js';
import { PROVIDER_CATALOG, providerDefinition, validModel, readProviderCheck, writeKey, checkStillValid, type ProviderConfig, type ProviderId, type Method } from './provider.js';
import { REPO_ROOT, slugGithubRepo, findRepo, type RepoConfig } from './config.js';
import { existsSync as coFile } from 'node:fs';
import { join as noiDuong } from 'node:path';
import { providerSection } from './ui-provider.js';
import { repoSection } from './ui-repo.js';
import { cloneRepo, listBranches, listPrs, prState, listReposForToken, closePr, fetchAndRoute, setCommitStatus, checkRepo, getCurrentPr, mergePr, commentPr, splitOwnerRepo, returnToDev } from './github.js';
import { hasToken, readRepoToken, readOwnToken, writeRepoToken, deleteRepoToken } from './secret-vault.js';
import { hasGithubAccess, hasGhCli } from './github.js';
import { renderRuling, renderReceipt, renderAutoVerdict, countBySeverity, reconcileGate, appendGateLedgerEntry, MACHINE_ACTOR_NAME, evaluateMergeLocal, evaluateMergeAgainstPr, evaluateRejectLocal, decideAutomation, decideRerun, type IdentityCheck } from './gate.js';
import { backfillVerdictLedger, readVerdictLedger } from './ledger.js';
import { readVerdictLedger as docSoCaiKho, countVerdictLedger as demSoCaiKho } from './store/ledger-store.js';
import { migrateAll, migrationSummary } from './store/migrate.js';
import { computeProfile } from './trust.js';
import { authorProfilePage, trustPage } from './ui-trust.js';
import { ledgerPage } from './ui-ledger.js';
import { historyPage, type HistoryFilter } from './ui-history.js';
import { docsPage } from './ui-docs.js';
import { readProviderState, tryProvider, type ProviderState } from './model-source.js';
import { chuanMuc } from '../../../packages/shared/src/types.js';

const app = express();
// `github-webhook` D1 — raw body CHỈ cho đường webhook, mounted theo đường và đặt TRƯỚC `express.json`.
// HMAC phải tính trên đúng chuỗi byte đã nhận: `JSON.parse` rồi dựng lại cho ra chuỗi khác (thứ tự khoá,
// khoảng trắng, cách thoát unicode), nên chữ ký không bao giờ khớp — và người dựng sẽ bị cám dỗ nới phép
// kiểm cho nó khớp, tức mở đúng cái cửa mình vừa dựng để đóng.
//
// Cách kia (`express.json({ verify })`) bắt MỌI request giữ thêm một bản body trong bộ nhớ, kể cả request
// mang mật khẩu đăng nhập — giữ dữ liệu nhạy cảm lâu hơn cần, cho một tính năng dùng nó ở đúng một đường.
app.use('/api/webhook/github', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(express.json({ limit: '300kb' }));

// ---- Đăng nhập và chặn cửa (specs/R11) ----

app.use((req, res, next) => {
  const qd = evaluateSessionGate({
    path: req.path,
    hasSession: identityIfAny(req) !== null,
    method: req.method,
    originalUrl: req.originalUrl,
  });
  if (qd.pass) return next();
  if (qd.as === 'json') return res.status(qd.status).json(qd.body);
  return res.redirect(qd.status, qd.to);
});

/**
 * Gác bí mật ở bề mặt response (`response-secret-guard`). Đứng SAU gác phiên: response chỉ tồn tại khi
 * request đã qua xác thực. Bọc cả đường trả JSON lẫn luồng sự kiện — luồng sự kiện là bề mặt dễ quên nhất
 * vì nó không đi qua `res.json`, mà nó đúng là đường phát log của lượt chấm.
 */
app.use(attachSecretGuard);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/login', (req, res) => {
  if (identityIfAny(req)) return res.redirect(303, '/');
  const q = req.query as Record<string, string>;
  const trangThai: LoginState = !hasAnyAccount()
    ? 'chua_co_tai_khoan'
    : q.het === '1'
      ? 'phien_het_han'
      : q.sai === '1'
        ? 'sai_mat_khau'
        : 'moi';
  res.send(loginPage({ trangThai, tiep: internalPath(q.tiep) }));
});

app.post('/login', (req, res) => {
  const b = req.body as Record<string, string>;
  const dt = verifyPassword((b.ten ?? '').trim(), b.mk ?? '');
  if (!dt) {
    // Cùng một câu cho sai tên lẫn sai mật khẩu (R11.10)
    const tiep = internalPath(b.tiep);
    return res.redirect(303, `/login?sai=1${tiep ? `&tiep=${encodeURIComponent(tiep)}` : ''}`);
  }
  const { token, hetHan } = createSession(dt.ten);
  res.setHeader('set-cookie', buildSessionCookie(req.headers['x-forwarded-proto'], SESSION_COOKIE_NAME, token, hetHan));
  res.redirect(303, internalPath(b.tiep) || '/');
});

app.post('/logout', (req, res) => {
  // R11.13 — xoá phiên ở PHÍA MÁY CHỦ; xoá mỗi cookie là để lại một token còn sống
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (token) deleteSession(token);
  res.setHeader('set-cookie', buildSessionCookie(req.headers['x-forwarded-proto'], SESSION_COOKIE_NAME, '', new Date(0)));
  res.redirect(303, '/login');
});

/**
 * Chỉ nhận đường NỘI BỘ cho tham số quay-lại. Không lọc thì `?tiep=https://kẻ-xấu` biến trang đăng
 * nhập của chính mình thành bàn đạp chuyển hướng — người dùng thấy tên miền quen, bấm, rồi bị đá đi nơi khác.
 */
export function internalPath(x: unknown): string {
  const s = typeof x === 'string' ? x.trim() : '';
  return /^\/[^/\\]/.test(s) ? s : '';
}

const rm = new RunManager();
const TMP_DOC = join(GOC, 'web-runs', 'tmp');
mkdirSync(TMP_DOC, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
{
  // Di trú dữ liệu đời file sang cơ sở dữ liệu (specs/R9.7) — chạy đúng một lần, file gốc giữ nguyên
  const tomTat = migrationSummary(migrateAll());
  if (tomTat) console.log(`Di trú sang cơ sở dữ liệu — ${tomTat}`);
  const them = backfillVerdictLedger(rm.danhSach({ gioi_han: 500 }));
  if (them > 0) console.log(`Sổ cái verdict: backfill ${them} lượt chấm cũ vào sổ`);
}

/**
 * Hỏi lại head pull request trong lúc lượt chấm chạy.
 *
 * Head đổi giữa chừng thì verdict sắp ra đời đã hết hiệu lực ở cổng. Trước đây người dùng chỉ biết
 * điều đó SAU KHI đã bấm Merge và nhận 409 — hệ an toàn nhưng không trung thực sớm. Nay nói ra ngay.
 *
 * Lượt chấm VẪN CHẠY TỚI HẾT (PO chốt): dừng giữa chừng là vứt phần việc gần xong, mà verdict trên
 * commit cũ vẫn còn giá trị đọc — phần lớn finding vẫn đúng với mã nguồn.
 *
 * 30 giây là đủ: lượt trung vị 3,6 phút thì chậm nhất nửa phút. Webhook rút xuống ~1s, tức lợi thêm
 * dưới 29 giây — không đáng đổi lấy một cửa vào không-xác-thực (nợ 8.4 của change).
 */
const NHIP_HOI_HEAD_MS = 30_000;

function theoDoiHead(id: string, soPr: number): void {
  const ghim = rm.headDangGhim(id);
  if (!ghim) return;
  const h = setInterval(() => {
    if (!rm.dangChay(id)) return clearInterval(h);
    void (async () => {
      try {
        const cfgH = readConfig();
        if (!coRepo(cfgH)) return clearInterval(h);
        const nay = await getCurrentPr(cfgH, soPr);
        if (nay.headSha && nay.headSha !== ghim && rm.ghiHeadDoi(id, nay.headSha)) {
          console.log(`PR #${soPr}: head đổi giữa lượt chấm ${id} (${ghim.slice(0, 7)} → ${nay.headSha.slice(0, 7)})`);
          clearInterval(h);
        }
      } catch {
        // GitHub hỏng thì THÔI, đừng làm sập lượt chấm: đây là lớp NÓI, không phải lớp chặn — ba lớp
        // ghim SHA ở đường ghi vẫn nguyên và vẫn từ chối merge nếu head đã đổi.
      }
    })();
  }, NHIP_HOI_HEAD_MS);
  h.unref?.();
}

// ---- Chế độ trực (B4.3): hook run-xong + poller ----
rm.onXong = (meta) => {
  const cfg = readConfig();
  // Ba việc tự động đều gọi GitHub trên repo đang chọn. Không có repo thì không có gì để gọi — và
  // đây là đường MÁY tự chạy, nên nó phải im chứ không được đoán.
  if (!coRepo(cfg)) return;
  if (!meta.pr || !meta.verdict) return;
  const v = meta.verdict;
  const pr = meta.pr;
  const d = countBySeverity(v.findings);
  // Ba việc tự động quyết ở hàm thuần `decideAutomation` (gate.ts): ba công tắc riêng (R6.15), đóng PR chỉ
  // khi FAIL có high (R6.17), và kiểu trả về KHÔNG có nhánh merge (R6.19, ⛔C1).
  const tuDong = decideAutomation(cfg.truc, v);
  const dangDongPr = tuDong.closePr;
  void (async () => {
    // R6.16 — đăng verdict KHÔNG giới hạn ở chế độ trực: lượt bấm tay cũng sinh verdict, và người viết
    // code cũng cần đọc finding ở đúng chỗ họ làm việc.
    if (tuDong.comment) {
      try {
        await commentPr(cfg, pr.so, renderAutoVerdict(v));
        console.log(`Tự động: đã đăng verdict ${v.result} lên PR #${pr.so}`);
      } catch (e) {
        console.error('Tự động (đăng verdict):', (e as Error).message);
      }
    }
    // Ba việc là ba công tắc riêng (R6.15) nên cũng là ba khối try riêng: đăng comment hỏng không được
    // kéo theo việc gắn trạng thái, và cả hai hỏng cũng không được che mất việc trả về dev.
    if (tuDong.commitStatus) {
      try {
        await setCommitStatus(cfg, pr.headSha, v.result === 'PASS' ? 'success' : 'failure',
          v.result === 'PASS' ? 'CheckMate: PASS' : `CheckMate: FAIL — ${v.findings.length} finding`);
      } catch (e) {
        console.error('Tự động (gắn trạng thái commit):', (e as Error).message);
      }
    }
    if (!dangDongPr) return;
    try {
      // R6.18 — ghi sổ bằng danh tính của TÁC NHÂN MÁY, không mượn tên người: sổ kiểm toán phải phân
      // biệt «người trả về» với «máy trả về», hai chuyện có mức trách nhiệm khác nhau.
      const nguoi = MACHINE_ACTOR_NAME;
      await closePr(cfg, pr.so);
      let kenh: 'review' | 'comment' | 'loi_comment' = 'comment';
      try {
        kenh = await returnToDev(cfg, pr.so, renderRuling(v, 'Trả về tự động: verdict FAIL có finding mức chặn.', true));
      } catch {
        kenh = 'loi_comment';
      }
      // Ghi SỔ trước, rồi bề mặt đọc lại từ sổ (R6.26) — không còn bước đặt giá trị vào bề mặt.
      appendGateLedgerEntry({ hanhDong: 'reject', pr: pr.so, sha: pr.headSha, run_id: meta.id, verdict: v.result, nguoi,
        tac_gia_pr: pr.tacGia, kenh, dong_pr: true, tu_dong: true,
        ghi_chu: `tự động trả về — FAIL, ${d.high} finding mức chặn` });
      rm.dongBoCongTuSo(meta.id);
      console.log(`Tự động: đã trả về dev PR #${pr.so} (FAIL, ${d.high} finding mức chặn)`);
    } catch (e) {
      console.error('Tự động (trả về dev):', (e as Error).message);
    }
  })();
};

/** R6.18 — tên ghi vào sổ cho hành động do máy thực hiện. Không mượn tên người dùng nào. */

// Chấm một PR — dùng chung cho nút bấm lẫn poller
async function chamPr(cfg: CauHinhCoRepo, soPr: number): Promise<{ id: string } | { daChamRunId: string }> {
  const pr = fetchAndRoute(cfg, soPr);
  const daCham = rm.findByPr(pr.so, pr.headSha);
  if (daCham) return { daChamRunId: daCham.id };
  let tacGia: string | undefined;
  try { tacGia = (await getCurrentPr(cfg, pr.so)).tacGia; } catch { /* thiếu tác giả không chặn run */ }
  const meta = { so: pr.so, headSha: pr.headSha, tacGia };
  if (pr.loai === 'doc') {
    return { id: rm.batDau(`PR #${pr.so} · tài liệu ${pr.fileDoc}`, 'doc',
      ['--skill', 'doc', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--file', pr.fileDoc!], agentEnv(cfg), meta, cfg.repo.github) };
  }
  // W2: truyền SHA đã pin thay vì tên ref dùng chung — ref bị force-move giữa chừng không đổi được commit bị chấm
  return { id: rm.batDau(`PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`, 'code',
    ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef], agentEnv(cfg), meta, cfg.repo.github) };
}

let dangQuet = false;
let lanQuetCuoi = 0;
/**
 * Đối soát sổ cổng với trạng thái thật của pull request (R6.20–R6.25).
 *
 * Tách hẳn khỏi thân chế độ trực: hàn nó vào trong đó thì máy chỉ chấm bằng tay (`truc.bat = false`,
 * mặc định) sẽ KHÔNG BAO GIỜ đối soát — cuốn sổ im lặng vĩnh viễn ở đúng chỗ nó cần nói (vòng hai
 * của cổng bắt). Nay chạy lúc khởi động và theo nhịp riêng, không phụ thuộc công tắc trực.
 */
async function chayDoiSoat(): Promise<void> {
  // R6.25 — khối try riêng: lỗi đối soát không được làm dừng việc quét và chấm PR.
  try {
    const cfg = readConfig();
    if (!coRepo(cfg)) return; // chưa kết nối repo nào thì không có sổ nào để đối soát
    const ds = await reconcileGate((so, repo) => prState(cfg, so, repo), (m) => console.log(m));
    if (ds.daGhi || ds.loi) console.log(`Đối soát cổng: ghi ${ds.daGhi} hàng ngoài cổng · bỏ qua ${ds.boQua} · lỗi đọc ${ds.loi}`);
  } catch (e) {
    console.error('Đối soát cổng (không ảnh hưởng lượt chấm):', (e as Error).message);
  }
}

// Nhịp đối soát RIÊNG, không phụ thuộc `truc.bat`: sổ phải đúng kể cả trên máy chỉ chấm bằng tay.
setInterval(() => void chayDoiSoat(), 15 * 60 * 1000);

setInterval(() => {
  void (async () => {
    const cfg = readConfig();
    if (!cfg.truc.bat || dangQuet) return;
    // ⛔ Gác repo-đã-khai — CÙNG câu hỏi mà đường webhook hỏi, nay cùng một chỗ trả lời.
    // Trước đây đường này KHÔNG có gác: đo được trên prod, sau khi người vận hành xoá sạch repo thì
    // trực vẫn tự khởi hai lượt chấm trên một repo suy đoán, dựng lại clone và thư viện vừa dọn.
    if (!coRepo(cfg) || !laRepoDaKhai(cfg.repos, cfg.repo.github)) return;
    if (Date.now() - lanQuetCuoi < cfg.truc.chu_ky_giay * 1000) return;
    dangQuet = true;
    lanQuetCuoi = Date.now();
    await chayDoiSoat();
    try {
      const prs = await listPrs(cfg);
      for (const p of prs) {
        // CÙNG hàm thuần với đường bấm tay. `findByPr` giữ nguyên chỗ này vì nó là luật khác («một verdict
        // một commit», merge-gate), không thuộc capability chạy-song-song.
        const cho = evaluateStartRun({ soDangChay: rm.runningCount(), tran: CONCURRENCY_LIMIT, prDangChay: rm.isPrRunning(p.so) });
        if (!cho.chay && cho.lyDo === 'qua_tai') break;
        if (!cho.chay || rm.findByPr(p.so, p.headSha)) continue;
        try {
          const kq = await chamPr(cfg, p.so);
          if ('id' in kq) console.log(`Chế độ trực: tự chấm PR #${p.so} @ ${p.headSha.slice(0, 7)} (run ${kq.id})`);
        } catch (e) {
          // W7: một PR hỏng (diff quá lớn, ref lạ...) không được làm các PR sau nhịn đói
          console.error(`Chế độ trực: PR #${p.so} lỗi — bỏ qua lượt này:`, (e as Error).message.slice(0, 200));
        }
      }
    } catch (e) {
      console.error('Chế độ trực (poller):', (e as Error).message);
    } finally {
      dangQuet = false;
    }
  })();
}, 30_000);

app.get('/', async (req, res) => {
  const cfg = readConfig();
  if (!coRepo(cfg)) {
    // Trạng thái rỗng BÌNH THƯỜNG (vừa cài xong), không phải hỏng — nên nói cách sửa, và không dùng
    // màu FAIL. `giao-dien-ccs` đã khai luật «rỗng và hỏng phải nói hai câu khác nhau».
    return res.send(
      homePage(
        rm.danhSach(),
        `<div class="card" style="max-width:720px"><div class="card-kicker">Chưa kết nối repo nào</div>
<p style="margin:0 0 10px">CheckMate chưa có repo nào để chấm. Thêm repo ở màn Cấu hình — bốn bước: dán đường dẫn repo, dán chìa riêng của nó, kiểm kết nối, chọn nhánh đích.</p>
<a class="btn btn-primary" href="/settings">Vào Cấu hình</a></div>`,
        '',
        ai(req),
      ),
    );
  }
  let prBlock: string;
  try {
    const prs = await listPrs(cfg);
    const kem = prs.map((p) => {
      const daCham = rm.findByPr(p.so, p.headSha);
      // «stale» = CÓ verdict cho PR này nhưng ghim một commit KHÁC head hiện tại. Verdict còn đó,
      // chỉ là nó không còn nói về commit sắp merge — người dùng phải thấy khác «chưa chấm».
      const bacKy = rm.danhSach({ gioi_han: 1000 }).find((m) => m.pr?.so === p.so && m.verdict);
      return {
        ...p,
        daCham: daCham?.verdict
          ? { runId: daCham.id, ketQua: daCham.verdict.result, soFinding: daCham.verdict.findings.length }
          : undefined,
        stale: !daCham?.verdict && !!bacKy,
        dangCham: rm.isPrRunning(p.so),
        skill: (bacKy?.skill ?? daCham?.skill) as "code" | "doc" | undefined,
      };
    });
    prBlock = prListSection(cfg.repo.github, cfg.repo.base_branch, kem, '');
  } catch (e) {
    prBlock = prListSection(cfg.repo.github, cfg.repo.base_branch, null, (e as Error).message.slice(0, 200));
  }
  res.send(homePage(rm.danhSach(), prBlock, returnedToDevSection(rm.returnedToDev(), cfg.repo.github), ai(req), cfg.repo.github));
});

app.get('/docs', (req, res) => {
  res.send(docsPage(ai(req)));
});

app.get('/probes', (req, res) => {
  res.send(probesPage(ai(req)));
});

app.get('/lich-su', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const loc: HistoryFilter = {
    repo: q.repo || undefined,
    verdict: q.verdict || undefined,
    skill: q.skill || undefined,
    ncc: q.ncc || undefined,
    q: q.q || undefined,
    tu: q.tu || undefined,
    den: q.den || undefined,
    trang: Math.max(1, Number(q.trang) || 1),
  };
  const c = readConfig();
  // Bộ lọc nào CÓ CỘT trong bảng thì phải xuống SQL, đừng lọc sau khi đã cắt: nâng trần từ 30 lên
  // 1000 rồi vẫn lọc trong bộ nhớ nghĩa là repo có 300 lượt cũ bị 1000 lượt của repo khác che khuất —
  // trang báo "không có lượt chấm nào" trong khi dữ liệu vẫn nằm nguyên trong cơ sở dữ liệu (R9.10).
  // Các bộ lọc còn lại (verdict, nhà cung cấp, tìm chữ) không có cột riêng nên vẫn lọc sau, nhưng nay
  // là lọc trên tập ĐÃ thu hẹp đúng repo.
  res.send(
    historyPage(
      rm.danhSach({ repo: loc.repo || undefined, skill: loc.skill === 'code' || loc.skill === 'doc' ? loc.skill : undefined, gioi_han: 1000 }),
      loc,
      c.repos.map((r) => r.github),
      ai(req),
    ),
  );
});

// Tên người đang đăng nhập, để header hiện ô danh tính. Không có phiên thì trả chuỗi rỗng và
// header hiện nhãn chung — thà nói «Tài khoản» còn hơn bịa ra một cái tên.
const ai = (req: Parameters<typeof identityIfAny>[0]): string => identityIfAny(req)?.ten ?? '';

// Danh sách repo để đổ vào ô lọc của sổ cái / tin cậy / lịch sử
const dsRepo = (): string[] => readConfig().repos.map((r) => r.github);

app.get('/ledger', (req, res) => {
  const repo = String(req.query.repo ?? '') || undefined;
  const congTheoRun = new Map<string, string>();
  // Lọc repo xuống SQL ở CẢ hai nguồn, kẻo trang lọc ra rỗng khi repo cần xem nằm ngoài 1000 lượt mới nhất
  for (const m of rm.danhSach({ repo, gioi_han: 1000 })) {
    if (m.ketQuaCong) congTheoRun.set(m.id, `${m.ketQuaCong.hanhDong === 'merge' ? 'đã merge' : 'trả về dev'} · ${m.ketQuaCong.nguoi}`);
  }
  res.send(ledgerPage(docSoCaiKho(repo ? { repo } : {}), congTheoRun, dsRepo(), repo, ai(req)));
});

app.get('/tin-cay', (req, res) => {
  // Lọc theo repo TRƯỚC khi tính hồ sơ: track record của một người ở repo này không nói thay cho repo khác
  const locRepo = String(req.query.repo ?? '') || undefined;
  const soCai = locRepo ? readVerdictLedger().filter((m) => (m.repo ?? '') === locRepo) : readVerdictLedger();
  res.send(trustPage(computeProfile(soCai), dsRepo(), locRepo, ai(req)));
});

app.get('/tin-cay/:tacGia', (req, res) => {
  const locRepo = String(req.query.repo ?? '') || undefined;
  const soCai = locRepo ? readVerdictLedger().filter((m) => (m.repo ?? '') === locRepo) : readVerdictLedger();
  const tacGia = req.params.tacGia;
  const hoSo = computeProfile(soCai).find((h) => h.tacGia === tacGia);
  res.send(authorProfilePage(tacGia, hoSo, soCai.filter((m) => m.tac_gia === tacGia && m.pr), locRepo, ai(req)));
});

app.get('/settings', (req, res) => {
  const c = readConfig();
  const trangThai: Record<string, ProviderState> = {};
  for (const dn of PROVIDER_CATALOG) trangThai[dn.ma] = readProviderState(dn.ma);
  res.send(
    settingsPage({
      mode: MODE,
      // ⛔ Màn Cấu hình phải mở được KHI CHƯA CÓ REPO — đó chính là nơi người ta vào để thêm repo.
      // Chặn nó bằng một gác là khoá người dùng ra khỏi lối thoát duy nhất.
      repoGithub: c.repo?.github ?? '',
      baseBranch: c.repo?.base_branch ?? '',
      localPath: c.repo?.local_path ?? '',
      tokenChe: c.repo ? maskToken(readRepoToken(c.repo.github)) : '',
      khoiRepoHtml: repoSection({
        repos: c.repos.map((r) => ({
          ...r,
          co_token: hasToken(r.github),
          token_rieng: Boolean(readOwnToken(r.github)),
          co_gh: hasGhCli(),
          // Bản che DÙNG CHUNG, không tự cắt chuỗi tại chỗ (⛔C3): bản che thứ hai luôn là bản lệch, và
          // che trần theo độ dài thì hai repo dùng nhầm chìa của nhau nhìn giống hệt.
          token_che: readOwnToken(r.github) ? maskToken2(readOwnToken(r.github)) : '',
          // Đọc từ bảng `run` — rẻ và luôn có. Cố ý KHÔNG gọi GitHub để lấy «PR chờ»: màn Cấu hình
          // phải mở được cả khi mạng hỏng — đó là màn người ta vào để SỬA khi có gì đó hỏng.
          lan_cham_cuoi: rm.danhSach({ repo: r.github, gioi_han: 1 })[0]?.batDau,
        })),
        dangChon: c.repo_dang_chon,
        hasToken: c.repo ? hasToken(c.repo.github) : false,
        moKhoa: MODE === 'org',
      }),
      khoiNccHtml: providerSection({
        dangDung: c.agent.ncc,
        cauHinh: c.agent.ncc_cau_hinh,
        trangThai,
        soKiem: readProviderCheck(),
        tokenThueBaoChe: maskToken2(readSubscriptionToken()),
        moKhoa: MODE === 'org',
      }),
      maxProbe: c.agent.max_probe,
      tranThuVien: c.agent.tran_thu_vien ?? LIBRARY_CAP.mac_dinh,
      skeptic: c.agent.skeptic,
      trucBat: c.truc.bat,
      trucChuKy: c.truc.chu_ky_giay,
      trucComment: c.truc.tu_dong_comment,
      trucTrangThai: c.truc.tu_dong_trang_thai,
      trucTraVe: c.truc.tu_dong_tra_ve,
      daLuu: req.query.luu === '1',
    }, ai(req)),
  );
});

app.post('/settings', (req, res) => {
  if (MODE === 'demo') return res.status(403).send(shell('CheckMate', '<h1>403</h1><p class="sub">Chế độ demo không cho sửa cấu hình. <a href="/settings">← quay lại</a></p>'));
  const b = req.body as Record<string, string>;
  const c = readConfig();
  if (!coRepo(c)) return res.status(409).send(shell('CheckMate', '<h1>Chưa kết nối repo nào</h1><p class="sub">Thêm repo ở khối «Repo đã kết nối» trước đã. <a href="/settings">← quay lại</a></p>'));
  // Sửa thông tin của repo ĐANG CHỌN; thêm/gỡ repo đi đường riêng (/api/repo/*)
  const tenCu = c.repo.github;
  const repoSua: RepoConfig = {
    ...c.repo,
    github: (b.repo_github ?? c.repo.github).trim(),
    base_branch: (b.base_branch ?? c.repo.base_branch).trim(),
    local_path: (b.local_path ?? c.repo.local_path).trim(),
  };
  // Kiểm hình dạng TRƯỚC khi chạm vào kho bí mật: ô repo sửa tay được, nên gõ hụt một ký tự là chìa bị
  // ghi vào một khoá không ứng với repo nào — rác nằm lại trong kho, không giao diện nào thấy để gỡ.
  if (!/^[\w.-]+\/[\w.-]+$/.test(repoSua.github)) {
    return res
      .status(422)
      .send(shell('CheckMate', `<h1>Repo không hợp lệ</h1><p class="sub">«${escHtml(repoSua.github)}» phải có dạng owner/tên. <a href="/settings">← quay lại</a></p>`));
  }
  // Đổi tên repo thì chìa phải đi theo, kẻo repo mới thành «thiếu token» còn chìa cũ thành rác mồ côi
  if (repoSua.github !== tenCu) {
    const chiaCu = readOwnToken(tenCu);
    if (chiaCu) {
      writeRepoToken(repoSua.github, chiaCu);
      deleteRepoToken(tenCu);
    }
  }
  // Token dán ở đây là chìa của repo ĐANG CHỌN, không phải chìa dùng chung nữa (R4.18)
  if (b.github_token?.trim()) writeRepoToken(repoSua.github, b.github_token.trim());
  const moi = {
    repos: c.repos.map((r) => (r.github === c.repo.github ? repoSua : r)),
    repo_dang_chon: repoSua.github,
    repo: repoSua,
    github_token: '',
    agent: {
      // Đổi nhà cung cấp ĐANG DÙNG phải đi qua cổng verify (/api/chon-ncc) — form này chỉ lưu cấu hình.
      ncc: c.agent.ncc,
      ncc_cau_hinh: (() => {
        const ra: Partial<Record<ProviderId, ProviderConfig>> = { ...c.agent.ncc_cau_hinh };
        for (const dn of PROVIDER_CATALOG) {
          const pt = b[`pt_${dn.ma}`] as Method | undefined;
          const md = b[`model_${dn.ma}`];
          const cu = ra[dn.ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
          const ptMoi = pt && dn.phuong_thuc.includes(pt) ? pt : cu.phuong_thuc;
          // R5.15 — validate TỔ HỢP (phương thức mới, model mới), không validate rời từng ô: model
          // chỉ-thuê-bao mà lọt vào cấu hình phương thức API là giới hạn chỉ còn là lời dặn.
          ra[dn.ma] = {
            phuong_thuc: ptMoi,
            model: md && validModel(dn, ptMoi, md) ? md : validModel(dn, ptMoi, cu.model) ? cu.model : dn.models.find((m) => validModel(dn, ptMoi, m)) ?? cu.model,
          };
        }
        return ra;
      })(),
      // Kẹp bằng CHÍNH khoảng đã khai — chép tay biên ở đây là cách bốn con số cũ sinh ra.
      max_probe: clampToRange(b.max_probe, PROBE_DEPTH),
      tran_thu_vien: clampToRange(b.tran_thu_vien, LIBRARY_CAP),
      skeptic: b.skeptic === '1',
    },
    truc: {
      bat: b.truc_bat === '1',
      chu_ky_giay: Math.min(3600, Math.max(60, Number(b.truc_chu_ky) || 300)),
      tu_dong_comment: b.truc_comment === '1',
      tu_dong_trang_thai: b.truc_trang_thai === '1',
      tu_dong_tra_ve: b.truc_tra_ve === '1',
    },
  };
  if (!/^[\w.-]+\/[\w.-]+$/.test(repoSua.github)) return res.status(422).send('Repo phải dạng owner/tên');
  // Token gói thuê bao: dán mới thì lưu, bỏ trống thì giữ nguyên cái cũ
  const tokenTb = (b.claude_oauth_token ?? '').trim();
  if (tokenTb) writeSubscriptionToken(tokenTb);
  // Khoá riêng của từng nhà cung cấp: dán mới thì lưu, bỏ trống thì giữ nguyên
  for (const dn of PROVIDER_CATALOG) {
    const k = (b[`khoa_${dn.ma}`] ?? '').trim();
    if (k) writeKey(dn.ma, k);
  }
  writeConfig(moi);
  res.redirect(303, '/settings?luu=1');
});

// ---- Quản lý repo (đa repo) ----

// Liệt kê repo mà token nhìn thấy — người dùng CHỌN từ danh sách thay vì gõ tay owner/repo
// POST chứ không GET: chìa đi trong THÂN yêu cầu, không đi trong URL. Query string nằm lại trong
// access log của nginx, trong lịch sử trình duyệt và trong Referer gửi sang trang khác — dán token
// vào đó là rò chìa ra ba chỗ mà không ai kịp thấy (R4.19, R9.17).
app.post('/api/github/repos', async (req, res) => {
  const c = readConfig();
  // Đường này dùng ĐỂ thêm repo đầu tiên, nên nó phải chạy khi chưa có repo nào: chìa lấy từ thân
  // yêu cầu, chỉ rơi về chìa của repo đang chọn khi thật sự có một repo đang chọn.
  const token = String((req.body as { token?: string }).token ?? '').trim() || (c.repo ? readRepoToken(c.repo.github) : '');
  try {
    const ds = await listReposForToken(token);
    const daCo = new Set(c.repos.map((r) => r.github.toLowerCase()));
    res.json(ds.map((r) => ({ ...r, da_them: daCo.has(r.full_name.toLowerCase()) })));
  } catch (e) {
    // Không token + không gh CLI: nói thẳng cách sửa thay vì ném lỗi kỹ thuật
    const m = (e as Error).message;
    res.status(500).json({
      loi: /ENOENT|not found/i.test(m)
        ? 'Chưa có GitHub token, và máy này cũng không có lệnh `gh`. Dán token vào bước 2 rồi kiểm kết nối.'
        : m.slice(0, 300),
    });
  }
});

/**
 * Bước 1–3 của luồng thêm repo (R4.22–R4.24): nhận URL người dùng dán + token, gọi THẬT
 * `GET /repos/{owner}/{repo}` rồi trả về nhánh để bước 4 chọn. Không ghi gì xuống đĩa — kiểm xong mà
 * người dùng bỏ dở thì không để lại chìa mồ côi.
 */
app.post('/api/repo/kiem', async (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho thêm repo.' });
  const b = req.body as { url?: string; token?: string };
  const github = splitOwnerRepo(b.url ?? '');
  if (!github) {
    return res.status(422).json({
      ok: false,
      ly_do: 'khong_thay',
      thong_diep: 'Không đọc được đường dẫn repo. Dán URL trên thanh địa chỉ GitHub (https://github.com/owner/repo) hoặc gõ owner/repo.',
    });
  }
  const c = readConfig();
  if (findRepo(c, github)) return res.status(409).json({ ok: false, thong_diep: `${github} đã có trong danh sách.` });
  const kq = await checkRepo(github, (b.token ?? '').trim() || readRepoToken(github));
  if (!kq.ok) return res.status(200).json({ ...kq, github });
  const nhanh = await listBranches(kq.github ?? github, (b.token ?? '').trim() || readRepoToken(github));
  res.json({ ...kq, github: kq.github ?? github, nhanh });
});

// Bước 4: clone về thư mục CheckMate quản rồi ghi vào danh sách
app.post('/api/repo/them', async (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho thêm repo.' });
  const b = req.body as { github?: string; base_branch?: string; token?: string };
  const github = splitOwnerRepo(b.github ?? '');
  if (!github) return res.status(422).json({ ok: false, loi: 'Repo phải dạng owner/tên' });
  const c = readConfig();
  if (findRepo(c, github)) return res.status(409).json({ ok: false, loi: `${github} đã có trong danh sách.` });
  const token = (b.token ?? '').trim();
  const daCoChiaTruoc = Boolean(readOwnToken(github));
  const dich = noiDuong(REPO_ROOT, slugGithubRepo(github));
  try {
    // Ghi chìa TRƯỚC khi clone: clone repo riêng tư cần chìa, và nếu clone hỏng thì bước sau vẫn có
    // chìa để thử lại — người dùng không phải dán token lần hai.
    if (token) writeRepoToken(github, token);
    if (!coFile(dich)) {
      mkdirSync(REPO_ROOT, { recursive: true });
      cloneRepo(github, dich, token || undefined);
    }
    const moi: RepoConfig = {
      github,
      base_branch: (b.base_branch ?? 'main').trim() || 'main',
      local_path: dich,
      truc: false,
      them_luc: new Date().toISOString(),
    };
    writeConfig({ ...c, repos: [...c.repos, moi], repo_dang_chon: github, repo: moi });
    res.json({ ok: true, repo: moi });
  } catch (e) {
    // Clone hỏng thì repo KHÔNG vào danh sách — chìa vừa ghi ở trên trở thành chìa của một repo không
    // tồn tại trong cấu hình, không giao diện nào thấy để mà gỡ. Trả kho về đúng trạng thái trước đó.
    if (token && !daCoChiaTruoc) deleteRepoToken(github);
    res.status(500).json({ ok: false, loi: `Không clone được ${github}: ${(e as Error).message.slice(0, 300)}` });
  }
});

// Đặt / đổi / xoá chìa riêng của MỘT repo (R4.18). Token gửi rỗng = gỡ chìa riêng, repo rơi về
// chìa chung của môi trường nếu có, không thì thành "thiếu token".
app.post('/api/repo/token', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho sửa cấu hình.' });
  const b = req.body as { github?: string; token?: string };
  const github = (b.github ?? '').trim();
  const c = readConfig();
  if (!findRepo(c, github)) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  const token = (b.token ?? '').trim();
  if (!token) {
    deleteRepoToken(github);
    return res.json({ ok: true, co_token: hasToken(github) });
  }
  writeRepoToken(github, token);
  res.json({ ok: true, co_token: true });
});

// Đổi repo đang chọn (repo switcher)
app.post('/api/repo/chon', (req, res) => {
  const github = ((req.body as { github?: string }).github ?? '').trim();
  const c = readConfig();
  const r = findRepo(c, github);
  if (!r) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho đổi repo.' });
  writeConfig({ ...c, repo_dang_chon: r.github, repo: r });
  res.json({ ok: true, repo: r });
});

// Gỡ repo khỏi danh sách (KHÔNG xoá clone trên đĩa — dữ liệu lịch sử vẫn tra được)
app.post('/api/repo/go', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho gỡ repo.' });
  const github = ((req.body as { github?: string }).github ?? '').trim();
  const c = readConfig();
  if (c.repos.length <= 1) return res.status(409).json({ ok: false, loi: 'Phải giữ ít nhất một repo.' });
  const conLai = c.repos.filter((r) => r.github !== github);
  if (conLai.length === c.repos.length) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  const chon = c.repo_dang_chon === github ? conLai[0].github : c.repo_dang_chon;
  writeConfig({ ...c, repos: conLai, repo_dang_chon: chon, repo: conLai.find((r) => r.github === chon) ?? conLai[0] });
  // R4.27 — clone và lịch sử thì giữ (R4.7), chìa thì không: chìa của repo đã gỡ nằm lại là rác có hại
  deleteRepoToken(github);
  res.json({ ok: true });
});

// Kiểm một nhà cung cấp — bấm nút trong Cấu hình, biết ngay thay vì chạy cả lượt chấm mới lộ lỗi.
app.post('/api/thu-ncc', async (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, thong_diep: 'Chế độ demo không cho kiểm nhà cung cấp.', giay: 0 });
  const ma = (req.body as { ncc?: ProviderId }).ncc;
  if (!ma || !PROVIDER_CATALOG.some((d) => d.ma === ma)) return res.status(422).json({ ok: false, thong_diep: 'Nhà cung cấp không hợp lệ', giay: 0 });
  const c = readConfig();
  const dn = providerDefinition(ma);
  const cfg = c.agent.ncc_cau_hinh[ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
  try {
    res.json(await tryProvider(ma, cfg));
  } catch (e) {
    res.status(500).json({ ok: false, giay: 0, thong_diep: (e as Error).message.slice(0, 300) });
  }
});

// CỔNG: chỉ nhà cung cấp đã kiểm THÀNH CÔNG với đúng cấu hình hiện tại mới được chọn để chấm.
app.post('/api/chon-ncc', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, thong_diep: 'Chế độ demo không cho đổi nhà cung cấp.' });
  const ma = (req.body as { ncc?: ProviderId }).ncc;
  if (!ma || !PROVIDER_CATALOG.some((d) => d.ma === ma)) return res.status(422).json({ ok: false, thong_diep: 'Nhà cung cấp không hợp lệ' });
  const c = readConfig();
  const dn = providerDefinition(ma);
  const cfg = c.agent.ncc_cau_hinh[ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
  const kiem = checkStillValid(ma, cfg);
  if (!kiem) {
    return res.status(409).json({
      ok: false,
      thong_diep: `Chưa kiểm thành công ${dn.ten} với model ${cfg.model} / ${cfg.phuong_thuc === 'thue_bao' ? 'gói thuê bao' : 'API'} — bấm Kiểm tra trước đã.`,
    });
  }
  writeConfig({ ...c, agent: { ...c.agent, ncc: ma } });
  res.json({ ok: true, thong_diep: `Đã chuyển sang ${dn.ten} (${cfg.model})` });
});

/**
 * Webhook GitHub — `github-webhook`.
 *
 * CỬA VÀO KHÔNG XÁC THỰC NGƯỜI DÙNG duy nhất của sản phẩm. Nó nằm trong `OPEN_PATHS`, và sau khi bỏ Basic
 * Auth ở nginx (nợ #4) thì `OPEN_PATHS` là hàng rào duy nhất giữa Internet và ứng dụng.
 *
 * Hai gác ĐỘC LẬP đứng ở đây, và cả hai phải qua:
 *   1. chữ ký HMAC-SHA256 trên RAW BODY   — chứng minh người gửi biết bí mật;
 *   2. repo nằm trong danh sách đã khai   — chứng minh việc này NÊN LÀM.
 * Chữ ký một mình không đủ: bí mật rò được, và một webhook hợp lệ trỏ repo lạ khiến CheckMate clone rồi
 * chạy test của repo chưa ai khai — tức chạy code lạ trên máy chủ (security S4.2).
 *
 * Phản hồi nói LOẠI, log máy chủ nói LÝ DO (D4): trả lời khác nhau cho «chữ ký sai» và «chưa cấu hình bí
 * mật» là nói cho người gửi biết trạng thái bên trong máy chủ.
 */
app.post('/api/webhook/github', (req, res) => {
  // Chế độ chỉ-đọc: chạy một lượt chấm là ghi vào sổ, tiêu token và chiếm trần — không phải chỉ-đọc.
  if (MODE === 'demo') {
    console.error('Webhook: từ chối — chế độ demo không chạy lượt chấm.');
    return res.status(403).json({ ok: false });
  }
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const xac = verifyWebhookSignature(raw, req.get('x-hub-signature-256'), readWebhookSecret());
  if (!xac.ok) {
    // Log nói đủ cho người vận hành; phản hồi thì KHÔNG — người đọc phản hồi có thể là người tấn công.
    console.error(`Webhook: từ chối — ${xac.ly_do}`);
    return res.status(401).json({ ok: false });
  }

  let than: unknown;
  try {
    than = JSON.parse(raw.toString('utf8'));
  } catch {
    console.error('Webhook: từ chối — thân yêu cầu không phải JSON hợp lệ.');
    return res.status(400).json({ ok: false });
  }

  const cfg = readConfig();
  const quyet = decideWebhookAction(req.get('x-github-event'), than, cfg.repos.map((r) => r.github));
  if (quyet.lam === 'bo_qua') {
    // Sự kiện GitHub gửi mà ta không quan tâm là chuyện BÌNH THƯỜNG. Trả lỗi cho nó thì GitHub thử lại vài
    // lần rồi tự tắt webhook — hỏng một đường vào vì một thứ không phải lỗi.
    return res.json({ ok: true, bo_qua: true });
  }
  if (quyet.lam === 'tu_choi') {
    console.error(`Webhook: từ chối — ${quyet.ly_do}`);
    return res.status(422).json({ ok: false });
  }

  // Cấu hình dựng theo repo TRONG PAYLOAD, không theo repo đang chọn: `chamPr` chấm theo `cfg.repo`, nên
  // dùng repo đang chọn thì webhook của repo A khởi lượt chấm trên repo B (D3).
  const repoCfg = findRepo(cfg, quyet.repo);
  if (!repoCfg) {
    console.error(`Webhook: từ chối — repo ${quyet.repo} biến mất khỏi cấu hình giữa chừng.`);
    return res.status(422).json({ ok: false });
  }

  // ĐÚNG cửa điều kiện chạy như đường polling và đường bấm tay — webhook không được là đường tắt.
  const cho = evaluateStartRun({ soDangChay: rm.runningCount(), tran: CONCURRENCY_LIMIT, prDangChay: rm.isPrRunning(quyet.so) });
  if (!cho.chay) {
    console.error(`Webhook: PR #${quyet.so} chưa chạy được — ${cho.lyDo}. Chế độ trực sẽ nhặt lại ở chu kỳ sau.`);
    return res.status(202).json({ ok: true, hoan: true });
  }

  void (async () => {
    try {
      const kq = await chamPr({ ...cfg, repo: repoCfg, repo_dang_chon: repoCfg.github }, quyet.so);
      if ('id' in kq) console.log(`Webhook: chấm PR #${quyet.so} @ ${quyet.headSha.slice(0, 7)} (run ${kq.id})`);
    } catch (e) {
      console.error(`Webhook: PR #${quyet.so} lỗi —`, (e as Error).message.slice(0, 200));
    }
  })();
  res.json({ ok: true });
});

/**
 * Huỷ một lượt ĐANG CHẠY.
 *
 * Đây là route duy nhất trong sản phẩm đi từ HTTP tới `kill` một tiến trình hệ điều hành, nên nó phải
 * đứng sau đủ ba rào: chế độ demo từ chối · pid chỉ lấy từ hàng `run` do chính engine ghi · và phép
 * xác minh dòng lệnh trong `killRunProcess` (pid bị hệ điều hành tái dùng — kill mù là giết một tiến
 * trình vô can của người dùng).
 */
app.post('/api/runs/:id/huy', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho huỷ lượt chấm.' });
  const nguoi = ai(req) || 'không rõ';
  const kq = rm.huyLuot(String(req.params.id), nguoi);
  if (!kq.ok) return res.status(409).json(kq);
  res.json({
    ok: true,
    da_dung_tien_trinh: kq.daDungTienTrinh,
    thong_diep: kq.daDungTienTrinh
      ? 'Đã huỷ lượt chấm và dừng tiến trình.'
      : 'Đã đánh dấu lượt chấm là lỗi, nhưng KHÔNG dừng được tiến trình (không xác minh được đúng tiến trình của lượt này).',
  });
});

app.post('/api/runs', upload.single('tep'), async (req, res) => {
  // Gác TRẦN đứng ở đây, trước cả việc đọc thân yêu cầu: quyết định ở hàm thuần (runs.ts), route dựng lời.
  if (!evaluateStartRun({ soDangChay: rm.runningCount(), tran: CONCURRENCY_LIMIT }).chay) {
    return res
      .status(429)
      .send(shell('CheckMate — đang bận', `<h1>Đang có run chạy</h1><p class="sub">Checker đang bận kiểm ${CONCURRENCY_LIMIT} artifact — chờ xong rồi thử lại. <a href="/">← quay lại</a></p>`));
  }
  const { kieu, preset, noi_dung, so } = req.body as { kieu?: string; preset?: string; noi_dung?: string; so?: string };
  const cfg = readConfig();
  let id: string;
  const muonJson = (req.headers.accept ?? '').includes('application/json');
  if (kieu === 'pr') {
    const soPr = Number(so);
    if (!Number.isInteger(soPr) || soPr <= 0) return res.status(422).send('Số PR không hợp lệ');
    // R4.25 — repo thiếu chìa thì chặn NGAY, đừng khởi chạy rồi chết ở giữa: người dùng mất vài phút
    // chờ và lịch sử có thêm một lượt hỏng, trong khi nguyên nhân đã biết trước từ trước khi bấm.
    // R5.17 — tổ hợp model+phương thức cấm (config sửa tay) thì từ chối TRƯỚC khi khởi chạy, lời rõ
    try {
      configForReview(cfg);
    } catch (e) {
      if (e instanceof ProviderConfigErrorCfg) {
        if (muonJson) return res.status(412).json({ loi: e.message });
        return res.status(412).send(shell('CheckMate — cấu hình không hợp lệ', `<h1>Cấu hình model không hợp lệ</h1><p class="sub">${escHtml(e.message)} <a href="/settings">→ Cài đặt</a></p>`));
      }
      throw e;
    }
    if (!coRepo(cfg)) {
      const loi = 'Chưa kết nối repo nào — thêm repo ở màn Cấu hình trước khi chạy kiểm.';
      if (muonJson) return res.status(409).json({ loi });
      return res.status(409).send(shell('CheckMate', `<h1>Chưa kết nối repo nào</h1><p class="sub">${escHtml(loi)} <a href="/settings">→ Cấu hình</a></p>`));
    }
    if (!hasGithubAccess(cfg.repo.github)) {
      const loi = `Repo ${cfg.repo.github} chưa có GitHub token nên không đọc được PR, và máy chủ cũng không có \`gh\` đã đăng nhập. Vào ⚙ Cài đặt → dán token cho repo này.`;
      if (muonJson) return res.status(412).json({ loi });
      return res
        .status(412)
        .send(shell('CheckMate — thiếu token', `<h1>Repo chưa có token</h1><p class="sub">${loi} <a href="/settings">→ Cài đặt</a></p>`));
    }
    try {
      const pr = fetchAndRoute(cfg, soPr);
      let tacGia: string | undefined;
      try { tacGia = (await getCurrentPr(cfg, pr.so)).tacGia; } catch { /* thiếu tác giả không chặn run */ }
      // Gác MỘT-PR-MỘT-LƯỢT: cùng hàm thuần với gác trần, nên hai đường (bấm tay, chế độ trực) không lệch nhau.
      if (!evaluateStartRun({ soDangChay: rm.runningCount(), tran: CONCURRENCY_LIMIT, prDangChay: rm.isPrRunning(pr.so) }).chay) {
        if (muonJson) return res.status(409).json({ loi: `PR #${pr.so} đang được chấm — chờ run hiện tại xong` });
        return res.status(409).send(shell('CheckMate — đang chấm', `<h1>PR #${pr.so} đang được chấm</h1><p class="sub">Một run khác đang chạy trên PR này — hai run song song sẽ ra hai verdict trùng. <a href="/">← quay lại</a></p>`));
      }
      // Quyết định «chạy lại hay cảnh báo» ở hàm thuần (gate.ts) — hai đường JSON và HTML phải quyết
      // giống hệt nhau; điều kiện viết tay ở hai chỗ là hai chỗ sẽ lệch nhau.
      const daCham = rm.findByPr(pr.so, pr.headSha);
      const lai = decideRerun({ daCham, ep: (req.body as Record<string, string>).ep });
      if (!lai.chay && muonJson) {
        return res.status(409).json({ da_cham_run_id: lai.runDaCo, verdict: lai.verdict });
      }
      if (!lai.chay) {
        return res.status(409).send(
          shell(
            'CheckMate — đã có verdict',
            `<h1>Commit này đã được chấm rồi</h1>
<p class="sub">PR #${pr.so} @ <code>${pr.headSha.slice(0, 7)}</code> đã có verdict <b>${lai.verdict}</b> (${lai.soFinding} finding). Chạy lại trên cùng commit gần như chắc chắn ra kết quả cũ mà vẫn tốn vài phút.</p>
<p><a class="btn" href="/runs/${lai.runDaCo}">Xem verdict đã có →</a></p>
<form method="post" action="/api/runs" style="margin-top:14px"><input type="hidden" name="kieu" value="pr"><input type="hidden" name="so" value="${pr.so}"><input type="hidden" name="ep" value="1">
<button class="phu-nho">Vẫn chạy lại</button></form>
<p class="goiy" style="margin-top:14px"><a href="/">← về trang chính</a></p>`,
          ),
        );
      }
      if (pr.loai === 'doc') {
        id = rm.batDau(
          `PR #${pr.so} · tài liệu ${pr.fileDoc}`,
          'doc',
          ['--skill', 'doc', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--file', pr.fileDoc!],
          agentEnv(cfg),
          { so: pr.so, headSha: pr.headSha, tacGia },
          cfg.repo.github,
          ai(req),
        );
        theoDoiHead(id, pr.so);
      } else {
        id = rm.batDau(
          `PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`,
          'code',
          ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef],
          agentEnv(cfg),
          { so: pr.so, headSha: pr.headSha, tacGia },
          cfg.repo.github,
          ai(req),
        );
        theoDoiHead(id, pr.so);
      }
    } catch (e) {
      return res.status(500).send(shell('CheckMate', `<h1>Không chạy được PR #${so}</h1><p class="sub">${(e as Error).message.slice(0, 300)} · <a href="/">← quay lại</a></p>`));
    }
  } else if (kieu === 'doc') {
    const nd = (noi_dung ?? '').trim();
    if (nd.length < 200) return res.status(422).send(shell('CheckMate', '<h1>Tài liệu quá ngắn</h1><p class="sub">Cần tối thiểu 200 ký tự để kiểm có nghĩa. <a href="/">← quay lại</a></p>'));
    const f = join(TMP_DOC, `doc-${Date.now()}.md`);
    writeFileSync(f, nd, 'utf8');
    id = rm.batDau('Tài liệu dán tay', 'doc', ['--skill', 'doc', '--file', f], agentEnv(cfg), undefined, cfg.repo?.github, ai(req));
  } else if (kieu === 'upload') {
    if (!req.file) return res.status(422).send(shell('CheckMate', '<h1>Chưa chọn file</h1><p class="sub"><a href="/">← quay lại</a></p>'));
    let text: string;
    try {
      text = (await extractText(req.file.originalname, req.file.buffer)).trim();
    } catch (e) {
      return res.status(422).send(shell('CheckMate', `<h1>Không đọc được file</h1><p class="sub">${(e as Error).message} · <a href="/">← quay lại</a></p>`));
    }
    if (text.length < 200) {
      return res.status(422).send(shell('CheckMate', '<h1>Nội dung trích ra quá ngắn</h1><p class="sub">File có thể là bản scan/ảnh (chưa hỗ trợ OCR) hoặc rỗng. <a href="/">← quay lại</a></p>'));
    }
    const f = join(TMP_DOC, `up-${Date.now()}.md`);
    writeFileSync(f, text, 'utf8');
    id = rm.batDau(`Tài liệu tải lên · ${req.file.originalname}`, 'doc', ['--skill', 'doc', '--file', f], agentEnv(cfg), undefined, cfg.repo?.github, ai(req));
  } else {
    return res.status(422).send('Thiếu loại artifact');
  }
  if (muonJson) return res.json({ run_id: id });
  res.redirect(303, `/runs/${id}`);
});

// ---- API JSON cho ứng dụng một trang (specs/R9) ----
// Mọi route ở đây chỉ đọc qua lớp kho và trả dữ liệu thuần; không dựng HTML, không chạm đĩa.

const soNguyen = (v: unknown, mac: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : mac;
};

app.get('/api/lich-su', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const trang = soNguyen(q.trang, 1);
  const moiTrang = Math.min(200, soNguyen(q.moi_trang, 25));
  const loc = { repo: q.repo || undefined, skill: (q.skill as 'code' | 'doc' | undefined) || undefined };
  const tong = rm.dem(loc);
  res.json({
    trang,
    moi_trang: moiTrang,
    tong,
    so_trang: Math.max(1, Math.ceil(tong / moiTrang)),
    runs: rm.danhSach({ ...loc, gioi_han: moiTrang, bo_qua: (trang - 1) * moiTrang }),
  });
});

app.get('/api/so-cai', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const trang = soNguyen(q.trang, 1);
  const moiTrang = Math.min(200, soNguyen(q.moi_trang, 50));
  const loc = {
    repo: q.repo || undefined,
    verdict: (q.verdict as 'PASS' | 'FAIL' | undefined) || undefined,
    skill: (q.skill as 'code' | 'doc' | undefined) || undefined,
    tac_gia: q.tac_gia || undefined,
    q: q.q || undefined,
  };
  const tong = demSoCaiKho(loc);
  res.json({
    trang,
    moi_trang: moiTrang,
    tong,
    so_trang: Math.max(1, Math.ceil(tong / moiTrang)),
    muc: docSoCaiKho({ ...loc, gioi_han: moiTrang, bo_qua: (trang - 1) * moiTrang }),
  });
});

app.get('/api/tin-cay', (req, res) => {
  const repo = String(req.query.repo ?? '') || undefined;
  res.json({ repo: repo ?? null, ho_so: computeProfile(docSoCaiKho(repo ? { repo } : {})) });
});

app.get('/api/cau-hinh', (_req, res) => {
  const c = readConfig();
  const cfgNcc = currentConfig(c);
  // KHÔNG trả khoá hay token — chỉ trả trạng thái đủ để giao diện hiển thị
  res.json({
    che_do: MODE,
    repo_dang_chon: c.repo_dang_chon,
    repos: c.repos.map((r) => ({ ...r, co_clone: coFile(r.local_path), co_token: hasToken(r.github), token_rieng: Boolean(readOwnToken(r.github)), co_duong_vao: hasGithubAccess(r.github) })),
    agent: { ncc: c.agent.ncc, phuong_thuc: cfgNcc.phuong_thuc, model: cfgNcc.model, max_probe: c.agent.max_probe, skeptic: c.agent.skeptic },
    truc: c.truc,
    so_dang_chay: rm.runningCount(),
  });
});

app.get('/api/repos', (_req, res) => {
  const c = readConfig();
  res.json(
    c.repos.map((r) => ({
      ...r,
      dang_chon: r.github === c.repo_dang_chon,
      co_clone: coFile(r.local_path),
      co_token: hasToken(r.github),
      token_rieng: Boolean(readOwnToken(r.github)),
      co_duong_vao: hasGithubAccess(r.github),
      so_luot_cham: rm.dem({ repo: r.github }),
    })),
  );
});

// JSON API (phục vụ MCP B4.4 + tích hợp ngoài)
app.get('/api/prs', async (_req, res) => {
  const cfg = readConfig();
  // Chưa kết nối repo nào ⇒ hàng đợi RỖNG, không phải lỗi. Đây là trạng thái bình thường của bản vừa cài.
  if (!coRepo(cfg)) return res.json([]);
  try {
    const prs = await listPrs(cfg);
    res.json(prs.map((p) => {
      const daCham = rm.findByPr(p.so, p.headSha);
      return { ...p, da_cham: daCham?.verdict ? { run_id: daCham.id, verdict: daCham.verdict.result, so_finding: daCham.verdict.findings.length } : null };
    }));
  } catch (e) {
    res.status(500).json({ loi: (e as Error).message });
  }
});

app.get('/api/runs/:id/info', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).json({ loi: 'Không tìm thấy run' });
  res.json(st.meta);
});

app.get('/runs/:id', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).send(shell('CheckMate', '<h1>Không tìm thấy run</h1><p class="sub"><a href="/">← quay lại</a></p>'));
  // Lượt đã xong: đưa cả dòng sự kiện xuống để máy chủ DỰNG SẴN nội dung. Lượt đang chạy: đưa phần
  // đã có để trang mở ra không trống, rồi luồng nối tiếp từ đúng chỗ đó (`?tu=`).
  res.send(runPage(st.meta, req.query.trinh_dien === '1', st.events, ai(req)));
});

// ---- Cổng merge / trả về dev (spec §10) ----
function loiCong(res: import('express').Response, ma: number, thongBao: string): void {
  res.status(ma).send(shell('CheckMate — cổng merge', `<h1>Không thực hiện được</h1><p class="sub">${thongBao}</p>`));
}

/**
 * Đọc danh tính + ép vai cổng, gói thành DỮ LIỆU cho hàm quyết định thuần (R11.1, R11.4 — vẫn đúng một
 * cửa `getIdentity`). Gọi sớm hơn một bước so với bản trước, nhưng thứ tự THÔNG ĐIỆP không đổi: hàm thuần
 * xếp verdict FAIL trước thiếu quyền. `getIdentity` không có tác dụng phụ nên gọi sớm là vô hại.
 */
function docDanhTinhCong(req: import('express').Request): IdentityCheck {
  try {
    const dt = getIdentity(req);
    requireGateRole(dt);
    return { ok: true, ten: dt.ten };
  } catch (e) {
    return {
      ok: false,
      status: e instanceof IdentityError && e.ma === 'khong_du_quyen' ? 403 : 401,
      message: (e as Error).message,
    };
  }
}

app.post('/api/runs/:id/merge', async (req, res) => {
  const st = rm.lay(req.params.id);
  const cfg = readConfig();
  if (!coRepo(cfg)) return loiCong(res, 409, 'Chưa kết nối repo nào — không có repo để merge.');
  const v = st?.meta.verdict;
  // Quyết định cổng nằm ở hàm THUẦN (gate.ts) để mỗi nhánh từ chối là một ca test chạy được; route chỉ
  // gom đầu vào rồi làm I/O. Thứ tự kiểm và từng chữ thông điệp thuộc về hàm đó, không phải chỗ này.
  const cb = evaluateMergeLocal({
    mode: MODE,
    run: st?.meta,
    gateDone: rm.congHienTai(req.params.id), // đọc TƯƠI từ sổ — bản trong bộ nhớ có thể cũ (R6.26)
    identity: docDanhTinhCong(req),
    tickIds: (req.body as Record<string, string>).tick_ids,
  });
  if (!cb.ok) return loiCong(res, cb.status, cb.message);
  try {
    const hienTai = await getCurrentPr(cfg, st!.meta.pr!.so);
    const doiChieu = evaluateMergeAgainstPr({ run: st!.meta, currentPr: hienTai });
    if (!doiChieu.ok) return loiCong(res, doiChieu.status, doiChieu.message);
    const nguoi = cb.nguoi;
    const xacNhan = v!.findings.filter((f) => chuanMuc(f.severity) === 'medium').map((f) => f.title_vi);
    const pr = st!.meta.pr!;
    await commentPr(cfg, pr.so, renderReceipt(v!, nguoi, xacNhan));
    await mergePr(cfg, pr.so, `${st!.meta.tieuDe} (#${pr.so})`,
      `CheckMate: PASS @ ${v!.artifact_ref.sha_or_hash.slice(0, 10)} · run ${v!.run_id}${xacNhan.length ? ` · ${xacNhan.length} cảnh báo medium được ${nguoi} chấp nhận` : ''}`,
      pr.headSha); // W1: GitHub tự 409 nếu head đã đổi — đóng nốt cửa sổ race sau lần getCurrentPr ở trên
    appendGateLedgerEntry({ hanhDong: 'merge', pr: pr.so, sha: pr.headSha, run_id: st!.meta.id, verdict: v!.result, nguoi, tac_gia_pr: pr.tacGia, xac_nhan_medium: xacNhan });
    rm.dongBoCongTuSo(st!.meta.id); // bề mặt đọc lại TỪ sổ (R6.26)
    res.redirect(303, `/runs/${st!.meta.id}`);
  } catch (e) {
    loiCong(res, 500, `GitHub từ chối: ${(e as Error).message.slice(0, 300)}`);
  }
});

app.post('/api/runs/:id/reject', async (req, res) => {
  const st = rm.lay(req.params.id);
  const cfg = readConfig();
  if (!coRepo(cfg)) return loiCong(res, 409, 'Chưa kết nối repo nào — không có repo để trả về.');
  // Cùng khuôn với merge: quyết định ở hàm thuần (gate.ts), route chỉ gom đầu vào rồi làm I/O.
  const cb = evaluateRejectLocal({
    mode: MODE,
    run: st?.meta,
    gateDone: rm.congHienTai(req.params.id), // đọc TƯƠI từ sổ — bản trong bộ nhớ có thể cũ (R6.26)
    identity: docDanhTinhCong(req),
    ghiChu: (req.body as Record<string, string>).ghi_chu,
  });
  if (!cb.ok) return loiCong(res, cb.status, cb.message);
  try {
    const nguoi = cb.nguoi;
    const pr = st!.meta.pr!;
    // W4: đóng PR (không-hoàn-tác) TRƯỚC — comment nói "PR đã đóng" chỉ được đăng khi điều đó đã đúng
    await closePr(cfg, pr.so);
    let kenh: 'review' | 'comment' | 'loi_comment' = 'comment';
    try {
      kenh = await returnToDev(cfg, pr.so, renderRuling(st!.meta.verdict!, cb.ghiChu, true));
    } catch (e) {
      kenh = 'loi_comment';
      console.error('Reject: PR đã đóng nhưng post phán quyết lỗi:', (e as Error).message.slice(0, 200));
    }
    appendGateLedgerEntry({ hanhDong: 'reject', pr: pr.so, sha: pr.headSha, run_id: st!.meta.id, verdict: st!.meta.verdict!.result, nguoi, tac_gia_pr: pr.tacGia, kenh, dong_pr: true,
      ghi_chu: [cb.ghiChu, `đã đóng PR + phán quyết qua ${kenh === 'loi_comment' ? 'LỖI post (đóng vẫn hiệu lực)' : kenh} (chờ dev vá & reopen)`].filter(Boolean).join(' · ') });
    rm.dongBoCongTuSo(st!.meta.id); // bề mặt đọc lại TỪ sổ (R6.26)
    res.redirect(303, `/runs/${st!.meta.id}`);
  } catch (e) {
    loiCong(res, 500, `GitHub từ chối: ${(e as Error).message.slice(0, 300)}`);
  }
});

/**
 * Gắn HTML ĐÃ DỰNG vào sự kiện trước khi phát đi.
 *
 * Trình duyệt không tự ghép HTML của finding hay verdict — nó nhận chuỗi và chèn. Nhờ vậy chỉ có
 * MỘT hàm dựng mỗi loại, dùng chung cho đường máy chủ dựng sẵn lẫn đường luồng. Hai bản dựng song
 * song thì bản ít người nhìn hơn sẽ lệch trước, và lệch im lặng.
 */
function kemHtml(ev: { t: number; e: unknown }): { t: number; e: unknown; html?: string } {
  const e = ev.e as { type?: string; finding?: Parameters<typeof findingHtml>[0]; verdict?: Parameters<typeof verdictHtml>[0] };
  if (e.type === 'finding' && e.finding) return { ...ev, html: findingHtml(e.finding) };
  if (e.type === 'verdict' && e.verdict) return { ...ev, html: verdictHtml(e.verdict) };
  return ev;
}

/** Dòng sự kiện dạng JSON — bản trình diễn tải một lần rồi tự canh nhịp ở phía trình duyệt. */
app.get('/api/runs/:id/su-kien', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).json({ loi: 'Không tìm thấy lượt chấm.' });
  res.json(st.events.map(kemHtml));
});

app.get('/api/runs/:id/events', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).end();
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  /**
   * Đánh số từng sự kiện và tiếp từ chỗ đứt.
   *
   * Trước đây không có `id:`, nên khi trình duyệt tự nối lại (mất mạng, máy ngủ) máy chủ đổ lại
   * TOÀN BỘ từ đầu trong khi giao diện chỉ nối thêm — một lần rớt mạng cho ra hai bản finding giống
   * hệt nhau, và người đọc không có cách nào biết đó là trùng lặp hay hai phát hiện thật.
   *
   * Số hiệu là CHỈ SỐ trong dòng sự kiện, nên nó bền qua cả việc máy chủ khởi động lại: sổ trên đĩa
   * giữ đúng thứ tự đó.
   */
  // `tu` = số sự kiện máy chủ ĐÃ DỰNG SẴN vào trang; `Last-Event-ID` = chỗ đứt khi trình duyệt tự
  // nối lại. Lấy giá trị LỚN HƠN: cả hai đều nói «đã có tới đây rồi», và lấy nhầm giá trị nhỏ là
  // đổ lại thứ đã hiện.
  const daCo = Number(req.headers['last-event-id']);
  const tuHeader = Number.isFinite(daCo) && daCo >= 0 ? daCo + 1 : 0;
  const tuQuery = Math.max(0, Number(req.query.tu) || 0);
  const batTu = Math.max(tuHeader, tuQuery);
  let ke = batTu;
  const gui = (ev: { t: number; e: unknown }) => {
    res.write(`id: ${ke}\ndata: ${JSON.stringify(kemHtml(ev))}\n\n`);
    ke++;
  };
  // `__END__` là dấu chấm hết, không phải một sự kiện của lượt chấm — phát KHÔNG kèm số hiệu để lần
  // nối lại sau vẫn tiếp đúng từ sự kiện thật cuối cùng.
  const guiHet = () => res.write(`data: ${JSON.stringify({ t: 0, e: { type: 'log', msg: '__END__' } })}\n\n`);

  for (const ev of st.events.slice(batTu)) gui(ev);
  if (st.meta.trangThai !== 'dang_chay') {
    guiHet();
    return res.end();
  }
  const sub = (ev: { t: number; e: unknown }) => gui(ev);
  st.subs.add(sub);
  const nhip = setInterval(() => res.write(': nhip\n\n'), 15_000);
  req.on('close', () => { st.subs.delete(sub); clearInterval(nhip); });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, '127.0.0.1', () => {
  // R4.21 — bản cũ giữ MỘT token dùng chung trong config.json. Di trú ngay lúc khởi động, trước khi có
  // lượt chấm nào chạy, kẻo repo mất kết nối giữa chừng. Chạy lại lần hai không đổi gì.
  const { chuyen } = migrateRepoToken();
  if (chuyen.length) console.log(`Đã chuyển token dùng chung thành token riêng cho ${chuyen.length} repo: ${chuyen.join(', ')}`);
  // Xác của lần chạy trước: hàng `dang_chay` mồ côi khoá trần song song vĩnh viễn nếu không dọn
  // Sổ phải đúng ngay từ lượt khởi động: máy chỉ chấm bằng tay không có chu kỳ trực nào để bám vào.
  void chayDoiSoat();
  // NỐI LẠI trước, DỌN XÁC sau. Lượt còn sổ sự kiện trên đĩa là lượt tiến trình con vẫn đang ghi
  // tiếp — nó sống sót qua lần khởi động lại này, và đánh dấu nó hỏng là vứt bỏ việc đang chạy đúng.
  const { noiLai, danhDauLoi } = rm.noiLaiLuotDangChay();
  if (noiLai.length) console.log(`Nối lại ${noiLai.length} lượt chấm còn đang chạy: ${noiLai.join(', ')}`);
  // Lượt có tiến trình đã chết KHÔNG được giữ ở `dang_chay`: nó khoá trần chạy đồng thời và khoá luôn
  // việc chấm lại đúng pull request ấy (`stalled-run-recovery`).
  if (danhDauLoi.length) console.log(`Đánh dấu lỗi ${danhDauLoi.length} lượt có tiến trình đã chết: ${danhDauLoi.join(', ')}`);
  const moCoi = rm.cleanupOrphanRuns(noiLai);
  if (moCoi.length) console.log(`Đã dọn ${moCoi.length} lượt chấm bỏ dở của lần chạy trước: ${moCoi.join(', ')}`);
  console.log(`CheckMate web: http://127.0.0.1:${port}`);
});
