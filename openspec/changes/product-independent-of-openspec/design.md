# Design — product-independent-of-openspec

## Context

Đo 02/09 trên `main` (`c5f8872`):

```
cat openspec/ di (mv ra ngoai)   tsc SACH · 668/670 — 2 ca do deu la test/r-rules-map.test.ts (luoi di tru)
code san pham nhac 'openspec'    2 cho: apps/web/src/github.ts:321 (router: openspec/** la tai lieu quy trinh)
                                        packages/shared/src/spec-source.ts:42 (ung vien tu do openspec/specs/**)
code san pham nhac hồ sơ cu      0 cho (chi mot chuoi tro giup CLI tro bang tra)
goi deploy (DEPLOY.md:178-183)   loai: node_modules .git bi mat web-runs probes-lib runs repos *.log bench/kq
                                 KHONG loai: openspec docs test bench _ref .claude AGENTS/CLAUDE/GEMINI .github
                                 goi cung: checkmate demo-credit-approval demo-python (repo demo lam repo dich)
```

Mục cấp một git theo dõi: `.claude .github .gitignore AGENTS.md CLAUDE.md DEPLOY.md GEMINI.md README.md
apps bench checkmate.yml docs openspec package-lock.json package.json packages probes-lib-bench test
tsconfig.json vitest.config.ts`. Thêm `_ref/` không theo dõi nhưng có trên đĩa (tar sẽ gói nếu không loại).

PO chốt 02/09: giữ hai chỗ nhắc `openspec` làm tri thức mặc định về repo đích, thêm cửa khai đè sau;
loại `test/`, `bench/`, `_ref/` khỏi gói nếu sản phẩm chạy không cần chúng (đã đo: không cần — tự chấm
chạy trên bản clone, không trên bản deploy).

## Goals / Non-Goals

**Goals**
- Gói deploy = sản phẩm; kiểm được bằng máy trước khi gửi và bằng lưới trong repo.
- Tài liệu nói đúng: luật vận hành = code + test + kho khuôn; `openspec/` = hồ sơ xây dựng.
- Backfill có luật ba đích, ghi ở chỗ 12 change sẽ đọc.

**Non-Goals**
- KHÔNG đổi router, KHÔNG gỡ chữ `openspec` khỏi code sản phẩm (PO chốt giữ làm mặc định).
- KHÔNG xây cửa khai đè thư mục tài liệu quy trình — nợ có tên.
- KHÔNG nạp khuôn mới vào kho — chỉ đánh dấu ứng viên; nạp là việc của change backfill tương ứng.

## Decisions

### D1 — Đóng gói bằng script, lưới kiểm script chứ không kiểm văn

Hôm nay lệnh tar nằm trong prose của `DEPLOY.md`; lưới muốn kiểm phải parse văn, và văn đổi cách trình
bày là lưới mù. `scripts/pack-deploy.sh` giữ lệnh tar + tự kiểm; `DEPLOY.md` bước 2 chỉ còn «chạy
script». Lưới parse `--exclude=` từ script (file chạy được, hình dạng ổn định). Phương án đã cân nhắc —
lưới chạy tar thật vào thư mục tạm rồi liệt kê: đúng hơn nhưng phụ thuộc `tar` của máy chạy test (Windows
có bsdtar, cú pháp exclude khác GNU) — không đáng.

### D2 — Danh sách SẢN PHẨM khai tường minh; mọi thứ khác phải bị loại

