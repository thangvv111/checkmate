#!/usr/bin/env bash
# Đóng gói CHỈ SẢN PHẨM để deploy (DEPLOY.md bước 2). Chạy từ thư mục CHA của checkmate/ — nơi có
# checkmate/, demo-credit-approval/, demo-python/ (hai repo demo là repo đích trên máy chủ, đi cùng gói).
#
# Ba lớp bị loại, ba lớp tự kiểm:
#   1. bí mật           config.json · .secrets.json · .ncc-verify.json
#   2. dữ liệu prod     web-runs · probes-lib · runs · repos · bench/kq      (tài sản, deploy không đè)
#   3. hồ sơ xây dựng   openspec · docs · test · bench · _ref · .claude · .github · checkmate.yml · luật agent
# Lớp 3 loại theo ĐƯỜNG NEO `checkmate/<tên>`: `--exclude=test` trơ sẽ cắt luôn demo-credit-approval/test/,
# mà repo đích cần thư mục test để chạy probe. Lớp 1–2 giữ dạng trơ vì áp cho cả repo demo.
# Lưới test/deploy-bundle.test.ts đọc danh sách --exclude dưới đây: mọi mục cấp một của repo ngoài danh
# sách SẢN PHẨM (apps · packages · package.json · package-lock.json · tsconfig.json · README.md · DEPLOY.md)
# phải có mặt ở đây — thêm thư mục xây dựng mới mà quên loại là lưới đỏ.
set -euo pipefail

OUT="${1:-checkmate-deploy.tar.gz}"
if [ ! -d checkmate/apps ] || [ ! -d checkmate/packages ]; then
  echo "Chạy từ thư mục CHA của checkmate/ (không thấy checkmate/apps và checkmate/packages)" >&2
  exit 2
fi
# GNU tar (Git Bash trên Windows) coi `C:/…` trong tên gói là máy từ xa — `--force-local` tắt phép đoán đó.
# bsdtar (macOS) không có cờ này và cũng không gặp vấn đề.
FORCE=()
if tar --version 2>/dev/null | grep -q "GNU tar"; then FORCE=(--force-local); fi

# Cấp một của checkmate/ được phép có trong gói — MỘT nguồn: lưới test/deploy-bundle.test.ts đọc dòng này.
CHO_PHEP="DEPLOY.md README.md apps package-lock.json package.json packages tsconfig.json"

tar "${FORCE[@]}" --exclude=node_modules --exclude=.git \
    --exclude=config.json --exclude=.secrets.json --exclude=.ncc-verify.json \
    --exclude=web-runs --exclude=probes-lib --exclude='probes-lib-*' \
    --exclude=runs --exclude=repos --exclude='*.log' --exclude='bench/kq' \
    --exclude=.worktrees --exclude='*.tar.gz' --exclude='*.tmp.*' \
    --exclude=checkmate/openspec --exclude=checkmate/docs --exclude=checkmate/test \
    --exclude=checkmate/bench --exclude=checkmate/_ref --exclude=checkmate/.claude \
    --exclude=checkmate/.github --exclude=checkmate/probes-lib-bench --exclude=checkmate/scripts \
    --exclude=checkmate/checkmate.yml --exclude=checkmate/AGENTS.md --exclude=checkmate/CLAUDE.md \
    --exclude=checkmate/GEMINI.md --exclude=checkmate/vitest.config.ts --exclude=checkmate/.gitignore \
    -czf "$OUT" checkmate demo-credit-approval demo-python

# Tự kiểm — có dòng nào là gói HỎNG: in TÊN mục vi phạm (không in nội dung), xoá gói, thoát 1.
VI_PHAM=$(tar "${FORCE[@]}" -tzf "$OUT" | grep -E \
  "secrets|/config\.json|ncc-verify|web-runs/|probes-lib/|checkmate/runs/|^checkmate/(openspec|docs|test|bench|_ref|\.claude|\.github|probes-lib-bench|scripts)/|^checkmate/(checkmate\.yml|AGENTS\.md|CLAUDE\.md|GEMINI\.md|vitest\.config\.ts|\.gitignore)$" \
  || true)
if [ -n "$VI_PHAM" ]; then
  echo "GÓI HỎNG — mục không được phép có trong gói:" >&2
  echo "$VI_PHAM" >&2
  rm -f "$OUT"
  exit 1
fi
# Lớp thứ tư — danh sách CHO PHÉP: cấp một của checkmate/ trong gói phải nằm trọn trong CHO_PHEP. Bắt cả
# file lạ trên đĩa máy dev mà git không theo dõi (file tạm, kết quả thử) — lưới trong repo không nhìn thấy chúng.
LA=""
for m in $(tar "${FORCE[@]}" -tzf "$OUT" | grep '^checkmate/' | cut -d/ -f2 | sort -u); do
  case " $CHO_PHEP " in *" $m "*) ;; *) LA="$LA $m";; esac
done
if [ -n "$LA" ]; then
  echo "GÓI HỎNG — cấp một của checkmate/ có mục ngoài danh sách cho phép:$LA" >&2
  rm -f "$OUT"
  exit 1
fi
echo "OK: $OUT ($(du -h "$OUT" | cut -f1)) — không bí mật, không dữ liệu prod, không hồ sơ xây dựng"
