/* ---- startup speed test (MS-18): pick the fastest renderer on this device ----
   Every available renderer computes the same fixed image (the LED preset, d = 3 µm, 10° field, a small tilt) on a BENCH_N² grid
   of exact footprint averages, one warm-up run and then three timed runs (the median counts). Equal work for all of them: the GPUs
   skip their display pass, so the visible canvas is untouched, and the workers and the main thread compute the same grid points
   without painting. A renderer must be at least 10% faster than one earlier in the default order to rank ahead of it (timing noise).
   The test starts once the first image is finished and the page is at rest, stops at once if anything starts moving (and tries
   again later), and while it runs the ring keeps its last image. The ranking is cached per device (browser, cores, GPU names,
   available renderers) for BENCH_DAYS, so later visits start straight on the fastest renderer. */
const BENCH_KEY='mich-renderer-bench',BENCH_V=1,BENCH_N=160,BENCH_DAYS=30;
const benchSig=()=>JSON.stringify([BENCH_V,navigator.userAgent,navigator.hardwareConcurrency||0,RB.gpuName||'',RB.glName||'',availBackends()]);
function benchLoad(){try{const c=JSON.parse(localStorage.getItem(BENCH_KEY)||'null');
  if(c&&c.sig===benchSig()&&Date.now()-c.at<BENCH_DAYS*864e5){RB.rank=c.rank;RB.benchRes=c;benchShow()}}catch(e){}}
const benchShow=()=>{if(RB.benchRes)document.documentElement.dataset.bench=JSON.stringify(RB.benchRes.ms)};  /* for the tests */
function benchNote(){const r=RB.benchRes;if(RB.pref!=='auto')return'Renderer forced by the address (?renderer=).';
  if(!r)return RB.rank||availBackends().length<2?'':'A quick speed test runs once on this device and switches to the fastest renderer.';
  return`Chosen by a speed test on this device (the same ${BENCH_N}² image on each): `+r.rank.map(k=>`${beName(k)}: ${isFinite(r.ms[k])?F(r.ms[k],2)+' ms':'failed'}`).join('; ')+'.'}
/* the fixed workload */
function benchWork(){const SL=splitBands(presets.led),pr=prepSL(SL),M=ringModelOf(3,10,40,25),N=BENCH_N,rc=rcut(N,1);let kbm=0;for(const o of SL)kbm=Math.max(kbm,o.kb);
  return{pr,M,N,kbm,s2:(PIXSD*2/N)**2,rc2:rc*rc,pk:packRing(pr,M)}}
/* one run of one renderer, in ms */
const benchRun={
  webgpu:W=>gpuDraw(RB.gpu,W.N,W.M,W.pk,W.s2,1,W.N,true),
  webgl2:W=>glDraw(RB.gl,W.N,W.M,W.pk,W.s2,1,W.N,true),
  workers:W=>new Promise(res=>{const P=RB.workers,id=++P.job,N=W.N,blk=8;let next=0,pending=0;
    const msg={N,Nl:N,rc2:W.rc2,d:W.M.d,T:W.M.T,kx:W.M.kx,ky:W.M.ky,s2:W.s2,kbm:W.kbm,pr:W.pr};
    const send=w=>{if(next>=N)return;const j0=next,j1=Math.min(N,next+blk);next=j1;pending++;w.postMessage({...msg,id,j0,j1})};
    P.pool.forEach(w=>{w.onmessage=e=>{if(e.data.id!==id)return;pending--;send(w);if(!pending)res()};send(w)})}),
  /* the main thread in 8-row slices, so the page stays responsive; only the computing time counts */
  cpu:async W=>{const N=W.N,h=N/2;let ms=0;
    for(let j0=0;j0<N;j0+=8){const t0=performance.now();for(let j=j0;j<j0+8;j++){const v=-((j+0.5)-h)/h;for(let i=0;i<N;i++){const u=((i+0.5)-h)/h;if(u*u+v*v<=W.rc2)gridPix(W.M,W.pr,W.kbm,W.s2,u,v)}}
      ms+=performance.now()-t0;await new Promise(r=>setTimeout(r,0))}return ms}};
async function benchTime(be,W){const t0=performance.now();let to;
  const r=await Promise.race([benchRun[be](W),new Promise((_,rej)=>to=setTimeout(()=>rej(new Error('timed out')),3000))]);clearTimeout(to);
  return be==='cpu'?r:performance.now()-t0}
const benchStop=()=>ringLive||document.hidden;
async function benchAll(){const W=benchWork(),ms={};
  for(const be of availBackends()){
    try{const best=Math.min(Infinity,...Object.values(ms)),w=await benchTime(be,W);if(benchStop())return null;  /* warm-up: compiles shaders, warms up the JIT */
      if(w>5*best){ms[be]=w;continue}  /* clearly slower: no need to time it again */
      const t=[];for(let i=0;i<3;i++){t.push(await benchTime(be,W));if(benchStop())return null}t.sort((a,b)=>a-b);ms[be]=t[1]}
    catch(e){ms[be]=Infinity;console.warn('speed test:',be,'failed:',e&&e.message)}}
  return ms}
/* fastest first; within 10% of each other the default order decides; a failed renderer goes last */
function benchRank(ms){const def=availBackends();return def.slice().sort((a,b)=>{const x=ms[a],y=ms[b];
  if(isFinite(x)&&isFinite(y)&&Math.abs(x-y)>0.1*Math.min(x,y))return x-y;if(isFinite(x)!==isFinite(y))return isFinite(x)?-1:1;return def.indexOf(a)-def.indexOf(b)})}
/* wait until the page is at rest and the current image is finished, then test; try again later if anything moves meanwhile */
function benchSchedule(tries=0){if(tries>60)return;setTimeout(async()=>{
  if(benchStop()||RB.busy||(RB.workers&&RB.workers.busy))return benchSchedule(tries+1);
  if(RB.wDone)await RB.wDone;if(benchStop()||RB.busy)return benchSchedule(tries+1);
  RB.benching=true;let ms=null;RB.benchP=benchAll().then(m=>ms=m,()=>{});await RB.benchP;RB.benching=false;RB.benchP=null;
  ringKey='';  /* a GPU's output buffer now holds the test image: render the real one again (also the frames skipped meanwhile) */
  if(!ms){if(!raf)raf=requestAnimationFrame(draw);return benchSchedule(tries+1)}
  const rank=benchRank(ms);RB.rank=rank;RB.benchRes={ms,rank,at:Date.now()};benchShow();
  try{localStorage.setItem(BENCH_KEY,JSON.stringify({...RB.benchRes,sig:benchSig()}))}catch(e){}
  console.info('speed test (ms):',JSON.stringify(ms));pickBackend('speed test')},tries?1500:1000)}
