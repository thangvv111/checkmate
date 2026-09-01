import express from 'express';
import multer from 'multer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DINH_DANG_NHAN, trichText } from './extract.js';
import { GOC } from './paths.js';
import { RunManager } from './runs.js';
import { escHtml, khung, khoiDaTraVe, khoiPrList, trangChu, trangRun, trangSettings } from './ui.js';
import {
  TEN_COOKIE_PHIEN,
  coTaiKhoanNao,
  danhTinhNeuCo,
  docCookie,
  epBamCong,
  layDanhTinh,
  LoiDanhTinh,
  kiemMatKhau,
  taoPhien,
  xoaPhien,
} from './danh-tinh.js';
import { trangLogin, type TrangThaiLogin } from './ui-login.js';

import { MODE, LoiCauHinhNcc, cauHinhDeCham, cauHinhHienTai, cheToken, cheToken2, docConfig, diTruTokenRepo, docTokenThueBao, envAgent, ghiConfig, ghiTokenThueBao } from './config.js';
import { DANH_MUC_NCC, dinhNghia, modelHopLe, docSoKiem, ghiKhoa, kiemConHieuLuc, type CauHinhNcc, type MaNcc, type PhuongThuc } from './ncc.js';
import { GOC_REPO, slugRepoGithub, timRepo, type RepoConfig } from './config.js';
import { existsSync as coFile } from 'node:fs';
import { join as noiDuong } from 'node:path';
import { khoiNcc } from './ui-ncc.js';
import { khoiRepo } from './ui-repo.js';
import { cloneRepo, danhSachNhanh, danhSachPr, trangThaiPr, danhSachRepoCuaToken, dongPr, fetchVaRouter, ganTrangThaiCommit, kiemTraRepo, layPrHienTai, mergePr, binhLuanPr, tachOwnerRepo, traVeDev } from './github.js';
import { coToken, docTokenRepo, docTokenRieng, ghiTokenRepo, xoaTokenRepo } from './kho-bi-mat.js';
import { coDuongVaoGithub, coGhCli } from './github.js';
import { banPhanQuyet, banReceipt, banVerdictTuDong, demMuc, doiSoatCong, ghiSo, TEN_TAC_NHAN_MAY } from './cong.js';
import { backfillSoCai, docSoCai } from './ledger.js';
import { docSoCai as docSoCaiKho, demSoCai as demSoCaiKho } from './kho/kho-socai.js';
import { diTruTatCa, tomTatDiTru } from './kho/di-tru.js';
import { tinhHoSo } from './tincay.js';
import { trangHoSoTacGia, trangTinCay } from './ui-tincay.js';
import { trangLedger } from './ui-ledger.js';
import { trangLichSu, type LocLichSu } from './ui-lich-su.js';
import { trangDocs } from './ui-docs.js';
import { docTrangThaiNcc, thuNcc, type TrangThaiNcc } from './nguon-model.js';
import { chuanMuc } from '../../../packages/shared/src/types.js';

const app = express();
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(express.json({ limit: '300kb' }));

// ---- Đăng nhập và chặn cửa (specs/R11) ----

/** Đường KHÔNG cần phiên. Danh sách CHO PHÉP: route mới mặc định phải đăng nhập, không phải nhớ bổ sung. */
const DUONG_MO = new Set(['/login', '/logout', '/health']);

/** R11.2 — không có phiên hợp lệ thì chặn, KỂ CẢ khi lớp xác thực bên ngoài đã cho qua. */
app.use((req, res, next) => {
  if (DUONG_MO.has(req.path)) return next();
  if (danhTinhNeuCo(req)) return next();
  // API trả JSON, trang trả chuyển hướng — client gọi API mà nhận HTML thì lỗi biến thành «JSON hỏng»,
  // tức lại một ca báo sai bản chất.
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ loi: 'Chưa đăng nhập hoặc phiên đã hết hạn.', can_dang_nhap: true });
  }
  const tiep = req.method === 'GET' && req.originalUrl !== '/' ? `?tiep=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect(303, `/login${tiep}`);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/login', (req, res) => {
  if (danhTinhNeuCo(req)) return res.redirect(303, '/');
  const q = req.query as Record<string, string>;
  const trangThai: TrangThaiLogin = !coTaiKhoanNao()
    ? 'chua_co_tai_khoan'
    : q.het === '1'
      ? 'phien_het_han'
      : q.sai === '1'
        ? 'sai_mat_khau'
        : 'moi';
  res.send(trangLogin({ trangThai, tiep: duongNoiBo(q.tiep) }));
});

app.post('/login', (req, res) => {
  const b = req.body as Record<string, string>;
  const dt = kiemMatKhau((b.ten ?? '').trim(), b.mk ?? '');
  if (!dt) {
    // Cùng một câu cho sai tên lẫn sai mật khẩu (R11.10)
    const tiep = duongNoiBo(b.tiep);
    return res.redirect(303, `/login?sai=1${tiep ? `&tiep=${encodeURIComponent(tiep)}` : ''}`);
  }
  const { token, hetHan } = taoPhien(dt.ten);
  res.setHeader('set-cookie', dungCookiePhien(req, token, hetHan));
  res.redirect(303, duongNoiBo(b.tiep) || '/');
});

app.post('/logout', (req, res) => {
  // R11.13 — xoá phiên ở PHÍA MÁY CHỦ; xoá mỗi cookie là để lại một token còn sống
  const token = docCookie(req, TEN_COOKIE_PHIEN);
  if (token) xoaPhien(token);
  res.setHeader('set-cookie', dungCookiePhien(req, '', new Date(0)));
  res.redirect(303, '/login');
});

/**
 * Chỉ nhận đường NỘI BỘ cho tham số quay-lại. Không lọc thì `?tiep=https://kẻ-xấu` biến trang đăng
 * nhập của chính mình thành bàn đạp chuyển hướng — người dùng thấy tên miền quen, bấm, rồi bị đá đi nơi khác.
 */
