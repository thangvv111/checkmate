#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
export CHECKER_PROVIDER=cli CHECKER_MODEL=claude-sonnet-5
export CHECKER_LIB_DIR="$(pwd)/probes-lib-bench"
for lan in 1 2 3; do
  echo "=== pr4-sach lan $lan ($(date +%H:%M:%S)) ==="
  t0=$SECONDS
  npx tsx packages/harness/src/cli.ts run --skill code --repo "E:/Projects/ai-checker/demo-credit-approval" --branch feature/loc-trang-thai-v2 --base main --json --out "bench/kq/pr4-sach-$lan.json" > "bench/kq/pr4-sach-$lan.log" 2>&1
  echo "{\"ca\":\"pr4-sach\",\"lan\":$lan,\"expect\":\"PASS\",\"exit\":$?,\"giay\":$((SECONDS-t0))}" >> bench/kq/_meta.jsonl
done
echo RERUN-PR4-XONG
