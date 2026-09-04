# Proposal — stalled-run-recovery

## Why

Ba lỗi tìm được trong một lượt PO dùng thử sáng 04/09. Chúng khác nhau về cơ chế nhưng cùng một họ: **bề
mặt nói không đủ để người đọc hành động đúng**, và trong hai ca thì người đọc còn **không hành động được**.

### (1) Lượt chấm chết được nối lại thành «đang chạy» — vĩnh viễn

`noiLaiLuotDangChay()` nối lại mọi lượt `dang_chay` **có sổ sự kiện trên đĩa**. Comment ngay trên hàm nói ý
đúng — *«lượt còn sổ **đang lớn dần** là lượt còn sống»* — nhưng phép kiểm thực tế chỉ là `existsSync(p)`.
Rồi `cleanupOrphanRuns(noiLai)` **loại trừ đúng những lượt vừa nối**, nên xác không bao giờ bị dọn.

Đo được trên máy PO:

| | |
|---|---|
| xác | `wmtlc846uh8nk` — PR **#7** `demo-credit-approval` @ `66abacf`; sổ dừng ghi **03/09 16:47:58**, phát hiện **04/09 10:32** |
| `runningCount()` | 1 → trần `CONCURRENCY_LIMIT = 2` còn một slot |
| `isPrRunning(7)` | **true** → `evaluateStartRun` trả **409 `pr_dang_cham`** |
| hệ quả | **không chấm lại được PR #7, vĩnh viễn** — và hai xác là trần đầy, chặn mọi lượt |

Và hôm nay **không có đường nào huỷ một lượt**: `child` chỉ là biến cục bộ trong `batDau`, không lưu đâu cả.

### (2) Sổ kiểm nhà cung cấp báo sai phương thức đang dùng

Cấu hình đang là `phuong_thuc: "thue_bao"` — đường gọi `claude` CLI bằng phiên đăng nhập trên máy, **không
cần API key**. Nhưng `.ncc-verify.json` còn giữ kết quả một lần kiểm ở phương thức `api`:

```json
"anthropic": { "ok": false, "phuong_thuc": "api",
               "thong_diep": "Chưa có API key Anthropic — dán vào ô bên dưới rồi kiểm lại." }
```

Cổng đọc `ok:false` → chặn, và thông điệp bảo người dùng **đi tìm API key cho một chế độ không dùng API
key**. PO đọc xong kết luận nhầm là tính năng kho khoá mới đã phá đường phiên Claude Code.

Chặn thì đúng (⛔C2 — chưa kiểm được thì không cho qua). **Nói sai bản chất mới là lỗi.**

### (3) Danh sách ứng viên đối kháng không phân biệt được

```
6 ứng viên: D1 (mâu thuẫn nội tại) · D2 (mâu thuẫn nội tại) · D3 … · D5 (lệch chéo) · D6 (lệch chéo)
```

`skill-doc.ts:188` chỉ in `id` + **nhãn rubric**. Rubric là danh mục hữu hạn, nên hai ứng viên nhắm hai chỗ
hoàn toàn khác nhau hiện ra giống hệt. PO đọc và kết luận engine sinh trùng.

Thực tế **không cái nào trùng**: D1 bắt ví dụ để *người tạo tự duyệt* (dòng 49), D2 bắt cùng ví dụ ấy
*vượt ngưỡng thẩm quyền* (dòng 44); D5 bắt trạng thái `Mở lại`, D6 bắt chuyển tiếp `Đã duyệt → Đang giải
ngân` — hai hàng khác nhau của cùng một phụ lục. Gỡ bớt bất kỳ cặp nào là mất một finding **high**.

Ứng viên đã mang sẵn `quotes` kèm vị trí. **Dữ liệu để phân biệt có sẵn; dòng log không dùng.**

## What Changes

- **(1)** Lưu `pid` của tiến trình chấm; phân biệt lượt còn sống với lượt đã chết bằng pid, không bằng
  «có sổ». Lượt đã chết thành **lỗi ngay** ở lần khởi động phát hiện ra — tự giải phóng trần và pull
  request, không cần ai bấm gì.
- **(1b)** Nút **Huỷ** cho lượt **đang chạy thật**; kill chỉ khi xác minh được đúng tiến trình của lượt ấy.
  KHÔNG có trạng thái trung gian, KHÔNG có nút «tiếp tục» — chạy lại là một lượt MỚI (PO chốt 04/09, D3).
- **(2)** Thông điệp cổng nhà cung cấp phải nói **phương thức đang chọn**, và khi sổ kiểm mang phương thức
  khác cấu hình thì nói rõ là **cần kiểm lại**, không đổ cho thiếu API key.
- **(3)** Dòng ứng viên phải mang **chỗ nhắm** của từng ứng viên, không chỉ nhãn loại.
- **(4)** Cổng đã khoá thì bề mặt KHÔNG được nói «PASS» và KHÔNG được mời tick (PO báo 04/09, gộp vào
  change này vì cùng họ — bề mặt nói sai. KHÔNG đổi luật cổng: cổng vẫn khoá đúng như trước).

## Non-Goals

- KHÔNG đổi trần số probe / finding theo kích thước artifact — backlog **#17**.
- KHÔNG lọc probe thư viện theo diff — backlog **#18**.
- KHÔNG đổi luật cổng: chặn vẫn là chặn; change này chỉ làm bề mặt nói đúng và cho đường thoát.
- KHÔNG dọn worktree sandbox của lượt bị huỷ — chỗ hở CÓ Ý THỨC, khai ở security S5.1.

## Luật chạm tới

- Capability MỚI `stalled-run-recovery` (ADDED)
- ⛔C2 — lượt chết không được im lặng biến mất: đánh dấu lỗi phải ghi lý do, huỷ phải ghi ai làm
- ⛔C5 — thêm export thì khai bảng module `checkmate.yml`
- **Đổi hình dạng dữ liệu**: thêm cột vào bảng `run` → phải có đường di trú tự động (khuôn `napCotThieu`)

## Impact

- `apps/web/src/runs.ts` · `apps/web/src/store/db.ts` (+cột) · `apps/web/src/server.ts` (+route) ·
  `apps/web/src/ui.ts` (+nút) · `apps/web/src/provider.ts` (thông điệp) ·
  `packages/harness/src/skill-doc.ts` (dòng log)
- Lưới mới cho cả ba mục.
