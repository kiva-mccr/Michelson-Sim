/* ---------- table ---------- */
function table(){$('nComp').textContent=comps.length;
  if($('tb').contains(document.activeElement)&&document.activeElement.type==='number')return;
  $('tb').innerHTML=comps.length?comps.map((c,i)=>`<tr class="${c.on?'':'off'}"${i===sel?' style="background:var(--panel)"':''}><td><label class="tog"><input type="checkbox" data-tog="${i}" ${c.on?'checked':''} aria-label="Component on"><span class="sw" style="background:${col(c)}"></span>${c.f?'Gaussian':'Line'}</label></td>
    <td><input type="number" step="0.1" data-i="${i}" data-k="l" value="${(1000/c.s).toFixed(2)}" aria-label="wavelength"></td>
    <td><input type="number" step="0.05" min="0.03" max="1" data-i="${i}" data-k="a" value="${c.a.toFixed(2)}" aria-label="height"></td>
    <td><input type="number" step="0.1" min="0" data-i="${i}" data-k="f" value="${(1000*c.f/(c.s*c.s)).toFixed(2)}" aria-label="FWHM"></td>
    <td><button data-del="${i}" aria-label="Remove" style="min-height:30px">Remove</button></td></tr>`).join(''):`<tr><td colspan="5" class="empty">No components yet. Click the spectrum or pick a preset.</td></tr>`}
$('tb').addEventListener('change',e=>{const t=e.target;
  if(t.dataset.tog!==undefined){comps[+t.dataset.tog].on=t.checked;update(false);return}
  const i=+t.dataset.i,c=comps[i],v=parseFloat(t.value);if(!c||!isFinite(v))return;
  if(t.dataset.k==='l')c.s=clamp(1000/Math.max(v,1),SMIN,SMAX);if(t.dataset.k==='a')c.a=clamp(v,0.03,1);if(t.dataset.k==='f')c.f=clamp(v*c.s*c.s/1000,0,0.9);t.blur();update(false)});
$('tb').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b){comps.splice(+b.dataset.del,1);sel=-1;update(false)}});

/* ---------- auto ranges ---------- */
const nice=x=>{if(!(x>0))return 1;const e=Math.pow(10,Math.floor(Math.log10(x))),m=x/e;return e*(m<=1?1:m<=2?2:m<=5?5:10)};
/* Where the envelope |gamma| levels out. Lines never decay (infinite coherence), so they only set a constant floor or a periodic beat.
   The decaying part is the Gaussians: |gamma(delta)| differs from its long-run value by at most sum_g I_g e^{-(pi w_g delta)^2} / I_tot.
   The envelope has levelled out once that bound drops below 2% of the total power. With no Gaussians (or negligible ones):
   two or more lines -> one beat period 1/(smallest spacing); a single line -> about 30 fringes. */
function settleOPD(){const cs=act();if(!cs.length)return 40;const A=cs.reduce((t,c)=>t+P(c),0),gs=cs.filter(c=>c.f),tgt=0.02*A;
  const bound=d=>gs.reduce((t,c)=>t+P(c)*Math.exp(-((Math.PI*wOf(c)*d)**2)),0);
  const smean=cs.reduce((t,c)=>t+c.s*P(c),0)/A;
  if(gs.length&&bound(0)>tgt){let lo=0,hi=1;while(bound(hi)>tgt&&hi<1e5)hi*=2;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(bound(m)>tgt)lo=m;else hi=m}
    return Math.min(Math.max(hi,3/smean),10000)}
  const ls=cs.filter(c=>!c.f).map(c=>c.s).sort((a,b)=>a-b);let dmin=Infinity;
  for(let i=1;i<ls.length;i++)if(ls[i]-ls[i-1]>1e-6)dmin=Math.min(dmin,ls[i]-ls[i-1]);
  return Math.min(isFinite(dmin)?1/dmin:30/smean,10000)}
const DMAX=()=>+$('d').max;
const autoMax=()=>Math.min(5000,nice(1.2*settleOPD()/2));
/* the slider moves the mirror by d; the optical path difference is twice that, so both are shown */
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
  const stop=()=>{if(pan){pan=null;update(false)}};box.addEventListener('pointerup',stop);box.addEventListener('pointercancel',stop)}
