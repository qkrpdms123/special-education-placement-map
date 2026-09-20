#!/bin/bash
# HWP_제출원고.txt -> 한글에 옮겨 붙일 조판 HTML (한글용_원고.html)
#
# 사용 : bash docs/proposal/조판/build.sh
# 조건 : awk (macOS 기본 BSD awk로 동작 확인), base64
#
# build.ps1의 macOS/리눅스 판입니다. 결과물은 같습니다.
# 원고를 고칠 때마다 돌린 뒤, 브라우저에서 열어 한글에 복사합니다.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
src="$root/docs/proposal/HWP_제출원고.txt"
figs="$root/docs/proposal/figures"
out="$here/한글용_원고.html"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# 1) '작성 안내' 상자를 떼어낸 본문만 추출 (세 번째 ════ 줄 다음부터)
awk '/^════════/{n++} n>=3{print}' "$src" | tail -n +2 > "$work/body.txt"
sep=$(grep -c '^════════' "$src")
[ "$sep" -ge 3 ] || { echo "'작성 안내' 상자의 구분선을 찾지 못했습니다."; exit 1; }
echo "본문 $(wc -l < "$work/body.txt" | tr -d ' ') 줄 추출"

# 2) awk 로 HTML 변환
awk -f "$here/to_html.awk" "$work/body.txt" > "$work/raw.html"
grep -q '참가 개요' "$work/raw.html" || { echo "변환 결과에서 한글을 찾지 못했습니다. 인코딩을 확인하세요."; exit 1; }

# 3) 본문만 꺼내고 그림을 base64 로 파일 안에 박는다 (한 파일로 옮길 수 있게)
awk '/<body>/{f=1;next} /<\/body>/{f=0} f' "$work/raw.html" > "$work/body.html"
cp "$work/body.html" "$work/embed.html"
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

# 4) 한글 문서 모양의 서식을 씌운다
{ cat "$here/hwplike.css.html"; cat "$work/embed.html"; printf '\n</div>\n</body></html>\n'; } > "$out"

echo
echo "─────────────────────────────"
echo "  표 $nTab 개 · 그림 $nFig 개"
[ "$nFig" = "3" ] || echo "  ⚠ 그림이 3개가 아닙니다"
echo "─────────────────────────────"
echo "  $out"
echo
echo "브라우저로 열어 흰 지면을 긁어 복사한 뒤, 공고 첨부 양식"
echo "04_[아이디어_기획서]...hwp 에 붙여넣으세요."
echo "분량은 붙여넣은 뒤 한글에서 직접 확인해야 정확합니다."
