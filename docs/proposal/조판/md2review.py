#!/usr/bin/env python3
"""마크다운 연구문서 -> 단일 HTML 검토본.
사용: python3 docs/proposal/조판/md2review.py <입력.md> <출력.html> "<부제>"
검토.html 과 같은 디자인 토큰을 쓴다. 외부 요청은 구글 폰트뿐이다."""
import sys, re, html as H

CSS = """
:root{--paper:#F5F6F5;--surface:#FFF;--surface-2:#EDF0EF;--ink:#13303A;--ink-soft:#33474E;
--muted:#5C6B6E;--faint:#8A9698;--rule:#D6DDDB;--rule-soft:#E5EAE9;--accent:#1E8E84;
--accent-wash:#E2F0EE;--ok:#2F7D5B;--ok-wash:#E3F0E9;--warn:#A2691A;--warn-wash:#F6EDDD;
--todo:#A83F34;--todo-wash:#F8E7E4;
--serif:"Gowun Batang",Batang,serif;--sans:"IBM Plex Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;
--mono:"IBM Plex Mono","D2Coding",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#0D1518;--surface:#141F22;
--surface-2:#1B282B;--ink:#E4ECEA;--ink-soft:#C2CFCD;--muted:#93A3A4;--faint:#6B7B7D;
--rule:#2B3A3D;--rule-soft:#223033;--accent:#4BC3B5;--accent-wash:#152E2F;--ok:#63B88E;
--ok-wash:#162A22;--warn:#D2A257;--warn-wash:#2B2317;--todo:#DE8478;--todo-wash:#2D1B18}}
:root[data-theme="dark"]{--paper:#0D1518;--surface:#141F22;--surface-2:#1B282B;--ink:#E4ECEA;
--ink-soft:#C2CFCD;--muted:#93A3A4;--faint:#6B7B7D;--rule:#2B3A3D;--rule-soft:#223033;
--accent:#4BC3B5;--accent-wash:#152E2F;--ok:#63B88E;--ok-wash:#162A22;--warn:#D2A257;
--warn-wash:#2B2317;--todo:#DE8478;--todo-wash:#2D1B18}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;
line-height:1.75;margin:0;padding-inline:20px;-webkit-font-smoothing:antialiased}
.wrap{max-width:940px;margin:0 auto;padding-block:0 90px}
.mast{padding-block:48px 22px;border-bottom:2px solid var(--ink);margin-bottom:8px}
.kicker{font-family:var(--mono);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;
color:var(--accent);font-weight:600;margin:0 0 12px}
.mast h1{font-family:var(--serif);font-weight:700;font-size:clamp(27px,5vw,40px);line-height:1.18;margin:0 0 10px}
.mast p{font-size:15.5px;color:var(--ink-soft);margin:0;max-width:64ch}
.back{display:inline-block;font-family:var(--mono);font-size:11.5px;color:var(--accent);
text-decoration:none;margin-bottom:26px;border:1px solid var(--rule);border-radius:2px;padding:4px 10px}
.back:hover{background:var(--accent-wash)}
h2{font-family:var(--serif);font-size:25px;font-weight:700;margin:52px 0 10px;
padding-top:16px;border-top:1px solid var(--rule);line-height:1.3}
h3{font-size:18px;font-weight:600;margin:32px 0 8px;color:var(--ink);line-height:1.4}
h4{font-size:15.5px;font-weight:600;margin:24px 0 6px;color:var(--ink-soft)}
p{margin:0 0 14px;max-width:none}
ul,ol{margin:0 0 16px;padding-left:1.3em}
li{margin:0 0 6px}
hr{border:0;border-top:1px solid var(--rule);margin:40px 0}
code{font-family:var(--mono);font-size:.88em;background:var(--surface-2);
padding:1px 5px;border-radius:2px}
pre{background:var(--surface-2);border:1px solid var(--rule);border-radius:3px;
padding:14px 16px;overflow-x:auto;margin:0 0 18px}
pre code{background:none;padding:0;font-size:12.5px;line-height:1.65}
blockquote{margin:0 0 18px;padding:14px 18px;background:var(--surface);
border-left:3px solid var(--accent);border-radius:0 3px 3px 0;color:var(--ink-soft)}
blockquote p:last-child{margin-bottom:0}
strong{font-weight:600;color:var(--ink)}
a{color:var(--accent)}
.tw{overflow-x:auto;margin:0 0 22px;border:1px solid var(--rule);border-radius:3px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border-bottom:1px solid var(--rule-soft);padding:9px 12px;text-align:left;vertical-align:top}
th{background:var(--surface-2);font-weight:600;font-size:13px;white-space:nowrap;
position:sticky;top:0}
tr:last-child td{border-bottom:0}
td[align=right],th[align=right]{text-align:right}
td[align=center],th[align=center]{text-align:center}
@media(max-width:700px){body{font-size:15px}table{font-size:13px}th,td{padding:7px 9px}}
"""