/* interferogram auto-fit: 8% past the settle point, rounded up to 2 significant figures (tight, unlike the mirror's 1–2–5 range) */
const up2=x=>{const e=Math.pow(10,Math.floor(Math.log10(x))-1);return Math.ceil(x/e-1e-9)*e};
const autoR=()=>clamp(up2(1.08*settleOPD()),0.5,5000);
let stT=0;function settle(){clearTimeout(stT);stT=setTimeout(()=>update(false),200)}
$('ifgBox').addEventListener('wheel',e=>{e.preventDefault();const R=RANGE(),nR=clamp(R*Math.pow(1.0015,e.deltaY),0.5,2*autoR());
  $('rAuto').checked=false;Rman=nR;update(true);settle()},{passive:false});

/* ---------- presets ---------- */
document.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{stopPlay();comps=presets[b.dataset.p].map(c=>({...c,on:true}));sel=-1;
  $('d').value=0;fitRange(true);$('d').value=b.dataset.p==='na'?145:0.4*DMAX();update(false)}));
$('clear').addEventListener('click',()=>{comps=[];sel=-1;update(false)});
['d','fov','tx','ty'].forEach(k=>{$(k).addEventListener('input',()=>{if(k==='d')stopPlay();update(true)});$(k).addEventListener('change',()=>update(false))});
$('verBtn').addEventListener('click',()=>{$('verAt').textContent='Running…';setTimeout(verify,30)});
$('tReset').addEventListener('click',()=>{$('tx').value=0;$('ty').value=0;update(false)});

/* ---------- direct manipulation: drag on the pattern for tilt / field of view, mirror rail for d ---------- */
const ov=$('ringOv'),TMAXU=500;let rdrag=null;
/* field of view: 0.5–85° (the ring maps tanθ linearly, so 85° is near the lens limit) */
const setFov=v=>widen('fov',+clamp(v,0.5,85).toPrecision(4),false);
const setTilt=(x,y)=>{widen('tx',Math.round(x*10)/10,true);widen('ty',Math.round(y*10)/10,true)};
function ovGeom(e){const r=ov.getBoundingClientRect(),R=r.width/2,x=e.clientX-r.left-R,y=e.clientY-r.top-R;return{R,x,y,rr:Math.hypot(x,y)}}
const onRim=g=>Math.abs(g.rr-g.R)<Math.max(9,0.06*g.R);
/* tilt handle: the white dot sits at (αx, αy) scaled so 500 µrad = 92% of the radius, and follows the cursor 1:1 while dragged.
   Within SNAP px of the centre it locks to 0, 0. At 0, 0 it is hidden until the pointer is over the pattern. */
const DOTK=0.92,SNAP=10;let ovHover=null;
const dotPos=c=>{const ax=+$('tx').value,ay=+$('ty').value,f=c*DOTK/TMAXU;let x=ax*f,y=-ay*f;const L=Math.hypot(x,y),mx=c*DOTK;if(L>mx){x*=mx/L;y*=mx/L}return[c+x,c+y]};
function renderOv(){const s=ov.clientWidth;if(!s)return;const c=s/2,[ex,ey]=dotPos(c),L=Math.hypot(ex-c,ey-c),zero=L<0.5;
  const hx=c+(c-3)*Math.SQRT1_2,hy=c+(c-3)*Math.SQRT1_2,drag=rdrag&&rdrag.m!=='rim';
  const showDot=!zero||!!ovHover||drag;  /* at 0, 0 the dot shows whenever the pointer is over the pattern */
  const big=drag||(ovHover&&Math.hypot(ovHover[0]-ex,ovHover[1]-ey)<14);
  const tx=+$('tx').value,ty=+$('ty').value,tn=Math.hypot(tx,ty),nx=tn?tx/tn:1,ny=tn?ty/tn:0;  /* dashed profile cut through the centre along the tilt direction */
  /* the cut line is a persistent element, only moved when the tilt direction or the size changes, never repainted with the pattern */
  if(!ov.querySelector('#ovCut')){ov.innerHTML='<line id="ovCut" stroke="#fff" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 5" pointer-events="none"/><g id="ovDyn"></g>'}
  const cut=ov.querySelector('#ovCut'),key=[c,nx,ny].join();if(cut.dataset.k!==key){cut.dataset.k=key;cut.setAttribute('x1',c-nx*c);cut.setAttribute('y1',c+ny*c);cut.setAttribute('x2',c+nx*c);cut.setAttribute('y2',c-ny*c)}
  ov.querySelector('#ovDyn').innerHTML=`<circle cx="${c}" cy="${c}" r="${c-3}" fill="none" stroke="#fff" stroke-opacity="${rdrag&&rdrag.m==='rim'?.9:.25}" stroke-width="2" stroke-dasharray="5 6"/>`+
   (drag?`<circle cx="${c}" cy="${c}" r="${SNAP}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-dasharray="2 2"/>`:'')+
   (L>1.5?`<line x1="${c}" y1="${c}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round"/>`:'')+
   (showDot?`<circle cx="${ex}" cy="${ey}" r="${big?7:5.5}" fill="#fff" fill-opacity="${zero&&!drag?.75:.95}" stroke="#000" stroke-opacity=".35"/>`:'')+
   `<circle cx="${hx}" cy="${hy}" r="6" fill="${css('--acc')}" stroke="#fff" stroke-width="1.5"/>`}
