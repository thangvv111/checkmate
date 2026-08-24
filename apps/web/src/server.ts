import express from 'express';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOC, PRESETS } from './presets.js';
import { RunManager } from './runs.js';
import { khung, trangChu, trangRun } from './ui.js';

const app = express();
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(express.json({ limit: '300kb' }));

const rm = new RunManager();
const TMP_DOC = join(GOC, 'web-runs', 'tmp');
mkdirSync(TMP_DOC, { recursive: true });

app.get('/', (_req, res) => {
  res.send(trangChu(PRESETS, rm.danhSach()));
});

app.post('/api/runs', (req, res) => {
  if (rm.soDangChay() >= 2) {
    return res
      .status(429)
      .send(khung('CheckMate — đang bận', '<h1>Đang có run chạy</h1><p class="sub">Checker đang bận kiểm 2 artifact — chờ xong rồi thử lại. <a href="/">← quay lại</a></p>'));
  }
  const { kieu, preset, noi_dung } = req.body as { kieu?: string; preset?: string; noi_dung?: string };
  let id: string;
  if (kieu === 'preset') {
    const p = PRESETS.find((x) => x.id === preset);
    if (!p) return res.status(422).send('Preset không tồn tại');
    id = rm.batDau(p.tieuDe, p.skill, p.args);
  } else if (kieu === 'doc') {
    const nd = (noi_dung ?? '').trim();
    if (nd.length < 200) return res.status(422).send(khung('CheckMate', '<h1>Tài liệu quá ngắn</h1><p class="sub">Cần tối thiểu 200 ký tự để kiểm có nghĩa. <a href="/">← quay lại</a></p>'));
    const f = join(TMP_DOC, `doc-${Date.now()}.md`);
    writeFileSync(f, nd, 'utf8');
    id = rm.batDau('Tài liệu dán tay', 'doc', ['--skill', 'doc', '--file', f]);
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
