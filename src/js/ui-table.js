/* ---------- table ---------- */
function table(){$('nComp').textContent=comps.length;
  if($('tb').contains(document.activeElement)&&document.activeElement.type==='number')return;
  $('tb').innerHTML=comps.length?comps.map((c,i)=>`<tr class="${c.on?'':'off'}"${i===sel?' style="background:var(--panel)"':''}><td><label class="tog"><input type="checkbox" data-tog="${i}" ${c.on?'checked':''} aria-label="Component on"><span class="sw" style="background:${col(c)}"></span>${c.f?'Gaussian':'Line'}</label></td>
    <td><input type="number" step="0.1" data-i="${i}" data-k="l" value="${(1000/c.s).toFixed(2)}" aria-label="wavelength"></td>
    <td><input type="number" step="0.05" min="0.03" max="1" data-i="${i}" data-k="a" value="${c.a.toFixed(2)}" aria-label="height"></td>
    <td><input type="number" step="0.1" min="0" data-i="${i}" data-k="f" value="${fwNm(c).toFixed(2)}" aria-label="FWHM"></td>
    <td><button data-del="${i}" aria-label="Remove" style="min-height:30px">Remove</button></td></tr>`).join(''):`<tr><td colspan="5" class="empty">No components yet. Click the spectrum or pick a preset.</td></tr>`}
/* set one field of a component from a typed value: wavelength (nm), height, or FWHM (nm); shared by the table and the selection bar */
function setComp(c,k,v){if(!c||!isFinite(v))return;if(k==='l')c.s=clamp(1000/Math.max(v,1),SMIN,SMAX);if(k==='a')c.a=clamp(v,0.03,1);if(k==='f')c.f=clamp(v*c.s*c.s/1000,0,0.9)}
$('tb').addEventListener('change',e=>{const t=e.target;
  if(t.dataset.tog!==undefined){comps[+t.dataset.tog].on=t.checked;update(false);return}
  const c=comps[+t.dataset.i],v=parseFloat(t.value);if(!c||!isFinite(v))return;setComp(c,t.dataset.k,v);t.blur();update(false)});
$('tb').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b)delComp(+b.dataset.del)});
/* the selection bar under the editor (stacked layout and touch devices): the selected component's numbers, typed into like any readout, and Delete */
const fwNm=c=>1000*c.f/(c.s*c.s);
function selBar(){const c=comps[sel],b=$('selBar');b.hidden=!c;if(!c)return;$('sbSw').style.background=col(c);
  for(const[id,v]of[['sbL',(1000/c.s).toFixed(2)],['sbA',c.a.toFixed(2)],['sbF',c.f?fwNm(c).toFixed(2)+' nm':'line']])if(!editing.has(id))$(id).textContent=v}
editable('sbL',()=>+(1000/comps[sel].s).toFixed(2),v=>setComp(comps[sel],'l',v));
editable('sbA',()=>+comps[sel].a.toFixed(3),v=>setComp(comps[sel],'a',v));
editable('sbF',()=>+fwNm(comps[sel]).toFixed(2),v=>setComp(comps[sel],'f',v));
$('sbDel').addEventListener('click',()=>{if(sel>=0)delComp(sel)});

/* ---------- auto ranges ---------- */
const nice=x=>{if(!(x>0))return 1;const e=Math.pow(10,Math.floor(Math.log10(x))),m=x/e;return e*(m<=1?1:m<=2?2:m<=5?5:10)};
/* Where the envelope |gamma| levels out. Lines never decay (infinite coherence), so they only set a constant floor or a periodic beat.
   The decaying part is the Gaussians: |gamma(delta)| differs from its long-run value by at most sum_g I_g e^{-(pi w_g delta)^2} / I_tot.
   The envelope has levelled out once that bound drops below 2% of the total power. With no Gaussians (or negligible ones):
   two or more lines -> one beat period 1/(smallest spacing); a single line -> about 30 fringes. */
