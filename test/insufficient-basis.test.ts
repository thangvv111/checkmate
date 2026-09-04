import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunMeta } from '../apps/web/src/runs.js';
import type { ProbeResult } from '../packages/shared/src/types.js';

// ⛔ GỐC DỮ LIỆU RIÊNG phải đặt TRƯỚC khi nạp bất kỳ module nào chạm tầng kho — và vì import TĨNH của
// ESM chạy TRƯỚC mọi dòng thân module, mọi thứ dưới đây phải nạp ĐỘNG.
//
// Án lệ của chính file này (05/09): bản đầu import tĩnh `ui-history.js` và `runs.js`, hai cái ấy kéo
// theo `store/db.js`, mà `DB_PATH` ở đó là hằng CẤP MODULE. Biến môi trường đặt sau đó không còn tác
// dụng, nên cả khối di trú chạy thẳng trên SỔ THẬT của máy dev: năm hàng giả lọt vào sổ. Nó còn làm
// một đột biến SỐNG SÓT oan — bỏ dòng cột ở `napCotThieu` mà ca vẫn xanh, vì cột đã có sẵn trong sổ thật.
const goc = mkdtempSync(join(tmpdir(), 'checkmate-ib-'));
mkdirSync(join(goc, 'web-runs'), { recursive: true });
process.env.CHECKMATE_GOC = goc;
process.env.CHECKMATE_DB = join(goc, 'web-runs', 'checkmate.db');

const { classifyInsufficientBasis, hasNoBaseline } = await import('../packages/harness/src/verdict.js');
const { retryNoticeNoEvidence } = await import('../packages/harness/src/skill-code.js');
const { filterRuns, historyPage } = await import('../apps/web/src/ui-history.js');
const { pickInsufficientBasis } = await import('../apps/web/src/runs.js');
const { DB_PATH } = await import('../apps/web/src/store/db.js');

/**
 * Lưới cho `insufficient-basis-verdict-state`.
 *
 * Bệnh sinh ra change này: kết cục quan trọng nhất mà engine trả về — «không đủ cơ sở», tức nguyên tắc
 * 03 của sản phẩm — chỉ tồn tại ở một phép so chuỗi tiếng Việt ngay tại đường render. Sửa lời văn là
 * mất tính năng, và không lưới nào đỏ.
 *
 * Nên mọi ca ở đây có một vế ĐỐI CHỨNG ở phía lỗi hạ tầng. Không có vế ấy thì một phép nhận diện quá
 * rộng vẫn xanh trên mọi ca đối kháng rồi gán nhãn sai cho mọi lượt lỗi.
 */

// Ứng viên tối thiểu — đúng hình dạng `hasBasis` đọc.
const uv = (trangThai: string) => ({ trangThai, probe: { id: 'p1' }, br: { message: 'x' } }) as never;
const KET_LUAN_DUOC = uv('pass');
const KHONG_NOI_GI = uv('ngoai_pham_vi');
const kq = (n: number): ProbeResult[] => Array.from({ length: n }, () => ({}) as ProbeResult);

