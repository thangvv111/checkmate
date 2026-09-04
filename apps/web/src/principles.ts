/**
 * Chín nguyên tắc của CheckMate — DỮ LIỆU, không phải chữ viết thẳng trong HTML.
 *
 * Vì sao là dữ liệu: chỉ khi nó là dữ liệu thì mới đếm được (đủ chín chưa, số có đứt quãng không) và mới
 * KIỂM ĐƯỢC ĐƯỜNG DẪN. Một lưới quét HTML tìm chín tiêu đề là lưới đoán, và lưới đoán sai theo cả hai
 * chiều — đúng thứ `test-grid-integrity` sinh ra để chống.
 *
 * ⛔ `thayO.duong` phải trỏ tới một route CÓ THẬT. Gói design CCS viết về dòng này:
 *
 *     «Giữ liên kết này khi sửa màn khác — nó là bằng chứng rằng nguyên tắc không chỉ là khẩu hiệu.»
 *
 * Một lời dặn thì trôi, nên nó có lưới: `test/principles-screen.test.ts` đọc route thật từ `server.ts` và
 * ĐỎ khi một đường chết. Đường chết nghĩa là hoặc sản phẩm đã bỏ nguyên tắc ấy, hoặc trang này đang nói
 * dối — cả hai đều phải lộ ra.
 *
 * Tiêu chí chọn đường: chỗ nguyên tắc **HIỆN HÌNH**, không phải chỗ **nói về** nó. Trỏ tới một đoạn văn
 * giải thích thì vẫn là khẩu hiệu trỏ sang khẩu hiệu.
 */

export interface Principle {
  /** Hai chữ số, 01–09. Chuỗi chứ không phải số: nó là NHÃN hiển thị, và số 0 đầu là phần của nhãn. */
  so: string;
  tieuDe: string;
  than: string;
  /** Chỗ nguyên tắc này hiện hình trong sản phẩm. */
  thayO: { nhan: string; duong: string };
}

/** Câu mở đầu trang. Gói design liệt kê nó ở mục «Copy đáng giữ nguyên» — khoá nguyên văn bằng lưới. */
export const PRINCIPLES_POSTER = 'Checker không tin ai. Chỉ tin bằng chứng.';

export const PRINCIPLES: readonly Principle[] = [
  {
    so: '01',
    tieuDe: 'Chỉ nói điều chứng minh được',
    than:
      'Mỗi finding đi kèm lệnh probe đã chạy và hai khối bằng chứng đặt cạnh nhau: KỲ VỌNG và THỰC TẾ. ' +
      'Không có bằng chứng thì không có finding — model viết lời văn, nhưng nó không tự thêm được một cáo buộc.',
    thayO: { nhan: 'màn Lịch sử → mở một lượt → khối bằng chứng hai cột', duong: '/lich-su' },
  },
  {
    so: '02',
    tieuDe: 'Đối chứng hai nhánh trước khi quy tội',
    than:
      'Mỗi probe chạy THẬT trên cả nhánh pull request lẫn nhánh gốc. Đỏ ở nhánh PR mà xanh ở gốc mới là ' +
      'hồi quy; đỏ ở cả hai là lỗi có sẵn, không phải tội của PR này. Máy phân loại theo bảng chân trị, ' +
      'model không được sửa nhãn.',
    thayO: { nhan: 'màn Lịch sử → mở một lượt → khối Đối chiếu hai nhánh', duong: '/lich-su' },
  },
  {
    so: '03',
    tieuDe: 'Không đủ cơ sở thì không ra verdict',
    than:
      'Lượt chấm mà không probe nào pass, hồi quy hay cải thiện thì nó KHÔNG chứng minh được gì. Đó là ' +
      'lượt chấm thất bại, không phải PASS. Nó có nhãn riêng, đếm được và lọc được — vì con số ấy nói ' +
      'lên chỗ yếu của chính engine.',
    thayO: { nhan: 'màn Lịch sử → lọc «Không đủ cơ sở»', duong: '/lich-su?verdict=khong_du_co_so' },
  },
  {
    so: '04',
    tieuDe: 'Cắt được nhưng không cắt âm thầm',
    than:
      'Diff quá lớn thì phải cắt. Nhưng mọi file bị loại khỏi diff đều được liệt kê kèm lý do từng file, ' +
      'và file mã nguồn bị loại vì vượt trần thì có banner cảnh báo riêng — verdict không phủ file đó, và ' +
      'người đọc phải thấy ngay chứ không phải đọc chú thích cuối trang.',
    thayO: { nhan: 'màn Lịch sử → mở một lượt → banner Vùng mù của diff', duong: '/lich-su' },
  },
  {
    so: '05',
    tieuDe: 'Verdict ghim commit',
    than:
      'Một verdict thuộc về ĐÚNG một commit. Head đổi thì verdict cũ hết hiệu lực ở cổng, và điều đó phải ' +
      'nói ra TRƯỚC khi có ai bấm nút. Sổ cái ghi artifact kèm mã commit để không verdict nào trôi sang ' +
      'một phiên bản mã nguồn khác.',
    thayO: { nhan: 'Sổ cái → cột artifact, dòng phụ repo#PR @ SHA', duong: '/ledger' },
  },
  {
    so: '06',
    tieuDe: 'FAIL khoá cứng, PASS có cảnh báo phải có người đứng tên',
    than:
      'Verdict FAIL khoá nút Merge, không có đường lách. PASS còn cảnh báo mức medium thì nút chỉ mở sau ' +
      'khi có người tick từng cảnh báo, và tên người ấy vào receipt. Máy không bao giờ merge — không có ' +
      'công tắc nào bật được điều đó.',
    thayO: { nhan: 'Sổ cái → cột hành động cổng, có tên người xác nhận', duong: '/ledger' },
  },
  {
    so: '07',
    tieuDe: 'Sổ cái chỉ ghi thêm',
    than:
      'Mọi kết luận chấm vào sổ, không sửa, không xoá. Trigger trong cơ sở dữ liệu là thứ thi hành điều ' +
      'đó, không phải kỷ luật của người viết code. Một cuốn sổ sửa được thì nó không còn là bằng chứng.',
    thayO: { nhan: 'Sổ cái verdict', duong: '/ledger' },
  },
  {
    so: '08',
    tieuDe: 'Tin cậy không nới cổng',
    than:
      'Thang tin cậy đếm track record từ sổ cái, và chỉ để NHÌN. Pull request của người có tỉ lệ PASS cao ' +
      'bị chấm y hệt người mới. Một cổng nới theo danh tiếng là cổng đã hỏng.',
    thayO: { nhan: 'Thang tin cậy tác giả', duong: '/tin-cay' },
  },
  {
    so: '09',
    tieuDe: 'Thiếu cấu hình thì dừng, không đoán',
    than:
      'Chưa có khoá đã kiểm thì lượt chấm dừng NGAY, trước khi clone và dựng diff — chứ không chạy vài ' +
      'phút rồi mới hỏng. Nút «Dùng nhà cung cấp này» chỉ sáng khi đã kiểm thành công với đúng model và ' +
      'phương thức đang chọn.',
    thayO: { nhan: 'Cấu hình → khối Nhà cung cấp model', duong: '/settings' },
  },
];
