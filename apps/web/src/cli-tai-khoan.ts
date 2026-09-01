import { createInterface } from 'node:readline';
import { changePassword, changeRole, listAccounts, createAccount, deleteAccount, type Role } from './identity.js';

/**
 * Vòng đời tài khoản qua dòng lệnh (specs/R11.19).
 *
 * Không có màn quản lý người dùng trong giao diện, và đó là chủ ý: ai vào được máy chủ thì đã có quyền
 * cao hơn mọi thứ giao diện cấp được, nên dựng thêm màn chỉ tạo một bề mặt tấn công cho đúng thứ R11
 * sinh ra để bảo vệ, mà không cho thêm quyền nào.
 *
 *   npm run tai-khoan -- ds
 *   npm run tai-khoan -- them thang.vv --vai duyet_cong
 *   npm run tai-khoan -- doi-mk thang.vv
 *   npm run tai-khoan -- doi-vai ci-bot van_hanh
 *   npm run tai-khoan -- xoa thang.vv
 */

const VAI_HOP_LE: Role[] = ['nguoi_xem', 'tu_dong', 'van_hanh', 'duyet_cong'];

const GIAI_THICH_VAI: Record<Role, string> = {
  nguoi_xem: 'chỉ xem — không chạy chấm, không bấm cổng',
  tu_dong: 'vai của TÁC NHÂN MÁY — chạy chấm và trả về dev, KHÔNG sửa cấu hình, KHÔNG merge (R11.18b)',
  van_hanh: 'chạy chấm và sửa cấu hình — KHÔNG bấm được cổng merge',
  duyet_cong: 'bấm được cổng merge / trả về dev',
};

/** Đọc mật khẩu từ bàn phím mà KHÔNG hiện lên màn hình — mật khẩu hiện ra là mật khẩu nằm lại trong lịch sử shell */
function hoiMatKhau(nhac: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    const ghiThat = out.write.bind(out);
    // Chặn dội ký tự sau khi lời nhắc đã in ra
    (out as unknown as { write: (s: string) => boolean }).write = (chuoi: string) =>
      out.muted && chuoi !== '\n' && chuoi !== '\r\n' ? true : ghiThat(chuoi);
    rl.question(nhac, (tl) => {
      out.muted = false;
      (out as unknown as { write: unknown }).write = ghiThat;
      ghiThat('\n');
      rl.close();
      resolve(tl);
    });
    out.muted = true;
  });
}

async function hoiMatKhauHaiLan(): Promise<string> {
  const a = await hoiMatKhau('Mật khẩu (không hiện lên màn hình): ');
  const b = await hoiMatKhau('Nhập lại: ');
  if (a !== b) {
    console.error('✗ Hai lần nhập không khớp — chưa đổi gì cả.');
    process.exit(2);
  }
  return a;
}

function epVai(x: string | undefined): Role {
  if (!x || !VAI_HOP_LE.includes(x as Role)) {
    console.error(`✗ Role phải là một trong: ${VAI_HOP_LE.join(' · ')}`);
    for (const v of VAI_HOP_LE) console.error(`    ${v.padEnd(11)} ${GIAI_THICH_VAI[v]}`);
    process.exit(2);
  }
  return x as Role;
}

function huongDan(): void {
  console.log(`Quản lý tài khoản CheckMate (specs/R11.19)

  npm run tai-khoan -- ds                              liệt kê tài khoản
  npm run tai-khoan -- them <tên> --vai <vai>           thêm tài khoản, hỏi mật khẩu hai lần
  npm run tai-khoan -- doi-mk <tên>                     đổi mật khẩu (giết mọi phiên đang sống)
  npm run tai-khoan -- doi-vai <tên> <vai>              đổi vai
  npm run tai-khoan -- xoa <tên>                        gỡ tài khoản (huỷ luôn phiên của nó)

Role:`);
  for (const v of VAI_HOP_LE) console.log(`  ${v.padEnd(11)} ${GIAI_THICH_VAI[v]}`);
  console.log(`
Tên đăng nhập: chữ thường, số, dấu chấm/gạch dưới/gạch nối, 3–32 ký tự (R11.9). Ép khuôn tại đây vì tên
sẽ đi vào comment PR và thân commit merge — hai thứ đăng công khai và không thu hồi được.`);
}

async function chay(): Promise<void> {
  const [lenh, ...dsThamSo] = process.argv.slice(2);
  const co = (ten: string): string | undefined => {
    const i = dsThamSo.indexOf(`--${ten}`);
    return i >= 0 ? dsThamSo[i + 1] : undefined;
  };
  const viTri = dsThamSo.filter((x) => !x.startsWith('--') && dsThamSo[dsThamSo.indexOf(x) - 1]?.startsWith('--') !== true);

  switch (lenh) {
    case 'ds': {
      const ds = listAccounts();
      if (!ds.length) {
        console.log('Chưa có tài khoản nào. Tạo tài khoản đầu tiên:\n  npm run tai-khoan -- them <tên> --vai duyet_cong');
        return;
      }
      console.log(`${ds.length} tài khoản:`);
      for (const t of ds) {
        console.log(`  ${t.ten.padEnd(20)} ${t.vai.padEnd(11)} tạo ${t.tao_luc.slice(0, 10)}${t.doi_mk_luc ? ` · đổi mật khẩu ${t.doi_mk_luc.slice(0, 10)}` : ''}`);
      }
      return;
    }
    case 'them': {
      const ten = viTri[0];
      if (!ten) return huongDan();
      const vai = epVai(co('vai'));
      createAccount(ten, await hoiMatKhauHaiLan(), vai);
      console.log(`✓ Đã tạo «${ten}» với vai ${vai} — ${GIAI_THICH_VAI[vai]}`);
      return;
    }
    case 'doi-mk': {
      const ten = viTri[0];
      if (!ten) return huongDan();
      changePassword(ten, await hoiMatKhauHaiLan());
      console.log(`✓ Đã đổi mật khẩu «${ten}». Mọi phiên đang sống của tài khoản này đã bị huỷ — đổi vì nghi lộ mà để phiên cũ chạy là không đổi gì.`);
      return;
    }
    case 'doi-vai': {
      const [ten, vaiTho] = viTri;
      if (!ten) return huongDan();
      const vai = epVai(vaiTho);
      changeRole(ten, vai);
      console.log(`✓ «${ten}» nay mang vai ${vai} — ${GIAI_THICH_VAI[vai]}`);
      return;
    }
    case 'xoa': {
      const ten = viTri[0];
      if (!ten) return huongDan();
      deleteAccount(ten);
      console.log(`✓ Đã gỡ «${ten}» và huỷ mọi phiên của tài khoản đó (R11.21).`);
      console.log('  Các hàng đã ghi trong sổ hành động cổng GIỮ NGUYÊN tên này — sổ chỉ ghi thêm, và dấu vết kiểm toán không đi theo tài khoản.');
      return;
    }
    default:
      huongDan();
  }
}

chay().catch((e) => {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
});
