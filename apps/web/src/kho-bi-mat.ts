import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { MaNcc } from './ncc.js';

/**
 * Kho bí mật — MỘT chỗ duy nhất đọc/ghi `.secrets.json` (specs/R9.13, R4.19).
 *
 * Trước L2 có hai chỗ tự mở file này (khoá nhà cung cấp ở `ncc.ts`, token thuê bao ở `config.ts`), mỗi
 * chỗ tự siết quyền theo cách riêng. Token per-repo là người dùng thứ ba — gom về đây để chỉ còn một
 * đường ghi, một chỗ chịu trách nhiệm quyền 600.
 */

// CHECKMATE_GOC: cùng cái neo mà lớp kho dùng — để lưới test chạy trên thư mục riêng, không đụng
// kho bí mật thật của máy đang chạy.
const FILE_SECRET = join(process.env.CHECKMATE_GOC ?? resolve('.'), '.secrets.json');

export interface KhoSecret {
  claude_code_oauth_token?: string;
  khoa?: Partial<Record<MaNcc, string>>;
  /** Token GitHub theo TỪNG repo, khoá là `owner/repo` viết thường (R4.18) */
  repo_token?: Record<string, string>;
}

export function docKho(): KhoSecret {
  if (!existsSync(FILE_SECRET)) return {};
  try {
    return JSON.parse(readFileSync(FILE_SECRET, 'utf8')) as KhoSecret;
  } catch (e) {
    // Trả {} im lặng ở đây là án tử cho mọi khoá còn lại: lượt ghi kế tiếp làm `ghiKho({...docKho(), …})`
    // nên nó ghi đè file bằng object RỖNG cộng đúng một khoá mới — toàn bộ chìa cũ bốc hơi vĩnh viễn và
    // không ai biết. File rách vì ghi dở, đĩa đầy hay sửa tay hỏng đều dẫn tới đây.
    //
    // Dời file rách sang tên khác (cùng khuôn đã dùng cho meta thư viện probe): bản cũ còn nguyên để
    // cứu bằng tay, lượt ghi sau tạo file mới sạch chứ không đè lên nó, và người vận hành có dấu vết.
    const dich = `${FILE_SECRET}.hong-${Date.now()}`;
    try {
      renameSync(FILE_SECRET, dich);
      console.error(
        `Kho bí mật ${FILE_SECRET} không đọc được (${(e as Error).message.slice(0, 120)}). Đã giữ bản hỏng ở ${dich} — ` +
          'mọi khoá và token repo coi như CHƯA CÓ cho tới khi dán lại. Muốn cứu thì sửa tay file đó rồi đổi tên về chỗ cũ.',
      );
    } catch {
      /* không dời được thì thôi — vẫn không được để lượt ghi sau đè lên bản hỏng */
    }
    return {};
  }
}

export function ghiKho(kho: KhoSecret): void {
  writeFileSync(FILE_SECRET, JSON.stringify(kho, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    // file đã tồn tại thì `mode` ở writeFileSync KHÔNG áp — phải siết lại, kẻo bí mật nằm ở 644
    chmodSync(FILE_SECRET, 0o600);
  } catch {
    /* Windows không chmod được — bỏ qua */
  }
}

/** GitHub coi `Owner/Repo` và `owner/repo` là một — khoá kho phải chuẩn hoá kẻo lưu hai chìa cho một repo */
export function khoaRepo(github: string): string {
  return github.trim().toLowerCase();
}

/**
 * Token GitHub dùng cho MỘT repo, theo đúng thứ tự R4.20:
 * chìa riêng của repo → `GITHUB_TOKEN` của môi trường (đường vận hành chung của chủ máy) → rỗng
 * (chỗ gọi sẽ thử `gh` CLI của máy).
 */
export function docTokenRepo(github: string): string {
  const rieng = docKho().repo_token?.[khoaRepo(github)]?.trim();
  if (rieng) return rieng;
  return process.env.GITHUB_TOKEN?.trim() ?? '';
}

/** Chìa RIÊNG của repo (không tính token môi trường) — dùng để biết repo đã được kết nối bằng chìa của nó chưa */
export function docTokenRieng(github: string): string {
  return docKho().repo_token?.[khoaRepo(github)]?.trim() ?? '';
}

export function ghiTokenRepo(github: string, token: string): void {
  const kho = docKho();
  ghiKho({ ...kho, repo_token: { ...(kho.repo_token ?? {}), [khoaRepo(github)]: token.trim() } });
}

/** R4.27 — gỡ repo thì chìa của nó phải đi theo; clone và lịch sử thì giữ (R4.7) */
export function xoaTokenRepo(github: string): void {
  const kho = docKho();
  if (!kho.repo_token) return;
  const { [khoaRepo(github)]: _bo, ...conLai } = kho.repo_token;
  ghiKho({ ...kho, repo_token: conLai });
}

/** R4.26 — lộ ra ngoài chỉ là có/không, không bao giờ là giá trị */
export function coToken(github: string): boolean {
  return docTokenRepo(github) !== '';
}
