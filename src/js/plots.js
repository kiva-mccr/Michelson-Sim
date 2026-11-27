/* ---------- spectrum axes ---------- */
/* spectral axes are linear in wavelength (nm); the physics is still computed in wavenumber σ = 1000/λ (µm⁻¹) */
function axes(W,H,pl,pr,pt,pb,ylab,l0=LMIN,l1=LMAX,ym=1){
  /* wavelength runs right-to-left: red (long λ) on the left, blue on the right */
  const xl=l=>pl+(l1-l)/(l1-l0)*(W-pl-pr),x=s=>xl(1000/s),y=v=>pt+(1-Math.min(v,1.05*ym)/ym)*(H-pt-pb),mute=css('--mute');
  let h='';for(let px=pl;px<W-pr;px+=2)h+=`<rect x="${px}" y="${H-pb+4}" width="2.4" height="7" fill="${barHex(l1-(px+1-pl)/(W-pl-pr)*(l1-l0))}"/>`;
  const stp=nice((l1-l0)/(W<420?3:6)),dec=Math.max(0,-Math.floor(Math.log10(stp)+1e-9));
  for(let l=Math.ceil(l0/stp)*stp;l<=l1+1e-9;l+=stp)h+=`<text x="${xl(l)}" y="${H-pb+24}" font-size="11" fill="${mute}" text-anchor="middle">${l.toFixed(dec)}</text>`;
  h+=`<text x="${W-pr}" y="${H-3}" font-size="11" fill="${mute}" text-anchor="end">λ (nm)</text>`;
  for(let v=0;v<=ym+1e-9;v+=0.5)h+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="${mute}" stroke-opacity="${v?0.15:0.5}"/><text x="${pl-6}" y="${y(v)+4}" font-size="11" fill="${mute}" text-anchor="end">${+v.toFixed(2)}</text>`;
  if(ylab)h+=`<text transform="translate(11 ${(pt+H-pb)/2}) rotate(-90)" font-size="11" fill="${mute}" text-anchor="middle">${ylab}</text>`;
  return {x,xl,y,h,mute}}
function gpath(x,y,W,pl,pr,f,l0=LMIN,l1=LMAX){let p='';const n=Math.max(200,Math.round((W-pl-pr)*2));for(let i=0;i<=n;i++){const s=1000/(l0+(l1-l0)*i/n);p+=(i?'L':'M')+x(s).toFixed(1)+' '+y(f(s)).toFixed(1)}return p}

/* ---------- editor ---------- */
const spec=$('spec');let G={},specKey='';
function renderSpec(){
  const W=spec.clientWidth,H=spec.clientHeight;if(!W)return;
  /* the editor depends only on the components, the selection, drag state, size and theme colours, not on d: skip identical redraws */
  const key=JSON.stringify([comps,sel,!!drag,W,H,css('--fr'),css('--ink'),css('--mute')]);if(key===specKey)return;specKey=key;
  const pl=40,pr=12,pt=20,pb=36,ym=calcYM(),A=axes(W,H,pl,pr,pt,pb,'Spectral density (rel.)',LMIN,LMAX,ym),{x,y}=A;G={x,y,W,H,pl,pr,pt,pb,ym};
  let h=A.h;const ts=trueShape();
  if(ts)h+=`<path d="${gpath(x,y,W,pl,pr,ts)}" fill="none" stroke="${css('--fr')}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  comps.forEach((c,i)=>{const cc=col(c),X=x(c.s),Y=y(c.a),on=i===sel,op=c.on?1:0.35;
    h+=`<g opacity="${op}">`;
    if(c.f){h+=`<path d="${gpath(x,y,W,pl,pr,s=>shape(c,s))}L${x(SMIN)} ${y(0)}L${x(SMAX)} ${y(0)}Z" fill="${cc}" fill-opacity=".18" stroke="${cc}" stroke-width="1.5"/>`;
      /* width bar between the half-maximum points; an end that falls outside the plotted 380–800 nm window is clipped and loses its handle */
      const xa=x(c.s+c.f/2),xb=c.s-c.f/2>0?x(c.s-c.f/2):Infinity,yh=y(c.a/2),cl=v=>clamp(v,pl,W-pr);
      h+=`<line x1="${cl(xa)}" x2="${cl(xb)}" y1="${yh}" y2="${yh}" stroke="${cc}" stroke-width="1.2"/>`;
      for(const sx of [xa,xb].filter(v=>v>=pl&&v<=W-pr))h+=`<rect x="${sx-2}" y="${yh-6}" width="4" height="12" rx="1.5" fill="${cc}" stroke="${css('--ink')}" stroke-width=".8"/><rect x="${sx-9}" y="${yh-11}" width="18" height="22" fill="transparent" style="cursor:ew-resize"/>`}
    h+=`<line x1="${X}" x2="${X}" y1="${y(0)}" y2="${Y}" stroke="${cc}" stroke-width="${c.f?1.5:3}" ${c.f?'stroke-dasharray="4 3"':''}/>`;
    h+=`<line x1="${X}" x2="${X}" y1="${y(0)}" y2="${Y}" stroke="transparent" stroke-width="18" style="cursor:ew-resize"/>`;
    h+=`<circle cx="${X}" cy="${Y}" r="${on?6.5:5}" fill="${cc}" stroke="${on?'#e0115f':css('--ink')}" stroke-width="${on?2.5:1.2}" style="cursor:move"/>`;
    const lab=(1000/c.s).toFixed(1),side=Y-13<pt;
    h+=side?`<text x="${X+(X>W-60?-10:10)}" y="${Y+4}" font-size="11" fill="${A.mute}" text-anchor="${X>W-60?'end':'start'}">${lab}</text>`:`<text x="${X}" y="${Y-10}" font-size="11" fill="${A.mute}" text-anchor="middle">${lab}</text>`;
    h+='</g>'});
  if(!comps.length)h+=`<text x="${W/2}" y="${H/2}" font-size="15" fill="${A.mute}" text-anchor="middle">Click anywhere here to place a wavelength</text>`;
  spec.innerHTML=h}
