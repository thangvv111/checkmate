## Context

Sandbox chạy code repo đích trong container podman: `--read-only` rootfs, `--tmpfs /tmp`, thư mục lượt
chạy mount `:Z,U` (ghi được), `node_modules` của bản clone mount `:ro,Z`. Mạng tắt, ba trần tài nguyên.

Bộ chạy test của repo đích (vitest) nạp `vitest.config.ts` bằng cách **bundle nó ra một file tạm** rồi
`import` file ấy. Vite đặt file tạm ở `node_modules/.vite-temp` — bên trong đúng thư mục đang `:ro`.

**Đo trên prod 07/09**, podman dựng tay với cùng ảnh, cùng ba trần, cùng bộ mount như engine:

| | lệnh | kết quả |
|---|---|---|
| A | như hiện nay | `ENOENT: no such file or directory, mkdir '/work/node_modules/.vite-temp'` |
| B | thêm `--tmpfs /work/node_modules/.vite-temp` | `JUNIT report written to /work/out-b.xml` |

Bối cảnh sự cố: lượt code cuối thành công là PR #7 (26/08), trước khi `container-isolated-probe-runs`
archive (05/09). Giữa hai mốc không lượt code nào chạy tới bước sandbox, nên hồi quy lộ ra muộn — mãi tới
07/09 khi chạy lượt thật cho change `finding-cap-and-density-standard`.

## Goals / Non-Goals

**Goals**
- Lượt chấm code chạy lại được, không nới cô lập quá mức cần thiết.
- Danh sách đường ghi được là **đóng, trong mã, mỗi mục một lý do**.
- Lưới bắt được cả hai chiều hỏng: thiếu mount (lượt code chết) và mount quá tay (nới sai chỗ).

**Non-Goals**
- **Không** đổi `--read-only`, `:ro` của `node_modules`, `--network=none`, ba trần tài nguyên, `:Z,U`.
- **Không** sửa `vitest.config.ts` của repo đích — CheckMate phục vụ nhiều đội, đẩy chi phí sang N đội là
  sai hướng.
