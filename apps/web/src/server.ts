import express from 'express';
import multer from 'multer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DINH_DANG_NHAN, trichText } from './extract.js';
import { GOC } from './paths.js';
import { RunManager } from './runs.js';
import { khung, khoiDaTraVe, khoiPrList, trangChu, trangRun, trangSettings } from './ui.js';
import { MODE, cheToken, docConfig, envAgent, ghiConfig } from './config.js';
import { danhSachPr, dongPr, fetchVaRouter, ganTrangThaiCommit, layPrHienTai, mergePr, binhLuanPr, traVeDev } from './github.js';
import { banPhanQuyet, banReceipt, banVerdictTuDong, demMuc, ghiSo, nguoiThaoTac } from './cong.js';
import { backfillSoCai, docSoCai } from './ledger.js';
import { tinhHoSo } from './tincay.js';
import { trangHoSoTacGia, trangTinCay } from './ui-tincay.js';
import { trangLedger } from './ui-ledger.js';
import { trangDocs } from './ui-docs.js';
import { docTrangThaiNguon, thuNguon } from './nguon-model.js';
import { chuanMuc } from '../../../packages/shared/src/types.js';

const app = express();
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(express.json({ limit: '300kb' }));

const rm = new RunManager();
const TMP_DOC = join(GOC, 'web-runs', 'tmp');
mkdirSync(TMP_DOC, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
{
  const them = backfillSoCai(rm.danhSach());
  if (them > 0) console.log(`Sổ cái verdict: backfill ${them} run cũ vào sổ`);
}

// ---- Chế độ trực (B4.3): hook run-xong + poller ----
rm.onXong = (meta) => {
  const cfg = docConfig();
  if (!meta.pr || !meta.verdict || !cfg.truc.bat || !cfg.truc.tu_dong_comment) return;
  const v = meta.verdict;
  const pr = meta.pr;
  void (async () => {
    try {
      await binhLuanPr(cfg, pr.so, banVerdictTuDong(v));
      await ganTrangThaiCommit(cfg, pr.headSha, v.result === 'PASS' ? 'success' : 'failure',
        v.result === 'PASS' ? 'CheckMate: PASS' : `CheckMate: FAIL — ${v.findings.length} finding`);
      console.log(`Chế độ trực: đã báo verdict ${v.result} lên PR #${pr.so}`);
    } catch (e) {
      console.error('Chế độ trực (báo verdict):', (e as Error).message);
    }
  })();
};

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
      ['--skill', 'doc', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--file', pr.fileDoc!], envAgent(cfg), meta) };
  }
  // W2: truyền SHA đã pin thay vì tên ref dùng chung — ref bị force-move giữa chừng không đổi được commit bị chấm
  return { id: rm.batDau(`PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`, 'code',
    ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef], envAgent(cfg), meta) };
}

