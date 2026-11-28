/* ---------- the one helper behind every 1-D plot (MS-25) ----------
   The source spectrum, the interfered spectrum, the profile and the interferogram all draw their curves through this file, on
   screen (traceRaster) and in exports (tracesSVG), so the anti-aliasing is the same everywhere.
   A trace is a signal over t ∈ [0,1] across the plot area, left to right, in plot units (0 at the bottom, 1 at the top):
     val(t)     the exact value of the curve
     fr(a,b)    how many fringes the slice [a,b] holds (0 for a smooth curve)
     band(a,b)  [lo, hi], the band the fringes cover over [a,b], used once it holds a whole fringe
   A curve is never just sampled at a fixed step: a slice finer than a fringe is sampled at 32 points per fringe (the sampled max then misses the true one by at most ½(1 − cos π/32) = 0.24% of the band), and a slice
   holding a whole fringe or more spans its envelope, so fringes finer than a pixel fill the band they really cover instead of
   beating into a false pattern (aliasing). */

/* the exact min–max span of a signal over [t0,t1] (the shared array SPAN2: read it before the next call) */
function spanOf(t0,t1,s){const fr=s.fr(t0,t1);let lo=Infinity,hi=-Infinity;
  if(fr>=1)return s.band(t0,t1);
  else{const k=Math.max(2,Math.ceil(32*fr)+1);for(let q=0;q<=k;q++){const v=s.val(t0+(t1-t0)*q/k);lo=Math.min(lo,v);hi=Math.max(hi,v)}}SPAN2[0]=lo;SPAN2[1]=hi;return SPAN2}
const SPAN2=[0,0];

/* signals */
/* the interferogram and the profile: I = ½(1 + Re γ(δ(t))), between ½(1 ± |γ|) */
function fringeSig(dAt,cs){const g=gammaOf(cs),smax=Math.max(...cs.map(c=>c.s)),E=[0,0];
  return{fr:(a,b)=>Math.abs(dAt(b)-dAt(a))*smax,val:t=>0.5*(1+g.re(dAt(t))),
    band:(a,b)=>{let lo=1,hi=0;for(let q=0;q<=4;q++){const m=g.mag(dAt(a+(b-a)*q/4));lo=Math.min(lo,0.5*(1-m));hi=Math.max(hi,0.5*(1+m))}E[0]=lo;E[1]=hi;return E}}}
/* a spectral curve f(σ) on a wavelength axis running from l1 (t = 0, left) to l0 (t = 1), divided by ym; with mod, times
   T(σ;δ₀) = ½(1 + cos 2πσδ₀), which swings between 0 and 1 once per Δσ = 1/δ₀. Over a span holding a whole fringe, f·T reaches 0
   at a trough of T and f(σ_k) at each peak σ_k = k/|δ₀| (T = 1 there), so the band is [0, max_k f(σ_k)] */
function specSig(f,l0,l1,ym,d0,mod){const sg=t=>1000/(l1-(l1-l0)*t),E=[0,0],ad=Math.abs(d0);
  return mod?{fr:(a,b)=>Math.abs(sg(b)-sg(a))*ad,val:t=>{const s=sg(t);return f(s)*0.5*(1+Math.cos(2*Math.PI*s*d0))/ym},
      band:(a,b)=>{const sa=sg(a)*ad,sb=sg(b)*ad;let hi=0;for(let k=Math.ceil(Math.min(sa,sb));k<=Math.max(sa,sb);k++)hi=Math.max(hi,f(k/ad));E[0]=0;E[1]=hi/ym;return E}}
    :{fr:()=>0,val:t=>f(sg(t))/ym}}
const hexRGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

/* ---------- raster trace ----------
   Each device-pixel column is split into K = 8 sub-columns. Each sub-column contributes the exact min–max span of the signal over
   its own slice (spanOf), drawn at least 1.25 px tall, with 1/K coverage and fractional coverage at its ends (shown with a 0.45
   display gamma, like scope persistence). Summing coverage is a box filter: proper anti-aliasing, so fringes near the pixel pitch
   blend into an even tone instead of beating into moiré. A small horizontal Gaussian (sd 0.7 px) then suppresses the box
   filter's own side-lobes. Options: alpha (opacity), dash ([on, off] in CSS px, along x). */
/* Sub-columns per pixel: always 8, moving or at rest. Never adapt this to the frame time: dense fringes look very different at
   2 and at 8 sub-columns (a solid band against the true crowding at ½(1 ± |γ|)), so switching between them made the plots flicker
   while dragging (fixed in MS-17). */
