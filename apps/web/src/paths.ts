import { resolve } from 'node:path';

// Gốc repo CheckMate (cwd khi chạy web = gốc repo).
// Cho phép trỏ chỗ khác qua CHECKMATE_GOC — test cần một gốc riêng để không đụng dữ liệu thật.
export const GOC = process.env.CHECKMATE_GOC ? resolve(process.env.CHECKMATE_GOC) : resolve('.');
