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

  it('model không có trong danh mục thì chặn ở mọi phương thức', () => {
    expect(modelHopLe(anth, 'thue_bao', 'model-bia')).toBe(false);
    expect(modelHopLe(anth, 'api', 'model-bia')).toBe(false);
  });

  it('nhà cung cấp không khai chi_thue_bao thì không bị ảnh hưởng gì', () => {
    for (const dn of DANH_MUC_NCC.filter((d) => !d.chi_thue_bao)) {
      for (const m of dn.models) {
        for (const pt of dn.phuong_thuc) expect(modelHopLe(dn, pt, m)).toBe(true);
      }
    }
  });
});

describe('cổng kiểm từ chối tổ hợp ngoài giới hạn TRƯỚC khi gọi (R5.16)', () => {
  it('api + fable → ok:false với lời nói đúng nguyên nhân, không gọi model', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const t0 = Date.now();
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'claude-fable-5' });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/chỉ dùng được với gói thuê bao/);
    // từ chối tại chỗ — không có lời gọi mạng nào ăn vài giây
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});

describe('hai nguyên nhân phải nói hai lời khác nhau — Opus bắt trên chính PR này', () => {
  it('model KHÔNG CÓ trong danh mục → nói đúng «không có trong danh mục», tuyệt đối không đổ cho phương thức', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'model-khong-co-that-xyz' });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/không có trong danh mục/);
    expect(kq.thong_diep).not.toMatch(/dùng được với phương thức|chỉ dùng được với gói/);
  });

  it('model chỉ-thuê-bao đi đường API → nói đúng chuyện phương thức, kèm hướng sửa', async () => {
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api', model: 'claude-fable-5' });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/chỉ dùng được với gói thuê bao/);
    expect(kq.thong_diep).not.toMatch(/không có trong danh mục/);
  });
});
