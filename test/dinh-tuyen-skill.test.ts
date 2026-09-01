import { describe, it, expect } from 'vitest';
import { classifyPr } from '../apps/web/src/github.js';

/**
 * Định tuyến skill theo loại file đã đổi (specs/R13).
 *
 * Hai hướng sai KHÔNG đối xứng: doc bị đẩy sang code chỉ tốn tiền và ồn (đo được trên PR #17: 10
 * probe cho một PR không có dòng code nào, 4 lượt gọi model, ~52k token); code bị đẩy sang doc thì
 * không probe nào chạy và verdict xanh trên vùng chưa ai thử. Mọi ca nghi ngờ phải rơi về code.
 */

describe('classifyPr — allowlist hẹp, fail-closed (R13.1–R13.5)', () => {
  it('PR chỉ đổi tài liệu và cấu hình quy trình → doc, và lý do NÊU TÊN tài liệu (R13.6)', () => {
    const kq = classifyPr(['CLAUDE.md', 'openspec/config.yaml', 'openspec/schemas/checkmate/schema.yaml']);
    expect(kq.loai).toBe('doc');
    expect(kq.fileDocUngVien).toEqual(['CLAUDE.md']);
    // Hai cửa của một luật phải nói cùng một lời: đường code nêu tên file thì đường doc cũng phải nêu
    expect(kq.lyDo).toContain('CLAUDE.md');
  });

  it('PR trộn tài liệu với mã nguồn → code, và lý do nêu ĐÚNG file gây ra quyết định', () => {
    const kq = classifyPr(['AGENTS.md', 'GEMINI.md', 'test/huong-dan-harness.test.ts']);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toContain('test/huong-dan-harness.test.ts');
  });

  it('checkmate.yml KHÔNG phải văn bản thuần — engine đọc nó (R13.3)', () => {
    // Đổi hợp đồng là đổi hành vi chấm, không phải đổi tài liệu
    expect(classifyPr(['checkmate.yml']).loai).toBe('code');
    expect(classifyPr(['README.md', 'checkmate.yml']).loai).toBe('code');
  });

  it('file CI là code, không phải tài liệu', () => {
    expect(classifyPr(['.github/workflows/ci.yml']).loai).toBe('code');
  });

  it('toàn văn bản thuần nhưng KHÔNG có .md nào → code, vì skill doc không có gì để đọc (R13.4)', () => {
    const kq = classifyPr(['openspec/schemas/checkmate/schema.yaml']);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toContain('R13.4');
  });

  it('FAIL-CLOSED: đuôi lạ chưa từng thấy đều về code', () => {
    for (const f of ['deploy/script.sh', 'Makefile', 'apps/web/src/a.tsx', 'bin/tool', 'x.py']) {
      expect(classifyPr([f]).loai, `${f} phải là code`).toBe('code');
    }
  });

  it('so đuôi KHÔNG phân biệt hoa thường — giữ hành vi đời trước', () => {
    expect(classifyPr(['README.MD', 'NOTES.Txt']).loai).toBe('doc');
  });

  it('mọi lối ra đều kèm lý do không rỗng (R13.6)', () => {
    for (const ds of [['a.md'], ['a.ts'], ['openspec/x.yaml'], ['a.md', 'b.ts']]) {
      expect(classifyPr(ds).lyDo.trim().length, `lý do rỗng cho ${ds.join(',')}`).toBeGreaterThan(10);
    }
  });
});

