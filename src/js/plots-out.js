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
/* The axes do not depend on d, so they are cached (outC); moving the mirror redraws the canvas (the traces and the fill) and the line stems.
   Every curve goes through the shared 1-D helper (plot1d.js), so fringes finer than a pixel fill the band they cover instead of
   aliasing into a false pattern (MS-25: it used to sample 2 points per pixel). The fill under S_out is its exact footprint average. */
let outC={key:''};
const OUTPAD=[40,10,8,36];
function outTraces(){const[l0,l1]=outWin(),ts=trueShape(),d0=D0(),mute=cssRGB('--mute'),fr=cssRGB('--fr'),tr=[{sig:specSig(()=>1,l0,l1,YM,d0,true),col:()=>mute,alpha:.55,w:1}];
  if(ts)tr.push({sig:specSig(ts,l0,l1,YM,0,false),col:()=>fr,dash:[4,3],w:1},{sig:specSig(ts,l0,l1,YM,d0,true),col:()=>fr});return tr}
/* footprint average of S_gauss(σ)·T(σ;δ₀) over a Gaussian of sd sg (in σ) about σc, in closed form: for each Gaussian a·e^{−(σ−σn)²/w²},
   with q = w² + 2sg² and p = 1/w² + 1/(2sg²), μ = (σn/w² + σc/(2sg²))/p:
   ⟨S·T⟩ = Σ ½·a·(w/√q)·e^{−(σc−σn)²/q}·[1 + e^{−π²δ₀²/p}·cos 2πδ₀μ] */
function avgST(cs,sc,sg,d0){let v=0;for(const c of cs){if(!c.f)continue;const w=wOf(c),w2=w*w,s2=2*sg*sg,q=w2+s2,p=1/w2+1/s2,mu=(c.s/w2+sc/s2)/p;
  v+=0.5*c.a*w/Math.sqrt(q)*Math.exp(-((sc-c.s)**2)/q)*(1+Math.exp(-((Math.PI*d0)**2)/p)*Math.cos(2*Math.PI*d0*mu))}return v}
/* the fill's top edge at n+1 points across the plot area (t = i/n), each the footprint average over sd PIXSD of a device pixel (Wd of them) */
function outFill(n,Wd){const[l0,l1]=outWin(),cs=act(),d0=D0(),v=new Float64Array(n+1);
  for(let i=0;i<=n;i++){const l=l1-(l1-l0)*i/n,s=1000/l;v[i]=avgST(cs,s,1000/(l*l)*(l1-l0)*PIXSD/Wd,d0)/YM}return v}
function outVec(){const[W,H]=box($('out')),[pl,pr,pt,pb]=OUTPAD,X=t=>pl+t*(W-pl-pr),Y=v=>pt+(1-v)*(H-pt-pb),n=Math.round((W-pl-pr)*2),f=outFill(n,(W-pl-pr)*DPR());
  let fp='';if(trueShape()){for(let i=0;i<=n;i++)fp+=(i?'L':'M')+X(i/n).toFixed(2)+' '+Y(f[i]).toFixed(2);fp=`<path d="${fp}L${X(1)} ${Y(0)}L${X(0)} ${Y(0)}Z" fill="${rgbOf('--fill')}" fill-opacity=".85"/>`}
  return fp+tracesSVG(W,H,pl,pr,pt,pb,outTraces())}
function renderOut(){
  const svg=$('out'),[W,H]=box(svg);if(!W)return;
  const[pl,pr,pt,pb]=OUTPAD,[l0,l1]=outWin(),fr=css('--fr'),ts=trueShape(),cs=act();OG={W,pl,pr,l0,l1};
  const key=JSON.stringify([l0,l1,W,H,YM,css('--mute')]);if(key!==outC.key)outC={key,A:axes(W,H,pl,pr,pt,pb,'S_out (rel.)',l0,l1,YM)};
  const{A}=outC,{x,y}=A,T=s=>0.5*(1+Math.cos(2*Math.PI*s*D0()));
  const P=plotCanvas($('outCv'),W,H,pl,pr,pt,pb);
  if(ts){const f=outFill(P.Wd,P.Wd),g=P.g;g.beginPath();g.moveTo(P.x0,P.y0+P.Hd);for(let i=0;i<=P.Wd;i++)g.lineTo(P.x0+i,P.y0+(1-f[i])*P.Hd);g.lineTo(P.x0+P.Wd,P.y0+P.Hd);g.closePath();
    g.fillStyle=`rgb(${cssRGB('--fill')})`;g.globalAlpha=.85;g.fill();g.globalAlpha=1}
  /* the dashed S(σ) does not depend on d: drawn once per spectrum, window, size and scale into a layer of its own, then copied */
  const tr=outTraces(),tk=JSON.stringify([key,act().map(c=>[c.s,c.a,c.f]),DPR(),fr]);
  if(tr.length>1&&outC.tk!==tk){const L=outC.ts||(outC.ts=document.createElement('canvas'));L.width=P.g.canvas.width;L.height=P.g.canvas.height;
    drawTraces({...P,g:L.getContext('2d')},[tr[1]]);outC.tk=tk}
  drawTraces(P,[tr[0]]);if(tr.length>1){P.g.drawImage(outC.ts,0,0);drawTraces(P,[tr[2]])}
  /* lines: a stem from 0 to a·T(σn) (a delta line has no width, so its value is exact at any zoom) */
  let h='';for(const c of cs.filter(c=>!c.f&&1000/c.s>=l0&&1000/c.s<=l1)){const v=c.a*T(c.s);
    h+=`<line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(c.a)}" stroke="${fr}" stroke-dasharray="3 3"/><line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(v)}" stroke="${col(c)}" stroke-width="3"/><circle cx="${x(c.s)}" cy="${y(v)}" r="3.5" fill="${col(c)}"/>`}
  /* the axes stay in the DOM while only d moves; the stems go in the last group */
  if(outC.dom!==svg){svg.innerHTML=A.h+'<g></g>';outC.dom=svg}svg.lastChild.innerHTML=h}