`PRODUCT_ALLOW = apps · packages · package.json · package-lock.json · tsconfig.json · README.md · DEPLOY.md`.
`README.md`/`DEPLOY.md` là tài liệu vận hành trên máy chủ; `tsconfig.json` vì `tsx` chạy TypeScript thẳng.
`checkmate.yml`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github`, `vitest.config.ts`, `.gitignore` — không
phải sản phẩm, loại. Lưới: với mỗi mục cấp một git theo dõi (cộng `_ref`), hoặc nó thuộc `PRODUCT_ALLOW`,
hoặc exclude có `checkmate/<tên>` (hay `<tên>` cho file). Danh sách CHO PHÉP hẹp chứ không phải danh sách
loại — cùng lý lẽ với allowlist của router: sai về phía «gói thiếu» thì phát hiện ngay lúc chạy, sai về
phía «gói thừa» thì không ai thấy.

### D3 — Loại theo đường neo `checkmate/<tên>`

GNU tar `--exclude=test` không neo: khớp mọi thành phần `test` ở mọi độ sâu → cắt luôn
`demo-credit-approval/test/` (repo đích demo cần thư mục test để chạy probe). Gói được tạo từ thư mục
cha nên mọi mục của repo bắt đầu bằng `checkmate/`; `--exclude=checkmate/test` chỉ khớp đúng chỗ. Các
exclude cũ (`runs`, `web-runs`, `probes-lib`) giữ nguyên dạng trơ vì chúng là dữ liệu cần loại ở cả repo
demo.

### D4 — Dọn máy chủ một lần

`tar -xzf` không xoá thứ đã có; `~/checkmate-app/checkmate/openspec` (và `docs`, `test`, …) từ các lần
deploy trước vẫn nằm đó. Thêm bước dọn một lần vào `DEPLOY.md` (xoá đúng các thư mục xây dựng, KHÔNG
đụng `web-runs`, `probes-lib`, `runs`, `repos`, `config.json`, `.secrets.json`, `.ncc-verify.json`). Bước 4
đối chiếu số vẫn giữ.

### D5 — Câu đúng về «luật», dùng chung cho mọi tài liệu

«Luật vận hành của CheckMate = **code + test** (hành vi) + **kho khuôn / prompt / danh mục** (tri thức chấm,
shipped trong sản phẩm). `openspec/specs/` là **hồ sơ xây dựng**: requirement + scenario mô tả hành vi mà
change cam kết. `docs/archive/r-rules/` là hồ sơ cũ. Gói deploy không mang hồ sơ nào.» — thay cho câu
«luật hiệu lực ở openspec/specs» ở bốn chỗ. Không câu nào nhắc tới việc CheckMate chấm chính nó (D8).

### D6 — Ba đích của backfill, ghi ở đầu `docs/r-rules-map.md`

| đích | đi đâu | nhận ra bằng |
|---|---|---|
| a. hành vi sản phẩm | code + test; requirement openspec là hồ sơ | điều nói «hệ thống PHẢI…» |
| b. tri thức vận hành common | `trigger-examples.ts` (qua cửa đào thải, trần N/trigger) · prompt · `trigger-catalog.ts` · rubric | án lệ khái quát hoá được thành khuôn thử cho repo khác |
| c. nguyên tắc xây dựng | CLAUDE.md · config OpenSpec | cách làm việc trong repo |

Bảy hàng `precedent` chưa có trong kho (kho 20 khuôn đã hút R6.26→KL9, R5.20→KL10/13/14, R5.17→KL12,
R5.19→KL11, R5.18→KL17, R13.8→KL8/16): R9.4b (bất biến của ứng dụng ≠ của file) · R8.12 (danh sách cấm ≠
cho phép) · R6.13 (trạng thái hút → PASS rỗng) · R10.12 (fallback rỗng rồi ghi đè) · R10.11 (đọc ngoài
khoá) · R2.14 (`P1` nuốt `P10`) · R1.2 (skip ≠ pass) — cột `home` thêm «ứng viên kho khuôn (đích b)».
Không nạp ở đây: kho có trần và luật đào thải (`truc-phan-loai-code`), nạp là quyết định của change backfill.

### D8 — Không nhắc đến việc CheckMate chấm chính nó ở bất kỳ đâu (PO chốt 02/09, lúc apply)

«Coi CheckMate như sản phẩm thường» nghĩa là **không lưu bất kỳ thông tin nào về việc nó có chấm chính nó
hay không** — còn nhắc là đã thành ngoại lệ. Bản đầu của change này viết câu «CheckMate tự chấm là repo
đích thông thường, không ngoại lệ» vào CLAUDE.md, README, `checkmate.yml`, `config.yaml`, DEPLOY.md và cả
delta spec — sai đúng theo nghĩa đó, đã gỡ hết. Câu được phép: «engine đọc hợp đồng và hồ sơ của mọi repo
đích từ bản clone của repo đó». `checkmate.yml` ở gốc chỉ là hợp đồng repo đích như của mọi repo. Mục
«Cổng — CheckMate tự chấm chính nó» trong CLAUDE.md là chính sách PR của repo do PO viết (đang tạm dừng)
— để PO quyết, change này không đụng.

### D7 — Giữ hai chỗ `openspec` trong code sản phẩm (PO chốt)

Là tri thức mặc định về quy ước repo đích. Nợ có tên (vào `named-debts` mục 6): `checkmate.yml` khai đè
thư mục tài liệu quy trình và danh sách tự dò; gỡ mặc định chỉ khi cửa khai đã có.

## Architecture

- `scripts/pack-deploy.sh` (mới, tầng công cụ — không phải sản phẩm) · `DEPLOY.md`.
- `test/deploy-bundle.test.ts` (mới).
- Tài liệu: `AGENTS.md`=`CLAUDE.md`, `README.md`, `openspec/config.yaml`, `checkmate.yml` (chú thích),
  `docs/r-rules-map.md`, `openspec/changes/named-debts/`.
- `apps/`, `packages/`: **không đổi**.

## Data Model

N/A — không chạm SQLite, không chạm tài sản prod. Bước dọn máy chủ (D4) xoá đúng thư mục hồ sơ xây dựng,
liệt kê tường minh, và đặt SAU bước sao lưu của quy trình bốn bước hiện có.

## Risks / Trade-offs

- [Loại nhầm thứ sản phẩm cần] → `PRODUCT_ALLOW` hẹp + đã đo cắt-folder trên dev; sau deploy đầu tiên
  chạy một lượt chấm demo trên máy chủ để xác nhận (kiểm tay, ghi vào DEPLOY.md).
- [tar Windows (bsdtar) khác GNU về exclude] → script là cho máy dev chạy bash/GNU tar; lưới chỉ parse.
- [Máy chủ còn hồ sơ cũ] → D4, một lần.
- [Lưới parse script vỡ khi đổi cách viết] → khuôn `--exclude=` mỗi mục một token; lưới đòi ≥ 1 exclude
  tìm được, không xanh trên script rỗng.

## Migration Plan

Không có dữ liệu di trú. Máy chủ: dọn thư mục hồ sơ một lần (D4). Đường lùi: revert PR; gói cũ vẫn deploy
được vì chỉ thừa, không thiếu.

## Open Questions

- Có giữ `checkmate.yml` trong gói không? Đề xuất **không** (sản phẩm không đọc file ở gốc bản deploy;
  tự chấm dùng bản clone). Nếu vận hành muốn sửa tay hợp đồng trên máy chủ thì sửa trong `repos/…`.
