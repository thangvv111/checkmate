## ADDED Requirements

### Requirement: Trần khối lượng tách theo skill, là khoá cấu hình có kẹp dải, và trần hiệu dụng khai đủ nguồn

Trần số finding của `skill-doc` và trần số probe của `skill-code` là **hai khoá riêng** trong khối
`standards` của `checkmate.yml` repo đích: `finding_cap` (mặc định 100, kẹp `[4, 1000]`) và `probe_cap`
(mặc định 100, kẹp `[2, 100]`). Hai đại lượng có chi phí biên khác hẳn nhau — một finding doc là vài trăm
token; một probe là token sinh code **cộng** hai lượt chạy sandbox — nên MUST NOT dùng chung một con số.

Trần probe **hiệu dụng** SHALL là `min(probe_cap của repo, agent.max_probe của người vận hành)`. Tài
nguyên sandbox là của bên chấm; repo đích được **đề nghị** một trần, không được **áp** nó lên máy chủ của
người khác. Mặc định phía repo SHALL đặt ở **cận trên của dải** (PO chốt 07/09): phía bị chấm để rộng,
việc siết thuộc về núm của bên chấm — repo đích tự đặt trần thấp cho chính mình là maker chỉnh checker.

Mọi khoá số SHALL qua một phép kẹp duy nhất: giá trị được nhận **chỉ khi** `typeof v === 'number'` và hữu
hạn; sau đó lấy phần nguyên rồi kẹp vào dải. Mọi thứ khác — chuỗi (kể cả chuỗi số), `null`, boolean, mảng,
object, `Infinity`, `NaN` — rơi về mặc định kèm lý do. Giá trị bị kẹp SHALL ghi `clamped_from`.

Trần là **giới hạn xử lý ta chấp nhận**, không phải phát biểu về chất lượng artifact. Nó MUST NOT được
dùng làm căn cứ PASS hay FAIL.

Engine MUST NOT có trần **ẩn** — trần nào có tác dụng thì phải lên verdict. Trần token đầu ra của provider
(`model.ts:235` 8000 · `:333` 16000) là trần **thật** của đường code và MUST được ghi trong tài liệu
`checkmate.yml`; việc nhận diện phản hồi bị cắt thành lỗi có tên là điều kiện tiên quyết trước khi nâng
mặc định `probe_cap` (xem tasks § Sau-merge), không thuộc change này.

*Vì sao kẹp chứ không từ chối: giá trị đến từ repo đích (⛔C4). Từ chối cả file vì một số sai dải là để
một dòng gõ nhầm giết cả lượt chấm. Vì sao predicate chặt hơn khuôn `Number(x) || d` của `timeout_s`: khuôn
ấy nhận `true → 1`, `"100" → 100`, `[5] → 5`, `.inf → ∞` — với một khoá quyết cách cắt finding, mỗi ca ấy
là một cách ra `NaN` hoặc một số không ai khai. `[].slice(0, NaN)` trả mảng rỗng ⇒ 0 finding ⇒ `PASS`.*

#### Scenario: repo không khai gì
- **WHEN** `checkmate.yml` không có khối `standards`
- **THEN** `finding_cap` = 100, `probe_cap` = 100, và verdict khai nguồn của cả hai là mặc định của engine

#### Scenario: repo khai trong dải
- **WHEN** repo khai `standards.finding_cap: 250` và `standards.probe_cap: 40`
- **THEN** hai trần là 250 và 40, nguồn `repo`, không `clamped_from`

#### Scenario: trần probe hiệu dụng là min của repo và operator
- **WHEN** repo khai `probe_cap: 40` và người vận hành đặt `agent.max_probe` = 6
- **THEN** trần probe hiệu dụng là 6, verdict khai cả hai giá trị và ghi nguồn đang cắn là `operator`

#### Scenario: khai ngoài dải bị kẹp và bị khai ra
- **WHEN** repo khai `finding_cap: 5000`, hoặc `finding_cap: 0`
- **THEN** giá trị bị kẹp về 1000 (hoặc 4), và verdict ghi `clamped_from` là giá trị gốc

#### Scenario: giá trị không phải số hữu hạn rơi về mặc định
- **WHEN** repo khai `finding_cap` là `"100"`, `"nhiều"`, `null`, `true`, `[5]`, `{}`, `.inf`, hoặc `1e309`
- **THEN** trần dùng mặc định kèm lý do `invalid_type`, và engine MUST NOT tạo ra `NaN` ở bất kỳ phép cắt nào

