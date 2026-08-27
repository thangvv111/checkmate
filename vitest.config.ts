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
  },
};
