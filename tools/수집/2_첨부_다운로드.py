import urllib.request, urllib.parse, re, html, json, ssl, os, hashlib, time
import os
# 원본 보관 폴더. 다른 기기에서는 환경변수로 지정한다.
#   export NOTICE_DIR=~/Desktop/특수교육맵서비스/공고원문_2027중입
_DEFAULT = os.path.expanduser("~/Desktop/특수교육맵서비스/공고원문_2027중입")
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
BASE="https://sedu.sen.go.kr"
OUT=os.path.expanduser(os.environ.get("NOTICE_DIR", _DEFAULT))
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

TARGETS=[
 ("dongbu","동부","notice","9447"),
 ("seobu","서부","notice","9456"),
 ("nambu","남부","notice","9448"),
 ("bukbu","북부","notice","9449"),
 ("jungbu","중부","notice","9450"),
 ("gangnam","강남서초","notice","9446"),
 ("gangdong","강동송파","notice","9458"),
 ("gangseo","강서양천","notice","9445"),
 ("sensb","성북강북","notice","9444"),
 ("dongjak","동작관악","notice","9455"),
]

def post(url,data,ref):
    req=urllib.request.Request(url,data=urllib.parse.urlencode(data).encode(),
        headers={**UA,"Referer":ref})
    return urllib.request.urlopen(req,timeout=60,context=ctx)

manifest=[]
for slug,name,bt,seq in TARGETS:
    ref=f"{BASE}/{slug}/board/boardList.do"
    h=post(f"{BASE}/{slug}/board/boardView.do",
           {"board_type_cd":bt,"branch_cd":slug,"board_seq":seq,"pageIndex":"1"},ref).read().decode('utf-8','replace')
    title=""
    mt=re.search(r'(?is)<th[^>]*>\s*제목\s*</th>\s*<td[^>]*>(.*?)</td>',h)
    if mt: title=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]*>','',mt.group(1)))).strip()
    md=re.search(r'(\d{4}-\d{2}-\d{2})',h); date=md.group(1) if md else ""
    afid=re.search(r'name="attach_file_id"\s+value="(\d*)"',h)
    afid=afid.group(1) if afid else ""
    files=re.findall(r"fncFileDown\('(\d+)'\);?\"[^>]*>(.*?)</a>",h,re.S)
    d=os.path.join(OUT,name); os.makedirs(d,exist_ok=True)
    print(f"\n[{name}] {title} ({date}) attach_file_id={afid} files={len(files)}")
    for fseq,fname in files:
        fname=html.unescape(re.sub(r'<[^>]*>','',fname)).strip()
        fname=re.sub(r'[/\x00]','_',fname)
        r=post(f"{BASE}/fileDownload.do",
               {"board_type_cd":bt,"branch_cd":slug,"board_seq":seq,
                "attach_file_id":afid,"file_seq":fseq,"pageIndex":"1",
                "searchCondition":"","searchKeyword":""},
               f"{BASE}/{slug}/board/boardView.do")
        blob=r.read()
        ct=r.headers.get("Content-Type","")
        path=os.path.join(d,f"({name}){fname}")
        open(path,'wb').write(blob)
        sha=hashlib.sha256(blob).hexdigest().upper()
        sig=blob[:8]
        print(f"   - {fname}  {len(blob):,}B  {ct}  sig={sig[:4]!r}")
        manifest.append({"관할":name,"slug":slug,"게시판":bt,"board_seq":seq,
            "제목":title,"게시일":date,"attach_file_id":afid,"file_seq":fseq,
            "파일명":fname,"바이트":len(blob),"sha256":sha,
            "게시글":f"{BASE}/{slug}/board/boardView.do (POST board_type_cd={bt}&branch_cd={slug}&board_seq={seq})",
            "목록":f"{BASE}/{slug}/board/boardList.do?board_type_cd={bt}"})
        time.sleep(0.4)
json.dump(manifest,open(os.path.join(OUT,'_수집대장.json'),'w'),ensure_ascii=False,indent=1)
print("\n총 파일:",len(manifest))