#### Scenario: `checkmate.yml` sai cú pháp không giết lượt chấm
- **WHEN** `checkmate.yml` ở nhánh gốc hỏng cú pháp YAML
- **THEN** mọi khoá rơi về mặc định, nguồn ghi `default_unreadable` (phân biệt với «chưa từng khai»), người
  vận hành nhận thông báo, lượt chấm KHÔNG ném

### Requirement: Model MUST NOT được cho biết trần, nhưng prompt MUST còn phanh precision

Không prompt nào gửi cho model được chứa **con số** trần hay **từ chỉ lượng** thay thế nó («vài», «mươi»,
«không quá», «tối đa N»). Việc cắt xảy ra **sau** khi model trả lời, bằng máy.

Nhưng prompt SHALL giữ một **chỉ thị chọn lọc không số** — phanh precision. Câu bị gỡ hôm nay mang cả hai
thứ; gỡ trọn câu là gỡ mất phanh. Câu thay cho `skill-doc`:

> «Ghi MỌI lỗi mà trích dẫn nguyên văn tự chứng minh được, và CHỈ những lỗi đó — finding không đứng được
> bằng trích dẫn sẽ bị máy loại. Mỗi lỗi một finding; không gộp, không tách, không lặp. Không cần finding
> cho mọi loại rubric.»

Câu thay cho `skill-code`:

> «Đủ probe để mỗi đơn vị luật mà diff chạm tới có một phép thử; không probe cho luật diff không đụng.»

Lưới SHALL bắt **cả hai chiều**: con số bò lại vào prompt là ĐỎ, **và** prompt mất phanh precision cũng
là ĐỎ. Lưới quét source nên phải có cặp fixture (`test-grid-integrity`).

*Vì sao: đo được ở `skill-code` — trần từng biến thành định mức, `ke_hoach = trần` ở 14/14 lượt
(`types.ts:186`). Đó là phép đo của trần probe; với `skill-doc` là ngoại suy (18 lượt trong `runs/` model
trả 0–6 khi được cho 8). Nhưng cơ chế thì chung: một con số trong prompt là một đơn đặt hàng.*

#### Scenario: prompt không mang số và không mang từ chỉ lượng
- **WHEN** engine dựng prompt tìm finding hoặc prompt phân tích probe với trần cấu hình bất kỳ
- **THEN** chuỗi đi ra không chứa giá trị trần, và không khớp mẫu «tối đa / không quá / nhiều nhất / vài /
  mươi + finding|probe»

#### Scenario: prompt còn phanh precision
- **WHEN** engine dựng prompt tìm finding
- **THEN** chuỗi đi ra chứa chỉ thị chọn lọc không số ở trên; gỡ câu ấy đi là lưới ĐỎ

#### Scenario: lưới bắt con số bò lại, có cặp fixture
- **WHEN** chạy lưới quét trên fixture «Tối đa 8 finding» và trên fixture source đã gỡ số nhưng có dòng
  `100| nội dung` (số dòng của `docCoSoDong`)
- **THEN** fixture thứ nhất ĐỎ nêu đúng file:dòng, fixture thứ hai XANH — số dòng, hunk diff, «≥ 8 từ»
  không phải con số trần

### Requirement: Đếm trước cắt, cắt sau lưới máy, cắt đúng một chỗ, sắp theo severity hiệu lực

Engine SHALL đếm số ứng viên ở **từng tầng** trước khi cắt: sau vòng 1 (thô), sau lưới rubric, sau lưới
tham chiếu chết, sau neo trích dẫn, sau vòng 2 (nếu có), sau cắt, sau phản biện, cuối. Con số này lên
verdict (hình dạng ở `verdict-contract`).

Phép cắt theo trần SHALL xảy ra ở **đúng một chỗ**: sau lưới neo trích dẫn và sau vòng 2, **trước** vòng
phản biện. Ba chỗ cắt hôm nay (`skill-doc.ts:204`, `:260`, `:264`) gộp về một; hai chỗ đầu chỉ đếm. Không
được có `.slice(0, <trần>)` nào ngoài hàm cắt duy nhất.

