import { resolve } from 'node:path';

// Repo gốc của CheckMate (cwd khi chạy web = root repo checkmate)
export const GOC = resolve('.');
export const DEMO_REPO = process.env.CHECKMATE_DEMO_REPO ?? resolve(GOC, '../demo-credit-approval');
export const PRD_DEMO = process.env.CHECKMATE_PRD ?? resolve(GOC, '../prd-demo-phe-duyet-han-muc.md');

export interface Preset {
  id: string;
  skill: 'code' | 'doc';
  tieuDe: string;
  moTa: string;
  args: string[];
}

// Mô tả viết TRUNG TÍNH như PR/tài liệu thật — không lộ đáp án PASS/FAIL.
export const PRESETS: Preset[] = [
  {
    id: 'pr1',
    skill: 'code',
    tieuDe: 'PR-1 · Gộp điều kiện phê duyệt',
    moTa: 'Refactor gọn luồng duyệt về một chỗ. Test của tác giả xanh toàn bộ.',
    args: ['--skill', 'code', '--repo', DEMO_REPO, '--branch', 'feature/duyet-nhanh'],
  },
  {
    id: 'pr2',
    skill: 'code',
    tieuDe: 'PR-2 · Giải ngân chia đều các kỳ',
    moTa: 'Chia kỳ giải ngân đều nhau cho dễ đối soát, chuẩn hoá phép so hạn mức.',
    args: ['--skill', 'code', '--repo', DEMO_REPO, '--branch', 'feature/giai-ngan-nhieu-ky'],
  },
  {
    id: 'pr3',
    skill: 'code',
    tieuDe: 'PR-3 · Tối ưu tạo đề xuất',
    moTa: 'Bỏ query tiền kiểm thừa — ràng buộc DB đã đảm bảo. Test xanh.',
    args: ['--skill', 'code', '--repo', DEMO_REPO, '--branch', 'feature/tao-nhanh-de-xuat'],
  },
  {
    id: 'pr4',
    skill: 'code',
    tieuDe: 'PR-4 · Lọc danh sách theo trạng thái',
    moTa: 'Thêm filter trạng thái cho danh sách đề xuất, kèm test mới.',
    args: ['--skill', 'code', '--repo', DEMO_REPO, '--branch', 'feature/loc-trang-thai'],
  },
  {
    id: 'pr5',
    skill: 'code',
    tieuDe: 'PR-5 · Vá điều kiện phê duyệt',
    moTa: 'Tách kiểm tra thẩm quyền thành hàm riêng, bổ sung test biên và ca chặn.',
    args: ['--skill', 'code', '--repo', DEMO_REPO, '--branch', 'fix/dieu-kien-duyet'],
  },
  {
    id: 'prd',
    skill: 'doc',
    tieuDe: 'PRD · Phê duyệt hạn mức tín dụng',
    moTa: 'Tài liệu yêu cầu ~4 trang của phân hệ demo — kiểm bằng skill tài liệu.',
    args: ['--skill', 'doc', '--file', PRD_DEMO],
  },
];
