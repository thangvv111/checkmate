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

- [x] 0.1 Sau change: chạy LẠI đúng sáu phép đo trên **từ trong môi trường cô lập** — cả sáu phải đổi
      chiều. Đây là phép chứng minh của change, không phải một ca test.
- [x] 0.2 Đo chi phí: dung lượng cài podman · RAM một lượt chấm · thời gian dựng+huỷ so với hôm nay.
      Số xấu bất ngờ thì **dừng lại trình PO**, không tự đi tiếp.

## 1. Máy chủ (làm TRƯỚC, và đo)

- [x] 1.1 Cài podman (rootless, không daemon). Ghi dung lượng trước/sau.
- [x] 1.2 Ảnh mặc định **ghim phiên bản cụ thể**, đủ chạy vitest cho repo Node.
- [x] 1.3 Kiểm rootless chạy được dưới `ubuntu`: mạng tắt, user-namespace, trần tài nguyên.
- [x] 1.4 ⛔ KHÔNG cài Docker, KHÔNG thêm ai vào nhóm có quyền điều khiển daemon.

## 2. Luật (capability)

- [x] 2.1 Delta ADDED `specs/sandbox-isolation/spec.md` — 4 requirement (đã viết).
- [x] 2.2 Delta MODIFIED `target-contract` · `verdict-contract` · `man-run` (đã viết).

## 3. Kiểu & hợp đồng

- [x] 3.1 `IsolationLevel` + `IsolationInfo` (mức THỰC TẾ, kèm runtime và lý do nếu không cô lập).
- [x] 3.2 `RunnerCfg.image` — đọc từ đĩa clone, KHÔNG từ nhánh PR.
- [x] 3.3 `probe_stats` thêm trường mức cô lập — **tuỳ chọn**, verdict đời cũ không có.
- [x] 3.4 ⛔C5 — khai export mới vào `checkmate.yml`.

## 4. Engine — dựng môi trường

- [x] 4.1 Nguồn mã bằng `git archive <sha>` vào thư mục sạch — **không** worktree, không `.git`.
- [x] 4.2 Chạy test trong container: user không đặc quyền, mạng tắt, trần bộ nhớ/CPU/tiến trình.
- [x] 4.3 Bind duy nhất ra ngoài: `node_modules` của clone, **chỉ đọc**. Không mount gì khác.
- [x] 4.4 Huỷ môi trường sau lượt, kể cả khi ném (giữ hình dạng `finally` đã có).
- [x] 4.5 Dò runtime: vắng mặt → chạy đường cũ và khai `none` kèm lý do. KHÔNG im lặng.
- [x] 4.6 Cấu hình bật mà dựng lỗi → khai mức THỰC TẾ, không khai mức mong muốn.

## 5. Bề mặt

- [x] 5.1 `probe_stats` mang mức cô lập; bảng số liệu verdict bày nó.
- [x] 5.2 Verdict đời cũ thiếu trường → khai **không đo được**; MUST NOT suy thành «không cô lập».

## 6. Lưới

- [x] 6.1 Lưới mới `test/sandbox-isolation.test.ts` theo `test-cases.md`.
- [x] 6.2 Ca khoá **không mount nào ghi được ra ngoài** — quét danh sách bind dựng ra.
- [x] 6.3 Ca khoá `runner.image` đọc từ clone, không từ nhánh PR.
- [x] 6.4 Ca khoá mức cô lập là THỰC TẾ (dựng lỗi thì khai `none`).
- [x] 6.5 ⛔ Ghi rõ trong file lưới: ca test **không dựng container thật**. Phép chứng minh là §0.1.

## 7. Mutation — mỗi chiều HAI lượt

- [x] 7.1 Thêm một bind ghi được (`probes-lib`) → ca ĐỎ.
- [x] 7.2 Bỏ tắt-mạng → ca ĐỎ.
- [x] 7.3 Bỏ trần tài nguyên → ca ĐỎ.
- [x] 7.4 Đọc `runner.image` từ nhánh PR → ca ĐỎ.
- [x] 7.5 Dựng lỗi mà vẫn khai `container` → ca ĐỎ.
- [x] 7.6 Ảnh mặc định đổi sang thẻ trôi → ca ĐỎ.
- [x] 7.7 Đột biến sống sót → bảng ba đường.

## 8. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 8.1 **Sáu phép đo ở §0 chạy lại TỪ TRONG container** — cả sáu đổi chiều.
- [ ] 8.2 **[chờ deploy]** Một lượt chấm thật trên repo demo: ra verdict, mức cô lập khai `container`.
- [ ] 8.3 **[chờ deploy]** Gỡ runtime tạm → lượt chấm vẫn chạy, verdict khai `none` kèm lý do, bảng số liệu bày ra.
- [x] 8.4 Probe cố ghi `probes-lib/` → thất bại, thư viện sau lượt còn nguyên.
- [x] 8.5 Đo chi phí (§0.2) và ghi số vào tài liệu.

