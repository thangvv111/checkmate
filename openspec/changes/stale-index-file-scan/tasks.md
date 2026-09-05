# Tasks — stale-index-file-scan

## 0. Triệu chứng và nguyên nhân

**Triệu chứng** (đo được **hai lần trong cùng ngày 05/09**: archive `empty-repo-list-is-a-real-state` và
archive `probe-library-screen`, rồi lần thứ ba ở `history-filter-layout`):

```
FAIL  test/r-rules-map.test.ts > không con trỏ mồ côi …
Error: ENOENT: no such file or directory, open '…/openspec/changes/<change>/.openspec.yaml'
```

**Nguyên nhân:** lưới lấy danh sách file từ `git ls-files --cached --others` rồi `readFileSync` **từng
file mà không hỏi nó còn trên đĩa không**. `openspec archive` **DỜI** cả thư mục change sang
`changes/archive/`, nên giữa lúc dời và lúc commit, chỉ mục git còn trỏ vào đường cũ.

Nó không phải lỗi của lưới về mặt luật — luật «mọi mã R trích trong repo có hàng» vẫn đúng. Nó là một
**giả định ngầm**: «git nói file tồn tại thì nó tồn tại». Giả định ấy sai ở đúng một khoảnh khắc, và
khoảnh khắc ấy lặp lại ở **mọi lần archive**.

**Cái giá:** mỗi lần archive tốn một lượt chẩn đoán, và triệu chứng (`ENOENT` giữa một lượt `npm test`
đang xanh) nhìn như **lưới hỏng** chứ không như «chỉ mục lệch đĩa» — tức nó dẫn người đọc đi sai hướng.

## 1. Đếm bề mặt bằng máy

```bash
git ls-files -c -o --exclude-standard | grep -Ei "\.(ts|js|md|yml|yaml|json|txt)$" | wc -l   # 566  <- SAI, xem 1.2
git ls-files -c -o --exclude-standard | grep -Ei "\.(ts|js|md|yml|yaml|json|txt)$" \
  | grep -vE '^docs/archive/r-rules/|^docs/r-rules-map\.md$|^openspec/changes/archive/' | wc -l   # 245
grep -rln "ls-files" test/*.ts                    # 3 luoi
```

- [x] 1.1 Trong ba lưới dùng `git ls-files`, chỉ **một** (`r-rules-map`) thật sự ĐỌC NỘI DUNG từng file;
      hai lưới kia (`deploy-bundle`, `hop-dong-repo`) chỉ dùng **tên**. Bẫy nằm ở đúng một chỗ.
- [x] 1.2 ⛔ **Lần đếm đầu SAI: 566.** Nó đếm trước khi trừ `KHONG_QUET` (bản gốc archive · chính bảng tra
      · change đã archive) — tức đếm bề mặt của một lưới KHÁC với lưới đang sửa. Số thật lưới đọc: **245**,
      đo bằng chính thông điệp của gác chống-mù (nâng sàn lên 100000 rồi đọc con số nó in ra), không đo
      bằng một script riêng — script riêng đo một thứ khác và đó đúng là cách sinh ra con số 566.
- [x] 1.3 Trong 245 file ấy chỉ **6** thuộc change đang mở ⇒ archive làm số này **giảm**, không tăng. Sàn
      phải chừa biên theo chiều giảm.

## 2. Sửa — và KHÔNG được sửa bằng cách bớt phủ trong im lặng

- [x] 2.1 Tách một hàm thuần: nhận danh sách đường dẫn + phép đọc + phép hỏi-tồn-tại, trả về
      `{ daDoc, boQua }` — file không còn trên đĩa thì **bỏ qua VÀ ĐẾM**, không ném.
- [x] 2.2 ⛔ **Gác chống-mù:** số file thật sự đọc được phải trên một sàn. Bỏ qua file vắng mặt là làm
      phép quét bớt phủ; nếu vì lý do nào đó cả danh sách thành vắng mặt (sai thư mục làm việc, `git`
      trả rỗng) thì lưới sẽ **xanh mà không quét gì** — đúng lỗi lưới loại 1.
- [x] 2.3 Thông điệp khi gác đỏ phải nói **số đọc được / số bỏ qua**, để người đọc phân biệt «chỉ mục
      lệch đĩa» với «phép quét mù».

## 3. Lưới

- [x] 3.1 `test/stale-index-file-scan.test.ts`: hàm thuần bỏ qua file vắng mặt và ĐẾM đúng.
- [x] 3.2 Ca gác chống-mù: danh sách toàn file vắng mặt → hàm khai rõ, và lưới gọi nó phải ĐỎ.
- [x] 3.3 Ca đối chứng: danh sách bình thường → không bỏ qua gì.
- [x] 3.4 Ca hồi quy: lưới `r-rules-map` vẫn bắt được mã mồ côi như trước (không bớt phủ).

## 4. Mutation — mỗi chiều HAI lượt

- [x] 4.1 Bỏ gác chống-mù (`if (true) return []`) → 2 ca ĐỎ. Hai lượt, cùng kết quả.
- [x] 4.2 Bỏ qua mà KHÔNG đếm (`boQua.push(p)` → `void p`) → 5 ca ĐỎ. Hai lượt, cùng kết quả.
- [x] 4.2b Bỏ `try/catch` (quay lại đúng lỗi cũ) → 6 ca ĐỎ. Hai lượt, cùng kết quả.
- [x] 4.3 Đột biến sống sót → bảng ba đường. **Không đột biến nào sống sót**, nên không phải mở bảng. Cả
      ba lần đều in `DA-AP-DUNG` và `grep -c` xác nhận chuỗi mới có trên đĩa — không rơi vào hàng «đột
      biến không áp dụng được».

## 5. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 5.1 **Tái hiện đúng cảnh:** dời một thư mục đang được git theo dõi rồi chạy `npm test` NGAY khi
      chưa commit — lưới phải XANH, không `ENOENT`.
- [x] 5.2 Chạy `npm test` ở trạng thái bình thường: vẫn xanh, và số file đọc được đúng cỡ **245**, bỏ qua **0**.

## 6. Kiểm cơ học

- [x] 6.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 6.2 `npx openspec validate --changes` xanh.
