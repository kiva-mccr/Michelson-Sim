/* ---------- shared exact maths for rendering ----------
   Pixel footprint: each displayed pixel averages the pattern over a 2-D Gaussian footprint (sd PIXSD px). A fringe at the pixel
   pitch (1 cycle/px, which samples to a flat tone and shows as ghost ring centres) keeps e^{-2π²·PIXSD²} of its contrast:
   0.7% at 0.5 px. At 0.4 px it kept 4.2%, which was visible as moiré.
   With the OPD linearised across the pixel, delta ~ N(dm, tau^2), tau = PIXSD*|grad delta|*pixel, and for a term e^{-a delta^2}cos(b delta):
   <e^{-a d^2} cos(b d)> = q^{-1/2} exp(-(a dm^2 + b^2 tau^2/2)/q) cos(b dm/q),  q = 1 + 2 a tau^2   (closed form, Gaussian integral). */
const PIXSD=0.5;
const avgTerm=(ka,kb,dm,t2)=>{const q=1+2*ka*t2;return Math.exp(-(ka*dm*dm+0.5*kb*kb*t2)/q)*Math.cos(kb*dm/q)/Math.sqrt(q)};
function xyzAt(dm,t2,SL){let X=0,Y=0,Z=0;for(const o of SL){const v=0.5*o.p*(1+avgTerm(o.ka,o.kb,dm,t2));X+=v*o.X[0];Y+=v*o.X[1];Z+=v*o.X[2]}return[X,Y,Z]}
const hueOf=xyz=>norm(desat(toLin(xyz)));
const GL=new Float32Array(4097);for(let i=0;i<=4096;i++)GL[i]=255*gam(i/4096);
const enc=v=>GL[v<=0?0:v>=1?4096:(v*4096+0.5)|0];

/* ---------- anti-aliased range plot ----------
   Each device-pixel column is split into K = 8 sub-columns. Each sub-column contributes the exact min–max span of the signal over
   its own slice (from samples fine enough to resolve every fringe, or ½(1 ± max|γ|) once a slice holds a whole fringe),
   drawn at least 1.25 px tall, with 1/K coverage and fractional coverage at its ends (shown with a 0.45 display gamma, like scope persistence). Summing coverage is a box filter:
   proper anti-aliasing, so fringes near the pixel pitch blend into an even tone instead of beating into moiré.
   A small horizontal Gaussian (sd 0.7 px) then suppresses the box filter's own side-lobes. */
function spanOf(t0,t1,dAt,g,smax){const fr=Math.abs(dAt(t1)-dAt(t0))*smax;let lo=1,hi=0;  /* g = gammaOf(cs) */
  if(fr>=1){for(let q=0;q<=4;q++){const m=g.mag(dAt(t0+(t1-t0)*q/4));lo=Math.min(lo,0.5*(1-m));hi=Math.max(hi,0.5*(1+m))}}
  else{const k=Math.max(2,Math.ceil(16*fr)+1);for(let q=0;q<=k;q++){const v=0.5*(1+g.re(dAt(t0+(t1-t0)*q/k)));lo=Math.min(lo,v);hi=Math.max(hi,v)}}SPAN2[0]=lo;SPAN2[1]=hi;return SPAN2}
const SPAN2=[0,0];
/* buffers are reused between calls, one set per target canvas; only the rows a column (or its filter neighbours) touched are visited */
/* Sub-columns per pixel: always 8, moving or at rest. Never adapt this to the frame time: dense fringes look very different at
   2 and at 8 sub-columns (a solid band against the true crowding at ½(1 ± |γ|)), so switching between them made the plots flicker
   while dragging (fixed after MS-11). */
const DPK=8;
function densityPlot(ctx,x0,y0,Wd,Hd,dAt,cs,colourAt){const K=DPK,
  B=ctx.__dp&&ctx.__dp.Wd===Wd&&ctx.__dp.Hd===Hd?ctx.__dp:(ctx.__dp={Wd,Hd,img:ctx.createImageData(Wd,Hd),C:new Float32Array(Wd*Hd),r0:new Int32Array(Wd),r1:new Int32Array(Wd),off:document.createElement('canvas')});
  const img=B.img,D=img.data,C=B.C,r0=B.r0,r1=B.r1,cols=[],smax=Math.max(...cs.map(c=>c.s)),g=gammaOf(cs),MINH=1.25*(window.devicePixelRatio||1);
  D.fill(0);C.fill(0);
  for(let px=0;px<Wd;px++){const base=px*Hd;let c0=Hd,c1=-1;
    for(let k=0;k<K;k++){const[lo,hi]=spanOf((px+k/K)/Wd,(px+(k+1)/K)/Wd,dAt,g,smax);let ya=(1-hi)*(Hd-1),yb=(1-lo)*(Hd-1);
      if(yb-ya<MINH){const m=(ya+yb)/2;ya=m-MINH/2;yb=m+MINH/2}
      const ja=Math.max(0,Math.floor(ya)),jb=Math.min(Hd-1,Math.ceil(yb));if(ja<c0)c0=ja;if(jb>c1)c1=jb;
      for(let yy=ja;yy<=jb;yy++){const o=Math.min(yy+1,yb)-Math.max(yy,ya);if(o>0)C[base+yy]+=o/K}}
    r0[px]=c0;r1[px]=c1;cols.push(colourAt((px+0.5)/Wd))}
  /* horizontal Gaussian low-pass (sd 0.7 px) on top of the box filter removes the box filter's sinc side-lobes, which are what still beat into moiré */
  const KW=[0.0097,0.205,0.5706,0.205,0.0097];
  for(let px=0;px<Wd;px++){const c=cols[px];let ja=Hd,jb=-1;for(let q=Math.max(0,px-2);q<=Math.min(Wd-1,px+2);q++){if(r0[q]<ja)ja=r0[q];if(r1[q]>jb)jb=r1[q]}
    for(let yy=ja;yy<=jb;yy++){let v=0;for(let t=-2;t<=2;t++){const q=px+t;if(q>=0&&q<Wd)v+=KW[t+2]*C[q*Hd+yy]}if(v<=0.002)continue;
      const a=Math.pow(Math.min(1,v),0.45),o=4*(yy*Wd+px);D[o]=c[0];D[o+1]=c[1];D[o+2]=c[2];D[o+3]=255*a}}
  const off=B.off;if(off.width!==Wd||off.height!==Hd){off.width=Wd;off.height=Hd}off.getContext('2d').putImageData(img,0,0);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(off,x0,y0);ctx.restore()}
