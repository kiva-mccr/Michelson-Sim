// MS-15: checks that the untilted at-rest CPU ring (one octant evaluated, mirrored 8 ways) equals evaluating every pixel.
//   node tests/symmetry.js [index.html]
// For 6 untilted spectra it renders the ring at rest on the CPU, then evaluates pixVal directly at every pixel, in float64, and
// requires (1) X, Y, Z and I at every pixel to equal, bit for bit, the values at its octant pixel, and (2) the rendered I/I_tot
// buffer to equal the direct values. Needs Node and `npm i playwright`.
const {chromium}=require('playwright');const {hookPage}=require('./_common');
const HOOK=`window.__S=()=>{renderRing(true);const N=ring.width,M=ringModel(),cs=act(),SL=sublines(),pr=prepSL(SL),A=Itot(cs),h=N/2,s2=(PIXSD*2/N)**2;
  const V=new Float64Array(N*N*4);
  for(let j=0;j<N;j++){const v=-((j+0.5)-h)/h;for(let i=0;i<N;i++){const u=((i+0.5)-h)/h;V.set(gridPix(M,pr,s2,u,v),4*(j*N+i))}}
  const n=N-1,can=(j,i)=>{if(j>n-j)j=n-j;if(i>n-i)i=n-i;return i<=j?[j,i]:[i,j]};let bad=0,ib=0,mx=0;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const[cj,ci]=can(j,i),a=4*(j*N+i),b=4*(cj*N+ci);for(let c=0;c<4;c++)if(V[a+c]!==V[b+c])bad++;
    const u=((i+0.5)-h)/h,v=-((j+0.5)-h)/h,rc=rcut(N,1),e=Math.abs(Ibuf[j*N+i]-(u*u+v*v>rc*rc?0:Math.fround(V[a+3]/A)));  /* beyond rcut the page stores 0 (MS-13) */if(e){ib++;mx=Math.max(mx,e)}}
  return{N,tilted:!!(M.kx||M.ky),bad,ib,mx}};\n`;
const PAGE=hookPage('symmetry',HOOK);
const scen=[
 {n:'default',c:[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true}],d:20,fov:10},
 {n:'hene',c:[{s:1000/632.8,a:0.85,f:0,on:true}],d:3.7,fov:10},
 {n:'hene-3mm',c:[{s:1000/632.8,a:0.85,f:0,on:true}],d:3000,fov:10},
 {n:'na',c:[{s:1000/588.995,a:0.9,f:0,on:true},{s:1000/589.592,a:0.6,f:0,on:true}],d:145,fov:6},
 {n:'led',c:[{s:1000/450,a:1.0,f:20*1000/450**2,on:true},{s:1000/555,a:0.58,f:100*1000/555**2,on:true},{s:1000/610,a:0.25,f:90*1000/610**2,on:true}],d:0.8,fov:10},
 {n:'wide-fov',c:[{s:1000/780,a:0.7,f:0.5,on:true},{s:1000/420,a:0.4,f:0,on:true}],d:-12,fov:20},
];
(async()=>{const br=await chromium.launch({args:['--use-angle=swiftshader','--ignore-gpu-blocklist']});let fail=0;
 for(const[vw,vh]of[[1920,1080],[1367,657]])for(const sc of scen){const ctx=await br.newContext({viewport:{width:vw,height:vh}});await ctx.route(/^https?:\/\//,r=>r.abort());
  await ctx.addInitScript(st=>localStorage.setItem('mich-sim-v2',JSON.stringify(st)),{c:sc.c,d:sc.d,r:420,fov:sc.fov,tx:0,ty:0,ra:true,rm:50,env:true});
  const pg=await ctx.newPage();await pg.goto(PAGE.url+'?renderer=cpu');await pg.waitForFunction(()=>window.__S&&document.documentElement.dataset.renderer==='cpu');await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>window.__S());const ok=!r.tilted&&r.bad===0&&r.ib===0;if(!ok)fail++;
  console.log(`${sc.n.padEnd(9)} N=${r.N}  octant mismatches ${r.bad}  I/I_tot mismatches ${r.ib} (max ${r.mx.toExponential(2)})  ${ok?'OK':'FAIL'}`);await ctx.close()}
 await br.close();PAGE.done();process.exit(fail?1:0)})();