let dangQuet = false;
let lanQuetCuoi = 0;
setInterval(() => {
  void (async () => {
    const cfg = docConfig();
    if (!cfg.truc.bat || dangQuet) return;
    if (Date.now() - lanQuetCuoi < cfg.truc.chu_ky_giay * 1000) return;
    dangQuet = true;
    lanQuetCuoi = Date.now();
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

app.get('/ledger', (_req, res) => {
  const congTheoRun = new Map<string, string>();
  for (const m of rm.danhSach()) {
    if (m.ketQuaCong) congTheoRun.set(m.id, `${m.ketQuaCong.hanhDong === 'merge' ? 'đã merge' : 'trả về dev'} · ${m.ketQuaCong.nguoi}`);
  }
  res.send(trangLedger(docSoCai(), congTheoRun));
});

app.get('/tin-cay', (_req, res) => {
  res.send(trangTinCay(tinhHoSo(docSoCai())));
});

app.get('/tin-cay/:tacGia', (req, res) => {
  const soCai = docSoCai();
  const tacGia = req.params.tacGia;
  const hoSo = tinhHoSo(soCai).find((h) => h.tacGia === tacGia);
  res.send(trangHoSoTacGia(tacGia, hoSo, soCai.filter((m) => m.tac_gia === tacGia && m.pr)));
});

app.get('/settings', (req, res) => {
  const c = docConfig();
  res.send(
    trangSettings({
      mode: MODE,
      repoGithub: c.repo.github,
      baseBranch: c.repo.base_branch,
      localPath: c.repo.local_path,
      tokenChe: cheToken(c.github_token),
      provider: c.agent.provider,
      model: c.agent.model,
      maxProbe: c.agent.max_probe,
      skeptic: c.agent.skeptic,
      trucBat: c.truc.bat,
      trucChuKy: c.truc.chu_ky_giay,
      trucComment: c.truc.tu_dong_comment,
      nguon: docTrangThaiNguon(c),
      daLuu: req.query.luu === '1',
    }),
  );
});

app.post('/settings', (req, res) => {
  if (MODE === 'demo') return res.status(403).send(khung('CheckMate', '<h1>403</h1><p class="sub">Chế độ demo không cho sửa cấu hình. <a href="/settings">← quay lại</a></p>'));
  const b = req.body as Record<string, string>;
  const c = docConfig();
  const moi = {
    repo: {
      github: (b.repo_github ?? c.repo.github).trim(),
      base_branch: (b.base_branch ?? c.repo.base_branch).trim(),
      local_path: (b.local_path ?? c.repo.local_path).trim(),
    },
    github_token: b.github_token?.trim() ? b.github_token.trim() : c.github_token,
    agent: {
      provider: (b.provider === 'api' ? 'api' : 'cli') as 'cli' | 'api',
      model: (b.model ?? c.agent.model).trim(),
      max_probe: Math.min(12, Math.max(2, Number(b.max_probe) || 6)),
      skeptic: b.skeptic === '1',
    },
    truc: {
      bat: b.truc_bat === '1',
      chu_ky_giay: Math.min(3600, Math.max(60, Number(b.truc_chu_ky) || 300)),
      tu_dong_comment: b.truc_comment === '1',
    },
  };
  if (!/^[\w.-]+\/[\w.-]+$/.test(moi.repo.github)) return res.status(422).send('Repo phải dạng owner/tên');
  ghiConfig(moi);
  res.redirect(303, '/settings?luu=1');
});

// Thử nguồn model đang chọn — bấm nút trong Cấu hình, biết ngay thay vì chạy cả lượt chấm mới lộ lỗi
app.post('/api/thu-nguon', async (_req, res) => {
  if (MODE === 'demo') return res.status(403).json({ ok: false, thong_diep: 'Chế độ demo không cho thử nguồn model.', giay: 0 });
  try {
    res.json(await thuNguon(docConfig()));
  } catch (e) {
    res.status(500).json({ ok: false, giay: 0, thong_diep: (e as Error).message.slice(0, 300) });
  }
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
        );
      } else {
        id = rm.batDau(
          `PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`,
          'code',
          ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--base', pr.baseRef],
          envAgent(cfg),
          { so: pr.so, headSha: pr.headSha, tacGia },
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
    id = rm.batDau('Tài liệu dán tay', 'doc', ['--skill', 'doc', '--file', f], envAgent(cfg));
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
    id = rm.batDau(`Tài liệu tải lên · ${req.file.originalname}`, 'doc', ['--skill', 'doc', '--file', f], envAgent(cfg));
  } else {
    return res.status(422).send('Thiếu loại artifact');
  }
  if (muonJson) return res.json({ run_id: id });
  res.redirect(303, `/runs/${id}`);
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
  if (st.meta.ketQuaCong) return loiCong(res, 409, `Run này đã ${st.meta.ketQuaCong.hanhDong} lúc ${st.meta.ketQuaCong.luc}.`);
  const v = st.meta.verdict;
  const d = demMuc(v.findings);
  if (d.high > 0 || v.result === 'FAIL') return loiCong(res, 403, 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.');
  // W5: client gửi DANH SÁCH id finding đã tick — server so khớp tập với các finding medium thật của verdict
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
    const nguoi = nguoiThaoTac();
    const xacNhan = v.findings.filter((f) => chuanMuc(f.severity) === 'medium').map((f) => f.title_vi);
    await binhLuanPr(cfg, st.meta.pr.so, banReceipt(v, nguoi, xacNhan));
    await mergePr(cfg, st.meta.pr.so, `${st.meta.tieuDe} (#${st.meta.pr.so})`,
      `CheckMate: PASS @ ${v.artifact_ref.sha_or_hash.slice(0, 10)} · run ${v.run_id}${xacNhan.length ? ` · ${xacNhan.length} cảnh báo medium được ${nguoi} chấp nhận` : ''}`,
      st.meta.pr.headSha); // W1: GitHub tự 409 nếu head đã đổi — đóng nốt cửa sổ race sau lần layPrHienTai ở trên
    const kq = { hanhDong: 'merge' as const, luc: new Date().toISOString(), nguoi, chiTiet: `merge PR #${st.meta.pr.so} @ ${st.meta.pr.headSha.slice(0, 7)}` };
    rm.ghiKetQuaCong(st.meta.id, kq);
    ghiSo({ hanhDong: 'merge', pr: st.meta.pr.so, sha: st.meta.pr.headSha, run_id: v.run_id, verdict: v.result, nguoi, xac_nhan_medium: xacNhan });
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
  if (st.meta.ketQuaCong) return loiCong(res, 409, `Run này đã ${st.meta.ketQuaCong.hanhDong} lúc ${st.meta.ketQuaCong.luc}.`);
  const b = req.body as Record<string, string>;
  try {
    const nguoi = nguoiThaoTac();
    // W4: đóng PR (không-hoàn-tác) TRƯỚC — comment nói "PR đã đóng" chỉ được đăng khi điều đó đã đúng
    await dongPr(cfg, st.meta.pr.so);
    let kenh: 'review' | 'comment' | 'loi_comment' = 'comment';
    try {
      kenh = await traVeDev(cfg, st.meta.pr.so, banPhanQuyet(st.meta.verdict, (b.ghi_chu ?? '').trim(), true));
    } catch (e) {
      kenh = 'loi_comment';
      console.error('Reject: PR đã đóng nhưng post phán quyết lỗi:', (e as Error).message.slice(0, 200));
    }
    const kq = { hanhDong: 'reject' as const, luc: new Date().toISOString(), nguoi, chiTiet: `đã đóng PR + phán quyết qua ${kenh === 'loi_comment' ? 'LỖI post (đóng vẫn hiệu lực)' : kenh} (chờ dev vá & reopen)` };
    rm.ghiKetQuaCong(st.meta.id, kq);
    ghiSo({ hanhDong: 'reject', pr: st.meta.pr.so, sha: st.meta.pr.headSha, run_id: st.meta.verdict.run_id, verdict: st.meta.verdict.result, nguoi, kenh, dong_pr: true });
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
  console.log(`CheckMate web: http://127.0.0.1:${port}`);
});
