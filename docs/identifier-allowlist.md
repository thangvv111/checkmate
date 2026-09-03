# Identifier allowlist — định danh tiếng Việt được miễn

Đóng băng **03/09/2026**. Sinh bởi change `identifier-language-gate`; lưới cưỡng chế là
`test/identifier-language.test.ts`.

Đây là danh sách **CHO PHÉP**, không phải danh sách cấm. Phép nhận diện tiếng Việt trong lưới chỉ là một
tín hiệu (từ điển âm tiết, có âm tính giả); chỗ quyết định một định danh có được đi qua hay không là bảng
dưới đây.

**Chỉ hai loại lý do miễn hợp lệ:**

- `code cũ` — định danh có trước ngày đóng băng. CLAUDE.md xếp việc đổi hàng loạt thành một change refactor
  riêng; đổi lắt nhắt từng chỗ khi tiện tay tạo trạng thái nửa nạc nửa mỡ tệ hơn cả hai đầu.
- `bắt nhầm` — tên tiếng Anh bị từ điển bắt vì âm trùng (ví dụ «doc» trong `API_DOC_CANDIDATES` là
  *document*). Hiện chưa có mục nào loại này: 28 âm trùng tiếng Anh đã bị loại khỏi từ điển.

⛔ **Danh sách này KHÔNG được nới ra để chứa định danh mới sinh.** Cách duy nhất để một định danh mới đi
qua lưới là đặt tên tiếng Anh. Một danh sách miễn trừ nở ra tự do thì lưới còn tệ hơn không có lưới — nó
tạo cảm giác đang được gác.