describe('classifyInsufficientBasis — hàm thuần', () => {
  it('T1.1 không probe nào nói được điều gì, nhánh gốc CÓ chạy → khong_probe_nao_toi_noi', () => {
    expect(classifyInsufficientBasis(kq(3), [KHONG_NOI_GI, KHONG_NOI_GI])).toBe('khong_probe_nao_toi_noi');
  });

  it('T1.2 nhánh gốc chạy được 0 probe → goc_khong_doi_chung', () => {
    expect(classifyInsufficientBasis(kq(0), [KHONG_NOI_GI])).toBe('goc_khong_doi_chung');
  });

  it('T1.3 `undefined` và mảng rỗng là hai cách nói của MỘT sự thật', () => {
    expect(classifyInsufficientBasis(undefined, [KHONG_NOI_GI])).toBe(classifyInsufficientBasis(kq(0), [KHONG_NOI_GI]));
  });

  it('T1.4 có ít nhất một ứng viên kết luận được → KHÔNG trả loại nào', () => {
    // Vế đối chứng của cả hàm: lượt chấm này đủ cơ sở, không phải việc của nó.
    expect(classifyInsufficientBasis(kq(0), [KHONG_NOI_GI, KET_LUAN_DUOC])).toBeUndefined();
    expect(classifyInsufficientBasis(kq(3), [KET_LUAN_DUOC])).toBeUndefined();
  });

  it('T3.1 đầu vào KHUYẾT nghiêng về phía VẪN LÀ THẤT BẠI, không phải «không rõ nên bỏ qua»', () => {
    // Chỗ dễ sai nhất của hàm: bản năng viết hàm phân loại là trả `undefined` khi không đủ dữ liệu, mà
    // ở đây `undefined` nghĩa là lượt chấm KHÔNG được đánh dấu thất bại — tức một lượt hỏng đi qua như
    // một lượt bình thường.
    for (const xau of [null, undefined, [], [null], [{}], 'không phải mảng']) {
      const r = classifyInsufficientBasis(kq(2), xau as never);
      expect(r, `đầu vào ${JSON.stringify(xau)} phải vẫn ra một loại`).toBeDefined();
    }
    expect(classifyInsufficientBasis(null, [KHONG_NOI_GI])).toBe('goc_khong_doi_chung');
  });

  it('T3.2 biên ngưỡng: đúng một ứng viên kết luận được là ranh giới', () => {
    expect(classifyInsufficientBasis(kq(1), [])).toBeDefined();
    expect(classifyInsufficientBasis(kq(1), [KET_LUAN_DUOC])).toBeUndefined();
  });
});

describe('T1.5 chống CỬA SONG SINH — một phép kiểm, hai chỗ dùng', () => {
  it('`retryNoticeNoEvidence` và `classifyInsufficientBasis` LUÔN cùng quyết định về đối chứng', () => {
    // Khuôn đã bị bắt chín lần trong repo: hai cửa cùng vai viết bằng hai biểu thức riêng sẽ lệch nhau,
    // và lệch trong im lặng. Bản cũ của `retryNoticeNoEvidence` viết `baseKq === undefined || …length === 0`
    // — nó NÉM khi nhận `null`, còn `hasNoBaseline` thì không. `null` là chỗ hai bản lệch thật, nên nó
    // phải nằm trong bộ đầu vào; thiếu nó thì ca này xanh trên cả bản đã tách lẫn bản viết lại.
    for (const baseKq of [undefined, null, kq(0), kq(1), kq(5)]) {
      const noiKhongDoiChung = retryNoticeNoEvidence(baseKq as never, 'vì sao').includes('LƯU Ý QUAN TRỌNG');
      expect(noiKhongDoiChung, `lệch ở baseKq=${JSON.stringify(baseKq)}`).toBe(hasNoBaseline(baseKq));
    }
  });

  it('hasNoBaseline: cặp fixture hai chiều', () => {
    expect(hasNoBaseline(kq(1))).toBe(false);
    expect(hasNoBaseline(kq(0))).toBe(true);
    expect(hasNoBaseline(undefined)).toBe(true);
    expect(hasNoBaseline(null)).toBe(true);
  });
});

describe('T2.9/T2.10 engine → sổ → RunMeta', () => {
  it('sự kiện có kiểu được phát NGAY TRƯỚC cú ném, và đường ném giữ nguyên', async () => {
    // Đường ném là đường fail-closed (⛔C2). Sự kiện là DẤU VẾT, không phải đường thoát — bỏ cú ném
    // đi thì nhánh phía sau chạy tiếp như thể có kết quả.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
    const iPhat = src.indexOf("phat({ type: 'khong_du_co_so'");
    const iNem = src.indexOf('Không đủ cơ sở kết luận:');
    expect(iPhat, 'phải phát sự kiện có kiểu').toBeGreaterThan(0);
    expect(iNem, 'cú ném phải còn').toBeGreaterThan(0);
    expect(iPhat, 'phát TRƯỚC khi ném').toBeLessThan(iNem);
  });

  it('`pickInsufficientBasis` nhặt đúng từ sổ, và không nhặt nhầm', () => {
    const ct = { loai: 'goc_khong_doi_chung' as const, so_probe: 4, ly_do: 'x' };
    expect(
      pickInsufficientBasis([
        { t: 0, e: { type: 'log', msg: 'a' } },
        { t: 1, e: { type: 'khong_du_co_so', chi_tiet: ct } },
      ]),
    ).toEqual(ct);
    // Vế đối chứng: sổ chỉ có lỗi thường thì KHÔNG nhặt được gì, kể cả khi câu lỗi chứa đúng cụm từ cũ.
    expect(pickInsufficientBasis([{ t: 0, e: { type: 'error', msg: 'Không đủ cơ sở kết luận: 6 probe' } }])).toBeUndefined();
    expect(pickInsufficientBasis([])).toBeUndefined();
    expect(pickInsufficientBasis(null as never)).toBeUndefined();
  });
});

