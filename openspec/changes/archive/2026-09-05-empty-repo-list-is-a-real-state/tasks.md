# Tasks — empty-repo-list-is-a-real-state

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -rno "\b\(cfg\|c\|v\|conf\)\.repo\b" apps/web/src/*.ts packages/harness/src/*.ts | wc -l  # 47
grep -c "cfg\.repo\." apps/web/src/github.ts                       # 12
grep -c "chamPr(" apps/web/src/server.ts                           # 3  duong khoi luot cham
grep -c "cfg.repos.map((r) => r.github)" apps/web/src/server.ts    # 1  gac (CHI webhook)
```

- [x] 0.1 Sau change: **3/3** đường khởi lượt chấm đi qua gác; số chỗ đọc `cfg.repo` mà chưa qua phép
      kiểm về **0** — `npx tsc --noEmit` sạch. Số lỗi trình biên dịch đi từ **43 → 0**, và 43 chính là số đo
      của giả định ngầm «luôn có một repo».
- [x] 0.2 `MAC_DINH.repos` = `[]`; `REPO_DEMO` **xoá hẳn** khỏi `config.ts` (không chỉ thôi dùng), `import { resolve }` theo đó cũng gỡ. `scanSynthesizedRepo` canh chỗ này.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/repo-registry/spec.md` — 3 requirement, 9 scenario (đã viết).
- [x] 1.2 Delta MODIFIED `specs/github-webhook/spec.md` — gác thành dùng chung, thêm 1 scenario (đã viết).

## 2. Hàm thuần

- [x] 2.1 `config.ts`: `dsRepoTuLuu` phân biệt `repos` vắng mặt / rỗng (D1). Thêm `usableRepos` — do ca T7.2 bắt được `repos: [null]` làm `readConfig` NÉM, tức khoá luôn màn Cấu hình (⛔C6).
- [x] 2.2 `MAC_DINH.repos = []`, `repo_dang_chon = ''`, bỏ `repo` mặc định.
- [x] 2.3 `resolveRepoShape` trả `repo?: RepoConfig` và `repo_dang_chon` có thể rỗng.
- [x] 2.4 `CauHinhCoRepo` + `coRepo()` (D2).
- [x] 2.5 `laRepoDaKhai(repos, github)` (D3).
- [x] 2.6 ⛔C5 — khai export mới vào `checkmate.yml`.

## 3. Kiểu cưỡng chế

- [x] 3.1 **9** chữ ký ở `github.ts` đổi `CheckmateConfig` → `CauHinhCoRepo`. *(Bản đầu ghi 12 — đó là số DÒNG đọc `cfg.repo.` mà §0 đếm được, không phải số chữ ký. Đếm lại lúc apply: 9 hàm.)*
- [x] 3.2 Sửa mọi chỗ `tsc` bắt — mỗi chỗ là một điểm trước đây dùng repo mà không ai kiểm.

## 4. Ba đường vào một gác

- [x] 4.1 **Bấm tay**: đường khởi lượt chấm qua `coRepo`; rỗng → từ chối kèm lý do đọc được.
- [x] 4.2 **Trực**: rỗng → không quét, không khởi lượt nào.
- [x] 4.3 **Webhook**: `decideWebhookAction` đối chiếu bằng `laRepoDaKhai`, bỏ biểu thức riêng.

## 5. Bề mặt

- [x] 5.1 Dashboard khi chưa có repo: nói «chưa kết nối repo nào» + lối đi tới Cấu hình, KHÔNG dùng màu
      FAIL (đây là trạng thái bình thường, không phải hỏng).
- [x] 5.2 Không bề mặt nào bày tên một repo không có trong cấu hình.

## 6. Lưới

- [x] 6.1 `dsRepoTuLuu`: bốn ca — `repos` rỗng · `repos` vắng + có `repo` đời cũ · trắng · `repos` có phần tử.
- [x] 6.2 `laRepoDaKhai`: khớp · không khớp · khác hoa thường · danh sách rỗng · đầu vào khuyết.
- [x] 6.3 **Ba đường một câu trả lời**: cùng đầu vào → webhook, trực, bấm tay quyết định GIỐNG NHAU.
- [x] 6.4 `coRepo` thu hẹp kiểu đúng (ca biên dịch được / không biên dịch được).
- [x] 6.5 Dashboard rỗng: có lối đi, không có tên repo nào, không màu FAIL.

## 7. Mutation — mỗi chiều HAI lần, CHẠY NỀN, so với bản chụp

- [x] 7.1 Trả `dsRepoTuLuu` về `luu.repos?.length ? … : [mặc định]` → ca ĐỎ.
- [x] 7.2 Đưa `REPO_DEMO` trở lại `MAC_DINH.repos` → ca ĐỎ.
- [x] 7.3 Bỏ gác ở đường trực → ca ĐỎ.
- [x] 7.4 Bỏ gác ở đường bấm tay → ca ĐỎ.
- [x] 7.5 Webhook dựng lại biểu thức đối chiếu riêng thay vì gọi `laRepoDaKhai` → ca ĐỎ *(cửa song sinh)*.
- [x] 7.6 `dsRepoTuLuu` trả rỗng cả cho cấu hình đời cũ có `repo` → ca ĐỎ *(chiều hại ngược: mất repo của
      người dùng cũ)*.
- [x] 7.7 **Đã xảy ra, và đã phân loại.** Lượt đầu, M3 và M4 báo `KHONG-AP-DUNG-DUOC` — hàng thứ HAI của
      bảng ba đường (đột biến không áp dụng được), không phải «ca không load-bearing». Nguyên nhân: `server.ts`
      là CRLF còn mốc tìm viết bằng LF nên không khớp. Chính phép **kiểm chứng đột biến đã vào đĩa** phân biệt
      được hai ca ấy — không có nó thì kết quả đọc y hệt «gác không được ca nào khoá».

## 8. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 8.1 Chạy server với `repos: []`, BẬT trực, chờ qua một chu kỳ quét: không lượt chấm nào sinh ra,
      `runs/` và `probes-lib/` vẫn rỗng. *(Tái hiện đúng cảnh đã xảy ra trên prod.)*
- [x] 8.2 Mở màn chính khi chưa có repo: nói đúng, chỉ đúng đường, không bày repo ma.

## 9. Nợ có tên

- [x] 9.1 Ghi nợ «chế độ trực chỉ quét repo ĐANG CHỌN, không quét mọi repo đã khai» (D4).

## 10. Kiểm cơ học

- [x] 10.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 10.2 `npx openspec validate --changes` xanh.
- [x] 10.3 Tầng 3: hàm quét `scan*` mới (nếu có) phải có cặp fixture.

## 11. Kết quả đo

**Mutation — 6/6 chiều BỊ BẮT, mỗi chiều hai lượt nhất quán** (nền xanh trước khi đột biến; so với BẢN
CHỤP nội dung file, không so `git diff` vì cả change chưa commit):

| chiều | ca đỏ (lượt 1 / lượt 2) | thứ bắt được |
|---|---|---|
| M1 khôi phục đúng hành vi prod (rỗng → repo mặc định) | 13 / 13 | T1.1 · T1.3 · T2.1 |
| M2 repo mặc định trở lại đường đọc cấu hình | 1 / 1 | `scanSynthesizedRepo` |
| M3 bỏ gác ở cửa TRỰC | 1 / 1 | `scanEntryGates` |
| M4 bỏ gác ở cửa BẤM TAY | 1 / 1 | `scanEntryGates` |
| M5 webhook dựng biểu thức riêng *(cửa song sinh)* | 2 / 2 | T5.1 hành vi + `scanSharedRepoGate` |
| M6 `dsRepoTuLuu` trả rỗng cả cho cấu hình đời cũ | 3 / 3 | T1.2 *(chiều hại ngược)* |

**Kiểm tay — CHẠY THẬT**, máy chủ với `CHECKMATE_GOC` riêng, `config.json` = `{"repos": [], "truc": {"bat":
true, "chu_ky_giay": 3}}`, tài khoản dùng-một-lần, chờ qua **ba** chu kỳ quét:

```
GET /            -> 200  nói «Chưa kết nối repo nào» ✓  có href="/settings" ✓  không repo ma ✓  không màu FAIL ✓
GET /settings    -> 200  (mở được khi chưa có repo — lối thoát duy nhất để thêm repo)
POST /api/runs   -> 409  {"loi":"Chưa kết nối repo nào — thêm repo ở màn Cấu hình trước khi chạy kiểm."}
GET /api/prs     -> 200  []            (rỗng, không phải lỗi)
runs/ probes-lib/ repos/  -> chưa tạo   (trực chạy 3 chu kỳ, không khởi lượt chấm nào)
```

Rút chu kỳ xuống 3s KHÔNG làm phép thử dễ hơn: gác repo-đã-khai đứng **trước** phép kiểm chu kỳ trong vòng
lặp, nên chu kỳ ngắn chỉ làm nó bị hỏi nhiều lần hơn.
