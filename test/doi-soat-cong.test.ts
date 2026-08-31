import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Đối soát cổng (specs/R6.20–R6.25).
 *
 * Một cổng không ngăn được người ta merge bằng đường khác — GitHub luôn có nút merge. Điều nó bắt
 * buộc phải làm là BIẾT chuyện đó đã xảy ra và ghi đúng bản chất. Đo trên prod 01/09 trước change
 * này: 66 lượt chấm có PR mà sổ cổng không có một hàng nào, trong khi cùng ngày 8 PR được merge.
 */

const goc = mkdtempSync(join(tmpdir(), 'checkmate-doisoat-'));
process.env.CHECKMATE_GOC = goc;

const kho = await import('../apps/web/src/kho/kho-run.js');
const so = await import('../apps/web/src/kho/kho-socai.js');
const cong = await import('../apps/web/src/cong.js');
const db = await import('../apps/web/src/kho/db.js');

const verdictGia = (result: 'PASS' | 'FAIL', medium = 0, high = 0) => ({
  run_id: 'x',
  skill: 'code' as const,
  artifact_ref: { kind: 'pr' as const, name: 'r', sha_or_hash: 'a'.repeat(40) },
  result,
  findings: [
    ...Array.from({ length: high }, (_, i) => ({ id: `H${i}`, severity: 'high' as const, title_vi: 'h', what_vi: 'w', consequence_vi: 'c', evidence: { type: 'quote' as const, loc: 'l', quote: 'q' } })),
    ...Array.from({ length: medium }, (_, i) => ({ id: `M${i}`, severity: 'medium' as const, title_vi: 'm', what_vi: 'w', consequence_vi: 'c', evidence: { type: 'quote' as const, loc: 'l', quote: 'q' } })),
  ],
  model: 'm',
  mode: 'org',
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
});

const themRun = (id: string, pr: number, v = verdictGia('PASS')) =>
  kho.luuMeta({
    id,
    tieuDe: `run ${id}`,
    skill: 'code',
    trangThai: 'xong',
    batDau: new Date().toISOString(),
    repo: 'chu/repo',
    pr: { so: pr, headSha: 'b'.repeat(40), tacGia: 'nguoi-viet' },
    verdict: v as never,
  } as never);

