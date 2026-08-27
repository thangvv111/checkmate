import { describe, it, expect } from 'vitest';
import { escHtml, tachNguon } from '../apps/web/src/ui.js';
import { locRuns } from '../apps/web/src/ui-lich-su.js';
import { cheKhoa, dinhNghia, DANH_MUC_NCC } from '../apps/web/src/ncc.js';
import type { RunMeta } from '../apps/web/src/runs.js';

// Tầng web: lọc lịch sử theo repo (specs/R4-lich-su-theo-repo.md) và hiển thị an toàn.
// Refactor sang SPA sẽ thay toàn bộ lớp render — lưới này giữ phần LOGIC không bị cuốn theo.

const run = (p: Partial<RunMeta>): RunMeta => ({
  id: p.id ?? 'w1',
  tieuDe: p.tieuDe ?? 'PR #8 · code',
  skill: p.skill ?? 'code',
  trangThai: p.trangThai ?? 'xong',
  batDau: p.batDau ?? '2026-08-27T09:00:00.000Z',
  ...p,
});

const verdict = (result: 'PASS' | 'FAIL', model: string): RunMeta['verdict'] =>
  ({ result, findings: [], artifact_ref: { sha_or_hash: 'e711ced' }, model }) as unknown as RunMeta['verdict'];

describe('locRuns', () => {
  const ds: RunMeta[] = [
    run({ id: 'a', repo: 'thangvv111/checkmate', verdict: verdict('FAIL', 'claude-cli/claude-opus-5') }),
    run({ id: 'b', repo: 'thangvv111/checkmate', skill: 'doc', verdict: verdict('PASS', 'google-gemini/gemini-3.6-flash') }),
    run({ id: 'c', repo: 'khac/repo', verdict: verdict('PASS', 'claude-cli/claude-opus-5') }),
    run({ id: 'd', trangThai: 'loi' }),
  ];

  it('lọc theo repo tách bạch được lịch sử của từng repo', () => {
    expect(locRuns(ds, { repo: 'thangvv111/checkmate', trang: 1 }).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('lượt chưa gắn repo KHÔNG lọt vào lịch sử của một repo cụ thể', () => {
    expect(locRuns(ds, { repo: 'khac/repo', trang: 1 }).map((r) => r.id)).toEqual(['c']);
  });

  it('lọc verdict=loi bắt theo trạng thái tiến trình, không theo kết quả chấm', () => {
    expect(locRuns(ds, { verdict: 'loi', trang: 1 }).map((r) => r.id)).toEqual(['d']);
  });

  it('lọc theo nhà cung cấp dựa vào tiền tố model, không phải tên model', () => {
    expect(locRuns(ds, { ncc: 'claude-cli', trang: 1 }).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('các bộ lọc chồng nhau theo kiểu VÀ', () => {
    expect(locRuns(ds, { repo: 'thangvv111/checkmate', skill: 'doc', trang: 1 }).map((r) => r.id)).toEqual(['b']);
  });

  it('tìm chữ khớp cả tiêu đề lẫn SHA đã ghim', () => {
    expect(locRuns(ds, { q: 'e711ced', trang: 1 })).toHaveLength(3);
    expect(locRuns(ds, { q: 'PR #8', trang: 1 })).toHaveLength(4);
  });

  it('không lọc gì thì giữ nguyên danh sách', () => {
    expect(locRuns(ds, { trang: 1 })).toHaveLength(4);
  });
});

describe('tachNguon', () => {
  it('tách được nhà cung cấp và tên model từ chuỗi ghim trong verdict', () => {
    expect(tachNguon('claude-cli/claude-opus-5')).toEqual({ nguon: 'Gói thuê bao', ten: 'claude-opus-5', nguonMa: 'claude-cli' });
  });

  it('model không mang tiền tố thì để trống nguồn chứ không đoán bừa', () => {
    expect(tachNguon('claude-opus-5').nguonMa).toBe('');
  });

  it('không có model thì hiện gạch ngang ở cả hai cột', () => {
    expect(tachNguon(undefined)).toEqual({ nguon: '—', ten: '—', nguonMa: '' });
  });
});

describe('hiển thị an toàn', () => {
  it('escHtml chặn được thẻ script nhét qua tiêu đề PR', () => {
    expect(escHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('cheKhoa không bao giờ để lộ trọn khoá', () => {
    const khoa = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
    const che = cheKhoa(khoa);
    expect(che).not.toContain(khoa);
    expect(che).toContain('ký tự');
  });

  it('cheKhoa nói rõ khi chưa có khoá', () => {
    expect(cheKhoa('')).toBe('chưa có');
  });
});

describe('danh mục nhà cung cấp', () => {
  it('nhà cung cấp đã ngừng dịch vụ phải mang cờ ngung để giao diện không cho chọn', () => {
    expect(dinhNghia('github').ngung).toBeTruthy();
  });

  it('mọi nhà cung cấp còn sống đều khai ít nhất một model', () => {
    for (const n of DANH_MUC_NCC.filter((x) => !x.ngung)) expect(n.models.length).toBeGreaterThan(0);
  });

  it('nhà cung cấp hỗ trợ phương thức api thì bắt buộc khai tên biến khoá', () => {
    for (const n of DANH_MUC_NCC.filter((x) => !x.ngung && x.phuong_thuc.includes('api'))) {
      expect(n.khoa?.ten_bien, n.ma).toBeTruthy();
    }
  });
});
