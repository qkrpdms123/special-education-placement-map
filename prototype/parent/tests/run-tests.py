"""macOS JavaScriptCore로 정책 함수·UI 상태 로직 검증. 실제 브라우저 레이아웃 검증은 아님."""
import ctypes as c
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
j = c.CDLL('/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore')
j.JSGlobalContextCreate.restype=c.c_void_p
j.JSGlobalContextCreate.argtypes=[c.c_void_p]
j.JSStringCreateWithUTF8CString.restype=c.c_void_p
j.JSStringCreateWithUTF8CString.argtypes=[c.c_char_p]
j.JSEvaluateScript.restype=c.c_void_p
j.JSEvaluateScript.argtypes=[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p,c.c_int,c.POINTER(c.c_void_p)]
j.JSValueToStringCopy.restype=c.c_void_p
j.JSValueToStringCopy.argtypes=[c.c_void_p,c.c_void_p,c.POINTER(c.c_void_p)]
j.JSStringGetUTF8CString.argtypes=[c.c_void_p,c.c_char_p,c.c_size_t]
stub='''
const elements={};
function element(){return {textContent:'',innerHTML:'',hidden:false,checked:true,style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){}};}
const document={querySelector:s=>elements[s]||(elements[s]=element()),querySelectorAll:()=>[],addEventListener(){}};
const localStorage={getItem:()=>null,setItem(){}};
const window={scrollTo(){}};const setTimeout=()=>0,clearTimeout=()=>{};
'''
source=stub+'\n'+(root/'rules.js').read_text()+'\n'+(root/'app.js').read_text()+'\n'+(root/'tests/check.js').read_text()
ctx=j.JSGlobalContextCreate(None)
exc=c.c_void_p()
val=j.JSEvaluateScript(ctx,j.JSStringCreateWithUTF8CString(source.encode()),None,None,1,c.byref(exc))
sv=j.JSValueToStringCopy(ctx,exc.value or val,None)
buf=c.create_string_buffer(30000)
j.JSStringGetUTF8CString(sv,buf,len(buf))
result=buf.value.decode()
if exc.value:
    print(result)
    raise SystemExit(1)
print(json.dumps(json.loads(result),ensure_ascii=False,indent=2))