describe('vòng hai: đuôi file trong openspec · specs là luật · vùng mù · phần tử méo', () => {
  it('file MÃ NGUỒN dưới openspec/ vẫn là code — allowlist theo ĐUÔI, không theo thư mục (HIGH)', () => {
    // Cho cả thư mục là văn bản thuần thì `openspec/hack.ts` thành tài liệu — cửa né probe rộng nhất,
    // do chính luật này mở ra ở vòng một.
    expect(classifyPr(['docs.md', 'openspec/hack.ts']).loai).toBe('code');
    expect(classifyPr(['docs.md', 'openspec/changes/x/run.sh']).loai).toBe('code');
    // còn đuôi cấu hình quy trình dưới openspec/ thì vẫn là văn bản
    expect(classifyPr(['docs.md', 'openspec/config.yaml']).loai).toBe('doc');
  });

  it('specs/** là LUẬT engine đọc thật → code, kể cả .md (HIGH)', () => {
    // Cùng tiêu chí đã xếp checkmate.yml vào code: engine ĐỌC nó. PR sửa luật của chính cổng mà đi
    // đường tài liệu thì có thể tự nới cổng rồi tự qua cổng với bằng chứng rỗng.
    expect(classifyPr(['specs/R6-verdict-va-cong-merge.md']).loai).toBe('code');
    expect(classifyPr(['specs/R13-dinh-tuyen-skill.md', 'openspec/config.yaml']).loai).toBe('code');
    expect(classifyPr(['README.md']).loai).toBe('doc'); // .md ngoài specs/ vẫn là tài liệu
  });

  it('KHAI VÙNG MÙ: lý do nêu đủ file sẽ KHÔNG được đọc, không chỉ file được chấm (R13.7)', () => {
    const kq = classifyPr(['CLAUDE.md', 'openspec/config.yaml', 'openspec/schemas/checkmate/schema.yaml']);
    expect(kq.loai).toBe('doc');
    expect(kq.lyDo).toContain('openspec/config.yaml');
    expect(kq.lyDo).toContain('openspec/schemas/checkmate/schema.yaml');
    expect(kq.khongDoc).toEqual(['openspec/config.yaml', 'openspec/schemas/checkmate/schema.yaml']);
  });

  it('KHAI VÙNG MÙ: nhiều .md thì nói rõ chỉ MỘT được chấm và nêu tên các ứng viên còn lại', () => {
    const kq = classifyPr(['a.md', 'b.md', 'c.md', 'd.md']);
    expect(kq.lyDo).toContain('d.md');
    expect(kq.lyDo).toMatch(/CHỈ MỘT được chấm/);
    expect(kq.lyDo).toMatch(/3 ứng viên còn lại KHÔNG được đọc/);
  });

  it('vùng mù: nêu ứng viên chưa chốt mà KHÔNG khai đích danh cái nào được chấm (R13.7, vòng ba+bốn)', () => {
    // Vòng ba đòi ứng viên không được chọn phải hiện ra; vòng bốn bác việc khai ĐÍCH DANH md[0] là
    // «sẽ được chấm» khi fetchAndRoute mới là nơi chọn (theo số dòng đổi). Hoà hai đòi hỏi: khongDoc
    // chỉ gồm file CHẮC CHẮN mù, còn ứng viên nêu riêng kèm câu «chỉ MỘT được chấm».
    const kq = classifyPr(['CLAUDE.md', 'NOTES.md', 'openspec/config.yaml', 'notes.txt']);
    expect(kq.loai).toBe('doc');
    expect(kq.khongDoc).toEqual(['openspec/config.yaml', 'notes.txt']);
    expect(kq.fileDocUngVien).toEqual(['CLAUDE.md', 'NOTES.md']);
    expect(kq.lyDo).toContain('NOTES.md');
    expect(kq.lyDo).toMatch(/1 ứng viên còn lại KHÔNG được đọc/);
    expect(kq.lyDo).toMatch(/CHẮC CHẮN không được đọc/);
  });

  it('ten() KHÔNG được ném với object không prototype hay toString vô hiệu (R13.8, vòng bốn)', () => {
    const quai = Object.create(null);
    const hong = { toString: null } as unknown;
    for (const x of [quai, hong]) {
      expect(() => classifyPr(['docs.md', x] as never)).not.toThrow();
      expect(classifyPr(['docs.md', x] as never).loai).toBe('code');
    }
  });

  it('hai object khác nhau phải cho hai lý do KHÁC nhau — nêu được thủ phạm (R13.6, vòng bốn)', () => {
    const a = classifyPr(['docs.md', { ten: 'hack.ts' }] as never).lyDo;
    const b = classifyPr(['docs.md', { ten: 'khac.py' }, { ten: 'them.rb' }] as never).lyDo;
    expect(a).not.toBe(b);
    expect(a).toMatch(/vị trí 1/);
  });

  it('cụm đầu vào méo phải nói ĐÚNG bản chất, không mượn lời R13.4 (vòng bốn)', () => {
    for (const x of [null, undefined, 'chuoi', 123]) {
      const kq = classifyPr(x as never);
      expect(kq.loai).toBe('code');
      expect(kq.lyDo, `${JSON.stringify(x)}`).toMatch(/không phải mảng/);
      expect(kq.lyDo).not.toMatch(/toàn văn bản thuần/);
    }
    expect(classifyPr([]).lyDo).toMatch(/RỖNG/);
  });

  it('CẢ CỤM đầu vào méo cũng không được ném — R13.8 áp cho cụm, không chỉ phần tử (vòng ba)', () => {
    for (const x of [null, undefined, 'chuoi', 123, { a: 1 }]) {
      expect(() => classifyPr(x as never), `classifyPr(${JSON.stringify(x)})`).not.toThrow();
      expect(classifyPr(x as never).loai).toBe('code');
    }
  });

  it('tên file RỖNG vẫn phải hiện thành dấu hiệu đọc được trong lý do (R13.6, vòng ba)', () => {
    const kq = classifyPr(['docs.md', '   ']);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toMatch(/tên file rỗng/); // không được để chỗ liệt kê trống trơn
  });

  it('phần tử null/undefined/sai kiểu KHÔNG được ném — fail-closed về code (R13.8)', () => {
    // Hàm đứng đầu pipeline mà ném thì cả lượt chấm chết giữa chừng — hỏng an toàn ngược hướng.
    for (const ds of [['docs.md', null], ['docs.md', undefined], ['docs.md', 123], [null], ['']]) {
      expect(() => classifyPr(ds as never)).not.toThrow();
      const kq = classifyPr(ds as never);
      expect(kq.loai, `${JSON.stringify(ds)} phải về code`).toBe('code');
      expect(kq.lyDo.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('ca đối kháng — tên file là dữ liệu do maker viết (R13.5, R7)', () => {
  it('«openspec» là TIỀN TỐ tên file chứ không phải thư mục → vẫn là code', () => {
    // Ai muốn né probe sẽ đặt tên nhắm đúng chỗ hở này. Khớp cấu trúc, không khớp tiền tố chuỗi.
    // ⚠ Ca phải kèm MỘT file .md: không có .md thì R13.4 cũng trả 'code' và ca này xanh dù allowlist
    // đã hở — đó là test mồ côi. Có .md thì nới allowlist sẽ cho ra 'doc' và ca đỏ đúng lúc cần.
    // (Đã thử: tạm đổi thành startsWith('openspec') → hai expect dưới ĐỎ, bản đúng thì xanh.)
    expect(classifyPr(['docs.md', 'openspec-notes.js']).loai).toBe('code');
    expect(classifyPr(['docs.md', 'openspecial/hack.ts']).loai).toBe('code');
    expect(classifyPr(['openspec-notes.js']).loai).toBe('code');
  });

  it('dấu chéo ngược trong tên file KHÔNG được chuẩn hoá thành thư mục — nó là TÊN FILE thật', () => {
    // `git diff --name-only` luôn trả dấu `/`. Một đường dẫn chứa `\` là tên file do maker đặt:
    // `openspec\hack.ts` là MỘT file ở gốc repo, không phải file nằm dưới `openspec/`.
    // (Ca test đời trước ở đây MÃ HOÁ chính cái bug: nó khẳng định `\` được chuẩn hoá.)
    expect(classifyPr(['docs.md', 'openspec\\hack.ts']).loai).toBe('code');
    expect(classifyPr(['docs.md', 'openspec\\x\\y.py']).loai).toBe('code');
  });

  it('thư mục HOA THƯỜNG khác nhau là thư mục KHÁC NHAU trên Linux', () => {
    // Đuôi file so không phân biệt hoa thường, nhưng tên THƯ MỤC thì có — gột hoa thường cả đường
    // dẫn là mở đúng cửa né probe (vòng một của cổng bắt).
    expect(classifyPr(['docs.md', 'OpenSpec/hack.ts']).loai).toBe('code');
    expect(classifyPr(['docs.md', 'OPENSPEC/x.py']).loai).toBe('code');
    expect(classifyPr(['docs.md', 'openspec/that.yaml']).loai).toBe('doc');
  });

  it('FILE tên đúng «openspec» ở gốc là file thực thi được, không phải thư mục', () => {
    // git liệt kê FILE chứ không liệt kê thư mục, nên khớp đúng chuỗi «openspec» chỉ có thể là một
    // file ở gốc — cùng loại với Makefile hay bin/tool mà luật đã xếp là code.
    expect(classifyPr(['docs.md', 'openspec']).loai).toBe('code');
  });

  it('file .md nằm sâu trong thư mục code vẫn là văn bản thuần', () => {
    expect(classifyPr(['apps/web/src/README.md']).loai).toBe('doc');
  });

  it('danh sách RỖNG không được ném — fetchAndRoute đã có lỗi riêng cho ca đó', () => {
    expect(() => classifyPr([])).not.toThrow();
    expect(classifyPr([]).loai).toBe('code');
  });
});
