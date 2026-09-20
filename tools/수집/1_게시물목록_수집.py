import urllib.request, urllib.parse, re, html, json, ssl, time
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
BASE="https://sedu.sen.go.kr"
DISTRICTS={"dongbu":"동부","seobu":"서부","nambu":"남부","bukbu":"북부","jungbu":"중부",
"gangnam":"강남서초","gangdong":"강동송파","gangseo":"강서양천","seongdong":"성동광진",
"sensb":"성북강북","dongjak":"동작관악"}

def post(url,data):
    req=urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(),
        headers={"User-Agent":"Mozilla/5.0","Referer":BASE})
    with urllib.request.urlopen(req,timeout=40,context=ctx) as r:
        return r.read().decode('utf-8','replace')

def rows(h):
    out=[]
    for tr in re.findall(r'(?is)<tr[^>]*>(.*?)</tr>',h):
        m=re.search(r"fncDetail\('(\d+)'\)\;?\"[^>]*>(.*?)</a>",tr,re.S)
        if not m: continue
        title=html.unescape(re.sub(r'<[^>]*>','',m.group(2))).strip()
        tds=re.findall(r'(?is)<td[^>]*>(.*?)</td>',tr)
        tds=[html.unescape(re.sub(r'<[^>]*>','',t)).strip() for t in tds]
        date=next((t for t in tds if re.fullmatch(r'\d{4}-\d{2}-\d{2}',t)),'')
        out.append({"seq":m.group(1),"title":re.sub(r'\s+',' ',title),"date":date})
    return out

res={}
for slug,name in DISTRICTS.items():
    found=[]
    for bt in ("notice","pds"):
        for page in (1,2):
            try:
                h=post(f"{BASE}/{slug}/board/boardList.do",
                    {"board_type_cd":bt,"branch_cd":slug,"pageIndex":str(page),
                     "searchCondition":"title","searchKeyword":"2027"})
            except Exception as e:
                print(slug,bt,page,"ERR",e); continue
            rs=rows(h)
            for r in rs: r["board"]=bt
            found+=rs
            if len(rs)<10: break
            time.sleep(0.3)
    # dedupe
    seen=set(); uniq=[]
    for r in found:
        if r["seq"] in seen: continue
        seen.add(r["seq"]); uniq.append(r)
    res[slug]={"name":name,"posts":uniq}
    print(f"\n=== {name} ({slug}) : {len(uniq)}건 ===")
    for r in uniq: print(f"  [{r['board']}] {r['date']} {r['seq']}  {r['title']}")
json.dump(res,open('posts.json','w'),ensure_ascii=False,indent=1)
