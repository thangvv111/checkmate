import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LIBRARY_CAP, LIBRARY_CAP_SUGGESTED, PROBE_DEPTH, clampToRange } from '../apps/web/src/config.js';
import { repoSection } from '../apps/web/src/ui-repo.js';

/**
 * Lưới cho `settings-screen-ccs`.
 *
 * Hai trục thật của màn Cấu hình: nó là chỗ duy nhất người vận hành GÕ BÍ MẬT vào sản phẩm, và là chỗ
 * duy nhất chỉnh được một con số XOÁ ĐƯỢC DỮ LIỆU PROD. Mọi ca ở đây soi theo hai trục ấy.
 */

const UI = readFileSync('apps/web/src/ui.ts', 'utf8');
const LIB = readFileSync('packages/harness/src/probe-library.ts', 'utf8');

describe('MỘT nguồn cho một khoảng giá trị', () => {
  it('T1.1 nhãn và ràng buộc ô nhập đều suy TỪ hằng, không chép tay chữ số', () => {
    // Bốn con số cũ (nhãn «2–12» · ô nhập max=20 · mặc định 10 · gói 6) sinh ra từ việc chép tay hai
    // lần. Sửa `max="20"` thành `max="12"` chỉ chữa triệu chứng.
    expect(UI).toContain('min="${PROBE_DEPTH.min}" max="${PROBE_DEPTH.max}"');
    expect(UI, 'nhãn cũng đọc từ hằng').toContain('(${PROBE_DEPTH.min}–${PROBE_DEPTH.max})');
    expect(UI, 'không còn biên chép tay').not.toContain('max="20"');
  });

  it('T1.2 mặc định nằm TRONG khoảng — cả hai khoảng', () => {
    for (const [ten, k] of [['PROBE_DEPTH', PROBE_DEPTH], ['LIBRARY_CAP', LIBRARY_CAP]] as const) {
      expect(k.mac_dinh, `${ten}: mặc định dưới min`).toBeGreaterThanOrEqual(k.min);
      expect(k.mac_dinh, `${ten}: mặc định trên max`).toBeLessThanOrEqual(k.max);
      expect(k.min).toBeLessThan(k.max);
    }
  });

  it('T1.3 kẹp về biên của CHÍNH khoảng ấy', () => {
    expect(clampToRange(99, PROBE_DEPTH)).toBe(PROBE_DEPTH.max);
    expect(clampToRange(1, PROBE_DEPTH)).toBe(PROBE_DEPTH.min);
    expect(clampToRange(999, LIBRARY_CAP)).toBe(LIBRARY_CAP.max);
    expect(clampToRange(1, LIBRARY_CAP)).toBe(LIBRARY_CAP.min);
    // Vế đối chứng: giá trị hợp lệ đi qua nguyên vẹn.
    expect(clampToRange(7, PROBE_DEPTH)).toBe(7);
  });

  it('T1.4 đầu vào rác → mặc định, KHÔNG kẹp về 0', () => {
    // Kẹp về 0 nghĩa là lượt chấm không thử gì mà vẫn chạy tới verdict.
    for (const xau of ['', 'abc', null, undefined, NaN, {}, []]) {
      const n = clampToRange(xau as never, PROBE_DEPTH);
      expect(Number.isFinite(n), String(xau)).toBe(true);
      expect(n, `${String(xau)} không được ra ngoài khoảng`).toBeGreaterThanOrEqual(PROBE_DEPTH.min);
    }
  });
});

/**
 * Mỗi trường phải kẹp bằng KHOẢNG CỦA CHÍNH NÓ.
 *
 * Kẹp `max_probe` bằng `LIBRARY_CAP` vẫn cho ra một số hợp lệ trông bình thường — chỉ là sai khoảng, nên
 * không gì nổ và không ai thấy. Đột biến 6.5 đã SỐNG SÓT qua bản đầu của lưới này vì ca cũ chỉ kiểm
 * HÀM kẹp, không kiểm ĐƯỜNG ĐỌC dùng khoảng nào.
 */
export function scanRangeMismatch(src: string): string[] {
  const DUNG: Record<string, string> = { max_probe: 'PROBE_DEPTH', tran_thu_vien: 'LIBRARY_CAP' };
  const loi: string[] = [];
  for (const m of String(src ?? '').matchAll(/(\w+):\s*clampToRange\([^,]+,\s*(\w+)\)/g)) {
    const mong = DUNG[m[1]!];
    if (mong && m[2] !== mong) loi.push(`${m[1]} kẹp bằng ${m[2]}, phải là ${mong}`);
  }
  return loi;
}

