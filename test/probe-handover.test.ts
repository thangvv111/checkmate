import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  rankProbe,
  negateAssertions,
  mutationGate,
  buildProposal,
  FIRED_STATES,
} from '../packages/harness/src/probe-handover.js';

/**
 * Lưới cho capability `probe-handover` — probe là đầu dò DÙNG MỘT LẦN, thứ đáng giữ thì GIAO cho repo đích.
 *
 * Thay cho thư viện probe tích luỹ, vốn giữ probe theo tiêu chí «xanh trên nhánh gốc» — tức giữ vì nó
 * KHÔNG NỔ. Đo trên prod 06/09: **0/7 probe từng bắt hồi quy**, mà cả 7 vẫn chạy ở mọi lượt trên cả hai
 * nhánh.
 */

const hitsNew = (specRule: string | undefined, marks: string[]): boolean =>
  !!specRule && marks.some((m) => specRule.toUpperCase().includes(m.toUpperCase()));

const dat = (over: Partial<Parameters<typeof rankProbe>[0]> = {}) => ({
  trangThai: 'pass',
  plan: { id: 'P1', spec_rule: 'R9.1' },
  newRules: ['R9.1'],
  coveredRules: [] as string[],
  hitsNew,
  ...over,
});

describe('xếp hạng theo BẰNG CHỨNG — danh sách ba hạng ĐÓNG (T1)', () => {
  it('T1.1 probe `hoi_quy` → hạng 1', () => {
    expect(rankProbe(dat({ trangThai: 'hoi_quy' })).hang).toBe(1);
  });

  it('T1.2 probe `vi_pham_luat_moi` → hạng 1', () => {
    expect(rankProbe(dat({ trangThai: 'vi_pham_luat_moi' })).hang).toBe(1);
  });

  it('T1.3 xanh hai nhánh + luật MỚI + chưa phủ → hạng 2', () => {
    expect(rankProbe(dat()).hang).toBe(2);
  });

  it('T1.4 [ranh giới] luật mới nhưng test repo ĐÃ phủ → hạng 3', () => {
    expect(rankProbe(dat({ coveredRules: ['R9.1'] })).hang).toBe(3);
  });

  it('T1.5 [ranh giới] xanh hai nhánh nhưng neo luật CŨ → hạng 3', () => {
    expect(rankProbe(dat({ newRules: ['R12.4'] })).hang).toBe(3);
  });

  it('T1.6 ⛔ danh sách hạng ĐÓNG — mọi tổ hợp rơi vào đúng 1/2/3, không có nhánh thứ tư', () => {
    // Một nhánh «giữ tạm» hay «chờ xét» là một đường quay lại chỗ tích luỹ không tiêu chí — đúng thứ
    // change này gỡ. Ca này là thứ giữ cho nó không mọc lại.
    const trangThai = ['pass', 'hoi_quy', 'vi_pham_luat_moi', 'ngoai_pham_vi', 'nghi_van', 'khong_chay', 'bo_qua', 'cai_thien', 'la_hoac'];
    const luat = [undefined, 'R9.1', 'R12.4'];
    const moi = [[], ['R9.1']];
    const phu = [[], ['R9.1']];
    let dem = 0;
    for (const t of trangThai)
      for (const l of luat)
        for (const m of moi)
          for (const p of phu) {
            const r = rankProbe(dat({ trangThai: t, plan: { id: 'P1', spec_rule: l }, newRules: m, coveredRules: p }));
            expect([1, 2, 3], `${t}/${l}/${m}/${p} ra hạng ${r.hang}`).toContain(r.hang);
            expect(r.ly_do, 'mọi hạng phải kèm lý do đọc được').not.toBe('');
            dem++;
          }
    expect(dem).toBe(trangThai.length * luat.length * moi.length * phu.length);
  });

  it('T1.7 [đầu vào khuyết] thiếu plan · trangThai lạ · null → hạng 3, không ném', () => {
    // Hướng an toàn là VỨT: không đề xuất thứ chưa chứng minh được gì. Rơi về hạng 1 hay 2 khi không
    // hiểu đầu vào mới là hỏng.
    for (const xau of [null, undefined, {}, { trangThai: 42 }, { trangThai: 'pass' }]) {
      expect(() => rankProbe(xau as never)).not.toThrow();
      expect(rankProbe(xau as never).hang).toBe(3);
    }
  });

  it('T1.8 chỉ hai nhãn được coi là ĐÃ NỔ', () => {
    expect([...FIRED_STATES].sort()).toEqual(['hoi_quy', 'vi_pham_luat_moi']);
  });
});