function tiltFromDot(c,x,y,fine){/* x,y: dot position relative to the centre, in px */
  if(!fine&&Math.hypot(x,y)<SNAP){setTilt(0,0);return}const f=TMAXU/(c*DOTK);setTilt(x*f,-y*f)}
ov.addEventListener('pointermove',e=>{const g=ovGeom(e);ovHover=[g.x+g.R,g.y+g.R];
  if(!rdrag){const[dx,dy]=dotPos(g.R),onDot=Math.hypot(ovHover[0]-dx,ovHover[1]-dy)<14;ov.style.cursor=onDot?'grab':onRim(g)?'nwse-resize':'default';renderOv();return}
  if(rdrag.m==='rim')setFov(rdrag.f0*Math.max(g.rr,4)/Math.max(rdrag.r0,4));
  else tiltFromDot(g.R,g.x,g.y,e.shiftKey);update(true)});
ov.addEventListener('pointerleave',()=>{ovHover=null;if(!rdrag)renderOv()});
ov.addEventListener('pointerdown',e=>{const g=ovGeom(e);if(g.rr>g.R+4)return;
  const[dx,dy]=dotPos(g.R),onDot=Math.hypot(g.x+g.R-dx,g.y+g.R-dy)<14;
  const m=onDot?'dot':onRim(g)?'rim':null;if(!m)return;
  e.preventDefault();ov.setPointerCapture(e.pointerId);rdrag={m,r0:g.rr,f0:+$('fov').value,cx:e.clientX,cy:e.clientY,px0:dx-g.R,py0:dy-g.R};if(onDot)ov.style.cursor='grabbing';renderOv()});
const rend=()=>{if(rdrag){const wasDot=rdrag.m==='dot';rdrag=null;ov.style.cursor=wasDot?'grab':'default';renderOv();update(false)}};ov.addEventListener('pointerup',rend);ov.addEventListener('pointercancel',rend);
ov.addEventListener('dblclick',()=>{$('tx').value=0;$('ty').value=0;update(false)});
/* scrolling on the pattern zooms: scroll up narrows the field of view (zoom in), scroll down widens it */
let wT=0;ov.addEventListener('wheel',e=>{e.preventDefault();setFov(+$('fov').value*Math.pow(1.0015,e.deltaY));update(true);clearTimeout(wT);wT=setTimeout(()=>update(false),200)},{passive:false});
ov.addEventListener('keydown',e=>{const st=e.shiftKey?1:10,k={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,st],ArrowDown:[0,-st]}[e.key];
  if(k){e.preventDefault();setTilt(+$('tx').value+k[0],+$('ty').value+k[1]);update(false)}
  if(e.key==='+'||e.key==='-'){e.preventDefault();setFov(+$('fov').value*(e.key==='+'?1.1:1/1.1));update(false)}});
