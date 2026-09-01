import { describe, it, expect } from 'vitest';
import { envForCli } from '../packages/harness/src/model.js';

// Môi trường truyền cho tiến trình `claude` CLI phải là DANH SÁCH CHO PHÉP (specs/R8.11).
// Ca thật đo trên máy chủ: /etc/checkmate.env mang GITHUB_TOKEN, mà bản cũ truyền cả process.env rồi
// chỉ cắt đúng ANTHROPIC_API_KEY — nên chìa GitHub của tổ chức chảy sang tiến trình bên thứ ba ở MỌI
// lượt chấm, dù nó không cần chìa đó để làm gì.

describe('môi trường cho lời gọi model qua CLI', () => {
  const nguon: NodeJS.ProcessEnv = {
    PATH: '/usr/bin',
    HOME: '/home/ubuntu',
    GITHUB_TOKEN: 'ghp_CHIA_CUA_TO_CHUC',
    ANTHROPIC_API_KEY: 'sk-ant-KHOA-API',
    CHECKER_KHOA: 'sk-khoa-ncc-khac',
    OPENAI_API_KEY: 'sk-openai',
    MOT_BI_MAT_CHUA_AI_NGHI_RA: 'bi-mat-tuong-lai',
    CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-THUE-BAO',
  };

  it('KHÔNG để lọt bí mật nào ngoài token gói thuê bao', () => {
    const ra = envForCli(nguon);
    for (const cam of ['GITHUB_TOKEN', 'ANTHROPIC_API_KEY', 'CHECKER_KHOA', 'OPENAI_API_KEY']) {
      expect(ra[cam], `${cam} không được lọt sang tiến trình CLI`).toBeUndefined();
    }
  });

  it('bí mật CHƯA AI NGHĨ RA cũng không lọt — đó là lý do phải dùng danh sách cho phép', () => {
    // Danh sách cấm đòi người viết biết trước mọi khoá sẽ tồn tại trong tương lai. Thêm một khoá mới
    // vào file env là rò thêm một bí mật, và không ai phải sửa code nên không ai nhận ra.
    expect(envForCli(nguon).MOT_BI_MAT_CHUA_AI_NGHI_RA).toBeUndefined();
  });

  it('vẫn truyền đủ thứ CLI cần để chạy được', () => {
    const ra = envForCli(nguon);
    expect(ra.PATH).toBe('/usr/bin');
    expect(ra.HOME).toBe('/home/ubuntu');
    // token gói thuê bao là bí mật DUY NHẤT mà CLI thật sự cần — thiếu nó thì không đăng nhập được
    expect(ra.CLAUDE_CODE_OAUTH_TOKEN).toBe('sk-ant-oat-THUE-BAO');
  });

  it('giữ nguyên CLAUDECODE rỗng để CLI không tưởng đang chạy lồng trong chính nó', () => {
    expect(envForCli(nguon).CLAUDECODE).toBe('');
  });

  it('không có token thuê bao thì không dựng ra khoá rỗng', () => {
    const { CLAUDE_CODE_OAUTH_TOKEN: _bo, ...khongTb } = nguon;
    expect('CLAUDE_CODE_OAUTH_TOKEN' in envForCli(khongTb)).toBe(false);
  });
});
