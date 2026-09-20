import struct,sys
def read_ole(path):
    d=open(path,'rb').read()
    assert d[:8]==b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', 'not OLE'
    ssz=1<<struct.unpack_from('<H',d,30)[0]
    mssz=1<<struct.unpack_from('<H',d,32)[0]
    n_fat=struct.unpack_from('<I',d,44)[0]
    dir_start=struct.unpack_from('<I',d,48)[0]
    mini_start=struct.unpack_from('<I',d,60)[0]
    difat_start=struct.unpack_from('<I',d,68)[0]; n_difat=struct.unpack_from('<I',d,72)[0]
    def sect(i): off=(i+1)*ssz; return d[off:off+ssz]
    difat=[struct.unpack_from('<I',d,76+4*i)[0] for i in range(109)]
    s=difat_start
    for _ in range(n_difat):
        blk=sect(s); difat+=[struct.unpack_from('<I',blk,4*i)[0] for i in range(ssz//4-1)]
        s=struct.unpack_from('<I',blk,ssz-4)[0]
    fat=[]
    for fs in difat[:n_fat]:
        if fs>=0xFFFFFFFA: break
        blk=sect(fs); fat+=[struct.unpack_from('<I',blk,4*i)[0] for i in range(ssz//4)]
    def chain(start):
        out=[]; c=start
        while c<0xFFFFFFFA and len(out)<200000: out.append(c); c=fat[c]
        return out
    def stream(start): return b''.join(sect(i) for i in chain(start))
    dirdata=stream(dir_start)
    entries=[]
    for i in range(len(dirdata)//128):
        e=dirdata[i*128:(i+1)*128]
        nl=struct.unpack_from('<H',e,64)[0]
        name=e[:max(0,nl-2)].decode('utf-16-le','replace')
        entries.append({'name':name,'type':e[66],'start':struct.unpack_from('<I',e,116)[0],
                        'size':struct.unpack_from('<Q',e,120)[0]})
    root=entries[0]
    minidata=b''
    if root['size']>0:
        minidata=b''.join(sect(i) for i in chain(root['start']))
    def get(name):
        for e in entries:
            if e['name']==name and e['type']==2:
                if e['size']<4096:
                    ch=[]; c=e['start']
                    mf=None
                    for x in entries:
                        if x['name']=='': pass
                    # mini FAT
                    return mini_read(e)
                return stream(e['start'])[:e['size']]
        return None
    # mini FAT chain
    minifat_start=struct.unpack_from('<I',d,60)[0]
    mfat=[]
    for i in chain(minifat_start):
        blk=sect(i); mfat+=[struct.unpack_from('<I',blk,4*j)[0] for j in range(ssz//4)]
    def mini_read(e):
        out=b''; c=e['start']
        while c<0xFFFFFFFA:
            out+=minidata[c*mssz:(c+1)*mssz]; c=mfat[c]
        return out[:e['size']]
    return entries,get

for p in sys.argv[1:]:
    entries,get=read_ole(p)
    print('==',p)
    print('  streams:',[e['name'] for e in entries if e['type']==2][:15])
    t=get('PrvText')
    if t: print('  PrvText:',repr(t.decode('utf-16-le','replace')[:600]))