// ── Bề mặt LỊCH SỬ ────────────────────────────────────────────────────────────

const run = (p: Partial<RunMeta>): RunMeta =>
  ({ id: 'r1', tieuDe: 'PR #1', skill: 'code', trangThai: 'xong', batDau: '2026-09-05T01:00:00.000Z', ...p }) as RunMeta;

const THIEU_CO_SO = run({
  id: 'thieu',
  trangThai: 'loi',
  khongDuCoSo: { loai: 'khong_probe_nao_toi_noi', so_probe: 6, ly_do: 'p1 (ngoai_pham_vi): Cannot find module' },
});
const LOI_HA_TANG = run({ id: 'hatang', trangThai: 'loi' });

describe('T3.4 lịch sử — hai bộ lọc KHÔNG nuốt nhau', () => {
  const ds = [THIEU_CO_SO, LOI_HA_TANG];

  it('lọc «không đủ cơ sở» ra đúng lượt không đủ cơ sở', () => {
    expect(filterRuns(ds, { verdict: 'khong_du_co_so', trang: 1 }).map((r) => r.id)).toEqual(['thieu']);
  });

  it('lọc «lỗi» KHÔNG kéo theo lượt không đủ cơ sở', () => {
    // Vế đối chứng làm cho ca trên có nghĩa: trộn hai rổ thì con số nói lên chỗ yếu của engine bị con
    // số nói lên chỗ yếu của hạ tầng che mất.
    expect(filterRuns(ds, { verdict: 'loi', trang: 1 }).map((r) => r.id)).toEqual(['hatang']);
  });

  it('không lọc thì cả hai đều còn', () => {
    expect(filterRuns(ds, { trang: 1 })).toHaveLength(2);
  });

  it('T3.4b nhãn ở bề mặt đọc phân biệt được hai lượt', () => {
    const html = historyPage(ds, { trang: 1 }, []);
    expect(html, 'lượt không đủ cơ sở có nhãn riêng').toContain('Không đủ cơ sở');
    expect(html, 'lượt lỗi hạ tầng vẫn mang nhãn lỗi').toContain('>lỗi<');
  });

  it('option lọc có mặt ở form, và tách khỏi «lỗi hạ tầng»', () => {
    const html = historyPage(ds, { trang: 1 }, []);
    expect(html).toContain('value="khong_du_co_so"');
    expect(html).toContain('lỗi hạ tầng');
  });
});

describe('T3.5 không bề mặt đọc nào còn so khớp nội dung thông điệp lỗi', () => {
  /**
   * Quét file giao diện tìm chỗ nhận diện kết cục này bằng nội dung thông điệp.
   *
   * Cặp fixture (tầng 3 của `test-grid-integrity`) ở hai ca dưới: bản sai ĐỎ, bản đúng XANH. Không có
   * cặp ấy thì một phép quét quá rộng vẫn bắt được bản sai, rồi báo động giả trên code đang đúng.
   */
  const scanErrorTextMatching = (src: string): string[] =>
    src
      .split(String.fromCharCode(10))
      .map((d) => d.trim())
      .filter((d) => !d.startsWith('//') && !d.startsWith('*'))
      .filter((d) => d.includes('không đủ cơ sở') && (d.includes('.test(') || d.includes('.includes(') || d.includes('.match(')));

  it('fixture ĐỐI CHỨNG — mã nguồn giao diện hiện tại sạch', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const loi: string[] = [];
    for (const t of readdirSync('apps/web/src').filter((x) => /^ui.*\.ts$/.test(x))) {
      for (const d of scanErrorTextMatching(readFileSync(join('apps/web/src', t), 'utf8'))) loi.push(`${t}: ${d}`);
    }
    expect(loi).toEqual([]);
  });

  it('fixture ĐỐI KHÁNG — phép quét bắt được đúng dòng bệnh cũ', () => {
    const sai = 'const khongCoSo = !v && loiCuoi.some((m) => /không đủ cơ sở/i.test(m));';
    expect(scanErrorTextMatching(sai)).toHaveLength(1);
    // Và KHÔNG bắt câu bình luận nhắc tới nó — vế làm cho ca đối chứng ở trên có nghĩa.
    expect(scanErrorTextMatching('// bản trước so chuỗi «không đủ cơ sở» ở đường render')).toEqual([]);
  });
});

