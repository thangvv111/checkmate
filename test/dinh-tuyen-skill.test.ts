import { describe, it, expect } from 'vitest';
import { phanLoaiPr } from '../apps/web/src/github.js';

/**
 * Định tuyến skill theo loại file đã đổi (specs/R13).
 *
 * Hai hướng sai KHÔNG đối xứng: doc bị đẩy sang code chỉ tốn tiền và ồn (đo được trên PR #17: 10
 * probe cho một PR không có dòng code nào, 4 lượt gọi model, ~52k token); code bị đẩy sang doc thì
 * không probe nào chạy và verdict xanh trên vùng chưa ai thử. Mọi ca nghi ngờ phải rơi về code.
 */

describe('phanLoaiPr — allowlist hẹp, fail-closed (R13.1–R13.5)', () => {
  it('PR chỉ đổi tài liệu và cấu hình quy trình → doc, và lý do NÊU TÊN tài liệu (R13.6)', () => {
    const kq = phanLoaiPr(['CLAUDE.md', 'openspec/config.yaml', 'openspec/schemas/checkmate/schema.yaml']);
    expect(kq.loai).toBe('doc');
    expect(kq.fileDocUngVien).toEqual(['CLAUDE.md']);
    // Hai cửa của một luật phải nói cùng một lời: đường code nêu tên file thì đường doc cũng phải nêu
    expect(kq.lyDo).toContain('CLAUDE.md');
  });

  it('PR trộn tài liệu với mã nguồn → code, và lý do nêu ĐÚNG file gây ra quyết định', () => {
    const kq = phanLoaiPr(['AGENTS.md', 'GEMINI.md', 'test/huong-dan-harness.test.ts']);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toContain('test/huong-dan-harness.test.ts');
  });

  it('checkmate.yml KHÔNG phải văn bản thuần — engine đọc nó (R13.3)', () => {
    // Đổi hợp đồng là đổi hành vi chấm, không phải đổi tài liệu
    expect(phanLoaiPr(['checkmate.yml']).loai).toBe('code');
    expect(phanLoaiPr(['README.md', 'checkmate.yml']).loai).toBe('code');
  });

  it('file CI là code, không phải tài liệu', () => {
    expect(phanLoaiPr(['.github/workflows/ci.yml']).loai).toBe('code');
  });

  it('toàn văn bản thuần nhưng KHÔNG có .md nào → code, vì skill doc không có gì để đọc (R13.4)', () => {
    const kq = phanLoaiPr(['openspec/schemas/checkmate/schema.yaml']);
    expect(kq.loai).toBe('code');
    expect(kq.lyDo).toContain('R13.4');
  });

  it('FAIL-CLOSED: đuôi lạ chưa từng thấy đều về code', () => {
    for (const f of ['deploy/script.sh', 'Makefile', 'apps/web/src/a.tsx', 'bin/tool', 'x.py']) {
      expect(phanLoaiPr([f]).loai, `${f} phải là code`).toBe('code');
    }
  });

  it('so đuôi KHÔNG phân biệt hoa thường — giữ hành vi đời trước', () => {
    expect(phanLoaiPr(['README.MD', 'NOTES.Txt']).loai).toBe('doc');
  });

  it('mọi lối ra đều kèm lý do không rỗng (R13.6)', () => {
    for (const ds of [['a.md'], ['a.ts'], ['openspec/x.yaml'], ['a.md', 'b.ts']]) {
      expect(phanLoaiPr(ds).lyDo.trim().length, `lý do rỗng cho ${ds.join(',')}`).toBeGreaterThan(10);
    }
  });
});

describe('ca đối kháng — tên file là dữ liệu do maker viết (R13.5, R7)', () => {
  it('«openspec» là TIỀN TỐ tên file chứ không phải thư mục → vẫn là code', () => {
    // Ai muốn né probe sẽ đặt tên nhắm đúng chỗ hở này. Khớp cấu trúc, không khớp tiền tố chuỗi.
    // ⚠ Ca phải kèm MỘT file .md: không có .md thì R13.4 cũng trả 'code' và ca này xanh dù allowlist
    // đã hở — đó là test mồ côi. Có .md thì nới allowlist sẽ cho ra 'doc' và ca đỏ đúng lúc cần.
    // (Đã thử: tạm đổi thành startsWith('openspec') → hai expect dưới ĐỎ, bản đúng thì xanh.)
    expect(phanLoaiPr(['docs.md', 'openspec-notes.js']).loai).toBe('code');
    expect(phanLoaiPr(['docs.md', 'openspecial/hack.ts']).loai).toBe('code');
    expect(phanLoaiPr(['openspec-notes.js']).loai).toBe('code');
  });

  it('dấu chéo ngược trong tên file KHÔNG được chuẩn hoá thành thư mục — nó là TÊN FILE thật', () => {
    // `git diff --name-only` luôn trả dấu `/`. Một đường dẫn chứa `\` là tên file do maker đặt:
    // `openspec\hack.ts` là MỘT file ở gốc repo, không phải file nằm dưới `openspec/`.
    // (Ca test đời trước ở đây MÃ HOÁ chính cái bug: nó khẳng định `\` được chuẩn hoá.)
    expect(phanLoaiPr(['docs.md', 'openspec\\hack.ts']).loai).toBe('code');
    expect(phanLoaiPr(['docs.md', 'openspec\\x\\y.py']).loai).toBe('code');
  });

  it('thư mục HOA THƯỜNG khác nhau là thư mục KHÁC NHAU trên Linux', () => {
    // Đuôi file so không phân biệt hoa thường, nhưng tên THƯ MỤC thì có — gột hoa thường cả đường
    // dẫn là mở đúng cửa né probe (vòng một của cổng bắt).
    expect(phanLoaiPr(['docs.md', 'OpenSpec/hack.ts']).loai).toBe('code');
    expect(phanLoaiPr(['docs.md', 'OPENSPEC/x.py']).loai).toBe('code');
    expect(phanLoaiPr(['docs.md', 'openspec/that.yaml']).loai).toBe('doc');
  });

  it('FILE tên đúng «openspec» ở gốc là file thực thi được, không phải thư mục', () => {
    // git liệt kê FILE chứ không liệt kê thư mục, nên khớp đúng chuỗi «openspec» chỉ có thể là một
    // file ở gốc — cùng loại với Makefile hay bin/tool mà luật đã xếp là code.
    expect(phanLoaiPr(['docs.md', 'openspec']).loai).toBe('code');
  });

  it('file .md nằm sâu trong thư mục code vẫn là văn bản thuần', () => {
    expect(phanLoaiPr(['apps/web/src/README.md']).loai).toBe('doc');
  });

  it('danh sách RỖNG không được ném — fetchVaRouter đã có lỗi riêng cho ca đó', () => {
    expect(() => phanLoaiPr([])).not.toThrow();
    expect(phanLoaiPr([]).loai).toBe('code');
  });
});