describe('cửa đột biến — phủ định khẳng định (T2)', () => {
  const CODE_JS = `it('P1: x', async () => {\n  const r = await f();\n  expect(r.status).toBe(200);\n});\n`;

  it('T2.1 đảo `expect(...).toBe` thành `.not.toBe`', () => {
    const r = negateAssertions(CODE_JS);
    expect(r.soKhangDinh).toBe(1);
    expect(r.code).toContain('.not.toBe(200)');
  });

  it('T2.2 đảo hai lần là KHÔNG đảo — `.not` có sẵn thì bị GỠ', () => {
    // Một probe viết bằng `.not` phải được đảo đúng như mọi probe khác; giữ nguyên `.not` là bỏ sót nó.
    const r = negateAssertions(`expect(a).not.toBe(1);`);
    expect(r.code).toContain('expect(a).toBe(1)');
    expect(r.code).not.toContain('.not.');
  });

  it('T2.3 python: `assert X` → `assert not (X)`', () => {
    const r = negateAssertions('def test_p1():\n    assert r.status == 200\n', '.py');
    expect(r.soKhangDinh).toBe(1);
    expect(r.code).toContain('assert not (r.status == 200)');
  });

  it('T2.4 [đầu vào khuyết] code rỗng · null · không có khẳng định nào', () => {
    for (const x of ['', null, undefined, 'const a = 1;']) {
      expect(() => negateAssertions(x as never)).not.toThrow();
      expect(negateAssertions(x as never).soKhangDinh).toBe(0);
    }
  });

  it('T2.5 ⛔ qua cửa: đảo xong probe ĐỎ', () => {
    expect(mutationGate({ code: CODE_JS, ext: '.ts', chayVaHoiCoDo: () => true })).toEqual({ qua: true, soKhangDinh: 1 });
  });

  it('T2.6 ⛔ trượt cửa: đảo hết khẳng định mà probe VẪN XANH', () => {
    // Đây là ca bắt đúng thứ đã đo trên prod — probe chưa bao giờ ở trạng thái nào ngoài xanh.
    const r = mutationGate({ code: CODE_JS, ext: '.ts', chayVaHoiCoDo: () => false });
    expect(r.qua).toBe(false);
    if (!r.qua) expect(r.ly_do).toContain('vẫn XANH');
  });

  it('T2.7 [⛔C2] không có khẳng định nào để đảo → TRƯỢT, không mặc định cho qua', () => {
    const r = mutationGate({ code: 'const a = 1;', ext: '.ts', chayVaHoiCoDo: () => true });
    expect(r.qua).toBe(false);
  });

  it('T2.8 [⛔C2] phép chạy NÉM LỖI → TRƯỢT, không mặc định cho qua', () => {
    // «Chưa chứng minh được là sai» không phải «đã chứng minh là đúng». Đề xuất một probe chưa qua cửa
    // là đưa dằn tàu sang repo của người khác.
    const r = mutationGate({
      code: CODE_JS,
      ext: '.ts',
      chayVaHoiCoDo: () => {
        throw new Error('sandbox chết');
      },
    });
    expect(r.qua).toBe(false);
    if (!r.qua) expect(r.ly_do).toContain('sandbox chết');
  });

  it('T2.10 [khẳng định KHÔNG HỀ CHẠY] `expect` sau một `return` sớm → đảo xong vẫn xanh → trượt', () => {
    // Đây là kiểu dằn tàu thứ hai (bên cạnh «khẳng định không ràng buộc»): khối `expect` nằm sau một
    // đường thoát, nên nó chưa từng chạy lần nào. Phủ định không đổi được kết quả của một dòng không chạy.
    const code = `it('P1: x', async () => {\n  if (true) return;\n  expect(await f()).toBe(200);\n});\n`;
    const r = mutationGate({ code, ext: '.ts', chayVaHoiCoDo: () => false });
    expect(r.qua, 'khẳng định không chạy thì đảo nó không làm probe đỏ được').toBe(false);
    // Vẫn ĐẾM được khẳng định — cửa trượt vì probe không đỏ, không phải vì không thấy `expect` nào.
    expect(negateAssertions(code).soKhangDinh).toBe(1);
  });

  it('T2.9 ⛔ GIỚI HẠN ĐÃ KHAI — `expect(1).toBe(1)` phủ định cũng ĐỎ, tức qua cửa', () => {
    // Ca này khoá GIỚI HẠN của cửa, không khoá năng lực của nó. Phủ định khẳng định là điều kiện CẦN,
    // KHÔNG ĐỦ: nó lọc rác, nó không chứng minh probe có giá trị. Cửa mạnh hơn là đột biến HIỆN THỰC
    // repo đích, và nó chưa có lời giải — nợ có tên N1.
    //
    // Ca tồn tại để tài liệu không nói dối rằng cửa này kín. Xoá nó là xoá lời khai ấy.
    const r = mutationGate({ code: 'expect(1).toBe(1);', ext: '.ts', chayVaHoiCoDo: () => true });
    expect(r.qua, 'cửa hiện tại KHÔNG bắt được ca này — đó là giới hạn đã biết').toBe(true);
  });
});

