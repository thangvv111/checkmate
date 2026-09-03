# Security — concurrent-runs

Change này khai thành luật hai thứ đang giữ ⛔C3 (bí mật không rò) và một thứ chống hỏng-im-lặng khi chạy
song song. Nó KHÔNG đổi hành vi: tách quyết định thành hàm thuần, thêm test cho chỗ chưa khoá.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Trục chính của requirement 4. Môi trường tiến trình con dựng bằng **danh sách CHO PHÉP**
  (`packages/harness/src/sandbox.ts:23-36` `ENV_CHO_PHEP` + `envSandbox()`; `packages/harness/src/model.ts:76`
  `envForCli`). Token GitHub, khoá API, token thuê bao không có trong danh sách nên không lọt vào tiến
  trình chạy test lẫn tiến trình gọi model.
- ✅ S1.2 Lời từ chối của hai gác chỉ chứa số pull request và câu «đang bận» — không giá trị nhạy cảm.
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính; hai gác đứng trước cả bước xác thực của route (chúng bảo vệ tài nguyên,
  không phải quyền).
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge; không chạm `gate.ts`.
- N/A S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 **Code của pull request được chạy THẬT trong sandbox** — đây là dữ liệu không tin cậy ở dạng nguy
  hiểm nhất. Đường bảo vệ là môi trường lọc (requirement 4) và worktree riêng; change này khoá vế môi
  trường bằng test T3.1/T3.3.
- N/A S4.2 Không chạm bóc trả lời model.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 Requirement 4 khai đúng điều này: probe chạy trên máy chủ CheckMate, model không có tool.
- ✅ S5.2 Ref riêng theo pull request (requirement 3, `apps/web/src/github.ts:415, :418`) là điều kiện để
  hai lượt song song không đối chứng nhầm commit của nhau. Worktree riêng và việc dọn worktree khi lỗi đã
  thuộc `sandbox.ts` (ngoài phạm vi change này, không đụng).

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không file mới.
- N/A S6.2 Không ghi.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 `evaluateStartRun` fail-closed: `tran` khuyết/0/âm, `soDangChay` sai kiểu → KHÔNG trả `chay: true`
  (T1.7). Thà chặn oan một lượt còn hơn nhận vô hạn lượt và làm chết máy chủ.
- ✅ S7.2 Requirement 3 chống đúng một kiểu verdict sai im lặng: đối chứng nhầm commit vì dùng chung ref
  nhánh gốc. Verdict vẫn ra, không dấu hiệu nào cho người đọc — nên luật phải nói ra và test phải khoá.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Hai mục tiêu: **đọc được bí mật của checker từ code PR**, và **làm máy chủ quá tải**.

- ✅ S8.1 Bí mật: (a) biến bí mật đã biết (`GITHUB_TOKEN`, `ANTHROPIC_API_KEY`) → không nằm trong
  `ENV_CHO_PHEP` (T3.3); (b) biến bí mật MỚI thêm sau này → vẫn không lọt, vì là danh sách cho phép chứ
  không phải danh sách cấm (T3.1) — đây chính là điều R8.12 đòi và là án lệ đo được; (c) qua tiến trình gọi
  model → `envForCli` cùng khuôn.
  Quá tải: (d) bấm tay liên tục → gác trần 429 (T1.1); (e) chế độ trực nạp ồ ạt → cùng hàm, ngừng nạp
  (T2.1); (f) nhiều lượt trên cùng một PR → gác 409 (T1.4); (g) lượt mồ côi khoá trần vĩnh viễn → đã có
  luật ở `ben-dong-su-kien` và ca ở `kho-run.test.ts` (T2.2).
- ✅ S8.2 Load-bearing hai chiều: mutation đảo thứ tự hai gác · bỏ gác một-PR-một-lượt · đổi `ENV_CHO_PHEP`
  thành danh sách cấm — mỗi cái phải làm lưới đỏ (task 3.3).
- ✅ S8.3 Đối xứng: hai đường khởi động lượt (bấm tay, chế độ trực) dùng CHUNG một hàm quyết định (D2) —
  hôm nay mỗi đường viết điều kiện riêng, và cửa ít người nhìn hơn sẽ lệch trước.

## Notes

- Trần cứng 2 không cấu hình được là **cố ý** trong change này: R8.2 nói nâng trần là quyết định tài nguyên
  máy chủ. Cửa khai (kèm giới hạn và cảnh báo) ghi thành nợ có tên, không làm lén trong backfill.
