/* mirror rail: a ruler spanning the current range ±m; drag (or click) the carriage, scroll to rescale the range */
const rail=$('rail'),RPAD=16;let raildrag=false;
function renderRail(){const [W]=box(rail);if(!W)return;const m=DMAX(),d=+$('d').value,X=v=>RPAD+(v+m)/(2*m)*(W-2*RPAD),st=nice(2*m/(W<360?4:8)),mute=css('--mute'),acc=css('--acc'),ink=css('--ink');
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
rail.addEventListener('wheel',e=>{e.preventDefault();$('dAuto').checked=false;setRange(DMAX()*Math.pow(1.0015,e.deltaY));update(true);settle()},{passive:false});
pinch(rail,{start:()=>{raildrag=false},scale:f=>{$('dAuto').checked=false;setRange(DMAX()*f);update(true)},end:settle});
rail.addEventListener('keydown',e=>{const m=DMAX(),st=(e.shiftKey?0.001:0.01)*m,k={ArrowLeft:-st,ArrowRight:st,ArrowDown:-st,ArrowUp:st}[e.key];if(k){e.preventDefault();stopPlay();$('d').value=clamp(+$('d').value+k,-m,m);update(false)}});
$('dFit').addEventListener('click',()=>{fitRange(true);update(true)});
$('dAuto').addEventListener('change',()=>{if($('dAuto').checked)fitRange(false);update(false)});
/* ---------- Michelson schematic: M₂ slides with d; the fixed mirror M₁ shows the tilt, exaggerated (500 µrad draws as 10°).
   αx turns it in the plane of the drawing, either way. αy leans it towards or away from the viewer: +αy shows a shaded strip of
   its silvered face below the bar, −αy a strip of its dark back above it, as deep as |αy| (plus a shading across the bar itself).
   The detector cone opens with θmax; drag M₂ to move it ---------- */
const msvg=$('miniSvg'),MZ=160,MS=34;
function renderMini(){const X=MZ+(+$('d').value)/DMAX()*MS,ax=+$('tx').value,ay=+$('ty').value,f=clamp(+$('fov').value,0,60)*Math.PI/180,L=16,w=Math.tan(f)*L*1.6;
  $('m2r').setAttribute('x',X-4);$('m2h').setAttribute('x',X-14);$('m2t').setAttribute('x',X);$('mBeam').setAttribute('x2',X-4);$('dArr').setAttribute('x2',X-4);
  const rx=clamp(ax*0.02,-12,12),ly=clamp(ay/500,-1,1),dep=10*Math.abs(ly),s=$('m1s');
  /* the beam meets M₁ at a fixed pivot on its face (100, 54) and M₁ turns about it, so the beam keeps its length. Drawing order: the αy strip (m1g),
     then the beam and dot, then the bar (m1g2), so the beam stays visible across the silvered face (+αy) and the bar covers the dot's far half.
     Every part varies continuously with αy, so it passes through 0 without a jump */
  for(const g of ['m1g','m1g2'])$(g).setAttribute('transform',`rotate(${rx} 100 54)`);$('m1Ref').setAttribute('opacity',ax||ay?.45:0);
  if(ly>0){s.setAttribute('d',`M82 54L118 54L${118-2*ly} ${54+dep}L${82+2*ly} ${54+dep}Z`);s.setAttribute('fill','url(#m1Silv)');s.setAttribute('opacity',1)}
  else if(ly<0){s.setAttribute('d',`M82 47L118 47L${118+2*ly} ${47-dep}L${82-2*ly} ${47-dep}Z`);s.setAttribute('fill','currentColor');s.setAttribute('opacity',.35)}
  else s.setAttribute('d','');
  $('m1sB').setAttribute('d',s.getAttribute('d'));  /* an opaque backing in the panel colour, so the shaded (translucent) mirror hides the beam and dot behind it */
  $('m1G0').setAttribute('stop-opacity',1-Math.max(0,-ly)*.35);$('m1G1').setAttribute('stop-opacity',1-Math.max(0,ly)*.35);
    $('fovCone').setAttribute('d',`M100 170 L${100-w} ${170+L} L${100+w} ${170+L}Z`);
  $('m1t').textContent=ax||ay?`M₁ tilt (${F(ax,3)}, ${F(ay,3)}) µrad`:'M₁ fixed'}
let mdrag=false;
const mset=e=>{const pt=msvg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(msvg.getScreenCTM().inverse());$('d').value=clamp((p.x-MZ)/MS,-1,1)*DMAX();update(true)};
$('m2').addEventListener('pointerdown',e=>{stopPlay();mdrag=true;msvg.setPointerCapture(e.pointerId);e.preventDefault()});
msvg.addEventListener('pointermove',e=>{if(mdrag)mset(e)});
const mend=()=>{if(mdrag){mdrag=false;update(false)}};msvg.addEventListener('pointerup',mend);msvg.addEventListener('pointercancel',mend);
/* sweep: one full pass from −range to +range takes SWT seconds (8 s by default, MS-14), then it turns around.
   sweepStep moves d by the mirror speed 2·range/SWT for dt seconds; the verification table checks it. */
let playing=false,pdir=1,plast=0;
const sweepV=()=>2*DMAX()/SWT;
function sweepStep(v,dir,dt,m,T){v+=dir*dt*2*m/T;if(v>=m){v=m;dir=-1}if(v<=-m){v=-m;dir=1}return[v,dir]}
function stopPlay(){if(!playing)return;playing=false;$('dPlay').setAttribute('aria-pressed','false');$('dPlay').textContent='▶ Sweep';update(false)}
function tick(t){if(!playing)return;const dt=plast?Math.min(0.1,(t-plast)/1000):0;plast=t;const r=sweepStep(+$('d').value,pdir,dt,DMAX(),SWT);pdir=r[1];$('d').value=r[0];update(true);requestAnimationFrame(tick)}
$('dPlay').addEventListener('click',()=>{if(playing){stopPlay();return}playing=true;plast=0;$('dPlay').setAttribute('aria-pressed','true');$('dPlay').textContent='❚❚ Pause';requestAnimationFrame(tick)});

/* read the active renderer's pixels back as I/I_tot, for the verification table */
async function ringReadback(){if(Ibuf)return;const A=Itot(act())||1;let a=null;
  if(RB.active==='webgpu')a=await gpuRead(RB.gpu);else if(RB.active==='webgl2')a=glRead(RB.gl);if(!a)return;
  Ibuf=new Float32Array(a.length/4);for(let k=0;k<Ibuf.length;k++)Ibuf[k]=a[4*k+3]/A}
probeBackends();
/* the ? on the pattern panel: a small popup with the renderer and the live resolution. It stays open while you drag
   on the pattern, and closes on the ? again, Escape, or a click outside the panel. */
{const b=$('infoBtn'),p=$('infoPop'),pan=b.closest('.panel'),show=v=>{p.hidden=!v;b.setAttribute('aria-expanded',String(v))};
  b.addEventListener('click',()=>show(p.hidden));
  document.addEventListener('pointerdown',e=>{if(!p.hidden&&!pan.contains(e.target))show(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!p.hidden)show(false)})}