export function duongNoiBo(x: unknown): string {
  const s = typeof x === 'string' ? x.trim() : '';
  return /^\/[^/\\]/.test(s) ? s : '';
}

/** R11.14 — HttpOnly + SameSite luôn; Secure khi đi qua HTTPS (nginx báo bằng x-forwarded-proto) */
function dungCookiePhien(req: express.Request, token: string, hetHan: Date): string {
  const https = (req.headers['x-forwarded-proto'] ?? '').toString().split(',')[0].trim() === 'https';
  return [
    `${TEN_COOKIE_PHIEN}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    https ? 'Secure' : '',
    `Expires=${hetHan.toUTCString()}`,
  ]
    .filter(Boolean)
    .join('; ');
}

const rm = new RunManager();
const TMP_DOC = join(GOC, 'web-runs', 'tmp');
mkdirSync(TMP_DOC, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
{
  // Di trú dữ liệu đời file sang cơ sở dữ liệu (specs/R9.7) — chạy đúng một lần, file gốc giữ nguyên
  const tomTat = tomTatDiTru(diTruTatCa());
  if (tomTat) console.log(`Di trú sang cơ sở dữ liệu — ${tomTat}`);
  const them = backfillSoCai(rm.danhSach({ gioi_han: 500 }));
  if (them > 0) console.log(`Sổ cái verdict: backfill ${them} lượt chấm cũ vào sổ`);
}

// ---- Chế độ trực (B4.3): hook run-xong + poller ----
rm.onXong = (meta) => {
  const cfg = docConfig();
  if (!meta.pr || !meta.verdict) return;
  const v = meta.verdict;
  const pr = meta.pr;
  const d = demMuc(v.findings);
  // R6.17 — chỉ đóng khi có probe CHẠY THẬT và đỏ. Đóng dựa trên suy đoán là thứ làm người ta tắt cổng.
  const dangDongPr = cfg.truc.tu_dong_tra_ve && v.result === 'FAIL' && d.high > 0;
  void (async () => {
    // R6.16 — đăng verdict KHÔNG giới hạn ở chế độ trực: lượt bấm tay cũng sinh verdict, và người viết
    // code cũng cần đọc finding ở đúng chỗ họ làm việc.
    if (cfg.truc.tu_dong_comment) {
      try {
        await binhLuanPr(cfg, pr.so, banVerdictTuDong(v));
        console.log(`Tự động: đã đăng verdict ${v.result} lên PR #${pr.so}`);
      } catch (e) {
        console.error('Tự động (đăng verdict):', (e as Error).message);
      }
    }
    // Ba việc là ba công tắc riêng (R6.15) nên cũng là ba khối try riêng: đăng comment hỏng không được
    // kéo theo việc gắn trạng thái, và cả hai hỏng cũng không được che mất việc trả về dev.
    if (cfg.truc.tu_dong_trang_thai) {
      try {
        await ganTrangThaiCommit(cfg, pr.headSha, v.result === 'PASS' ? 'success' : 'failure',
          v.result === 'PASS' ? 'CheckMate: PASS' : `CheckMate: FAIL — ${v.findings.length} finding`);
      } catch (e) {
        console.error('Tự động (gắn trạng thái commit):', (e as Error).message);
      }
    }
    if (!dangDongPr) return;
    try {
      // R6.18 — ghi sổ bằng danh tính của TÁC NHÂN MÁY, không mượn tên người: sổ kiểm toán phải phân
      // biệt «người trả về» với «máy trả về», hai chuyện có mức trách nhiệm khác nhau.
      const nguoi = TEN_TAC_NHAN_MAY;
      await dongPr(cfg, pr.so);
      let kenh: 'review' | 'comment' | 'loi_comment' = 'comment';
      try {
        kenh = await traVeDev(cfg, pr.so, banPhanQuyet(v, 'Trả về tự động: verdict FAIL có finding mức chặn.', true));
      } catch {
        kenh = 'loi_comment';
      }
      // Ghi SỔ trước, rồi bề mặt đọc lại từ sổ (R6.26) — không còn bước đặt giá trị vào bề mặt.
      ghiSo({ hanhDong: 'reject', pr: pr.so, sha: pr.headSha, run_id: meta.id, verdict: v.result, nguoi,
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
async function chamPr(cfg: ReturnType<typeof docConfig>, soPr: number): Promise<{ id: string } | { daChamRunId: string }> {
  const pr = fetchVaRouter(cfg, soPr);
  const daCham = rm.timTheoPr(pr.so, pr.headSha);
  if (daCham) return { daChamRunId: daCham.id };
  let tacGia: string | undefined;
  try { tacGia = (await layPrHienTai(cfg, pr.so)).tacGia; } catch { /* thiếu tác giả không chặn run */ }
  const meta = { so: pr.so, headSha: pr.headSha, tacGia };
  if (pr.loai === 'doc') {
    return { id: rm.batDau(`PR #${pr.so} · tài liệu ${pr.fileDoc}`, 'doc',
      ['--skill', 'doc', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--file', pr.fileDoc!], envAgent(cfg), meta, cfg.repo.github) };
  }
  // W2: truyền SHA đã pin thay vì tên ref dùng chung — ref bị force-move giữa chừng không đổi được commit bị chấm
  return { id: rm.batDau(`PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`, 'code',
    ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef], envAgent(cfg), meta, cfg.repo.github) };
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
    const cfg = docConfig();
    const ds = await doiSoatCong((so, repo) => trangThaiPr(cfg, so, repo), (m) => console.log(m));
    if (ds.daGhi || ds.loi) console.log(`Đối soát cổng: ghi ${ds.daGhi} hàng ngoài cổng · bỏ qua ${ds.boQua} · lỗi đọc ${ds.loi}`);
  } catch (e) {
    console.error('Đối soát cổng (không ảnh hưởng lượt chấm):', (e as Error).message);
  }
}

// Nhịp đối soát RIÊNG, không phụ thuộc `truc.bat`: sổ phải đúng kể cả trên máy chỉ chấm bằng tay.
setInterval(() => void chayDoiSoat(), 15 * 60 * 1000);

setInterval(() => {
  void (async () => {
    const cfg = docConfig();
    if (!cfg.truc.bat || dangQuet) return;
    if (Date.now() - lanQuetCuoi < cfg.truc.chu_ky_giay * 1000) return;
    dangQuet = true;
    lanQuetCuoi = Date.now();
    await chayDoiSoat();
    try {
      const prs = await danhSachPr(cfg);
      for (const p of prs) {
        if (rm.soDangChay() >= 2) break;
        if (rm.timTheoPr(p.so, p.headSha) || rm.dangChayPr(p.so)) continue;
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

app.get('/', async (_req, res) => {
  const cfg = docConfig();
  let prBlock: string;
  try {
    const prs = await danhSachPr(cfg);
    const kem = prs.map((p) => {
      const daCham = rm.timTheoPr(p.so, p.headSha);
      return {
        ...p,
        daCham: daCham?.verdict
          ? { runId: daCham.id, ketQua: daCham.verdict.result, soFinding: daCham.verdict.findings.length }
          : undefined,
      };
    });
    prBlock = khoiPrList(cfg.repo.github, cfg.repo.base_branch, kem, '');
  } catch (e) {
    prBlock = khoiPrList(cfg.repo.github, cfg.repo.base_branch, null, (e as Error).message.slice(0, 200));
  }
  res.send(trangChu(rm.danhSach(), prBlock, khoiDaTraVe(rm.daTraVe(), cfg.repo.github)));
});

app.get('/docs', (_req, res) => {
  res.send(trangDocs());
});

app.get('/lich-su', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const loc: LocLichSu = {
    repo: q.repo || undefined,
    verdict: q.verdict || undefined,
    skill: q.skill || undefined,
    ncc: q.ncc || undefined,
    q: q.q || undefined,
    trang: Math.max(1, Number(q.trang) || 1),
  };
  const c = docConfig();
  // Bộ lọc nào CÓ CỘT trong bảng thì phải xuống SQL, đừng lọc sau khi đã cắt: nâng trần từ 30 lên
  // 1000 rồi vẫn lọc trong bộ nhớ nghĩa là repo có 300 lượt cũ bị 1000 lượt của repo khác che khuất —
  // trang báo "không có lượt chấm nào" trong khi dữ liệu vẫn nằm nguyên trong cơ sở dữ liệu (R9.10).
  // Các bộ lọc còn lại (verdict, nhà cung cấp, tìm chữ) không có cột riêng nên vẫn lọc sau, nhưng nay
  // là lọc trên tập ĐÃ thu hẹp đúng repo.
  res.send(
    trangLichSu(
      rm.danhSach({ repo: loc.repo || undefined, skill: loc.skill === 'code' || loc.skill === 'doc' ? loc.skill : undefined, gioi_han: 1000 }),
      loc,
      c.repos.map((r) => r.github),
    ),
  );
});

// Danh sách repo để đổ vào ô lọc của sổ cái / tin cậy / lịch sử
const dsRepo = (): string[] => docConfig().repos.map((r) => r.github);

app.get('/ledger', (req, res) => {
  const repo = String(req.query.repo ?? '') || undefined;
  const congTheoRun = new Map<string, string>();
  // Lọc repo xuống SQL ở CẢ hai nguồn, kẻo trang lọc ra rỗng khi repo cần xem nằm ngoài 1000 lượt mới nhất
  for (const m of rm.danhSach({ repo, gioi_han: 1000 })) {
    if (m.ketQuaCong) congTheoRun.set(m.id, `${m.ketQuaCong.hanhDong === 'merge' ? 'đã merge' : 'trả về dev'} · ${m.ketQuaCong.nguoi}`);
  }
  res.send(trangLedger(docSoCaiKho(repo ? { repo } : {}), congTheoRun, dsRepo(), repo));
});

app.get('/tin-cay', (req, res) => {
  // Lọc theo repo TRƯỚC khi tính hồ sơ: track record của một người ở repo này không nói thay cho repo khác
  const locRepo = String(req.query.repo ?? '') || undefined;
  const soCai = locRepo ? docSoCai().filter((m) => (m.repo ?? '') === locRepo) : docSoCai();
  res.send(trangTinCay(tinhHoSo(soCai), dsRepo(), locRepo));
});

app.get('/tin-cay/:tacGia', (req, res) => {
  const locRepo = String(req.query.repo ?? '') || undefined;
  const soCai = locRepo ? docSoCai().filter((m) => (m.repo ?? '') === locRepo) : docSoCai();
  const tacGia = req.params.tacGia;
  const hoSo = tinhHoSo(soCai).find((h) => h.tacGia === tacGia);
  res.send(trangHoSoTacGia(tacGia, hoSo, soCai.filter((m) => m.tac_gia === tacGia && m.pr), locRepo));
});

app.get('/settings', (req, res) => {
  const c = docConfig();
  const trangThai: Record<string, TrangThaiNcc> = {};
  for (const dn of DANH_MUC_NCC) trangThai[dn.ma] = docTrangThaiNcc(dn.ma);
  res.send(
    trangSettings({
      mode: MODE,
      repoGithub: c.repo.github,
      baseBranch: c.repo.base_branch,
      localPath: c.repo.local_path,
      tokenChe: cheToken(docTokenRepo(c.repo.github)),
      khoiRepoHtml: khoiRepo({
        repos: c.repos.map((r) => ({ ...r, co_token: coToken(r.github), token_rieng: Boolean(docTokenRieng(r.github)), co_gh: coGhCli() })),
        dangChon: c.repo_dang_chon,
        coToken: coToken(c.repo.github),
        moKhoa: MODE === 'org',
      }),
      khoiNccHtml: khoiNcc({
        dangDung: c.agent.ncc,
        cauHinh: c.agent.ncc_cau_hinh,
        trangThai,
        soKiem: docSoKiem(),
        tokenThueBaoChe: cheToken2(docTokenThueBao()),
        moKhoa: MODE === 'org',
      }),
      maxProbe: c.agent.max_probe,
      skeptic: c.agent.skeptic,
      trucBat: c.truc.bat,
      trucChuKy: c.truc.chu_ky_giay,
      trucComment: c.truc.tu_dong_comment,
      trucTrangThai: c.truc.tu_dong_trang_thai,
      trucTraVe: c.truc.tu_dong_tra_ve,
      daLuu: req.query.luu === '1',
    }),
  );
});

app.post('/settings', (req, res) => {
  if (MODE === 'demo') return res.status(403).send(khung('CheckMate', '<h1>403</h1><p class="sub">Chế độ demo không cho sửa cấu hình. <a href="/settings">← quay lại</a></p>'));
  const b = req.body as Record<string, string>;
  const c = docConfig();
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
      .send(khung('CheckMate', `<h1>Repo không hợp lệ</h1><p class="sub">«${escHtml(repoSua.github)}» phải có dạng owner/tên. <a href="/settings">← quay lại</a></p>`));
  }
  // Đổi tên repo thì chìa phải đi theo, kẻo repo mới thành «thiếu token» còn chìa cũ thành rác mồ côi
  if (repoSua.github !== tenCu) {
    const chiaCu = docTokenRieng(tenCu);
    if (chiaCu) {
      ghiTokenRepo(repoSua.github, chiaCu);
      xoaTokenRepo(tenCu);
    }
  }
  // Token dán ở đây là chìa của repo ĐANG CHỌN, không phải chìa dùng chung nữa (R4.18)
  if (b.github_token?.trim()) ghiTokenRepo(repoSua.github, b.github_token.trim());
  const moi = {
    repos: c.repos.map((r) => (r.github === c.repo.github ? repoSua : r)),
    repo_dang_chon: repoSua.github,
    repo: repoSua,
    github_token: '',
    agent: {
      // Đổi nhà cung cấp ĐANG DÙNG phải đi qua cổng verify (/api/chon-ncc) — form này chỉ lưu cấu hình.
      ncc: c.agent.ncc,
      ncc_cau_hinh: (() => {
        const ra: Partial<Record<MaNcc, CauHinhNcc>> = { ...c.agent.ncc_cau_hinh };
        for (const dn of DANH_MUC_NCC) {
          const pt = b[`pt_${dn.ma}`] as PhuongThuc | undefined;
          const md = b[`model_${dn.ma}`];
          const cu = ra[dn.ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
          const ptMoi = pt && dn.phuong_thuc.includes(pt) ? pt : cu.phuong_thuc;
          // R5.15 — validate TỔ HỢP (phương thức mới, model mới), không validate rời từng ô: model
          // chỉ-thuê-bao mà lọt vào cấu hình phương thức API là giới hạn chỉ còn là lời dặn.
          ra[dn.ma] = {
            phuong_thuc: ptMoi,
            model: md && modelHopLe(dn, ptMoi, md) ? md : modelHopLe(dn, ptMoi, cu.model) ? cu.model : dn.models.find((m) => modelHopLe(dn, ptMoi, m)) ?? cu.model,
          };
        }
        return ra;
      })(),
      max_probe: Math.min(20, Math.max(2, Number(b.max_probe) || 10)),
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
  if (tokenTb) ghiTokenThueBao(tokenTb);
  // Khoá riêng của từng nhà cung cấp: dán mới thì lưu, bỏ trống thì giữ nguyên
  for (const dn of DANH_MUC_NCC) {
    const k = (b[`khoa_${dn.ma}`] ?? '').trim();
    if (k) ghiKhoa(dn.ma, k);
  }
  ghiConfig(moi);
  res.redirect(303, '/settings?luu=1');
});

// ---- Quản lý repo (đa repo) ----

// Liệt kê repo mà token nhìn thấy — người dùng CHỌN từ danh sách thay vì gõ tay owner/repo
// POST chứ không GET: chìa đi trong THÂN yêu cầu, không đi trong URL. Query string nằm lại trong
// access log của nginx, trong lịch sử trình duyệt và trong Referer gửi sang trang khác — dán token
// vào đó là rò chìa ra ba chỗ mà không ai kịp thấy (R4.19, R9.17).
app.post('/api/github/repos', async (req, res) => {
  const c = docConfig();
  const token = String((req.body as { token?: string }).token ?? '').trim() || docTokenRepo(c.repo.github);
  try {
    const ds = await danhSachRepoCuaToken(token);
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
  const github = tachOwnerRepo(b.url ?? '');
  if (!github) {
    return res.status(422).json({
      ok: false,
      ly_do: 'khong_thay',
      thong_diep: 'Không đọc được đường dẫn repo. Dán URL trên thanh địa chỉ GitHub (https://github.com/owner/repo) hoặc gõ owner/repo.',
    });
  }
  const c = docConfig();
  if (timRepo(c, github)) return res.status(409).json({ ok: false, thong_diep: `${github} đã có trong danh sách.` });
  const kq = await kiemTraRepo(github, (b.token ?? '').trim() || docTokenRepo(github));
  if (!kq.ok) return res.status(200).json({ ...kq, github });
  const nhanh = await danhSachNhanh(kq.github ?? github, (b.token ?? '').trim() || docTokenRepo(github));
  res.json({ ...kq, github: kq.github ?? github, nhanh });
});

// Bước 4: clone về thư mục CheckMate quản rồi ghi vào danh sách
app.post('/api/repo/them', async (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho thêm repo.' });
  const b = req.body as { github?: string; base_branch?: string; token?: string };
  const github = tachOwnerRepo(b.github ?? '');
  if (!github) return res.status(422).json({ ok: false, loi: 'Repo phải dạng owner/tên' });
  const c = docConfig();
  if (timRepo(c, github)) return res.status(409).json({ ok: false, loi: `${github} đã có trong danh sách.` });
  const token = (b.token ?? '').trim();
  const daCoChiaTruoc = Boolean(docTokenRieng(github));
  const dich = noiDuong(GOC_REPO, slugRepoGithub(github));
  try {
    // Ghi chìa TRƯỚC khi clone: clone repo riêng tư cần chìa, và nếu clone hỏng thì bước sau vẫn có
    // chìa để thử lại — người dùng không phải dán token lần hai.
    if (token) ghiTokenRepo(github, token);
    if (!coFile(dich)) {
      mkdirSync(GOC_REPO, { recursive: true });
      cloneRepo(github, dich, token || undefined);
    }
    const moi: RepoConfig = {
      github,
      base_branch: (b.base_branch ?? 'main').trim() || 'main',
      local_path: dich,
      truc: false,
      them_luc: new Date().toISOString(),
    };
    ghiConfig({ ...c, repos: [...c.repos, moi], repo_dang_chon: github, repo: moi });
    res.json({ ok: true, repo: moi });
  } catch (e) {
    // Clone hỏng thì repo KHÔNG vào danh sách — chìa vừa ghi ở trên trở thành chìa của một repo không
    // tồn tại trong cấu hình, không giao diện nào thấy để mà gỡ. Trả kho về đúng trạng thái trước đó.
    if (token && !daCoChiaTruoc) xoaTokenRepo(github);
    res.status(500).json({ ok: false, loi: `Không clone được ${github}: ${(e as Error).message.slice(0, 300)}` });
  }
});

// Đặt / đổi / xoá chìa riêng của MỘT repo (R4.18). Token gửi rỗng = gỡ chìa riêng, repo rơi về
// chìa chung của môi trường nếu có, không thì thành "thiếu token".
app.post('/api/repo/token', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho sửa cấu hình.' });
  const b = req.body as { github?: string; token?: string };
  const github = (b.github ?? '').trim();
  const c = docConfig();
  if (!timRepo(c, github)) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  const token = (b.token ?? '').trim();
  if (!token) {
    xoaTokenRepo(github);
    return res.json({ ok: true, co_token: coToken(github) });
  }
  ghiTokenRepo(github, token);
  res.json({ ok: true, co_token: true });
});

// Đổi repo đang chọn (repo switcher)
app.post('/api/repo/chon', (req, res) => {
  const github = ((req.body as { github?: string }).github ?? '').trim();
  const c = docConfig();
  const r = timRepo(c, github);
  if (!r) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho đổi repo.' });
  ghiConfig({ ...c, repo_dang_chon: r.github, repo: r });
  res.json({ ok: true, repo: r });
});

// Gỡ repo khỏi danh sách (KHÔNG xoá clone trên đĩa — dữ liệu lịch sử vẫn tra được)
app.post('/api/repo/go', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, loi: 'Chế độ demo không cho gỡ repo.' });
  const github = ((req.body as { github?: string }).github ?? '').trim();
  const c = docConfig();
  if (c.repos.length <= 1) return res.status(409).json({ ok: false, loi: 'Phải giữ ít nhất một repo.' });
  const conLai = c.repos.filter((r) => r.github !== github);
  if (conLai.length === c.repos.length) return res.status(404).json({ ok: false, loi: 'Repo không có trong danh sách' });
  const chon = c.repo_dang_chon === github ? conLai[0].github : c.repo_dang_chon;
  ghiConfig({ ...c, repos: conLai, repo_dang_chon: chon, repo: conLai.find((r) => r.github === chon) ?? conLai[0] });
  // R4.27 — clone và lịch sử thì giữ (R4.7), chìa thì không: chìa của repo đã gỡ nằm lại là rác có hại
  xoaTokenRepo(github);
  res.json({ ok: true });
});

// Kiểm một nhà cung cấp — bấm nút trong Cấu hình, biết ngay thay vì chạy cả lượt chấm mới lộ lỗi.
app.post('/api/thu-ncc', async (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, thong_diep: 'Chế độ demo không cho kiểm nhà cung cấp.', giay: 0 });
  const ma = (req.body as { ncc?: MaNcc }).ncc;
  if (!ma || !DANH_MUC_NCC.some((d) => d.ma === ma)) return res.status(422).json({ ok: false, thong_diep: 'Nhà cung cấp không hợp lệ', giay: 0 });
  const c = docConfig();
  const dn = dinhNghia(ma);
  const cfg = c.agent.ncc_cau_hinh[ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
  try {
    res.json(await thuNcc(ma, cfg));
  } catch (e) {
    res.status(500).json({ ok: false, giay: 0, thong_diep: (e as Error).message.slice(0, 300) });
  }
});

// CỔNG: chỉ nhà cung cấp đã kiểm THÀNH CÔNG với đúng cấu hình hiện tại mới được chọn để chấm.
app.post('/api/chon-ncc', (req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, thong_diep: 'Chế độ demo không cho đổi nhà cung cấp.' });
  const ma = (req.body as { ncc?: MaNcc }).ncc;
  if (!ma || !DANH_MUC_NCC.some((d) => d.ma === ma)) return res.status(422).json({ ok: false, thong_diep: 'Nhà cung cấp không hợp lệ' });
  const c = docConfig();
  const dn = dinhNghia(ma);
  const cfg = c.agent.ncc_cau_hinh[ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
  const kiem = kiemConHieuLuc(ma, cfg);
  if (!kiem) {
    return res.status(409).json({
      ok: false,
      thong_diep: `Chưa kiểm thành công ${dn.ten} với model ${cfg.model} / ${cfg.phuong_thuc === 'thue_bao' ? 'gói thuê bao' : 'API'} — bấm Kiểm tra trước đã.`,
    });
  }
  ghiConfig({ ...c, agent: { ...c.agent, ncc: ma } });
  res.json({ ok: true, thong_diep: `Đã chuyển sang ${dn.ten} (${cfg.model})` });
});

app.post('/api/runs', upload.single('tep'), async (req, res) => {
  if (rm.soDangChay() >= 2) {
    return res
      .status(429)
      .send(khung('CheckMate — đang bận', '<h1>Đang có run chạy</h1><p class="sub">Checker đang bận kiểm 2 artifact — chờ xong rồi thử lại. <a href="/">← quay lại</a></p>'));
  }
  const { kieu, preset, noi_dung, so } = req.body as { kieu?: string; preset?: string; noi_dung?: string; so?: string };
  const cfg = docConfig();
  let id: string;
  const muonJson = (req.headers.accept ?? '').includes('application/json');
  if (kieu === 'pr') {
    const soPr = Number(so);
    if (!Number.isInteger(soPr) || soPr <= 0) return res.status(422).send('Số PR không hợp lệ');
    // R4.25 — repo thiếu chìa thì chặn NGAY, đừng khởi chạy rồi chết ở giữa: người dùng mất vài phút
    // chờ và lịch sử có thêm một lượt hỏng, trong khi nguyên nhân đã biết trước từ trước khi bấm.
    // R5.17 — tổ hợp model+phương thức cấm (config sửa tay) thì từ chối TRƯỚC khi khởi chạy, lời rõ
    try {
      cauHinhDeCham(cfg);
    } catch (e) {
      if (e instanceof LoiCauHinhNcc) {
        if (muonJson) return res.status(412).json({ loi: e.message });
        return res.status(412).send(khung('CheckMate — cấu hình không hợp lệ', `<h1>Cấu hình model không hợp lệ</h1><p class="sub">${escHtml(e.message)} <a href="/settings">→ Cài đặt</a></p>`));
      }
      throw e;
    }
    if (!coDuongVaoGithub(cfg.repo.github)) {
      const loi = `Repo ${cfg.repo.github} chưa có GitHub token nên không đọc được PR, và máy chủ cũng không có \`gh\` đã đăng nhập. Vào ⚙ Cài đặt → dán token cho repo này.`;
      if (muonJson) return res.status(412).json({ loi });
      return res
        .status(412)
        .send(khung('CheckMate — thiếu token', `<h1>Repo chưa có token</h1><p class="sub">${loi} <a href="/settings">→ Cài đặt</a></p>`));
    }
    try {
      const pr = fetchVaRouter(cfg, soPr);
      let tacGia: string | undefined;
      try { tacGia = (await layPrHienTai(cfg, pr.so)).tacGia; } catch { /* thiếu tác giả không chặn run */ }
      if (rm.dangChayPr(pr.so)) {
        if (muonJson) return res.status(409).json({ loi: `PR #${pr.so} đang được chấm — chờ run hiện tại xong` });
        return res.status(409).send(khung('CheckMate — đang chấm', `<h1>PR #${pr.so} đang được chấm</h1><p class="sub">Một run khác đang chạy trên PR này — hai run song song sẽ ra hai verdict trùng. <a href="/">← quay lại</a></p>`));
      }
      const daCham = rm.timTheoPr(pr.so, pr.headSha);
      if (daCham && muonJson && (req.body as Record<string, string>).ep !== '1') {
        return res.status(409).json({ da_cham_run_id: daCham.id, verdict: daCham.verdict?.result });
      }
      if (daCham && (req.body as Record<string, string>).ep !== '1') {
        return res.status(409).send(
          khung(
            'CheckMate — đã có verdict',
            `<h1>Commit này đã được chấm rồi</h1>
<p class="sub">PR #${pr.so} @ <code>${pr.headSha.slice(0, 7)}</code> đã có verdict <b>${daCham.verdict?.result}</b> (${daCham.verdict?.findings.length} finding). Chạy lại trên cùng commit gần như chắc chắn ra kết quả cũ mà vẫn tốn vài phút.</p>
<p><a class="btn" href="/runs/${daCham.id}">Xem verdict đã có →</a></p>
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
          envAgent(cfg),
          { so: pr.so, headSha: pr.headSha, tacGia },
          cfg.repo.github,
        );
      } else {
        id = rm.batDau(
          `PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`,
          'code',
          ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef],
          envAgent(cfg),
          { so: pr.so, headSha: pr.headSha, tacGia },
          cfg.repo.github,
        );
      }
    } catch (e) {
      return res.status(500).send(khung('CheckMate', `<h1>Không chạy được PR #${so}</h1><p class="sub">${(e as Error).message.slice(0, 300)} · <a href="/">← quay lại</a></p>`));
    }
  } else if (kieu === 'doc') {
    const nd = (noi_dung ?? '').trim();
    if (nd.length < 200) return res.status(422).send(khung('CheckMate', '<h1>Tài liệu quá ngắn</h1><p class="sub">Cần tối thiểu 200 ký tự để kiểm có nghĩa. <a href="/">← quay lại</a></p>'));
    const f = join(TMP_DOC, `doc-${Date.now()}.md`);
    writeFileSync(f, nd, 'utf8');
    id = rm.batDau('Tài liệu dán tay', 'doc', ['--skill', 'doc', '--file', f], envAgent(cfg), undefined, cfg.repo.github);
  } else if (kieu === 'upload') {
    if (!req.file) return res.status(422).send(khung('CheckMate', '<h1>Chưa chọn file</h1><p class="sub"><a href="/">← quay lại</a></p>'));
    let text: string;
    try {
      text = (await trichText(req.file.originalname, req.file.buffer)).trim();
    } catch (e) {
      return res.status(422).send(khung('CheckMate', `<h1>Không đọc được file</h1><p class="sub">${(e as Error).message} · <a href="/">← quay lại</a></p>`));
    }
    if (text.length < 200) {
      return res.status(422).send(khung('CheckMate', '<h1>Nội dung trích ra quá ngắn</h1><p class="sub">File có thể là bản scan/ảnh (chưa hỗ trợ OCR) hoặc rỗng. <a href="/">← quay lại</a></p>'));
    }
    const f = join(TMP_DOC, `up-${Date.now()}.md`);
    writeFileSync(f, text, 'utf8');
    id = rm.batDau(`Tài liệu tải lên · ${req.file.originalname}`, 'doc', ['--skill', 'doc', '--file', f], envAgent(cfg), undefined, cfg.repo.github);
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
  res.json({ repo: repo ?? null, ho_so: tinhHoSo(docSoCaiKho(repo ? { repo } : {})) });
});

app.get('/api/cau-hinh', (_req, res) => {
  const c = docConfig();
  const cfgNcc = cauHinhHienTai(c);
  // KHÔNG trả khoá hay token — chỉ trả trạng thái đủ để giao diện hiển thị
  res.json({
    che_do: MODE,
    repo_dang_chon: c.repo_dang_chon,
    repos: c.repos.map((r) => ({ ...r, co_clone: coFile(r.local_path), co_token: coToken(r.github), token_rieng: Boolean(docTokenRieng(r.github)), co_duong_vao: coDuongVaoGithub(r.github) })),
    agent: { ncc: c.agent.ncc, phuong_thuc: cfgNcc.phuong_thuc, model: cfgNcc.model, max_probe: c.agent.max_probe, skeptic: c.agent.skeptic },
    truc: c.truc,
    so_dang_chay: rm.soDangChay(),
  });
});

app.get('/api/repos', (_req, res) => {
  const c = docConfig();
  res.json(
    c.repos.map((r) => ({
      ...r,
      dang_chon: r.github === c.repo_dang_chon,
      co_clone: coFile(r.local_path),
      co_token: coToken(r.github),
      token_rieng: Boolean(docTokenRieng(r.github)),
      co_duong_vao: coDuongVaoGithub(r.github),
      so_luot_cham: rm.dem({ repo: r.github }),
    })),
  );
});

// JSON API (phục vụ MCP B4.4 + tích hợp ngoài)
app.get('/api/prs', async (_req, res) => {
  const cfg = docConfig();
  try {
    const prs = await danhSachPr(cfg);
    res.json(prs.map((p) => {
      const daCham = rm.timTheoPr(p.so, p.headSha);
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
  if (!st) return res.status(404).send(khung('CheckMate', '<h1>Không tìm thấy run</h1><p class="sub"><a href="/">← quay lại</a></p>'));
  res.send(trangRun(st.meta, req.query.replay === '1', Math.min(32, Math.max(1, Number(req.query.speed) || 1))));
});

// ---- Cổng merge / trả về dev (spec §10) ----
function loiCong(res: import('express').Response, ma: number, thongBao: string): void {
  res.status(ma).send(khung('CheckMate — cổng merge', `<h1>Không thực hiện được</h1><p class="sub">${thongBao}</p>`));
}

app.post('/api/runs/:id/merge', async (req, res) => {
  if (MODE === 'demo') return loiCong(res, 403, 'Chế độ demo không cho thao tác cổng merge (chỉ xem).');
  const st = rm.lay(req.params.id);
  const cfg = docConfig();
  if (!st || !st.meta.verdict || !st.meta.pr) return loiCong(res, 404, 'Run không tồn tại hoặc không gắn PR. <a href="/">← về trang chính</a>');
  const daCong = rm.congHienTai(st.meta.id); // đọc TƯƠI từ sổ — bản trong bộ nhớ có thể cũ (R6.26)
  if (daCong) return loiCong(res, 409, `Run này đã ${daCong.hanhDong} lúc ${daCong.luc}.`);
  const v = st.meta.verdict;
  const d = demMuc(v.findings);
  if (d.high > 0 || v.result === 'FAIL') return loiCong(res, 403, 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.');
  // W5: client gửi DANH SÁCH id finding đã tick — server so khớp tập với các finding medium thật của verdict
  // R11.1 + R11.18 — đọc danh tính và ép quyền TRƯỚC khối try bắt lỗi GitHub: người thiếu quyền mà
  // nhận thông báo «GitHub từ chối» là báo sai hẳn bản chất, và họ sẽ đi hỏi nhầm người.
  let dtMerge;
  try {
    dtMerge = layDanhTinh(req);
    epBamCong(dtMerge);
  } catch (e) {
    return loiCong(res, e instanceof LoiDanhTinh && e.ma === 'khong_du_quyen' ? 403 : 401, (e as Error).message);
  }
  const tickIds = String((req.body as Record<string, string>).tick_ids ?? '').split(',').filter(Boolean);
  const mediumIds = v.findings.filter((f) => chuanMuc(f.severity) === 'medium').map((f) => f.id);
  const thieu = mediumIds.filter((id) => !tickIds.includes(id));
  if (thieu.length > 0) return loiCong(res, 422, `Phải xác nhận đủ ${d.medium} cảnh báo MEDIUM — còn thiếu: ${thieu.join(', ')}.`);
  try {
    const hienTai = await layPrHienTai(cfg, st.meta.pr.so);
    if (hienTai.state !== 'open') return loiCong(res, 409, `PR #${st.meta.pr.so} không còn mở (${hienTai.merged ? 'đã merge' : hienTai.state}).`);
    if (hienTai.headSha !== st.meta.pr.headSha) {
      return loiCong(res, 409, `PR đã có commit mới (${hienTai.headSha.slice(0, 7)} ≠ ${st.meta.pr.headSha.slice(0, 7)}) — verdict cũ hết hiệu lực, chạy kiểm lại rồi mới merge. <a href="/">← về trang chính</a>`);
    }
    const nguoi = dtMerge.ten;
    const xacNhan = v.findings.filter((f) => chuanMuc(f.severity) === 'medium').map((f) => f.title_vi);
    await binhLuanPr(cfg, st.meta.pr.so, banReceipt(v, nguoi, xacNhan));
    await mergePr(cfg, st.meta.pr.so, `${st.meta.tieuDe} (#${st.meta.pr.so})`,
      `CheckMate: PASS @ ${v.artifact_ref.sha_or_hash.slice(0, 10)} · run ${v.run_id}${xacNhan.length ? ` · ${xacNhan.length} cảnh báo medium được ${nguoi} chấp nhận` : ''}`,
      st.meta.pr.headSha); // W1: GitHub tự 409 nếu head đã đổi — đóng nốt cửa sổ race sau lần layPrHienTai ở trên
    ghiSo({ hanhDong: 'merge', pr: st.meta.pr.so, sha: st.meta.pr.headSha, run_id: st.meta.id, verdict: v.result, nguoi, tac_gia_pr: st.meta.pr.tacGia, xac_nhan_medium: xacNhan });
    rm.dongBoCongTuSo(st.meta.id); // bề mặt đọc lại TỪ sổ (R6.26)
    res.redirect(303, `/runs/${st.meta.id}`);
  } catch (e) {
    loiCong(res, 500, `GitHub từ chối: ${(e as Error).message.slice(0, 300)}`);
  }
});

app.post('/api/runs/:id/reject', async (req, res) => {
  if (MODE === 'demo') return loiCong(res, 403, 'Chế độ demo không cho thao tác cổng merge (chỉ xem).');
  const st = rm.lay(req.params.id);
  const cfg = docConfig();
  if (!st || !st.meta.verdict || !st.meta.pr) return loiCong(res, 404, 'Run không tồn tại hoặc không gắn PR.');
  const daCong = rm.congHienTai(st.meta.id); // đọc TƯƠI từ sổ — bản trong bộ nhớ có thể cũ (R6.26)
  if (daCong) return loiCong(res, 409, `Run này đã ${daCong.hanhDong} lúc ${daCong.luc}.`);
  let dtReject;
  try {
    dtReject = layDanhTinh(req);
    epBamCong(dtReject);
  } catch (e) {
    return loiCong(res, e instanceof LoiDanhTinh && e.ma === 'khong_du_quyen' ? 403 : 401, (e as Error).message);
  }
  const b = req.body as Record<string, string>;
  try {
    const nguoi = dtReject.ten;
    // W4: đóng PR (không-hoàn-tác) TRƯỚC — comment nói "PR đã đóng" chỉ được đăng khi điều đó đã đúng
    await dongPr(cfg, st.meta.pr.so);
    let kenh: 'review' | 'comment' | 'loi_comment' = 'comment';
    try {
      kenh = await traVeDev(cfg, st.meta.pr.so, banPhanQuyet(st.meta.verdict, (b.ghi_chu ?? '').trim(), true));
    } catch (e) {
      kenh = 'loi_comment';
      console.error('Reject: PR đã đóng nhưng post phán quyết lỗi:', (e as Error).message.slice(0, 200));
    }
    ghiSo({ hanhDong: 'reject', pr: st.meta.pr.so, sha: st.meta.pr.headSha, run_id: st.meta.id, verdict: st.meta.verdict.result, nguoi, tac_gia_pr: st.meta.pr.tacGia, kenh, dong_pr: true,
      ghi_chu: [(b.ghi_chu ?? '').trim(), `đã đóng PR + phán quyết qua ${kenh === 'loi_comment' ? 'LỖI post (đóng vẫn hiệu lực)' : kenh} (chờ dev vá & reopen)`].filter(Boolean).join(' · ') });
    rm.dongBoCongTuSo(st.meta.id); // bề mặt đọc lại TỪ sổ (R6.26)
    res.redirect(303, `/runs/${st.meta.id}`);
  } catch (e) {
    loiCong(res, 500, `GitHub từ chối: ${(e as Error).message.slice(0, 300)}`);
  }
});

app.get('/api/runs/:id/events', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).end();
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const gui = (ev: { t: number; e: unknown }) => res.write(`data: ${JSON.stringify(ev)}\n\n`);

  const timed = req.query.timed === '1' && st.meta.trangThai !== 'dang_chay';
  if (timed) {
    // phát lại đúng nhịp thời gian gốc (chế độ sân khấu); ?speed=N để tua nhanh khi tổng duyệt
    const speed = Math.min(32, Math.max(1, Number(req.query.speed) || 1));
    const timers = st.events.map((ev) => setTimeout(() => gui(ev), Math.round(ev.t / speed)));
    const cuoi = Math.round((st.events.length ? st.events[st.events.length - 1].t : 0) / speed);
    const ket = setTimeout(() => { gui({ t: cuoi, e: { type: 'log', msg: '__END__' } }); res.end(); }, cuoi + 300);
    req.on('close', () => { timers.forEach(clearTimeout); clearTimeout(ket); });
    return;
  }

  for (const ev of st.events) gui(ev);
  if (st.meta.trangThai !== 'dang_chay') {
    gui({ t: 0, e: { type: 'log', msg: '__END__' } });
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
  const { chuyen } = diTruTokenRepo();
  if (chuyen.length) console.log(`Đã chuyển token dùng chung thành token riêng cho ${chuyen.length} repo: ${chuyen.join(', ')}`);
  // Xác của lần chạy trước: hàng `dang_chay` mồ côi khoá trần song song vĩnh viễn nếu không dọn
  // Sổ phải đúng ngay từ lượt khởi động: máy chỉ chấm bằng tay không có chu kỳ trực nào để bám vào.
  void chayDoiSoat();
  const moCoi = rm.donLuotMoCoi();
  if (moCoi.length) console.log(`Đã dọn ${moCoi.length} lượt chấm bỏ dở của lần chạy trước: ${moCoi.join(', ')}`);
  console.log(`CheckMate web: http://127.0.0.1:${port}`);
});
