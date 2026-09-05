# Tasks — container-isolated-probe-runs

## 0. Tầng 2 — ĐO NỀN BẰNG MÁY (đã chạy trước khi chọn phương án)

Đo trên prod, chạy đúng quyền mà code PR có:

| thứ với tới | trước change |
|---|---|
| `.secrets.json` | đọc được (457 byte) |
| `config.json` | đọc được (911 byte) |
| `web-runs/checkmate.db` | đọc **và ghi** được (3.7 MB) |
| `probes-lib/` | **ghi được** |
| `~/.ssh/authorized_keys` | đọc được |
| Internet | ra được (200) |

```
Ubuntu 22.04.5 · kernel 6.8 · docker/podman/bwrap KHONG CO
systemd-run · unshare · setpriv co san
unprivileged_userns_clone = 1 · /etc/subuid: ubuntu:100000:65536
RAM 1910MB (con 1090MB) · 2 nhan · dia con 49G
```

- [ ] 0.1 Sau change: chạy LẠI đúng sáu phép đo trên **từ trong môi trường cô lập** — cả sáu phải đổi
      chiều. Đây là phép chứng minh của change, không phải một ca test.
- [ ] 0.2 Đo chi phí: dung lượng cài podman · RAM một lượt chấm · thời gian dựng+huỷ so với hôm nay.
      Số xấu bất ngờ thì **dừng lại trình PO**, không tự đi tiếp.

## 1. Máy chủ (làm TRƯỚC, và đo)

- [ ] 1.1 Cài podman (rootless, không daemon). Ghi dung lượng trước/sau.
- [ ] 1.2 Ảnh mặc định **ghim phiên bản cụ thể**, đủ chạy vitest cho repo Node.
- [ ] 1.3 Kiểm rootless chạy được dưới `ubuntu`: mạng tắt, user-namespace, trần tài nguyên.
- [ ] 1.4 ⛔ KHÔNG cài Docker, KHÔNG thêm ai vào nhóm có quyền điều khiển daemon.

## 2. Luật (capability)

- [ ] 2.1 Delta ADDED `specs/sandbox-isolation/spec.md` — 4 requirement (đã viết).
- [ ] 2.2 Delta MODIFIED `target-contract` · `verdict-contract` · `man-run` (đã viết).

## 3. Kiểu & hợp đồng

- [ ] 3.1 `IsolationLevel` + `IsolationInfo` (mức THỰC TẾ, kèm runtime và lý do nếu không cô lập).
- [ ] 3.2 `RunnerCfg.image` — đọc từ đĩa clone, KHÔNG từ nhánh PR.
- [ ] 3.3 `probe_stats` thêm trường mức cô lập — **tuỳ chọn**, verdict đời cũ không có.
- [ ] 3.4 ⛔C5 — khai export mới vào `checkmate.yml`.

## 4. Engine — dựng môi trường

- [ ] 4.1 Nguồn mã bằng `git archive <sha>` vào thư mục sạch — **không** worktree, không `.git`.
- [ ] 4.2 Chạy test trong container: user không đặc quyền, mạng tắt, trần bộ nhớ/CPU/tiến trình.
- [ ] 4.3 Bind duy nhất ra ngoài: `node_modules` của clone, **chỉ đọc**. Không mount gì khác.
- [ ] 4.4 Huỷ môi trường sau lượt, kể cả khi ném (giữ hình dạng `finally` đã có).
- [ ] 4.5 Dò runtime: vắng mặt → chạy đường cũ và khai `none` kèm lý do. KHÔNG im lặng.
- [ ] 4.6 Cấu hình bật mà dựng lỗi → khai mức THỰC TẾ, không khai mức mong muốn.

## 5. Bề mặt

- [ ] 5.1 `probe_stats` mang mức cô lập; bảng số liệu verdict bày nó.
- [ ] 5.2 Verdict đời cũ thiếu trường → khai **không đo được**; MUST NOT suy thành «không cô lập».

## 6. Lưới

- [ ] 6.1 Lưới mới `test/sandbox-isolation.test.ts` theo `test-cases.md`.
- [ ] 6.2 Ca khoá **không mount nào ghi được ra ngoài** — quét danh sách bind dựng ra.
- [ ] 6.3 Ca khoá `runner.image` đọc từ clone, không từ nhánh PR.
- [ ] 6.4 Ca khoá mức cô lập là THỰC TẾ (dựng lỗi thì khai `none`).
- [ ] 6.5 ⛔ Ghi rõ trong file lưới: ca test **không dựng container thật**. Phép chứng minh là §0.1.

## 7. Mutation — mỗi chiều HAI lượt

- [ ] 7.1 Thêm một bind ghi được (`probes-lib`) → ca ĐỎ.
- [ ] 7.2 Bỏ tắt-mạng → ca ĐỎ.
- [ ] 7.3 Bỏ trần tài nguyên → ca ĐỎ.
- [ ] 7.4 Đọc `runner.image` từ nhánh PR → ca ĐỎ.
- [ ] 7.5 Dựng lỗi mà vẫn khai `container` → ca ĐỎ.
- [ ] 7.6 Ảnh mặc định đổi sang thẻ trôi → ca ĐỎ.
- [ ] 7.7 Đột biến sống sót → bảng ba đường.

## 8. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] 8.1 **Sáu phép đo ở §0 chạy lại TỪ TRONG container** — cả sáu đổi chiều.
- [ ] 8.2 Một lượt chấm thật trên repo demo: ra verdict, mức cô lập khai `container`.
- [ ] 8.3 Gỡ runtime tạm → lượt chấm vẫn chạy, verdict khai `none` kèm lý do, bảng số liệu bày ra.
- [ ] 8.4 Probe cố ghi `probes-lib/` → thất bại, thư viện sau lượt còn nguyên.
- [ ] 8.5 Đo chi phí (§0.2) và ghi số vào tài liệu.

## 9. Kiểm cơ học

- [ ] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 9.2 `npx openspec validate --changes` xanh.
- [ ] 9.3 Tầng 3: mọi hàm quét `scan*` mới có CẶP fixture.

## § Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 9.4 **Tách CheckMate sang máy riêng.** Điều kiện kích hoạt PO chốt 05/09: khi lượt chấm gây ảnh
      hưởng đo được tới TingPos trên cùng máy, hoặc khi CheckMate chấm repo mà người ngoài mở được PR.