/* mirror rail: a ruler spanning the current range ±m; drag (or click) the carriage, scroll to rescale the range */
const rail=$('rail'),RPAD=16;let raildrag=false;
function renderRail(){const W=rail.clientWidth,H=rail.clientHeight;if(!W)return;const m=DMAX(),d=+$('d').value,X=v=>RPAD+(v+m)/(2*m)*(W-2*RPAD),st=nice(2*m/(W<360?4:8)),mute=css('--mute'),acc=css('--acc'),ink=css('--ink');
  let h=`<rect x="${RPAD}" y="10" width="${W-2*RPAD}" height="6" rx="3" fill="${mute}" fill-opacity=".18"/>`;const dec=Math.max(0,-Math.floor(Math.log10(st)+1e-9));
  for(let v=Math.ceil(-m/st)*st;v<=m+1e-9*m;v+=st){h+=`<line x1="${X(v)}" x2="${X(v)}" y1="7" y2="19" stroke="${mute}" stroke-opacity=".6"/><text x="${X(v)}" y="33" font-size="10.5" fill="${mute}" text-anchor="middle">${v.toFixed(dec)}</text>`}
  for(let v=Math.ceil(-m/(st/5))*(st/5);v<=m+1e-9*m;v+=st/5)h+=`<line x1="${X(v)}" x2="${X(v)}" y1="11" y2="15" stroke="${mute}" stroke-opacity=".35"/>`;
  h+=`<line x1="${X(0)}" x2="${X(d)}" y1="13" y2="13" stroke="${acc}" stroke-width="3"/><rect x="${X(d)-6}" y="2" width="12" height="22" rx="3" fill="${acc}" stroke="${ink}" stroke-opacity=".35"/>`;
  rail.innerHTML=h}
const railV=e=>{const r=rail.getBoundingClientRect(),m=DMAX();return clamp(((e.clientX-r.left-RPAD)/(r.width-2*RPAD))*2*m-m,-m,m)};
rail.addEventListener('pointerdown',e=>{stopPlay();raildrag=true;rail.setPointerCapture(e.pointerId);e.preventDefault();$('d').value=railV(e);update(true)});
rail.addEventListener('pointermove',e=>{if(raildrag){$('d').value=railV(e);update(true)}});
const railEnd=()=>{if(raildrag){raildrag=false;update(false)}};rail.addEventListener('pointerup',railEnd);rail.addEventListener('pointercancel',railEnd);
function setRange(m){const d=$('d');m=clamp(m,0.01,5000);d.min=-m;d.max=m;d.step='any';d.value=clamp(+d.value,-m,m)}
let rwT=0;rail.addEventListener('wheel',e=>{e.preventDefault();$('dAuto').checked=false;setRange(DMAX()*Math.pow(1.0015,e.deltaY));update(true);clearTimeout(rwT);rwT=setTimeout(()=>update(false),200)},{passive:false});
rail.addEventListener('keydown',e=>{const m=DMAX(),st=(e.shiftKey?0.001:0.01)*m,k={ArrowLeft:-st,ArrowRight:st,ArrowDown:-st,ArrowUp:st}[e.key];if(k){e.preventDefault();stopPlay();$('d').value=clamp(+$('d').value+k,-m,m);update(false)}});
$('dFit').addEventListener('click',()=>{fitRange(true);update(true)});
$('dAuto').addEventListener('change',()=>{if($('dAuto').checked)fitRange(false);update(false)});
/* ---------- Michelson schematic: M₂ moves with d and turns with the tilt; the detector cone opens with θmax; drag M₂ to move it ---------- */
const msvg=$('miniSvg'),MZ=160,MS=34;
function renderMini(){const X=MZ+(+$('d').value)/DMAX()*MS,ax=+$('tx').value,ay=+$('ty').value,ang=clamp(ax*0.02,-12,12),f=clamp(+$('fov').value,0,60)*Math.PI/180,L=16,w=Math.tan(f)*L*1.6;
  $('m2r').setAttribute('x',X-4);$('m2r').setAttribute('transform',`rotate(${ang} ${X} 110)`);$('m2h').setAttribute('x',X-14);$('m2t').setAttribute('x',X);$('mBeam').setAttribute('x2',X-4);$('dArr').setAttribute('x2',X-4);
  $('fovCone').setAttribute('d',`M100 170 L${100-w} ${170+L} L${100+w} ${170+L}Z`);
  $('m2t').textContent=(ax||ay)?`M₂ tilt (${F(ax,3)}, ${F(ay,3)}) µrad`:'M₂ ⇆'}
