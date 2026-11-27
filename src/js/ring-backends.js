/* ---- CPU workers: the same gridPix()/pixVal()/avgQ() source, run on every core ---- */
function initWorkers(){if(!window.Worker||!window.Blob)throw new Error('no workers');const n=clamp((navigator.hardwareConcurrency||4)-1,2,8);
  const src=`const QS=${JSON.stringify(QS)},PV=[0,0,0,0];
${[avgQpre,avgQ,pixVal,opdModel,gridPix].join('\n')}
onmessage=e=>{const t0=performance.now(),m=e.data,{N,Nl,rc2,j0,j1,d,T,kx,ky,s2,pr}=m,M=opdModel(d,T,kx,ky),h=N/2,k=N/Nl,out=new Float32Array((j1-j0)*Nl*4);let o=0;
  for(let j=j0;j<j1;j++){const v=-((j+0.5)*k-h)/h;for(let i=0;i<Nl;i++){const u=((i+0.5)*k-h)/h;if(u*u+v*v>rc2){o+=4;continue}
    const p=gridPix(M,pr,s2,u,v);out[o++]=p[0];out[o++]=p[1];out[o++]=p[2];out[o++]=p[3]}}
  postMessage({id:m.id,j0,j1,out,ms:performance.now()-t0},[out.buffer])}`;
  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));return{pool:Array.from({length:n},()=>new Worker(url)),n,job:0}}
/* the message for one block of grid rows (the sender adds id, j0, j1) */
const wkMsg=(N,Nl,rc2,M,s2,pr)=>({N,Nl,rc2,d:M.d,T:M.T,kx:M.kx,ky:M.ky,s2,pr});

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
