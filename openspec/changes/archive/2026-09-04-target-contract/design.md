# Design — target-contract

## Context

```
18 hang pending  ->  15 dieu DA co ca  +  3 dieu chua co ca

Ca hien co: runner-cfg 13 · loi-nap-file 7 · phan-loai + nhan-probe-log (ba dang ten probe)

Ba dieu con lai deu o sandbox.ts — chang hop dong-tren-giay thanh lenh-chay-that:

   checkmate.yml   --readRunnerCfg-->   cfg (van ban)
                                          |
                                          |  R2.17  dung sandbox: symlink node_modules
                                          |  R2.3   thay {files} {out}, quote
                                          v
                                    spawnSync(lenh, shell:true)
                                          |
                                          |  R2.16  khong ra XML -> loiThu mang stderr
                                          v
                                    parseJUnit -> ProbeResult[]
```

## Goals / Non-Goals

**Goals**
- Ba điều có ca khoá đúng gác, **cả ba chạy thật** — không ca nào đọc source.
- Ranh giới «`quote` không phải gác an ninh» được khai thành luật, không để người sau đoán.

**Non-Goals**
- KHÔNG đổi code sản phẩm.
- KHÔNG viết ca trùng cho 15 điều đã có.
- KHÔNG đóng capability — 15 điều kia ở lại `pending` (cùng tình trạng `diff-visibility` N1).

## Decisions

### D1 — Cả ba khoá bằng CHẠY THẬT, kể cả khi tốn một worktree git mỗi ca

`Sandbox` dựng worktree git và symlink thật; `chayTheoRunner` spawn shell thật. Ca đọc source ở đây sẽ khoá
chữ chứ không khoá hành vi, mà đúng ba điều này là loại **hỏng im lặng** — chúng không ném lỗi, chúng làm
kết quả sai đi. Ca chạy thật là cách duy nhất phân biệt.

Giá: mỗi ca dựng repo git + worktree, spawn shell. Khai `timeout` riêng như `sources.test.ts`, không nới
trần toàn cục.

### D2 — R2.3: `test_cmd` là một script `node -e` do chính ca viết ra

Không cần pytest hay maven để kiểm hợp đồng này — chỉ cần một lệnh **nhận hai đường dẫn và ghi XML**. Dùng
`node -e` vì nó có sẵn ở mọi máy chạy được repo này:

```
test_cmd: node -e "<script ghi XML>" {files} {out}
```

Script ghi ra XML một `testcase` mang **chính chuỗi nó nhận ở chỗ thay thứ nhất**. Nhờ đó ca đọc lại được
giá trị đã thay vào, thay vì chỉ biết «lệnh chạy xong»:

- nếu `{files}` không được thay → tên testcase là chuỗi `{files}` nguyên văn → ca ĐỎ;
- nếu `{out}` không được thay → không có file XML nào → ca ĐỎ.

### D3 — R2.3 vế quote: ép khoảng trắng bằng THƯ MỤC probe, không bằng thư mục tạm

Đường dẫn tạm và đường dẫn repo trên máy CI thường không có khoảng trắng, nên không ép được từ đó. Nhưng
`ghiProbe(code, ten, thuMuc)` nhận thư mục — đặt `thuMuc` có khoảng trắng là ép được ngay, và đó đúng là
đường dẫn đi vào chỗ thay thứ nhất.

Không quote thì shell tách đôi đường dẫn: script nhận sai đối số, XML ghi sai chỗ hoặc không ghi. Ca ĐỎ vì
hành vi thật, không vì một chuỗi trong source.

### D4 — R2.17 là ca DUY NHẤT đụng `process.chdir`, và nó buộc phải thế

Muốn đột biến «bỏ `resolve()`» giết được ca thì `repo` truyền vào **phải tương đối** — với đường dẫn tuyệt
đối, `resolve()` là no-op và ca sẽ xanh ở cả hai phía, tức không load-bearing.

