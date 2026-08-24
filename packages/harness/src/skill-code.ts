import type { Finding, RunEvent, Severity } from '../../shared/src/types.js';
import type { ModelProvider } from './model.js';
import { bocCode, bocJson } from './jsonx.js';
import { docTarget, type TargetInfo } from './target.js';
import { Sandbox, type KetQuaProbe } from './sandbox.js';

export interface KeHoachProbe {
  id: string;
  ten: string;
  muc_dich: string;
  spec_rule: string;
  ky_vong: string;
}

interface KetQuaSkillCode {
  findings: Finding[];
  target: TargetInfo;
  soProbe: number;
}

type PhatEvent = (e: RunEvent) => void;

function promptPhanTich(t: TargetInfo): string {
  const specs = t.specs.map((s) => `--- ${s.file} ---\n${s.noiDung}`).join('\n\n');
  return `Bạn là CHECKER ĐỐI KHÁNG trong quy trình maker–checker cho code. Nhiệm vụ của bạn là BÁC BỎ một pull request: tìm chỗ nó vi phạm spec, rồi đề xuất các phép thử (probe) chạy được để chứng minh.

# SPEC HÀNH VI (nguồn sự thật — mọi probe phải neo vào một luật ở đây)
${specs}

# TÀI LIỆU API CỦA REPO
${t.apiDoc}

# DIFF CỦA PULL REQUEST (so với ${t.base})
\`\`\`diff
${t.diff}
\`\`\`

# YÊU CẦU
Đề xuất TỐI ĐA 6 probe độc lập, mỗi probe kiểm MỘT hành vi mà spec khai. Ưu tiên các khuôn lỗi kinh điển:
- điều kiện KÉP bị gộp sai: thử TỪNG VẾ riêng (vế này đúng + vế kia sai, và ngược lại);
- giá trị BIÊN đúng ngưỡng của hằng số trong spec (biên đóng/mở);
- tính đúng tuyệt đối về TIỀN: tổng các phần phải bằng đúng tổng gốc, thử số CHIA KHÔNG HẾT;
- đường SAI phải trả lỗi nghiệp vụ 4xx kèm thông báo (trùng khoá, tham chiếu không tồn tại) — app-guard, không được vỡ thành 500;
- hành vi cũ không bị PR phá (probe kỳ vọng qua, để chứng minh PASS xứng đáng khi PR sạch).
Probe phải kiểm được qua HTTP (app.inject), KHÔNG import hàm nội bộ — để cùng một probe chạy được trên cả nhánh PR lẫn nhánh gốc.

Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"probes": [{"id": "P1", "ten": "...", "muc_dich": "...", "spec_rule": "R?", "ky_vong": "mô tả kỳ vọng theo spec (status/giá trị)"}]}`;
}

function promptSinhCode(t: TargetInfo, keHoach: KeHoachProbe[], loiLanTruoc?: string): string {
  return `Bạn là CHECKER ĐỐI KHÁNG. Hãy viết MỘT file test vitest (TypeScript) hiện thực đúng các probe sau, chạy trên repo có sẵn.

# KẾ HOẠCH PROBE
${JSON.stringify(keHoach, null, 2)}

# FILE TEST MẪU CỦA REPO (bắt chước đúng cách import, cách dựng app, cách inject — file của bạn sẽ nằm CÙNG THƯ MỤC test/)
\`\`\`ts
${t.testMau}
\`\`\`

# LUẬT VIẾT
- Mỗi probe = một \`it('<id>: <tên>', ...)\` — title BẮT BUỘC bắt đầu bằng đúng id probe (P1, P2...).
- Assert KỲ VỌNG THEO SPEC (không phải hành vi hiện tại của code). Probe fail nghĩa là code sai spec.
- Chỉ dùng HTTP qua app.inject; không import từ src/services; mỗi it tự dựng app với moDb(':memory:') hoặc dùng beforeEach như file mẫu.
- Dữ liệu tự tạo trong từng it (mã hồ sơ dùng dải HM-2026-8xxx để không đụng dữ liệu khác).
- Không dùng network, không setTimeout.
${loiLanTruoc ? `\n# LẦN TRƯỚC FILE CỦA BẠN LỖI THU THẬP — SỬA CHO CHẠY ĐƯỢC\n${loiLanTruoc}\n` : ''}
Trả lời CHỈ MỘT khối code trong fence \`\`\`ts (không giải thích gì thêm).`;
}

