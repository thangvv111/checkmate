import express from 'express';
import multer from 'multer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DINH_DANG_NHAN, trichText } from './extract.js';
import { GOC } from './paths.js';
import { RunManager } from './runs.js';
import { khung, khoiPrList, trangChu, trangRun, trangSettings } from './ui.js';
import { MODE, cheToken, docConfig, envAgent, ghiConfig } from './config.js';
import { danhSachPr, fetchVaRouter } from './github.js';

const app = express();
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(express.json({ limit: '300kb' }));

const rm = new RunManager();
const TMP_DOC = join(GOC, 'web-runs', 'tmp');
mkdirSync(TMP_DOC, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.get('/', async (_req, res) => {
  const cfg = docConfig();
  let prBlock: string;
  try {
    const prs = await danhSachPr(cfg);
    prBlock = khoiPrList(cfg.repo.github, cfg.repo.base_branch, prs, '');
  } catch (e) {
    prBlock = khoiPrList(cfg.repo.github, cfg.repo.base_branch, null, (e as Error).message.slice(0, 200));
  }
  res.send(trangChu(rm.danhSach(), prBlock));
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
  };
  if (!/^[\w.-]+\/[\w.-]+$/.test(moi.repo.github)) return res.status(422).send('Repo phải dạng owner/tên');
  ghiConfig(moi);
  res.redirect(303, '/settings?luu=1');
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
  if (kieu === 'pr') {
    const soPr = Number(so);
    if (!Number.isInteger(soPr) || soPr <= 0) return res.status(422).send('Số PR không hợp lệ');
    try {
      const pr = fetchVaRouter(cfg, soPr);
      if (pr.loai === 'doc') {
        id = rm.batDau(
          `PR #${pr.so} · tài liệu ${pr.fileDoc}`,
          'doc',
          ['--skill', 'doc', '--repo', cfg.repo.local_path, '--branch', pr.headSha, '--file', pr.fileDoc!],
          envAgent(cfg),
        );
      } else {
        id = rm.batDau(
          `PR #${pr.so} · code (${pr.filesDoi.length} file đổi)`,
          'code',
          ['--skill', 'code', '--repo', cfg.repo.local_path, '--branch', pr.headRef, '--base', pr.baseRef],
          envAgent(cfg),
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
  res.redirect(303, `/runs/${id}`);
});

app.get('/runs/:id', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).send(khung('CheckMate', '<h1>Không tìm thấy run</h1><p class="sub"><a href="/">← quay lại</a></p>'));
  res.send(trangRun(st.meta, req.query.replay === '1'));
});

app.get('/api/runs/:id/events', (req, res) => {
  const st = rm.lay(req.params.id);
  if (!st) return res.status(404).end();
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const gui = (ev: { t: number; e: unknown }) => res.write(`data: ${JSON.stringify(ev)}\n\n`);

  const timed = req.query.timed === '1' && st.meta.trangThai !== 'dang_chay';
  if (timed) {
    // phát lại đúng nhịp thời gian gốc (chế độ sân khấu)
    const timers = st.events.map((ev) => setTimeout(() => gui(ev), ev.t));
    const cuoi = st.events.length ? st.events[st.events.length - 1].t : 0;
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
