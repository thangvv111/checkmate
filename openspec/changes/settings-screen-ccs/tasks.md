# Tasks — settings-screen-ccs

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -o 'name="max_probe"[^>]*' apps/web/src/ui.ts          # min="2" max="20"  <- nhan noi 2-12
grep -n 'max_probe: 10' apps/web/src/config.ts              # mac dinh 10       <- goi chot 6
grep -rn "CHECKER_LIB_TRAN" apps/ packages/ --include=*.ts | grep -v probe-library | wc -l  # 0
grep -n "return 100" packages/harness/src/probe-library.ts  # mac dinh 100      <- chu thich noi 40
grep -c 'type="range"' apps/web/src/ui.ts                   # 0
grep -c "repo-row" apps/web/src/ui-repo.ts                  # 1
```

- [x] 0.1 Đúng **1** nguồn (`PROBE_DEPTH`); `max="20"` về **0** chỗ. Đo trên trang đang chạy: slider
      `min=2 max=12 value=6`, và nhãn đọc ra «Số phép thử tối đa mỗi lượt (2–12)» — cùng một cặp số.
- [x] 0.2 `CHECKER_LIB_TRAN` đặt ở **1** chỗ (`agentEnv`), thay vì 0.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/operator-settings/spec.md` — 3 requirement, 8 scenario (đã viết).

## 2. Một nguồn cho khoảng giá trị

- [x] 2.1 `config.ts`: hằng `PROBE_DEPTH = { min: 2, max: 12, mac_dinh: 6 }` và
      `LIBRARY_CAP = { min: 6, max: 200, mac_dinh: 100, goi_de_xuat: 40 }`.
- [x] 2.2 `max_probe` mặc định 10 → `PROBE_DEPTH.mac_dinh`; phép kẹp khi đọc cấu hình dùng cùng hằng.
- [x] 2.3 `ui.ts`: nhãn + `min`/`max` của ô đọc TỪ hằng, không chép tay.
- [x] 2.4 `probe-library.ts`: hằng mặc định và biên kẹp khớp `LIBRARY_CAP`.

## 3. Trần thư viện probe thành trường cấu hình

- [x] 3.1 `AgentConfig.tran_thu_vien`; đọc cấu hình thiếu trường ⇒ `LIBRARY_CAP.mac_dinh` (**100**).
- [x] 3.2 `agentEnv` phát `CHECKER_LIB_TRAN`.
- [x] 3.3 `ui.ts`: ô số + hint nói **cả hai**: gói đề xuất 40, và hạ trần thì đào thải probe đang có.
- [x] 3.4 `server.ts` nhận và lưu trường.

## 4. Giao diện theo gói

- [x] 4.1 `ui.ts`: slider độ sâu + `<output>` hiện số; tắt script vẫn gửi được giá trị.
- [x] 4.2 `ui-repo.ts`: card grid `330px min` — `owner/repo` mono · chip trực · chip chìa · nhánh đích ·
      token che · **lần chấm cuối** · nút.
- [x] 4.3 Repo thiếu chìa riêng: **banner** semantic, không phải một dòng chữ lẫn trong card.
- [x] 4.4 `ui-provider.ts`: «đã ngừng» dùng ramp trung tính.
- [x] 4.5 `server.ts`: truyền «lần chấm cuối» của từng repo (đọc bảng `run`, không gọi mạng).

## 5. Lưới

- [x] 5.1 Một nguồn: nhãn, `min`/`max` ô nhập, và phép kẹp cùng đọc `PROBE_DEPTH`.
- [x] 5.2 Mặc định nằm TRONG khoảng.
- [x] 5.3 Giá trị ngoài khoảng bị kẹp về biên của CHÍNH khoảng ấy.
- [x] 5.4 Cấu hình đời cũ thiếu `tran_thu_vien` ⇒ đọc ra 100, KHÔNG ra 40.
- [x] 5.5 `agentEnv` phát `CHECKER_LIB_TRAN` đúng giá trị.
- [x] 5.6 Ô trần thư viện nói **cả hai** vế: con số gói đề xuất, và cái mất khi hạ.
- [x] 5.7 «Đã ngừng» không dùng `--fail`; repo thiếu chìa VẪN dùng semantic *(vế đối chứng)*.
- [x] 5.8 Card grid: có `owner/repo`, nhánh đích, token che, lần chấm cuối; repo chưa chấm lần nào không
      hiện ngày bịa.

