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
  const svg=$('out'),[W,H]=box(svg);if(!W)return;
  const pl=40,pr=10,pt=8,pb=36,[l0,l1]=outWin(),fr=css('--fr'),fill=css('--fill'),ts=trueShape();OG={W,pl,pr,l0,l1};
  const key=JSON.stringify([act().map(c=>[c.s,c.a,c.f]),l0,l1,W,H,YM,fr,fill,css('--mute')]);
  if(key!==outC.key){const A=axes(W,H,pl,pr,pt,pb,'S_out (rel.)',l0,l1,YM),{x,y}=A,n=Math.max(200,Math.round((W-pl-pr)*2)),S=new Float64Array(n+1),TS=ts?new Float64Array(n+1):null,XS=[];
    /* the same grid and strings as gpath() */
    for(let i=0;i<=n;i++){const s=1000/(l0+(l1-l0)*i/n);S[i]=s;XS.push((i?'L':'M')+x(s).toFixed(1)+' ');if(ts)TS[i]=ts(s)}
    let tp='';if(ts)for(let i=0;i<=n;i++)tp+=XS[i]+y(TS[i]).toFixed(1);
    outC={key,A,S,TS,XS,n,tp}}
  const {A,S,TS,XS,n,tp}=outC,{x,y}=A;
  const d0=D0(),T=s=>0.5*(1+Math.cos(2*Math.PI*s*d0));
  let pT='',pP='';for(let i=0;i<=n;i++){const t=T(S[i]);pT+=XS[i]+y(t).toFixed(1);if(TS)pP+=XS[i]+y(TS[i]*t).toFixed(1)}
  const pPd=`${pP}L${x(1000/l1)} ${y(0)}L${x(1000/l0)} ${y(0)}Z`,lines=act().filter(c=>!c.f&&1000/c.s>=l0&&1000/c.s<=l1);
  /* while only d moves, the axes and S(σ) stay in the DOM and only the d-dependent attributes are updated (the same markup as a rebuild) */
  const ch=svg.children,ns=outC.ns;
  if(outC.dom===svg&&ch.length===ns+1+(ts?2:0)+3*lines.length){ch[ns].setAttribute('d',pT);if(ts)ch[ns+2].setAttribute('d',pPd);
    lines.forEach((c,j)=>{const v=y(c.a*T(c.s)),o=ns+1+(ts?2:0)+3*j;ch[o+1].setAttribute('y2',v);ch[o+2].setAttribute('cy',v)});return}
  let h=`<path d="${pT}" fill="none" stroke="${A.mute}" stroke-opacity=".55" stroke-width="1"/>`;
  if(ts){h+=`<path d="${tp}" fill="none" stroke="${fr}" stroke-dasharray="4 3"/>`;
    h+=`<path d="${pPd}" fill="${fill}" fill-opacity=".85" stroke="${fr}" stroke-width="1.5"/>`}
  for(const c of lines){const v=c.a*T(c.s);
    h+=`<line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(c.a)}" stroke="${fr}" stroke-dasharray="3 3"/><line x1="${x(c.s)}" x2="${x(c.s)}" y1="${y(0)}" y2="${y(v)}" stroke="${col(c)}" stroke-width="3"/><circle cx="${x(c.s)}" cy="${y(v)}" r="3.5" fill="${col(c)}"/>`}
  svg.innerHTML=A.h;outC.ns=svg.children.length;outC.dom=svg;svg.insertAdjacentHTML('beforeend',h)}