Khoá sắp xếp SHALL là **severity hiệu lực** — mức sau khi kẹp theo rubric (rubric mềm tối đa `medium`,
rubric số liệu tối thiểu `medium`; phép kẹp hôm nay ở `skill-doc.ts:330–332` được rút thành hàm dùng chung
cho cả sắp xếp lẫn verdict). Giá trị severity lạ hoặc không phải chuỗi SHALL lên verdict là `high`
(fail-closed) nhưng khi **sắp xếp** đứng **sau** `high` hợp lệ và **trước** `medium` — để một model ghi
`blocker`/số/trống không đẩy được finding `high` thật ra khỏi trần.

Cùng severity hiệu lực thì rubric **đối chiếu hai vế** (`mau_thuan`, `lech_cheo`, `khoang_ho_nguong` — bằng
chứng là hai trích dẫn máy đã neo) SHALL đứng trước rubric mềm (một trích dẫn). Cùng mức, cùng lớp thì giữ
thứ tự gốc — sắp xếp SHALL ổn định. Ứng viên đã neo ở vòng 1 MUST NOT bị ứng viên vòng 2 đẩy ra: vòng 2
sắp riêng, nối sau, cắt đuôi.

*Vì sao cần khoá phụ — đo được khi viết ca test: 11 `thieu_ac` model ghi `high` và 1 `mau_thuan` model ghi
`low` đều có mức hiệu lực `medium`; chỉ sắp theo mức rồi ổn định theo thứ tự gốc thì mâu thuẫn số liệu đứng
cuối và bị cắt — đúng kết cục mà việc sắp theo mức hiệu lực sinh ra để tránh.*

*Vì sao cắt sau lưới: cắt trước lưới là để 100 ứng viên không neo được chiếm suất của cái thứ 101 neo tốt,
và là để trần do repo đích khai quyết luôn phép đo mật độ (hạ `finding_cap` xuống 4 là không bao giờ vượt
chuẩn). Vì sao khoá là severity hiệu lực: kẹp theo rubric chạy ở stage 5 — sau mọi chỗ cắt — nên sort theo
mức thô là để `thieu_ac` model ghi `high` (thật: `medium`) đứng trên `mau_thuan` model ghi `low` (thật:
`medium`), và cái bị vứt là mâu thuẫn số liệu.*

#### Scenario: đếm độc lập với trần
- **WHEN** vòng 1 trả 25 ứng viên, 8 qua lưới máy, trần là 4
- **THEN** verdict ghi `raw_round1: 25`, `after_machine_grids: 8`, `before_cut: 8`, `after_cut: 4`,
  `dropped_by_cap: 4` — số trước cắt không đổi khi đổi trần

#### Scenario: cắt giữ finding nặng theo severity hiệu lực
- **WHEN** 12 ứng viên đã neo gồm 11 `thieu_ac` model ghi `high` rồi 1 `mau_thuan` model ghi `low` đứng
  CUỐI, trần 10
- **THEN** `mau_thuan` (hiệu lực `medium`, hai vế) đứng đầu và nằm trong 10 cái giữ; hai cái bị cắt là hai
  `thieu_ac` cuối theo thứ tự gốc (hiệu lực `medium`, rubric mềm)

#### Scenario: severity lạ không chiếm suất của high thật
- **WHEN** 3 finding `high` hợp lệ, 2 finding severity `blocker`, 1 finding severity là số `3`, trần 4
- **THEN** 3 `high` hợp lệ đều giữ; trên verdict hai cái lạ còn lại (nếu giữ) mang `high`; engine KHÔNG ném

#### Scenario: vòng 2 không đẩy vòng 1 đã neo
- **WHEN** vòng 1 có 9 ứng viên đã neo (mức thấp), vòng 2 bổ sung 3 ứng viên `high`, trần 10
- **THEN** 9 ứng viên vòng 1 đều giữ, chỉ 1 trong 3 ứng viên vòng 2 vào

#### Scenario: chỉ một chỗ cắt trong source
- **WHEN** lưới quét `packages/harness/src/skill-doc.ts` tìm `.slice(0, <trần>)`
- **THEN** chỉ thấy đúng một chỗ, nằm trong hàm cắt duy nhất; fixture có hai chỗ cắt là ĐỎ

### Requirement: Mật độ được đo theo định nghĩa máy và ghi ở mọi lượt doc — bước này chỉ quan sát

