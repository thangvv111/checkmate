## Why

Nguyên tắc 03 của sản phẩm — «không đủ cơ sở thì không ra verdict» — hiện chỉ tồn tại ở **một phép so
chuỗi lúc render**:

```ts
// apps/web/src/ui.ts:1548
const khongCoSo = !v && loiCuoi.some((m) => /không đủ cơ sở/i.test(m));
```

Engine ném `new Error('Không đủ cơ sở kết luận: …')` (`packages/harness/src/skill-code.ts:786`), lượt chấm
đóng lại với `trangThai: 'loi'`, và thứ duy nhất phân biệt nó với **mọi loại lỗi khác** — hết token, mạng
đứt, repo clone hỏng — là câu tiếng Việt ấy còn nguyên văn hay không.

Ba hệ quả đo được:

1. **Sửa lời văn là mất tính năng, không lưới nào đỏ.** Đổi «Không đủ cơ sở kết luận» thành «Không đủ căn
   cứ» thì card «KHÔNG RA VERDICT» biến mất khỏi màn Run, lượt chấm thất bại hiện thành lỗi hạ tầng, và
   `npm test` vẫn xanh.
2. **Không đếm được, không lọc được.** Lịch sử lọc theo `verdict.result` hoặc `trangThai === 'loi'`; không
   có đường nào hỏi «bao nhiêu lượt chấm thất bại vì không có cơ sở». Người vận hành không đo được chỗ
   yếu này của engine — mà đó đúng là con số nói lên engine đang khoẻ hay yếu.
3. **Gói design CCS đòi một thứ hiện không dựng được.** Gói khai pill «Không đủ cơ sở» (neutral-800 đảo
   màu) trong Lịch sử **và một option lọc riêng**, cộng **hai thông điệp khác nhau** cho hai nguyên nhân
   khác nhau. Không có trạng thái lưu được thì cả ba đều không làm được.

Change này tách ra riêng vì nó **đổi hình dạng dữ liệu**, không phải sửa giao diện: nó thêm cột vào sổ,
cần đường di trú cho lượt cũ, và cần mutation của riêng nó. Ba change đồng bộ giao diện đứng sau nó.

## What Changes

1. **Kết cục «không đủ cơ sở» thành trường lưu được trên lượt chấm** — `RunMeta.khongDuCoSo?: { loai,
   soProbe, lyDo }`, ghi xuống cột mới của bảng `run`. `trangThai` **giữ nguyên `'loi'`**: gói design nói
   rõ đây là **lượt chấm thất bại**, không phải trạng thái thứ ba ngang hàng PASS/FAIL. Trường mới trả lời
   câu «thất bại KIỂU GÌ», không tạo thêm một kết cục.
2. **Hai loại, phân biệt bằng mã máy đọc được** — `khong_probe_nao_toi_noi` (không phép thử nào chạy được
   đến nơi) và `goc_khong_doi_chung` (nhánh gốc không chạy được probe nào, và không probe nào pass trên
   nhánh PR). Gói design đòi hai thông điệp riêng vì **việc người dùng phải làm khác nhau**: cái đầu là
   probe viết sai, cái sau là PR thêm module mới nên không có đối chứng.
3. **Engine phát sự kiện có kiểu trước khi ném** — `{ type: 'khong_du_co_so', loai, so_probe, ly_do }`.
   Vẫn ném (fail-closed, ⛔C2 không đổi); thứ thêm vào là một dấu vết máy đọc được đi trước cú ném.
4. **Di trú tự động cho lượt cũ** — lượt đã có trong sổ chỉ mang câu lỗi. Một lượt backfill lúc khởi động
   đọc câu ấy và ghi trường mới. Phép so chuỗi cũ sống **đúng một chỗ** là hàm di trú đó, có test khoá,
   thay vì nằm ở đường render.
5. **Màn Run đọc trường, không đọc câu** — `khongCoSo` suy từ `meta.khongDuCoSo`, và hiện đúng thông điệp
   của loại tương ứng.
6. **Lịch sử: pill «Không đủ cơ sở» + option lọc riêng** — tách khỏi rổ «lỗi», vì trộn chúng là trộn «engine
   không kết luận được» với «máy chủ hỏng».

**KHÔNG làm trong change này** (ghi rõ để không ai tưởng đã có):
- Đổi `trangThai` thành bốn giá trị — cố ý không, xem mục 1.
- Dựng lại **hình thức** ba màn bảng theo gói CCS (cột, sắp xếp, phân trang, dòng tổng) — đó là change
  `data-table-screens-ccs` ngay sau. Change này chỉ thêm **một** pill và **một** option lọc, vì chúng là
  bề mặt đọc của dữ liệu mới; không có chúng thì không chứng minh được dữ liệu mới dùng được.

## Capabilities

### New Capabilities
<!-- không có: kết cục này thuộc hợp đồng verdict đã có -->

### Modified Capabilities
- `verdict-contract`: thêm yêu cầu «kết cục không-đủ-cơ-sở phải là DỮ LIỆU, phân biệt được hai loại, và
  đếm/lọc được» — đứng cạnh yêu cầu «PASS phải có bằng chứng» đang khai *khi nào* nó xảy ra nhưng không
  khai *nó được ghi lại thế nào*.

## Luật chạm tới

- **Luật chạm tới:** `verdict-contract › PASS phải có bằng chứng — không probe nào chứng minh được gì thì
  KHÔNG ra verdict` (giữ nguyên, change này ADDED hai requirement đứng cạnh nó) · **⛔C2** (fail-closed:
  đường ném giữ nguyên, trường mới không được biến lượt thất bại thành lượt có kết quả) · **⛔C5** (export
  mới khai bảng module `checkmate.yml`) · **⛔C6** (cột mới phải đọc được ngay ở lượt đọc kế tiếp, không
  đợi restart lần hai).

## Impact

- `packages/shared/src/types.ts` — kiểu `InsufficientBasisKind` + hình dạng sự kiện mới.
- `packages/harness/src/verdict.ts` — `hasBasis` trả thêm **loại**, không chỉ trả lý do dạng chữ.
- `packages/harness/src/skill-code.ts` — phát sự kiện có kiểu trước khi ném.
- `apps/web/src/runs.ts` — `RunMeta.khongDuCoSo`, nhặt sự kiện khi tiến trình đóng.
- `apps/web/src/store/db.ts` — cột mới trong `napCotThieu`; hàm di trú cho lượt cũ.
- `apps/web/src/ui.ts` — `khongCoSo` đọc trường; hai thông điệp theo loại.
- `apps/web/src/ui-history.ts` — pill + option lọc.
- `checkmate.yml` — khai export mới.
- **Không đụng**: đường quyết định verdict, bảng chân trị phân loại probe, cổng merge, sổ cái (lượt không
  đủ cơ sở vốn không ghi sổ cái — change này thêm ca test khoá điều đó lại).
