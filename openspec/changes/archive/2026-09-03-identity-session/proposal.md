# Proposal — identity-session

## Why

Backfill capability thứ năm. Nhóm R11 là **21 điều** đang thi hành, và là nhóm duy nhất còn lại nằm trọn
trên trục bảo mật: ai là người bấm cổng, phiên nào còn hiệu lực, vai nào mở được merge.

Đo trên `main` 03/09 (`43209c1`) — 22 ca sẵn có ở `test/danh-tinh.test.ts`, và bảy điều **không ca nào khoá**:

```
R11.14  cookie flags        CODE DUNG   ham thuan CHUA export
R11.2   chan khong phien    CODE DUNG   logic nam trong app.use()
R11.4   mot cua danh tinh   CODE DUNG   luat kien truc, khong co luoi
R11.20  khong route tra tk  CODE DUNG   *** giu bang KY LUAT ***
R11.7   tai khoan o CSDL    CODE DUNG   luat hinh dang du lieu
R11.8   quyen file 600      CODE DUNG   catch nuot tren Windows
R11.19  quan tri bang CLI   CODE DUNG   luat quy trinh
```

**Chỗ nặng nhất là R11.20.** `listAccounts()` trả tên và vai của mọi tài khoản, và hôm nay **chỉ CLI gọi
nó**. Luật khai «KHÔNG route nào được trả danh sách tài khoản, hash, hay muối» đang đúng vì *chưa ai viết
route ấy* — không phải vì có cơ chế nào ngăn. Một pull request thêm `/api/accounts` sẽ không làm lưới nào
đỏ. Đây đúng loại luật mà `identifier-language-gate` vừa chứng minh là sẽ trượt: **chữ không chặn được ai**,
và ở đây cái trượt là rò danh sách tài khoản của hệ thống có quyền merge.

**R11.14 là chỗ hở lặp lại khuôn đã biết.** `dungCookiePhien` (`apps/web/src/server.ts`) làm đúng cả ba cờ
— `HttpOnly` · `SameSite=Lax` · `Secure` khi `x-forwarded-proto: https` — nhưng chưa export nên không ca nào
gọi tới. Y hệt `retryNoticeNoEvidence` ở `probe-classification`. Thiếu `HttpOnly` là XSS đọc được token
phiên; thiếu `SameSite` là CSRF bấm được cổng merge.

**R11.2 nằm trong `app.use`.** Gác là middleware với `DUONG_MO = {'/login','/logout','/health'}` — một danh
sách CHO PHÉP, đúng khuôn. Nhưng không ca nào khoá nó, nên thêm một đường vào danh sách ấy đi qua review mà
không lưới nào đỏ.

## What Changes

- **Capability `identity-session`** — 8 requirement viết từ code và test đang chạy.
- **Hai lưới kiến trúc** (phần chưa được máy giữ, tức phần có giá trị nhất của change):
  - `listAccounts` và mọi thứ đọc bảng tài khoản KHÔNG được gọi từ tầng route (R11.20);
  - danh tính chỉ đọc qua đúng một cửa `getIdentity` (R11.4).
- **Tách/export để khoá được**: hàm dựng cookie phiên (R11.14) và quyết định chặn-khi-không-phiên (R11.2),
  cùng khuôn `evaluateMergeLocal` ở `merge-gate` — tách quyết định khỏi Express thì mỗi nhánh là một ca.
- **R11.15 · R11.16 đánh `housed` sang `merge-gate`**, không viết lại: requirement
  `merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm…` đã nói cả hai, và nó **đã trỏ sẵn** sang capability
  này cho luật danh tính.
- **R11.5 · R11.18** đã là `invariant` (⛔C3, ⛔C1) — nêu, không khai lại.
- KHÔNG đổi hành vi: đây là backfill. `npm test` phải xanh y nguyên trừ ca mới.

## Luật chạm tới

- ⛔C1 (máy không bao giờ merge — `canOperateGate` là chỗ nó sống ở tầng vai)
- ⛔C3 (bí mật không rò — R11.20, R11.11 hash token, R11.6 băm mật khẩu)
- ⛔C5 (export mới → bảng module `checkmate.yml`)
- `merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm…` (nhận R11.15, R11.16 — không sửa nội dung)
- Capability MỚI `identity-session` (ADDED 8 requirement)
- Hàng bảng tra: 19 điều `pending` → `housed`; R11.15, R11.16 → `housed` `merge-gate`

## Impact

- MỚI: hai lưới kiến trúc + lưới cho cookie và gác phiên
- Chạm: `apps/web/src/server.ts` (tách hai hàm thuần) · `apps/web/src/identity.ts` (không đổi hành vi)
- `checkmate.yml` bảng module (⛔C5) · `docs/r-rules-map.md` (21 hàng)
- KHÔNG đụng: `verifyPassword`, `createSession`, `getIdentity`, các hàm quyền — đã thuần, đã khoá
