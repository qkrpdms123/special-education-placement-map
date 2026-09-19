#!/usr/bin/awk -f
# HWP_제출원고.txt(작성 안내 제거본) -> 읽기용 마크다운 사본
# 사용: awk -f to_md.awk body.txt > 기획서.md

function trim(s){ sub(/^[ \t]+/,"",s); sub(/[ \t]+$/,"",s); return s }

function flush(){
  if(buf==""){ return }
  if(bufkind=="lead")      printf "**%s**\n\n", buf
  else if(bufkind=="note") printf "> %s\n\n", buf
  else if(bufkind=="fn")   printf "%s\n\n", buf
  else if(bufkind=="li1")  printf "- %s\n", buf
  else if(bufkind=="li2")  printf "  - %s\n", buf
  else if(bufkind=="li3")  printf "    - %s\n", buf
  else                     printf "%s\n\n", buf
  buf=""; bufkind=""
}
function tflush(){
  if(trow==0) return
  printf "**%s**\n\n", tcap
  for(r=1;r<=trow;r++){
    nc=split(tdata[r],cell,"\t")
    printf "|"
    for(c=1;c<=nc;c++) printf " %s |", trim(cell[c])
    print ""
    if(r==1){ printf "|"; for(c=1;c<=nc;c++) printf "---|"; print "" }
  }
  print ""
  trow=0; tcap=""
}
function add(kind, txt){ flush(); bufkind=kind; buf=txt }

BEGIN{ mode="title"; skipfig=0 }

{
  line=$0
  if(index(line,"════")>0 || index(line,"────")>0) next
  if(skipfig){
    if(line=="") next
    if(line ~ /^ *※/ || line ~ /^ +삽입 후/) next
    skipfig=0
  }
  if(line==""){ if(intable){ tflush(); intable=0 } flush(); next }

  match(line,/^ */); ind=RLENGTH; rest=substr(line,ind+1)

  if(mode=="title"){
    if(rest ~ /^Ⅰ\./){ mode="sec1"; print "## Ⅰ. 참가 개요\n"; next }
    if(ind>=6){ t[++tn]=trim(rest) }
    next
  }

  if(pendtable && index(line,"\t")>0){ intable=1; pendtable=0 }
  if(intable && index(line,"\t")>0){ tdata[++trow]=line; next }
  if(intable && index(line,"\t")==0){ tflush(); intable=0 }

  if(rest ~ /^【표 /){ flush(); tcap=trim(rest); pendtable=1; trow=0; next }
  if(rest ~ /^【그림 /){
    flush(); cap=trim(rest)
    if(cap ~ /그림 1/) f="fig1.png"; else if(cap ~ /그림 2/) f="fig2.png"; else f="fig3.png"
    printf "![%s](./figures/%s)\n\n**%s**\n\n", cap, f, cap
    skipfig=1; next
  }

  if(rest ~ /^Ⅱ\./){ flush(); mode="body"; print "---\n\n## Ⅱ. 세부 내용\n"; next }

  if(mode=="sec1" && rest ~ /^[0-9]\. /){
    flush(); lbl=rest; sub(/^[0-9]\. /,"",lbl)
    printf "### %s\n\n", trim(lbl); next
  }

  if(rest ~ /^[0-9]\. .*〔[0-9]+점〕/){ flush(); printf "## %s\n\n", trim(rest); next }
  if(rest ~ /^[0-9]-[0-9]\. /){ flush(); printf "### %s\n\n", trim(rest); next }
  if(ind>=5 && rest ~ /^— /){ printf "*%s*\n\n", trim(rest); next }
  if(ind==0 && rest ~ /^(가|나|다|라|마|바|사|아|자|차)\. /){ flush(); printf "#### %s\n\n", trim(rest); next }
  if(ind==0 && rest ~ /^참고자료 및 출처/){ flush(); printf "---\n\n## %s\n\n", trim(rest); next }
  if(ind==0 && rest ~ /^이상\.$/){ flush(); print "*이상.*"; next }

  if(rest ~ /^▶ ?/){ x=rest; sub(/^▶ ?/,"",x); add("lead",trim(x)); next }
  if(rest ~ /^※ ?/){ x=rest; sub(/^※ ?/,"",x); add("note","※ " trim(x)); next }
  if(rest ~ /^주[0-9]+\) ?/){ add("fn",trim(rest)); next }
  if(rest ~ /^○ ?/){ x=rest; sub(/^○ ?/,"",x); add("li1",trim(x)); next }
  if(rest ~ /^- ?/ && ind>=4){ x=rest; sub(/^- ?/,"",x); add("li2",trim(x)); next }
  if(rest ~ /^· ?/){ x=rest; sub(/^· ?/,"",x); add("li3",trim(x)); next }
  if(rest ~ /^[①②③④⑤⑥⑦⑧⑨⑩] /){ add("li1",trim(rest)); next }
  if(rest ~ /^[0-9]\) /){ add("li1",trim(rest)); next }

  if(buf!=""){ sep=(buf ~ /·$/) ? "" : " "; buf = buf sep trim(rest); next }
  add("p",trim(rest)); next
}
END{ if(intable) tflush(); flush() }
