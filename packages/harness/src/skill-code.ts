import { chuanMuc, type Finding, type RunEvent, type Severity } from '../../shared/src/types.js';
import type { ModelProvider } from './model.js';
import { bocCode, goiJson } from './jsonx.js';
import { docTarget, type TargetInfo } from './target.js';
import { Sandbox, type KetQuaProbe } from './sandbox.js';
import { docThuVien, nhanVaoThuVien, slugRepo } from './thu-vien.js';

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

const MAX_PROBE = Math.min(12, Math.max(2, Number(process.env.CHECKER_MAX_PROBE ?? 6)));
const FILE_PROBE_MOI = 'checker.probe.test.ts';

// ---------- Phân loại MÁY (spec §11-A): model không được tự giác luật này ----------

export type TrangThaiProbe = 'pass' | 'hoi_quy' | 'hong' | 'nghi_van' | 'cai_thien' | 'khong_chay';

// Vân tay lỗi: dòng đầu message, chuẩn hoá số/hex/khoảng trắng — hai nhánh cùng vân tay = cùng nguyên nhân
function vanTayLoi(msg: string): string {
  return (msg.split('\n')[0] ?? '')
    .toLowerCase()
    .replace(/[a-f0-9]{7,}/g, '#')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function phanLoaiMay(br: KetQuaProbe | undefined, bs: KetQuaProbe | undefined): TrangThaiProbe {
  if (!br) return 'khong_chay';
  const brFail = br.status === 'failed';
  const bsFail = bs?.status === 'failed';
  if (!brFail && !bsFail) return 'pass';
  if (!brFail && bsFail) return 'cai_thien';
  if (brFail && !bsFail) return 'hoi_quy';
  return vanTayLoi(br.message) === vanTayLoi(bs?.message ?? '') ? 'hong' : 'nghi_van';
}

interface UngVien {
  ma: string; // U1, U2... — khoá model phải trỏ vào
  file: string;
  nguon: 'moi' | 'thu_vien';
  probe: KeHoachProbe;
  trangThai: TrangThaiProbe;
  br: KetQuaProbe;
  bs?: KetQuaProbe;
}

// ---------- Prompts ----------

function promptPhanTich(t: TargetInfo): string {
  const specs = t.specs.map((s) => `--- ${s.file} ---\n${s.noiDung}`).join('\n\n');
  return `Bạn là CHECKER ĐỐI KHÁNG trong quy trình maker–checker cho code. Bạn KHÔNG có tool, KHÔNG đọc được file nào ngoài dữ liệu trong prompt này. Nhiệm vụ của bạn là BÁC BỎ một pull request: tìm chỗ nó vi phạm spec, rồi đề xuất các phép thử (probe) chạy được để chứng minh.

# SPEC HÀNH VI (nguồn sự thật — mọi probe phải neo vào một luật ở đây)
${specs}

# TÀI LIỆU API CỦA REPO
${t.apiDoc}

# FILE TEST MẪU CỦA REPO (contract THẬT của API — response chỉ có những trường thấy ở đây và tài liệu trên)
\`\`\`ts
${t.testMau}
\`\`\`

# DIFF CỦA PULL REQUEST (so với ${t.base})
\`\`\`diff
${t.diff}
\`\`\`

# YÊU CẦU
Đề xuất TỐI ĐA ${MAX_PROBE} probe độc lập, mỗi probe kiểm MỘT hành vi mà spec khai. Ưu tiên các khuôn lỗi kinh điển:
- điều kiện KÉP bị gộp sai: thử TỪNG VẾ riêng (vế này đúng + vế kia sai, và ngược lại);
- giá trị BIÊN đúng ngưỡng của hằng số trong spec (biên đóng/mở);
- tính đúng tuyệt đối về TIỀN: tổng các phần phải bằng đúng tổng gốc, thử số CHIA KHÔNG HẾT;
- đường SAI phải trả lỗi nghiệp vụ 4xx kèm thông báo (trùng khoá, tham chiếu không tồn tại) — app-guard, không được vỡ thành 500;
- hành vi cũ không bị PR phá (probe kỳ vọng qua, để chứng minh PASS xứng đáng khi PR sạch).
Probe phải kiểm được qua HTTP (app.inject), KHÔNG import hàm nội bộ — để cùng một probe chạy được trên cả nhánh PR lẫn nhánh gốc.
QUAN TRỌNG: chỉ assert những gì API THẬT SỰ trả (đối chiếu tài liệu API + file test mẫu) — đừng bịa thêm trường response; probe sai contract sẽ bị máy loại và phí một suất probe.

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
- CHỈ assert trường/response mà API thật trả (theo file mẫu + tài liệu) — assert vào trường không tồn tại là probe hỏng, máy sẽ loại.
- Chỉ dùng HTTP qua app.inject; không import từ src/services; mỗi it tự dựng app với moDb(':memory:') hoặc dùng beforeEach như file mẫu.
- Dữ liệu tự tạo trong từng it (mã hồ sơ dùng dải HM-2026-8xxx để không đụng dữ liệu khác).
- Không dùng network, không setTimeout.
${loiLanTruoc ? `\n# LẦN TRƯỚC FILE CỦA BẠN CÓ VẤN ĐỀ — SỬA CHO ĐÚNG\n${loiLanTruoc}\n` : ''}
Trả lời CHỈ MỘT khối code trong fence \`\`\`ts (không giải thích gì thêm).`;
}

function promptVietFinding(ungVien: UngVien[], t: TargetInfo): string {
  const duLieu = ungVien.map((u) => ({
    ma: u.ma,
    nguon: u.nguon === 'thu_vien' ? 'probe THƯ VIỆN (đã chứng minh khớp contract ở lượt trước)' : 'probe mới sinh',
    phan_loai_may: u.trangThai,
    probe: u.probe,
    nhanh_pr: { status: u.br.status, loi: u.br.message },
    nhanh_goc: u.bs ? { status: u.bs.status, loi: u.bs.message } : { status: 'không chạy', loi: '' },
  }));
  return `Bạn là CHECKER ĐỐI KHÁNG. Máy đã phân loại xong kết quả probe — việc của bạn CHỈ là hai điều:
1. Với ứng viên \`hoi_quy\` (PR fail + gốc pass — máy đã xác nhận là hồi quy): viết finding tiếng Việt nghiệp vụ + gán mức. BẮT BUỘC mỗi ứng viên hoi_quy có ĐÚNG MỘT finding — bạn không có quyền bỏ.
2. Với ứng viên \`nghi_van\` (fail cả hai nhánh nhưng KHÁC nguyên nhân): quyết giữ/bỏ — GIỮ chỉ khi nhánh gốc fail vì tính năng chưa tồn tại (404 route, trường chưa có) còn nhánh PR fail vì sai nghiệp vụ; nếu giữ thì viết finding, nếu bỏ ghi lý do vào ghi_chu.

# MỨC (severity)
"high" = sai phân quyền / sai tiền / mất dữ liệu / lỗi 5xx thay vì 4xx nghiệp vụ / hành vi trái điều spec khai PHẢI; "medium" = lệch nhẹ không đụng tiền-quyền (thông báo sai, chặn oan ca phụ, thiếu chặn phụ); "low" = lỗi khách quan nhỏ không đổi hành vi.

# ỨNG VIÊN
${JSON.stringify(duLieu, null, 2)}

# SPEC THAM CHIẾU NHÃN LUẬT
${t.specs.map((s) => s.file).join(', ')}

Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"findings": [{"ma": "U?", "severity": "high|medium|low", "title_vi": "≤80 ký tự", "what_vi": "điều gì sai, 1–2 câu", "consequence_vi": "hậu quả nghiệp vụ, 1 câu"}], "ghi_chu": "ứng viên nghi_van nào bị bỏ, vì sao"}`;
}

// ---------- Pipeline ----------

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

  const slug = slugRepo(repo);
  const thuVien = docThuVien(slug);

  phat({ type: 'stage', stage: 3, ten: 'Sinh probe đối kháng' });
  const keHoach = (await goiJson<{ probes: KeHoachProbe[] }>(model, promptPhanTich(t))).probes.slice(0, MAX_PROBE);
  phat({ type: 'log', msg: `${keHoach.length} probe mới: ${keHoach.map((p) => `${p.id} (${p.spec_rule})`).join(' · ')}` });
  if (thuVien.length > 0) {
    phat({ type: 'log', msg: `+ ${thuVien.reduce((s, f) => s + f.plan.length, 0)} probe THƯ VIỆN từ ${thuVien.length} lượt trước (regression, không tốn model)` });
  }

  let code = bocCode(await model.complete(promptSinhCode(t, keHoach)));

  phat({ type: 'stage', stage: 4, ten: 'Chạy probe trong sandbox — nhánh PR và nhánh gốc đối chứng + cổng sanity' });

  const chayCaHaiNhanh = (codeMoi: string): { branchKq: KetQuaProbe[]; baseKq: KetQuaProbe[]; loiThu?: string } => {
    const chay = (sha: string): { probes: KetQuaProbe[]; ok: boolean; loiThu: string } => {
      const sb = new Sandbox(repo, sha);
      try {
        const files = [sb.ghiProbe(codeMoi, FILE_PROBE_MOI), ...thuVien.map((f) => sb.ghiProbe(f.code, f.ten))];
        const kq = sb.chayVitest(files);
        return { probes: kq.probes, ok: kq.ok, loiThu: kq.loiThu };
      } finally {
        sb.huy();
      }
    };
    const br = chay(t.branchSha);
    if (!br.ok) return { branchKq: [], baseKq: [], loiThu: br.loiThu };
    return { branchKq: br.probes, baseKq: chay(t.baseSha).probes, loiThu: undefined };
  };

  // gom ứng viên + phân loại máy; retry sinh lại 1 lần nếu file mới lỗi thu thập HOẶC >50% probe mới hỏng
  let ungVienTatCa: UngVien[] = [];
  for (let lan = 1; lan <= 2; lan++) {
    const { branchKq, baseKq, loiThu } = chayCaHaiNhanh(code);
    if (loiThu !== undefined) {
      if (lan === 2) throw new Error(`Probe không thu thập được sau 2 lần sinh: ${loiThu}`);
      phat({ type: 'log', msg: 'File probe lỗi thu thập — sinh lại lần 2 kèm thông báo lỗi' });
      code = bocCode(await model.complete(promptSinhCode(t, keHoach, loiThu)));
      continue;
    }

    const timKq = (kq: KetQuaProbe[], file: string, id: string) =>
      kq.find((r) => r.file === file && r.title.startsWith(id));

    const bo: Array<{ file: string; nguon: 'moi' | 'thu_vien'; plan: KeHoachProbe[] }> = [
      { file: FILE_PROBE_MOI, nguon: 'moi', plan: keHoach },
      ...thuVien.map((f) => ({ file: f.ten, nguon: 'thu_vien' as const, plan: f.plan })),
    ];
    let dem = 0;
    ungVienTatCa = bo.flatMap(({ file, nguon, plan }) =>
      plan.flatMap((probe): UngVien[] => {
        const br = timKq(branchKq, file, probe.id);
        const bs = timKq(baseKq, file, probe.id);
        if (!br) return [];
        dem++;
        return [{ ma: `U${dem}`, file, nguon, probe, trangThai: phanLoaiMay(br, bs), br, bs }];
      }),
    );

    const tomTat = (loai: TrangThaiProbe) => ungVienTatCa.filter((u) => u.trangThai === loai);
    phat({
      type: 'log',
      msg: `Phân loại máy: ${tomTat('pass').length} pass · ${tomTat('hoi_quy').length} hồi quy · ${tomTat('hong').length} hỏng · ${tomTat('nghi_van').length} nghi vấn · ${tomTat('cai_thien').length} cải thiện`,
    });

    const hongMoi = ungVienTatCa.filter((u) => u.nguon === 'moi' && u.trangThai === 'hong');
    if (hongMoi.length > 0) {
      phat({
        type: 'log',
        msg: `Sanity: loại ${hongMoi.length} probe hỏng — fail cùng nguyên nhân trên CẢ HAI nhánh (${hongMoi.map((u) => u.probe.id).join(', ')}): probe sai contract hoặc lỗi có sẵn, không phải lỗi của PR`,
      });
    }
    if (lan === 1 && hongMoi.length * 2 > keHoach.length) {
      phat({ type: 'log', msg: `Quá nửa probe mới hỏng (${hongMoi.length}/${keHoach.length}) — sinh lại file probe kèm lỗi từng probe` });
      const moTaLoi = hongMoi.map((u) => `${u.probe.id}: ${u.br.message.split('\n')[0]}`).join('\n');
      code = bocCode(await model.complete(promptSinhCode(t, keHoach, `Các probe sau fail trên CẢ nhánh gốc lẫn PR — tức probe viết sai contract API, hãy sửa cách assert:\n${moTaLoi}`)));
      continue;
    }
    break;
  }

  phat({ type: 'stage', stage: 5, ten: 'Kết luận — máy làm chủ phân loại, model viết finding' });
  const duocPhepFinding = ungVienTatCa.filter((u) => u.trangThai === 'hoi_quy' || u.trangThai === 'nghi_van');
  let findings: Finding[] = [];

  if (duocPhepFinding.length > 0) {
    const kl = await goiJson<{
      findings: Array<{ ma: string; severity: Severity; title_vi: string; what_vi: string; consequence_vi: string }>;
      ghi_chu?: string;
    }>(model, promptVietFinding(duocPhepFinding, t));
    if (kl.ghi_chu) phat({ type: 'log', msg: `Ghi chú kết luận: ${kl.ghi_chu}` });

    const lamEvidence = (u: UngVien) => ({
      type: 'test_run' as const,
      probe_name: `${u.br.title}${u.nguon === 'thu_vien' ? ` [thư viện: ${u.file}]` : ''}`,
      probe_code: (u.nguon === 'moi'
        ? (code.match(new RegExp(`it\\(['"\`]${u.probe.id}:[\\s\\S]*?\\n  \\}\\);`))?.[0] ?? '')
        : (thuVien.find((f) => f.ten === u.file)?.code.match(new RegExp(`it\\(['"\`]${u.probe.id}:[\\s\\S]*?\\n  \\}\\);`))?.[0] ?? '')
      ).slice(0, 2000),
      command: `vitest run test/${u.file} (nhánh ${branch} @ ${t.branchSha.slice(0, 7)})`,
      expected: u.probe.ky_vong,
      actual: u.br.message.slice(0, 1200),
      exit_code: 1,
    });

    // Lưới máy 1: finding phải trỏ vào ứng viên hợp lệ — trỏ bậy thì VỨT finding đó (log), không chết run
    for (const f of kl.findings) {
      const u = duocPhepFinding.find((x) => x.ma === f.ma);
      if (!u) {
        phat({ type: 'log', msg: `Lưới máy: vứt finding trỏ vào ứng viên không tồn tại/không được phép (${f.ma})` });
        continue;
      }
      findings.push({
        id: `F${findings.length + 1}`,
        skill: 'code',
        severity: chuanMuc(f.severity),
        title_vi: f.title_vi,
        what_vi: f.what_vi,
        consequence_vi: f.consequence_vi,
        evidence: lamEvidence(u),
      });
    }

    // Lưới máy 2: MỌI hồi quy máy-xác-nhận phải có finding — model im lặng thì máy tự bổ sung, fail-closed mức high
    const daCo = new Set(kl.findings.map((f) => f.ma));
    for (const u of duocPhepFinding.filter((x) => x.trangThai === 'hoi_quy' && !daCo.has(x.ma))) {
      phat({ type: 'log', msg: `Lưới máy: model bỏ sót hồi quy ${u.ma} (${u.probe.id} — ${u.probe.ten}) — máy tự bổ sung finding mức high (fail-closed)` });
      findings.push({
        id: `F${findings.length + 1}`,
        skill: 'code',
        severity: 'high',
        title_vi: `Hồi quy: ${u.probe.ten}`.slice(0, 80),
        what_vi: `Probe ${u.probe.id} (${u.probe.spec_rule}) pass trên nhánh gốc nhưng fail trên nhánh PR — hành vi spec khai đã bị PR làm gãy. ${u.probe.muc_dich}`,
        consequence_vi: 'Hành vi đã cam kết trong spec không còn đúng sau PR này.',
        evidence: lamEvidence(u),
      });
    }
  }

  // Thư viện (spec §11-C): nhận probe mới đã chứng minh khớp contract (pass trên nhánh gốc).
  // Probe fail-gốc (feature mới / probe hỏng) bị CẮT khỏi file; bản cắt phải chạy sạch trên gốc mới được nhận.
  const probeMoi = ungVienTatCa.filter((u) => u.nguon === 'moi');
  const failGoc = probeMoi.filter((u) => u.bs?.status !== 'passed');
  let codeNhan = code;
  let planNhan = keHoach;
  if (failGoc.length > 0) {
    const boIds = new Set(failGoc.map((u) => u.probe.id));
    planNhan = keHoach.filter((p) => !boIds.has(p.id));
    for (const u of failGoc) {
      codeNhan = codeNhan.replace(new RegExp(`\\n\\s*it\\(['"\`]${u.probe.id}:[\\s\\S]*?\\n  \\}\\);`), '');
    }
  }
  if (probeMoi.length > 0 && planNhan.length >= 2) {
    let sach = failGoc.length === 0;
    if (!sach) {
      // verify bản cắt trên nhánh gốc — deterministic, không tốn model
      const sb = new Sandbox(repo, t.baseSha);
      try {
        const kq = sb.chayVitest([sb.ghiProbe(codeNhan, FILE_PROBE_MOI)]);
        sach = kq.ok && kq.probes.length === planNhan.length && kq.probes.every((p) => p.status === 'passed');
      } finally {
        sb.huy();
      }
    }
    if (sach) {
      const ten = nhanVaoThuVien(slug, codeNhan, planNhan, t.branchSha);
      phat({
        type: 'log',
        msg: ten
          ? `Thư viện: nhận ${planNhan.length} probe khớp contract (${ten}${failGoc.length ? `, đã cắt ${failGoc.length} probe fail-gốc` : ''}) — thành regression cho các lượt sau`
          : 'Thư viện: bộ probe trùng nội dung bộ đã có — bỏ qua',
      });
    } else {
      phat({ type: 'log', msg: 'Thư viện: KHÔNG nhận — bản cắt không chạy sạch trên nhánh gốc' });
    }
  } else if (probeMoi.length > 0) {
    phat({ type: 'log', msg: `Thư viện: KHÔNG nhận (chỉ còn ${planNhan.length} probe pass-gốc, dưới ngưỡng 2)` });
  }

  for (const f of findings) phat({ type: 'finding', finding: f });
  return { findings, target: t, soProbe: ungVienTatCa.length };
}
