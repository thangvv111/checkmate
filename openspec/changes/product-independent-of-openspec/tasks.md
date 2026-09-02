# Tasks — product-independent-of-openspec

Không đổi code sản phẩm. Một PR.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED hai requirement ở `specs/kien-truc-tang/spec.md` của change (đã viết); test khoá:
      `test/deploy-bundle.test.ts` (requirement 1) và phép thử cắt-folder ghi ở 5.2 (requirement 2).

## 2. Gói deploy

- [x] 2.1 `scripts/pack-deploy.sh`: tar từ thư mục cha, exclude cũ giữ nguyên + loại theo đường neo
      `checkmate/openspec` · `checkmate/docs` · `checkmate/test` · `checkmate/bench` · `checkmate/_ref` ·
      `checkmate/.claude` · `checkmate/.github` · `checkmate/probes-lib-bench` · `checkmate/checkmate.yml` ·
      `checkmate/AGENTS.md` · `checkmate/CLAUDE.md` · `checkmate/GEMINI.md` · `checkmate/vitest.config.ts` ·
      `checkmate/.gitignore`; tự kiểm `tar -tzf` bằng grep (bí mật · dữ liệu prod · hồ sơ xây dựng) — có
      dòng nào là thoát mã khác 0.
- [x] 2.2 `DEPLOY.md` bước 2 → chạy script (giữ lời giải thích vì sao đi đường tar); bước 3 thêm **dọn một
      lần** các thư mục hồ sơ trên máy chủ, liệt kê tường minh, KHÔNG đụng dữ liệu; bước 4 giữ nguyên.

## 3. Lưới

- [x] 3.1 `test/deploy-bundle.test.ts`: `PRODUCT_ALLOW` khai tường minh (D2); đọc `git ls-files` cấp một
      (+ `_ref`); mọi mục ngoài `PRODUCT_ALLOW` phải có `--exclude=checkmate/<tên>` hoặc `--exclude=<tên>`
      trong script; đòi ≥ 1 exclude parse được; thông điệp đỏ nêu tên mục chưa loại. Ca đối chứng: repo
      demo `test/` không bị loại (không có `--exclude=test` trơ).

## 4. Tài liệu — câu đúng về luật (D5) và luật ba đích (D6)

- [x] 4.1 `AGENTS.md`: dòng 3 và mục «⛔ Chỗ sống của luật» theo D5; thêm một câu «gói deploy không mang
      hồ sơ xây dựng — `scripts/pack-deploy.sh`». Rồi `cp AGENTS.md CLAUDE.md`.
- [x] 4.2 `README.md:48`, `openspec/config.yaml` (context «Chỗ sống của luật»), `checkmate.yml` chú thích
      đầu file và mục `sources` («hồ sơ hành vi, tự chấm đọc từ bản clone», không phải «luật đang hiệu lực
      CHỈ ở»).
- [x] 4.3 `docs/r-rules-map.md`: đầu bảng thêm mục «Ba đích của backfill» (D6); bảy hàng `precedent` (R9.4b ·
      R8.12 · R6.13 · R10.12 · R10.11 · R2.14 · R1.2) thêm «ứng viên kho khuôn (đích b)» vào cột `home`
      (không đổi `bucket` — lưới bảng tra không đổi).
- [x] 4.4 `openspec/changes/named-debts/tasks.md` + `proposal.md`: mục 6 «repo đích khai đè thư mục tài
      liệu quy trình (router) và danh sách tự dò (`SPEC_CANDIDATES`) qua `checkmate.yml`; gỡ mặc định chỉ
      khi cửa khai đã có» — nguồn: `product-independent-of-openspec`.

## 5. Test

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ (kể cả lưới mới).
- [x] 5.2 Phép thử cắt-folder lặp lại trên bản làm việc: dời tạm `openspec` `docs` `test` `bench` `.claude`
      ra ngoài → `tsc` sạch, server khởi động được (`npm run web` lên cổng, tắt ngay); trả lại; ghi kết quả
      vào thân PR. Đây là kiểm tay của requirement 2.
- [x] 5.3 Mutation cho 3.1: thêm tạm một thư mục cấp một (`zz-tmp/` có file) → lưới đỏ nêu tên; xoá.

## 6. Kiểm cơ học

- [x] 6.1 `npx openspec validate --changes` xanh.
- [x] 6.2 `bash scripts/pack-deploy.sh` chạy thử trên máy dev (Git Bash có GNU tar) → gói tạo được, tự
      kiểm không in dòng nào; `tar -tzf | grep demo-credit-approval/test/` CÓ dòng (đối chứng D3); xoá gói.
