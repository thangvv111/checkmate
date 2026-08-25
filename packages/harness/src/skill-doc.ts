import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { Evidence, Finding, RunEvent, Severity } from '../../shared/src/types.js';
import type { ModelProvider } from './model.js';
import { goiJson } from './jsonx.js';
import { chuanMuc } from '../../shared/src/types.js';

export interface KetQuaSkillDoc {
  findings: Finding[];
  tenFile: string;
  hash: string;
}

type PhatEvent = (e: RunEvent) => void;

type RubricLoai = 'mau_thuan' | 'khong_do_duoc' | 'thieu_ac' | 'lech_cheo';

interface UngVien {
  id: string;
  rubric: RubricLoai;
  severity: Severity;
  title_vi: string;
  what_vi: string;
  consequence_vi: string;
  quotes: Array<{ quote: string; vi_tri: string }>;
}

const NHAN_RUBRIC: Record<RubricLoai, string> = {
  mau_thuan: 'mâu thuẫn nội tại',
  khong_do_duoc: 'tiêu chí không đo được',
  thieu_ac: 'thiếu tiêu chí nghiệm thu',
  lech_cheo: 'lệch chéo mô tả ↔ bảng/phụ lục',
};

// ---- Lưới máy: đối chiếu trích dẫn nguyên văn (chuẩn hoá whitespace + ký tự markdown) ----

