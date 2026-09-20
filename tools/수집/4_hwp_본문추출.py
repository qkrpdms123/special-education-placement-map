import olefile, zlib, struct, sys, re
HWPTAG_PARA_TEXT = 0x010 + 51
CHAR1 = {0,10,13,24,25,26,27,28,29,30,31}      # 1 word
WIDE  = {1,2,3,11,12,14,15,16,17,18,21,22,23,  # 8 words (extended)
         4,5,6,7,8,9,19,20}                    # 8 words (inline)

def records(buf):
    i=0; n=len(buf)
    while i+4<=n:
        h=struct.unpack_from('<I',buf,i)[0]; i+=4
        tag=h&0x3FF; lvl=(h>>10)&0x3FF; size=(h>>20)&0xFFF
        if size==0xFFF:
            size=struct.unpack_from('<I',buf,i)[0]; i+=4
        yield tag,lvl,buf[i:i+size]; i+=size

def para_text(data):
    out=[]; run=bytearray(); i=0; n=len(data)
    def flush():
        if run:
            out.append(bytes(run).decode('utf-16-le','replace')); run.clear()
    while i+2<=n:
        c=data[i]|(data[i+1]<<8)
        if c in CHAR1:
            flush(); out.append('\n' if c in (10,13) else ''); i+=2
        elif c in WIDE:
            flush(); out.append('\t' if c==9 else ' '); i+=16
        else:
            run+=data[i:i+2]; i+=2
    flush()
    return ''.join(out)

def extract(path):
    f=olefile.OleFileIO(path)
    hdr=f.openstream('FileHeader').read()
    compressed=bool(struct.unpack_from('<I',hdr,36)[0] & 1)
    parts=[]
    for ent in sorted(f.listdir()):
        name='/'.join(ent)
        if not name.startswith('BodyText/Section'): continue
        raw=f.openstream(name).read()
        buf=zlib.decompress(raw,-15) if compressed else raw
        for tag,lvl,d in records(buf):
            if tag==HWPTAG_PARA_TEXT:
                parts.append(para_text(d))
    f.close()
    t='\n'.join(parts)
    t=t.replace('\r','\n')
    t=re.sub(r'[ \t]+',' ',t)
    t=re.sub(r'\n{3,}','\n\n',t)
    return t.strip()

if __name__=='__main__':
    print(extract(sys.argv[1]))
