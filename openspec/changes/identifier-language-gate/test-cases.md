# Test cases — identifier-language-gate

Requirement: R-1 «Định danh cấp module viết tiếng Anh, và luật này được lưới cưỡng chế» · R-2 «Danh sách
miễn trừ là danh sách CHO PHÉP, đóng băng, mỗi dòng có lý do».

Lưới mới: `test/identifier-language.test.ts`.

## R-1 — lưới bắt đúng thứ cần bắt

- [ ] T1.1 [bắt được cái đã biết] Chạy phép quét trên `main` **trước** khi đổi tên → trả về đúng 10 tên:
      `laTriggerHopLe` · `lyDoNgoaiRepo` · `lyDoKhongPhaiThuMuc` · `laThuMucQuyTrinh` · `TRAN_SONG_SONG` ·
      `HOI_QUY` · `NOI_DUOC_DIEU_GI` · `TrangThaiProbe` · `UngVienToiThieu` · `loiSinhLaiKhongBangChung`.
      *Đây là ca load-bearing của cả change: không bắt được 10 cái đã biết thì lưới không gác gì.*
- [ ] T1.2 [repo sạch] Sau khi đổi tên và ghi allowlist, phép quét trên `main` trả về **rỗng**.
- [ ] T1.3 [thông điệp dùng được] Khi đỏ, thông điệp nêu **tên** và **file** — không chỉ nói «có vi phạm».
      Người đọc phải sửa được mà không cần chạy lại phép quét bằng tay.
- [ ] T1.4 [biến cục bộ ngoài phạm vi] Một dòng `  const soLuong = 0;` (có thụt đầu dòng) KHÔNG làm đỏ.
- [ ] T1.5 [giá trị chuỗi ngoài phạm vi] Chuỗi `'hoi_quy'`, `'vi_pham_luat_moi'` trong code KHÔNG làm đỏ —
      chúng là dữ liệu đã ghi trong sổ, không phải định danh.

## R-1 — lưới KHÔNG bắt nhầm (dương tính giả)

- [ ] T2.1 [doc = document] `API_DOC_CANDIDATES` · `PROCESS_DOC_DIRS` · `getDocExamples` · `runDocSkill`
      XANH mà không cần nằm trong allowlist.
- [ ] T2.2 [chat = chat] `ChatCompletionsProvider` xanh.
- [ ] T2.3 [âm trùng khác] Ít nhất một tên tiếng Anh chứa `so`/`la`/`tu`/`mo` xanh — ba âm này đã bị loại
      khỏi từ điển vì trùng từ tiếng Anh thông dụng.

## R-2 — danh sách miễn trừ

- [ ] T3.1 [miễn có hiệu lực] Một tên trong allowlist (ví dụ `chuanMuc`) không làm lưới đỏ.
- [ ] T3.2 [dòng thiếu lý do] Allowlist có dòng không kèm lý do → lưới ĐỎ. *Không có ca này thì danh sách
      biến thành cửa hợp thức hoá, và lưới còn tệ hơn không có vì nó tạo cảm giác đang được gác.*
- [ ] T3.3 [không nới cho tên mới] Số mục allowlist bằng đúng con số đóng băng (89); mọi dòng thêm sau phải
      đi qua review của người, không tự động.

## Mutation (load-bearing)

- [ ] T4.1 Bỏ phép đối chiếu allowlist → lưới đỏ ở repo sạch (allowlist đang che 89 tên thật).
- [ ] T4.2 Bỏ lọc âm trùng tiếng Anh khỏi từ điển → T2.1 phải ĐỎ (6 dương tính giả quay lại).
- [ ] T4.3 Đổi regex cột 0 thành khớp cả dòng thụt → T1.4 phải ĐỎ.

## Trục nhạy cảm

- [N/A] T_bimat — lưới đọc tên định danh trong source repo này, không chạm bí mật, không chạm repo đích.
- [ ] T_failclosed — T1.1: lưới phải bắt được cái đã biết. Một lưới quét mà không tìm thấy gì có thể vì
      repo sạch, cũng có thể vì phép quét hỏng; T1.1 phân biệt hai ca đó.
- [N/A] T_cong — không đụng cổng merge, không đụng verdict.
- [N/A] T_khongtincay — không đọc dữ liệu ngoài.
- [ ] T_hopdong — 10 tên đổi phải khai lại vào `checkmate.yml` bảng module; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Đọc mắt 89 dòng allowlist: mỗi dòng có phải code cũ thật không, hay có cái nào là vi phạm sau
      01/09 bị lọt vào diện miễn. Máy không phân biệt được «cũ» với «mới mà đã lỡ», chỉ `git log -S` mới
      biết — và 10 cái đã tra bằng cách đó.
