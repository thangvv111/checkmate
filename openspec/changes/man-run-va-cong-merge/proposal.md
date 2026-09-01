## Why

Màn Run là nơi verdict và nút merge sống — README của gói design gọi thẳng nó là «màn quan trọng
nhất». Đợt đồng bộ giao diện vừa rồi mới cho nó cái vỏ; ruột vẫn là thiết kế cũ. Đọc kỹ để dựng lại
thì lộ ra ba thứ nặng hơn chuyện thẩm mỹ: **chế độ phát lại đang bày một nút Merge THẬT**, **một lượt
đã xong đang được giao như luồng trực tiếp** (mất mạng là nhân đôi màn hình, không JS là trang
trắng), và **server khởi động lại giữa chừng là mất trắng lượt chấm** — trung vị 3,6 phút và toàn bộ
token đã đốt.

## What Changes

1. **Server-render lượt đã xong.** Hôm nay mọi lượt — kể cả lượt kết thúc từ tuần trước — được dựng
   bằng cách phát lại toàn bộ dòng sự kiện vào DOM. Đổi thành: xong thì server dựng thẳng từ
   `meta.verdict`; đang chạy mới nối luồng. Xoá luôn cái hack `↻ Tải lại trang để mở cổng Merge`.
2. **Trình diễn thành chế độ phía client, `?timed=1` biến mất khỏi server.** Nhịp do client canh từ
   mốc `t` sẵn có trên mỗi sự kiện; thanh điều khiển đổi tốc độ và tạm dừng giữa chừng. Server còn
   MỘT đường phát sự kiện.
3. **Cổng merge chỉ-đọc khi đang trình diễn** — vá lỗi nút Merge sống trong chế độ xem lại.
4. **Ghi chú «Trả về dev» thành bắt buộc**; tài liệu rời nói thẳng «không có cổng merge» thay vì để
   khối cổng biến mất im lặng.
5. **Bốn khối mới của gói**: vùng mù của diff · khối Thư viện (nạp/gỡ probe) · banner không-đối-chứng
   · bảng meta verdict đầy đủ kèm **vùng xám probe** (nghi vấn · bỏ qua · thất lạc · nghi lỗi có sẵn).
6. **Nới hợp đồng để UI không phải dò chuỗi log.** Bốn khối trên hôm nay chỉ tồn tại dưới dạng câu
   chữ trong `{type:'log', msg}`. Thêm trường **tuỳ chọn** vào `Verdict` và loại sự kiện có cấu trúc,
   để giao diện đọc dữ liệu chứ không bắt ký tự `⚠` trong lời văn.
7. **«Người chạy»** — ghi ai bấm chạy vào bản ghi lượt chấm; bảng meta của gói có ô này và hiện không
   có dữ liệu nào để điền.
8. **SSE nối lại không nhân đôi.** Phát `id:` theo sự kiện, đọc `Last-Event-ID` để tiếp từ chỗ đứt.
9. **Dòng sự kiện thành bền: tiến trình con tự ghi ra đĩa, server đọc file thay vì đọc pipe.** Hôm
   nay sự kiện nằm trong RAM và chỉ xuống đĩa lúc tiến trình con đóng — server chết là mất sạch,
   `cleanupOrphanRuns()` chỉ dọn xác. Đổi thành `runs/<id>/events.jsonl` chỉ-ghi-thêm làm nguồn sự
   thật; server đọc theo. Server sống lại thì đọc tiếp, không mất gì.

KHÔNG thuộc change này, đã tách: **chạy tiếp một lượt dở** (checkpoint bước 3–4 để khỏi đốt lại
token). Nó cần luật riêng về ghim SHA — xem `design.md` mục «Mức 3».

## Capabilities

### New Capabilities
- `man-run`: màn lượt chấm nói thật về chính lượt chấm đó — trạng thái kết thúc, vùng xám, vùng mù,
  và quyết định thay đổi thư viện.
- `ben-dong-su-kien`: dòng sự kiện của một lượt chấm sống sót qua việc server dừng.

### Modified Capabilities
- `giao-dien-ccs`: bổ sung yêu cầu cho chế độ trình diễn và cho ranh giới chỉ-đọc của cổng. Vỏ chung,
  token và «rỗng ≠ hỏng» giữ nguyên.

## Luật R chạm tới

- **Luật R chạm tới:** **KHÔNG — cố ý.** Luật của change này sống ở ba chỗ: hành vi trong
  `openspec/specs/man-run/` và `openspec/specs/ben-dong-su-kien/`; hằng + validate trong engine kèm
  test khoá (`packages/harness/src/cli.ts`, `apps/web/src/runs.ts`); và hình dạng dữ liệu trong
  `packages/shared/src/types.ts`. Không sửa văn bản `specs/R*.md` nào.

## Impact

- `apps/web/src/ui.ts` — `runPage` · `khoiCong` dựng lại; thêm đường server-render lượt đã xong.
- `apps/web/src/runs.ts` — `RunManager`: đọc dòng sự kiện từ file thay vì pipe; ghi «người chạy».
- `apps/web/src/server.ts` — bỏ nhánh `timed`/`speed`; thêm `id:` cho SSE và đọc `Last-Event-ID`;
  truyền danh tính người bấm chạy.
- `apps/web/src/store/run-store.ts` + `store/db.ts` — cột người chạy, và đường di trú cho nó.
- `packages/harness/src/cli.ts` — ghi thêm `runs/<id>/events.jsonl` chỉ-ghi-thêm ngay khi sự kiện
  sinh ra, ngoài việc in ra stdout như hiện nay.
- `packages/harness/src/skill-code.ts` — phát dữ liệu **có cấu trúc** cho vùng mù diff, quyết định
  thư viện, và tình trạng đối chứng (nay chỉ có trong câu chữ log).
- `packages/shared/src/types.ts` — thêm trường **tuỳ chọn** vào `Verdict`; `Verdict` bị
  `JSON.stringify` nguyên khối xuống DB nên chỉ được thêm, không được đổi hình dạng.
- `checkmate.yml` — khai export mới.
- `DEPLOY.md` — `runs/` nay giữ dòng sự kiện đang chạy, phải vào danh sách không-đè-khi-deploy.
