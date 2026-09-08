// Mã nguồn viết theo NodeNext nên import nội bộ mang đuôi '.js' (vd './ui.js') trong khi file thật là '.ts'.
// Vite không tự nối được cặp này, nên đổi đuôi ngay ở bước resolve — chỉ áp cho đường dẫn tương đối.
//
// ⚠ File này KHÔNG được import gì cả, kể cả `defineConfig` của vitest.
// Sandbox chấm probe chạy trong git-worktree ở thư mục tạm, node_modules chỉ là junction trỏ về repo.
// Vite nạp config bằng cách sinh một file .mjs cạnh nó rồi import — đường đó không giải được
// 'vitest/config' qua junction, và cả lượt chấm chết ở bước chạy probe. Object trần thì nạp được.
export default {
  plugins: [
    {
      name: 'noi-duoi-js-sang-ts',
      enforce: 'pre' as const,
      resolveId(this: { resolve: (id: string, importer: string, opts: { skipSelf: boolean }) => unknown }, nguon: string, nguoiGoi?: string) {
        if (!nguoiGoi || !nguon.startsWith('.') || !nguon.endsWith('.js')) return null;
        return this.resolve(nguon.slice(0, -3) + '.ts', nguoiGoi, { skipSelf: true });
      },
    },
  ],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    /**
     * ⛔ GHIM số worker. Mặc định của vitest tỉ lệ theo số CPU, và trên máy 22 CPU nó mở ~21 tiến trình
     * Node — nhiều hơn hẳn thứ bộ lưới này chịu được.
     *
     * Đo 08/09 trên cùng một cây mã, cùng một lượt làm việc:
     *
     *   | cấu hình  | kết quả                                   | wall-clock | tổng thời gian test |
     *   |-----------|-------------------------------------------|------------|---------------------|
     *   | mặc định  | 6 FILE KHÁC NHAU đỏ, xanh khi chạy riêng  | 13–18 s    | —                   |
     *   | 8 worker  | 1 file đỏ                                 | 18.1 s     | 75.3 s              |
     *   | 4 worker  | 76/76 · 1355/1355 xanh, lặp lại 5+ lần    | 25.4 s     | 51.4 s              |
     *
     * Chỗ đáng đọc kỹ là CỘT CUỐI, không phải cột wall-clock: ở 8 worker tổng thời gian test là 75.3 giây,
     * ở 4 worker chỉ 51.4 giây. Tám worker tiêu **thêm 47% CPU-time** để làm cùng một việc — chúng giành
     * nhau I/O nên mỗi ca chậm đi. Thứ nó mua được là 7 giây wall-clock; thứ nó bán đi là tính tất định.
     * Đó không phải đánh đổi tốc-độ-lấy-an-toàn; đó là trả nhiều tài nguyên hơn để nhận kết quả kém tin hơn.
     *
     * Vì sao con số CỨNG chứ không phải `'50%'`: `50%` trên máy 22 CPU ra 11 worker — cao hơn cả mốc 8 vốn
     * đã đỏ. Nút cổ chai ở bộ lưới này là **I/O đĩa và tiến trình con** (git thật, podman, đọc cả cây mã),
     * không phải CPU, nên tỉ lệ-theo-CPU chính là thứ gây ra vấn đề. Số ghim thì tái lập được giữa máy dev,
     * máy đồng đội và CI; một tỉ lệ thì không.
     *
     * Vì sao KHÔNG nới trần thời gian toàn cục thay vào đây: nó giấu sự chậm thay vì bỏ nguyên nhân, và làm
     * một ca treo thật mất lâu hơn mới đỏ. Hai chỗ đã nới trần (`test/volume-standard.test.ts`) đều có lý do
     * đo được riêng, và cố ý không nới đại trà.
     *
     * Máy khoẻ hơn thì ghi đè được: `npx vitest run --maxWorkers=N`.
     */
    maxWorkers: 4,
  },
};