## 9. Kiểm cơ học

- [x] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 9.2 `npx openspec validate --changes` xanh.
- [x] 9.3 Tầng 3: mọi hàm quét `scan*` mới có CẶP fixture.

## § Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 9.4 **Tách CheckMate sang máy riêng.** Điều kiện kích hoạt PO chốt 05/09: khi lượt chấm gây ảnh
      hưởng đo được tới TingPos trên cùng máy, hoặc khi CheckMate chấm repo mà người ngoài mở được PR.

## 10. Kết quả đo

**Mutation 6/6 chiều bị bắt**, mỗi chiều hai lượt:

| chiều | ca đỏ | thứ bắt được |
|---|---|---|
| M1 thêm một bind **ghi được** (`probes-lib`) | 6 / 6 | T1.6 — *ca nặng nhất của change* |
| M2 bỏ tắt-mạng | 1 / 1 | T1.1 |
| M3 bỏ một trần tài nguyên | 1 / 1 | T1.2 |
| M4 đọc hợp đồng runner từ chỗ khác bản clone | 1 / 1 | T3.2 |
| M5 dựng lỗi mà vẫn khai `container` | 2 / 2 | T4.3 |
| M6 ảnh mặc định đổi sang thẻ trôi | 1 / 1 | T3.3 |

**Kiểm tay §8.1 — sáu phép đo chạy lại TỪ TRONG container, bằng ĐÚNG đối số mà code sinh ra:**

| | trước | sau |
|---|---|---|
| `.secrets.json` | đọc được (457 byte) | `ENOENT` |
| `config.json` | đọc được (911 byte) | `ENOENT` |
| sổ cái verdict | đọc **và ghi** được (3.7 MB) | `ENOENT` |
| `probes-lib/` | **ghi được** | `ENOENT` |
| `authorized_keys` | đọc được (1189 byte) | `ENOENT` |
| Internet | ra được (200) | `EAI_AGAIN` |
| `node_modules` | — | `EACCES` (bind chỉ đọc) |
| thư mục lượt chạy | — | ghi được (đúng ý — chỗ DUY NHẤT) |

**Đường ống chạy trọn trên prod** (không tốn lượt model): `git archive` → thư mục lượt chạy **không có
`.git`** (`. .. package.json test tinh.js`) → vitest chạy TRONG container, mạng tắt → JSON đọc ngược được
từ host: `numTotalTests: 1 | P1: cong=passed`. **2.04s**.

**Chi phí (§0.2):** kéo ảnh 9s (một lần) · dựng+chạy+huỷ container **0.24–0.36s** · một lượt vitest thật
trong container **2.04s** · dung lượng đĩa không đổi ở mức G.

## 11. Ba thứ kiểm tay bắt được mà lưới không bắt nổi

**1. `--cpus` GÃY vì cgroup chưa uỷ quyền.** Rootless podman mặc định chỉ được `memory pids`; controller
`cpu` phải uỷ quyền qua `Delegate=` ở systemd. Nếu lặng lẽ bỏ `--cpus` thì luật «trần bộ nhớ/CPU/tiến
trình» vừa viết đã thành lời hứa. Đã uỷ quyền và kiểm lại: `cpuset cpu io memory pids`.

**2. Thư mục lượt chạy KHÔNG ghi được**, nên vitest không ghi nổi kết quả và cả lượt chấm chết. Nguyên
nhân: rootless ánh xạ `--user 1000:1000` sang **subuid**, còn thư mục do tài khoản dịch vụ sở hữu. Hai
đường chữa, đo cả hai đều ~0.35s:
- `--userns=keep-id` — dễ dọn, nhưng uid trong container thành **chính tài khoản dịch vụ**; thoát container
  là thoát ra thành tài khoản ấy.
- `-v …:Z,U` — podman đổi chủ sở hữu sang subuid; thoát container rơi vào **subuid không đặc quyền**.

Chọn `:U` — giá như nhau, hậu quả khi hỏng nhẹ hơn.

**3. `:U` làm tài khoản dịch vụ KHÔNG xoá nổi thư mục lượt chạy** (đo: `rm -rf` thất bại, thư mục ở lại).
Phải dọn qua `podman unshare rm -rf`, và phải chạy **trước** `rmSync` — ngược lại thì `rmSync` thất bại im
lặng và thư mục ở lại mãi. Cả ba đều đã thành ca test.

## 12. Còn lại — CHỜ DEPLOY

§8.2 (lượt chấm thật ra verdict khai `container`) và §8.3 (gỡ runtime → khai `none`) đòi code đã lên prod.
Trình PO ở PR; làm ngay sau deploy, TRƯỚC khi archive.
