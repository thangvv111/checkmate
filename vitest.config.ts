import { defineConfig } from 'vitest/config';

// Mã nguồn viết theo NodeNext nên import nội bộ mang đuôi '.js' (vd './ui.js') trong khi file thật là '.ts'.
// Vite không tự nối được cặp này, nên đổi đuôi ngay ở bước resolve — chỉ áp cho đường dẫn tương đối.
export default defineConfig({
  plugins: [
    {
      name: 'noi-duoi-js-sang-ts',
      enforce: 'pre',
      resolveId(nguon, nguoiGoi) {
        if (!nguoiGoi || !nguon.startsWith('.') || !nguon.endsWith('.js')) return null;
        return this.resolve(nguon.slice(0, -3) + '.ts', nguoiGoi, { skipSelf: true });
      },
    },
  ],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
