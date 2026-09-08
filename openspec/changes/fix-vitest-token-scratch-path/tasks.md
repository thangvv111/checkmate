## Bệnh

Repo đích có phụ thuộc đã cài, ảnh đúng phiên bản, mạng tắt, mọi thứ theo luật — và lượt chấm code **vẫn**
không chạy được một file test nào:

```
Startup Error
Error: Failed to create Vitest API token at
  /home/node/.local/share/vitest/.vitest-secret-token   <- HOME, chan boi --read-only
  or /work/node_modules/.vitest/.vitest-secret-token    <- thu muc phu thuoc, mount :ro
```

Vitest từ bản 4 sinh một token API lúc khởi động và **phải ghi** nó vào một trong hai chỗ. Container chạy
probe khoá cả hai — đúng như luật cô lập yêu cầu. Nó chết **trước** khi nạp file test nào, nên không có
`vitest-out.json`, và engine đọc ra «Runner không xuất JUnit XML» — lại là một thông điệp nói sai bệnh.

Đây **cùng loại** với sự cố `.vite-temp` ngày 07/09, chỉ khác đường: một bộ chạy test cần ghi vào thư mục
phụ thuộc, và mount `:ro` chặn nó. Cơ chế chữa đã có sẵn — `DEPENDENCY_SCRATCH_PATHS` — chỉ thiếu một hàng.

**KHÔNG đổi luật đang khai.** `sandbox-isolation › Không đường ghi nào ra ngoài thư mục của lượt chạy` giữ
nguyên: `node_modules` vẫn `:ro`, lớp phủ vẫn là **tmpfs** (nằm trong bộ nhớ, biến mất cùng container,
không chạm bản clone), danh sách vẫn ĐÓNG và vẫn nằm trong mã. Đây là kéo hiện thực khớp lại luật, nên
dùng schema `checkmate-fix-bug`.

## Đo

Trên prod 07/09, repo `thangvv111/admin-fe` nhánh `accessibility-floor`, dựng đúng khuôn engine dùng
(`git archive` ra thư mục tạm · `node_modules` của clone mount `:ro` · `--read-only` · `--network=none` ·
ba trần tài nguyên):

| ảnh | `.vite-temp` | `.vitest` | kết quả |
|---|---|---|---|
| Node 22 | có | **không** | Startup Error · không có `vitest-out.json` |
| Node 24 | có | **không** | Startup Error · không có `vitest-out.json` |
| Node 22 | có | **có** | **158/158 pass** |
| Node 24 | có | **có** | **158/158 pass** |

⛔ **Hàng thứ ba bác bỏ một kết luận em đã viết vào hồ sơ nhịp hai.** `design.md` của
`dependency-install-in-container` khai «số đo bắt phải làm D3 (bản đồ ảnh)», suy từ việc cảnh báo runtime
vẫn còn sau khi cài. Suy sai: `admin-fe` khai `engines.node: ^24` **chặt hơn mức nó thật sự cần**, và trên
Node 22 nó chạy đủ 158 ca. Bản đồ ảnh vẫn đáng làm, nhưng nó **không phải** thứ chặn lượt chấm code —
thứ chặn là hàng tmpfs này. Đã sửa lại hồ sơ ấy trong cùng change này.

*Vế đáng giữ của cái sai ấy: `checkRuntime` được thiết kế để **cảnh báo chứ không chặn**, đúng vì lý do
«repo khai `engines` chặt hơn mức cần». Số đo vừa rồi là ca thật đầu tiên chứng minh lựa chọn ấy đúng —
nếu nó chặn cứng, `admin-fe` đã bị từ chối oan trong khi test của nó chạy sạch.*

## Việc

- [x] 1.1 Thêm hàng `/work/node_modules/.vitest` vào `DEPENDENCY_SCRATCH_PATHS`, kèm lý do nêu đúng bệnh.
- [x] 1.2 Ca **ghim NỘI DUNG** danh sách (`T1.10b`): T1.10 chỉ so đối số với danh sách, nên xoá một mục vẫn
      xanh — đúng khuôn lưới-xanh-trên-hệ-thống-đã-hỏng. Ca mới ghim hai đường đã đo là hỏng-nếu-thiếu.
- [x] 1.3 Sửa hồ sơ `dependency-install-in-container`: bỏ mệnh đề «số đo bắt phải làm bản đồ ảnh», thay
      bằng số đo thật + lời cải chính. Change ấy chưa merge nên bản sửa nằm **trên nhánh của nó**
      (`dependency-install-in-container`), không nằm ở đây — cùng một nội dung, khác chỗ đặt.
- [x] 1.4 `npx tsc --noEmit && npm test`.
- [ ] 1.5 Deploy, rồi chạy lượt chấm **code** thật trên `admin-fe` PR #8 qua sản phẩm.

## § Sau-merge — nợ có tên

- [ ] 2.1 **Danh sách này sẽ còn thiếu hàng nữa.** Hai hàng đầu đều tìm thấy bằng cách gặp lỗi trên prod,
      không bằng cách đọc tài liệu bộ chạy test. Hướng chữa gốc — cho container một **HOME ghi được**
      (`--tmpfs /home/node` + `HOME`) — đóng cả họ lỗi này thay vì từng đường một, nhưng nó nới bề mặt ghi
      nên phải là một change có trục an toàn riêng, không phải một dòng tiện tay ở đây.
- [ ] 2.2 Ghim phiên bản bộ chạy test của repo đích vào verdict: cùng một commit chấm hai lần bằng hai bản
      vitest có thể ra hai kết quả, và hôm nay không gì ghi lại điều đó.