// D1: PRD thật đầy –, →, «», ≤, khoảng trắng cứng — model chép "gần đúng" là quote chết oan.
// Chuẩn hoá NFC + map ký tự tương đương về dạng ASCII trước khi so; áp cho CẢ tài liệu lẫn trích dẫn.
const MAP_KY_TU: Array<[RegExp, string]> = [
  [/[\u2013\u2014\u2212]/g, '-'],      // – — − -> -
  [/[\u2018\u2019\u201A\u2039\u203A]/g, "'"], // ' ' ‚ ‹ › -> '
  [/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"'], // " " „ « » -> "
  [/\u2026/g, '...'],
  [/\u2192/g, '->'],
  [/\u2264/g, '<='],
  [/\u2265/g, '>='],
  [/\u00D7/g, 'x'],
  [/[\u00A0\u202F\u2007]/g, ' '],      // khoảng trắng cứng -> space
];

function chuanHoa(s: string): string {
  let r = s.normalize('NFC');
  for (const [re, thay] of MAP_KY_TU) r = r.replace(re, thay);
  return r
    .replace(/[|*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

type KetQuaNeo = { line: number } | 'qua_ngan' | 'khong_khop';

function timQuote(docGoc: string, quote: string): KetQuaNeo {
  const lines = docGoc.split(/\r?\n/);
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const nl = chuanHoa(lines[i]);
    if (!nl) continue;
    for (let c = 0; c < nl.length + 1; c++) map.push(i + 1);
    norm += nl + ' ';
  }
  const nq = chuanHoa(quote);
  if (nq.length < 8) return 'qua_ngan'; // D4: đồng bộ với prompt (trọn ô bảng ngắn vẫn hợp lệ)
  const idx = norm.indexOf(nq);
  if (idx === -1) return 'khong_khop';
  return { line: map[idx] ?? 1 };
}

const neoDuoc = (t: KetQuaNeo): t is { line: number } => typeof t === 'object';

// ---- Prompts ----

function promptTim(docCoSoDong: string, loiNeoLanTruoc?: string): string {
  return `Bạn là CHECKER ĐỐI KHÁNG cho TÀI LIỆU YÊU CẦU (PRD / BA doc / spec) trong quy trình maker–checker. Nhiệm vụ: tìm lỗi KHÁCH QUAN theo đúng 4 loại rubric — không phải góp ý cải thiện văn bản.

# RUBRIC (chỉ 4 loại này, ngoài ra KHÔNG có finding)
1. \`mau_thuan\` — hai chỗ trong tài liệu khẳng định hai điều không thể cùng đúng (số liệu, ngưỡng, quy tắc).
2. \`khong_do_duoc\` — một YÊU CẦU dùng từ định tính không ngưỡng, không cách đo, không kiểm thử được ("nhanh", "thân thiện", "dễ dùng"...). Chỉ tính khi nó là yêu cầu/tiêu chí; văn mô tả bối cảnh thì không.
3. \`thieu_ac\` — một luồng/tính năng được mô tả nhưng KHÔNG có tiêu chí nghiệm thu, trong khi các mục tương đương trong cùng tài liệu đều có.
4. \`lech_cheo\` — phần mô tả và bảng/phụ lục/ví dụ nói khác nhau (trạng thái, giá trị, quy tắc xuất hiện một nơi mà nơi kia không thừa nhận).

# CHÚ Ý ĐẶC BIỆT: VÍ DỤ MINH HOẠ LÀ NƠI HAY GIẤU LỖI NHẤT
Ví dụ/kịch bản minh hoạ trong tài liệu cũng là một "chỗ khẳng định" — hãy đối chiếu TỪNG SỐ LIỆU và TỪNG HÀNH VI trong ví dụ với các bảng quy tắc/ngưỡng/tiêu chí đã khai ở mục khác: người trong ví dụ làm việc đó có đúng thẩm quyền không, số tiền có nằm trong ngưỡng của vai không, hành vi có vi phạm tiêu chí nghiệm thu nào không, luồng có đúng sơ đồ trạng thái không. Ví dụ mâu thuẫn với quy tắc = \`mau_thuan\` hoặc \`lech_cheo\`, mức blocking.

# CẤM TUYỆT ĐỐI (finding sẽ bị loại)
- Nhận xét văn phong, chính tả, format, cấu trúc, độ dài.
- Đề xuất "nên bổ sung thêm" nội dung ngoài 4 loại trên.
- Finding không kèm trích dẫn nguyên văn.

# MỨC FINDING (severity)
- "high": mâu thuẫn quy tắc/số liệu làm build sai hành vi TIỀN hoặc QUYỀN, hoặc ví dụ minh hoạ dạy sai hành vi tiền-quyền.
- "medium": thiếu tiêu chí nghiệm thu, tiêu chí không đo được, lệch chéo không đụng tiền-quyền.
- "low": lỗi khách quan nhỏ còn lại.

# LUẬT BẰNG CHỨNG
Mỗi finding kèm 1–2 trích dẫn NGUYÊN VĂN — copy ĐÚNG TỪNG KÝ TỰ một đoạn liền mạch từ tài liệu (≥ 8 từ hoặc trọn một ô bảng/một câu; máy đã chuẩn hoá các ký tự – → ≤ « » về dạng thường nên giữ nguyên như tài liệu là an toàn nhất). Loại \`mau_thuan\` và \`lech_cheo\` bắt buộc 2 trích dẫn (hai vế). Máy sẽ đối chiếu từng trích dẫn vào tài liệu — trích sai một ký tự cũng bị loại finding.
QUAN TRỌNG: chọn đúng CÂU QUYẾT ĐỊNH — câu chứa hành vi/số liệu vi phạm (ai LÀM hành động gì, số BAO NHIÊU), không phải câu mở đầu hay câu bối cảnh đứng gần. Với mâu thuẫn: hai trích dẫn đặt cạnh nhau phải tự thấy không thể cùng đúng mà KHÔNG cần suy diễn thêm; nếu hành vi vi phạm nằm ở câu sau thì trích câu sau.
${loiNeoLanTruoc ? `\n# LẦN TRƯỚC CÁC TRÍCH DẪN SAU KHÔNG NEO ĐƯỢC — trích lại đúng nguyên văn từ tài liệu:\n${loiNeoLanTruoc}\n` : ''}
# TÀI LIỆU (mỗi dòng có số dòng "n| " — KHÔNG đưa phần "n| " vào trích dẫn)
${docCoSoDong}

Tối đa 6 finding, chỉ lấy những cái chắc chắn nhất. Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"findings":[{"id":"D1","rubric":"mau_thuan|khong_do_duoc|thieu_ac|lech_cheo","severity":"high|medium|low","title_vi":"≤80 ký tự","what_vi":"điều gì sai, 1–2 câu","consequence_vi":"hậu quả khi đem tài liệu này đi xây, 1 câu","quotes":[{"quote":"nguyên văn...","vi_tri":"mục/bảng nào"}]}]}`;
}

function promptSkeptic(ungVien: UngVien[], docCoSoDong: string): string {
  return `Bạn là NGƯỜI PHẢN BIỆN độc lập. Dưới đây là các finding một checker đề xuất trên một tài liệu yêu cầu, kèm chính tài liệu đó. Với TỪNG finding, chọn một trong ba:
- \`giu\` — vấn đề khách quan có thật, trích dẫn đã đủ chứng minh (người đọc lại trích dẫn trong 10 giây sẽ đồng ý).
- \`sua\` — vấn đề CÓ THẬT trong tài liệu nhưng checker trích SAI/THIẾU câu quyết định → giữ finding và THAY bằng trích dẫn nguyên văn đúng (tự tìm trong tài liệu bên dưới, copy đúng từng ký tự, không đưa phần "n| ").
- \`loai\` — chê văn/góp ý cải thiện; sai loại rubric; trùng bản chất finding khác; hoặc đọc kỹ toàn tài liệu thì vấn đề KHÔNG tồn tại.

# FINDING ĐỀ XUẤT
${JSON.stringify(ungVien.map((u) => ({ id: u.id, rubric: u.rubric, title_vi: u.title_vi, what_vi: u.what_vi, quotes: u.quotes })), null, 2)}

# TÀI LIỆU (số dòng "n| " chỉ để tham chiếu)
${docCoSoDong}

Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"giu":["D1"],"sua":[{"id":"D2","quotes":[{"quote":"nguyên văn đúng...","vi_tri":"mục nào"}]}],"loai":[{"id":"D3","ly_do":"..."}]}`;
}

// ---- Pipeline ----

export async function chaySkillDoc(model: ModelProvider, file: string, phat: PhatEvent): Promise<KetQuaSkillDoc> {
  phat({ type: 'stage', stage: 1, ten: 'Nhận artifact — đọc tài liệu' });
  const docGoc = readFileSync(file, 'utf8');
  const hash = createHash('sha256').update(docGoc).digest('hex');
  const tenFile = basename(file);
  const soDong = docGoc.split(/\r?\n/).length;
  phat({ type: 'log', msg: `${tenFile} · ${soDong} dòng · sha256 ${hash.slice(0, 12)}` });

  phat({ type: 'stage', stage: 2, ten: 'Nạp rubric — 4 loại lỗi khách quan, cấm chê văn' });
  phat({ type: 'log', msg: Object.values(NHAN_RUBRIC).join(' · ') });

  phat({ type: 'stage', stage: 3, ten: 'Soi tài liệu — model tìm nghi vấn theo rubric' });
  const docCoSoDong = docGoc
    .split(/\r?\n/)
    .map((l, i) => `${i + 1}| ${l}`)
    .join('\n');
  const lan1 = await goiJson<{ findings?: UngVien[] }>(model, promptTim(docCoSoDong));
  let ungVien = (Array.isArray(lan1?.findings) ? lan1.findings : []).slice(0, 6);
  // D3: rubric ngoài 4 loại là finding không hợp lệ — vứt trước khi tốn công neo
  const rubricHopLe = new Set(Object.keys(NHAN_RUBRIC));
  const sai = ungVien.filter((u) => !rubricHopLe.has(u.rubric));
  if (sai.length > 0) {
    phat({ type: 'log', msg: `Loại ${sai.length} ứng viên có rubric ngoài 4 loại: ${sai.map((u) => `${u.id}(${String(u.rubric)})`).join(', ')}` });
    ungVien = ungVien.filter((u) => rubricHopLe.has(u.rubric));
  }
  phat({ type: 'log', msg: `${ungVien.length} ứng viên: ${ungVien.map((u) => `${u.id} (${NHAN_RUBRIC[u.rubric]})`).join(' · ')}` });

  phat({ type: 'stage', stage: 4, ten: 'Đối chiếu trích dẫn nguyên văn (máy kiểm) + vòng phản biện' });
  const canDoiQuote = (u: UngVien) => (u.rubric === 'mau_thuan' || u.rubric === 'lech_cheo' ? 2 : 1);
  const neo = (u: UngVien) => u.quotes.map((q) => ({ ...q, tim: timQuote(docGoc, q.quote) }));
  // D6: "hai vế" phải thật sự là hai — quote_pair trùng nội dung (sau chuẩn hoá) không phải bằng chứng mâu thuẫn
  const quoteTrung = (x: { u: UngVien; quotes: Array<{ quote: string }> }) =>
    canDoiQuote(x.u) === 2 && x.quotes.length >= 2 && chuanHoa(x.quotes[0].quote) === chuanHoa(x.quotes[1].quote);
  const hopLe = (x: { u: UngVien; quotes: Array<{ quote: string; tim: KetQuaNeo }> }) =>
    x.quotes.every((q) => neoDuoc(q.tim)) && x.quotes.length >= canDoiQuote(x.u) && !quoteTrung(x);
  let daNeo = ungVien.map((u) => ({ u, quotes: neo(u) }));
  const hong = daNeo.filter((x) => !hopLe(x));
  let neoOk = daNeo.filter(hopLe);
  if (hong.length > 0) {
    phat({ type: 'log', msg: `${hong.length} finding có trích dẫn không neo được — cho model sửa MỘT lần (giữ nguyên ${neoOk.length} finding đã neo tốt)` });
    // D4: nói rõ LÝ DO từng quote hỏng để model sửa trúng
    const lyDo = (t: KetQuaNeo, trung: boolean) => (trung ? 'HAI TRÍCH DẪN TRÙNG NHAU — cần hai vế khác nhau' : t === 'qua_ngan' ? 'QUÁ NGẮN (dưới 8 ký tự sau chuẩn hoá)' : 'KHÔNG KHỚP NGUYÊN VĂN');
    const moTa = hong
      .map((x) => `${x.u.id}: ${x.quotes.map((q) => `${JSON.stringify(q.quote)} — ${lyDo(q.tim, quoteTrung(x))}`).join(' · ')}`)
      .join('\n');
    const lan2 = (await goiJson<{ findings?: UngVien[] }>(model, promptTim(docCoSoDong, moTa)));
    // D7: model có thể trả JSON thiếu key — không được crash
    const ungVien2 = (Array.isArray(lan2?.findings) ? lan2.findings : []).slice(0, 6);
    // D5: chỉ nhận từ lượt 2 những finding KHÔNG trùng id với bộ đã neo tốt — finding tốt lượt 1 bất khả xâm phạm
    const idTot = new Set(neoOk.map((x) => x.u.id));
    const boSung = ungVien2.filter((u) => !idTot.has(u.id)).map((u) => ({ u, quotes: neo(u) })).filter(hopLe);
    neoOk = [...neoOk, ...boSung].slice(0, 6);
    daNeo = [...neoOk];
  }
  const biLoaiNeo = ungVien.length - neoOk.length;
  if (biLoaiNeo > 0) phat({ type: 'log', msg: `Loại ${biLoaiNeo} finding vì trích dẫn không neo được/không đủ hai vế (lưới máy)` });

  let ketQuaCuoi = neoOk;
  const batSkeptic = process.env.CHECKER_SKEPTIC !== '0';
  if (!batSkeptic) phat({ type: 'log', msg: 'Vòng phản biện TẮT theo cấu hình agent (độ sâu review)' });
  if (batSkeptic && neoOk.length > 0) {
    const skeptic = await goiJson<{
      giu: string[];
      sua?: Array<{ id: string; quotes: Array<{ quote: string; vi_tri: string }> }>;
      loai: Array<{ id: string; ly_do: string }>;
    }>(model, promptSkeptic(neoOk.map((x) => x.u), docCoSoDong));
    for (const l of skeptic.loai ?? []) phat({ type: 'log', msg: `Phản biện loại ${l.id}: ${l.ly_do.slice(0, 200)}` });

    // D2: mặc định là GIỮ — finding đã neo máy chỉ bị loại khi skeptic nêu ĐÍCH DANH kèm lý do.
    // (Trước đây: không được nhắc trong "giu" là biến mất âm thầm — skeptic quên một id là giết oan.)
    const loaiIds = new Set((skeptic.loai ?? []).map((l) => l.id));
    const suaIds = new Set((skeptic.sua ?? []).map((x) => x.id));
    const khongNhac = neoOk.filter((x) => !loaiIds.has(x.u.id) && !suaIds.has(x.u.id) && !(skeptic.giu ?? []).includes(x.u.id));
    if (khongNhac.length > 0) {
      phat({ type: 'log', msg: `Phản biện không nhắc tới ${khongNhac.map((x) => x.u.id).join(', ')} — mặc định GIỮ (đã neo máy)` });
    }
    const daSua = (skeptic.sua ?? [])
      .map((sx) => {
        const goc = neoOk.find((x) => x.u.id === sx.id);
        if (!goc) return null;
        const quotes = (sx.quotes ?? []).map((q) => ({ ...q, tim: timQuote(docGoc, q.quote) }));
        const banSua = { u: goc.u, quotes };
        if (!hopLe(banSua)) {
          // trích dẫn sửa không neo được — bản GỐC đã qua lưới neo, giữ bản gốc thay vì giết oan
          phat({ type: 'log', msg: `Phản biện sửa ${sx.id} nhưng trích dẫn mới không neo được — GIỮ bản trích dẫn gốc` });
          return goc;
        }
        phat({ type: 'log', msg: `Phản biện GIỮ ${sx.id} với trích dẫn sửa lại (đã neo máy)` });
        return banSua;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    ketQuaCuoi = [...neoOk.filter((x) => !loaiIds.has(x.u.id) && !suaIds.has(x.u.id)), ...daSua];
  }

  phat({ type: 'stage', stage: 5, ten: 'Kết luận' });
  const findings: Finding[] = ketQuaCuoi
    .map((x, i) => {
      const q = x.quotes;
      const evidence: Evidence =
        x.u.rubric === 'mau_thuan' || x.u.rubric === 'lech_cheo'
          ? {
              type: 'quote_pair',
              loc_a: `dòng ${neoDuoc(q[0].tim) ? q[0].tim.line : 0} (${q[0].vi_tri})`,
              quote_a: q[0].quote,
              loc_b: `dòng ${neoDuoc(q[1].tim) ? q[1].tim.line : 0} (${q[1].vi_tri})`,
              quote_b: q[1].quote,
            }
          : {
              type: 'quote',
              loc: `dòng ${neoDuoc(q[0].tim) ? q[0].tim.line : 0} (${q[0].vi_tri})`,
              quote: q[0].quote,
              rule: NHAN_RUBRIC[x.u.rubric],
            };
      // D3: trần/sàn cơ học — luật severity không chỉ là "lời dặn" trong prompt:
      // khong_do_duoc/thieu_ac tối đa medium (không bao giờ tự chặn merge);
      // mau_thuan/lech_cheo tối thiểu medium (mâu thuẫn nội tại không được chìm thành low).
      let sev = chuanMuc(x.u.severity);
      if ((x.u.rubric === 'khong_do_duoc' || x.u.rubric === 'thieu_ac') && sev === 'high') sev = 'medium';
      if ((x.u.rubric === 'mau_thuan' || x.u.rubric === 'lech_cheo') && sev === 'low') sev = 'medium';
      return {
        id: `F${i + 1}`,
        skill: 'doc' as const,
        severity: sev,
        title_vi: x.u.title_vi,
        what_vi: x.u.what_vi,
        consequence_vi: x.u.consequence_vi,
        evidence,
      };
    });
  for (const f of findings) phat({ type: 'finding', finding: f });
  return { findings, tenFile, hash };
}