describe('T_failclosed · T_cong — lượt không đủ cơ sở vẫn là THẤT BẠI', () => {
  it('trạng thái vẫn là lỗi, không thành một kết cục thứ ba', () => {
    expect(THIEU_CO_SO.trangThai).toBe('loi');
    expect(THIEU_CO_SO.verdict).toBeUndefined();
  });

  it('đường ghi sổ cái đi qua `meta.verdict` — lượt không verdict không có hàng nào', async () => {
    // D5: hôm nay điều này đúng nhờ một điều kiện chứ chưa nhờ một luật. Ca này biến một tính chất
    // tình cờ thành một tính chất được canh.
    const { entryFromMeta } = await import('../apps/web/src/ledger.js');
    expect(entryFromMeta(THIEU_CO_SO) ?? undefined, 'không verdict thì không có hàng sổ cái').toBeUndefined();
    expect(entryFromMeta(LOI_HA_TANG) ?? undefined).toBeUndefined();
  });

  it('tự-trả-về-dev chỉ kích hoạt khi verdict FAIL — lượt không đủ cơ sở KHÔNG kích hoạt', async () => {
    // Tự đóng pull request vì engine không kết luận được là đổ lỗi của máy lên đầu người viết.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('apps/web/src/server.ts', 'utf8') + readFileSync('apps/web/src/runs.ts', 'utf8');
    expect(src, 'đường tự trả về phải neo vào verdict, không neo vào trangThai').not.toMatch(
      /truc_tra_ve[\s\S]{0,200}khongDuCoSo/,
    );
  });
});

// ── Di trú + vòng ghi–đọc SQLite ──────────────────────────────────────────────