const toS=px=>1000/clamp(LMAX-(px-G.pl)/(G.W-G.pl-G.pr)*(LMAX-LMIN),LMIN*0.6,LMAX*1.6),toA=py=>(1-(py-G.pt)/(G.H-G.pt-G.pb))*G.ym;
function hit(px,py){
  for(let i=comps.length-1;i>=0;i--){const c=comps[i];if(Math.hypot(px-G.x(c.s),py-G.y(c.a))<11)return{i,mode:'move'}}
  for(let i=comps.length-1;i>=0;i--){const c=comps[i];if(!c.f)continue;const xa=G.x(c.s+c.f/2),xb=c.s-c.f/2>0?G.x(c.s-c.f/2):Infinity,yh=G.y(c.a/2);
    if(Math.abs(py-yh)<11&&(Math.abs(px-xa)<9||Math.abs(px-xb)<9))return{i,mode:'width'}}
  for(let i=comps.length-1;i>=0;i--){const c=comps[i],X=G.x(c.s);if(Math.abs(px-X)<8&&py>G.y(c.a)&&py<G.y(0)+4)return{i,mode:'width'}}
  for(let i=comps.length-1;i>=0;i--){const c=comps[i];if(c.f&&Math.abs(py-G.y(shape(c,toS(px))))<8)return{i,mode:'width'}}
  return null}
const pos=e=>{const r=spec.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
spec.addEventListener('pointerdown',e=>{const[px,py]=pos(e);let h=hit(px,py);
  if(!h){if(py<G.pt-4||py>G.y(0)+2)return;comps.push({s:clamp(toS(px),SMIN,SMAX),a:clamp(toA(py),0.03,1),f:0,on:true});h={i:comps.length-1,mode:'move'}}
  sel=h.i;drag=h;spec.setPointerCapture(e.pointerId);e.preventDefault();update(true)});
spec.addEventListener('pointermove',e=>{if(!drag)return;const[px,py]=pos(e),c=comps[drag.i];
  if(drag.mode==='move'){c.s=clamp(toS(px),SMIN,SMAX);c.a=clamp(toA(py),0.03,1)}
  else{const f=2*Math.abs(toS(px)-c.s);c.f=f<0.008?0:Math.min(f,0.9)}
  update(true)});
const end=()=>{if(drag){drag=null;update(false)}};
spec.addEventListener('pointerup',end);spec.addEventListener('pointercancel',end);
spec.addEventListener('dblclick',e=>{const[px,py]=pos(e);const h=hit(px,py);if(h&&h.mode==='move'){comps.splice(h.i,1);sel=-1;update(false)}});
document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&sel>=0&&!(e.target instanceof HTMLInputElement)){comps.splice(sel,1);sel=-1;update(false);e.preventDefault()}});