describe('đề xuất giao (T3)', () => {
  it('T3.1 mang đủ bốn thứ để đội repo hành động', () => {
    const p = buildProposal({ id: 'P3', spec_rule: 'R9.1' }, 1, 'đã nổ', 'code();');
    expect(p).toEqual({ probe_id: 'P3', spec_rule: 'R9.1', hang: 1, ly_do: 'đã nổ', code: 'code();' });
  });

  it('T3.2 [đầu vào khuyết] plan null → không ném, id rơi về dấu hỏi', () => {
    expect(() => buildProposal(null as never, 2, 'x', '')).not.toThrow();
    expect(buildProposal(null as never, 2, 'x', '').probe_id).toBe('?');
  });
});

describe('danh sách lý do VỨT probe là danh sách ĐÓNG (T6)', () => {
  const SKILL = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
  /** Thân khối xếp hạng — nơi duy nhất được phép bỏ một probe khỏi diện đề xuất. */
  const KHOI = SKILL.slice(SKILL.indexOf('Xếp hạng probe theo BẰNG CHỨNG'), SKILL.indexOf('Quan sát ngoài phạm vi PR'));

  it('T6.1 ⛔ đúng BA lối `continue` — mỗi lối là một lý do vứt, và cả ba đều là THIẾU BẰNG CHỨNG', () => {
    // Yêu cầu này chuyển nhà từ `probe-quarantine`, và nó gác một PHẢN XẠ chứ không một cơ chế:
    // «gặp trở ngại thì bỏ bớt phép thử rồi đi tiếp». Mỗi lần nới thêm một lý do vứt đều hợp lý một
    // mình, và điểm đến là một cổng chỉ giữ những phép thử dễ.
    // Đếm MỌI `continue`, kể cả loại viết gọn giữa dòng (`if (…) continue;`) — bản đầu của ca này chỉ
    // bắt loại đứng đầu dòng và đếm ra 2, tức nó sẽ không thấy một lối vứt thứ tư viết gọn.
    const soContinue = (KHOI.match(/\bcontinue;/g) ?? []).length;
    expect(soContinue, 'thêm một lối vứt là nới danh sách đóng — phải đi qua change khai rõ').toBe(3);
  });

  it('T6.2 ⛔ «probe chạy lâu» KHÔNG nằm trong lý do vứt — ranh giới PO chốt 05/09', () => {
    // Đúng ranh giới đã chốt ở `probe-quarantine`: chỉ bỏ probe NẠP LỖI, không bỏ probe CHẠY LÂU. Nó
    // chuyển nhà sang đây vì cơ chế cũ mất, còn phản xạ nó gác thì không.
    for (const cam of ['treo', 'chạy lâu', 'timeout', 'qua_lau']) {
      expect(KHOI.toLowerCase(), `khối xếp hạng nhắc «${cam}» — có thể đang vứt vì tốc độ`).not.toContain(cam);
    }
  });

  it('T6.3 ⛔ hàng đợi không bị cắt bởi bất kỳ trần nào trong khối xếp hạng', () => {
    // `handover.length > 0` là gác GHI LOG, không phải trần — nên chỉ cấm hai hình dạng thật sự cắt:
    // `slice` trên hàng đợi, và một điều kiện chặn `push` khi đã đủ số.
    expect(KHOI).not.toMatch(/handover\s*\.\s*slice\(/);
    expect(KHOI).not.toMatch(/handover\.length\s*[<>]=?\s*\d+\s*\)\s*\{[\s\S]{0,80}push/);
    expect(KHOI).not.toMatch(/TRAN|MAX_HANDOVER|tranGiao/);
  });
});

describe('bản ghi ĐỜI CŨ trên prod vẫn đọc được (T5)', () => {
  const TYPES = readFileSync('packages/shared/src/types.ts', 'utf8');

  it('T5.1 ⛔ ba trường của thư viện GIỮ trong kiểu, chỉ thôi được SINH', () => {
    // `web-runs/` và `runs/` trên prod có bản ghi mang chúng. Gỡ khỏi kiểu là làm bản ghi đời cũ không
    // đọc được — mà dữ liệu prod là tài sản, không phải thứ dọn cho gọn kiểu.
    for (const truong of ['library_changes', 'cach_ly', 'nghi_loi_co_san']) {
      expect(TYPES, `${truong} bị gỡ khỏi kiểu — bản ghi đời cũ sẽ không đọc được`).toContain(truong);
    }
  });

  it('T5.2 cả ba đều OPTIONAL — bản ghi đời MỚI không mang chúng', () => {
    expect(TYPES).toMatch(/library_changes\?:/);
    expect(TYPES).toMatch(/cach_ly\?:/);
    expect(TYPES).toMatch(/nghi_loi_co_san\?:/);
  });

  it('T5.3 ⛔ VẮNG trường = KHÔNG BIẾT, không phải «bằng 0» — kiểu phải nói ra điều đó', () => {
    // Cùng ranh giới `diff_blind_spots` đã đặt. Không nói ra thì giao diện sẽ hiện «0 probe cách ly» cho
    // một bản ghi vốn không có khái niệm ấy — một con số bịa, trông như số đo.
    const i = TYPES.indexOf('nghi_loi_co_san?:');
    const truoc = TYPES.slice(Math.max(0, i - 900), i);
    expect(truoc, 'kiểu phải khai rằng vắng nghĩa là bản ghi đời mới').toMatch(/VẮNG|ĐỜI CŨ/);
  });

  it('T5.4 verdict đời cũ đi qua kiểu mà không cần trường mới', () => {
    const cu = { library_changes: [{ probe_id: 'P1', action: 'evicted', reason: 'x' }], probe_stats: { cach_ly: 2, nghi_loi_co_san: 1 } };
    expect(() => JSON.parse(JSON.stringify(cu))).not.toThrow();
    expect(cu.probe_stats.cach_ly).toBe(2);
  });
});

describe('thư viện probe thật sự ĐÃ ĐI RỒI (T4)', () => {
  const SKILL = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
  const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');

  it('T4.1 ⛔ engine KHÔNG đọc `probes-lib/` ở đâu cả', () => {
    for (const [ten, src] of [
      ['skill-code.ts', SKILL],
      ['server.ts', SERVER],
    ] as const) {
      expect(src, `${ten} còn đọc thư viện`).not.toContain('readProbeLibrary');
      expect(src, `${ten} còn nạp thư viện`).not.toContain('admitToLibrary');
      expect(src, `${ten} còn cách ly`).not.toContain('quarantineProbes');
    }
  });

  it('T4.2 ⛔ bộ ứng viên chỉ còn nguồn `moi` — không probe nào từ lượt trước', () => {
    expect(SKILL).not.toContain("nguon: 'thu_vien'");
    expect(SKILL).toContain("nguon: 'moi'");
  });

  it('T4.3 `nghi_loi_co_san` không còn đường SINH nào', () => {
    // Nhãn này do đúng một dòng sinh ra, gác bằng `nguon === 'thu_vien'`, và chưa bao giờ được khai
    // trong spec `probe-classification`. Gỡ thư viện làm code thôi làm một việc spec không cho phép.
    expect(SKILL).not.toMatch(/trangThai = 'nghi_loi_co_san'/);
    // Và DÒNG LOG tóm tắt cũng thôi nhắc nhãn ấy. Một con số không bao giờ khác 0 mà vẫn in ra ở mọi lượt
    // là con số trang trí — nó dạy người đọc lướt qua chính dòng log mang các số thật.
    // Bắt được khi chạy thật trên prod 06/09: log vẫn in «0 nghi lỗi có sẵn (thư viện)».
    expect(SKILL).not.toContain('nghi lỗi có sẵn');
  });

  it('T4.5 ⛔C2 — CÁI MẤT hiện ra: lượt chấm khai PHẠM VI đã dò', () => {
    // Gỡ một lớp phủ mà im lặng là để «thôi kiểm» đọc thành «đã kiểm và sạch». Probe sinh mới chỉ dò
    // quanh diff, nên hành vi cũ mà PR không chạm tới không có ai canh — người đọc PASS phải biết điều đó.
    expect(SKILL).toContain('Phạm vi đã dò');
    expect(SKILL).toContain('không khẳng định toàn bộ hành vi repo còn nguyên');
  });

  it('T4.4 sandbox ghi ĐÚNG MỘT file probe — đây là khoản chi phí được gỡ', () => {
    // Từ 17/09 đường «ghi → chạy → đọc» sống ở `runProbeFile` (`runner-canary.ts`); đường thật gọi nó với
    // `code: codeMoi`. Chỗ ghi thật sự chỉ còn MỘT dòng, trong hàm ấy.
    const RUNNER_CANARY = readFileSync('packages/harness/src/runner-canary.ts', 'utf8');
    expect(RUNNER_CANARY).toContain('const files = [sb.ghiProbe(input.code');
    expect(RUNNER_CANARY.split(/\r?\n/).filter((l) => /\.ghiProbe\(/.test(l))).toHaveLength(1);
    expect(SKILL).toContain('code: codeMoi,');
    expect(SKILL.split(/\r?\n/).filter((l) => /\.ghiProbe\(/.test(l)), 'skill-code không được tự ghi probe nữa').toHaveLength(0);
  });
});

/**
 * ⛔ Cửa đột biến phải CHẠY ĐƯỢC trên mọi hệ, không chỉ hệ mà tên file không ràng buộc gì.
 *
 * Lỗi đo được 08/09 bởi làn `oapi-admin-be`: bản đột biến ghi ra `dot_bien_<id><ext>`, bỏ qua
 * `runner.probe_file`. Trên Java — nơi tên file PHẢI trùng tên class — cả hai nhánh đều chết trước khi
 * sinh XML, nên `kq.probes.length === 0`, nên cửa kết luận «probe không cắn» cho MỌI probe Java. Cửa
 * quan trọng nhất của repo im lặng không chạy, và verdict không nói ra.
 *
 * Đây là **cửa song sinh** thứ mười: hai chỗ cùng quyết «file probe tên gì», một chỗ tôn trọng cấu hình
 * repo đích, chỗ kia tự đặt.
 */
export function scanMutationProbeName(nguon: string): string[] {
  const loi: string[] = [];
  const i = nguon.indexOf('chayVaHoiCoDo:');
  if (i < 0) return ['không thấy cửa đột biến — mỏ neo đã đổi, lưới đang mù'];
  const than = nguon.slice(i, i + 1800);
  // Từ 17/09 cửa đột biến không tự `ghiProbe` nữa — nó gọi `runProbeFile({ fileName: … })`. Tên file là
  // giá trị của `fileName:`; lưới đọc đúng dòng ấy.
  const ghi = than.split(/\r?\n/).find((l) => /\bfileName:/.test(l));
  if (ghi === undefined) return ['cửa đột biến không khai fileName cho runProbeFile — mỏ neo đã đổi, lưới đang mù'];
  if (!ghi.includes('fileProbeMoi')) {
    loi.push(`bản đột biến tự đặt tên file thay vì dùng tên đã khai: ${ghi.trim().slice(0, 90)}`);
  }
  return loi;
}

describe('⛔ cửa đột biến dùng ĐÚNG tên file probe đã khai (T7)', () => {
  const SKILL = readFileSync('packages/harness/src/skill-code.ts', 'utf8');

  it('T7.1 ĐỎ: fixture tự đặt tên `dot_bien_…` — bỏ qua `runner.probe_file`', () => {
    const gia = "chayVaHoiCoDo: (daDao) => {\n  const kq = runProbeFile({ repo, sha, code: daDao, fileName: `dot_bien_${u.probe.id}${extProbe}`, probeDir: 'test' });\n}";
    const ra = scanMutationProbeName(gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('tự đặt tên file');
  });

  it('T7.2 XANH: fixture dùng `fileProbeMoi`', () => {
    const gia = "chayVaHoiCoDo: (daDao) => {\n  const kq = runProbeFile({ repo, sha, code: daDao,\n    fileName: fileProbeMoi,\n    probeDir: 'test' });\n}";
    expect(scanMutationProbeName(gia)).toEqual([]);
  });

  it('T7.3 ĐỎ khi mỏ neo biến mất — chống xanh oan', () => {
    expect(scanMutationProbeName('const x = 1;')[0]).toContain('lưới đang mù');
    expect(scanMutationProbeName('chayVaHoiCoDo: () => { return true; }')[0]).toContain('lưới đang mù');
  });

  it('T7.4 mã nguồn HIỆN TẠI sạch — và MỘT chỗ duy nhất quyết tên file probe', () => {
    expect(scanMutationProbeName(SKILL)).toEqual([]);
    // Cửa song sinh đóng: `fileProbeMoi = probeFileNameFor(runner)` là chỗ duy nhất đọc `runner.probe_file`,
    // và mọi người gọi `runProbeFile`/`runCanary` trong skill-code truyền nó làm `fileName`. Ba người gọi từ
    // 17/09: mồi (đường chấm) · đường thật · cửa đột biến. Thêm người gọi thì đọc lại số dưới.
    const dongTen = SKILL.split(/\r?\n/).filter((l) => /^\s*fileName:/.test(l));
    expect(dongTen.length, 'số người gọi runProbeFile đổi thì lưới này phải được đọc lại').toBe(3);
    expect(SKILL).toContain('const fileProbeMoi = probeFileNameFor(runner);');
    expect(SKILL.split(/\r?\n/).filter((l) => /runner\.probe_file/.test(l)), 'chỉ probeFileNameFor được đọc runner.probe_file').toHaveLength(0);
    for (const d of dongTen) expect(d, `chỗ gọi runProbeFile không dùng tên đã khai: ${d.trim()}`).toContain('fileProbeMoi');
    expect(SKILL.split(/\r?\n/).filter((l) => /\.ghiProbe\(/.test(l)), 'skill-code không được tự ghi probe').toHaveLength(0);
  });
});