Ở mọi lượt `skill-doc`, engine SHALL đo **mật độ** = số ứng viên **đã qua lưới máy, trước cắt** × 1000 /
số từ, và ghi lên verdict: `words`, `count_method`, `measured_per_1000`, dải cỡ (`band`: `<=1000` ·
`<=5000` · `>5000`), ngưỡng của dải, `exceeded`, và `applied: false` kèm lý do (`observe_only` ·
`under_floor` · `unmeasurable` · `error`). Lượt không có repo vẫn đo — nguồn `no_repo` nằm ở khoá chuẩn,
không phải ở lý do đo.

**Đơn vị «từ»** SHALL là hàm máy `countDocWords(docGoc)`, phương pháp `v1`: đếm trên `docGoc` (MUST NOT
trên `docCoSoDong` — bản có tiền tố số dòng); bỏ front-matter YAML và khối code fence; thay ký tự markdown
và ống bảng (`| * _ \` > # - :`) bằng khoảng trắng; tách theo khoảng trắng; giữ token có ít nhất một chữ
hoặc số Unicode. Với tiếng Việt, token khoảng trắng ≈ âm tiết; mặc định chốt cho tài liệu tiếng Việt.

**Sàn cỡ** `density_floor_words` mặc định 300, kẹp `[50, 2000]`; dưới sàn ⇒ `applied: false`, lý do
`under_floor`, vẫn ghi `words`.

**Bậc thang theo cỡ** — bảng công bố, dưới tuyến tính; con số ở bước này là **số tạm** để ghi `band` và
`exceeded`, chốt lại ở change ép chuẩn từ dữ liệu sổ cái:

| dải cỡ (từ) | ngưỡng finding / 1000 từ |
|---|---|
| 300 – 1000 | 20 |
| 1000 – 5000 | 12 |
| > 5000 | 8 |

`standards.density_per_1000_words` (kẹp `[1, 1000]`) SHALL nhân tỉ lệ cả bảng (khai 40 ⇒ dải đầu 40, dải
hai 24, dải ba 16) — repo đích chỉnh **mức**, không chỉnh **hình dạng**.

Ở bước này `exceeded = true` MUST NOT đổi verdict, MUST NOT bỏ vòng nào, MUST NOT sinh finding nào.

Chuẩn mật độ SHALL chỉ đo ở `skill-doc`. `skill-code` không đo — số finding của code neo vào ứng viên probe
(`skill-code.ts:875` vứt finding không trỏ vào ứng viên hợp lệ; change này thêm khử trùng `ma` để chặn
trên đúng nghĩa), nên trần probe đã làm việc của chuẩn mật độ.

*Vì sao chỉ đo: chuẩn công bố (không suy từ dữ liệu của một đội) chỉ lành mạnh khi có phép đo kiểm chứng.
18 lượt doc trong `runs/` cho raw tối đa 6/1048 từ ≈ 5.7/1000 trên tài liệu gieo lỗi cố ý — chưa có tài
liệu thật nào vượt 20. Bật FAIL hôm nay là bật một nhánh hoặc chết, hoặc nổ theo độ nói nhiều của model —
không biết cái nào. Vì sao bậc thang: căn cứ của số là sức xử lý của người nhận trong một lượt, hằng số
tuyệt đối theo lượt, không tỉ lệ theo số từ; tuyến tính siết mạnh nhất ở tài liệu nhỏ (400 từ: 9 finding
là vỡ) và không bao giờ chạm ở tài liệu lớn (10 000 từ được 190).*

#### Scenario: đo và ghi, không đổi verdict
- **WHEN** tài liệu 400 từ, 12 ứng viên qua lưới máy, không finding nào `high`
- **THEN** verdict ghi `measured_per_1000: 30`, `band: '<=1000'`, `exceeded: true`, `applied: false`,
  lý do `observe_only`, và kết quả vẫn là `PASS`; vòng phản biện vẫn chạy

#### Scenario: dưới sàn cỡ
- **WHEN** tài liệu 180 từ, 9 ứng viên
- **THEN** `words: 180`, `applied: false`, lý do `under_floor`, không tính `exceeded`

#### Scenario: đơn vị từ ổn định qua bố cục
- **WHEN** cùng nội dung viết dạng bảng markdown và dạng văn xuôi
- **THEN** `countDocWords` lệch nhau dưới 10%; và thêm tiền tố `N| ` vào mỗi dòng không đổi số đếm

