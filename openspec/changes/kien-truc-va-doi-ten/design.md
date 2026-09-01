# Design — kiến trúc tầng và đổi tên lớp A

## Hiện trạng đo được (01/09), không phải phỏng đoán

Đếm câu `import` thật giữa các tầng:

```
   delivery (server.ts, ui*.ts, cli.ts)
        |  40
        v
   application (runs, cong, ledger, config, github, ncc)
        |  6                    ^  7   <-- "VONG"
        v                       |
   adapter/kho (db, kho-run, kho-socai, di-tru)

   engine (harness) --4--> shared     [khong import app: SACH]
   shared           --0-->            [khong import ai:  SACH]
   delivery(cli)    --3--> engine     [dung chieu]
```

Mổ 7 cạnh ngược:

| Cạnh | Loại | Nội dung |
|---|---|---|
| `db.ts` → `../paths.js` | **VALUE** | hằng `GOC` |
| `di-tru.ts` → `../paths.js` | **VALUE** | hằng `GOC` |
| `di-tru.ts` → `../runs.js` | type | `RunMeta`, `StoredEvent` |
| `di-tru.ts` → `../ledger.js` | type | `MucSoCai` |
| `kho-run.ts` → `../runs.js` | type | `RunMeta`, `StoredEvent` |
| `kho-run.ts` → `shared/types.js` | type | `Verdict` (đúng chiều, xuống nền) |
| `kho-socai.ts` → `../ledger.js` | type | `MucSoCai` |

**Vòng runtime chỉ do `paths.ts`** — 5 dòng, export đúng một hằng `GOC`, và bản chất nó là
infrastructure (đọc biến môi trường + `resolve`), không phải logic ứng dụng. Dời nó xuống nền là cắt
sạch vòng runtime bằng một thao tác.

Năm cạnh type còn lại: `RunMeta` / `MucSoCai` vốn là **kiểu miền**, đang nằm nhờ trong file ứng
dụng. Dời chúng xuống nền cũng đúng — nhưng `runs.ts` còn chứa `RunManager` (class có `spawn`, quản
lý tiến trình), tách kiểu khỏi class là một nhát dao riêng **không đổi hành vi gì**. Nhét vào change
này chỉ làm diff phình và khó review. **Ghi nợ.**

## Ma trận tầng — cái test sẽ cưỡng chế

```
             |  nen  | engine | adapter | app | delivery
   ----------+-------+--------+---------+-----+---------
   nen       |   -   |   x    |    x    |  x  |    x
   engine    |  OK   |   -    |    x    |  x  |    x
   adapter   |  OK   |   x    |    -    | type|    x
   app       |  OK   |   x    |   OK    |  -  |    x
   delivery  |  OK   |   OK   |   OK    | OK  |    -

   OK = duoc      x = CAM      type = chi duoc import type
```

Ba quyết định nằm trong ma trận này:

1. **`type` được phép ngược một bậc adapter → app.** Nó bị xoá lúc biên dịch. Chặn nó không làm
   chương trình chạy khác đi, chỉ ép một đợt tách file. Khi nợ «tách `RunMeta`» được trả, ô này siết
   thành `x` — và đó là lúc siết đúng.
2. **`engine` cấm chạm `adapter`.** Hôm nay chưa có cạnh nào, luật này là **giữ trước khi mất**:
   engine chạy trong sandbox worktree, dính vào lớp kho là kéo SQLite vào chỗ không có nó.
3. **`delivery` được gọi mọi tầng dưới.** Đây là tầng mỏng, không nghiệp vụ.

## Cách kiểm — đọc import thật, không đọc tài liệu

Test duyệt mọi `.ts` trong `packages/**/src` và `apps/**/src`, bắt câu `from '<đường dẫn tương
đối>'`, phân giải sang đường dẫn tuyệt đối, xếp tầng cho hai đầu, đối chiếu ma trận. Phân biệt
`import type` với `import` thường bằng chính từ khoá trong câu import.

