import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Ba mức tự động ở cổng (specs/R6.15–R6.19). Nguyên tắc chi phối: tự động hoá được phép nói KHÔNG,
// không được phép nói CÓ. Merge là cho code vào trunk — rủi ro một chiều, phải người quyết. Trả về dev
// là KHÔNG cho vào trunk — sai thì chỉ tốn công mở lại.

const goc = mkdtempSync(join(tmpdir(), 'checkmate-tudong-'));
process.env.CHECKMATE_GOC = goc;
const cfg = await import('../apps/web/src/config.js');

describe('ba công tắc RIÊNG, không gộp (R6.15)', () => {
  it('mặc định: đăng verdict và gắn trạng thái BẬT, đóng PR TẮT', () => {
    // Mức gây hại khác hẳn nhau: một comment gần như vô hại, còn đóng PR thì người viết phải mở lại.
    // Gộp làm một nghĩa là ai muốn có comment tự động cũng phải chấp nhận máy đóng PR của mình.
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_comment).toBe(true);
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve, 'đóng PR phải mặc định TẮT').toBe(false);
  });

  it('ba cờ độc lập — bật cái này không kéo theo cái kia', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ truc: { bat: false, chu_ky_giay: 300, tu_dong_comment: false, tu_dong_trang_thai: true, tu_dong_tra_ve: true } }),
      'utf8',
    );
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_comment).toBe(false);
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve).toBe(true);
  });

  it('cấu hình đời cũ thiếu hai cờ mới thì nhận mặc định, không thành undefined', () => {
    // Máy chủ đang chạy có config chỉ với tu_dong_comment — nâng cấp không được làm nó mất cờ nào
    writeFileSync(join(goc, 'config.json'), JSON.stringify({ truc: { bat: true, chu_ky_giay: 300, tu_dong_comment: true } }), 'utf8');
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve).toBe(false);
  });
});

afterAll(() => rmSync(goc, { recursive: true, force: true }));

describe('cửa ĐỌC cấu hình cũng phải gác giới hạn model (R5.15) — Opus bắt ở vòng ba', () => {
  it('config sửa tay mang tổ hợp cấm thì đọc lên đã rơi về model hợp lệ, có kêu', () => {
    // Ba cửa giao diện (form, cổng kiểm, select) đều gác — nhưng config.json sửa tay là đường cứu hộ
    // hợp lệ (R9.13), và MỌI lượt chấm đi qua cửa đọc. Khai «mọi cửa phải tôn trọng» rồi bỏ sót đúng
    // cửa thật là pull request tự mâu thuẫn.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api', model: 'claude-fable-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    const c = cfg.docConfig();
    // R5.17 — đường CHẤM từ chối với lời rõ (không dùng nguyên, không thay hộ: tổ hợp thay chưa qua
    // cổng kiểm — vòng năm của Opus bắt đúng bản vá rơi-mềm vì lý do đó)
    expect(() => cfg.cauHinhDeCham(c)).toThrow(/không được phép|Kiểm tra/);
    // còn đường HIỂN THỊ trả nguyên vẹn để màn Cấu hình render được cho người dùng sửa
    const hienTai = cfg.cauHinhHienTai(c);
    expect(hienTai.model).toBe('claude-fable-5');
    expect(hienTai.phuong_thuc).toBe('api');
  });

  it('tổ hợp hợp lệ thì đi qua nguyên vẹn — không được âm thầm đổi model của người ta', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'thue_bao', model: 'claude-fable-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(cfg.cauHinhHienTai(cfg.docConfig()).model).toBe('claude-fable-5');
    // và đường chấm cũng đi qua nguyên vẹn — không được âm thầm đổi model của người ta
    expect(cfg.cauHinhDeCham(cfg.docConfig()).model).toBe('claude-fable-5');
  });
});