describe('Mỗi trường kẹp bằng khoảng CỦA CHÍNH NÓ', () => {
  it('mã nguồn hiện tại: không trường nào kẹp nhầm khoảng', () => {
    for (const f of ['apps/web/src/config.ts', 'apps/web/src/server.ts']) {
      expect(scanRangeMismatch(readFileSync(f, 'utf8')), f).toEqual([]);
    }
  });

  it('phép quét BẮT được cái sai — fixture đối kháng', () => {
    expect(scanRangeMismatch('max_probe: clampToRange(a.max_probe, LIBRARY_CAP),')).toHaveLength(1);
    expect(scanRangeMismatch('tran_thu_vien: clampToRange(b.tran_thu_vien, PROBE_DEPTH),')).toHaveLength(1);
  });

  it('cặp đúng thì XANH — fixture đối chứng', () => {
    expect(scanRangeMismatch('max_probe: clampToRange(a.max_probe, PROBE_DEPTH),')).toEqual([]);
    expect(scanRangeMismatch('tran_thu_vien: clampToRange(b.tran_thu_vien, LIBRARY_CAP),')).toEqual([]);
    expect(scanRangeMismatch('gi_do_khac: clampToRange(x, MOT_KHOANG_LA),'), 'trường lạ thì không xét').toEqual([]);
    expect(scanRangeMismatch('')).toEqual([]);
  });
});