| định danh | file | lý do |
|---|---|---|
| `CHI_MUC` | `packages/harness/src/trigger-catalog.ts` | code cũ |
| `DongReviewLog` | `apps/web/src/store/migrate.ts` | code cũ |
| `FILE_KIEM` | `apps/web/src/provider.ts` | code cũ |
| `FILE_PROBE_MOI` | `packages/harness/src/skill-code.ts` | code cũ |
| `GH_HOI_LAI_MS` | `apps/web/src/github.ts` | code cũ |
| `GOC` | `packages/shared/src/paths.ts` | code cũ |
| `GOC_LIB` | `packages/harness/src/probe-library.ts` | code cũ |
| `Hang` | `apps/web/src/store/ledger-store.ts` | code cũ |
| `Hang` | `apps/web/src/store/run-store.ts` | code cũ |
| `JS_CONG` | `apps/web/src/ui.ts` | code cũ |
| `KHOA_QUA_HAN_MS` | `packages/harness/src/probe-library.ts` | code cũ |
| `KetQuaNeo` | `packages/harness/src/skill-doc.ts` | code cũ |
| `KetQuaSkillCode` | `packages/harness/src/skill-code.ts` | code cũ |
| `MAU_SINH_TU_DONG` | `packages/harness/src/target.ts` | code cũ |
| `MOI_TRANG` | `apps/web/src/ui-history.ts` | code cũ |
| `MucBoCu` | `packages/harness/src/probe-library.ts` | code cũ |
| `NHAN_CHET` | `packages/harness/src/probe-library.ts` | code cũ |
| `NHAN_HANH_VI_RIENG` | `packages/harness/src/probe-library.ts` | code cũ |
| `NHAN_PT` | `apps/web/src/ui-provider.ts` | code cũ |
| `NHAN_RUBRIC` | `packages/harness/src/skill-doc.ts` | code cũ |
| `NHIP_HOI_HEAD_MS` | `apps/web/src/server.ts` | code cũ |
| `NOI_SO_CONG` | `apps/web/src/store/run-store.ts` | code cũ |
| `RubricLoai` | `packages/harness/src/skill-doc.ts` | code cũ |
| `TRAN_DIFF` | `packages/harness/src/target.ts` | code cũ |
| `TRAN_GOI_MS` | `packages/harness/src/model.ts` | code cũ |
| `TRAN_LICH_SU` | `packages/harness/src/probe-library.ts` | code cũ |
| `TRAN_PROBE` | `packages/harness/src/probe-library.ts` | code cũ |
| `UngVien` | `packages/harness/src/skill-code.ts` | code cũ |
| `UngVien` | `packages/harness/src/skill-doc.ts` | code cũ |
| `VAI_HOP_LE` | `apps/web/src/cli-tai-khoan.ts` | code cũ |
| `bangChungHtml` | `apps/web/src/ui.ts` | code cũ |
| `buocQuaVungPhang` | `packages/harness/src/probe-library.ts` | code cũ |
| `chamPr` | `apps/web/src/server.ts` | code cũ |
| `chay` | `apps/web/src/cli-tai-khoan.ts` | code cũ |
| `chayDoiSoat` | `apps/web/src/server.ts` | code cũ |
| `chuanMuc` | `packages/shared/src/types.ts` | code cũ |
| `dangQuet` | `apps/web/src/server.ts` | code cũ |
| `danhDauXong` | `apps/web/src/ui.ts` | code cũ |
| `demTheoMuc` | `apps/web/src/ledger.ts` | code cũ |
| `diTruBoCotCong` | `apps/web/src/store/db.ts` | code cũ |
| `diTruSoCong` | `apps/web/src/store/migrate.ts` | code cũ |
| `docDanhTinhCong` | `apps/web/src/server.ts` | code cũ |
| `docMetaTho` | `packages/harness/src/probe-library.ts` | code cũ |
| `docTranProbe` | `packages/harness/src/probe-library.ts` | code cũ |
| `doiChieuHtml` | `apps/web/src/ui.ts` | code cũ |
| `donCayTienTrinh` | `packages/harness/src/sandbox.ts` | code cũ |
| `dongFinding` | `apps/web/src/gate.ts` | code cũ |
| `dsRepoTuLuu` | `apps/web/src/config.ts` | code cũ |
| `ghHoiLuc` | `apps/web/src/github.ts` | code cũ |
| `ghiMeta` | `packages/harness/src/probe-library.ts` | code cũ |
| `ghiNhan` | `apps/web/src/store/migrate.ts` | code cũ |
| `goiApi` | `apps/web/src/github.ts` | code cũ |
| `goiApiGhi` | `apps/web/src/github.ts` | code cũ |
| `goiChatCompletions` | `apps/web/src/model-source.ts` | code cũ |
| `hangMeta` | `apps/web/src/ui.ts` | code cũ |
| `hoiMatKhau` | `apps/web/src/cli-tai-khoan.ts` | code cũ |
| `hoiMatKhauHaiLan` | `apps/web/src/cli-tai-khoan.ts` | code cũ |
| `huongDan` | `apps/web/src/cli-tai-khoan.ts` | code cũ |
| `jsLuong` | `apps/web/src/ui.ts` | code cũ |
| `jsTrinhDien` | `apps/web/src/ui.ts` | code cũ |
| `khoiCong` | `apps/web/src/ui.ts` | code cũ |
| `khoiNgoaiTamNhin` | `packages/harness/src/skill-code.ts` | code cũ |
| `khongRaVerdictHtml` | `apps/web/src/ui.ts` | code cũ |
| `laBatDauRegex` | `packages/harness/src/probe-library.ts` | code cũ |
| `locKhoaBiet` | `apps/web/src/config.ts` | code cũ |
| `locMauHopLe` | `packages/harness/src/runner.ts` | code cũ |
| `locRepoBox` | `apps/web/src/ui-trust.ts` | code cũ |
| `loiCong` | `apps/web/src/server.ts` | code cũ |
| `loiCuPhapAnToan` | `packages/shared/src/spec-source.ts` | code cũ |
| `lyDoSinhTuDong` | `packages/harness/src/target.ts` | code cũ |
| `moTaLoi` | `apps/web/src/gate.ts` | code cũ |
| `napCotThieu` | `apps/web/src/store/db.ts` | code cũ |
| `napMetaTrongKhoa` | `packages/harness/src/probe-library.ts` | code cũ |
| `neoDuoc` | `packages/harness/src/skill-doc.ts` | code cũ |
| `nguNgan` | `packages/harness/src/probe-library.ts` | code cũ |
| `nguonFetch` | `apps/web/src/github.ts` | code cũ |
| `nguonO` | `apps/web/src/ui.ts` | code cũ |
| `phanLoai` | `packages/harness/src/skill-code.ts` | code cũ |
| `phatKhuon` | `packages/harness/src/trigger-examples.ts` | code cũ |
| `promptPhanTich` | `packages/harness/src/skill-code.ts` | code cũ |
| `promptSinhCode` | `packages/harness/src/skill-code.ts` | code cũ |
| `quanSatHtml` | `apps/web/src/ui.ts` | code cũ |
| `taSo` | `packages/harness/src/sources.ts` | code cũ |
| `theoDoiHead` | `apps/web/src/server.ts` | code cũ |
| `thoiGianChay` | `apps/web/src/ui.ts` | code cũ |
| `thuVienHtml` | `apps/web/src/ui.ts` | code cũ |
| `timKhoiIt` | `packages/harness/src/probe-library.ts` | code cũ |
| `veMuc` | `apps/web/src/store/ledger-store.ts` | code cũ |
| `xayKhuonLoi` | `packages/harness/src/skill-code.ts` | code cũ |

## Mười định danh KHÔNG có ở đây

Chúng sinh **sau** 01/09/2026 17:00 (lúc luật được chốt) nên không thuộc diện miễn, và đã đổi sang tiếng
Anh trong change `identifier-language-gate`:

- `HOI_QUY`
- `NOI_DUOC_DIEU_GI`
- `TRAN_SONG_SONG`
- `TrangThaiProbe`
- `UngVienToiThieu`
- `laThuMucQuyTrinh`
- `laTriggerHopLe`
- `loiSinhLaiKhongBangChung`
- `lyDoKhongPhaiThuMuc`
- `lyDoNgoaiRepo`

Tra bằng `git log -S<tên> --reverse` — cách này lấy commit ĐẦU TIÊN đưa tên vào repo nên không bị đánh lừa
bởi refactor dời file.
