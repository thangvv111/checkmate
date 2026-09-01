# Tasks — kiến trúc tầng + đổi tên lớp A

Bốn commit tách bạch (xem `design.md`): di chuyển thuần → đổi tên thuần → lưới → dọn luật.

## 1. Dọn luật đã hết hiệu lực (làm TRƯỚC — nó đang dạy sai mọi agent)

- [x] 1.1 `openspec/config.yaml` mục `context`: bỏ «⛔ HAI TẦNG SPEC — phương án A 31/08» và «chờ
      verdict → PASS mới merge»; thay bằng chỗ-sống-của-luật hiện hành + ghi cổng đang TẠM DỪNG.
      Đây là chỗ nguy nhất trong năm nơi: nó inject vào **mọi artifact của mọi change**.
- [x] 1.2 `openspec/schemas/checkmate/schema.yaml` — instruction artifact `proposal`: ô «Luật R chạm
      tới» đang bắt khai theo phương án A. Sửa cho khớp luật 01/09 (câu trả lời đúng thường là
      «KHÔNG — cố ý» kèm nơi luật sống). Giữ ô này bắt buộc, chỉ đổi nội dung hướng dẫn.
- [x] 1.3 *(grep lộ ra KHÔNG phải một chỗ thứ sáu mà SÁU chỗ nữa — tổng 11: AGENTS+CLAUDE ×2 đoạn, 2 schema, config.yaml, instruction proposal, instruction specs, instruction tasks, template proposal, DEPLOY.md)* Rà nốt: `grep -rn "phương án A\|chờ verdict\|PASS mới merge" openspec/ *.md` — chỗ nào còn
      thì sửa hoặc ghi rõ vì sao giữ. Năm nơi đã biết là AGENTS/CLAUDE, hai schema, config.yaml,
      instruction proposal; grep để lộ chỗ thứ sáu nếu có.

## 2. Commit 1 — DI CHUYỂN thuần (không đổi một ký tự nội dung)

- [x] 2.1 Dời `apps/web/src/paths.ts` xuống tầng nền (`packages/shared/src/`), cập nhật mọi chỗ
      import. Nội dung file giữ NGUYÊN VĂN — commit này phải là rename thuần để `git` nhận ra.
- [x] 2.2 Xác nhận vòng runtime đã đứt: không còn value-import nào từ `apps/web/src/kho/**` lên
      `apps/web/src/*.ts`.

## 3. Commit 2 — ĐỔI TÊN lớp A (không file nào đổi chỗ)

- [x] 3.1 *(bảng ở  — suy từ 10 từ lõi PO chốt)* Chốt bảng ánh xạ tên trước khi sửa: 87 export + định danh nội bộ. Mỗi tên một dòng
      `cũ → mới`, để review đọc được bảng thay vì đọc diff.
- [x] 3.2 Đổi tên theo bảng. Sau mỗi module chạy `npx tsc --noEmit` — trình biên dịch là lưới của
      lớp A, dùng nó liên tục thay vì dồn cuối.
- [x] 3.3 **KHÔNG chạm lớp B**: tên cột SQLite · field trong object bị serialize nguyên khối
      (`RunEvent`, `Verdict`, `Finding`, `probe_stats`, `chi_phi`, `plan` của probe thư viện,
      `config.json`, sổ kiểm nhà cung cấp, kho bí mật).
- [x] 3.4 **KHÔNG chạm lớp C**: khoá `checkmate.yml` mà repo đích khai (`khuon_loi`, `bo_qua_diff`,
      `huong_dan_probe`, `severity_map`, `test_cmd`, `probe_dir`, `probe_ext`, `timeout_s`,
      `framework`, `triggers`).
- [x] 3.5 **Khai lại bảng module trong `checkmate.yml`** theo tên mới (⛔C5). Quên khai thì probe
      chết với «... is not a function» và thành finding sai hẳn bản chất — đã xảy ra 5 lần.

## 4. Commit 3 — Lưới (và chứng minh nó load-bearing)

- [x] 4.1 Test import-graph: duyệt `packages/**/src/**/*.ts` + `apps/**/src/**/*.ts`, phân giải
      import tương đối, xếp tầng theo đường dẫn, đối chiếu ma trận trong `design.md`. Phân biệt
      `import type` với import thường.
- [x] 4.2 Thông điệp khi đỏ phải nêu **file nguồn → file đích, cặp tầng, loại import**. Lưới nói
      «vi phạm kiến trúc» mà không nói ở đâu là báo sai bản chất.
- [x] 4.3 *(đã chạy: hoàn tác việc dời paths.ts → 2 ca ĐỎ đúng chỗ, thông điệp nêu «db.ts [adapter] --IMPORT--> paths.ts [app]»; đã khôi phục)* **Chứng minh lưới load-bearing**: tạm hoàn tác task 2.1, chạy test, thấy nó ĐỎ đúng chỗ,
      rồi làm lại. Lưới chưa từng đỏ là lưới không ai biết nó canh gì.
- [x] 4.4 Test đọc-dữ-liệu-cũ: fixture là **dữ liệu đời thật** — một verdict đã lưu và một sổ thư
      viện probe đã lưu, chép vào `test/fixtures/`. Assert nạp ra đủ trường. KHÔNG dựng object trong
      test làm fixture: object dựng trong test mang tên MỚI nên nó xanh cả khi đã đổi hỏng.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch.
- [ ] 5.2 `npm test` xanh TOÀN BỘ (không riêng file vừa sửa) — lưới hợp đồng repo là ca hay đỏ nhất
      khi đổi export.
- [ ] 5.3 Chạy thử một lượt chấm thật trên repo demo: đổi tên mà pipeline gãy thì `tsc` không bắt
      được (đường `spawn` CLI + đọc file), phải chạy mới biết.

## 6. Sau-merge — nợ có tên, KHÔNG thuộc change này

- [ ] 6.1 Change **đổi tên lớp B/C**: lớp đọc-cả-hai-tên + di trú SQLite + thông báo repo khách.
- [ ] 6.2 Change **tách `RunMeta`/`MucSoCai`** khỏi file ứng dụng → siết ô `type` trong ma trận
      thành cấm.
- [ ] 6.3 **`Storage` port** — hoãn có chủ đích. Mở lại khi có tín hiệu thật: tenant thứ hai, cần
      >1 app server, hoặc yêu cầu chống-lách sổ ở mức DB.
