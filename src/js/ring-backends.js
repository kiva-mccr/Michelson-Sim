/* ---- CPU workers: the same pixVal()/avgQ() source, run on every core ---- */
function initWorkers(){if(!window.Worker||!window.Blob)throw new Error('no workers');const n=clamp((navigator.hardwareConcurrency||4)-1,2,8);
  const src=`const QS=${JSON.stringify(QS)};
${avgQpre.toString()}
${avgQ.toString()}
${pixVal.toString()}
const PV=[0,0,0,0];
onmessage=e=>{const m=e.data,{N,Nl,rc2,j0,j1,d,T,kx,ky,s2,kbm,pr}=m,h=N/2,k=N/Nl,out=new Float32Array((j1-j0)*Nl*4+8);let o=0;
  const rad=r=>{const th=Math.atan(r*T),q=1+r*r*T*T,c=T/q,cp=-2*r*T**3/(q*q),f1=-2*d*Math.sin(th)*c,f2=-2*d*(Math.cos(th)*c*c+Math.sin(th)*cp);return[f1,f2,r>1e-12?f1/r:f2]};
  for(let j=j0;j<j1;j++){const v=-((j+0.5)*k-h)/h;for(let i=0;i<Nl;i++){const u=((i+0.5)*k-h)/h;if(u*u+v*v>rc2){out[o++]=0;out[o++]=0;out[o++]=0;out[o++]=0;continue}const r=Math.hypot(u,v),[f1,f2,fr]=rad(r),ux=r>1e-12?u/r:1,uy=r>1e-12?v/r:0;
    const gx=f1*ux+kx,gy=f1*uy+ky,h11=f2*ux*ux+fr*(1-ux*ux),h22=f2*uy*uy+fr*(1-uy*uy),h12=(f2-fr)*ux*uy,quad=kbm*s2*Math.max(Math.abs(f2),Math.abs(fr))>=3e-4;
    const p=pixVal(2*d*Math.cos(Math.atan(r*T))+kx*u+ky*v,gx,gy,h11,h12,h22,s2,pr,quad);out[o++]=p[0];out[o++]=p[1];out[o++]=p[2];out[o++]=p[3]}}
  postMessage({id:m.id,j0,j1,out},[out.buffer])}`;
  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));const W={pool:Array.from({length:n},()=>new Worker(url)),n,job:0};
  return W}

/* ---- backend selection ----
   The automatic order below is only the starting guess. A speed test (ring-bench.js, MS-18) times every available renderer once
   per device and ranks them (RB.rank, cached); pickBackend takes the fastest that still works, so a lost GPU falls back to the
   next fastest. ?renderer= forces one (tests). */
const BACKENDS=[['webgpu','WebGPU'],['webgl2','WebGL2'],['workers','CPU, all cores'],['cpu','CPU, one core']];
const beName=k=>BACKENDS.find(b=>b[0]===k)[1];
const availBackends=()=>BACKENDS.map(b=>b[0]).filter(k=>(k==='webgpu'&&RB.gpu)||(k==='webgl2'&&RB.gl)||(k==='workers'&&RB.workers)||k==='cpu');
async function probeBackends(){
  try{RB.gpu=await initWebGPU($('ringGPU'))}catch(e){RB.gpuErr=e.message}
  try{RB.gl=initWebGL2($('ringGL'))}catch(e){RB.glErr=e.message}
  try{RB.workers=initWorkers()}catch(e){}
  if(RB.pref==='auto')benchLoad();pickBackend();
  if(RB.pref==='auto'&&!RB.rank&&availBackends().length>1)benchSchedule()}
function pickBackend(why){RB.busy=false;RB.dirty=false;const avail=availBackends(),rank=(RB.rank||[]).filter(k=>avail.includes(k)),order=[...rank,...avail.filter(k=>!rank.includes(k))];
  RB.active=RB.pref!=='auto'&&avail.includes(RB.pref)?RB.pref:order[0];
  $('ring').hidden=!['cpu','workers'].includes(RB.active);$('ringGL').hidden=RB.active!=='webgl2';$('ringGPU').hidden=RB.active!=='webgpu';
  /* the available (in the default order) and active renderers, for the tests; the ? popup on the pattern panel names the active one */
  document.documentElement.dataset.renderers=avail.join(',');document.documentElement.dataset.renderer=RB.active;
  $('rendV').textContent=beName(RB.active);
  $('rendNote').textContent=benchNote()+' Every renderer evaluates the same exact per-pixel formula, and the "Ring pixels" check reads back whichever one is active.'+(RB.gpuErr&&!RB.gpu?` WebGPU unavailable: ${RB.gpuErr}.`:'')+(RB.glErr&&!RB.gl?` WebGL2 unavailable: ${RB.glErr}.`:'');
  if(why)console.info('renderer:',RB.active,why);update(false)}