describe('cửa đọc không được ném với config KHUYẾT — vòng bốn của Opus', () => {
  it('config sửa tay thiếu trường model thì rơi về mặc định, không TypeError', () => {
    // Đường cứu hộ (R9.13) không hứa hình dạng đủ — đường cứu hộ ném TypeError thì hết là đường cứu hộ
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    const hienTai = cfg.cauHinhHienTai(cfg.docConfig());
    expect(typeof hienTai.model).toBe('string');
    expect(hienTai.model.length).toBeGreaterThan(0);
  });

  it('phuong_thuc THIẾU HẲN → «thiếu trường «phương thức»», không đổ tội «không hỗ trợ» (vòng mười hai)', () => {
    // Thiếu và không-hỗ-trợ là hai nguyên nhân khác nhau (R5.7) — và cửa song sinh thuNcc đã nói
    // «thiếu trường», hai cửa phải cùng một lời cho cùng một bản chất.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    let loi = '';
    try { cfg.cauHinhDeCham(cfg.docConfig()); } catch (e) { loi = (e as Error).message; }
    expect(loi).toMatch(/thiếu trường «phương thức»/);
    expect(loi).not.toMatch(/không hỗ trợ/);
  });

  it('đường CHẤM: phương thức lạ thì HỎI như model khuyết — áp đều tay (vòng bảy)', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'phuong-thuc-bia', model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/phương thức không hỗ trợ/);
  });

  it('đường CHẤM: nhà cung cấp KHUYẾT CẢ CỤM cấu hình thì hỏi, không tự điền (vòng bảy)', () => {
    // Dùng ncc 'google' — anthropic LUÔN có cấu hình mặc định sản phẩm (bản cài mới chạy được demo,
    // tổ hợp lành, có chủ đích qua nangCapAgent). Ca khuyết-cả-cụm thật là đổi sang ncc chưa từng
    // được cấu hình: đường chấm phải hỏi, không tự dựng cấu hình từ không khí.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'google', ncc_cau_hinh: {}, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/chưa được cấu hình/);
  });

  it('đường HIỂN THỊ giữ NGUYÊN phương thức lạ — không thay bằng mặc định (vòng tám, finding 3)', () => {
    // Bản trước thay giá trị lạ bằng mặc định: màn Cấu hình trông ổn trong khi đường chấm đang chặn
    // đúng giá trị đó — người dùng không thấy gì để sửa. Hiển thị phải cho thấy thứ đang chặn.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'phuong-thuc-bia', model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    const hienTai = cfg.cauHinhHienTai(cfg.docConfig());
    expect(hienTai.phuong_thuc).toBe('phuong-thuc-bia');
    // điền mặc định CHỈ KHI THIẾU hẳn
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(cfg.cauHinhHienTai(cfg.docConfig()).phuong_thuc).toBe('thue_bao'); // dn.phuong_thuc[0] của anthropic
  });
});

