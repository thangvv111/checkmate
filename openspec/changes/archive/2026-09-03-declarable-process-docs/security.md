# Security — declarable-process-docs

Change này thêm một khai báo của repo đích **nới** phía tài liệu — hướng nguy hiểm của router. Toàn bộ
rủi ro nằm ở đó, và ba gác của D2 là câu trả lời.

## S1. Bí mật & rò rỉ

- N/A S1.1 Không giá trị bí mật nào đi qua; router chỉ đọc tên file và mẫu thư mục.
- ✅ S1.2 Mẫu bị từ chối được in vào log định tuyến (bề mặt nội bộ), không ra comment PR. Lỗi cú pháp
  `checkmate.yml` vẫn chỉ in dòng đầu qua `loiCuPhapAnToan` (`packages/shared/src/spec-source.ts:138-141`).
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge; không chạm `gate.ts`.
- N/A S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Mẫu `process_docs` đến từ `checkmate.yml` của repo đích — DỮ LIỆU. Nó chỉ được đem **so tiền tố
  tên file**, không chạy, không vào prompt. Khác `sources.specs` ở một điểm phải nói rõ: `specs` khai đè
  chỉ SIẾT được router (thêm file bị coi là luật), còn `process_docs` NỚI được — nên nó có ba gác riêng
  (D2), trong khi `specs` không cần.
- ✅ S4.2 Router đọc `checkmate.yml` từ **bản clone trên đĩa** (`fetchAndRoute`, `apps/web/src/github.ts:419`),
  không từ nhánh PR; và PR đổi `checkmate.yml` luôn bị kéo về code trước khi mẫu có tác dụng.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không file mới trên đĩa.
- N/A S6.2 Không ghi.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Mọi nhánh không chắc rơi về **mặc định `openspec/`**, không rơi về «mọi thứ là tài liệu»: tham
  số vắng/méo (T4.1), mẫu bị loại hết (T2.3, T3.4), `checkmate.yml` hỏng (`readSourcesCfg` trả null).
  Không nhánh nào làm router rộng tay hơn hôm nay khi thiếu dữ liệu.
- N/A S7.2 Không chạm phân loại probe.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **đưa một PR có mã thực thi đi đường doc** (không probe nào chạy → xanh giả). Mọi đường và gác:

- ✅ S8.1 (a) khai `process_docs` rộng vô tình (`**`, `*`, `/`) → gác tầng-thư-mục từ chối, rơi về mặc định
  (T2.3, T3.4); (b) đặt mã nguồn trong thư mục đã khai (`rfcs/tool.ts`) → đuôi là hằng của engine, repo
  KHÔNG khai đè được → code (T3.2); (c) khai chồng lên nguồn spec để né probe cho PR sửa luật → nguồn spec
  thắng, thứ tự kiểm không đổi (T3.3); (d) khai `process_docs: .github/` để PR sửa CI đi đường doc → **khai
  được**, nhưng đó là quyết định có ý của repo đích, ghi trong `checkmate.yml` — file mà router đã xếp vào
  code, nên PR mở cửa đó luôn bị chấm bằng probe; ca T4.2 khoá rằng nó KHÔNG bao giờ xảy ra do mặc định;
  (e) tên thư mục khác hoa thường (`OpenSpec/`) → so đúng hoa thường, không khớp (T1.2).
- ✅ S8.2 Load-bearing hai chiều: mutation bỏ gác tầng-thư-mục · bỏ thứ tự nguồn-spec-thắng · cho khai đè
  đuôi — mỗi cái phải làm lưới đỏ (task 4.3); ghi kết quả vào PR.
- ✅ S8.3 Đối xứng với `sources.specs`: cùng cửa đọc, cùng luật loại đường ngoài repo, cùng cơ chế
  `rejected`; khác duy nhất là ba gác của D2 — và lý do khác nhau (một cái siết, một cái nới) ghi ở S4.1.

## Notes

- Vế thứ hai của nợ #6 («khai đè danh sách tự dò nguồn spec») đã xong từ `retire-r-rules`; ghi ở proposal
  để không ai đi làm lại.