Trên Windows không có đường tương đối giữa hai ổ đĩa (`E:` → `C:\...\Temp`), nên cách duy nhất là `chdir`
sang thư mục cha của repo tạm rồi gọi bằng tên thư mục. Khôi phục cwd trong `finally`.

*Cái mất, nói thẳng:* ca này đổi trạng thái toàn cục của tiến trình test trong khoảnh khắc nó chạy. Vitest
chạy mỗi file trong worker riêng nên phạm vi ảnh hưởng gói trong file này; `finally` khôi phục kể cả khi ca
đỏ. Đây là đánh đổi có ý thức: cách còn lại là bỏ hẳn vế load-bearing của ca.

### D5 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — bắt buộc, hai lần, kiểm chứng đột biến đã áp dụng; và khi đột biến không giết được
  ca nào thì phân biệt **ba** khả năng (`probe-library` D8), gồm cả **đột biến gỡ nhầm chỗ**.
- **tầng 2 đếm bề mặt** — **N/A có lý do**: không dựng gác chạy xuyên suốt.
- **tầng 3 cặp fixture** — lưới không dựng hàm quét `scan*`.

Và theo `diff-visibility` D5: gác ở change này nằm trong **luồng điều khiển** (`resolve`, `quote`, nhánh
`!existsSync(out)`), không nằm trong chuỗi văn bản — nên lượt mutation ở đây có chỗ để gỡ nhầm, phải cẩn
thận như `probe-library`.

### D6 — Dự đoán ở D5 KHÔNG được xác nhận, và cách phân loại đúng hẹp hơn thế (ghi lúc apply)

D5 dựa vào `diff-visibility` D5 để dự đoán: gác ở change này nằm trong **luồng điều khiển** nên lượt
mutation sẽ có chỗ gỡ nhầm, phải cẩn thận như `probe-library`.

Đo được: **4/4 đột biến đúng ngay lần đầu**, nhất quán cả hai lần. Dự đoán sai.

Đọc lại ba lượt để tìm chỗ phân loại lệch:

| gác | hình dạng | đột biến đầu |
|---|---|---|
| `tenFileProbe` (`probe-library`) | vòng lặp **có đường lui cuối hàm** trả hash đầy đủ | **sai** — rút dãy vẫn thoả luật |
| chỉ dẫn trong prompt (`diff-visibility`) | một chuỗi | đúng |
| `quote` · `resolve` · `replaceAll` (change này) | **một biểu thức, không có đường lui** | đúng |

Phân biệt đúng không phải *văn bản vs luồng điều khiển* — nó là **gác có đường lui hay không**. Một gác có
đường lui thì gỡ vế đầu vẫn còn vế sau đỡ, nên đột biến trông như thất bại trong khi thật ra nó chưa chạm
tới gác. `quote` và `resolve` là một biểu thức: gỡ là mất hẳn.

Ghi lại vì D5 của `diff-visibility` sẽ được đọc như một quy tắc phân loại, và nó phân loại sai ở đúng ca
tiếp theo — chính ca này.

## Architecture

- `test/target-contract.test.ts` (MỚI) — ba nhóm ca, mỗi nhóm dựng repo git tạm riêng.
- Dọn worktree bằng `sb.huy()` và `rmSync` trong `finally` / `afterAll`.
- KHÔNG đụng `packages/harness/src/`.

## Data Model

Không đổi.

## Risks / Trade-offs

- [Ca chậm — worktree + spawn] → `timeout` riêng cho từng ca, không nới trần toàn cục.
- [`process.chdir` toàn cục] → D4 khai rõ; `finally` khôi phục.
- [15 điều đã có ca vẫn `pending`] → khai ở proposal; cùng tình trạng `diff-visibility` N1.
- [`node -e` phụ thuộc có `node` trên PATH] → repo này chạy bằng Node nên điều kiện ấy đã có sẵn.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
