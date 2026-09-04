import type { VerdictLedgerEntry } from './ledger.js';

// Thang tin cậy tác giả (spec §12 · B4.2) — track record tính TỪ SỔ CÁI, không tự khai.
// NGUYÊN TẮC: trust KHÔNG nới cổng — mọi PR vẫn bị chấm như nhau; hồ sơ chỉ để nhìn và xếp ưu tiên.

export interface AuthorProfile {
  tacGia: string;
  soVerdict: number;
  pass: number;
  fail: number;
  high: number;
  medium: number;
  low: number;
  soPr: number; // số PR riêng biệt đã chấm
  prPassVongDau: number; // số PR mà verdict ĐẦU TIÊN là PASS
  streakPass: number; // chuỗi PASS liên tiếp tính từ verdict mới nhất
  /**
   * Tỉ lệ PASS = pass / SỐ VERDICT (không phải số PR — gói design khai rõ mẫu số).
   *
   * Một pull request chấm lại nhiều lần đóng góp nhiều verdict, nên hai mẫu số cho hai con số khác nhau.
   * 0 verdict ⇒ tỉ lệ 0, không phải `NaN` và không phải 100%: tác giả chưa có bằng chứng nào phải nằm
   * CUỐI bảng, không phải đầu. Nghiêng nhầm chiều ở đây là bịa ra một kết luận từ chỗ trống.
   */
  tiLePass: number;
  lanCuoi: string;
}

export function computeProfile(soCai: VerdictLedgerEntry[]): AuthorProfile[] {
  const theoTacGia = new Map<string, VerdictLedgerEntry[]>();
  for (const m of soCai) {
    if (!m.tac_gia || !m.pr) continue; // chỉ tính verdict gắn PR có tác giả
    const ds = theoTacGia.get(m.tac_gia) ?? [];
    ds.push(m);
    theoTacGia.set(m.tac_gia, ds);
  }

  const kq: AuthorProfile[] = [];
  for (const [tacGia, ds] of theoTacGia) {
    const sx = [...ds].sort((a, b) => a.luc.localeCompare(b.luc));
    const theoPr = new Map<number, VerdictLedgerEntry[]>();
    for (const m of sx) {
      const l = theoPr.get(m.pr!) ?? [];
      l.push(m);
      theoPr.set(m.pr!, l);
    }
    let streak = 0;
    for (let i = sx.length - 1; i >= 0; i--) {
      if (sx[i].verdict === 'PASS') streak++;
      else break;
    }
    const pass = sx.filter((m) => m.verdict === 'PASS').length;
    kq.push({
      tacGia,
      soVerdict: sx.length,
      pass,
      // Chia cho 0 nghiêng về 0, không về 1: chưa có bằng chứng nào thì không được đứng đầu bảng.
      tiLePass: sx.length ? pass / sx.length : 0,
      fail: sx.length - pass,
      high: sx.reduce((t, m) => t + m.high, 0),
      medium: sx.reduce((t, m) => t + m.medium, 0),
      low: sx.reduce((t, m) => t + m.low, 0),
      soPr: theoPr.size,
      prPassVongDau: [...theoPr.values()].filter((l) => l[0].verdict === 'PASS').length,
      streakPass: streak,
      lanCuoi: sx[sx.length - 1].luc,
    });
  }
  // Sắp theo TỈ LỆ PASS giảm dần — bảng này trả lời câu «ai hay bị bắt lỗi», nên trục của nó phải là
  // tỉ lệ chứ không phải số lượng. Bản trước sắp theo `soVerdict`, tức đưa người chấm NHIỀU pull request
  // nhất lên đầu; người đọc lướt một bảng đã sắp xếp thì mặc định hiểu «đầu bảng đáng chú ý nhất», nên
  // bảng nói một điều SAI về một con người bằng đúng cơ chế người đọc tin nhất là thứ tự.
  //
  // Hai khoá phụ để thứ tự XÁC ĐỊNH: cùng tỉ lệ thì ai nhiều bằng chứng hơn đứng trước, rồi tới tên.
  // Thiếu khoá phụ thì hai hàng cùng tỉ lệ đổi chỗ giữa hai lần tải trang mà không ai đụng dữ liệu.
  return kq.sort(
    (a, b) => b.tiLePass - a.tiLePass || b.soVerdict - a.soVerdict || a.tacGia.localeCompare(b.tacGia),
  );
}