#### Scenario: mật độ đo trước cắt, độc lập với trần
- **WHEN** 30 ứng viên qua lưới máy trên 1000 từ, `finding_cap: 4`
- **THEN** `measured_per_1000: 30` — hạ trần không hạ được mật độ đo

#### Scenario: repo chỉnh mức, không chỉnh hình dạng
- **WHEN** repo khai `density_per_1000_words: 40`, tài liệu 3000 từ
- **THEN** ngưỡng của dải là 24 (40 × 12/20), verdict khai ngưỡng ấy kèm nguồn `repo`

#### Scenario: sàn ngoài dải bị kẹp
- **WHEN** repo khai `density_floor_words: .inf` hoặc `1000000000`
- **THEN** sàn bị kẹp về 2000, verdict ghi `clamped_from`, và tài liệu 2500 từ vẫn được đo

#### Scenario: đếm từ lỗi thì không đo, mọi thứ khác nguyên
- **WHEN** `countDocWords` ném hoặc trả 0 cho tài liệu không rỗng
- **THEN** `applied: false` lý do `error`/`unmeasurable`, các số đếm theo tầng vẫn ghi, verdict không đổi

#### Scenario: skill-code không mang phép đo mật độ
- **WHEN** lượt chấm là `skill-code`
- **THEN** verdict không có khối mật độ — vắng, không ghi 0

### Requirement: Chuẩn đọc từ nhánh gốc qua git, không từ đĩa; không repo thì khai no_repo

Khối `standards` SHALL đọc bằng `git show <baseRef>:checkmate.yml` trên clone, ở nơi có cả repo lẫn base
(`cli.ts`), rồi giải thành một `VolumeStandard` đã kẹp và truyền xuống hai skill. Hàm skill MUST NOT tự mò
`checkmate.yml` từ đường dẫn file hay thư mục sandbox.

Cửa đọc MUST NOT đọc bản trên đĩa của working tree. Đo được: clone chỉ `clone --no-single-branch` +
`fetch` vào `refs/checkmate/*` (`github.ts:512`, `:428`), **không checkout**, nên working tree là snapshot
nhánh default **lúc kết nối** và không bao giờ đổi. Đọc đĩa là đọc một bản đã chết.

Lượt doc trong pull request SHALL nhận `--base` như lượt code (`server.ts:316`); tài liệu dán tay / tải lên
không có repo SHALL dùng mặc định và verdict khai nguồn `no_repo`.

Luật đối xứng: giá trị của nhánh pull request không có tác dụng **kể cả khi nghiêm hơn**.

*Vì sao `git show` chứ không checkout: cùng khuôn `target.ts:136` đã dùng cho spec nhánh gốc; không đụng
working tree, không đua với lượt chấm song song. Vì sao no_repo phải lộ: cùng một tài liệu qua PR chấm theo
chuẩn repo, dán tay chấm theo mặc định — hai PASS khác nghĩa trong cùng một đội nếu verdict không nói.*

#### Scenario: đội sửa chuẩn trên nhánh gốc sau khi kết nối
- **WHEN** repo đã kết nối từ trước với `checkmate.yml` mặc định, sau đó nhánh gốc đẩy `density_per_1000_words: 40`
- **THEN** lượt chấm kế tiếp áp 40 — phân biệt được «đọc git» với «đọc đĩa» bằng chính ca này

#### Scenario: pull request nới chuẩn cho chính nó thì không ăn
- **WHEN** nhánh gốc 20, nhánh pull request sửa `checkmate.yml` lên 500
- **THEN** lượt chấm áp 20

#### Scenario: pull request siết cũng không ăn
- **WHEN** nhánh gốc 20, nhánh pull request sửa xuống 2
- **THEN** lượt chấm áp 20

#### Scenario: nhánh gốc không có `checkmate.yml`, pull request thêm mới
- **WHEN** `git show <baseRef>:checkmate.yml` không có file
- **THEN** mặc định, nguồn `default`; file mới của pull request không có tác dụng

#### Scenario: lượt doc trong PR nhận base
- **WHEN** server khởi chạy lượt doc cho một pull request
- **THEN** lệnh có `--base <baseRef>`, và chuẩn đọc theo ref ấy — không theo `sb.dir` của nhánh PR

#### Scenario: tài liệu không có repo
- **WHEN** lượt chấm là tài liệu dán tay hoặc tải lên
- **THEN** chuẩn là mặc định và verdict khai nguồn `no_repo`
