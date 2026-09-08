import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chuanMuc, type ArtifactRef, type Finding, type RunEvent, type Verdict } from '../../shared/src/types.js';
import { ProviderConfigError, pickProvider, checkProvider, costMetrics, costSummary } from './model.js';
import { runCodeSkill } from './skill-code.js';
import { decideResult } from './verdict.js';
import { runDocSkill } from './skill-doc.js';
import { parseOperatorMaxProbe, resolveVolumeStandard } from './volume-standard.js';
import { describeVolumeStandard } from '../../shared/src/volume-summary.js';

function layArg(ten: string, macDinh?: string): string | undefined {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 ? process.argv[i + 1] : macDinh;
}

const lenhJson = process.argv.includes('--json');

function phat(e: RunEvent): void {
  if (lenhJson) {
    console.log(JSON.stringify(e));
    return;
  }
  if (e.type === 'stage') console.log(`\n▶ [${e.stage}/5] ${e.ten}`);
  else if (e.type === 'log') console.log(`   ${e.msg}`);
  else if (e.type === 'finding') {
    const f = e.finding;
    const nhan = { high: 'HIGH — chặn', medium: 'MEDIUM — cảnh báo', low: 'LOW' }[f.severity] ?? f.severity;
    console.log(`\n   ✗ [${nhan}] ${f.title_vi}`);
    console.log(`     Điều gì sai: ${f.what_vi}`);
    console.log(`     Hậu quả:     ${f.consequence_vi}`);
    if (f.evidence.type === 'test_run') {
      console.log(`     Bằng chứng:  ${f.evidence.probe_name}`);
      console.log(`       kỳ vọng:  ${f.evidence.expected}`);
      console.log(`       thực tế:  ${f.evidence.actual.split('\n')[0]}`);
    } else if (f.evidence.type === 'quote_pair') {
      console.log(`     Bằng chứng:  ${f.evidence.loc_a}: «${f.evidence.quote_a}»`);
      console.log(`         đối lại  ${f.evidence.loc_b}: «${f.evidence.quote_b}»`);
    } else if (f.evidence.type === 'quote') {
      console.log(`     Bằng chứng (${f.evidence.rule}): ${f.evidence.loc}: «${f.evidence.quote}»`);
    }
  } else if (e.type === 'verdict') {
    const v = e.verdict;
    console.log(`\n════════════════════════════════════════`);
    console.log(` VERDICT: ${v.result}  ·  ${v.artifact_ref.name} @ ${v.artifact_ref.sha_or_hash.slice(0, 7)}`);
    const dem = (m: string) => v.findings.filter((f) => f.severity === m).length;
    console.log(` ${v.findings.length} finding (${dem('high')} high · ${dem('medium')} medium · ${dem('low')} low) · model ${v.model}`);
    // Lấy từ trường có kiểu — KHÔNG đếm lại danh sách finding đã cắt cho «trước khi cắt».
    console.log(` ${describeVolumeStandard(v.volume_standard)}`);
    if (v.probe_stats) {
      const ps = v.probe_stats;
      console.log(` Độ phủ: ${ps.ghi_nhan} probe ghi nhận / ${ps.ke_hoach} kế hoạch · ${ps.pass} pass · ${ps.hoi_quy} hồi quy · ${ps.ngoai_pham_vi} ngoài phạm vi · ${ps.nghi_van} nghi vấn${ps.bo_qua ? ` · ${ps.bo_qua} skip` : ''}${ps.that_lac.length ? ` · thất lạc: ${ps.that_lac.join(',')}` : ''}`);
    }
    if (v.spec_source) {
      const ss = v.spec_source;
      console.log(
        ss.units === 0
          ? ' ⚠ KHÔNG có luật đối chiếu — verdict yếu hơn lượt có luật; độ phủ luật không đo được'
          : ` Luật đối chiếu: ${ss.units} đơn vị từ ${ss.files.length} file (${ss.declared ? 'khai trong checkmate.yml' : 'tự dò'})${
              // SỐ ĐẾM, không phải tỉ lệ — xem chú thích ở `skill-code.ts` và luật `man-run`.
              v.probe_stats?.luat_tong !== undefined ? ` · ${v.probe_stats.luat_da_phu?.length ?? 0} luật có probe neo (kho ${v.probe_stats.luat_tong})` : ''
            }`,
      );
    }
    for (const q of v.quan_sat_ngoai_pr ?? []) {
      // Nhãn `nghi_loi_co_san` chỉ còn ở bản ghi ĐỜI CŨ — nó do thư viện probe sinh ra, và thư viện đã gỡ.
      console.log(` ⚠ Ngoài phạm vi PR${q.loai === 'nghi_loi_co_san' ? ' (nghi lỗi có sẵn — bản ghi đời cũ)' : ''}: ${q.probe_id} (${q.spec_rule}) — ${q.ten}`);
    }
    console.log(`════════════════════════════════════════`);
  } else if (e.type === 'error') console.error(`✗ LỖI: ${e.msg}`);
}

