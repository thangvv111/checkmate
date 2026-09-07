## 0. Đo trước khi viết

- [x] 0.1 Đếm bằng máy các bề mặt ở `design.md` § Bề mặt đã ĐẾM BẰNG MÁY — 8 lời gọi model · 2 chỗ gọi
      đường mặc định · 2 chỗ gọi đường runner · 0 hằng `300` còn sống.
- [x] 0.2 Đo trạng thái **thật** của bảy điều kiện tiên quyết (a)–(g) trước khi nâng `probe_cap`; ghi kết
      quả đo vào `design.md` § Rủi ro. Không suy từ tài liệu — đọc code.
- [x] 0.3 Đo cấu hình prod: `phuong_thuc` của nhà cung cấp và núm `max_probe`. Kết quả: `thue_bao` · 80.

## 1. Luật (capability)

- [x] 1.1 `probe-environment` — 3 requirement ADDED, mỗi cái có ca khoá ở §5.
- [x] 1.2 `target-contract › Đường chạy test MẶC ĐỊNH chịu cùng khoá timeout với đường runner` — ADDED.
      Không sửa «`checkmate.yml` là tuỳ chọn».
- [x] 1.3 Chỗ sống của luật: hằng + dải trong engine có test khoá · khoá ở `checkmate.yml` repo đích ·
      hồ sơ ở hai capability trên. KHÔNG viết vào `docs/archive/`.
- [x] 1.4 Gỡ hạng mục timeout khỏi change `target-shape-knobs` (1.4 nửa timeout, 3.4) và trỏ sang change
      này — hai change cùng khai một luật là đúng khuôn lệch repo này tồn tại để chống.

## 2. Kiểu & hợp đồng

- [x] 2.1 `PreflightIssueKind` · `PreflightIssue` — mã máy đọc, bề mặt đọc MUST NOT so khớp lời văn.
- [x] 2.2 `TIMEOUT_RANGE` + `clampTimeout` ở `runner.ts` — một nguồn cho hai đường chạy.
- [x] 2.3 Khai mọi export mới vào **bảng module của `checkmate.yml`** repo này (⛔C5).

## 3. Engine (packages/harness)

- [x] 3.1 `probe-preflight.ts` — `checkDependencies` · `checkRuntime` · `readEnginesNode` ·
      `nodeVersionOfImage` · `preflightProbeEnvironment` · `looksLikeEnvironmentFailure` ·
      `describeEnvironmentFailure` · `majorFromRange` · `majorFromVersion`.
- [x] 3.2 `skill-code.ts`: cửa kiểm đứng **trên** lời gọi model sớm nhất (`:585`); mức chặn ném lỗi, mức
      cảnh báo ra log rồi đi tiếp.
- [x] 3.3 `skill-code.ts`: nhánh `loiThu` nhận diện lỗi môi trường ⇒ dừng, KHÔNG sinh lại.
- [x] 3.4 `runner.ts`: dải `[30, 3600]`, mặc định 3600; `readRunnerCfg` đi qua `clampTimeout`.
- [x] 3.5 `sandbox.ts`: `chayVitest` nhận `timeoutS`; thông điệp hết giờ đọc chính giá trị đã cắt.
- [x] 3.6 `skill-code.ts`: truyền khoá timeout vào **cả hai** chỗ gọi đường mặc định (`:624`, `:1029`).
- [x] 3.7 `volume-standard.ts`: `PROBE_CAP_RANGE.default` 20 → 100, kèm chú thích nêu rủi ro đã đo.

## 4. Web (apps/web)

- [x] 4.1 `server.ts` cửa thêm repo: kiểm môi trường sau khi clone, trả `canh_bao_moi_truong`; **không
      chặn** đăng ký.
- [x] 4.2 `ui-repo.ts`: có cảnh báo thì **không chuyển trang**, hiện bệnh + lệnh sửa + đường đi tiếp.

## 5. Test

- [x] 5.1 Ca khoá cho từng requirement (3 + 1 = 4 requirement) — 44 ca ở `test/probe-environment.test.ts`.
- [x] 5.2 **Cặp fixture** cho lưới quét mã nguồn (`test-grid-integrity` tầng 3): fixture đặt cửa kiểm SAU
      lời gọi model ⇒ ĐỎ; fixture đặt TRƯỚC ⇒ XANH.
- [x] 5.3 Ca cửa song sinh timeout: thông điệp hết giờ nêu đúng số giây được truyền vào.
- [x] 5.4 **Mutation hai chiều, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả — 9 đột biến, không mục nào SKIP, số ca đỏ khớp hai vòng (bảng ở `test-cases.md` T3.1).

## 6. Hồ sơ change khác

- [x] 6.1 `finding-cap-and-density-standard`: sửa scenario ghim `probe_cap = 20` thành 100; ghi vào tasks
      7.2 rằng PO chốt nâng ngày 07/09 và **những điều kiện nào còn thiếu**.

## 7. Trước merge

- [ ] 7.1 `npx tsc --noEmit && npm test` — toàn bộ, không riêng file vừa sửa.
- [ ] 7.2 Deploy theo `DEPLOY.md`, rồi chạy **một lượt chấm code thật** trên prod.

## 8. Sau-merge — nợ có tên

- [ ] 8.1 **Nhịp hai:** cài phụ thuộc **trong container** cho repo đích mới — change riêng, trục an toàn
      riêng (script `postinstall` là code của repo đích).
- [ ] 8.2 Điều kiện (a) của tasks 7.2 ở `finding-cap-and-density-standard`: đọc `stop_reason`, trả lời cụt
      ⇒ lỗi có tên. Chưa cắn prod vì đang chạy đường thuê bao; đổi sang API là chạm ngay.
- [ ] 8.3 Trần thời gian cho **cả lượt chấm**, không chỉ từng lệnh test (Open Question của `design.md`).
