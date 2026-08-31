import { describe, it, expect } from 'vitest';
import { DANH_MUC_NCC, dinhNghia, modelHopLe } from '../apps/web/src/ncc.js';

// Model giới hạn theo phương thức (specs/R5.15–R5.16). Ca chốt: claude-fable-5 đi theo gói thuê bao
// của chủ máy, CỐ Ý không mở cho đường API. Ba cửa (form lưu, cổng kiểm, giao diện) hỏi cùng một hàm —
// chặn ở một cửa mà hở cửa khác thì giới hạn chỉ là lời dặn.

describe('modelHopLe (R5.15)', () => {
  const anth = dinhNghia('anthropic');

  it('Fable 5 có trong danh mục và dùng được với gói thuê bao', () => {
    expect(anth.models).toContain('claude-fable-5');
    expect(modelHopLe(anth, 'thue_bao', 'claude-fable-5')).toBe(true);
  });

  it('Fable 5 bị CHẶN với phương thức API — đúng chốt của PO', () => {
    expect(modelHopLe(anth, 'api', 'claude-fable-5')).toBe(false);
  });

  it('model thường dùng được cả hai phương thức', () => {
    expect(modelHopLe(anth, 'thue_bao', 'claude-sonnet-5')).toBe(true);
    expect(modelHopLe(anth, 'api', 'claude-sonnet-5')).toBe(true);
    expect(modelHopLe(anth, 'api', 'claude-opus-5')).toBe(true);
  });

  it('model NGOÀI danh mục đi qua — danh mục là gợi ý, nhà cung cấp là trọng tài (R5.18, vòng sáu)', () => {
    // Giả định cũ «danh mục là trần cứng» bị finding vòng sáu bác: nó chặn luôn model mới ra,
    // biến đường cứu hộ config thành ngõ cụt phải sửa code.
    expect(modelHopLe(anth, 'thue_bao', 'model-moi-ra-chua-co-trong-danh-muc')).toBe(true);
    expect(modelHopLe(anth, 'api', 'model-moi-ra-chua-co-trong-danh-muc')).toBe(true);
  });

  it('phương thức nhà cung cấp KHÔNG hỗ trợ thì chặn (vòng sáu, finding 1)', () => {
    const chiApi = DANH_MUC_NCC.find((d) => d.phuong_thuc.length === 1 && d.phuong_thuc[0] === 'api');
    if (chiApi) expect(modelHopLe(chiApi, 'thue_bao', chiApi.models[0])).toBe(false);
  });

  it('nhà cung cấp không khai chi_thue_bao thì không bị ảnh hưởng gì', () => {
    for (const dn of DANH_MUC_NCC.filter((d) => !d.chi_thue_bao)) {
      for (const m of dn.models) {
        for (const pt of dn.phuong_thuc) expect(modelHopLe(dn, pt, m)).toBe(true);
      }
    }
  });

  it('config KHUYẾT trường model: đường chấm HỎI chứ không đoán (R5.19, vòng sáu finding 2)', async () => {
    // Kiểm qua thông điệp của LoiCauHinhNcc — ca đầy đủ nằm ở test/ba-muc-tu-dong (cần CHECKMATE_GOC)
    const { cauHinhDeCham, LoiCauHinhNcc } = await import('../apps/web/src/config.js');
    const cGia = { agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api' } } } } as never;
    expect(() => cauHinhDeCham(cGia)).toThrow(LoiCauHinhNcc);
    expect(() => cauHinhDeCham(cGia)).toThrow(/thiếu trường «model»/);
  });
});

describe('cổng kiểm từ chối tổ hợp ngoài giới hạn TRƯỚC khi gọi (R5.16)', () => {
  it('api + fable → ok:false với lời nói đúng nguyên nhân, không gọi model', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const t0 = Date.now();
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'claude-fable-5' });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/chỉ mở cho gói thuê bao/);
    // từ chối tại chỗ — không có lời gọi mạng nào ăn vài giây
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});

describe('hai nguyên nhân phải nói hai lời khác nhau — Opus bắt trên chính PR này', () => {
  it('model lạ KHÔNG bị từ chối sớm theo danh mục — lỗi (nếu có) phải là lỗi THẬT từ bước sau (R5.18)', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'model-khong-co-that-xyz' });
    expect(kq.ok).toBe(false); // máy test không có ANTHROPIC_API_KEY → lỗi thiếu khoá, một nguyên nhân thật
    expect(kq.thong_diep).not.toMatch(/không có trong danh mục|không đi được với phương thức/);
    expect(kq.thong_diep).not.toContain('model-khong-co-that-xyz'); // R5.20 — không vọng nguyên văn
  });

  it('model chỉ-thuê-bao đi đường API → nói đúng chuyện phương thức, kèm hướng sửa', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'claude-fable-5' });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/chỉ mở cho gói thuê bao/);
  });
});

describe('không vọng nguyên văn giá trị ngoài danh mục — Opus bắt hồi quy rò khoá trên chính bản sửa', () => {
  it('dán nhầm API key vào ô model thì key KHÔNG đi ra thông điệp lẫn sổ kiểm', async () => {
    const keyGia = 'sk-ant-api03-TEST-KHONG-CO-THAT-0123456789';
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const { docSoKiem } = await import('../apps/web/src/ncc.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: keyGia });
    expect(kq.ok).toBe(false);
    // Nêu độ dài + danh mục là đủ; chép lại thứ người dùng vừa gõ là biến lỗi gõ nhầm thành lỗi lộ khoá
    for (const chuoi of [JSON.stringify(kq), JSON.stringify(docSoKiem())]) {
      expect(chuoi).not.toContain(keyGia);
      expect(chuoi).not.toContain('sk-ant-');
    }
    // đi tới bước sau (thiếu khoá API trên máy test) nhưng key tuyệt đối không được vọng ra
  });
});

describe('bản che phân biệt được hai model khác nhau (vòng bảy, finding 1)', () => {
  it('hai model lạ CÙNG độ dài không được trùng một hàng sổ kiểm', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const { docSoKiem } = await import('../apps/web/src/ncc.js');
    await thuNcc('anthropic', { phuong_thuc: 'api', model: 'model-la-aaaaaaaa' });
    const hangA = JSON.stringify(docSoKiem());
    await thuNcc('anthropic', { phuong_thuc: 'api', model: 'model-la-bbbbbbbb' });
    const hangB = JSON.stringify(docSoKiem());
    // cùng 17 ký tự — che trần theo độ dài sẽ cho cùng chuỗi, và tổ hợp B thành «đã kiểm» nhờ hàng của A
    expect(hangA).not.toBe(hangB);
  });
});