function settleOPD(){const cs=act();if(!cs.length)return 40;const A=Itot(cs),gs=cs.filter(c=>c.f),tgt=0.02*A;
  const bound=d=>gs.reduce((t,c)=>t+P(c)*Math.exp(-((Math.PI*wOf(c)*d)**2)),0);
  const smean=cs.reduce((t,c)=>t+c.s*P(c),0)/A;
  if(gs.length&&bound(0)>tgt){let lo=0,hi=1;while(bound(hi)>tgt&&hi<1e5)hi*=2;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(bound(m)>tgt)lo=m;else hi=m}
    return Math.min(Math.max(hi,3/smean),10000)}
  const ls=cs.filter(c=>!c.f).map(c=>c.s).sort((a,b)=>a-b);let dmin=Infinity;
  for(let i=1;i<ls.length;i++)if(ls[i]-ls[i-1]>1e-6)dmin=Math.min(dmin,ls[i]-ls[i-1]);
  return Math.min(isFinite(dmin)?1/dmin:30/smean,10000)}
const DMAX=()=>+$('d').max;
const autoMax=()=>Math.min(5000,nice(1.2*settleOPD()/2));
/* the mirror range ±m: the auto range, widened (unless forced) to keep the current d inside it */
function fitRange(force){const d=$('d'),cur=+d.value,a=autoMax(),m=force?a:Math.max(a,nice(Math.abs(cur)));
  d.min=-m;d.max=m;d.step='any';d.value=clamp(cur,-m,m)}
function fitR(){Rauto=autoR()}
$('rAuto').addEventListener('change',()=>update(false));
$('envOn').addEventListener('change',()=>update(false));
$('oAuto').addEventListener('change',()=>update(false));
{const box=$('outBox'),lAt=px=>OG.l1-(px-OG.pl)/(OG.W-OG.pl-OG.pr)*(OG.l1-OG.l0);let pan=null;
  box.addEventListener('wheel',e=>{e.preventDefault();const r=box.getBoundingClientRect(),c=lAt(e.clientX-r.left),f=Math.pow(1.0015,e.deltaY);setOutMan(c-(c-OG.l0)*f,c+(OG.l1-c)*f);update(true);settle()},{passive:false});
  box.addEventListener('pointerdown',e=>{pan={x:e.clientX,l0:OG.l0,l1:OG.l1};box.setPointerCapture(e.pointerId)});
  box.addEventListener('pointermove',e=>{if(!pan)return;const dl=(e.clientX-pan.x)/(OG.W-OG.pl-OG.pr)*(pan.l1-pan.l0);setOutMan(pan.l0+dl,pan.l1+dl);update(true)});
  const stop=()=>{if(pan){pan=null;update(false)}};box.addEventListener('pointerup',stop);box.addEventListener('pointercancel',stop);
  /* a pinch scales the current window (not OG, which lags until the next frame is drawn) about the point between the fingers */
  pinch(box,{start:()=>{pan=null},scale:(f,cx)=>{const[a,b]=outWin(),c=b-(cx-OG.pl)/(OG.W-OG.pl-OG.pr)*(b-a);setOutMan(c-(c-a)*f,c+(b-c)*f);update(true)},end:settle})}
/* interferogram auto-fit: 8% past the settle point, rounded up to 2 significant figures (tight, unlike the mirror's 1–2–5 range) */
const up2=x=>{const e=Math.pow(10,Math.floor(Math.log10(x))-1);return Math.ceil(x/e-1e-9)*e};
const autoR=()=>clamp(up2(1.08*settleOPD()),0.5,5000);
/* after a scroll: the at-rest frame once the wheel has been still for 200 ms */
let stT=0;function settle(){clearTimeout(stT);stT=setTimeout(()=>update(false),200)}
$('ifgBox').addEventListener('wheel',e=>{e.preventDefault();const R=RANGE(),nR=clamp(R*Math.pow(1.0015,e.deltaY),0.5,2*autoR());
  $('rAuto').checked=false;Rman=nR;update(true);settle()},{passive:false});
pinch($('ifgBox'),{scale:f=>{const R=RANGE();$('rAuto').checked=false;Rman=clamp(R*f,0.5,2*autoR());update(true)},end:settle});

/* ---------- presets ---------- */
document.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{stopPlay();comps=presets[b.dataset.p].map(c=>({...c,on:true}));sel=-1;
  $('d').value=0;fitRange(true);$('d').value=b.dataset.p==='na'?145:0.4*DMAX();update(false)}));
$('clear').addEventListener('click',()=>{comps=[];sel=-1;update(false)});
/* the state lives in hidden inputs; scripts (the tests) set them and send a change event */
['d','fov','tx','ty'].forEach(k=>$(k).addEventListener('change',()=>update(false)));
$('verBtn').addEventListener('click',()=>{$('verAt').textContent='Running…';setTimeout(verify,30)});
$('tReset').addEventListener('click',()=>glideTilt(0,0));

