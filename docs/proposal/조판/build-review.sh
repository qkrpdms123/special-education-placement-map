#!/bin/bash
# HWP_제출원고.txt -> 검토용 HTML (검토본.html)
#
# 사용 : bash docs/proposal/조판/build-review.sh
#
# 한글용_원고.html 과 같은 원고에서 나오지만 용도가 다릅니다.
#   한글용_원고.html : 한글에 붙여넣는 조판본. 손대지 않는다
#   검토본.html      : 본문 옆 여백에 검토 의견을 적는 읽기용
#
# 원고를 고친 뒤 다시 돌리면 검토 의견은 문단 내용 기준으로 따라붙습니다.
# (내용이 바뀐 문단의 메모는 떨어져 나갑니다 — 모아보기로 먼저 긁어 두세요)

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
src="$root/docs/proposal/HWP_제출원고.txt"
figs="$root/docs/proposal/figures"
out="$here/검토본.html"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

awk '/^════════/{n++} n>=3{print}' "$src" | tail -n +2 > "$work/body.txt"
echo "본문 $(wc -l < "$work/body.txt" | tr -d ' ') 줄 추출"

awk -f "$here/to_html.awk" "$work/body.txt" > "$work/raw.html"
grep -q '참가 개요' "$work/raw.html" || { echo "변환 결과에서 한글을 찾지 못했습니다."; exit 1; }

awk '/<body>/{f=1;next} /<\/body>/{f=0} f' "$work/raw.html" > "$work/embed.html"
for f in fig1 fig2 fig3; do
  base64 -i "$figs/$f.png" | tr -d '\n' > "$work/$f.b64"
  awk -v fig="$f" -v b64file="$work/$f.b64" '
    BEGIN { getline b64 < b64file; close(b64file)
            from = "<img src=\"" fig ".png\">"
            to   = "<img src=\"data:image/png;base64," b64 "\">" }
    { while ((i = index($0, from)) > 0)
        $0 = substr($0, 1, i-1) to substr($0, i + length(from))
      print }
  ' "$work/embed.html" > "$work/embed.next" && mv "$work/embed.next" "$work/embed.html"
done

nFig=$(grep -o 'data:image/png;base64' "$work/embed.html" | wc -l | tr -d ' ')
nTab=$(grep -o '<table>' "$work/embed.html" | wc -l | tr -d ' ')

cat "$here/review.head.html" "$work/embed.html" "$here/review.tail.html" > "$out"

echo
echo "─────────────────────────────"
echo "  표 $nTab 개 · 그림 $nFig 개"
[ "$nFig" = "3" ] || echo "  ⚠ 그림이 3개가 아닙니다"
echo "─────────────────────────────"
echo "  $out"
echo
echo "브라우저로 열어 오른쪽 여백에 검토 의견을 적으세요."
echo "다 적었으면 [검토 내용 모아보기] → [복사] 한 내용을 그대로 주시면 됩니다."
