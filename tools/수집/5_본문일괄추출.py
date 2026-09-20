import os,sys,re
sys.path.insert(0,'.')
from hwptext import extract as hwp
from pypdf import PdfReader
import os
# 원본 보관 폴더. 다른 기기에서는 환경변수로 지정한다.
#   export NOTICE_DIR=~/Desktop/특수교육맵서비스/공고원문_2027중입
_DEFAULT = os.path.expanduser("~/Desktop/특수교육맵서비스/공고원문_2027중입")
ROOT=os.path.expanduser(os.environ.get("NOTICE_DIR", _DEFAULT))
for 관할 in sorted(os.listdir(ROOT)):
    d=os.path.join(ROOT,관할)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        p=os.path.join(d,f); ext=f.rsplit('.',1)[-1].lower()
        try:
            if ext=='hwp': t=hwp(p)
            elif ext=='pdf':
                t='\n'.join((pg.extract_text() or '') for pg in PdfReader(p).pages)
            else: continue
        except Exception as e:
            print('ERR',관할,f,e); continue
        t=re.sub(r'\n{3,}','\n\n',t).strip()
        out=f"본문/{관할}__{ext}__{os.path.splitext(f)[0][:60]}.txt"
        open(out,'w',encoding='utf-8').write(t)
        print(f"{관할:6s} {ext:4s} {len(t):7,}자  {f[:70]}")