## 6. Mutation — mỗi chiều HAI lần, CHẠY NỀN, so với bản chụp

- [x] 6.1 Chép tay `max="20"` trở lại thay vì đọc hằng → ca ĐỎ.
- [x] 6.2 Mặc định `tran_thu_vien` thành 40 → ca ĐỎ *(đúng chiều hại: đào thải probe prod)*.
- [x] 6.3 Bỏ `CHECKER_LIB_TRAN` khỏi `agentEnv` → ca ĐỎ.
- [x] 6.4 Bỏ vế «hạ trần thì mất gì» ở hint → ca ĐỎ.
- [x] 6.5 Phép kẹp dùng biên của khoảng KHÁC → ca ĐỎ.
- [x] 6.6 «Đã ngừng» quay về `--fail` → ca ĐỎ.
- [x] 6.7 Bỏ «lần chấm cuối» khỏi card → ca ĐỎ.
- [x] 6.8 **6.5 ĐÃ SỐNG SÓT ở lượt đầu** (kẹp `max_probe` bằng `LIBRARY_CAP` mà ca vẫn xanh). Đọc theo
      bảng ba đường: đột biến vào đĩa và gỡ đúng gác ⇒ đường thứ nhất, **ca không load-bearing** — ca cũ
      chỉ kiểm HÀM kẹp, không kiểm ĐƯỜNG ĐỌC dùng khoảng nào. Kẹp bằng khoảng sai vẫn cho ra một số
      hợp lệ trông bình thường, nên không gì nổ và không ai thấy. Thêm hàm quét `scanRangeMismatch`
      (mỗi trường phải kẹp bằng khoảng CỦA CHÍNH NÓ) kèm cặp fixture; chạy lại 8 chiều →
      **8/8 GIẾT cả hai lượt**.

## 7. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 7.1 Dựng thật ở 1400px: card grid **2 card/hàng**, mỗi card có `owner/repo` mono · chip ĐANG CHỌN
      (accent) · chip TRỰC (jade) · chip chìa · nhánh đích · chìa riêng đã che · lần chấm cuối.
      Repo chưa chấm hiện «chưa chấm lần nào», không bịa ngày. Slider hiện số 6 cạnh nó.
- [x] 7.2 Repo `repo-chua-co-chia` có banner nền crimson-tint, viền trái 3px, chữ đậm — thấy ngay ở
      khoảng cách đọc bình thường, khác hẳn dòng chữ nhỏ của bản cũ.
      Đo thêm bằng máy thay vì chỉ nhìn: `getComputedStyle` trên trang đang chạy trả
      slider `{type:range, min:2, max:12, value:6}` · trần `{type:number, min:6, max:200, value:100}` ·
      hint đủ **cả hai** vế («gói đề xuất 40» và «hạ trần sẽ ĐÀO THẢI probe đang có»).

## 8. Nợ có tên

- [x] 8.1 Ghi nợ «PR chờ trên card Cấu hình» vào `named-debts`, kèm điều kiện mở lại (có bộ đệm số PR chờ
      đọc được không cần gọi mạng).

## 9. Kiểm cơ học

- [x] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 9.2 `npx openspec validate --changes` xanh.
- [x] 9.3 ⛔C5 — export mới khai `checkmate.yml`.
- [x] 9.4 `DEPLOY.md`: nói về trần thư viện probe và hệ quả của việc hạ nó.