Khi đỏ phải nói đủ: **file nguồn → file đích, cặp tầng, và loại import**. Một lưới nói «vi phạm kiến
trúc» mà không nói ở đâu thì người đọc phải đi tìm — đó là báo sai bản chất, lỗi cùng họ với những
gì repo này bắt suốt.

Xếp tầng bằng đường dẫn (`packages/shared` → nền, `apps/web/src/kho` → adapter…). Đơn giản, đọc được,
và khi cấu trúc thư mục đổi thì test đỏ — đúng ý: cấu trúc thư mục **là** kiến trúc ở repo này.

## Đổi tên: ba lớp và lưới của từng lớp

```
   A  ten HAM/BIEN/KIEU/FILE      -->  tsc bat het        -->  DOI
   B  field bi JSON.stringify     -->  KHONG AI BAT       -->  DONG BANG
      nguyen khoi + ten cot            (JSON tu do)
   C  khoa checkmate.yml repo dich -->  KHONG AI BAT      -->  DONG BANG
```

**Ranh giới đi theo phép serialize, không theo file.** Hai bẫy đã đo được:

- `KeHoachProbe` trông như kiểu nội bộ, nhưng 5 field của nó (`id · ten · muc_dich · spec_rule ·
  ky_vong`) được ghi vào sổ thư viện probe ở field `plan`. → **tên kiểu là A, field bên trong là B.**
- `RunMeta.tieuDe` ngược lại: cửa ghi map tay từng field sang cột, nên field TS không băng qua ranh
  giới → **A**; chỉ tên cột `tieu_de` là B.

Một kiểu có thể **nửa A nửa B**. Đây là chỗ chắc chắn sẽ đổi nhầm nếu chỉ dựa vào mắt.

**Lưới cho lớp B**: hai fixture **dữ liệu đời thật** — một verdict đã lưu và một sổ thư viện probe
đã lưu — nạp lên rồi assert đủ trường. Fixture phải là dữ liệu **cũ**, không phải object dựng trong
test: object dựng trong test mang tên MỚI nên nó xanh cả khi đã đổi hỏng.

**Lưới cho lớp C**: `checkmate.yml` của repo đích không đổi; test hợp đồng repo hiện có (`⛔C5`) vẫn
canh bảng module — và bảng đó **phải khai lại theo tên mới**, đây là chỗ đã bắt hụt 5 lần trong lịch
sử repo.

## Thứ tự thi công — hai commit tách bạch

Đổi tên và di chuyển file cùng lúc thì mọi dòng diff đều đổi, review bằng mắt gần như bất khả, và
`git` mất khả năng nhận ra rename.

```
   commit 1: DI CHUYEN thuan   (paths.ts xuong nen; khong doi mot ky tu noi dung)
   commit 2: DOI TEN thuan     (khong file nao doi cho)
   commit 3: luoi              (test import-graph + test doc-du-lieu-cu)
   commit 4: don luat het hieu luc (config.yaml + schema instruction)
```

Commit 3 đáng lẽ nên đứng **trước** commit 1 theo tinh thần test-trước. Nhưng lưới import-graph viết
trước khi dời `paths.ts` thì nó đỏ ngay từ lúc sinh ra vì vòng còn đó — một lưới đỏ lúc ra đời không
phân biệt được «đang bắt lỗi thật» với «chưa ai sửa». Nên: **viết lưới ở commit 3 và chứng minh nó
load-bearing bằng cách tạm hoàn tác commit 1, thấy nó đỏ đúng chỗ, rồi làm lại.**

## Nợ có tên — không phải quên

| Nợ | Vì sao hoãn |
|---|---|
| Đổi tên lớp B/C | cần lớp đọc-cả-hai-tên + di trú SQLite + thông báo repo khách; đủ lớn cho một change riêng |
| `Storage` port | PO chốt giữ SQLite. Port một-adapter là interface trang trí, và chữ ký hôm nay (`node:sqlite` **sync**) sẽ sai ngày đổi thật (`pg` **async**). `R9` đã giữ đúng tài sản này |
| Tách `RunMeta`/`MucSoCai` khỏi file ứng dụng | siết ô `type` trong ma trận thành `x`; nhát dao riêng, không đổi hành vi |
