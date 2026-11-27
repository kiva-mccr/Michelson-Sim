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
editable('txV',()=>+$('tx').value,v=>{tGlide=null;widen('tx',v,true)});
editable('tyV',()=>+$('ty').value,v=>{tGlide=null;widen('ty',v,true)});

/* ---------- ring sizing: the canvas fills the largest square that fits its panel ---------- */
function fitRing(){const[bw,bh]=box($('ringBox')),s=Math.max(120,Math.floor(Math.min(bw,bh||bw)));
  if($('ringWrap').style.width!==s+'px'){$('ringWrap').style.width=$('ringWrap').style.height=s+'px';SZC.delete(ov)}const gpu=RB.active==='webgpu'||RB.active==='webgl2',n=clamp(Math.round(s*(window.devicePixelRatio||1)),200,gpu?1024:480);
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
const setTxt=(id,t)=>{const e=$(id);if(!editing.has(id)&&e.textContent!==t)e.textContent=t};  /* an unchanged text is not rewritten, so it doesn't dirty the layout */
function draw(){raf=0;/* d and δ0 to the nearest nm (3 decimals in µm), with a fixed-width minus slot so the row never reflows */
  const nm3=v=>{const t=Math.abs(v).toFixed(3);return (v<0&&+t?'−':'\u2007')+t+' µm'};setTxt('dV',nm3(+$('d').value));setTxt('dV0',nm3(D0()));setTxt('dRV',`${F(DMAX(),3)} µm`);
  setTxt('rV',`±${F(RANGE(),4)} µm`);{const[a,b]=outWin(),dg=b-a<5?2:b-a<50?1:0;setTxt('oV',`${a.toFixed(dg)}–${b.toFixed(dg)} nm`)}setTxt('fV',`${F(+$('fov').value,4)}°`);setTxt('txV',`${F(+$('tx').value,4)} µrad`);setTxt('tyV',`${F(+$('ty').value,4)} µrad`);
  const t0=performance.now();LQ.ms=0;fitRing();renderSpec();renderOut();renderIfg();renderRingIfNeeded();renderOv();renderRail();renderMini();
  if(ringLive){const t=performance.now()-t0;LQ.other=0.7*LQ.other+0.3*Math.max(0,t-LQ.ms);LQ.tot=0.7*LQ.tot+0.3*t}}
function runEq(){eqT=0;eqs();table();save()}
/* MS-11: a live input that stops changing for IDLE ms (the button still held) gets the exact at-rest image; the next change goes live again */
let idleT=0;const goIdle=()=>{if(ringLive){ringLive=false;if(!raf)raf=requestAnimationFrame(draw)}};
function update(live){ringLive=!!live;clearTimeout(idleT);if(live)idleT=setTimeout(goIdle,IDLE);if(!live){if($('dAuto').checked)fitRange(false);if($('rAuto').checked)fitR()}
  if(!raf)raf=requestAnimationFrame(draw);
  if(live){if(!eqT)eqT=setTimeout(runEq,350)}else{clearTimeout(eqT);eqT=setTimeout(runEq,40)}  /* let the released frame paint first */
  $('verAt').textContent='Settings changed since the last run. Press Run checks to verify the current state.'}
const ro=new ResizeObserver(()=>{SZC.clear();if(!raf)raf=requestAnimationFrame(draw)});window.addEventListener('resize',()=>{SZC.clear();measureFrame()});
let lastK=EQK();window.addEventListener('resize',()=>{if(EQK()!==lastK){lastK=EQK();eqs()}});
['specBox','profBox','ringBox','railBox'].forEach(k=>ro.observe($(k)));document.querySelectorAll('.plot').forEach(p=>ro.observe(p));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{CSSC.clear();update(false)});
const mo=new MutationObserver(()=>{CSSC.clear();update(false)});mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
const waitMJ=setInterval(()=>{if(window.MathJax&&MathJax.typesetPromise){clearInterval(waitMJ);eqs()}},200);
update(false);
