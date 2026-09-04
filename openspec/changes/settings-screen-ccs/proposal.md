## Why

Màn Cấu hình lệch gói design CCS (§7) ở bốn chỗ, và **hai trong bốn là con số đá nhau chứ không phải
chuyện thẩm mỹ**:

1. **Trần đầu dò có BỐN con số khác nhau cho cùng một thứ.** Nhãn nói «2–12», ô nhập cho tới
   `max="20"`, mặc định trong `config.ts` là **10**, gói design chốt **6**. Người vận hành đọc nhãn rồi
   gõ 15 thì máy nhận — và không ai biết 15 có nằm trong khoảng đã thử hay không.
2. **Trần thư viện probe KHÔNG CÓ ô cấu hình, và bản thân nó cũng đá nhau.** Gói khai *«ô trần thư viện
   probe (mặc định 40, đếm theo probe không theo file)»*. Hiện nó là biến môi trường `CHECKER_LIB_TRAN`
   **không chỗ nào đặt** (`grep` ra 0 chỗ ngoài chính nó), nên giá trị luôn là mặc định trong code —
   và mặc định ấy là **100**, trong khi chú thích ngay trên nó lập luận cho con số **40**. Người vận hành
   không đổi được cái trần điều tiết **tài sản regression** của chính mình.
3. **Khối Repo là danh sách hàng, gói khai card grid.** Gói: *«Card grid (330px min): owner/repo mono +
   tag trực bật · nhánh đích · token che · PR chờ · lần chấm cuối»*.
4. **Nhà cung cấp đã khai tử tô bằng màu FAIL.** «Ngừng» không phải một thất bại — đây là chỗ trộn nghĩa
   còn sót, chuyển sang từ change `ui-token-alias-cleanup` vì màn này sở hữu nó.

## What Changes

1. **Trần đầu dò về MỘT con số nhất quán** — slider `2–12` đúng nhãn và đúng gói; mặc định cấu hình
   10 → **6**. Slider thay ô số vì gói khai slider, và vì một dải có hai đầu nhìn thấy được thì không ai
   gõ ra ngoài dải.
2. **Trần thư viện probe thành trường cấu hình thật** — `tran_thu_vien` trong `config.json`, nối tới
   `CHECKER_LIB_TRAN`, có ô ở màn Cấu hình.
   ⚠ **Mặc định giữ 100, KHÔNG hạ về 40 như gói.** Hạ trần là **đào thải probe đang có** trong
   `probes-lib/` — dữ liệu prod, tài sản regression. Ô nhập nói rõ gói đề xuất 40 và nói rõ hạ trần thì
   mất gì; đổi hay không là quyết định của người vận hành, không phải hệ quả âm thầm của một lần deploy.
3. **Khối Repo thành card grid** theo gói, mỗi card có: `owner/repo` mono · chip trực · chip chìa ·
   nhánh đích · token che · **lần chấm cuối** · nút Đổi token / Chọn / Gỡ. Repo thiếu chìa riêng có
   **banner** thay vì một dòng chữ lẫn trong card.
4. **«Đã ngừng» dùng ramp trung tính, không dùng màu FAIL.**

**KHÔNG làm trong change này** (ghi rõ để không ai tưởng đã có):
- **«PR chờ» trên mỗi card** — gói khai, nhưng nó cần một lời gọi GitHub CHO TỪNG REPO ở mỗi lần mở màn
  Cấu hình. Một màn cấu hình không được tự đi hỏi mạng nhiều lần; đó là đường làm màn chậm dần theo số
  repo và ăn hạn ngạch API cho một con số trang trí. Ghi thành nợ có tên.
- Không đổi luồng thêm repo bốn bước (đã có và đúng gói).
- Không đổi cổng gating của nút «Dùng nhà cung cấp này» (đã có và đúng gói).
- Không đổi **trần đầu dò theo độ dài artifact** — đó là nợ #17, một luật khác.

## Capabilities

### New Capabilities
- `operator-settings`: những gì người vận hành chỉnh được, và ràng buộc trên chúng — một khoảng giá trị
  chỉ có MỘT nguồn, và ô nào chỉnh được tài sản prod thì phải nói ra cái mất trước khi người ta bấm.

### Modified Capabilities
<!-- không capability nào hiện mô tả màn Cấu hình -->

## Luật chạm tới

- **Luật chạm tới:** `operator-settings › 3 requirement ADDED` · **⛔C3** (ô nhập tay: giá trị người dùng
  gõ vào không được vọng nguyên văn ra log/lỗi — token repo đi qua màn này) · **⛔C5** (export mới khai
  `checkmate.yml`).

## Impact

- `apps/web/src/config.ts` — `AgentConfig.tran_thu_vien`; `max_probe` mặc định 10 → 6; `agentEnv` phát
  `CHECKER_LIB_TRAN`.
- `packages/harness/src/probe-library.ts` — không đổi logic, chỉ đổi hằng mặc định cho khớp một nguồn.
- `apps/web/src/ui.ts` — slider độ sâu, ô trần thư viện, hằng khoảng dùng chung.
- `apps/web/src/ui-repo.ts` — card grid, banner thiếu chìa.
- `apps/web/src/ui-provider.ts` — «đã ngừng» sang ramp trung tính.
- `apps/web/src/server.ts` — nhận `tran_thu_vien`, truyền «lần chấm cuối» cho mỗi repo.
- `checkmate.yml` · `DEPLOY.md`.
- **Không đụng**: sổ cái, cổng merge, đường verdict, `probes-lib/` trên đĩa (trần đổi thì lượt chấm SAU
  mới áp, và chỉ khi người vận hành tự hạ).
