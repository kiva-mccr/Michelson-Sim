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
  const [W,H]=box(spec);if(!W)return;
  /* the editor depends only on the components, the selection, drag state, size and theme colours, not on d: skip identical redraws */
  const key=JSON.stringify([comps,sel,!!drag,W,H,DPR(),css('--fr'),css('--ink'),css('--mute')]);if(key===specKey)return;specKey=key;selBar();
  const pl=40,pr=12,pt=20,pb=36,ym=calcYM(),A=axes(W,H,pl,pr,pt,pb,'Spectral density (rel.)',LMIN,LMAX,ym),{x,y}=A;G={x,y,W,H,pl,pr,pt,pb,ym};
  let h=A.h;
  comps.forEach((c,i)=>{const cc=col(c),X=x(c.s),Y=y(c.a),on=i===sel,op=c.on?1:0.35;
    h+=`<g opacity="${op}">`;
    if(c.f){h+=`<path d="${gpath(x,y,W,pl,pr,s=>shape(c,s))}L${x(SMIN)} ${y(0)}L${x(SMAX)} ${y(0)}Z" fill="${cc}" fill-opacity=".18" stroke="none"/>`;
      /* width bar between the half-maximum points; an end that falls outside the plotted 380–800 nm window is clipped and loses its handle */
      const xa=x(c.s+c.f/2),xb=c.s-c.f/2>0?x(c.s-c.f/2):Infinity,yh=y(c.a/2),cl=v=>clamp(v,pl,W-pr);
      h+=`<line x1="${cl(xa)}" x2="${cl(xb)}" y1="${yh}" y2="${yh}" stroke="${cc}" stroke-width="1.2"/>`;
      for(const sx of [xa,xb].filter(v=>v>=pl&&v<=W-pr))h+=`<rect x="${sx-HW}" y="${yh-HH}" width="${2*HW}" height="${2*HH}" rx="${HW-.5}" fill="${cc}" stroke="${css('--ink')}" stroke-width=".8"/><rect x="${sx-9}" y="${yh-11}" width="18" height="22" fill="transparent" style="cursor:ew-resize"/>`}
    h+=`<line x1="${X}" x2="${X}" y1="${y(0)}" y2="${Y}" stroke="${cc}" stroke-width="${c.f?1.5:3}" ${c.f?'stroke-dasharray="4 3"':''}/>`;
    h+=`<line x1="${X}" x2="${X}" y1="${y(0)}" y2="${Y}" stroke="transparent" stroke-width="18" style="cursor:ew-resize"/>`;
    h+=`<circle cx="${X}" cy="${Y}" r="${(on?6.5:5)*SDOT}" fill="${cc}" stroke="${on?'#e0115f':css('--ink')}" stroke-width="${on?2.5:1.2}" style="cursor:move"/>`;
    const lab=(1000/c.s).toFixed(1),lo=TOUCH?15:10,side=Y-lo-3<pt;
    h+=side?`<text x="${X+(X>W-60?-lo:lo)}" y="${Y+4}" font-size="11" fill="${A.mute}" text-anchor="${X>W-60?'end':'start'}">${lab}</text>`:`<text x="${X}" y="${Y-lo}" font-size="11" fill="${A.mute}" text-anchor="middle">${lab}</text>`;
    h+='</g>'});
  if(!comps.length)h+=`<text x="${W/2}" y="${H/2}" font-size="15" fill="${A.mute}" text-anchor="middle">Click anywhere here to place a wavelength</text>`;
  spec.innerHTML=h;drawTraces(plotCanvas($('specC'),W,H,pl,pr,pt,pb),specTraces())}
/* the editor's curves (the shared 1-D helper): the combined Gaussian shape dashed, then each Gaussian in its colour */
function specTraces(){const ts=trueShape(),tr=[];if(ts){const fr=cssRGB('--fr');tr.push({sig:specSig(ts,LMIN,LMAX,G.ym,0,false),col:()=>fr,dash:[4,3]})}
  for(const c of comps)if(c.f){const cc=hexRGB(col(c));tr.push({sig:specSig(s=>shape(c,s),LMIN,LMAX,G.ym,0,false),col:()=>cc,alpha:c.on?1:0.35})}return tr}
