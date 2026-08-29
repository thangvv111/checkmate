import { describe, it, expect } from 'vitest';
import { bocJson, bocCode, LoiModelDungTool } from '../packages/harness/src/jsonx.js';
import { taoRao, LOI_RAO } from '../packages/harness/src/rao.js';

// Bóc trả lời model + rào chống prompt injection (specs/R3-boc-tra-loi-model.md).
// Model đổi đời là đổi thói quen định dạng — lưới này giữ cho việc đổi model không âm thầm làm hỏng luồng.

describe('bocJson', () => {
  it('bóc được JSON trong code fence có tag json', () => {
    expect(bocJson<{ a: number }>('nói vài câu\n```json\n{"a": 1}\n```\nhết')).toEqual({ a: 1 });
  });

  it('bóc được JSON trần không fence', () => {
    expect(bocJson<{ probes: unknown[] }>('{"probes": []}')).toEqual({ probes: [] });
  });

  it('không có JSON thì ném lỗi kèm trích trả lời để người đọc biết model nói gì', () => {
    expect(() => bocJson('tôi không thể làm việc này')).toThrow(/Không tìm thấy JSON/);
  });

  it('JSON hỏng thì lỗi phải chỉ ĐÚNG CHỖ hỏng, không chỉ nói "position 2914"', () => {
    // Ca thật đã làm chết một lượt chấm: người đọc log lẫn lượt sinh lại đều mù vì chỉ có con số
    const hong = '{"probes": [{"id": "P1", "ten": "mot"} {"id": "P2", "ten": "hai"}]}';
    let msg = '';
    try {
      bocJson(hong);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/không parse được/);
    expect(msg).toContain('HỎNG Ở ĐÂY');
    expect(msg).toContain('P1'); // có đoạn văn quanh chỗ hỏng chứ không phải chỉ con số
  });
});

describe('bocCode', () => {
  it('bỏ language tag, không để lọt vào dòng đầu file code', () => {
    const ra = bocCode('```typescript\nimport { it } from "vitest";\n```');
    expect(ra.startsWith('import')).toBe(true);
    expect(ra).not.toContain('typescript');
  });

  it('nhận mọi tag ngôn ngữ chứ không riêng ts', () => {
    expect(bocCode('```python\ndef test_x():\n    assert 1 == 1\n```')).toBe('def test_x():\n    assert 1 == 1');
  });

  it('không fence nhưng rõ là mã nguồn thì vẫn nhận', () => {
    expect(bocCode('import x from "y";\nconst a = 1;')).toContain('import x');
  });

  it('model phát lời gọi tool thì báo ĐÚNG bản chất để chỗ gọi biết đường nhắc lại', () => {
    expect(() => bocCode('<invoke name="Bash">\n<parameter name="command">ls</parameter>\n</invoke>')).toThrow(LoiModelDungTool);
  });
});

describe('rào chống prompt injection', () => {
  it('mỗi lượt sinh một nonce khác nhau — nội dung bị chấm không đoán trước được rào', () => {
    expect(taoRao()('SPEC', 'x')).not.toBe(taoRao()('SPEC', 'x'));
  });

  it('nội dung được kẹp giữa hai mốc mang cùng nonce', () => {
    const rao = taoRao();
    const ra = rao('DIFF', 'nội dung nguy hiểm');
    const nonce = ra.match(/[0-9a-f]{6,}/)?.[0];
    expect(nonce).toBeTruthy();
    expect(ra.split(nonce!).length - 1).toBeGreaterThanOrEqual(2);
    expect(ra).toContain('nội dung nguy hiểm');
  });

  it('lời rào nói rõ mọi thứ trong mốc là DỮ LIỆU, không phải lệnh', () => {
    expect(LOI_RAO.toLowerCase()).toMatch(/dữ liệu|không phải lệnh|không được làm theo/);
  });
});