describe('vòng tám: phép chiếu chung + cụm null + không vọng phương thức lạ', () => {
  it('cụm ncc_cau_hinh là null → LoiCauHinhNcc, không TypeError thành 500 (finding 4)', () => {
    // JSON.parse('null') hợp lệ; config sửa tay có thể mang "ncc_cau_hinh": null — đường cứu hộ
    // ném TypeError thì hết là đường cứu hộ (cùng họ với ca vòng bốn, nhưng ở tầng CỤM chứ không tầng trường)
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'google', ncc_cau_hinh: null, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/chưa được cấu hình/);
    expect(() => cfg.cauHinhHienTai(cfg.docConfig())).not.toThrow();
  });

  it('phương thức lạ KHÔNG vọng nguyên văn ra thông điệp lỗi của đường chấm (finding 2)', () => {
    // Người dán nhầm khoá vào trường phuong_thuc cũng được bảo vệ như dán nhầm vào trường model
    const keyGia = 'sk-ant-api03-DAN-NHAM-VAO-PHUONG-THUC-42';
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: keyGia, model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    let loi = '';
    try { cfg.cauHinhDeCham(cfg.docConfig()); } catch (e) { loi = (e as Error).message; }
    expect(loi).toMatch(/phương thức không hỗ trợ/);
    expect(loi).not.toContain(keyGia);
    expect(loi).toContain('sha256:'); // che nhưng PHÂN BIỆT được (vân tay, vòng bảy)
  });

  it('sổ kiểm lưu bản CHE nhưng tổ hợp model lạ vừa kiểm vẫn CÒN hiệu lực (finding 1 — HIGH)', async () => {
    // Vòng tám bắt: sổ ghi bản che (R5.20) mà kiemConHieuLuc so bản THÔ → tổ hợp model-lạ không bao
    // giờ «đã kiểm» — người dùng model mới không chọn được ncc. Phép so phải dùng CÙNG phép chiếu với lúc ghi.
    const { chieuGiaTri, dinhNghia, ghiSoKiem, kiemConHieuLuc } = await import('../apps/web/src/ncc.js');
    const cauHinh = { phuong_thuc: 'api' as const, model: 'model-moi-ra-chua-co-trong-danh-muc' };
    const dn = dinhNghia('openai');
    ghiSoKiem('openai', {
      ok: true,
      luc: new Date().toISOString(),
      thong_diep: 'ok',
      model: chieuGiaTri(cauHinh.model, dn.models), // đúng thứ xong() ghi: bản che
      phuong_thuc: 'api',
    });
    expect(kiemConHieuLuc('openai', cauHinh), 'tổ hợp vừa kiểm xong phải còn hiệu lực').not.toBeNull();
    // và đổi sang model lạ KHÁC thì hết hiệu lực — vân tay phân biệt, không phải «lạ nào cũng như nhau»
    expect(kiemConHieuLuc('openai', { ...cauHinh, model: 'model-la-khac-cung-do-dai-x' })).toBeNull();
  });

  it('cấu hình KHUYẾT trường → kiemConHieuLuc trả null ÊM, không TypeError (vòng chín, finding 1)', async () => {
    // Cửa kiểm nổ là đánh sập cả lượt chấm thay vì bỏ qua một nhà cung cấp — hồi quy do chính bản
    // vá vòng tám gây ra (chieuGiaTri gọi .length trên undefined)
    const { ghiSoKiem, kiemConHieuLuc } = await import('../apps/web/src/ncc.js');
    ghiSoKiem('openai', { ok: true, luc: new Date().toISOString(), thong_diep: 'ok', model: 'gpt-5.2', phuong_thuc: 'api' });
    expect(() => kiemConHieuLuc('openai', {} as never)).not.toThrow();
    expect(kiemConHieuLuc('openai', {} as never)).toBeNull();
    expect(kiemConHieuLuc('openai', { phuong_thuc: 'api' } as never)).toBeNull();
    expect(kiemConHieuLuc('openai', { model: 'gpt-5.2' } as never)).toBeNull();
  });

  it('hàng sổ mang tổ hợp BỊ CẤM không mở cổng — MỌI cửa tôn trọng R5.15 (vòng chín, finding 2)', async () => {
    // Sổ đời cũ / sửa tay có thể mang anthropic + claude-fable-5 + api với ok:true. Cửa quyết định
    // nhà cung cấp có được dùng để chấm là kiemConHieuLuc — nó phải hỏi modelHopLe, không tin sổ suông.
    const { ghiSoKiem, kiemConHieuLuc } = await import('../apps/web/src/ncc.js');
    const cam = { phuong_thuc: 'api' as const, model: 'claude-fable-5' };
    ghiSoKiem('anthropic', { ok: true, luc: new Date().toISOString(), thong_diep: 'ok', ...cam });
    expect(kiemConHieuLuc('anthropic', cam), 'tổ hợp chỉ-thuê-bao đi đường API không được mở cổng').toBeNull();
    // cùng model đi đúng phương thức thuê bao thì vẫn khớp bình thường
    const dung = { phuong_thuc: 'thue_bao' as const, model: 'claude-fable-5' };
    ghiSoKiem('anthropic', { ok: true, luc: new Date().toISOString(), thong_diep: 'ok', ...dung });
    expect(kiemConHieuLuc('anthropic', dung)).not.toBeNull();
  });

  it('vế phuong_thuc cũng so ẢNH với ẢNH — áp đều tay hai trường (vòng chín, finding 3)', async () => {
    // Giá trị trong danh mục: ảnh = chính nó, so nào cũng khớp — ca này khoá HÀNH VI để phép so hai
    // trường không lệch nhau lần nữa; giá trị lạ thì modelHopLe đã chặn từ trước theo R5.15.
    const { chieuGiaTri, dinhNghia, ghiSoKiem, kiemConHieuLuc } = await import('../apps/web/src/ncc.js');
    const dn = dinhNghia('openai');
    const cauHinh = { phuong_thuc: 'api' as const, model: 'model-moi-openai-vua-ra' };
    ghiSoKiem('openai', {
      ok: true,
      luc: new Date().toISOString(),
      thong_diep: 'ok',
      model: chieuGiaTri(cauHinh.model, dn.models),
      phuong_thuc: chieuGiaTri('api', dn.phuong_thuc) as 'api', // đúng thứ xong() ghi: ảnh của phép chiếu
    });
    expect(kiemConHieuLuc('openai', cauHinh)).not.toBeNull();
  });
});

