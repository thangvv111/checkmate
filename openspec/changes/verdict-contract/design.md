# Design — verdict-contract

## Context

Đo 03/09 trên `main` (`d0fdb46`):

```
result quyet o dau     cli.ts:180  findings.some(f => chuanMuc(f.severity)==='high') ? 'FAIL' : 'PASS'
artifact_ref           cli.ts:179  code -> kq.target.branchSha · doc -> hash noi dung
probe_stats            cli.ts:182  tu runCodeSkill (ke_hoach · ghi_nhan · pass · hoi_quy · nghi_van · bo_qua · that_lac …)
R1.12 «hoi quy -> FAIL»  KHONG o cli.ts. Song o HAI LUOI MAY trong skill-code.ts:
                         :818  sev !== 'high' && (hoi_quy | vi_pham_luat_moi)  -> ep ve 'high' + log
                         :836  ung vien hoi quy ma model bo sot                -> may tu bo sung finding high
R6.13 «du co so»       skill-code.ts:742-752  coBangChung = pass|hoi_quy|vi_pham_luat_moi|cai_thien
                         lan 1 rong -> sinh lai (R6.14) · lan 2 rong -> throw «Khong du co so ket luan»
test khoa 9 dieu       KHONG dieu nao (grep R6.1-R6.5, R6.13, R6.14, R1.12, R1.13 trong test/ -> rong)
```

Hai lưới máy là chỗ luật R1.12 thật sự sống, và không có ca test nào. Bỏ một trong hai thì một hồi quy
model gán `medium` cho ra verdict `PASS`.

PO chốt 03/09: hàm thuần sang **file mới**; R6.5 và R1.13 **gộp** vào requirement 1 (phần dữ liệu, phần
bày ra vẫn thuộc `man-run`); **có** test cho hai lưới máy dù phải dựng ứng viên giả.

## Goals / Non-Goals

**Goals**
- Chín điều có requirement + scenario + test chạy được; thông điệp lỗi và log khoá từng chữ.
- Không đổi hành vi nào. Không đổi hình dạng `Verdict`.
- Probe thư viện tự chấm neo lại được mã R6.x/R1.x ghi trong thân requirement.

**Non-Goals**
- KHÔNG đụng phân loại probe (bảng chân trị R1.1–R1.11 là change `probe-classification`).
- KHÔNG đụng `man-run` (phần bày ra vùng xám đã có luật).
- KHÔNG đổi số lần sinh lại, không đổi ngưỡng nào.

## Decisions

### D1 — Bốn hàm nhỏ trong `packages/harness/src/verdict.ts`, KHÔNG dựng Finding hoàn chỉnh

```
decideResult(findings)                          -> 'PASS' | 'FAIL'          (R6.1, R6.3)
regressionFloor(trangThai, sevModel)            -> Severity                 (R1.12 san cung)
missingRegressionFindings(ungVien, maDaCo)      -> UngVienToiThieu[]        (R1.12 bu thieu)
hasBasis(ungVien)                               -> { ok: true } | { ok: false, lyDo }   (R6.13)
```

`lamEvidence` trong `skill-code.ts` là **closure** đọc `code`, `library`, `runner`, `branch`, `t` — hàm
thuần không dựng được `Finding` hoàn chỉnh và cũng không nên: nó chỉ trả **quyết định** (mức đã ép, danh
sách ứng viên phải bù), chỗ gọi vẫn dựng `Finding` với evidence như hôm nay. Phương án đã cân nhắc — truyền
`lamEvidence` vào làm callback: hàm hết thuần theo nghĩa test được đơn giản, mà chẳng khoá thêm gì.

`UngVienToiThieu` là hình dạng tối thiểu (`ma`, `trangThai`, `probe: { id, ten, spec_rule, muc_dich }`) để
test dựng được bằng tay; `UngVien` thật của `skill-code.ts` thoả nó về cấu trúc.

### D2 — `hasBasis` trả LÝ DO, không chỉ trả boolean

Thông điệp lỗi hiện tại nêu số probe và ba probe đầu kèm dòng lỗi. Nếu hàm chỉ trả `false`, chỗ gọi phải
dựng lại lý do và lời văn dễ trôi. Trả `{ ok: false, lyDo }` giữ được cả hai: test khoá lời, chỗ gọi ghép
vào thông điệp ném.

### D3 — Không đổi tên `vi_pham_luat_moi` trong nhóm sàn cứng

Sàn cứng áp cho `hoi_quy` VÀ `vi_pham_luat_moi`. Đó là hành vi đang chạy và đúng: hai nhãn cùng chặn merge
nhưng nói hai chuyện khác nhau (R1.20). Requirement ghi cả hai; test có ca đối chứng cho `nghi_van` (mức
model giữ nguyên) để sàn không lan sang nhãn khác.

### D4 — Test cho hai lưới máy: dựng ứng viên giả, không gọi model

`regressionFloor` và `missingRegressionFindings` là hàm thuần trên dữ liệu, nên test không cần model, không
cần sandbox. Đây là lý do tách chúng ra: nếu để nguyên trong vòng lặp của `runCodeSkill`, muốn khoá phải
chạy cả lượt chấm với model giả — đắt và giòn.

### D5 — Mã gốc ghi trong thân requirement

Như `merge-gate`: «(gốc: R6.13)» vừa là con trỏ tra bảng, vừa để `resolveRule` neo probe thư viện.

## Architecture

- `packages/harness/src/verdict.ts` (mới, tầng engine, thuần) · `cli.ts` (`result`) · `skill-code.ts`
  (hai lưới máy + khối đủ-cơ-sở gọi hàm).
- `test/verdict-contract.test.ts` (mới).
- `apps/web`, `packages/shared`: không đổi.

## Data Model

N/A — không đổi hình dạng `Verdict`, `probe_stats`, `Finding`; không chạm SQLite hay tài sản prod.

## Risks / Trade-offs

- [Refactor đổi thông điệp lỗi/log] → test so `toBe`/`toContain` đúng chuỗi hiện tại; kiểm bằng `git diff`
  như `merge-gate` (không dòng thêm nào ở chỗ gọi mang chuỗi thông điệp).
- [Sàn cứng lan sang nhãn khác] → ca đối chứng `nghi_van` giữ mức model.
- [Hàm thuần lệch với vòng lặp thật] → chỗ gọi dùng ĐÚNG hàm, không chép logic; mutation lúc apply chứng minh.

## Migration Plan

N/A — không dữ liệu. Đường lùi: revert PR.

## Open Questions

- Không.
