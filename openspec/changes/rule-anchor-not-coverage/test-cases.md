## Unit — `test/no-spec.test.ts`

- [x] T1.1 Ca cũ «vế đối chứng: có luật» đổi từ khẳng định `2/3 đơn vị có probe` sang: có **`2 đơn vị`** ·
      có **tên** `Duyệt › Ngưỡng theo vai` · **MUST NOT** khớp `/\b2\/3\b/`
- [x] T1.2 Ca «không có luật» giữ nguyên: hàng khai **không đo được**, không khai `0`, không có `0/0`
- [x] T1.3 Ca «bản ghi đời cũ» giữ nguyên: không có `spec_source` ⇒ **không hiện hàng nào**

## Lưới tầng 3 — `scanRatioSurfaces`, cặp fixture

- [x] T2.1 **ĐỎ**: fixture ghép `${…luat_da_phu…}/${…luat_tong}` thành tỉ lệ
- [x] T2.2 **XANH**: fixture bày hai số tách bạch (`N luật có probe neo (kho M)`)
- [x] T2.3 **ĐỎ khi mỏ neo biến mất** — nguồn không còn `luat_tong` ⇒ đỏ; danh sách bề mặt **rỗng** ⇒ đỏ.
      Chống xanh oan theo cả hai đường
- [x] T2.4 **Cả bốn bề mặt hiện tại sạch**
- [x] T2.5 **Đếm bằng máy**: cả bốn tệp còn chạm `luat_tong` — thêm bề mặt thứ năm hoặc đổi tên trường thì
      lưới đỏ, không im lặng bỏ sót

## Ca đối kháng

- [x] T3.1 **Mutation, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả và kiểm chứng
      khôi phục sau mỗi vòng. Khôi phục dạng tỉ lệ ở **từng** bề mặt:

      | # | bề mặt | ca đỏ |
      |---|---|---|
      | M1 | `packages/harness/src/skill-code.ts` (log) | 1 |
      | M2 | `packages/harness/src/cli.ts` (dòng tóm tắt) | 1 |
      | M3 | `apps/web/src/ui.ts` (bảng số liệu) | 2 |

      Khớp hệt hai vòng. Ba bề mặt đều **load-bearing** — vá một chỗ mà quên hai chỗ kia thì lưới đỏ.

- [x] T3.2 **Ca đã xảy ra thật**: PR #91, một bản vá một dòng, nhận «Độ phủ luật: **1/195**». Sau change,
      cùng dữ liệu ấy đọc thành «Luật có probe neo: 1 đơn vị — <tên luật> (kho luật repo: 195 đơn vị —
      KHÔNG phải mẫu số của độ phủ)»

## Trục nhạy cảm

- [x] T_failclosed ⛔C2 — **trục chính, cùng họ nhưng ngược dấu**: một con số **gợi ra kết luận mà phép đo
      không đỡ được**. ⛔C2 cấm «chưa chứng minh» thành «đã chứng minh»; ở đây là «không đo được điều gì»
      bị bày thành «đo được và kết quả tệ». Cả hai đều là người đọc tin vào thứ dữ liệu không nói
- [x] T_doc_du_lieu_cu — **hình dạng dữ liệu không đổi**: `luat_da_phu` và `luat_tong` giữ nguyên trên
      verdict, nên bản ghi đời cũ đọc y như trước và **không cần đường di trú**. Lưới `doc-du-lieu-cu`
      không phải sửa, và nó vẫn xanh
- [N/A] T_bimat · T_cong · T_khongtincay · T_colap · T_hopdong — không chạm bí mật, cổng, dữ liệu ngoài,
  mức cô lập, hay export mới

## Chạy thật — KHÔNG tick trước khi chạy

- [ ] T7.1 Sau deploy: đọc verdict một lượt chấm code thật, xác nhận thông điệp nêu **tên** đơn vị luật đã
      neo và **không** còn dạng `x/y`. run_id: ____
