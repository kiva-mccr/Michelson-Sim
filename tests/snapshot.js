// Numerical snapshot of every output, for checking that a refactor or optimization leaves the physics unchanged.
//   node tests/snapshot.js [index.html] [out.json]     (defaults: ../index.html, snapshot.json)
//   python3 tests/compare_snapshots.py before.json after.json
// Records, for 7 spectra on the CPU, worker and WebGL2 renderers: gamma at 1,200 OPDs, the sub-bands, coherence, the settle OPD,
// the SVG of every plot, the interferogram and profile canvas pixels, the ring canvas pixels and I/I_tot buffer, the live equation
// TeX, the readouts and the check table. Two runs of the same page give identical files. Needs Node and `npm i playwright`.
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const src=process.argv[2]||path.join(__dirname,'..','index.html'),outp=process.argv[3]||'snapshot.json';
let html=fs.readFileSync(src,'utf8');
const HOOK=`window.__T={gamma:(d)=>gamma(d),sub:()=>sublines().map(o=>[o.s,o.p,o.w,o.X[0],o.X[1],o.X[2]]),coh:()=>coherence(),settle:()=>settleOPD(),
  renderRing:(s)=>renderRing(s),readback:()=>ringReadback(),RB,get Ibuf(){return Ibuf},verify:()=>verify(),
  pick:(k)=>{RB.pref=k;pickBackend('test')}};\n`;
const tail='\nupdate(false);\n}\n</script>';
if(!html.includes(tail))throw new Error('hook point not found');
html=html.replace(tail,'\n'+HOOK+tail);
const hooked=path.join(os.tmpdir(),'mich-snapshot-page.html');fs.writeFileSync(hooked,html);const URL_='file://'+hooked;
const scen=[
 {n:'default',c:[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true}],d:20,tx:0,ty:0,fov:10},
 {n:'hene',c:[{s:1000/632.8,a:0.85,f:0,on:true}],d:3.7,tx:0,ty:0,fov:10},
 {n:'na',c:[{s:1000/588.995,a:0.9,f:0,on:true},{s:1000/589.592,a:0.6,f:0,on:true}],d:145,tx:0,ty:0,fov:6},
 {n:'led',c:[{s:1000/450,a:1.0,f:20*1000/450**2,on:true},{s:1000/555,a:0.58,f:100*1000/555**2,on:true},{s:1000/610,a:0.25,f:90*1000/610**2,on:true}],d:0.8,tx:0,ty:0,fov:10},
 {n:'two-tilt',c:[{s:1.55,a:0.8,f:0.06,on:true},{s:1.85,a:0.6,f:0.06,on:true}],d:2.5,tx:120,ty:-60,fov:12},
 {n:'mix-tilt',c:[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true},{s:1000/700,a:0.3,f:0.2,on:false}],d:-7.3,tx:-40,ty:25,fov:20},
 {n:'ir-wide',c:[{s:1000/780,a:0.7,f:0.5,on:true},{s:1000/420,a:0.4,f:0.004*0,on:true}],d:0.3,tx:0,ty:300,fov:3},
];
(async()=>{
 const br=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const res={};
 for(const sc of scen){for(const rend of ['cpu','workers','webgl2']){
  const ctx=await br.newContext({viewport:{width:1400,height:820},deviceScaleFactor:1});
  await ctx.route(/^https?:\/\//,r=>r.abort());
  await ctx.addInitScript(([st,rend])=>{localStorage.setItem('mich-sim-v2',JSON.stringify(st));localStorage.setItem('mich-renderer',rend)},[{c:sc.c,d:sc.d,r:420,fov:sc.fov,tx:sc.tx,ty:sc.ty,ra:true,rm:50,env:true},rend]);
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(URL_,{waitUntil:'load'});
  await pg.waitForFunction(()=>window.__T&&document.querySelectorAll('#rendSel option').length>1);
  await pg.waitForTimeout(400);
  const r=await pg.evaluate(async(rend)=>{const T=window.__T,RB=T.RB;
    const active=RB.active;
    // render the ring synchronously at rest and read it back
    if(RB.active==='workers'){T.renderRing();if(RB.wDone)await RB.wDone}else{while(RB.busy)await RB.done;T.renderRing(true);if(RB.done)await RB.done}
    await T.readback();const Ib=T.Ibuf?Array.from(T.Ibuf):null;
    const cvs=id=>{const c=document.getElementById(id);if(c.hidden)return null;let d;
      if(id==='ringGL'){const gl=c.getContext('webgl2');const a=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,a);d=a}
      else d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return Array.from(d)};
    const out={active,Ib,ring:cvs(active==='webgl2'?'ringGL':'ring')};
    if(rend==='cpu'){
      const R=+document.getElementById('rV').textContent.replace(/[^\d.e-]/g,'')||50;
      out.gam=[];for(let i=0;i<=800;i++){const d=-3000+7500*i/800;out.gam.push(T.gamma(d))}
      for(let i=0;i<=400;i++)out.gam.push(T.gamma(-R+2*R*i/400));
      out.sub=T.sub();out.coh=T.coh();out.settle=T.settle();
      for(const id of ['spec','out','ifg','prof','coh','eqS','eqI','eqP','eqO','eqC','tb','miniSvg','rail','dV','dV0','dRV','rV','oV','fV','txV','tyV','resV'])out['h_'+id]=document.getElementById(id).innerHTML;
      out.ifgC=cvs('ifgC');out.profC=cvs('profC');
      await T.verify();out.ver=document.getElementById('ver').innerText;
    }
    return out},rend);
  r.errs=errs;res[sc.n+'/'+rend]=r;await ctx.close();
  process.stderr.write(`${sc.n}/${rend}: active=${r.active} errs=${errs.length}\n`);
 }}
 await br.close();fs.writeFileSync(outp,JSON.stringify(res));
})();