describe('Trần thư viện probe — ô chỉnh được TÀI SẢN prod', () => {
  it('T2.1 cấu hình đời cũ thiếu trường ⇒ trần ĐANG ÁP, KHÔNG phải con số gói đề xuất', async () => {
    // Ca giữ cho một lần cập nhật không đào thải probe. Đọc ra 40 ở đây sẽ xoá tới 60 probe ngay lượt
    // nạp kế tiếp — hại một chiều, nâng trần lên lại không lấy lại được.
    expect(LIBRARY_CAP.mac_dinh).toBe(100);
    expect(LIBRARY_CAP.mac_dinh, 'mặc định KHÔNG được là con số gói đề xuất').not.toBe(LIBRARY_CAP_SUGGESTED);
    const { readConfig } = await import('../apps/web/src/config.js');
    expect(typeof readConfig).toBe('function');
  });

  it('T2.2 đọc rồi ghi lại cấu hình đời cũ KHÔNG đổi trần đang áp', () => {
    // `configForReview`/`readConfig` chuẩn hoá trong BỘ NHỚ; change không ghi vào `config.json` lúc khởi
    // động. Một lần deploy không được sửa file cấu hình của người ta, kể cả để «chuẩn hoá».
    const src = readFileSync('apps/web/src/config.ts', 'utf8');
    expect(src).toContain('tran_thu_vien: clampToRange(a.tran_thu_vien ?? LIBRARY_CAP.mac_dinh, LIBRARY_CAP)');
    expect(readFileSync('apps/web/src/server.ts', 'utf8'), 'không tự ghi cấu hình lúc khởi động').not.toMatch(
      /app\.listen[\s\S]{0,1200}writeConfig\(/,
    );
  });

  it('T2.3 agentEnv phát CHECKER_LIB_TRAN', () => {
    const src = readFileSync('apps/web/src/config.ts', 'utf8');
    expect(src).toContain('CHECKER_LIB_TRAN: String(c.agent.tran_thu_vien');
  });

  it('T2.4 engine kẹp đúng biên LIBRARY_CAP, và env rác → mặc định chứ không đoán', () => {
    // Engine không import được từ lớp web (ranh giới gói), nên hai chỗ khớp bằng LƯỚI chứ không bằng
    // lời hứa. Env rỗng cho Number('')=0 rồi kẹp về min → đào thải hàng loạt; 'abc' cho NaN làm
    // `while (len > NaN)` luôn false → trần vô hiệu. Cả hai đều âm thầm.
    expect(LIB, 'biên dưới lệch').toContain(`Math.max(${LIBRARY_CAP.min},`);
    expect(LIB, 'biên trên lệch').toContain(`Math.min(${LIBRARY_CAP.max},`);
    expect(LIB, 'mặc định lệch').toContain(`return ${LIBRARY_CAP.mac_dinh};`);
    expect(LIB, 'env phải là số nguyên sạch mới được nhận').toContain("test(tho)");
  });

  it('T3.1 ô trần nói CẢ HAI vế: con số gói đề xuất, và cái mất khi hạ', () => {
    expect(UI, 'thiếu con số gói đề xuất').toContain('${LIBRARY_CAP_SUGGESTED}');
    expect(UI, 'thiếu vế «hạ trần thì mất gì»').toContain('ĐÀO THẢI probe đang có');
  });
});

describe('Giao diện theo gói', () => {
  it('T3.2 slider độ sâu, có chỗ hiện số', () => {
    expect(UI).toContain('type="range"');
    expect(UI).toContain('<output id="ra-max-probe"');
  });

  it('slider tắt script vẫn gửi được giá trị — mất tiện nghi, không mất chức năng', () => {
    // `<input type=range name=max_probe>` gửi giá trị qua form như mọi input; script chỉ cập nhật con
    // số hiển thị.
    expect(UI).toContain('name="max_probe" type="range"');
  });
});

// ── Card repo ─────────────────────────────────────────────────────────────────

const repo = (p: Record<string, unknown> = {}) =>
  ({
    github: 'o/r',
    base_branch: 'main',
    local_path: 'repos/o-r',
    co_token: true,
    token_rieng: true,
    co_gh: true,
    truc: false,
    token_che: 'ghp_ab****yz',
    lan_cham_cuoi: '2026-09-05T01:22:00.000Z',
    ...p,
  }) as never;

const khoi = (repos: unknown[], dangChon = 'o/r') =>
  repoSection({ repos, dangChon, hasToken: true, moKhoa: true } as never);

describe('Card repo', () => {
  it('T3.3 card có owner/repo, nhánh đích, token che, lần chấm cuối', () => {
    const h = khoi([repo()]);
    expect(h).toContain('repo-grid');
    expect(h).toContain('repo-card');
    expect(h).toContain('o/r');
    expect(h).toContain('main');
    expect(h, 'token che phải hiện').toContain('ghp_ab****yz');
    expect(h, 'lần chấm cuối phải hiện').toContain('2026-09-05 01:22');
  });

  it('T3.4 repo chưa chấm lần nào → KHÔNG bịa ngày', () => {
    const h = khoi([repo({ lan_cham_cuoi: undefined })]);
    expect(h).toContain('chưa chấm lần nào');
    expect(h).not.toContain('1970');
    expect(h).not.toContain('Invalid');
  });

  it('T3.5 repo thiếu chìa riêng → BANNER, không phải một dòng chữ nhỏ', () => {
    const h = khoi([repo({ co_token: false, token_rieng: false, co_gh: false, token_che: '' })]);
    expect(h, 'banner có viền semantic').toContain('border-left:3px solid var(--fail)');
    expect(h).toContain('Thiếu chìa riêng');
  });

  it('T4.3 đầu vào KHUYẾT: repos rỗng · thiếu nhánh · thiếu token → không ném', () => {
    expect(() => khoi([])).not.toThrow();
    expect(() => khoi([repo({ base_branch: undefined, token_che: undefined })])).not.toThrow();
  });

  it('T_bimat ⛔C3: card KHÔNG tự cắt chuỗi token — dùng bản che dùng chung', () => {
    // Bản che thứ hai luôn là bản lệch. Và che trần theo độ dài (`ghp_****`) thì hai repo dùng nhầm chìa
    // của nhau nhìn giống hệt — người vận hành không phát hiện được bằng mắt, mà mắt là công cụ duy nhất
    // họ có ở màn này.
    const src = readFileSync('apps/web/src/ui-repo.ts', 'utf8');
    expect(src, 'card không được tự cắt token').not.toMatch(/token[^\n]{0,40}\.slice\(/i);
    const sv = readFileSync('apps/web/src/server.ts', 'utf8');
    expect(sv, 'bản che đi qua hàm dùng chung').toContain('token_che: readOwnToken(r.github) ? maskToken2(');
  });

  it('T_cong: không NÚT nào ở khối Repo là nút cổng', () => {
    // Quét ĐÚNG thẻ `<button>`, không quét cả khối: từ «Merge» còn xuất hiện trong văn GIẢI THÍCH về quyền
    // của token («thêm quyền ghi nếu dùng cổng Merge»), và cấm nó ở đó là cấm nhầm chỗ — lưới báo oan thì
    // người ta tắt, chứ không sửa code.
    const nut = [...khoi([repo()]).matchAll(/<button[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(nut.length, 'phải có nút để ca này có nghĩa').toBeGreaterThan(0);
    for (const b of nut) expect(b, `nút cổng lọt vào khối Repo: ${b.slice(0, 80)}`).not.toMatch(/merge|reject/i);
  });
});

describe('Màu ở màn Cấu hình', () => {
  it('T4.1 «đã ngừng» KHÔNG dùng màu FAIL — ngừng không phải một thất bại', () => {
    const src = readFileSync('apps/web/src/ui-provider.ts', 'utf8');
    const dong = src.split('\n').filter((d) => d.includes('đã ngừng'));
    expect(dong.length).toBeGreaterThan(0);
    for (const d of dong) expect(d, `«đã ngừng» còn mang màu FAIL: ${d.trim().slice(0, 90)}`).not.toMatch(/var\(--fail/);
  });

  it('T4.2 VẾ ĐỐI CHỨNG: repo thiếu chìa VẪN dùng semantic — đây là hỏng thật', () => {
    // Thiếu vế này thì T4.1 xanh cả khi ai đó xoá sạch màu semantic khỏi màn Cấu hình.
    expect(khoi([repo({ co_token: false, token_rieng: false, co_gh: false })])).toContain('var(--fail)');
  });
});
