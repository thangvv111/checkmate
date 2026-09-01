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

  it('gọi THẲNG capNhatCongRun ở demo cũng bị từ chối — gác ở CỬA GHI, không chỉ ở một đường (vòng chín)', () => {
    // doiSoatCong đã chặn demo, nhưng cửa ghi gọi trực tiếp thì hở: bề mặt run khai một hành động
    // cổng trong khi sổ chỉ-ghi-thêm KHÔNG có hàng nào — đúng thứ cuốn sổ sinh ra để chống.
    kho.capNhatCongRun('rDemo', 'merge');
    expect(kho.docMeta('rDemo')?.ketQuaCong).toBeUndefined();
    expect(so.docSoCong('rDemo')).toHaveLength(0);
  });
});
