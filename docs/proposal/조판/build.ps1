# HWP_제출원고.txt -> 한글에 옮겨 붙일 조판 HTML (한글용_원고.html)
#
# 사용 : powershell -ExecutionPolicy Bypass -File docs\proposal\조판\build.ps1
# 조건 : Git Bash 의 awk (한컴오피스는 필요 없다)
#
# 원고를 고칠 때마다 돌린 뒤, 브라우저에서 열어 한글에 복사한다.
#
# ※ 한글 COM 으로 HWP 를 직접 만드는 방식은 폐기했다. (2026-09-19)
#    한글의 HTML 가져오기가 UTF-8 을 무시하고 CP949 로 읽어 본문이 깨졌고,
#    CP949 로 우회했더니 이번엔 글자가 겹쳐 조판이 무너졌다.
#    브라우저에서 보고 복사하는 편이 정확하고 눈으로 확인할 수 있다.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..\..\..')
$src  = Join-Path $root 'docs\proposal\HWP_제출원고.txt'
$figs = Join-Path $root 'docs\proposal\figures'
$work = Join-Path $env:TEMP 'govtech_build'
$out  = Join-Path $here '한글용_원고.html'

New-Item -ItemType Directory -Force $work | Out-Null

# 1) '작성 안내' 상자를 떼어낸 본문만 추출 (세 번째 ════ 줄 다음부터)
$lines = Get-Content $src -Encoding UTF8
$sep = @(); for($i=0; $i -lt $lines.Count; $i++){ if($lines[$i] -like '════════*'){ $sep += $i } }
if($sep.Count -lt 3){ throw "'작성 안내' 상자의 구분선을 찾지 못했습니다." }
$bodyStart = $sep[2] + 1
$lines[$bodyStart..($lines.Count-1)] | Set-Content (Join-Path $work 'body.txt') -Encoding UTF8
"본문 $(($lines.Count - $bodyStart)) 줄 추출"

# 2) awk 로 HTML 변환
#    ※ awk 출력을 PowerShell 파이프로 받으면 콘솔 인코딩(CP949)을 타서 깨진다.
#      cmd 리다이렉션으로 바이트를 그대로 파일에 떨군다.
$awk = 'C:\Program Files\Git\usr\bin\awk.exe'
if(-not (Test-Path $awk)){ $awk = (Get-Command awk -ErrorAction Stop).Source }
Copy-Item (Join-Path $here 'to_html.awk') $work -Force
Push-Location $work
& cmd /c "`"$awk`" -f to_html.awk body.txt > raw.html"
Pop-Location

$raw = [System.IO.File]::ReadAllText((Join-Path $work 'raw.html'), [System.Text.Encoding]::UTF8)
if($raw -notmatch '참가 개요'){ throw "변환 결과에서 한글을 찾지 못했습니다. 인코딩을 확인하세요." }

# 3) 본문만 꺼내고 그림을 base64 로 파일 안에 박는다 (한 파일로 옮길 수 있게)
$body = $raw -replace '(?s)^.*?<body>', '' -replace '(?s)</body>.*$', ''
foreach($f in @('fig1','fig2','fig3')){
  $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $figs "$f.png")))
  $body = $body.Replace("<img src=`"$f.png`">", "<img src=`"data:image/png;base64,$b64`">")
}
$nFig = ([regex]::Matches($body, 'data:image/png;base64')).Count
$nTab = ([regex]::Matches($body, '<table>')).Count

# 4) 한글 문서 모양의 서식을 씌운다
$head = [System.IO.File]::ReadAllText((Join-Path $here 'hwplike.css.html'), [System.Text.Encoding]::UTF8)
$html = $head + $body + "`n</div>`n</body></html>`n"
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))

""
"─────────────────────────────"
"  표 $nTab 개 · 그림 $nFig 개"
if($nFig -ne 3){ "  ⚠ 그림이 3개가 아닙니다" }
"─────────────────────────────"
"  $out"
""
"브라우저로 열어 흰 지면을 긁어 복사한 뒤, 공고 첨부 양식"
"04_[아이디어_기획서]...hwp 에 붙여넣으세요."
"분량은 붙여넣은 뒤 한글에서 직접 확인해야 정확합니다."