/* ---------- interfered spectrum ----------
   Its wavelength window auto-crops to the switched-on components (Gaussians to ±3w, plus 12% padding, at least 2 nm wide).
   Scroll zooms about the cursor, drag pans; either turns Auto-fit off. */
let OG={},outMan=null;
function outAutoWin(){const cs=act();if(!cs.length)return[LMIN,LMAX];let lo=1e9,hi=-1e9;
  for(const c of cs){const w=wOf(c),a=1000/(c.s+3*w),b=1000/Math.max(c.s-3*w,0.2);lo=Math.min(lo,a);hi=Math.max(hi,b)}
  let pad=Math.max(0.12*(hi-lo),1),l0=lo-pad,l1=hi+pad;if(l1-l0<2){const m=(l0+l1)/2;l0=m-1;l1=m+1}
  return[Math.max(LMIN,l0),Math.min(LMAX,l1)]}
const outWin=()=>(!$('oAuto').checked&&outMan)?outMan:outAutoWin();
function setOutMan(a,b){const span=clamp(b-a,0.05,LMAX-LMIN);let m=(a+b)/2;a=m-span/2;b=m+span/2;if(a<LMIN){b+=LMIN-a;a=LMIN}if(b>LMAX){a-=b-LMAX;b=LMAX}
  outMan=[Math.max(LMIN,a),Math.min(LMAX,b)];$('oAuto').checked=false}
/* the axes, the sample grid and S(σ) do not depend on d, so they are cached; moving the mirror only re-evaluates T(σ;δ₀) */
let outC={key:''};
function renderOut(){
  const svg=$('out'),W=svg.clientWidth,H=svg.clientHeight;if(!W)return;
  const pl=40,pr=10,pt=8,pb=36,[l0,l1]=outWin(),fr=css('--fr'),fill=css('--fill'),ts=trueShape();OG={W,pl,pr,l0,l1};
  const key=JSON.stringify([act().map(c=>[c.s,c.a,c.f]),l0,l1,W,H,YM,fr,css('--mute')]);
  if(key!==outC.key){const A=axes(W,H,pl,pr,pt,pb,'S_out (rel.)',l0,l1,YM),{x,y}=A,n=Math.max(200,Math.round((W-pl-pr)*2)),S=new Float64Array(n+1),TS=ts?new Float64Array(n+1):null,XS=[];
    /* the same grid and strings as gpath() */
    for(let i=0;i<=n;i++){const s=1000/(l0+(l1-l0)*i/n);S[i]=s;XS.push((i?'L':'M')+x(s).toFixed(1)+' ');if(ts)TS[i]=ts(s)}
    let tp='';if(ts)for(let i=0;i<=n;i++)tp+=XS[i]+y(TS[i]).toFixed(1);
    outC={key,A,S,TS,XS,n,tp}}
  const {A,S,TS,XS,n,tp}=outC,{x,y}=A;
  let h=A.h;const d0=D0(),T=s=>0.5*(1+Math.cos(2*Math.PI*s*d0));
  let pT='',pP='';for(let i=0;i<=n;i++){const t=T(S[i]);pT+=XS[i]+y(t).toFixed(1);if(TS)pP+=XS[i]+y(TS[i]*t).toFixed(1)}
  h+=`<path d="${pT}" fill="none" stroke="${A.mute}" stroke-opacity=".55" stroke-width="1"/>`;
  if(ts){h+=`<path d="${tp}" fill="none" stroke="${fr}" stroke-dasharray="4 3"/>`;
    h+=`<path d="${pP}L${x(1000/l1)} ${y(0)}L${x(1000/l0)} ${y(0)}Z" fill="${fill}" fill-opacity=".85" stroke="${fr}" stroke-width="1.5"/>`}
  for(const c of act())if(!c.f){const lc=1000/c.s;if(lc<l0||lc>l1)continue;const v=c.a*T(c.s);
    h+=`<line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(c.a)}" stroke="${fr}" stroke-dasharray="3 3"/><line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(v)}" stroke="${col(c)}" stroke-width="3"/><circle cx="${x(c.s)}" cy="${y(v)}" r="3.5" fill="${col(c)}"/>`}
  svg.innerHTML=h}

