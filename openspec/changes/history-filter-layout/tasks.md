# Tasks — history-filter-layout

## 0. Triệu chứng và nguyên nhân

**Triệu chứng** (PO báo 05/09, kèm ảnh màn Lịch sử chạy trên prod): khối lọc vỡ — mọi ô xếp **dọc**, dồn
sát **mép phải**, chừa một mảng nền xám lớn bên trái. Ô «Tìm (tiêu đề · SHA · số PR)» chiếm cả một hàng
riêng. Bảng kết quả bên dưới vẫn đúng.

**Nguyên nhân — hai câu lệnh đúng đặt cạnh nhau thành một cái sai:**

```
.card { display:flex; flex-direction:column; … }              ← ui.ts, thêm lúc đồng bộ gói CCS
<form class="card" style="display:flex;…;align-items:flex-end">  ← ui-history.ts
```

Form khai lại `display:flex` nhưng **không khai lại `flex-direction`**, nên nó thừa hưởng `column` từ
`.card`. Trong container dọc, `align-items:flex-end` nghĩa là **dồn phải** (không phải căn đáy như ý định),
và `flex:1` trên ô tìm kiếm nở theo chiều **dọc** thay vì chiều ngang. Ba thuộc tính viết cho một hàng
ngang, chạy trong một cột dọc.

Đây là hồi quy im lặng của đợt đồng bộ gói design: `.card` trước đó không có `flex-direction`.

## 1. Đếm bề mặt bằng máy

```bash
grep -rno 'class="card"[^>]*display:flex[^"]*' apps/web/src/*.ts            # 1 — chi ui-history.ts
grep -rc  'class="card"[^>]*display:flex[^"]*flex-direction' apps/web/src/  # 0 — khong cho nao khai lai
```

- [x] 1.1 Xác nhận **đúng một** chỗ dính, không phải cả họ. Các form lọc khác (`ui-trust.ts`, sổ cái)
      không dùng `.card` nên không thừa hưởng gì.

## 2. Sửa

- [x] 2.1 Khối lọc có **class riêng** `.loc-bar` khai thẳng `display:flex; flex-direction:row; flex-wrap:wrap;
      align-items:flex-end`, thay vì dựa vào `.card` rồi ghi đè lắt nhắt.
- [x] 2.2 Bỏ chuỗi style nội tuyến dài khỏi thẻ `<form>` — layout thuộc về bảng kiểu, không thuộc markup.
- [x] 2.3 Ô tìm kiếm giữ `flex:1; min-width:180px` để nó nở theo chiều NGANG khi còn chỗ.
- [x] 2.4 Hẹp màn: khối lọc xếp dọc là **đúng** ở dưới 720px — khai bằng media query, không để nó xảy ra
      do tai nạn thừa kế.

## 3. Lưới — chặn đúng cái bẫy, không chỉ đúng ca này

- [x] 3.1 `test/history-filter-layout.test.ts`: mọi phần tử mang `class="card"` **và** khai `display:flex`
      nội tuyến thì **phải** khai luôn `flex-direction` — quên là đỏ. Cặp fixture.
      *(Đây mới là thứ chặn được lần sau. Sửa mỗi ui-history.ts thì cái bẫy vẫn nằm nguyên cho người kế tiếp.)*
- [x] 3.2 Ca khoá khối lọc dựng ra hàng NGANG: có `.loc-bar`, và class ấy khai `flex-direction:row`.
- [x] 3.3 Ca khoá ô tìm kiếm vẫn `flex:1` (nó là ô co giãn duy nhất của hàng).

## 4. Mutation — mỗi chiều HAI lượt

- [x] 4.1 Gỡ `flex-direction:row` khỏi `.loc-bar` → ca ĐỎ.
- [x] 4.2 Trả khối lọc về `class="card"` + `display:flex` nội tuyến không kèm hướng → ca ĐỎ.
- [x] 4.3 Đột biến sống sót → bảng ba đường.

## 5. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 5.1 Dựng màn Lịch sử với dữ liệu thật, mở bằng mắt: khối lọc là MỘT HÀNG NGANG, không mảng xám thừa.
- [x] 5.2 Thu hẹp: ở **700px** khối lọc xếp dọc và KHÔNG phần tử con nào tràn khỏi nó
      (`con_tran_khoi_bar: []`). Ở **375px** khối lọc vẫn không tràn (mép phải 343 < 375) — nhưng **trang
      cuộn ngang vì thứ khác**: header của vỏ app (`div.hd-menu`, nút tài khoản) đẩy tài liệu ra 685px.
      Đó là lỗi CÓ SẴN của vỏ, không do change này, và không sửa ở đây. Ghi nợ #23.

## 6. Kiểm cơ học

- [x] 6.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 6.2 `npx openspec validate --changes` xanh.

## § Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 6.3 Rà **toàn bộ** chỗ dùng `.card` xem còn chỗ nào thừa hưởng `flex-direction:column` ngoài ý muốn
      mà mắt chưa nhìn ra (card không khai `display:flex` nội tuyến vẫn có thể đang xếp dọc oan). Việc ấy
      cần đọc từng màn bằng mắt trên trình duyệt, không quét được bằng chuỗi — nên nó là một lượt rà riêng.

## 7. Kết quả đo

**Mutation 2/2 chiều bị bắt**, mỗi chiều hai lượt: gỡ `flex-direction:row` khỏi `.loc-bar` → 1/1 ĐỎ ·
trả khối lọc về `class="card"` + `display:flex` không kèm hướng → 2/2 ĐỎ *(chiều này đỏ ở CẢ hai ca —
ca riêng của màn và ca chặn cái bẫy, đúng ý)*.

**Kiểm tay — đo bằng số trên trình duyệt thật**, không nheo mắt vào ảnh:

| bề rộng | `flex-direction` | xếp | tràn |
|---|---|---|---|
| 1400px | `row` | hàng 1: sáu ô lọc · hàng 2: ô tìm + nút Lọc | không |
| 700px | `column` (media query) | dọc, mỗi ô một hàng | không |
| 375px | `column` | dọc | khối lọc **không** tràn; trang cuộn ngang vì header vỏ app (nợ #23) |

Một phép đo của em SAI ở lượt đầu và đáng ghi lại: em đếm số hàng bằng cách gom `top` của các ô, ra
«4 hàng» — nhưng `align-items:flex-end` làm các ô khác chiều cao có `top` khác nhau **trong cùng một
hàng**. Đếm lại bằng mép ĐÁY mới ra đúng 2 hàng. Suýt nữa thì em báo một lỗi không có thật.