const DPK=8;
/* 2·acos(u) from a 4,096-step table, linearly interpolated (it sets a row's shading only, not a plotted value; a direct acos per row
   cost 5–10 ms a frame on the interfered spectrum's full-height bands) */
const ACT=new Float64Array(4098);for(let i=0;i<=4097;i++)ACT[i]=2*Math.acos(Math.max(-1,Math.min(1,-1+i/2048)));
const ACOS2=u=>{const x=(u+1)*2048,i=Math.min(4095,x|0),f=x-i;return ACT[i]+(ACT[i+1]-ACT[i])*f};
/* buffers are reused between calls, one set per target canvas; only the rows a column (or its filter neighbours) touched are visited */
function traceRaster(ctx,x0,y0,Wd,Hd,sig,colourAt,o={}){const K=DPK,
  B=ctx.__dp&&ctx.__dp.Wd===Wd&&ctx.__dp.Hd===Hd?ctx.__dp:(ctx.__dp={Wd,Hd,img:ctx.createImageData(Wd,Hd),C:new Float32Array(Wd*Hd),r0:new Int32Array(Wd),r1:new Int32Array(Wd),off:document.createElement('canvas')});
  const img=B.img,D=img.data,C=B.C,r0=B.r0,r1=B.r1,cols=[],MINH=1.25*DPR(),al=o.alpha??1,dash=o.dash&&o.dash.map(v=>v*DPR());
  D.fill(0);C.fill(0);
  for(let px=0;px<Wd;px++){const base=px*Hd;let c0=Hd,c1=-1;
    const N=sig.fr(px/Wd,(px+1)/Wd),on=!dash||(px%(dash[0]+dash[1]))<dash[0];
    if(on&&N>=1){
      /* a pixel holding a whole fringe or more: its sub-columns sweep the fringe phase evenly, so the pattern of spans they cover
         carries no information, and deciding it per sub-column beat into faint streaks whenever 1–8 fringes fell in a pixel (MS-25).
         Each row instead gets the coverage one sub-column of the fringe fraction f = N/K gives it on average over the phase:
         a sinusoid of band [lo,hi] meets the value of a row at the two phases ±a, a = acos(u), u its position in the band, and an
         arc of L = 2πf meets one of them for 2L − max(0, L−2a) − max(0, L−2π+2a) of the 2π starting phases (1 once f ≥ 1).
         At N = 1 this is the same mean the sub-columns give, so the change of rule is continuous. */
      const[lo,hi]=sig.band(px/Wd,(px+1)/Wd);let ya=(1-hi)*(Hd-1),yb=(1-lo)*(Hd-1);const L=2*Math.PI*Math.min(1,N/K),thin=yb-ya<MINH;
      if(thin){const m=(ya+yb)/2;ya=m-MINH/2;yb=m+MINH/2}
      const ja=Math.max(0,Math.floor(ya)),jb=Math.min(Hd-1,Math.ceil(yb));c0=ja;c1=jb;
      for(let yy=ja;yy<=jb;yy++){const y1=Math.max(yy,ya),y2=Math.min(yy+1,yb),v=y2-y1;if(v<=0)continue;
        const g=ACOS2(clamp((y1+y2-ya-yb)/(yb-ya),-1,1));C[base+yy]+=thin?v:v*Math.min(1,(2*L-Math.max(0,L-g)-Math.max(0,L-2*Math.PI+g))/(2*Math.PI))}}
    else if(on)for(let k=0;k<K;k++){const[lo,hi]=spanOf((px+k/K)/Wd,(px+(k+1)/K)/Wd,sig);let ya=(1-hi)*(Hd-1),yb=(1-lo)*(Hd-1);
      if(yb-ya<MINH){const m=(ya+yb)/2;ya=m-MINH/2;yb=m+MINH/2}
      const ja=Math.max(0,Math.floor(ya)),jb=Math.min(Hd-1,Math.ceil(yb));if(ja<c0)c0=ja;if(jb>c1)c1=jb;
      for(let yy=ja;yy<=jb;yy++){const v=Math.min(yy+1,yb)-Math.max(yy,ya);if(v>0)C[base+yy]+=v/K}}
    r0[px]=c0;r1[px]=c1;cols.push(colourAt((px+0.5)/Wd))}
  /* horizontal Gaussian low-pass (sd 0.7 px) on top of the box filter removes the box filter's sinc side-lobes, which are what still beat into moiré */
  const LP=[0.0097,0.205,0.5706,0.205,0.0097];
  for(let px=0;px<Wd;px++){const c=cols[px];let ja=Hd,jb=-1;for(let q=Math.max(0,px-2);q<=Math.min(Wd-1,px+2);q++){if(r0[q]<ja)ja=r0[q];if(r1[q]>jb)jb=r1[q]}
    for(let yy=ja;yy<=jb;yy++){let v=0;for(let t=-2;t<=2;t++){const q=px+t;if(q>=0&&q<Wd)v+=LP[t+2]*C[q*Hd+yy]}if(v<=0.002)continue;
      const a=Math.pow(Math.min(1,v),0.45),p=4*(yy*Wd+px);D[p]=c[0];D[p+1]=c[1];D[p+2]=c[2];D[p+3]=255*a*al}}
  const off=B.off;if(off.width!==Wd||off.height!==Hd){off.width=Wd;off.height=Hd}off.getContext('2d').putImageData(img,0,0);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(off,x0,y0);ctx.restore()}
