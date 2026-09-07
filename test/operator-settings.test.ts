import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROBE_DEPTH, clampToRange } from '../apps/web/src/config.js';
import { repoSection } from '../apps/web/src/ui-repo.js';

/**
 * Lưới cho `settings-screen-ccs`.
 *
 * Hai trục thật của màn Cấu hình: nó là chỗ duy nhất người vận hành GÕ BÍ MẬT vào sản phẩm, và là chỗ
 * duy nhất chỉnh được một con số XOÁ ĐƯỢC DỮ LIỆU PROD. Mọi ca ở đây soi theo hai trục ấy.
 */

const UI = readFileSync('apps/web/src/ui.ts', 'utf8');

describe('MỘT nguồn cho một khoảng giá trị', () => {
  it('T1.1 nhãn và ràng buộc ô nhập đều suy TỪ hằng, không chép tay chữ số', () => {
    // Bốn con số cũ (nhãn «2–12» · ô nhập max=20 · mặc định 10 · gói 6) sinh ra từ việc chép tay hai
    // lần. Sửa `max="20"` thành `max="12"` chỉ chữa triệu chứng.
    expect(UI).toContain('min="${PROBE_DEPTH.min}" max="${PROBE_DEPTH.max}"');
    expect(UI, 'nhãn cũng đọc từ hằng').toContain('(${PROBE_DEPTH.min}–${PROBE_DEPTH.max})');
    expect(UI, 'không còn biên chép tay').not.toContain('max="20"');
  });

  it('T1.2 mặc định nằm TRONG khoảng — cả hai khoảng', () => {
    for (const [ten, k] of [['PROBE_DEPTH', PROBE_DEPTH]] as const) {
      expect(k.mac_dinh, `${ten}: mặc định dưới min`).toBeGreaterThanOrEqual(k.min);
      expect(k.mac_dinh, `${ten}: mặc định trên max`).toBeLessThanOrEqual(k.max);
      expect(k.min).toBeLessThan(k.max);
    }
  });

  it('T1.3 kẹp về biên của CHÍNH khoảng ấy', () => {
    // Trên biên bằng `max + 1`, không dùng số cứng: dải PROBE_DEPTH nới 12 → 100 (06/09) làm số 99 cũ rơi
    // vào TRONG dải và ca này đỏ oan — một ca «kẹp về biên» phải theo biên, không theo một con số nhớ.
    expect(clampToRange(PROBE_DEPTH.max + 1, PROBE_DEPTH)).toBe(PROBE_DEPTH.max);
    expect(clampToRange(1, PROBE_DEPTH)).toBe(PROBE_DEPTH.min);
    expect(clampToRange(999, PROBE_DEPTH)).toBe(PROBE_DEPTH.max);
    expect(clampToRange(1, PROBE_DEPTH)).toBe(PROBE_DEPTH.min);
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
 * Kẹp `max_probe` bằng một khoảng KHÁC vẫn cho ra một số hợp lệ trông bình thường — chỉ là sai khoảng, nên
 * không gì nổ và không ai thấy. Đột biến 6.5 đã SỐNG SÓT qua bản đầu của lưới này vì ca cũ chỉ kiểm
 * HÀM kẹp, không kiểm ĐƯỜNG ĐỌC dùng khoảng nào.
 */
export function scanRangeMismatch(src: string): string[] {
  // `tran_thu_vien` đã gỡ cùng thư viện probe; bảng còn một trường, và luật vẫn y nguyên.
  const DUNG: Record<string, string> = { max_probe: 'PROBE_DEPTH' };
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
    expect(scanRangeMismatch('max_probe: clampToRange(a.max_probe, MOT_KHOANG_KHAC),')).toHaveLength(1);
    expect(scanRangeMismatch('max_probe: clampToRange(b.max_probe, LIBRARY_CAP),'), 'kể cả một khoảng ĐÃ GỠ').toHaveLength(1);
  });

  it('cặp đúng thì XANH — fixture đối chứng', () => {
    expect(scanRangeMismatch('max_probe: clampToRange(a.max_probe, PROBE_DEPTH),')).toEqual([]);
    expect(scanRangeMismatch('gi_do_khac: clampToRange(x, MOT_KHOANG_LA),'), 'trường lạ thì không xét').toEqual([]);
    expect(scanRangeMismatch('')).toEqual([]);
  });
});

// ⛔ Khối «Trần thư viện probe» (T2.1–T2.4, T3.1 — 5 ca) ĐÃ GỠ cùng thư viện probe
// (change probe-handover-replaces-library). Không còn kho thì không có trần để đặt, và không có ô
// cấu hình để kiểm. Luật «mỗi trường kẹp bằng khoảng CỦA CHÍNH NÓ» ở khối trên thì VẪN SỐNG — nó chỉ
// mất ví dụ thứ hai, nên fixture của nó được viết lại chứ không xoá.


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