let mdrag=false;
const mset=e=>{const pt=msvg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(msvg.getScreenCTM().inverse());$('d').value=clamp((p.x-MZ)/MS,-1,1)*DMAX();update(true)};
$('m2').addEventListener('pointerdown',e=>{stopPlay();mdrag=true;msvg.setPointerCapture(e.pointerId);e.preventDefault()});
msvg.addEventListener('pointermove',e=>{if(mdrag)mset(e)});
const mend=()=>{if(mdrag){mdrag=false;update(false)}};msvg.addEventListener('pointerup',mend);msvg.addEventListener('pointercancel',mend);
/* sweep: one full pass from -max to +max takes 8 s, then it turns around */
let playing=false,pdir=1,plast=0;
function stopPlay(){if(!playing)return;playing=false;$('dPlay').setAttribute('aria-pressed','false');$('dPlay').textContent='▶ Sweep';update(false)}
function tick(t){if(!playing)return;const dt=plast?Math.min(0.1,(t-plast)/1000):0;plast=t;const m=DMAX();let v=+$('d').value+pdir*dt*2*m/8;
  if(v>=m){v=m;pdir=-1}if(v<=-m){v=-m;pdir=1}$('d').value=v;update(true);requestAnimationFrame(tick)}
$('dPlay').addEventListener('click',()=>{if(playing){stopPlay();return}playing=true;plast=0;$('dPlay').setAttribute('aria-pressed','true');$('dPlay').textContent='❚❚ Pause';requestAnimationFrame(tick)});

/* read the active renderer's pixels back as I/I_tot, for the verification table */
async function ringReadback(){if(Ibuf)return;const A=act().reduce((t,c)=>t+P(c),0)||1;let a=null;
  if(RB.active==='webgpu')a=await gpuRead(RB.gpu);else if(RB.active==='webgl2')a=glRead(RB.gl);if(!a)return;
  Ibuf=new Float32Array(a.length/4);for(let k=0;k<Ibuf.length;k++)Ibuf[k]=a[4*k+3]/A}
$('rendSel').addEventListener('change',e=>{RB.pref=e.target.value;try{localStorage.setItem('mich-renderer',RB.pref)}catch(_){}pickBackend('chosen')});
probeBackends();

/* ---------- type-in values: click any readout's number to enter an exact value ---------- */
const editing=new Set();
function editable(id,get,set){const el=$(id);el.classList.add('edit');el.title='Click to type an exact value';el.tabIndex=0;el.setAttribute('role','button');
  const open=()=>{if(editing.has(id))return;editing.add(id);const inp=document.createElement('input');inp.type='number';inp.step='any';inp.value=String(get());inp.className='vin';inp.setAttribute('aria-label','Exact value');
    el.textContent='';el.appendChild(inp);inp.focus();inp.select();let done=false;
    const fin=ok=>{if(done)return;done=true;editing.delete(id);const v=parseFloat(inp.value);if(ok&&isFinite(v))set(v);el.textContent='';update(false)};
    inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();fin(true)}else if(e.key==='Escape'){e.preventDefault();fin(false)}});
    inp.addEventListener('blur',()=>fin(true));inp.addEventListener('click',e=>e.stopPropagation())};
  el.addEventListener('click',e=>{e.preventDefault();open()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})}
const setD=v=>{stopPlay();const d=$('d'),m=Math.max(+d.max,Math.abs(v));if(m>+d.max){const n=nice(m);d.min=-n;d.max=n}d.step='any';d.value=v};
const widen=(id,v,sym)=>{const e=$(id);e.step='any';if(sym){const m=Math.ceil(Math.abs(v));if(m>+e.max){e.max=m;e.min=-m}}else{if(v>+e.max)e.max=Math.ceil(v);if(v<+e.min)e.min=v}e.value=v};
editable('dV',()=>+$('d').value,v=>setD(v));
editable('dV0',()=>D0(),v=>setD(v/2));
editable('dRV',()=>DMAX(),v=>{if(!(Math.abs(v)>0))return;$('dAuto').checked=false;setRange(Math.abs(v))});
editable('rV',()=>RANGE(),v=>{Rman=clamp(Math.abs(v),0.1,2*autoR());$('rAuto').checked=false});
editable('fV',()=>+$('fov').value,v=>widen('fov',clamp(v,0.01,85),false));
editable('txV',()=>+$('tx').value,v=>widen('tx',v,true));
editable('tyV',()=>+$('ty').value,v=>widen('ty',v,true));

