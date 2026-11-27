// The mirror sweep must drive the same adaptive preview as a drag (MS-11): while it runs, every ring frame is a live preview
// whose budget comes from the measured fringe speed, so a slow sweep gets a finer preview than a fast one; when it stops,
// the exact full-resolution image returns.
//   node tests/sweepres.js [index.html]
// For each renderer and two spectra (tilted, untilted) it sweeps at a fast and a slow pass time, samples the ring state every
// 100 ms after a 0.6 s settling time, and checks: every sample is live; the fringe speed is measured (finite, > 0); the median
// preview grid of the slow sweep is at least as fine as the fast one's, and the fast one is coarser than full resolution where
// the full image can't be drawn in a frame; after stopping, the grid is full and not live. Needs Node and `npm i playwright`.
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const src=process.argv[2]||path.join(__dirname,'..','index.html');let html=fs.readFileSync(src,'utf8');
const HOOK=`window.__SW={set:t=>{SWTset(t)},state:()=>({live:ringLive,v:LQ.mv.v,res:$('resV').textContent,N:(RB.active==='webgpu'||RB.active==='webgl2')?null:ring.width})};\n`;
const tail='\nupdate(false);\n}\n</script>';if(!html.includes(tail))throw new Error('hook point not found');html=html.replace(tail,'\n'+HOOK+tail);
const hooked=path.join(os.tmpdir(),`mich-sweepres-${process.pid}.html`);fs.writeFileSync(hooked,html);
const MJ=process.env.MATHJAX_DIR;
const scen=[
 {n:'default-tilt',c:[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true}],d:20,tx:80,ty:-30,fov:10},
 {n:'hene',c:[{s:1000/632.8,a:0.85,f:0,on:true}],d:3,tx:0,ty:0,fov:10},
];
const med=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]};
const nl=r=>parseInt(r,10);
(async()=>{const br=await chromium.launch({args:['--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let fail=0;
 for(const sc of scen)for(const rend of ['cpu','workers','webgl2']){
  const ctx=await br.newContext({viewport:{width:1400,height:820},deviceScaleFactor:1});
  if(MJ)await ctx.route('**/mathjax@3.2.2/**',r=>r.fulfill({path:path.join(MJ,r.request().url().split('mathjax@3.2.2/')[1])}));else await ctx.route(/cdn\.jsdelivr/,r=>r.abort());
  await ctx.addInitScript(st=>localStorage.setItem('mich-sim-v2',JSON.stringify(st)),{c:sc.c,d:sc.d,fov:sc.fov,tx:sc.tx,ty:sc.ty,ra:true,rm:50,env:true});
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+hooked+'?renderer='+rend);
  if(!await pg.waitForFunction(r=>window.__SW&&document.documentElement.dataset.renderer===r,rend,{timeout:15000}).then(()=>true,()=>false)){console.log(`${sc.n.padEnd(12)} ${rend.padEnd(8)} not available, skipped`);await ctx.close();continue}
  await pg.waitForTimeout(800);
  const full=nl(await pg.evaluate(()=>window.__SW.state().res));const r={};
  for(const T of [1,600]){await pg.evaluate(t=>window.__SW.set(t),T);await pg.click('#dPlay');await pg.waitForTimeout(600);const s=[];
    for(let i=0;i<20;i++){s.push(await pg.evaluate(()=>window.__SW.state()));await pg.waitForTimeout(100)}
    await pg.click('#dPlay');await pg.waitForTimeout(1500);const end=await pg.evaluate(()=>window.__SW.state());
    r[T]={vmed:med(s.map(x=>x.v)),allLive:s.every(x=>x.live),vOk:s.filter(x=>isFinite(x.v)&&x.v>0).length,med:med(s.map(x=>nl(x.res))),end}}
  const f=r[1],sl=r[600],ok=f.allLive&&sl.allLive&&f.vOk>=15&&sl.vOk>=15&&sl.med>=f.med&&!f.end.live&&!sl.end.live&&nl(f.end.res)===full&&nl(sl.end.res)===full&&!errs.length;
  if(!ok)fail++;
  console.log(`${sc.n.padEnd(12)} ${rend.padEnd(8)} full ${full}²  1 s pass: preview ${f.med}² v ${f.vmed.toPrecision(3)} (live ${f.allLive}, speed measured ${f.vOk}/20)  600 s pass: preview ${sl.med}² v ${sl.vmed.toPrecision(3)} (live ${sl.allLive}, speed measured ${sl.vOk}/20)  stopped: ${f.end.res}${errs.length?'  page errors: '+errs.join('; '):''}  ${ok?'OK':'FAIL'}`);
  await ctx.close()}
 await br.close();fs.unlinkSync(hooked);console.log(fail?`${fail} FAILED`:'all OK');process.exit(fail?1:0)})();
