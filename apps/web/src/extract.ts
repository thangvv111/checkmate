import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const DINH_DANG_NHAN = ['.md', '.txt', '.docx', '.pdf'];

export async function trichText(tenFile: string, buf: Buffer): Promise<string> {
  const duoi = tenFile.slice(tenFile.lastIndexOf('.')).toLowerCase();
  if (duoi === '.md' || duoi === '.txt') {
    return buf.toString('utf8');
  }
  if (duoi === '.docx') {
    const kq = await mammoth.extractRawText({ buffer: buf });
    return kq.value;
  }
  if (duoi === '.pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const kq = await parser.getText();
      return kq.text;
    } finally {
      await parser.destroy?.();
    }
  }
  throw new Error(`Định dạng "${duoi}" chưa hỗ trợ (nhận: ${DINH_DANG_NHAN.join(', ')}; file .doc cũ hãy lưu lại thành .docx)`);
}
