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

const rgb8=c=>c.map(v=>enc(v)|0);
let _probe=null;function cssRGB(v){const c=CSSC.get('rgb'+v);if(c)return c;if(!_probe){_probe=document.createElement('span');_probe.style.display='none';document.body.appendChild(_probe)}_probe.style.color=`var(${v})`;const r=getComputedStyle(_probe).color.match(/\d+/g).slice(0,3).map(Number);CSSC.set('rgb'+v,r);return r}

/* ---------- interferogram (canvas trace coloured by perceived colour) ---------- */
/* The trace and its envelope depend only on the spectrum, the window and the plot size, not on d, so they are cached:
   moving the mirror inside the window only redraws the δ₀ marker. */
let ifgKey='',ifgEnv='';
/* The window [C − R, C + R] follows δ₀ (MS-26): C moves only as far as it must to keep δ₀ inside, like a chart recorder, so
   at the end of the window the marker stays on the edge and the trace scrolls under it, every value still at its true δ.
   A new half-range R (zoom, auto-fit, preset) starts again from the centred window, shifted only if δ₀ is outside it.
   IG keeps the drawn geometry for the marker drag. */
let IFGC=0,ifgR=0,IG={};
function ifgWin(){const R=RANGE(),d0=D0();if(R!==ifgR){ifgR=R;IFGC=0}IFGC=clamp(IFGC,d0-R,d0+R);return[IFGC-R,IFGC+R]}
/* the trace: I(δ), coloured by the perceived colour of each column (its footprint average, t2 = its OPD variance; 0 in the SVG gradient) */
function ifgTraces(t2){const cs=act(),[lo,hi]=ifgWin(),SL=sublines(),dAt=t=>lo+(hi-lo)*t;return[{sig:fringeSig(dAt,cs),col:t=>rgb8(hueOf(xyzAt(dAt(t),t2,SL))),vary:true,w:0.6,id:'ifgHue'}]}
function renderIfg(){
  const svg=$('ifg'),cv=$('ifgC'),[W,H]=box(svg);if(!W)return;
  const dpr=DPR(),[lo,hi]=ifgWin(),key=JSON.stringify([act().map(c=>[c.s,c.a,c.f]),lo,hi,W,H,dpr]),fresh=key!==ifgKey;ifgKey=key;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const R=(hi-lo)/2,c0=lo+R,pl=46,pr=10,pt=10,pb=42,x=d=>pl+(d-lo)/(hi-lo)*(W-pl-pr),y=v=>pt+(1-v)*(H-pt-pb),mute=css('--mute');
  if(fresh){g.clearRect(0,0,W,H);g.fillStyle='#05070f';g.fillRect(pl,pt,W-pl-pr,H-pt-pb)}
  let h='';for(const v of [0,0.5,1])h+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff" stroke-opacity="${v?0.12:0.3}"/><text x="${pl-6}" y="${y(v)+4}" font-size="12" fill="${mute}" text-anchor="end">${v}</text>`;
  IG={W,pl,pr,lo,hi};
  [lo,c0-R/2,c0,c0+R/2,hi].forEach((t,i)=>h+=`<text x="${x(t)}" y="${H-pb+16}" font-size="12" fill="${mute}" text-anchor="${['start','middle','middle','middle','end'][i]}">${F(t,3)}</text>`);
  h+=`<text x="${(pl+W-pr)/2}" y="${H-4}" font-size="12" fill="${mute}" text-anchor="middle">δ (µm)</text><text transform="translate(12 ${(pt+H-pb)/2}) rotate(-90)" font-size="12" fill="${mute}" text-anchor="middle">I(δ) / I_tot</text>`;
  const cs=act();
  if(cs.length){const SL=sublines(),PW=Math.round(W-pl-pr),dpp=2*R/PW;  /* OPD per CSS px */
    if(fresh){let up='',dn='';
    for(let p=0;p<=PW;p+=2){const d=lo+dpp*p,[re,im]=gamma(d,cs),m=Math.hypot(re,im),X=x(d).toFixed(1);up+=(up?'L':'M')+X+' '+y(0.5*(1+m)).toFixed(1);dn+=(dn?'L':'M')+X+' '+y(0.5*(1-m)).toFixed(1)}
    ifgEnv=`<path d="${up}" fill="none" stroke="#e0115f" stroke-width="1.8"/><path d="${dn}" fill="none" stroke="#e0115f" stroke-width="1.8"/>`;
    const t2=(PIXSD*dpp)**2;
      drawTraces({g,x0:Math.round(pl*dpr),y0:Math.round(pt*dpr),Wd:Math.round((W-pl-pr)*dpr),Hd:Math.round((H-pt-pb)*dpr)},ifgTraces(t2))}
    if($('envOn').checked)h+=ifgEnv;
    /* the δ₀ marker, always inside the window (ifgWin); a grip on top shows it can be dragged, the label flips left near the right edge */
    const X=x(D0()),gw=TOUCH?7:5,gh=TOUCH?16:11,lt=X>W-pr-24;
    h+=`<line x1="${X}" x2="${X}" y1="${pt}" y2="${y(0)}" stroke="#ff4d8d" stroke-dasharray="5 4" stroke-width="1.5"/><rect x="${X-gw}" y="${pt}" width="${2*gw}" height="${gh}" rx="2.5" fill="#ff4d8d"/><text x="${lt?X-gw-3:X+gw+3}" y="${pt+28}" font-size="12" fill="#ff4d8d" text-anchor="${lt?'end':'start'}">δ₀</text>`}
  svg.innerHTML=h}