beforeEach(() => {
  db.dongDb();
  rmSync(join(goc, 'web-runs'), { recursive: true, force: true });
});
afterAll(() => {
  db.dongDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('chiTietNgoaiCong — nói đủ ba điều (R6.22)', () => {
  it('verdict có medium: nêu ngoài cổng · không xác nhận nào · số medium chưa tick', () => {
    const s = cong.chiTietNgoaiCong(verdictGia('PASS', 2) as never);
    expect(s).toMatch(/NGOÀI CheckMate/);
    expect(s).toMatch(/KHÔNG có xác nhận finding nào/);
    expect(s).toContain('2 medium');
    expect(s).toMatch(/2 cảnh báo medium\/low CHƯA được xác nhận/);
  });

  it('verdict 0 finding vẫn phải NÓI RA «không có xác nhận nào» — im lặng bị đọc nhầm', () => {
    const s = cong.chiTietNgoaiCong(verdictGia('PASS', 0) as never);
    expect(s).toMatch(/KHÔNG có xác nhận finding nào/);
    expect(s).toMatch(/không có cảnh báo medium\/low nào/);
  });

  it('không có verdict thì nói «không rõ», không bịa', () => {
    expect(cong.chiTietNgoaiCong(null)).toMatch(/không rõ/);
  });
});

describe('doiSoatCong — ghi đúng, không bịa, không trùng (R6.20–R6.24)', () => {
  it('PR đã merge ngoài cổng → ghi MỘT hàng, cờ ngoai_cong bật, run.cong_* cập nhật', async () => {
    themRun('r1', 101, verdictGia('PASS', 2) as never);
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'ai-do', tac_gia: 'nguoi-viet' }));
    expect(kq.daGhi).toBe(1);
    const hang = so.docSoCong('r1');
    expect(hang).toHaveLength(1);
    expect(hang[0].hanh_dong).toBe('merge');
    expect(hang[0].ngoai_cong, 'phải phân biệt bằng DỮ LIỆU, không chỉ bằng chữ').toBe(true);
    expect(hang[0].nguoi).toContain('ai-do');
    expect(hang[0].chi_tiet).toMatch(/KHÔNG có xác nhận finding nào/);
    expect(kho.docMeta('r1')?.ketQuaCong?.hanhDong).toBe('merge');
  });

  it('PR đóng KHÔNG merge → hành động reject, cờ ngoài cổng bật', async () => {
    themRun('r2', 102);
    await cong.doiSoatCong(async () => ({ trang_thai: 'dong' }));
    const hang = so.docSoCong('r2');
    expect(hang[0].hanh_dong).toBe('reject');
    expect(hang[0].ngoai_cong).toBe(true);
    expect(hang[0].nguoi, 'không mượn tên tài khoản nào trong hệ này (R6.24)').toMatch(/không rõ/);
  });

  it('PR còn MỞ → không ghi hàng nào', async () => {
    themRun('r3', 103);
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'mo' }));
    expect(kq.daGhi).toBe(0);
    expect(so.docSoCong('r3')).toHaveLength(0);
  });

  it('IDEMPOTENT: chạy hai lần liên tiếp không đẻ hàng trùng (R6.23)', async () => {
    themRun('r4', 104);
    await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'x' }));
    const lan2 = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'x' }));
    expect(lan2.daGhi).toBe(0);
    expect(so.docSoCong('r4')).toHaveLength(1);
  });

  it('đọc trạng thái PR LỖI → không ghi hàng nào, không ném ra ngoài (R6.24)', async () => {
    themRun('r5', 105);
    const kq = await cong.doiSoatCong(async () => {
      throw new Error('mạng hỏng');
    });
    expect(kq.loi).toBe(1);
    expect(kq.daGhi).toBe(0);
    expect(so.docSoCong('r5')).toHaveLength(0);
  });

  it('run ĐÃ có hành động cổng thật (người bấm) → đối soát bỏ qua, không đè', async () => {
    themRun('r6', 106);
    so.ghiSoCong({ run_id: 'r6', luc: new Date().toISOString(), hanh_dong: 'merge', nguoi: 'thang.vv' });
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'ai-do' }));
    expect(kq.daGhi).toBe(0);
    const hang = so.docSoCong('r6');
    expect(hang).toHaveLength(1);
    expect(hang[0].nguoi).toBe('thang.vv');
    expect(hang[0].ngoai_cong, 'hàng người bấm KHÔNG được mang cờ ngoài cổng').toBe(false);
  });

  it('người bấm cổng THẬT xen giữa lúc liệt kê và lúc ghi → không đè, không trùng (R6.23)', async () => {
    // Phép kiểm lại ngay trước khi ghi là lớp phòng thủ THỨ HAI: bộ lọc ngoài (NOT EXISTS) chụp
    // danh sách một lần, còn người dùng có thể bấm merge trong CheckMate ngay sau đó. Không có ca
    // này thì lớp trong là guard mồ côi — no-op nó đi mà mọi test vẫn xanh.
    themRun('r8', 108);
    const kq = await cong.doiSoatCong(async () => {
      so.ghiSoCong({ run_id: 'r8', luc: new Date().toISOString(), hanh_dong: 'merge', nguoi: 'thang.vv' });
      return { trang_thai: 'merged', nguoi_merge: 'ai-do' };
    });
    expect(kq.daGhi, 'đối soát không được ghi đè lên hành động người vừa bấm').toBe(0);
    const hang = so.docSoCong('r8');
    expect(hang).toHaveLength(1);
    expect(hang[0].nguoi).toBe('thang.vv');
  });

  it('PR đã qua cổng ở MỘT run → các run anh em cùng PR KHÔNG bị vu là ngoài cổng (vòng một, HIGH)', async () => {
    // PR vá nhiều vòng có nhiều lượt chấm; chỉ lượt được bấm merge mới có hàng sổ. Lọc theo run thì
    // các lượt anh em lọt vào diện đối soát và bị ghi «NGOÀI CỔNG, không ai tick» — vu oan cho một
    // merge ĐÃ qua cổng đàng hoàng.
    themRun('rA', 201);
    themRun('rB', 201);
    so.ghiSoCong({ run_id: 'rA', luc: new Date().toISOString(), hanh_dong: 'merge', nguoi: 'thang.vv' });
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'ai-do' }));
    expect(kq.daGhi, 'PR này đã qua cổng — không hàng ngoài-cổng nào được ghi').toBe(0);
    expect(so.docSoCong('rB')).toHaveLength(0);
  });

  it('trạng thái NGOÀI MIỀN hoặc khuyết → bỏ qua, KHÔNG rơi mềm thành reject (vòng một, HIGH)', async () => {
    themRun('rC', 202);
    for (const tt of ['khong_ro', undefined, null, '']) {
      const kq = await cong.doiSoatCong(async () => ({ trang_thai: tt }) as never);
      expect(kq.daGhi, `trạng thái ${JSON.stringify(tt)} không được ghi hàng`).toBe(0);
    }
    expect(so.docSoCong('rC')).toHaveLength(0);
  });

  it('run KHÔNG có verdict vẫn được đối soát — điều kiện verdict là em tự thêm (vòng một, HIGH)', async () => {
    kho.luuMeta({ id: 'rD', tieuDe: 'chết giữa chừng', skill: 'code', trangThai: 'loi', batDau: new Date().toISOString(), repo: 'chu/repo', pr: { so: 203, headSha: 'c'.repeat(40) } } as never);
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'x' }));
    expect(kq.daGhi).toBe(1);
    expect(so.docSoCong('rD')[0].chi_tiet).toMatch(/không rõ/);
  });

  it('cờ ngoài-cổng sang CẢ bề mặt run, không chỉ sổ (vòng một, HIGH — R6.21)', async () => {
    themRun('rE', 204);
    await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'x' }));
    expect(kho.docMeta('rE')?.ketQuaCong?.ngoaiCong, 'giao diện đọc ketQuaCong — nó phải phân biệt được').toBe(true);
  });

  it('một run hỏng KHÔNG giết trọn lượt: các run còn lại vẫn được ghi (vòng một, HIGH — R6.25)', async () => {
    themRun('rF1', 205);
    kho.luuMeta({ id: 'rF2', tieuDe: 'verdict méo', skill: 'code', trangThai: 'xong', batDau: new Date().toISOString(), repo: 'chu/repo', pr: { so: 205, headSha: 'd'.repeat(40) }, verdict: { findings: [null] } } as never);
    themRun('rF3', 205);
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'x' }));
    expect(kq.daGhi, 'ba run cùng PR, không run nào được phép kéo cả lượt xuống').toBe(3);
  });

  it('chiTietNgoaiCong KHÔNG ném với findings méo (vòng một, MEDIUM)', () => {
    for (const v of [{ findings: [null] }, { findings: 'không phải mảng' }, { findings: [undefined, { severity: 'medium' }] }, {}]) {
      expect(() => cong.chiTietNgoaiCong(v as never)).not.toThrow();
    }
  });

  it('nhiều run cùng một PR → mỗi run một hàng, nhưng chỉ MỘT lời gọi GitHub', async () => {
    themRun('r7a', 107);
    themRun('r7b', 107);
    themRun('r7c', 107);
    let goi = 0;
    const kq = await cong.doiSoatCong(async () => {
      goi++;
      return { trang_thai: 'merged', nguoi_merge: 'x' };
    });
    expect(kq.daGhi).toBe(3);
    expect(goi, 'gom theo PR chứ không theo run — hỏi lại cùng một câu là tự đốt quota').toBe(1);
  });
});
