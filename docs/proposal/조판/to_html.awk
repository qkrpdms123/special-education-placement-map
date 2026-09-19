#!/usr/bin/awk -f
# HWP_제출원고.txt  ->  한글이 읽을 수 있는 HTML
# 사용: awk -f to_html.awk body.txt > out.html
#   body.txt 는 '작성 안내' 상자를 제거한 본문

function esc(s){ gsub(/&/,"\\&amp;",s); gsub(/</,"\\&lt;",s); gsub(/>/,"\\&gt;",s); return s }
function trim(s){ sub(/^[ \t]+/,"",s); sub(/[ \t]+$/,"",s); return s }

function flushpara(){
  if(buf!=""){
    if(bufkind=="lead")      printf "<p class=\"lead\">%s</p>\n", esc(buf)
    else if(bufkind=="note") printf "<p class=\"note\">%s</p>\n", esc(buf)
    else if(bufkind=="fn")   printf "<p class=\"fn\">%s</p>\n",   esc(buf)
    else if(bufkind=="li1")  printf "<p class=\"li1\">%s</p>\n",  esc(buf)
    else if(bufkind=="li2")  printf "<p class=\"li2\">%s</p>\n",  esc(buf)
    else if(bufkind=="li3")  printf "<p class=\"li3\">%s</p>\n",  esc(buf)
    else                     printf "<p>%s</p>\n", esc(buf)
    buf=""; bufkind=""
  }
}
function flushtable(){
  if(trow==0) return
  printf "<p class=\"tcap\">%s</p>\n", esc(tcap)
  print "<table>"
  for(r=1;r<=trow;r++){
    printf (r==1) ? "<tr class=\"th\">" : "<tr>"
    nc=split(tdata[r],cell,"\t")
    for(c=1;c<=nc;c++) printf (r==1) ? "<th>%s</th>" : "<td>%s</td>", esc(trim(cell[c]))
    print "</tr>"
  }
  print "</table>"
  trow=0; tcap=""
}
function addpara(kind, txt){ flushpara(); bufkind=kind; buf=txt }

BEGIN{ buf=""; bufkind=""; trow=0; mode="title"; skipfig=0
  print "<html><head><meta charset=\"utf-8\"><title>중입배치 MAP 아이디어 기획서</title></head><body>"
}

{
  line=$0
  # 구분선 제거
  if(index(line,"════")>0 || index(line,"────")>0){ next }

  # 표/그림 안내 ※ 줄 건너뛰기
  if(skipfig){
    if(line=="" ){ next }
    if(line ~ /^ *※/ || line ~ /^ +삽입 후/ || line ~ /^ +캡션은/){ next }
    skipfig=0
  }

  if(line==""){
    if(trow>0 && intable){ flushtable(); intable=0 }
    flushpara(); next
  }

  match(line,/^ */); ind=RLENGTH; rest=substr(line,ind+1)

  # ---- 표지 ----
  if(mode=="title"){
    if(rest ~ /^Ⅰ./){ mode="sec1"; flushpara(); print "<h1>Ⅰ. 참가 개요</h1>"; next }
    if(ind>=6){ title[++tn]=trim(rest); next }
    next
  }

  # ---- 표 대기 상태: 탭 포함 줄 ----
  if(pendtable && index(line,"\t")>0){ intable=1; pendtable=0 }
  if(intable && index(line,"\t")>0){ tdata[++trow]=line; next }
  if(intable && index(line,"\t")==0){ flushtable(); intable=0 }

  # ---- 표 / 그림 헤더 ----
  if(rest ~ /^【표 /){
    flushpara(); tcap=trim(rest); pendtable=1; trow=0; next
  }
  if(rest ~ /^【그림 /){
    flushpara()
    cap=trim(rest)
    if(cap ~ /그림 1/) f="fig1.png"; else if(cap ~ /그림 2/) f="fig2.png"; else f="fig3.png"
    printf "<p class=\"figbox\"><img src=\"%s\"></p>\n", f
    printf "<p class=\"tcap\">%s</p>\n", esc(cap)
    skipfig=1; next
  }

  # ---- Ⅱ 세부 내용 ----
  if(rest ~ /^Ⅱ\./){
    flushpara(); mode="body"; print "<h1>Ⅱ. 세부 내용</h1>"; next
  }

  # ---- Ⅰ 안의 항목 ----
  # 조판본에서는 문단으로 렌더링한다. 실제 제출은 양식의 고정폭 표를 쓰므로
  # 표로 감싸면 한글 HTML 가져오기가 열 폭을 무시해 분량이 과다 계산된다.
  if(mode=="sec1"){
    if(rest ~ /^[0-9]\. /){
      flushpara()
      lbl=rest; sub(/^[0-9]\. /,"",lbl)
      printf "<h4>%s</h4>\n", esc(trim(lbl))
      next
    }
  }

  # ---- 제목 ----
  if(rest ~ /^[0-9]\. .*〔[0-9]+점〕/){ flushpara(); printf "<h2>%s</h2>\n", esc(trim(rest)); next }
  if(rest ~ /^[0-9]-[0-9]\. /){ flushpara(); printf "<h3>%s</h3>\n", esc(trim(rest)); next }
  if(ind>=5 && rest ~ /^— /){ printf "<p class=\"h3sub\">%s</p>\n", esc(trim(rest)); next }
  if(ind==0 && rest ~ /^(가|나|다|라|마|바|사|아|자|차). /){ flushpara(); printf "<h4>%s</h4>\n", esc(trim(rest)); next }
  if(ind==0 && rest ~ /^참고자료 및 출처/){ flushpara(); printf "<h1>%s</h1>\n", esc(trim(rest)); next }
  if(ind==0 && rest ~ /^이상\.$/){ flushpara(); print "<p class=\"end\">이상.</p>"; next }

  # ---- 문단 종류 ----
  if(rest ~ /^▶ ?/){ t=rest; sub(/^▶ ?/,"",t); addpara("lead",trim(t)); next }
  if(rest ~ /^※ ?/){ t=rest; sub(/^※ ?/,"",t); addpara("note","※ " trim(t)); next }
  if(rest ~ /^주[0-9]+\) ?/){ addpara("fn",trim(rest)); next }
  if(rest ~ /^○ ?/){ t=rest; sub(/^○ ?/,"",t); addpara("li1",trim(t)); next }
  if(rest ~ /^- ?/ && ind>=4){ t=rest; sub(/^- ?/,"",t); addpara("li2",trim(t)); next }
  if(rest ~ /^· ?/){ t=rest; sub(/^· ?/,"",t); addpara("li3",trim(t)); next }
  if(rest ~ /^[①②③④⑤⑥⑦⑧⑨⑩] /){ addpara("li1",trim(rest)); next }
  if(rest ~ /^[0-9]\) /){ addpara("li1",trim(rest)); next }

  # ---- 계속 줄 / 일반 문단 ----
  if(buf!=""){ sep=(buf ~ /·$/) ? "" : " "; buf = buf sep trim(rest); next }
  addpara("p",trim(rest)); next
}

END{
  if(intable) flushtable()
  flushpara()
  print "</body></html>"
}