- **Không** cho repo đích khai thêm đường ghi qua `checkmate.yml` (xem D2).
- Không đụng `detectIsolation` (nợ #29 riêng: nó hỏi câu yếu hơn yêu cầu thật).

## Decisions

**D1 — `tmpfs`, không phải bind `:rw`.** Cả hai đều làm vite ghi được. Khác nhau ở hậu quả khi hỏng: bind
`:rw` cho code repo đích ghi ra **đĩa của bản clone**, tức sửa được thư viện của chính nó giữa hai nhánh và
làm hỏng phép đối chứng — đúng thứ luật cô lập sinh ra để chặn. `tmpfs` nằm trong bộ nhớ, biến mất cùng
container, không chạm bản clone. Chọn đường có hậu quả nhẹ hơn khi hỏng, cùng nguyên tắc đã dùng để chọn
`U` thay vì `--userns=keep-id`.

**D2 — Danh sách ĐÓNG trong mã, không phải khoá cấu hình.** Cám dỗ là cho repo đích khai
`standards`-kiểu danh sách đường ghi. Loại: thứ chạy trong sandbox là code của **bên bị chấm** (⛔C4), nên
để bên ấy tự khai đường ghi là trả lại đúng thứ vừa lấy đi. Hằng `DEPENDENCY_SCRATCH_PATHS` nằm cạnh
`buildContainerArgs`, mỗi mục có trường `ly_do` — lưới bắt mục thiếu lý do.

**D3 — Chỉ phủ khi CÓ thư mục phụ thuộc.** Không có `node_modules` thì không có gì để phủ, và một mount
thừa là một bề mặt thừa. Ca T1.11 khoá vế này.

**D4 — Phải MODIFIED luật, không được vá lặng lẽ.** Requirement cũ khai `node_modules` chỉ đọc **không
ngoại lệ**, và có scenario «ghi vào đó thất bại». Thêm tmpfs làm câu ấy không còn đúng nguyên vẹn. Sửa code
mà không sửa luật là để lại một spec nói dối — đúng kiểu mà cả sản phẩm này tồn tại để chống. PO chốt sửa
luật ngày 07/09.

**D5 — Không tự nới `node_modules` thành `:rw` kể cả khi tiện.** Ghi thẳng vào Non-Goals vì đây là đường
tắt hấp dẫn nhất khi ai đó gặp lỗi tương tự ở gói khác.

## Architecture

```
packages/harness/src/sandbox.ts
  DEPENDENCY_SCRATCH_PATHS   <- DANH SACH DONG, moi muc { path, ly_do }
        |
  buildContainerArgs(spec)
        ...
        -v <thuMucChay>:/work:Z,U                        (ghi duoc — cho duy nhat)
        if (spec.thuMucPhuThuoc):
           -v <phuThuoc>:/work/node_modules:ro,Z         (CHI DOC — khong doi)
           --tmpfs /work/node_modules/.vite-temp         (lop phu tam, trong RAM)
        -w /work <anh> <lenh>
```

Không tầng nào khác đổi. `apps/web` không chạm; `skill-code` không chạm.

## Data Model

N/A — change không thêm/đổi dữ liệu trên đĩa, không đụng sổ cái, không đổi hình dạng verdict. Lớp phủ nằm
trong bộ nhớ của container và biến mất cùng nó.

**Ghi file dùng chung:** N/A. **Cache:** N/A. **Không gọi model trong khoá:** N/A.

## Bề mặt đã ĐẾM BẰNG MÁY (luật tầng 2)

```bash
grep -c -- "--tmpfs" packages/harness/src/sandbox.ts        # 2: '/tmp' co san + vong lap danh sach dong
grep -c -- "-v'" packages/harness/src/sandbox.ts            # 2 cho push bind: thuMucChay + node_modules
grep -n "DEPENDENCY_SCRATCH_PATHS" packages/harness/src/sandbox.ts test/sandbox-isolation.test.ts
#   1 dinh nghia + 1 cho dung trong buildContainerArgs + 4 cho trong luoi
grep -c "buildContainerArgs" test/sandbox-isolation.test.ts # so ca chot doi so
```

⚠ Bề mặt **không** đếm được bằng grep: hành vi thật của podman khi mount tmpfs lên đường con của một bind
`:ro`. Thứ tự mount và cách runtime xử lý chồng lấn là chi tiết của podman, không của mã này — nên nó phải
được kiểm bằng **chạy thật**, và `test-cases.md` có mục ấy, không tick trước khi chạy.

## Risks / Trade-offs

- **Phụ thuộc chi tiết nội bộ của vite** (`node_modules/.vite-temp`). Vite đổi chỗ đặt file tạm thì mount
  thành vô dụng và lượt code hỏng lại. → Fail-closed (lượt lỗi, không PASS); lỗi nêu đúng đường; ca chạy
  thật trong `test-cases.md` là chỗ bắt.
- **Một mục trong danh sách trỏ ra ngoài `node_modules`** sẽ nới đúng thứ luật cấm mà vẫn trông vô hại.
  → Ca T1.12 khoá tiền tố đường; ca T1.13 khoá «là tmpfs, không phải bind».
- **Người sau gặp lỗi tương tự ở gói khác và nới `:rw` cho nhanh.** → D5 ghi thẳng vào Non-Goals; scenario
  «ghi vào phụ thuộc thật vẫn thất bại» là chỗ lưới đỏ nếu ai làm thế.
- **Repo đích không có `node_modules`** thì lượt code vẫn hỏng — bằng lỗi khác (`EAI_AGAIN`). Change này
  không sửa vế ấy; nó là việc vận hành, ghi vào `DEPLOY.md`.

## Migration Plan

Không có dữ liệu để di trú. Đường lùi: gỡ vòng lặp `--tmpfs` khỏi `buildContainerArgs` là quay về hành vi
cũ ngay lượt chạy kế tiếp — không trạng thái nào còn lại.

## Open Questions

- Không có câu hỏi chặn apply. Việc «clone repo đích phải có `node_modules`» ghi vào `DEPLOY.md` ở task 4.1.