/* ---------- ring sizing: the canvas fills the largest square that fits its panel ---------- */
function fitRing(){const b=$('ringBox'),s=Math.max(120,Math.floor(Math.min(b.clientWidth,b.clientHeight||b.clientWidth)));
  $('ringWrap').style.width=$('ringWrap').style.height=s+'px';const gpu=RB.active==='webgpu'||RB.active==='webgl2',n=clamp(Math.round(s*(window.devicePixelRatio||1)),200,gpu?1024:480);
  for(const c of [ring,$('ringGL'),$('ringGPU')])if(c.width!==n){c.width=n;c.height=n}}  /* GPUs render at full device resolution (up to 1024²); the CPU caps at 480² */

/* ---------- each panel's equations and notes open as a centred modal window ---------- */
document.querySelectorAll('.eqbtn').forEach(b=>b.addEventListener('click',()=>openDlg(b.dataset.dlg)));

/* ---------- dialogs and citation links ---------- */
const openDlg=id=>{const d=$(id);if(!d.open)d.showModal()};
$('openMethod').addEventListener('click',()=>openDlg('dlgMethod'));
$('openSrc').addEventListener('click',()=>openDlg('dlgSrc'));
$('openComp').addEventListener('click',()=>{const d=$('dlgComp');d.open?d.close():d.show()});
document.querySelectorAll('dialog [data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog.dlg').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#s"]');if(!a)return;const li=document.getElementById(a.getAttribute('href').slice(1));if(!li||!li.closest('#dlgSrc'))return;
  e.preventDefault();openDlg('dlgSrc');document.querySelectorAll('ol.src li.hl').forEach(x=>x.classList.remove('hl'));li.classList.add('hl');li.scrollIntoView({block:'center'})});

/* ---------- loop ---------- */
let raf=0,eqT=0;
const setTxt=(id,t)=>{if(!editing.has(id))$(id).textContent=t};
function draw(){raf=0;/* d and δ0 to the nearest nm (3 decimals in µm), with a fixed-width minus slot so the row never reflows */
  const nm3=v=>{const t=Math.abs(v).toFixed(3);return (v<0&&+t?'−':'\u2007')+t+' µm'};setTxt('dV',nm3(+$('d').value));setTxt('dV0',nm3(D0()));setTxt('dRV',`${F(DMAX(),3)} µm`);
  setTxt('rV',`±${F(RANGE(),4)} µm`);{const[a,b]=outWin(),dg=b-a<5?2:b-a<50?1:0;$('oV').textContent=`${a.toFixed(dg)}–${b.toFixed(dg)} nm`}setTxt('fV',`${F(+$('fov').value,4)}°`);setTxt('txV',`${F(+$('tx').value,4)} µrad`);setTxt('tyV',`${F(+$('ty').value,4)} µrad`);
  const t0=performance.now();LQ.ms=0;fitRing();renderSpec();renderOut();renderIfg();renderRingIfNeeded();renderOv();renderRail();renderMini();
  if(ringLive)LQ.other=0.7*LQ.other+0.3*Math.max(0,performance.now()-t0-LQ.ms)}
function runEq(){eqT=0;eqs();table();save()}
function update(live){ringLive=!!live;if(!live){if($('dAuto').checked)fitRange(false);if($('rAuto').checked)fitR()}
  if(!raf)raf=requestAnimationFrame(draw);
  if(live){if(!eqT)eqT=setTimeout(runEq,350)}else{clearTimeout(eqT);eqT=setTimeout(runEq,40)}  /* let the released frame paint first */
  $('verAt').textContent='Settings changed since the last run. Press Run checks to verify the current state.'}
const ro=new ResizeObserver(()=>{if(!raf)raf=requestAnimationFrame(draw)});window.addEventListener('resize',()=>measureFrame());
let lastK=EQK();window.addEventListener('resize',()=>{if(EQK()!==lastK){lastK=EQK();eqs()}});
['specBox','profBox','ringBox','railBox'].forEach(k=>ro.observe($(k)));document.querySelectorAll('.plot').forEach(p=>ro.observe(p));
const mo=new MutationObserver(()=>update(false));mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
const waitMJ=setInterval(()=>{if(window.MathJax&&MathJax.typesetPromise){clearInterval(waitMJ);eqs()}},200);
update(false);