describe('di trú hàng đời cũ + vòng ghi–đọc', () => {
  it('⛔ GÁC: lưới phải chạy trên sổ RIÊNG, không phải sổ thật của máy', () => {
    // Ca này đứng đầu và tồn tại vì bản đầu của file đã ghi năm hàng giả vào `web-runs/checkmate.db`
    // của máy dev. Không có gác này thì lần sau nó lại xảy ra trong im lặng — và còn làm một đột biến
    // sống sót oan, vì cột cần kiểm đã có sẵn trong sổ thật.
    expect(DB_PATH.startsWith(goc), `DB_PATH=${DB_PATH} phải nằm trong ${goc}`).toBe(true);
  });

  it('T1.6/T1.7/T1.8 suy loại từ sổ sự kiện — ba chiều', async () => {
    const { inferLegacyInsufficientBasis } = await import('../apps/web/src/store/migrate.js');
    const loi = (msg: string) => ({ t: 1, e: { type: 'error' as const, msg } });
    const log = (msg: string) => ({ t: 0, e: { type: 'log' as const, msg } });
    const CAU = 'Không đủ cơ sở kết luận: 6 probe đều KHÔNG chứng minh được gì';

    expect(inferLegacyInsufficientBasis([loi(CAU)])).toMatchObject({ loai: 'khong_probe_nao_toi_noi', so_probe: 6 });
    expect(
      inferLegacyInsufficientBasis([log('Cảnh báo: nhánh gốc KHÔNG chạy được probe (x)'), loi(CAU)]),
    ).toMatchObject({ loai: 'goc_khong_doi_chung' });
    // Vế ĐỐI CHỨNG — lỗi hạ tầng không được khớp. Thiếu vế này thì một phép so quá rộng gán nhãn sai
    // cho mọi lượt lỗi mà vẫn xanh trên hai ca trên.
    for (const m of ['Run dừng giữa chừng, không có verdict (mã thoát 4)', 'credit balance is too low', 'ETIMEDOUT']) {
      expect(inferLegacyInsufficientBasis([loi(m)]), m).toBeUndefined();
    }
    expect(inferLegacyInsufficientBasis([])).toBeUndefined();
  });

  it('T2.1/T2.4 vòng ghi–đọc: trường sống sót, và lượt lỗi hạ tầng KHÔNG mang trường', async () => {
    const { saveMeta, readMeta } = await import('../apps/web/src/store/run-store.js');
    saveMeta(THIEU_CO_SO);
    saveMeta(LOI_HA_TANG);
    expect(readMeta('thieu')?.khongDuCoSo).toEqual(THIEU_CO_SO.khongDuCoSo);
    expect(readMeta('hatang')?.khongDuCoSo).toBeUndefined();
  });

  it('T2.3 JSON rách trong cột → đọc ra rỗng, KHÔNG ném, lượt vẫn là lỗi', async () => {
    const { openDb } = await import('../apps/web/src/store/db.js');
    const { readMeta } = await import('../apps/web/src/store/run-store.js');
    openDb().prepare('UPDATE run SET khong_du_co_so = ? WHERE id = ?').run('{ rach', 'thieu');
    expect(() => readMeta('thieu')).not.toThrow();
    expect(readMeta('thieu')?.khongDuCoSo).toBeUndefined();
    expect(readMeta('thieu')?.trangThai).toBe('loi');
  });

  it('T2.5/T2.6/T2.7/T2.8 di trú: đúng hàng, idempotent, không đụng hàng khác, không xoá gì', async () => {
    const { openDb } = await import('../apps/web/src/store/db.js');
    const { saveMeta, saveEvents, readMeta, readEvents } = await import('../apps/web/src/store/run-store.js');
    const d = openDb();

    saveMeta(run({ id: 'cu', trangThai: 'loi' }));
    saveEvents('cu', [{ t: 1, e: { type: 'error', msg: 'Không đủ cơ sở kết luận: 9 probe đều KHÔNG chứng minh được gì' } }]);
    saveMeta(run({ id: 'cu-hatang', trangThai: 'loi' }));
    saveEvents('cu-hatang', [{ t: 1, e: { type: 'error', msg: 'Run dừng giữa chừng, không có verdict (mã thoát 3)' } }]);
    saveMeta(run({ id: 'dang-chay', trangThai: 'dang_chay' }));
    d.prepare('DELETE FROM da_di_tru').run();

    const { migrateAll } = await import('../apps/web/src/store/migrate.js');
    migrateAll();

    expect(readMeta('cu')?.khongDuCoSo).toMatchObject({ loai: 'khong_probe_nao_toi_noi', so_probe: 9 });
    expect(readMeta('cu-hatang')?.khongDuCoSo, 'lỗi hạ tầng không bị gán nhầm').toBeUndefined();
    expect(readMeta('dang-chay')?.khongDuCoSo, 'hàng đang chạy không bị chạm').toBeUndefined();
    expect(readEvents('cu')[0]?.e, 'câu lỗi cũ ở lại nguyên — nó là bản ghi lịch sử').toMatchObject({ type: 'error' });

    // KHÔNG GHI ĐÈ hàng đã có trường: đặt một giá trị KHÁC hẳn rồi chạy lại — nó phải còn nguyên.
    // Chạy lại trên cùng sổ sự kiện cho ra cùng giá trị, nên ca so-bảng-không-đổi ở dưới MỘT MÌNH không
    // phân biệt được «bỏ qua hàng đã có» với «ghi đè bằng chính giá trị đó».
    d.prepare('UPDATE run SET khong_du_co_so = ? WHERE id = ?').run(
      JSON.stringify({ loai: 'goc_khong_doi_chung', so_probe: 99, ly_do: 'nguoi van hanh sua tay' }),
      'cu',
    );
    d.prepare('DELETE FROM da_di_tru').run();
    migrateAll();
    expect(readMeta('cu')?.khongDuCoSo).toMatchObject({ so_probe: 99 });

    // Idempotent: xoá dấu bước rồi chạy lại, toàn bộ bảng không đổi.
    const truoc = JSON.stringify(d.prepare('SELECT * FROM run ORDER BY id').all());
    d.prepare('DELETE FROM da_di_tru').run();
    migrateAll();
    expect(JSON.stringify(d.prepare('SELECT * FROM run ORDER BY id').all())).toBe(truoc);
  });
});
