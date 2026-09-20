#!/bin/bash
# HWP_제출원고.txt -> 읽기용 마크다운 사본 (기획서_v1.0_제출본.md)
#
# 사용 : bash docs/proposal/조판/build-md.sh
#
# 정본의 본문만 다시 만들어 넣습니다. 파일 맨 앞 머리말과
# 맨 뒤 '제출 전 처리' 절은 손대지 않고 그대로 둡니다.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
src="$root/docs/proposal/HWP_제출원고.txt"
out="$root/docs/proposal/기획서_v1.0_제출본.md"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

[ -f "$out" ] || { echo "대상 사본이 없습니다: $out"; exit 1; }

head_end=$(grep -n '^## Ⅰ\. 참가 개요' "$out" | head -1 | cut -d: -f1)
tail_start=$(grep -n '^## ⚠️ 제출 전 처리' "$out" | head -1 | cut -d: -f1)
[ -n "$head_end" ] && [ -n "$tail_start" ] || { echo "머리말/꼬리말 경계를 찾지 못했습니다."; exit 1; }

sed -n "1,$((head_end-1))p" "$out" > "$work/head.md"
sed -n "$((tail_start-1)),\$p" "$out" > "$work/tail.md"   # 앞의 --- 구분선 포함

awk '/^════════/{n++} n>=3{print}' "$src" | tail -n +2 > "$work/body.txt"
awk -f "$here/to_md.awk" "$work/body.txt" > "$work/body.md"
grep -q '참가 개요' "$work/body.md" || { echo "변환 결과에서 한글을 찾지 못했습니다."; exit 1; }

cat "$work/head.md" "$work/body.md" "$work/tail.md" > "$out"

echo "사본 갱신: $out"
echo "  본문 $(wc -l < "$work/body.md" | tr -d ' ') 줄 · 표 $(grep -c '^|---' "$work/body.md") 개"
