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
    kq.push({
      tacGia,
      soVerdict: sx.length,
      pass: sx.filter((m) => m.verdict === 'PASS').length,
      fail: sx.filter((m) => m.verdict === 'FAIL').length,
      high: sx.reduce((t, m) => t + m.high, 0),
      medium: sx.reduce((t, m) => t + m.medium, 0),
      low: sx.reduce((t, m) => t + m.low, 0),
      soPr: theoPr.size,
      prPassVongDau: [...theoPr.values()].filter((l) => l[0].verdict === 'PASS').length,
      streakPass: streak,
      lanCuoi: sx[sx.length - 1].luc,
    });
  }
  return kq.sort((a, b) => b.soVerdict - a.soVerdict);
}
