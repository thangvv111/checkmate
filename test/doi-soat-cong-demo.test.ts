import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * R6.12 — chế độ demo KHÔNG được thao tác cổng.
 *
 * Đối soát tuy chỉ GHI LẠI việc đã xảy ra, nhưng hàng nó ghi nằm trong đúng cuốn sổ kiểm toán ấy, và
 * sổ chỉ ghi thêm nên một hàng demo là một hàng sai VĨNH VIỄN. File riêng vì `MODE` chốt lúc nạp
 * module — một tiến trình không mang được hai chế độ.
 */

const goc = mkdtempSync(join(tmpdir(), 'checkmate-demo-'));
process.env.CHECKMATE_GOC = goc;
delete process.env.CHECKMATE_MODE; // mặc định = demo

const kho = await import('../apps/web/src/kho/kho-run.js');
const so = await import('../apps/web/src/kho/kho-socai.js');
const cong = await import('../apps/web/src/cong.js');
const db = await import('../apps/web/src/kho/db.js');

afterAll(() => {
  db.dongDb();
  rmSync(goc, { recursive: true, force: true });
});

describe('đối soát ở chế độ demo', () => {
  it('KHÔNG ghi hàng nào vào sổ cổng, dù PR đã merge ngoài cổng', async () => {
    kho.luuMeta({
      id: 'rDemo',
      tieuDe: 'demo',
      skill: 'code',
      trangThai: 'xong',
      batDau: new Date().toISOString(),
      repo: 'chu/repo',
      pr: { so: 900, headSha: 'a'.repeat(40) },
      verdict: { result: 'PASS', findings: [] },
    } as never);
    const kq = await cong.doiSoatCong(async () => ({ trang_thai: 'merged', nguoi_merge: 'ai-do' }));
    expect(kq.daGhi).toBe(0);
    expect(so.docSoCong('rDemo')).toHaveLength(0);
    expect(kho.docMeta('rDemo')?.ketQuaCong, 'bề mặt run cũng không được đổi').toBeUndefined();
  });

  it('chế độ demo: luuMeta cũng KHÔNG dán được dấu merge lên bề mặt (R6.26)', () => {
    // Vòng mười hai bắt đúng chỗ này: gác demo nằm trong capNhatCongRun, còn luuMeta không có gác
    // nào nên vẫn ghi thẳng ketQuaCong 'merge' lên bề mặt. Nay không còn cột để ghi, ở mọi chế độ.
    kho.luuMeta({
      ...kho.docMeta('rDemo')!,
      ketQuaCong: { hanhDong: 'merge', luc: new Date().toISOString(), nguoi: 'ke-gia-mao', chiTiet: 'bịa', ngoaiCong: true },
    } as never);
    expect(kho.docMeta('rDemo')?.ketQuaCong).toBeUndefined();
    expect(so.docSoCong('rDemo')).toHaveLength(0);
  });
});