function promptKetLuan(
  keHoach: KeHoachProbe[],
  branchKq: KetQuaProbe[],
  baseKq: KetQuaProbe[],
  t: TargetInfo,
): string {
  const ghep = keHoach.map((p) => {
    const br = branchKq.find((r) => r.title.startsWith(p.id));
    const bs = baseKq.find((r) => r.title.startsWith(p.id));
    return {
      probe: p,
      nhanh_pr: br ? { status: br.status, loi: br.message } : { status: 'không chạy', loi: '' },
      nhanh_goc: bs ? { status: bs.status, loi: bs.message } : { status: 'không chạy', loi: '' },
    };
  });
  return `Bạn là CHECKER ĐỐI KHÁNG. Dưới đây là kết quả chạy CÙNG MỘT bộ probe trên nhánh PR và nhánh gốc (đối chứng). Phân loại từng probe FAIL thành finding hoặc bỏ.

# LUẬT PHÂN LOẠI
- PR fail + gốc pass → lỗi DO PR gây ra (hồi quy) → finding, mặc định blocking.
- Fail CẢ HAI: nếu nhánh gốc fail vì TÍNH NĂNG CHƯA TỒN TẠI (404 route, trường chưa có) còn nhánh PR fail vì SAI NGHIỆP VỤ → vẫn là finding trên code mới; nếu cả hai fail CÙNG một lý do → KHÔNG kết luận, bỏ probe đó.
- PR pass → không finding. Gốc fail + PR pass → PR cải thiện, không finding.
- severity: blocking cho sai phân quyền / sai tiền / 500-thay-4xx / mất dữ liệu; non_blocking cho sai thuần thông báo.

# DỮ LIỆU
${JSON.stringify(ghep, null, 2)}

# SPEC RÚT GỌN ĐỂ VIẾT CHO ĐÚNG NHÃN LUẬT
${t.specs.map((s) => s.file).join(', ')} — dùng đúng mã luật probe đã neo.

Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json, mỗi finding viết tiếng Việt cho người đọc nghiệp vụ:
{"findings": [{"probe_id": "P?", "severity": "blocking|non_blocking", "title_vi": "≤80 ký tự", "what_vi": "điều gì sai, 1–2 câu", "consequence_vi": "hậu quả nghiệp vụ, 1 câu"}], "ghi_chu": "probe nào bị bỏ vì không kết luận, vì sao"}`;
}