describe('vòng mười: áp đều tay luật «khuyết thì hỏi, có mặt thì giữ» sang các cửa còn lại', () => {
  it('thuNcc với cấu hình khuyết model → resolve ok:false nói rõ trường khuyết, KHÔNG reject (finding 1 — HIGH)', async () => {
    // Cửa song sinh của kiemConHieuLuc — vòng chín gác một cửa, vòng mười bắt cửa kia. Cửa kiểm nổ
    // giữa chừng là đánh sập cả lượt thay vì trả một kết quả kiểm thất bại đọc được (R5.7 + R5.19).
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const kq = await thuNcc('anthropic', { phuong_thuc: 'api' } as never);
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toMatch(/thiếu trường/);
  });

  it('phần tử ncc_cau_hinh[ncc] là null → LoiCauHinhNcc «chưa được cấu hình», không TypeError (finding 2)', () => {
    // Vòng tám vá cụm null ở tầng CỤM; null ở tầng PHẦN TỬ đè lên mặc định qua spread rồi lọt qua
    // gác `=== undefined` — cùng họ, tầng sâu hơn một nấc.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: null }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/chưa được cấu hình/);
    expect(() => cfg.cauHinhHienTai(cfg.docConfig())).not.toThrow();
  });

  it('model SAI KIỂU (42) — đường hiển thị giữ dấu vết «42», không thay lặng bằng mặc định (finding 3)', () => {
    // «Có mặt thì giữ» không phân biệt sai-danh-mục với sai-kiểu: cả hai đều là thứ đang làm đường
    // chấm chặn, thay bằng mặc định là người dùng không thấy gì để sửa (R5.19).
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api', model: 42 } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(cfg.LoiCauHinhNcc);
    expect(cfg.cauHinhHienTai(cfg.docConfig()).model).toBe('42');
  });

  it('chieuGiaTri toàn phần: khuyết → «(thiếu)», sai kiểu → ép chuỗi rồi chiếu như thường', async () => {
    const { chieuGiaTri } = await import('../apps/web/src/ncc.js');
    expect(chieuGiaTri(undefined, ['a'])).toBe('(thiếu)');
    expect(chieuGiaTri(null, ['a'])).toBe('(thiếu)');
    expect(chieuGiaTri('', ['a'])).toBe('(thiếu)');
    expect(chieuGiaTri('a', ['a'])).toBe('a');
    expect(chieuGiaTri(42, ['a'])).toMatch(/ngoài danh mục — 2 ký tự/);
  });
});

describe('vòng mười một: miền che của phuong_thuc + thuNcc với cụm undefined', () => {
  it('thuNcc(ma, undefined/null) → resolve ok:false «thiếu trường», KHÔNG reject (finding 2 — HIGH)', async () => {
    // Gác vòng mười dùng cfg?.model nhưng xong() đọc cfg.model trần — cụm undefined lọt qua gác rồi
    // chết ở dòng đầu của xong. Chuẩn hoá cfg TRƯỚC MỌI THỨ.
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    for (const cum of [undefined, null]) {
      const kq = await thuNcc('anthropic', cum as never);
      expect(kq.ok).toBe(false);
      expect(kq.thong_diep).toMatch(/thiếu trường/);
    }
  });

  it('enum hệ thống hợp lệ («thue_bao») KHÔNG bị băm trong thông điệp từ chối sớm (finding 1 — HIGH)', async () => {
    // «thue_bao» với ncc chỉ-API là tổ hợp không hỗ trợ nhưng là giá trị hệ thống chọn từ dropdown —
    // băm nó là giấu chính nguyên nhân, người dùng không biết đổi cái gì trong ⚙ Cấu hình (R5.7).
    const { DANH_MUC_NCC } = await import('../apps/web/src/ncc.js');
    const { thuNcc } = await import('../apps/web/src/nguon-model.js');
    const chiApi = DANH_MUC_NCC.find((d) => !d.ngung && d.phuong_thuc.length === 1 && d.phuong_thuc[0] === 'api');
    expect(chiApi, 'cần một ncc chỉ-API để probe không rỗng').toBeTruthy();
    const kq = await thuNcc(chiApi!.ma, { phuong_thuc: 'thue_bao', model: chiApi!.models[0] });
    expect(kq.ok).toBe(false);
    expect(kq.thong_diep).toContain('thue_bao');
    expect(kq.thong_diep).not.toContain('sha256:');
  });

  it('giá trị NGOÀI enum hệ thống trong trường phuong_thuc vẫn bị che — miền đổi không mở lại lỗ rò', () => {
    // Cùng ca keyGia của vòng tám: đổi miền chiếu sang enum hệ thống không được làm khoá dán nhầm
    // vọng lại nguyên văn.
    const keyGia = 'sk-ant-api03-DAN-NHAM-VAO-PHUONG-THUC-42';
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: keyGia, model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    let loi = '';
    try { cfg.cauHinhDeCham(cfg.docConfig()); } catch (e) { loi = (e as Error).message; }
    expect(loi).not.toContain(keyGia);
    expect(loi).toContain('sha256:');
  });
});
