import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

/**
 * Lưới KIẾN TRÚC — đọc câu `import` THẬT trong mã nguồn rồi đối chiếu ma trận tầng.
 *
 * Vì sao phải là test chứ không phải tài liệu: một luật kiến trúc không kiểm được bằng máy là luật
 * trang trí — nó chỉ đúng cho tới lần đầu có người bận việc. Repo này đã đo được cái giá của việc
 * để luật sống trong văn bản: cùng một luật nằm ở 11 chỗ và lệch nhau lúc nào không hay.
 *
 * `import type` KHÔNG bị chặn ngược một bậc adapter -> app: nó bị xoá lúc biên dịch nên không tạo
 * phụ thuộc lúc chạy. Chặn nó là cưỡng chế một thứ không tồn tại khi chương trình chạy, và cái giá
 * là một đợt tách file không đổi hành vi gì (nợ 6.2 — khi trả xong thì siết ô đó thành CAM).
 */

const GOC = resolve('.');

type Tang = 'nen' | 'engine' | 'adapter' | 'app' | 'delivery';

/**
 * Xếp tầng bằng ĐƯỜNG DẪN. Đơn giản, đọc được, và khi ai đó dời file sang thư mục khác thì lưới
 * đỏ — đúng ý: ở repo này cấu trúc thư mục LÀ kiến trúc.
 */
function xepTang(duongDan: string): Tang | null {
  const p = duongDan.replace(/\\/g, '/');
  if (p.includes('/packages/shared/')) return 'nen';
  if (/\/packages\/harness\/src\/cli\.ts$/.test(p)) return 'delivery';
  if (p.includes('/packages/harness/')) return 'engine';
  if (p.includes('/apps/web/src/kho/')) return 'adapter';
  if (/\/apps\/web\/src\/(server|ui[^/]*)\.ts$/.test(p)) return 'delivery';
  if (p.includes('/apps/web/')) return 'app';
  return null;
}

/** `type` = chỉ được import type; `true` = được; `false` = CẤM. */
const MA_TRAN: Record<Tang, Record<Tang, boolean | 'type'>> = {
  nen: { nen: true, engine: false, adapter: false, app: false, delivery: false },
  engine: { nen: true, engine: true, adapter: false, app: false, delivery: false },
  adapter: { nen: true, engine: false, adapter: true, app: 'type', delivery: false },
  app: { nen: true, engine: false, adapter: true, app: true, delivery: false },
  delivery: { nen: true, engine: true, adapter: true, app: true, delivery: true },
};

interface Canh {
  tuFile: string;
  denFile: string;
  tuTang: Tang;
  denTang: Tang;
  laType: boolean;
}

function dsFileTs(thuMuc: string): string[] {
  const ra: string[] = [];
  const di = (d: string): void => {
    if (!existsSync(d)) return;
    for (const ten of readdirSync(d)) {
      const p = join(d, ten);
      if (statSync(p).isDirectory()) di(p);
      else if (ten.endsWith('.ts') && !ten.endsWith('.d.ts')) ra.push(p);
    }
  };
  di(thuMuc);
  return ra;
}

/** Phân giải import tương đối sang đường dẫn tuyệt đối; `.js` trong nguồn TS trỏ tới `.ts` thật. */
function phanGiai(tuFile: string, dich: string): string {
  return resolve(dirname(tuFile), dich).replace(/\.js$/, '.ts');
}

function docCanh(): Canh[] {
  const files = [...dsFileTs(join(GOC, 'packages')), ...dsFileTs(join(GOC, 'apps'))];
  const ra: Canh[] = [];
  for (const f of files) {
    const tuTang = xepTang(f);
    if (!tuTang) continue;
    const nguon = readFileSync(f, 'utf8');
    // Bắt cả `import ... from '...'` lẫn `import type ... from '...'`; chỉ xét đường dẫn TƯƠNG ĐỐI
    // (import gói ngoài không nói gì về tầng).
    for (const m of nguon.matchAll(/\bimport\s+(type\s+)?[^;]*?from\s+'(\.[^']+)'/g)) {
      const den = phanGiai(f, m[2]);
      const denTang = xepTang(den);
      if (!denTang || denTang === tuTang) continue;
      ra.push({ tuFile: f, denFile: den, tuTang, denTang, laType: Boolean(m[1]) });
    }
  }
  return ra;
}

/** Thông điệp phải nêu ĐỦ chỗ sửa: lưới nói «vi phạm kiến trúc» mà không nói ở đâu là báo sai bản chất. */
function moTa(c: Canh): string {
  const ngan = (p: string) => p.replace(/\\/g, '/').replace(`${GOC.replace(/\\/g, '/')}/`, '');
  return `${ngan(c.tuFile)} [${c.tuTang}] --${c.laType ? 'import type' : 'IMPORT'}--> ${ngan(c.denFile)} [${c.denTang}]`;
}

