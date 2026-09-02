# Proposal — product-independent-of-openspec: gói deploy chỉ mang sản phẩm

## Why

PO chốt 02/09: **CheckMate phải vận hành độc lập hoàn toàn với `openspec/`** — OpenSpec chỉ dùng để xây
sản phẩm, không phải một phần của sản phẩm; `specs/R*.md` cũ cũng xử lý như vậy. Chừng nào chưa đúng thế,
refactor chưa kết thúc.

Đo 02/09: phép thử **cắt folder `openspec/`** trên máy dev → `tsc` sạch, 668/670, hai ca đỏ là lưới di
trú (dev) — sản phẩm chạy nguyên. Nhưng **gói deploy hôm nay vẫn đẩy `openspec/`, `docs/`, `test/`,
`bench/`, `.claude/` lên máy chủ** (`DEPLOY.md:178–183` chỉ loại `node_modules`, `.git`, bí mật, dữ liệu).
«Không phụ thuộc» chưa được kiểm ở đúng chỗ nó phải kiểm: bản chạy thật.

## What Changes

- **Đóng gói bằng script**: `scripts/pack-deploy.sh` (mới) — tar loại mọi thư mục xây dựng theo đường neo
  `checkmate/<tên>` (kẻo `--exclude=test` trơ cắt luôn `demo-credit-approval/test` đóng gói cùng), tự kiểm
  danh sách gói: không bí mật, không dữ liệu prod, **không hồ sơ xây dựng**. `DEPLOY.md` bước 2 gọi
  script; thêm bước **dọn một lần** trên máy chủ (tar giải nén không xoá thư mục đã đẩy lên từ trước).
- **Lưới `test/deploy-bundle.test.ts`**: danh sách SẢN PHẨM khai tường minh (`apps` · `packages` ·
  `package.json` · `package-lock.json` · `tsconfig.json` · `README.md` · `DEPLOY.md`); mọi mục cấp 1 git
  theo dõi ngoài danh sách đó PHẢI có trong exclude của script. Thêm thư mục xây dựng mới mà quên loại →
  đỏ.
- **Sửa bốn câu quá tay** (viết ở change `retire-r-rules`): CLAUDE.md/AGENTS.md dòng 3 và mục «Chỗ sống
  của luật», `README.md`, `openspec/config.yaml`, chú thích `checkmate.yml`, đầu `docs/r-rules-map.md` —
  câu đúng: **luật vận hành = code + test + kho khuôn (shipped); `openspec/` = hồ sơ xây dựng, deploy
  không mang; sản phẩm không đọc hồ sơ của chính nó lúc chạy**.
- **Luật ba đích cho backfill** ghi vào đầu bảng tra: (a) hành vi sản phẩm → code + test, requirement
  openspec là hồ sơ; (b) **tri thức vận hành common → nạp vào sản phẩm** (kho khuôn `trigger-examples.ts`,
  prompt, danh mục trigger, rubric); (c) nguyên tắc xây dựng → CLAUDE.md/config. Bảy hàng `precedent` chưa
  vào kho khuôn (R9.4b · R8.12 · R6.13 · R10.12 · R10.11 · R2.14 · R1.2) đánh dấu ứng viên đích (b), qua
  cửa đào thải của kho.
- **Giữ hai chỗ code sản phẩm biết chữ `openspec`** (router coi `openspec/**` là tài liệu quy trình; danh
  sách tự dò có `openspec/specs/**`) làm **tri thức mặc định về quy ước của repo đích** — PO chốt 02/09.
  Ghi nợ có tên vào `named-debts`: repo đích khai đè thư mục tài liệu quy trình và danh sách tự dò.
- KHÔNG đổi code sản phẩm. KHÔNG đổi router.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `kien-truc-tang`: ADDED requirement «Gói deploy chỉ mang sản phẩm, không mang hồ sơ xây dựng» và
  «Sản phẩm không đọc hồ sơ xây dựng của chính nó lúc chạy» — luật kỹ nghệ, đúng chỗ của capability này.

## Luật chạm tới

- **Luật chạm tới:** `kien-truc-tang › Gói deploy chỉ mang sản phẩm, không mang hồ sơ xây dựng` (ADDED) ·
  `kien-truc-tang › Sản phẩm không đọc hồ sơ xây dựng của chính nó lúc chạy` (ADDED). Không chạm ⛔C. Không
  trả nhà cho hàng `pending` nào — chỉ đánh dấu bảy hàng `precedent` là ứng viên kho khuôn.

## Impact

- `scripts/pack-deploy.sh` (mới) · `DEPLOY.md` bước 2 (gọi script + tự kiểm) và bước 3 (dọn một lần).
- `test/deploy-bundle.test.ts` (mới).
- `AGENTS.md` = `CLAUDE.md` (lưới ép khớp) · `README.md:48` · `openspec/config.yaml` (context) ·
  `checkmate.yml` (chú thích) · `docs/r-rules-map.md` (đầu bảng + 7 hàng precedent).
- `openspec/changes/named-debts/tasks.md` + `proposal.md`: mục 6.
- Không file nào trong `apps/`, `packages/` đổi.