/* a plot's canvas sized to its box at DPR, cleared; returns the context and the plot area in device px */
function plotCanvas(cv,W,H,pl,pr,pt,pb){const dpr=DPR(),cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch}  /* resizing a canvas reallocates it: only when the size changes */
  const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cw,ch);return{g,x0:Math.round(pl*dpr),y0:Math.round(pt*dpr),Wd:Math.round((W-pl-pr)*dpr),Hd:Math.round((H-pt-pb)*dpr)}}
/* every trace of a plot: tr = [{sig, col: t → [r,g,b], alpha, dash}] */
function drawTraces(P,tr){for(const t of tr)traceRaster(P.g,P.x0,P.y0,P.Wd,P.Hd,t.sig,t.col,t)}

/* ---------- vector traces (SVG export) ----------
   The true curve val(t) as a path with at least 16 points per fringe; a colour that varies along t (vary) becomes a linear gradient. */
function fringeN(sig){let n=0;for(let i=0;i<2000;i++)n+=sig.fr(i/2000,(i+1)/2000);return clamp(Math.ceil(n*16),2000,400000)}
function curvePath(n,xy){let p='';for(let i=0;i<=n;i++){const[x,y]=xy(i/n);p+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)}return p}
function tracesSVG(W,H,pl,pr,pt,pb,tr){const X=t=>pl+t*(W-pl-pr),Y=v=>pt+(1-v)*(H-pt-pb);let s='';
  tr.forEach((t,i)=>{const n=fringeN(t.sig);let stroke=`rgb(${t.col(0.5)})`;
    if(t.vary){const m=clamp(Math.ceil(n/2),256,20000);let st='';for(let j=0;j<=m;j++)st+=`<stop offset="${(j/m).toFixed(6)}" stop-color="rgb(${t.col(j/m)})"/>`;
      s+=`<defs><linearGradient id="${t.id||"tr"+i}" gradientUnits="userSpaceOnUse" x1="${pl}" x2="${W-pr}" y1="0" y2="0">${st}</linearGradient></defs>`;stroke=`url(#${t.id||"tr"+i})`}
    s+=`<path d="${curvePath(n,u=>[X(u),Y(t.sig.val(u))])}" fill="none" stroke="${stroke}" stroke-width="${t.w??1.5}"${t.alpha!=null?` stroke-opacity="${t.alpha}"`:''}${t.dash?` stroke-dasharray="${t.dash.join(' ')}"`:''} stroke-linejoin="round"/>`});
  return s}

/* largest error, in plot heights, of the spans the 1-D plots draw (spanOf, or the band of a pixel holding a whole fringe, as in
   traceRaster) against the min/max of densely sampled exact values, on a 800-pixel plot */
function traceCheck(M){let e=0;const Wd=800,K=DPK;
  for(const t of [...ifgTraces(0),...profTraces(M),...specTraces(),...outTraces()]){const s=t.sig;
    for(let i=0;i<48;i++){const px=Math.floor((i+0.37)/48*Wd),N=s.fr(px/Wd,(px+1)/Wd);let a,b,lo=Infinity,hi=-Infinity;
      if(N>=1){a=px/Wd;b=(px+1)/Wd;[lo,hi]=s.band(a,b)}
      else{a=(px+3/K)/Wd;b=(px+4/K)/Wd;[lo,hi]=spanOf(a,b,s)}
      let bl=Infinity,bh=-Infinity;const n=Math.max(2000,Math.ceil(s.fr(a,b)*400));for(let q=0;q<=n;q++){const v=s.val(a+(b-a)*q/n);bl=Math.min(bl,v);bh=Math.max(bh,v)}
      e=Math.max(e,Math.abs(lo-bl),Math.abs(hi-bh))}}
  return e}