function viPham(canh: Canh[]): Canh[] {
  return canh.filter((c) => {
    const cho = MA_TRAN[c.tuTang][c.denTang];
    if (cho === true) return false;
    if (cho === 'type') return !c.laType; // type được, value thì CẤM
    return true;
  });
}

describe('lưới kiến trúc — phụ thuộc một chiều, đọc từ import thật', () => {
  it('ma trận khai ĐỦ mọi tầng có file thật — thêm thư mục mới mà quên khai thì ĐỎ', () => {
    // Im lặng bỏ qua một tầng là lưới nói xanh về vùng nó chưa từng nhìn — đúng khuôn «khai dữ liệu
    // không đọc được thành bằng không» mà repo này bắt nhiều lần.
    const tangCoThat = new Set(
      [...dsFileTs(join(GOC, 'packages')), ...dsFileTs(join(GOC, 'apps'))].map(xepTang).filter(Boolean) as Tang[],
    );
    for (const t of tangCoThat) {
      expect(MA_TRAN[t], `tầng ${t} có file thật nhưng chưa có hàng trong ma trận`).toBeDefined();
    }
    expect(tangCoThat.size, 'phải nhìn thấy ít nhất 4 tầng — thấy ít hơn nghĩa là xepTang đang mù').toBeGreaterThanOrEqual(4);
  });

  it('repo hiện tại KHÔNG vi phạm ma trận', () => {
    const xau = viPham(docCanh());
    expect(xau.map(moTa), 'vi phạm chiều phụ thuộc').toEqual([]);
  });

  it('adapter KHÔNG value-import ngược lên tầng ứng dụng (vòng runtime phải đứt)', () => {
    const xau = docCanh().filter((c) => c.tuTang === 'adapter' && c.denTang === 'app' && !c.laType);
    expect(xau.map(moTa), 'hằng/hàm import ngược là phụ thuộc LÚC CHẠY — đây là vòng thật').toEqual([]);
  });

  it('adapter ĐƯỢC type-import ngược lên tầng ứng dụng — vế đối chứng', () => {
    // Thiếu ca này thì một bản vá «cấm hết mọi import ngược» cũng xanh, và nó ép đợt tách file mà
    // change này cố ý hoãn (nợ 6.2).
    const gia: Canh = {
      tuFile: join(GOC, 'apps/web/src/kho/kho-run.ts'),
      denFile: join(GOC, 'apps/web/src/runs.ts'),
      tuTang: 'adapter',
      denTang: 'app',
      laType: true,
    };
    expect(viPham([gia])).toEqual([]);
    expect(viPham([{ ...gia, laType: false }]), 'cùng cạnh đó mà là VALUE thì phải bị bắt').toHaveLength(1);
  });

  it('tầng nền import bất kỳ tầng nào khác — kể cả type — thì ĐỎ', () => {
    const gia: Canh = {
      tuFile: join(GOC, 'packages/shared/src/types.ts'),
      denFile: join(GOC, 'apps/web/src/runs.ts'),
      tuTang: 'nen',
      denTang: 'app',
      laType: true,
    };
    expect(viPham([gia])).toHaveLength(1);
  });

  it('engine import adapter thì ĐỎ — giữ trước khi mất', () => {
    // Hôm nay chưa có cạnh nào. Engine chạy trong sandbox worktree; dính lớp kho là kéo SQLite vào
    // chỗ không có nó.
    const gia: Canh = {
      tuFile: join(GOC, 'packages/harness/src/skill-code.ts'),
      denFile: join(GOC, 'apps/web/src/kho/db.ts'),
      tuTang: 'engine',
      denTang: 'adapter',
      laType: false,
    };
    expect(viPham([gia])).toHaveLength(1);
  });

  it('thông điệp khi đỏ nêu đủ file nguồn, file đích, cặp tầng và loại import', () => {
    const gia: Canh = {
      tuFile: join(GOC, 'apps/web/src/kho/db.ts'),
      denFile: join(GOC, 'apps/web/src/paths.ts'),
      tuTang: 'adapter',
      denTang: 'app',
      laType: false,
    };
    const s = moTa(gia);
    expect(s).toContain('apps/web/src/kho/db.ts');
    expect(s).toContain('apps/web/src/paths.ts');
    expect(s).toContain('[adapter]');
    expect(s).toContain('[app]');
    expect(s).toContain('IMPORT');
  });
});
