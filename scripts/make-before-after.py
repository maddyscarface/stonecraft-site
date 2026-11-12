# Builds the illustrative before/after pairs: AFTER = licensed stock crop, BEFORE = simulated wear on the same photo.
# Usage: python3 scripts/make-before-after.py  (run inside an output dir; needs numpy + Pillow)
import numpy as np, sys, json
from PIL import Image, ImageFilter, ImageOps, ImageEnhance, ImageChops
rng=np.random.default_rng(7)
SRC='/workspace/phase2/stonecraft/public/images/'
def load(path, box=None, size=(1200,900)):
    im=Image.open(path).convert('RGB')
    if box:  # fractional box
        W,H=im.size; im=im.crop((int(box[0]*W),int(box[1]*H),int(box[2]*W),int(box[3]*H)))
    return ImageOps.fit(im,size,Image.LANCZOS)
def noise(size, scale, seed):
    r=np.random.default_rng(seed)
    w,h=size; small=r.random((max(2,h//scale),max(2,w//scale)))
    return np.asarray(Image.fromarray((small*255).astype('uint8')).resize(size,Image.BICUBIC)).astype(float)/255
def line_mask(im, k=9, mode='both'):
    g=ImageOps.grayscale(im)
    close=g.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    open_=g.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))
    bh=np.asarray(close).astype(float)-np.asarray(g).astype(float)
    th=np.asarray(g).astype(float)-np.asarray(open_).astype(float)
    m=bh if mode=='dark' else th if mode=='light' else np.maximum(bh,th)
    m=np.clip((m-6)/30,0,1)
    m=np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)/255
    return m
def dirty(im, grout=0.0, k=9, mode='both', dull=0.35, yellow=0.12, scum=0.25, etch=0.0, caulk=None, seed=1):
    a=np.asarray(im).astype(float)/255
    # dull: compress highlights, lower contrast/saturation
    lum=a.mean(axis=2,keepdims=True)
    a=a*(1-dull*0.35)+lum*(dull*0.25)+0.03*dull
    hi=np.clip((lum-0.75)/0.25,0,1); a=a-hi*dull*0.18
    # warm/yellow cast
    a=a*np.array([1.0,0.97,0.86])**(yellow*6)
    # grout grime along joints
    if grout>0:
        m=line_mask(im,k,mode)[...,None]
        var=noise(im.size,40,seed)[...,None]*0.6+0.4
        grime=np.array([0.29,0.25,0.19])
        a=a*(1-m*grout*var)+grime*m*grout*var
    # soap scum / water spots: blotchy low-frequency haze
    if scum>0:
        n=noise(im.size,60,seed+1); n2=noise(im.size,12,seed+2)
        blot=np.clip((n*0.7+n2*0.3-0.55)*3,0,1)[...,None]
        a=a*(1-blot*scum*0.5)+np.array([0.80,0.77,0.68])*blot*scum*0.5
    # etch marks on stone: dull lighter rings + fine scratches
    if etch>0:
        H,W=a.shape[:2]; yy,xx=np.mgrid[0:H,0:W]
        for i in range(7):
            cx,cy,r=rng.integers(0,W),rng.integers(0,H),rng.integers(25,80)
            d=np.sqrt((xx-cx)**2+(yy-cy)**2); ring=np.exp(-((d-r)/6)**2)*0.6+np.exp(-(d/r)**2)*0.35
            a=a*(1-ring[...,None]*etch*0.35)+0.86*ring[...,None]*etch*0.35
        sc=Image.new('L',im.size,0)
        from PIL import ImageDraw
        d_=ImageDraw.Draw(sc)
        for i in range(40):
            x,y=rng.integers(0,W),rng.integers(0,H); L=rng.integers(40,220); ang=rng.uniform(0,np.pi)
            d_.line((x,y,x+L*np.cos(ang),y+L*np.sin(ang)),fill=int(rng.integers(60,140)),width=1)
        s=np.asarray(sc.filter(ImageFilter.GaussianBlur(0.6))).astype(float)[...,None]/255
        a=a*(1-s*etch*0.5)+0.9*s*etch*0.5
    # caulk: band where old caulk is yellowed/mildewed: (y0,y1) fractional, slope
    if caulk:
        H,W=a.shape[:2]; yy,xx=np.mgrid[0:H,0:W]
        y0,y1=caulk; yc=(y0+(y1-y0)*xx/W)*H
        band=np.exp(-((yy-yc)/14)**2)
        spots=np.clip((noise(im.size,6,seed+5)-0.5)*4,0,1)
        mil=band*(0.45+0.55*spots)
        a=a*(1-mil[...,None]*0.75)+np.array([0.33,0.31,0.24])*mil[...,None]*0.75
    a=np.clip(a,0,1)
    out=Image.fromarray((a*255).astype('uint8'))
    return out.filter(ImageFilter.GaussianBlur(0.4))
import os
PAIRS=json.load(open(os.path.join(os.path.dirname(__file__),'before-after-pairs.json')))
for p in PAIRS:
    im=load(p['src'] if p['src'].startswith('/') else SRC+p['src'], p.get('box'))
    b=dirty(im, **p.get('fx',{}))
    im.save(f"ba-{p['id']}-after.webp",quality=82); b.save(f"ba-{p['id']}-before.webp",quality=82)
    s=Image.new('RGB',(1200,450)); s.paste(b.resize((600,450)),(0,0)); s.paste(im.resize((600,450)),(600,0)); s.save(f"/tmp/ba-{p['id']}.jpg",quality=80)
    print(p['id'])
