/**
 * Đọc nội dung danh sách file mà `git ls-files` nói là đang theo dõi — chịu được **chỉ mục lệch đĩa**.
 *
 * File này KHÔNG phải lưới (không đuôi `.test.ts` nên `vitest.config.ts` không gom). Nó là chỗ ở chung
 * của một phép đọc mà lưới khác dùng; ca test của nó nằm ở `test/stale-index-file-scan.test.ts`.
 *
 * ## Vì sao phải tách ra
 *
 * Lưới `r-rules-map` gãy **BA lần trong cùng ngày 05/09**, cả ba đều ngay sau `openspec archive`:
 *
 * ```
 * Error: ENOENT: no such file or directory, open '…/openspec/changes/<change>/.openspec.yaml'
 * ```
 *
 * `openspec archive` **DỜI** cả thư mục change sang `changes/archive/`. Giữa lúc dời và lúc commit,
 * chỉ mục git còn trỏ đường cũ, còn đĩa thì không còn file. Lưới `readFileSync` thẳng từng đường git
 * đọc ra, không hỏi nó còn đó không.
 *
 * Luật mà lưới cưỡng chế («mọi mã R trích trong repo có hàng trong bảng tra») vẫn đúng — cái sai là một
 * **giả định ngầm**: «git nói file tồn tại thì nó tồn tại». Giả định ấy sai ở đúng một khoảnh khắc, và
 * khoảnh khắc ấy lặp lại ở MỌI lần archive.
 *
 * ## Vì sao không được sửa bằng cách nuốt lỗi
 *
 * `try { … } catch {}` cho hết là đổi một lỗi **ồn ào** lấy một lỗi **im**: phép quét bớt phủ mà không
 * ai biết. Nên ở đây bỏ qua thì phải ĐẾM (`boQua`), và phải có {@link scanBlindness} — nếu vì lý do nào
 * đó cả danh sách thành vắng mặt (sai thư mục làm việc, `git` trả rỗng, lệnh đổi cú pháp) thì lưới sẽ
 * **XANH mà không quét gì**, đúng lỗi lưới **loại 1** mà `test-grid-integrity` mô tả: xanh trên một hệ
 * thống đã hỏng.
 */

export interface DocKetQua {
  daDoc: { p: string; text: string }[];
  /** File có trong danh sách mà không đọc được — bỏ qua thì phải ĐẾM, không nuốt. */
  boQua: string[];
}

export function readTrackedText(files: readonly string[], doc: (p: string) => string): DocKetQua {
  const daDoc: { p: string; text: string }[] = [];
  const boQua: string[] = [];
  for (const p of files ?? []) {
    if (typeof p !== 'string' || !p) continue;
    try {
      daDoc.push({ p, text: doc(p) });
    } catch {
      // Vắng mặt, không quyền, là thư mục — cùng một xử lý: một file không đọc được KHÔNG được giết
      // phép quét của 244 file còn lại.
      boQua.push(p);
    }
  }
  return { daDoc, boQua };
}

/**
 * Sàn số file phải đọc được — **gác chống-mù**.
 *
 * Đo bằng máy (lệnh ở `tasks.md` §1 của change `stale-index-file-scan`): **245** file ở trạng thái bình
 * thường, trong đó chỉ **6** thuộc change đang mở — tức nền ổn định ~239, và archive làm số này GIẢM chứ
 * không tăng (change đã archive nằm trong `KHONG_QUET` của lưới gọi).
 *
 * Sàn 150 chừa ~39% biên. Hỏng mà gác này sinh ra để bắt — `git` trả rỗng, sai thư mục làm việc, lệnh
 * đổi cú pháp, bộ lọc đuôi file hỏng — đều làm số sụt một BẬC ĐỘ LỚN chứ không sụt vài phần trăm, nên
 * sàn không cần sát. Sát quá thì đỏ oan lúc repo co lại; và một lưới hay đỏ oan là lưới người ta học
 * cách bỏ qua.
 */
export const SCAN_FLOOR = 150;

/** Trả về lời than nếu phép quét đang mù; rỗng nếu nó thật sự có quét. */
export function scanBlindness(kq: DocKetQua, san = SCAN_FLOOR): string[] {
  if (kq.daDoc.length >= san) return [];
  return [
    `phép quét chỉ đọc được ${kq.daDoc.length} file (sàn ${san}), bỏ qua ${kq.boQua.length}` +
      (kq.boQua.length ? ` — ví dụ: ${kq.boQua.slice(0, 3).join(', ')}` : '') +
      '. Đọc được ít mà bỏ qua NHIỀU là chỉ mục lệch đĩa; đọc được ít mà bỏ qua cũng ít là phép quét đang mù.',
  ];
}