/* on touch devices the handles are drawn larger (TOUCH) */
const SDOT=TOUCH?1.45:1,HW=TOUCH?3.5:2,HH=TOUCH?10:6;
const toS=px=>1000/clamp(LMAX-(px-G.pl)/(G.W-G.pl-G.pr)*(LMAX-LMIN),LMIN*0.6,LMAX*1.6),toA=py=>(1-(py-G.pt)/(G.H-G.pt-G.pb))*G.ym;
/* the component under (px,py): a dot, then a width handle, then a line's stem or a Gaussian's curve. k scales the tolerances (fat(e): 2 for a finger).
   Among dots within reach the nearest wins, so enlarged finger targets still pick the right one of two close components */
function hit(px,py,k=1){
  let best=null,bd=Infinity;comps.forEach((c,i)=>{const r=Math.hypot(px-G.x(c.s),py-G.y(c.a));if(r<11*k&&r<=bd){bd=r;best={i,mode:'move'}}});if(best)return best;
  for(let i=comps.length-1;i>=0;i--){const c=comps[i];if(!c.f)continue;const xa=G.x(c.s+c.f/2),xb=c.s-c.f/2>0?G.x(c.s-c.f/2):Infinity,yh=G.y(c.a/2);
    if(Math.abs(py-yh)<11*k&&(Math.abs(px-xa)<9*k||Math.abs(px-xb)<9*k))return{i,mode:'width'}}
  for(let i=comps.length-1;i>=0;i--){const c=comps[i],X=G.x(c.s);if(Math.abs(px-X)<8*k&&py>G.y(c.a)&&py<G.y(0)+4)return{i,mode:'width'}}
  for(let i=comps.length-1;i>=0;i--){const c=comps[i];if(c.f&&Math.abs(py-G.y(shape(c,toS(px))))<8*k)return{i,mode:'width'}}
  return null}
const pos=e=>{const r=spec.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
/* a mouse click on empty plot adds a line and drags it at once; a finger only adds one on a tap (lifted without moving),
   so a finger that lands on empty plot by mistake, or is held (a long-press), adds nothing. touch-action:none (style.css) keeps the page from taking the drag */
let tap=null;
spec.addEventListener('pointerdown',e=>{if(e.button>0)return;  /* a right-click opens the copy menu (ui-copy.js) */
  const[px,py]=pos(e);let h=hit(px,py,fat(e));
  if(!h){if(py<G.pt-4||py>G.y(0)+2)return;
    if(e.pointerType==='touch'){if(!drag)tap={id:e.pointerId,px,py,t:performance.now()};return}
    comps.push({s:clamp(toS(px),SMIN,SMAX),a:clamp(toA(py),0.03,1),f:0,on:true});h={i:comps.length-1,mode:'move'}}
  if(drag)return;sel=h.i;drag={...h,id:e.pointerId};spec.setPointerCapture(e.pointerId);e.preventDefault();update(true)});
spec.addEventListener('pointermove',e=>{if(tap&&tap.id===e.pointerId){const[px,py]=pos(e);if(Math.hypot(px-tap.px,py-tap.py)>10)tap=null;return}
  if(!drag||drag.id!==e.pointerId)return;const[px,py]=pos(e),c=comps[drag.i];
  if(drag.mode==='move'){c.s=clamp(toS(px),SMIN,SMAX);c.a=clamp(toA(py),0.03,1)}
  else{const f=2*Math.abs(toS(px)-c.s);c.f=f<0.008?0:Math.min(f,0.9)}
  update(true)});
const end=e=>{if(tap&&tap.id===e.pointerId){if(e.type==='pointerup'&&performance.now()-tap.t<500){comps.push({s:clamp(toS(tap.px),SMIN,SMAX),a:clamp(toA(tap.py),0.03,1),f:0,on:true});sel=comps.length-1;update(false)}tap=null}
  if(drag&&drag.id===e.pointerId){drag=null;update(false)}};
spec.addEventListener('pointerup',end);spec.addEventListener('pointercancel',end);
spec.addEventListener('dblclick',e=>{const[px,py]=pos(e);const h=hit(px,py);if(h&&h.mode==='move')delComp(h.i)});
const delComp=i=>{comps.splice(i,1);sel=-1;update(false)};
document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&sel>=0&&!(e.target instanceof HTMLInputElement)){delComp(sel);e.preventDefault()}});

