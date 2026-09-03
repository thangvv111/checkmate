# Proposal — identifier-language-gate

## Why

Luật «định danh mới sinh viết tiếng Anh» được PO chốt **01/09/2026 lúc 17:00** và ghi vào `CLAUDE.md` +
`AGENTS.md`. File đó được nạp vào đầu **mỗi** phiên agent.

Định danh tiếng Việt đầu tiên vi phạm luật ấy sinh lúc **17:16 cùng ngày** — 16 phút sau, cùng một agent,
cùng một phiên đã đọc luật.

Đo trên `main` ngày 03/09 (dùng `git log -S` để lấy commit ĐẦU TIÊN đưa tên vào repo, nên không bị đánh lừa
bởi refactor dời file):

| định danh | sinh | change | loại |
|---|---|---|---|
| `laTriggerHopLe` | 01/09 17:16 | bộ trục ODC | hàm |
| `lyDoNgoaiRepo` | 02/09 | `retire-r-rules` | hàm |
| `laThuMucQuyTrinh` | 03/09 | `declarable-process-docs` | hàm export |
| `lyDoKhongPhaiThuMuc` | 03/09 | nợ #6 | hàm |
| `TRAN_SONG_SONG` | 03/09 | `concurrent-runs` | hằng export |
| `UngVienToiThieu` | 03/09 | `verdict-contract` | kiểu |
| `TrangThaiProbe` | 03/09 | `verdict-contract` | kiểu |
| `HOI_QUY` · `NOI_DUOC_DIEU_GI` | 03/09 | `verdict-contract` | hằng |
| `loiSinhLaiKhongBangChung` | 03/09 | `probe-classification` | hàm export |

**Mười định danh cấp module trong 48 giờ.** Không cái nào bị phát hiện bởi máy — cả mười lọt qua `tsc`,
qua `npm test` 764 ca, qua sáu lượt review PR, và chỉ lộ ra khi PO đọc code bằng mắt.

Vì sao trượt, đo được bằng cách so hai luật nằm **cùng chỗ** trong `CLAUDE.md`:

| | ⛔C5 hợp đồng repo | ngôn ngữ định danh |
|---|---|---|
| chỗ ở | `CLAUDE.md` | `CLAUDE.md` |
| cưỡng chế bằng máy | `test/hop-dong-repo.test.ts` | **không có** |
| khi agent quên | lưới đỏ **ngay trong phiên** | không tín hiệu nào, 48 giờ |

Đây đúng mệnh đề mà cả sản phẩm này tồn tại để nói: **«không chứng minh được là sai» ≠ «đã chứng minh là
đúng»**. Một luật không có lưới thì không phải luật đang thi hành — nó là một câu chữ mà người ta tin là
luật. Repo đang tự chứng minh điều đó bằng chính mình.

## What Changes

- **Lưới `test/identifier-language.test.ts`** (MỚI): quét định danh **cấp module** trong `packages/*/src/`
  và `apps/web/src/`, đỏ khi có định danh tiếng Việt không nằm trong danh sách miễn trừ.
- **Danh sách miễn trừ `docs/identifier-allowlist.md`** (MỚI): snapshot code cũ tiếng Việt, đóng băng
  03/09/2026, mỗi mục một dòng kèm lý do miễn. Danh sách **CHO PHÉP**, không phải danh sách cấm.
- **Đổi tên 10 định danh vi phạm** sang tiếng Anh (bảng ánh xạ ở `design.md` D4).
- **`CLAUDE.md` + `AGENTS.md`**: làm rõ ranh giới PO chốt 03/09 — trường của object/kiểu KHÔNG tính là định
  danh; tên file · thư mục · capability · nhánh git VẪN tính (phương án (a)).
- KHÔNG đổi biến cục bộ trong thân hàm (D2) · KHÔNG đổi code cũ trong danh sách miễn trừ.

## Luật chạm tới

- ⛔C5 (hợp đồng repo — bảng module `checkmate.yml` đổi theo tên mới)
- `CLAUDE.md › Ngôn ngữ định danh — tiếng Anh` (làm rõ ranh giới, không đổi nguyên tắc)
- Capability MỚI `identifier-language-gate` (ADDED 2 requirement)
- Hàng bảng tra: không có mã `R` nào — luật này sinh sau khi hệ `R` đã gỡ

## Impact

- MỚI: `test/identifier-language.test.ts` · `docs/identifier-allowlist.md`
- Đổi tên: `packages/harness/src/{verdict,skill-code}.ts` · `packages/shared/src/spec-source.ts` ·
  `apps/web/src/runs.ts` · `packages/harness/src/trigger-catalog.ts` · các chỗ gọi + test
- `checkmate.yml` bảng module (⛔C5) · `CLAUDE.md` + `AGENTS.md` (đồng bộ qua lưới `huong-dan-harness`)
- KHÔNG đổi hành vi sản phẩm: đổi tên là refactor thuần, `npm test` phải xanh y nguyên 764 ca.