async function main(): Promise<void> {
  const lenh = process.argv[2];
  if (lenh !== 'run') {
    console.error('Cách dùng: checker run --skill code --repo <path> --branch <tên nhánh> [--base main] [--json] [--out <file>]');
    process.exit(2);
  }
  const skill = layArg('skill', 'code');
  const repo = layArg('repo');
  const branch = layArg('branch');
  const base = layArg('base', 'main')!;
  const file = layArg('file');
  if (skill === 'code' && (!repo || !branch)) {
    console.error('Skill code cần --repo và --branch');
    process.exit(2);
  }
  if (skill === 'doc' && !file) {
    console.error('Skill doc cần --file <đường dẫn tài liệu>');
    process.exit(2);
  }
  if (skill !== 'code' && skill !== 'doc') {
    console.error(`Skill "${skill}" không tồn tại (code | doc)`);
    process.exit(2);
  }

  try {
    checkProvider();
  } catch (e) {
    const msg = (e as Error).message;
    if (lenhJson) console.log(JSON.stringify({ type: 'error', msg }));
    else console.error(`✗ LỖI CẤU HÌNH: ${msg}`);
    process.exit(4); // 4 = cấu hình provider, phân biệt với 3 = lỗi khi chạy
  }

  const model = pickProvider();
  const events: RunEvent[] = [];

  /**
   * Sổ sự kiện CHỈ-GHI-THÊM trên đĩa — nguồn sự thật của lượt chấm.
   *
   * Trước đây sự kiện chỉ đi qua stdout tới tiến trình gọi và nằm trong bộ nhớ của nó tới lúc lượt
   * chấm kết thúc. Tiến trình đó dừng — khởi động lại, deploy, hay hỏng — thì mọi thứ tích luỹ được
   * đều bay, kể cả các bước đã chạy xong và đã trả tiền cho lời gọi model. Tiến trình con vẫn chạy
   * tiếp, nhưng nó đang nói vào một đường ống mà đầu kia đã tắt.
   *
   * Ghi NỐI TIẾP từng dòng, không ghi đè cả tệp: một lượt sinh vài trăm sự kiện, và ghi đè thì mỗi
   * lần lại phải giữ toàn bộ trong bộ nhớ — đúng thứ đang muốn thoát khỏi.
   */
  const soSuKien = layArg('events-out');
  if (soSuKien) mkdirSync(join(soSuKien, '..'), { recursive: true });
  const t0 = Date.now();

  const ghiPhat = (e: RunEvent): void => {
    events.push(e);
    if (soSuKien) {
      try {
        appendFileSync(soSuKien, `${JSON.stringify({ t: Date.now() - t0, e })}\n`, 'utf8');
      } catch (loi) {
        // KÊU TO, đừng nuốt. Sổ này là nguồn sự thật của lượt chấm — tiến trình gọi đọc nó chứ
        // không đọc stdout. Ghi hỏng mà im lặng thì lượt chấm vẫn chạy, vẫn đốt token, và biến mất
        // không dấu vết. stderr là đường duy nhất còn lại để nói ra.
        console.error(`✗ KHÔNG GHI ĐƯỢC SỔ SỰ KIỆN (${soSuKien}): ${(loi as Error).message}`);
      }
    }
    phat(e);
  };

  // Bộ chuẩn khối lượng giải ở ĐÂY — tầng duy nhất có cả repo lẫn base — rồi truyền xuống hai skill.
  // Đọc `standards` bằng `git show <base>:checkmate.yml`, không đọc đĩa; không repo (dán tay/tải lên) là
  // `no_repo`. Núm operator đến từ env do tầng web đặt (`agentEnv`), CLI tay thì vắng.
  const standards = resolveVolumeStandard(repo, repo ? base : null, parseOperatorMaxProbe(process.env.CHECKER_MAX_PROBE), (msg) =>
    ghiPhat({ type: 'log', msg }),
  );

  const nhan = skill === 'code' ? branch! : file!;
  const runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}-${nhan.replace(/[^\w-]/g, '_').slice(-40)}`;
  const batDau = new Date().toISOString();
  try {
    let findings: Finding[];
    let artifactRef: ArtifactRef;
    let probeStats: Verdict['probe_stats'];
    let quanSat: Verdict['quan_sat_ngoai_pr'];
    let diffBlindSpots: Verdict['diff_blind_spots'];
    let handover: Verdict['handover'];
    let handoverBoQua: Verdict['handover_bo_qua'];
    let noBaseline: Verdict['no_baseline'];
    let probeCompare: Verdict['probe_compare'];
    let specSource: Verdict['spec_source'];
    let volumeStandard: Verdict['volume_standard'];
    if (skill === 'code') {
      const kq = await runCodeSkill(model, repo!, branch!, base, ghiPhat, standards);
      findings = kq.findings;
      probeStats = kq.probeStats;
      volumeStandard = kq.volumeStandard;
      quanSat = kq.quanSat.length > 0 ? kq.quanSat : undefined;
      // Rỗng thì để VẮNG hẳn, đừng ghi `[]`: bản ghi đời cũ cũng vắng, nên hai bên đọc như nhau và
      // giao diện chỉ phải nhớ MỘT luật — vắng thì không bày khối đó.
      diffBlindSpots = kq.diffBlindSpots.length > 0 ? kq.diffBlindSpots : undefined;
      handover = kq.handover.length > 0 ? kq.handover : undefined;
      handoverBoQua = kq.handoverBoQua.length > 0 ? kq.handoverBoQua : undefined;
      noBaseline = kq.noBaseline ? true : undefined;
      probeCompare = kq.probeCompare.rows.length || kq.probeCompare.pass_both ? kq.probeCompare : undefined;
      // Luôn ghi, kể cả 0 đơn vị: «không có luật» là một khẳng định phải bày ra, không phải thiếu dữ liệu.
      specSource = kq.specSource;
      artifactRef = { type: 'pr', name: branch!, sha_or_hash: kq.target.branchSha };
    } else if (repo && branch) {
      // docs-as-code: đọc file ở đúng bản của nhánh/PR qua worktree
      const { execFileSync } = await import('node:child_process');
      const { Sandbox } = await import('./sandbox.js');
      const sha = execFileSync('git', ['rev-parse', branch], { cwd: repo, encoding: 'utf8' }).trim();
      const sb = new Sandbox(repo, sha);
      try {
        // `sb.dir` là cây NHÁNH PR — đúng cho tài liệu đang chấm, nhưng KHÔNG dùng để đọc chuẩn: chuẩn đã
        // giải ở trên từ nhánh gốc (`--base`, server truyền `pr.baseRef`).
        const kq = await runDocSkill(model, join(sb.dir, file!), ghiPhat, standards);
        findings = kq.findings;
        volumeStandard = kq.volume_standard;
        artifactRef = { type: 'doc', name: file!, sha_or_hash: sha };
      } finally {
        sb.huy();
      }
    } else {
      const kq = await runDocSkill(model, file!, ghiPhat, standards);
      findings = kq.findings;
      volumeStandard = kq.volume_standard;
      artifactRef = { type: 'doc', name: kq.tenFile, sha_or_hash: kq.hash };
    }
    const verdict: Verdict = {
      run_id: runId,
      skill,
      artifact_ref: artifactRef,
      result: decideResult(findings), // nhị phân, fail-closed với severity lạ (verdict.ts)
      findings,
      probe_stats: probeStats,
      chi_phi: costMetrics(),
      quan_sat_ngoai_pr: quanSat,
      diff_blind_spots: diffBlindSpots,
      handover,
      handover_bo_qua: handoverBoQua,
      no_baseline: noBaseline,
      probe_compare: probeCompare,
      spec_source: specSource,
      volume_standard: volumeStandard,
      // Ai bấm chạy — tầng web truyền xuống. Vắng = lượt do máy chạy (chế độ trực), và đó là một
      // khẳng định có nghĩa chứ không phải thiếu dữ liệu.
      run_by: layArg('run-by') || undefined,
      model: model.ten,
      mode: 'live',
      started_at: batDau,
      finished_at: new Date().toISOString(),
    };
    ghiPhat({ type: 'log', msg: `Chi phí lượt chấm: ${costSummary()}` });
    ghiPhat({ type: 'verdict', verdict });

    const outFile = layArg('out') ?? join('runs', `${runId}.json`);
    mkdirSync(join(outFile, '..'), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ verdict, events }, null, 2), 'utf8');
    if (!lenhJson) console.log(`\nĐã lưu run: ${outFile}`);
    process.exit(verdict.result === 'FAIL' ? 1 : 0);
  } catch (e) {
    const laCauHinh = e instanceof ProviderConfigError;
    ghiPhat({ type: 'error', msg: (laCauHinh ? 'Cấu hình provider: ' : '') + (e as Error).message });
    process.exit(laCauHinh ? 4 : 3);
  }
}

main();