const rgb8=c=>c.map(v=>enc(v)|0);
let _probe=null;function cssRGB(v){const c=CSSC.get('rgb'+v);if(c)return c;if(!_probe){_probe=document.createElement('span');_probe.style.display='none';document.body.appendChild(_probe)}_probe.style.color=`var(${v})`;const r=getComputedStyle(_probe).color.match(/\d+/g).slice(0,3).map(Number);CSSC.set('rgb'+v,r);return r}

/* ---------- interferogram (canvas trace coloured by perceived colour) ---------- */
/* The trace and its envelope depend only on the spectrum, the range and the plot size, not on d, so they are cached:
   moving the mirror only redraws the δ₀ marker. */
let ifgKey='',ifgEnv='';
function renderIfg(){
  const svg=$('ifg'),cv=$('ifgC'),[W,H]=box(svg);if(!W)return;
  const dpr=window.devicePixelRatio||1,key=JSON.stringify([act().map(c=>[c.s,c.a,c.f]),RANGE(),W,H,dpr]),fresh=key!==ifgKey;ifgKey=key;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const R=RANGE(),pl=46,pr=10,pt=10,pb=42,x=d=>pl+(d+R)/(2*R)*(W-pl-pr),y=v=>pt+(1-v)*(H-pt-pb),mute=css('--mute');
  if(fresh){g.clearRect(0,0,W,H);g.fillStyle='#05070f';g.fillRect(pl,pt,W-pl-pr,H-pt-pb)}
  let h='';for(const v of [0,0.5,1])h+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff" stroke-opacity="${v?0.12:0.3}"/><text x="${pl-6}" y="${y(v)+4}" font-size="12" fill="${mute}" text-anchor="end">${v}</text>`;
  for(const t of [-R,-R/2,0,R/2,R])h+=`<text x="${x(t)}" y="${H-pb+16}" font-size="12" fill="${mute}" text-anchor="${t===-R?'start':t===R?'end':'middle'}">${F(t,3)}</text>`;
  h+=`<text x="${(pl+W-pr)/2}" y="${H-4}" font-size="12" fill="${mute}" text-anchor="middle">δ (µm)</text><text transform="translate(12 ${(pt+H-pb)/2}) rotate(-90)" font-size="12" fill="${mute}" text-anchor="middle">I(δ) / I_tot</text>`;
  const cs=act();
  if(cs.length){const SL=sublines(),PW=Math.round(W-pl-pr),col=2*R/PW,smax=Math.max(...cs.map(c=>c.s));
    if(fresh){let up='',lo='';
    for(let p=0;p<=PW;p+=2){const d=-R+col*p,[re,im]=gamma(d,cs),m=Math.hypot(re,im),X=x(d).toFixed(1);up+=(up?'L':'M')+X+' '+y(0.5*(1+m)).toFixed(1);lo+=(lo?'L':'M')+X+' '+y(0.5*(1-m)).toFixed(1)}
    ifgEnv=`<path d="${up}" fill="none" stroke="#e0115f" stroke-width="1.8"/><path d="${lo}" fill="none" stroke="#e0115f" stroke-width="1.8"/>`;
    const dpr=window.devicePixelRatio||1,x0=Math.round(pl*dpr),y0=Math.round(pt*dpr),Wd=Math.round((W-pl-pr)*dpr),Hd=Math.round((H-pt-pb)*dpr),t2=(PIXSD*col)**2;
      densityPlot(g,x0,y0,Wd,Hd,t=>-R+2*R*t,cs,t=>rgb8(hueOf(xyzAt(-R+2*R*t,t2,SL))))}
    if($('envOn').checked)h+=ifgEnv;
    const d0=D0();if(Math.abs(d0)<=R)h+=`<line x1="${x(d0)}" x2="${x(d0)}" y1="${pt}" y2="${y(0)}" stroke="#ff4d8d" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${x(d0)+4}" y="${pt+28}" font-size="12" fill="#ff4d8d">δ₀</text>`}
  svg.innerHTML=h}