export async function chaySkillCode(
  model: ModelProvider,
  repo: string,
  branch: string,
  base: string,
  phat: PhatEvent,
): Promise<KetQuaSkillCode> {
  phat({ type: 'stage', stage: 1, ten: 'Nhận artifact — đọc diff PR' });
  const t = docTarget(repo, branch, base);
  phat({ type: 'log', msg: `PR ${branch} @ ${t.branchSha.slice(0, 7)} · đối chứng ${base} @ ${t.baseSha.slice(0, 7)} · diff ${t.diff.length} ký tự` });

  phat({ type: 'stage', stage: 2, ten: 'Đọc spec — nạp luật hành vi' });
  phat({ type: 'log', msg: `${t.specs.length} file spec: ${t.specs.map((s) => s.file).join(', ')}` });

  phat({ type: 'stage', stage: 3, ten: 'Sinh probe đối kháng' });
  const keHoach = bocJson<{ probes: KeHoachProbe[] }>(await model.complete(promptPhanTich(t))).probes.slice(0, 6);
  phat({ type: 'log', msg: `${keHoach.length} probe: ${keHoach.map((p) => `${p.id} (${p.spec_rule})`).join(' · ')}` });

  let code = bocCode(await model.complete(promptSinhCode(t, keHoach)));

  phat({ type: 'stage', stage: 4, ten: 'Chạy probe trong sandbox — nhánh PR và nhánh gốc đối chứng' });
  let branchKq: KetQuaProbe[] = [];
  let baseKq: KetQuaProbe[] = [];
  for (let lan = 1; lan <= 2; lan++) {
    const sbBranch = new Sandbox(repo, t.branchSha);
    try {
      const rel = sbBranch.ghiProbe(code);
      const kq = sbBranch.chayVitest(rel);
      if (!kq.ok) {
        if (lan === 2) throw new Error(`Probe không thu thập được sau 2 lần sinh: ${kq.loiThu}`);
        phat({ type: 'log', msg: 'File probe lỗi thu thập — sinh lại lần 2 kèm thông báo lỗi' });
        code = bocCode(await model.complete(promptSinhCode(t, keHoach, kq.loiThu)));
        continue;
      }
      branchKq = kq.probes;
    } finally {
      sbBranch.huy();
    }
    const sbBase = new Sandbox(repo, t.baseSha);
    try {
      const rel = sbBase.ghiProbe(code);
      baseKq = sbBase.chayVitest(rel).probes;
    } finally {
      sbBase.huy();
    }
    break;
  }
  const tomTat = (kq: KetQuaProbe[]) => kq.map((p) => `${p.title.split(':')[0]}=${p.status}`).join(' ');
  phat({ type: 'log', msg: `Nhánh PR:  ${tomTat(branchKq)}` });
  phat({ type: 'log', msg: `Nhánh gốc: ${tomTat(baseKq)}` });

  phat({ type: 'stage', stage: 5, ten: 'Kết luận — đối chiếu PR vs gốc, phân loại finding' });
  const coProbeFailTrenPr = branchKq.some((p) => p.status === 'failed');
  let findings: Finding[] = [];
  if (coProbeFailTrenPr) {
    const kl = bocJson<{
      findings: Array<{ probe_id: string; severity: Severity; title_vi: string; what_vi: string; consequence_vi: string }>;
      ghi_chu?: string;
    }>(await model.complete(promptKetLuan(keHoach, branchKq, baseKq, t)));
    if (kl.ghi_chu) phat({ type: 'log', msg: `Ghi chú kết luận: ${kl.ghi_chu}` });

    findings = kl.findings.map((f, i) => {
      const p = keHoach.find((x) => x.id === f.probe_id);
      const br = branchKq.find((r) => r.title.startsWith(f.probe_id));
      // lưới cứng: finding phải trỏ vào probe THẬT SỰ fail trên nhánh PR — model không được bịa
      if (!p || !br || br.status !== 'failed') {
        throw new Error(`Finding ${f.probe_id} không khớp probe fail thực tế — loại`);
      }
      const itBlock = code.match(new RegExp(`it\\(['"\`]${f.probe_id}:[\\s\\S]*?\\n  \\}\\);`))?.[0] ?? '';
      return {
        id: `F${i + 1}`,
        skill: 'code' as const,
        severity: f.severity,
        title_vi: f.title_vi,
        what_vi: f.what_vi,
        consequence_vi: f.consequence_vi,
        evidence: {
          type: 'test_run' as const,
          probe_name: br.title,
          probe_code: itBlock.slice(0, 2000),
          command: `vitest run test/checker.probe.test.ts (nhánh ${branch} @ ${t.branchSha.slice(0, 7)})`,
          expected: p.ky_vong,
          actual: br.message.slice(0, 1200),
          exit_code: 1,
        },
      };
    });
  }
  for (const f of findings) phat({ type: 'finding', finding: f });
  return { findings, target: t, soProbe: keHoach.length };
}
