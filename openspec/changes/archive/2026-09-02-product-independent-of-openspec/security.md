# Security — product-independent-of-openspec

Change này đổi cách đóng gói và sửa tài liệu; không chạm code sản phẩm. Rủi ro thật nằm ở gói deploy:
cái gì đi lên máy chủ, cái gì bị xoá trên máy chủ.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Gói deploy vốn đã loại `config.json`, `.secrets.json`, `.ncc-verify.json` và tự kiểm bằng grep
  (`DEPLOY.md:179`, `:185`); script mới GIỮ nguyên hai lớp đó và thêm lớp thứ ba (hồ sơ xây dựng). Tự kiểm
  chỉ in TÊN mục vi phạm, không in nội dung — sau apply trỏ `scripts/pack-deploy.sh:<dòng>`.
- ✅ S1.2 Gói không đi lên bề mặt công khai nào — `scp` tới máy chủ (`DEPLOY.md:186`). Hồ sơ xây dựng
  (`openspec/`, `docs/`) tuy không phải bí mật nhưng là **tài liệu nội bộ** (án lệ, biên bản); không mang
  lên máy chủ là thu hẹp bề mặt.
- N/A S1.3 Không có bản che mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đường nào mới đọc danh tính.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG — không chạm `gate.ts`, `identity.ts`; cơ chế `canOperateGate`/`requireGateRole`
  (`apps/web/src/identity.ts:208-213`) nguyên vẹn; `apps/`, `packages/` không đổi (lưới `git diff --stat`
  lúc PR).
- N/A S3.2 Ba mức tự động không đụng.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- N/A S4.1 Không chạm prompt, diff, nội dung repo đích.
- N/A S4.2 Không gọi model.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích ở chỗ mới. Script đóng gói chạy trên máy dev, tay người vận hành.
- N/A S5.2 Không tạo worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Bước **dọn một lần** trên máy chủ (D4) chỉ xoá thư mục hồ sơ liệt kê tường minh (`openspec`,
  `docs`, `test`, `bench`, `_ref`, `.claude`) và đứng SAU bước sao lưu của quy trình bốn bước
  (`DEPLOY.md` bước 1 sao lưu `web-runs`, `probes-lib`, `runs`, bí mật); bước 4 đối chiếu số giữ nguyên.
  Không có `rm -rf` nào nhận tham số động.
- N/A S6.2 Không ghi file lúc chạy.

## S7. Fail-closed & bất biến verdict (R1, R6)

- N/A S7.1 Không chạm nhánh lỗi của engine.
- N/A S7.2 Không chạm phân loại probe.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu duy nhất kẻ xấu có được từ change này: **làm gói deploy thiếu thứ sản phẩm cần** (sản phẩm chết
sau deploy) hoặc **xoá nhầm dữ liệu prod ở bước dọn**.

- ✅ S8.1 (a) Gói thiếu: `PRODUCT_ALLOW` là danh sách CHO PHÉP hẹp, đo cắt-folder trước (T3.1) và xác
  nhận bằng một lượt chấm demo sau deploy (T5.3) — sai về phía «thiếu» lộ ngay, không âm thầm. (b) Xoá
  nhầm: bước dọn liệt kê tên cố định, sau sao lưu, không nhận biến; `web-runs`, `probes-lib`, `runs`,
  `repos`, ba file bí mật không có trong danh sách. (c) Ai đó thêm thư mục xây dựng mới mà quên loại →
  lưới đỏ (T1.2) — gói thừa là hướng an toàn nhưng vẫn bị bắt.
- ✅ S8.2 Test load-bearing hai chiều cho (c): T3.2 — thêm `zz-tmp/` → đỏ nêu tên; xoá → xanh. Cho (a):
  T3.1 — cắt folder → `tsc` sạch + server lên; nếu `PRODUCT_ALLOW` thiếu `tsconfig.json` chẳng hạn, `tsx`
  vẫn chạy nhưng bước này phải khai rõ điều đó trước khi bỏ.
- ✅ S8.3 Đối xứng: exclude theo đường neo cho hồ sơ của `checkmate/`, giữ dạng trơ cho dữ liệu chung
  (`runs`, `web-runs`, `probes-lib`) áp cả repo demo — hai khuôn, hai lý do, ghi ở D3; T1.3 canh không có
  `test`/`docs`/`openspec` trơ.

## Notes

- Hai chỗ code sản phẩm nhắc `openspec` được PO chốt giữ làm tri thức mặc định về repo đích; chúng không
  đọc thư mục nào, và phép thử cắt-folder là bằng chứng. Nợ khai đè ghi ở `named-debts`.