/* ---------- shared exact maths for rendering ----------
   Pixel footprint: each displayed pixel averages the pattern over a 2-D Gaussian footprint (sd PIXSD px).
   With the OPD linearised across the pixel, delta ~ N(dm, tau^2), tau = PIXSD*|grad delta|*pixel, and for a term e^{-a delta^2}cos(b delta):
   <e^{-a d^2} cos(b d)> = q^{-1/2} exp(-(a dm^2 + b^2 tau^2/2)/q) cos(b dm/q),  q = 1 + 2 a tau^2   (closed form, Gaussian integral). */
const PIXSD=0.4;
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
function spanOf(t0,t1,dAt,cs,smax){const fr=Math.abs(dAt(t1)-dAt(t0))*smax;let lo=1,hi=0;
  if(fr>=1){for(let q=0;q<=4;q++){const[re,im]=gamma(dAt(t0+(t1-t0)*q/4),cs),m=Math.hypot(re,im);lo=Math.min(lo,0.5*(1-m));hi=Math.max(hi,0.5*(1+m))}}
  else{const k=Math.max(2,Math.ceil(16*fr)+1);for(let q=0;q<=k;q++){const v=0.5*(1+gamma(dAt(t0+(t1-t0)*q/k),cs)[0]);lo=Math.min(lo,v);hi=Math.max(hi,v)}}return[lo,hi]}
/* buffers are reused between calls, one set per target canvas; only the rows a column (or its filter neighbours) touched are visited */
/* Sub-columns per pixel: 8 at rest. While moving, the ring has priority: the plots stay at 2 until the ring preview is at full
   resolution, then use only the time the frame has to spare. From the profile's measured cost per sub-column c and the last
   frame's main-thread time (LQ.tot), they take the most of 2, 3, 4, 6, 8 whose extra cost fits what is left of the frame budget
   (stepping down when the frame runs over), capped at a fifth of the budget; going up needs a 15% margin so it doesn't flicker.
   Since they only take spare time, they never push the ring back to a coarser preview. */
const DPQ={k:2,c:0},DPK=[2,3,4,6,8],dpK=()=>ringLive?DPQ.k:8;
function dpRecord(K,ms){const c=ms/K;DPQ.c=DPQ.c?0.7*DPQ.c+0.3*c:c;if(LQ.last>1){DPQ.k=2;return}const F=FR(),slack=F-LQ.tot;
  DPQ.k=[...DPK].reverse().find(k=>DPQ.c*k<=0.2*F&&DPQ.c*(k-K)<=(k>K?0.85*slack:slack))||2}
function densityPlot(ctx,x0,y0,Wd,Hd,dAt,cs,colourAt){const K=dpK(),
  B=ctx.__dp&&ctx.__dp.Wd===Wd&&ctx.__dp.Hd===Hd?ctx.__dp:(ctx.__dp={Wd,Hd,img:ctx.createImageData(Wd,Hd),C:new Float32Array(Wd*Hd),r0:new Int32Array(Wd),r1:new Int32Array(Wd),off:document.createElement('canvas')});
  const img=B.img,D=img.data,C=B.C,r0=B.r0,r1=B.r1,cols=[],smax=Math.max(...cs.map(c=>c.s)),MINH=1.25*(window.devicePixelRatio||1);
  D.fill(0);C.fill(0);
  for(let px=0;px<Wd;px++){const base=px*Hd;let c0=Hd,c1=-1;
    for(let k=0;k<K;k++){const[lo,hi]=spanOf((px+k/K)/Wd,(px+(k+1)/K)/Wd,dAt,cs,smax);let ya=(1-hi)*(Hd-1),yb=(1-lo)*(Hd-1);
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
let _probe=null;function cssRGB(v){if(!_probe){_probe=document.createElement('span');_probe.style.display='none';document.body.appendChild(_probe)}_probe.style.color=`var(${v})`;return getComputedStyle(_probe).color.match(/\d+/g).slice(0,3).map(Number)}

/* ---------- interferogram (canvas trace coloured by perceived colour) ---------- */
/* The trace and its envelope depend only on the spectrum, the range and the plot size, not on d, so they are cached:
   moving the mirror only redraws the δ₀ marker. */
let ifgKey='',ifgEnv='';
function renderIfg(){
  const svg=$('ifg'),cv=$('ifgC'),W=svg.clientWidth,H=svg.clientHeight;if(!W)return;
  const dpr=window.devicePixelRatio||1,key=JSON.stringify([act().map(c=>[c.s,c.a,c.f]),RANGE(),W,H,dpr,dpK()]),fresh=key!==ifgKey;ifgKey=key;
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

