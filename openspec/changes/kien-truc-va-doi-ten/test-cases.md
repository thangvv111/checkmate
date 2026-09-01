# Test cases — kiến trúc tầng + đổi tên lớp A

## Lưới kiến trúc

- [ ] T1.1 Ma trận tầng khai đủ mọi tầng có thật trong repo; tầng nào có file mà không có ô trong ma
      trận thì test ĐỎ. Khoá chuyện «thêm thư mục mới rồi quên khai» — im lặng bỏ qua một tầng là
      lưới nói xanh về vùng nó chưa từng nhìn.
- [ ] T1.2 [reproduce] Value-import ngược adapter → app bị bắt: tạm dựng một import vi phạm trong
      fixture (hoặc hoàn tác task 2.1) THEN test ĐỎ và thông điệp nêu đủ **file nguồn → file đích,
      cặp tầng, loại import**.
- [ ] T1.3 **Type-import ngược adapter → app KHÔNG bị bắt** — vế đối chứng. Thiếu ca này thì một bản
      vá «cấm hết mọi import ngược» cũng xanh, và nó sẽ ép đợt tách file mà change này cố ý hoãn.
- [ ] T1.4 Tầng nền import bất kỳ tầng nào khác — kể cả `import type` — thì ĐỎ.
- [ ] T1.5 `engine` import `adapter` thì ĐỎ. Hôm nay chưa có cạnh nào; ca này giữ trước khi mất.
- [ ] T1.6 Trạng thái hiện tại của repo XANH — sau task 2.1 thì mọi import thật đều hợp ma trận.

## Lưới đọc-dữ-liệu-cũ (canh lớp B)

- [ ] T2.1 [reproduce] Nạp fixture **verdict đời thật** (chép từ `runs/` trước đợt đổi tên): mọi
      trường đọc ra đủ — `result`, `findings[]` với `title_vi`/`what_vi`/`consequence_vi`/`evidence`,
      `probe_stats` với `ke_hoach`/`ghi_nhan`/`luat_da_phu`/`that_lac`, `chi_phi`.
      *(đỏ trước fix nếu ai đó đổi nhầm một field lớp B)*
- [ ] T2.2 [reproduce] Nạp fixture **sổ thư viện probe đời thật**: mỗi probe đọc ra đủ `ten`,
      `sha_sinh`, `luc`, `hash`, `lich_su`, và `plan` với `id`/`ten`/`muc_dich`/`spec_rule`/`ky_vong`.
      Đây là bẫy `KeHoachProbe` nửa-A-nửa-B.
- [ ] T2.3 Fixture phải là **file dữ liệu cũ chép vào**, không phải object dựng trong test — có ca
      đọc từ đĩa để chứng minh điều đó. Object dựng trong test mang tên MỚI nên nó xanh cả khi đã
      đổi hỏng; đó là test mồ côi, không phải lưới.
- [ ] T2.4 Cột SQLite: mở một cơ sở dữ liệu dựng theo schema đời trước, đọc ra đủ hàng. Cùng khuôn
      với lưới di trú đã có.

## Lân cận — cửa song sinh của đợt đổi tên

- [ ] T3.1 Bảng module trong `checkmate.yml` khai đúng mọi export sau khi đổi tên: lưới hợp đồng repo
      hiện có phải XANH. (⛔C5 — đã bắt hụt 5 lần; đây là cửa hay quên nhất khi đổi export.)
- [ ] T3.2 Lưới đồng bộ `AGENTS.md` ↔ `CLAUDE.md` vẫn xanh sau khi sửa luật ở task 1.x.
- [ ] T3.3 Không còn chuỗi «phương án A» / «chờ verdict» trong `openspec/` — ca đọc file thật, khoá
      task 1.3 để chỗ thứ sáu (nếu có) không lọt.

## Trục nhạy cảm (đổi tên chạm đường quyết định verdict)

- [ ] T4.1 Tiêu cực: bảng chân trị phân loại probe cho ra **cùng nhãn như trước** trên cùng đầu vào —
      chạy lại bộ ca phân loại hiện có, không được xanh nhờ đổi kỳ vọng.
- [ ] T4.2 Tiêu cực: sàn severity và verdict nhị phân không đổi — FAIL vẫn ⟺ có ≥1 finding high.
- [ ] T4.3 Một lượt chấm thật trên repo demo chạy trọn pipeline: `tsc` không bắt được đường `spawn`
      CLI và đường đọc file theo tên, phải chạy mới biết.

## Chạy

`npx tsc --noEmit` + `npm test` toàn bộ, rồi một lượt chấm thật trên repo demo (T4.3).
