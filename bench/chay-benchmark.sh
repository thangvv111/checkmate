#!/bin/bash
# Benchmark L4 — gieo bug đã biết, đo: bắt/lọt, false-positive, tái lập, thời gian, chi phí.
# Chạy tuần tự (worktree không tranh chấp). Kết quả từng lượt: bench/kq/<ca>-<lan>.json
cd "$(dirname "$0")/.." || exit 1
mkdir -p bench/kq
export CHECKER_PROVIDER=cli
export CHECKER_MODEL=claude-sonnet-5
export CHECKER_LIB_DIR="$(pwd)/probes-lib-bench"
REPO_TS="E:/Projects/ai-checker/demo-credit-approval"
REPO_PY="E:/Projects/ai-checker/demo-python"

chay() { # ten repo branch expect
  local ten=$1 repo=$2 branch=$3 expect=$4
  for lan in 1 2 3; do
    local out="bench/kq/${ten}-${lan}.json"
    if [ -s "$out" ]; then echo "[bo qua] $ten lan $lan (da co)"; continue; fi
    echo "=== $ten lan $lan ($(date +%H:%M:%S)) ==="
    local t0=$SECONDS
    npx tsx packages/harness/src/cli.ts run --skill code --repo "$repo" --branch "$branch" --base main --json --out "$out" > "bench/kq/${ten}-${lan}.log" 2>&1
    local ma=$? giay=$((SECONDS - t0))
    echo "{\"ca\":\"$ten\",\"lan\":$lan,\"expect\":\"$expect\",\"exit\":$ma,\"giay\":$giay}" >> bench/kq/_meta.jsonl
    echo "    exit=$ma sau ${giay}s"
  done
}

chay pr1-phan-quyen   "$REPO_TS" feature/duyet-nhanh        FAIL
chay pr2-tien-bien    "$REPO_TS" feature/giai-ngan-nhieu-ky FAIL
chay pr3-app-guard    "$REPO_TS" feature/tao-nhanh-de-xuat  FAIL
chay pr4-sach         "$REPO_TS" feature/loc-trang-thai     PASS
chay pr5-va-dung      "$REPO_TS" fix/dieu-kien-duyet        PASS
chay py-bien-mo       "$REPO_PY" loi/bien-mo                FAIL

echo "BENCHMARK XONG $(date +%H:%M:%S)"
