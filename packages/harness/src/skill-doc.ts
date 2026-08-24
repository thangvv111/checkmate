import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { Evidence, Finding, RunEvent, Severity } from '../../shared/src/types.js';
import type { ModelProvider } from './model.js';
import { bocJson } from './jsonx.js';

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

function chuanHoa(s: string): string {
  return s
    .replace(/[|*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function timQuote(docGoc: string, quote: string): { line: number } | null {
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
  if (nq.length < 12) return null; // trích quá ngắn không tính là bằng chứng
  const idx = norm.indexOf(nq);
  if (idx === -1) return null;
  return { line: map[idx] ?? 1 };
}

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

# LUẬT BẰNG CHỨNG
Mỗi finding kèm 1–2 trích dẫn NGUYÊN VĂN — copy ĐÚNG TỪNG KÝ TỰ một đoạn liền mạch từ tài liệu (≥ 8 từ hoặc trọn một ô bảng/một câu). Loại \`mau_thuan\` và \`lech_cheo\` bắt buộc 2 trích dẫn (hai vế). Máy sẽ đối chiếu từng trích dẫn vào tài liệu — trích sai một ký tự cũng bị loại finding.
QUAN TRỌNG: chọn đúng CÂU QUYẾT ĐỊNH — câu chứa hành vi/số liệu vi phạm (ai LÀM hành động gì, số BAO NHIÊU), không phải câu mở đầu hay câu bối cảnh đứng gần. Với mâu thuẫn: hai trích dẫn đặt cạnh nhau phải tự thấy không thể cùng đúng mà KHÔNG cần suy diễn thêm; nếu hành vi vi phạm nằm ở câu sau thì trích câu sau.
${loiNeoLanTruoc ? `\n# LẦN TRƯỚC CÁC TRÍCH DẪN SAU KHÔNG NEO ĐƯỢC — trích lại đúng nguyên văn từ tài liệu:\n${loiNeoLanTruoc}\n` : ''}
# TÀI LIỆU (mỗi dòng có số dòng "n| " — KHÔNG đưa phần "n| " vào trích dẫn)
${docCoSoDong}

Tối đa 6 finding, chỉ lấy những cái chắc chắn nhất. Trả lời CHỈ MỘT khối JSON trong fence \`\`\`json:
{"findings":[{"id":"D1","rubric":"mau_thuan|khong_do_duoc|thieu_ac|lech_cheo","severity":"blocking|non_blocking","title_vi":"≤80 ký tự","what_vi":"điều gì sai, 1–2 câu","consequence_vi":"hậu quả khi đem tài liệu này đi xây, 1 câu","quotes":[{"quote":"nguyên văn...","vi_tri":"mục/bảng nào"}]}]}`;
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
  let ungVien = bocJson<{ findings: UngVien[] }>(await model.complete(promptTim(docCoSoDong))).findings.slice(0, 6);
  phat({ type: 'log', msg: `${ungVien.length} ứng viên: ${ungVien.map((u) => `${u.id} (${NHAN_RUBRIC[u.rubric]})`).join(' · ')}` });

  phat({ type: 'stage', stage: 4, ten: 'Đối chiếu trích dẫn nguyên văn (máy kiểm) + vòng phản biện' });
  const neo = (u: UngVien) => u.quotes.map((q) => ({ ...q, tim: timQuote(docGoc, q.quote) }));
  let daNeo = ungVien.map((u) => ({ u, quotes: neo(u) }));
  const hong = daNeo.filter((x) => x.quotes.some((q) => !q.tim) || x.quotes.length < (x.u.rubric === 'mau_thuan' || x.u.rubric === 'lech_cheo' ? 2 : 1));
  if (hong.length > 0) {
    phat({ type: 'log', msg: `${hong.length} finding có trích dẫn không neo được — cho model sửa trích dẫn một lần` });
    const moTa = hong.map((x) => `${x.u.id}: ${x.quotes.filter((q) => !q.tim).map((q) => JSON.stringify(q.quote)).join(' · ')}`).join('\n');
    ungVien = bocJson<{ findings: UngVien[] }>(await model.complete(promptTim(docCoSoDong, moTa))).findings.slice(0, 6);
    daNeo = ungVien.map((u) => ({ u, quotes: neo(u) }));
  }
  const neoOk = daNeo.filter((x) => x.quotes.every((q) => q.tim) && x.quotes.length >= (x.u.rubric === 'mau_thuan' || x.u.rubric === 'lech_cheo' ? 2 : 1));
  const biLoaiNeo = daNeo.length - neoOk.length;
  if (biLoaiNeo > 0) phat({ type: 'log', msg: `Loại ${biLoaiNeo} finding vì trích dẫn không có trong tài liệu (lưới máy)` });

  let ketQuaCuoi = neoOk;
  if (neoOk.length > 0) {
    const skeptic = bocJson<{
      giu: string[];
      sua?: Array<{ id: string; quotes: Array<{ quote: string; vi_tri: string }> }>;
      loai: Array<{ id: string; ly_do: string }>;
    }>(await model.complete(promptSkeptic(neoOk.map((x) => x.u), docCoSoDong)));
    for (const l of skeptic.loai ?? []) phat({ type: 'log', msg: `Phản biện loại ${l.id}: ${l.ly_do.slice(0, 200)}` });

    const giuIds = new Set((skeptic.giu ?? []).filter((id) => neoOk.some((x) => x.u.id === id)));
    // finding được skeptic SỬA trích dẫn: neo lại bằng máy, neo được mới giữ
    const daSua = (skeptic.sua ?? [])
      .map((s) => {
        const goc = neoOk.find((x) => x.u.id === s.id);
        if (!goc) return null;
        const quotes = s.quotes.map((q) => ({ ...q, tim: timQuote(docGoc, q.quote) }));
        const canDoi = goc.u.rubric === 'mau_thuan' || goc.u.rubric === 'lech_cheo' ? 2 : 1;
        if (quotes.some((q) => !q.tim) || quotes.length < canDoi) {
          phat({ type: 'log', msg: `Phản biện sửa ${s.id} nhưng trích dẫn mới không neo được — loại` });
          return null;
        }
        phat({ type: 'log', msg: `Phản biện GIỮ ${s.id} với trích dẫn sửa lại (đã neo máy)` });
        return { u: goc.u, quotes };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    ketQuaCuoi = [...neoOk.filter((x) => giuIds.has(x.u.id)), ...daSua];
  }

  phat({ type: 'stage', stage: 5, ten: 'Kết luận' });
  const findings: Finding[] = ketQuaCuoi
    .map((x, i) => {
      const q = x.quotes;
      const evidence: Evidence =
        x.u.rubric === 'mau_thuan' || x.u.rubric === 'lech_cheo'
          ? {
              type: 'quote_pair',
              loc_a: `dòng ${q[0].tim!.line} (${q[0].vi_tri})`,
              quote_a: q[0].quote,
              loc_b: `dòng ${q[1].tim!.line} (${q[1].vi_tri})`,
              quote_b: q[1].quote,
            }
          : {
              type: 'quote',
              loc: `dòng ${q[0].tim!.line} (${q[0].vi_tri})`,
              quote: q[0].quote,
              rule: NHAN_RUBRIC[x.u.rubric],
            };
      return {
        id: `F${i + 1}`,
        skill: 'doc' as const,
        severity: x.u.severity,
        title_vi: x.u.title_vi,
        what_vi: x.u.what_vi,
        consequence_vi: x.u.consequence_vi,
        evidence,
      };
    });
  for (const f of findings) phat({ type: 'finding', finding: f });
  return { findings, tenFile, hash };
}