def inline(s):
    s = H.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    s = s.replace('&lt;br&gt;', '<br>')
    return s

def render(md):
    lines = md.split('\n'); out=[]; i=0; n=len(lines)
    while i < n:
        L = lines[i]
        if L.startswith('```'):
            i+=1; buf=[]
            while i<n and not lines[i].startswith('```'): buf.append(lines[i]); i+=1
            i+=1; out.append('<pre><code>'+H.escape('\n'.join(buf))+'</code></pre>'); continue
        if re.match(r'^\|.*\|\s*$', L) and i+1<n and re.match(r'^\|[\s:*|-]+\|\s*$', lines[i+1]):
            def cells(r): return [c.strip() for c in r.strip().strip('|').split('|')]
            head=cells(L); align=[]
            for a in cells(lines[i+1]):
                a=a.strip()
                align.append(' align="center"' if a.startswith(':') and a.endswith(':')
                             else ' align="right"' if a.endswith(':') else '')
            i+=2; body=[]
            while i<n and re.match(r'^\|.*\|\s*$', lines[i]): body.append(cells(lines[i])); i+=1
            t=['<div class="tw"><table><thead><tr>']
            for k,h in enumerate(head): t.append(f'<th{align[k] if k<len(align) else ""}>{inline(h)}</th>')
            t.append('</tr></thead><tbody>')
            for r in body:
                t.append('<tr>')
                for k,c in enumerate(r): t.append(f'<td{align[k] if k<len(align) else ""}>{inline(c)}</td>')
                t.append('</tr>')
            t.append('</tbody></table></div>'); out.append(''.join(t)); continue
        if L.startswith('>'):
            buf=[]
            while i<n and lines[i].startswith('>'): buf.append(lines[i][1:].lstrip()); i+=1
            out.append('<blockquote>'+''.join(f'<p>{inline(x)}</p>' for x in buf if x.strip())+'</blockquote>'); continue
        m=re.match(r'^(#{1,4})\s+(.*)$', L)
        if m:
            lv=len(m.group(1)); out.append(f'<h{lv}>{inline(m.group(2))}</h{lv}>'); i+=1; continue
        if re.match(r'^---+\s*$', L): out.append('<hr>'); i+=1; continue
        def listitem(line):
            # 번호 목록은 1~30번만 인정하고, 뒤가 숫자로 시작하면 날짜로 본다
            # ("2026. 9. 20." 같은 문장을 목록으로 오인하지 않기 위함)
            mm=re.match(r'^(\s*)([-*])\s+(.*)$', line)
            if mm: return False, mm.group(3)
            mm=re.match(r'^(\s*)(\d{1,2})\.\s+(.*)$', line)
            if mm and 1<=int(mm.group(2))<=30 and not re.match(r'\d', mm.group(3)):
                return True, mm.group(3)
            return None, None
        ordered,first = listitem(L)
        if ordered is not None:
            tag='ol' if ordered else 'ul'
            items=[]
            while i<n:
                o,txt=listitem(lines[i])
                if o is None or o!=ordered: break
                items.append(inline(txt)); i+=1
            out.append(f'<{tag}>'+''.join(f'<li>{x}</li>' for x in items)+f'</{tag}>'); continue
        if L.strip()=='': i+=1; continue
        buf=[]
        while i<n and lines[i].strip() and not re.match(r'^(#|>|```|---+\s*$|\s*([-*]|\d{1,2}\.)\s)', lines[i]):
            if re.match(r'^\|.*\|\s*$', lines[i]) and i+1<n and re.match(r'^\|[\s:*|-]+\|\s*$', lines[i+1]):
                break                      # 진짜 표가 시작되면 문단을 끊는다
            buf.append(lines[i]); i+=1
        if buf:
            out.append('<p>'+inline(' '.join(buf))+'</p>')
        else:
            out.append('<p>'+inline(L)+'</p>'); i+=1   # 가드: 반드시 전진한다
    return '\n'.join(out)

src, dst = sys.argv[1], sys.argv[2]
sub = sys.argv[3] if len(sys.argv)>3 else ''
md = open(src, encoding='utf-8').read()
m = re.match(r'^#\s+(.*)$', md.split('\n')[0])
title = m.group(1) if m else src
body = render('\n'.join(md.split('\n')[1:]) if m else md)
open(dst,'w',encoding='utf-8').write(f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{H.escape(title)} — 중입배치 MAP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>{CSS}</style></head><body><div class="wrap">
<a class="back" href="../../검토.html">← 검토 목록</a>
<div class="mast"><p class="kicker">검토본 · 원문은 마크다운</p>
<h1>{H.escape(title)}</h1><p>{H.escape(sub)}</p></div>
{body}
</div></body></html>""")
print(f"생성: {dst}")
