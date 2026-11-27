// Anti-aliasing of the ring, at rest and in moving previews, on every renderer the browser offers.
//   node tests/antialias.js [index.html]
// (1) Preview pixels: for previews at several grid sizes Nl (and at rest, Nl = N), the rendered value of grid points is compared with a
//     brute-force 2-D integral of the exact pattern over that grid point's own footprint (sd PIXSD·k device px, k = N/Nl). It includes the
//     grid point at the ring centre, where the fringe curvature matters most. A preview that skipped the curvature correction, or used a
//     footprint for the wrong pixel size, fails here.
// (2) Moiré: on a dense ring (HeNe, d = 3 mm, 10°: fringes up to ~1.2 cycles per pixel at the edge), the displayed image is low-passed
//     (Gaussian, sd 3 px, which removes the real fringes there) and the spread of that local mean over 0.35 < r < 0.9 must stay small.
//     Aliases show up there as ghost ring centres. With the old 0.4 px footprint it was about 5% of the mean; with 0.5 px about 1%.
// Needs Node and `npm i playwright`. Set GPU_ARGS=0 to launch without the WebGPU flags (see tests/_common.py).
const {chromium}=require('playwright');const {hookPage,routeMathJax,GPU}=require('./_common');
const HOOK=`window.__A={
  /* render one frame at grid size Nl (Nl = N: at rest) through the page's own path, then return the grid as I/I_tot */
  frame:async Nl=>{const N=ring.width;if(Nl<N){lqPick=()=>Nl;ringLive=true}else ringLive=false;
    if(RB.active==='webgpu'||RB.active==='webgl2'){while(RB.busy)await RB.done;renderRing(true);await RB.done}
    else if(RB.active==='workers'){renderRing();if(RB.wDone)await RB.wDone}else renderRing(true);
    ringLive=false;const A=act().reduce((t,c)=>t+P(c),0);let I=new Float64Array(Nl*Nl);
    if(RB.active==='webgpu'){const a=await gpuRead(RB.gpu);for(let q=0;q<Nl*Nl;q++)I[q]=a[4*q+3]/A}
    else if(RB.active==='webgl2'){const a=glRead(RB.gl);for(let j=0;j<Nl;j++)for(let i=0;i<Nl;i++)I[j*Nl+i]=a[4*((N-1-(Nl-1-j))*N+i)+3]/A}
    else if(Nl<N)I=Float64Array.from(Pbuf);else for(let j=0;j<N;j++)for(let i=0;i<N;i++)I[j*N+i]=Ibuf[j*N+i];
    return{N,Nl,I:Array.from(I)}},
  /* brute-force footprint average at grid point (j, i) of an Nl grid: rows run top-down, v = −((j+½)k − h)/h */
  ref:(N,Nl,j,i)=>{const M=ringModel(),cs=act(),SL=sublines(),k=N/Nl,h=N/2,sd=PIXSD*2*k/N,u0=((i+0.5)*k-h)/h,v0=-((j+0.5)*k-h)/h;
    const gr=M.grad(u0,v0),fr=8*sd*Math.hypot(...gr)*Math.max(...SL.map(o=>o.s)),n=clamp(Math.ceil(fr*12)+21,21,1601);let sw=0,si=0;
    for(let a=0;a<n;a++){const du=-4*sd+8*sd*a/(n-1),wa=Math.exp(-0.5*(du/sd)**2);for(let b=0;b<n;b++){const dv=-4*sd+8*sd*b/(n-1),wt=wa*Math.exp(-0.5*(dv/sd)**2);si+=wt*0.5*(1+gamma(M.opd(u0+du,v0+dv),cs)[0]);sw+=wt}}
    return si/sw},
  /* the grid point with the smallest |∇δ| (the ring centre), searched over the visible grid */
  centre:(N,Nl)=>{const M=ringModel(),k=N/Nl,h=N/2;let best=[0,0],bg=Infinity;for(let j=0;j<Nl;j++)for(let i=0;i<Nl;i++){const u=((i+0.5)*k-h)/h,v=-((j+0.5)*k-h)/h;if(u*u+v*v>0.81)continue;
    const g=Math.hypot(...M.grad(u,v));if(g<bg){bg=g;best=[j,i]}}return best},
  /* the displayed image's moiré: linear-light luminance, Gaussian low-pass (sd 3 px), spread of the local mean over 0.35 < r < 0.9, relative to its mean */
  moire:()=>{const c=$(RB.active==='webgl2'?'ringGL':'ring'),N=c.width;let d;
    if(RB.active==='webgl2'){const gl=c.getContext('webgl2');d=new Uint8Array(N*N*4);gl.readPixels(0,0,N,N,gl.RGBA,gl.UNSIGNED_BYTE,d)}else d=c.getContext('2d').getImageData(0,0,N,N).data;
    const lin=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4},Y=new Float64Array(N*N);for(let q=0;q<N*N;q++)Y[q]=0.2126*lin(d[4*q])+0.7152*lin(d[4*q+1])+0.0722*lin(d[4*q+2]);
    const R=9,w=[];let ws=0;for(let t=-R;t<=R;t++){const x=Math.exp(-t*t/18);w.push(x);ws+=x}
    const blur=(src,dx,dy)=>{const o=new Float64Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let s=0,sw=0;for(let t=-R;t<=R;t++){const xx=x+t*dx,yy=y+t*dy;if(xx<0||yy<0||xx>=N||yy>=N)continue;s+=w[t+R]*src[yy*N+xx];sw+=w[t+R]}o[y*N+x]=s/sw}return o};
    const m=blur(blur(Y,1,0),0,1);let lo=Infinity,hi=-Infinity,sum=0,n=0;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const r=Math.hypot(x-(N-1)/2,y-(N-1)/2)/(N/2);if(r<=0.35||r>=0.9)continue;const v=m[y*N+x];lo=Math.min(lo,v);hi=Math.max(hi,v);sum+=v;n++}
    return(hi-lo)/(sum/n)}};\n`;
const PAGE=hookPage('antialias',HOOK);
const HENE={s:1000/632.8,a:0.85,f:0,on:true},LED=[{s:1000/450,a:1.0,f:20*1000/450**2,on:true},{s:1000/555,a:0.58,f:100*1000/555**2,on:true},{s:1000/610,a:0.25,f:90*1000/610**2,on:true}];
const scen=[
 {n:'hene-3mm',c:[HENE],d:3000,tx:0,ty:0,fov:10,moire:true},
 {n:'hene-tilt',c:[HENE],d:3000,tx:30,ty:-10,fov:10},
 {n:'hene-tilt2',c:[HENE],d:600,tx:150,ty:-60,fov:10},
 {n:'led-tilt',c:LED,d:2,tx:200,ty:80,fov:10},
 {n:'two-tilt',c:[{s:1.55,a:0.8,f:0.06,on:true},{s:1.85,a:0.6,f:0.06,on:true}],d:3,tx:120,ty:-60,fov:12},
];
const FR=[[0.5,0.5],[0.62,0.41],[0.75,0.5],[0.3,0.2],[0.86,0.6],[0.5,0.88]];  /* sample points, as fractions of the grid; plus the centre */
const TOL=1e-3,TOLR=1e-2,MOIRE=0.025;  /* 1e-3 as the at-rest "Ring pixels" check; 1e-2 for the untilted CPU preview, which interpolates a radial table */
(async()=>{const br=await chromium.launch({args:GPU});let fail=0;
 for(const sc of scen){
  const ctx=await br.newContext({viewport:{width:1400,height:820},deviceScaleFactor:1});
  await routeMathJax(ctx);
  await ctx.addInitScript(st=>localStorage.setItem('mich-sim-v2',JSON.stringify(st)),{c:sc.c,d:sc.d,r:420,fov:sc.fov,tx:sc.tx,ty:sc.ty,ra:true,rm:50,env:true});
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(PAGE.url);await pg.waitForFunction(()=>window.__A&&document.documentElement.dataset.renderers);
  const avail=(await pg.evaluate(()=>document.documentElement.dataset.renderers)).split(',');
  for(const rend of avail){
   await pg.goto(PAGE.url+'?renderer='+rend);
   const ok=await pg.waitForFunction(r=>window.__A&&document.documentElement.dataset.renderer===r,rend,{timeout:15000}).then(()=>true,()=>false);
   if(!ok){console.log(`${sc.n.padEnd(10)} ${rend.padEnd(8)} not active (lost context?), skipped`);continue}
   await pg.waitForTimeout(300);
   const N=await pg.evaluate(()=>ring.width);
   for(const Nl of [N,Math.round(N/2),Math.round(N/5),Math.round(N/12)]){
    const fr=await pg.evaluate(Nl=>window.__A.frame(Nl),Nl);
    const pts=FR.map(([a,b])=>[Math.floor(b*Nl),Math.floor(a*Nl)]);pts.push(await pg.evaluate(([N,Nl])=>window.__A.centre(N,Nl),[N,Nl]));
    let worst=0,at='';for(const[j,i]of pts){const r=await pg.evaluate(([N,Nl,j,i])=>window.__A.ref(N,Nl,j,i),[N,Nl,j,i]),e=Math.abs(fr.I[j*Nl+i]-r);if(e>worst){worst=e;at=`(${j},${i})`}}
    const radial=(rend==='cpu'||rend==='workers')&&!sc.tx&&!sc.ty&&Nl<N,tol=radial?TOLR:TOL,pass=worst<=tol;if(!pass)fail++;
    let mo='';if(sc.moire&&rend!=='webgpu'){const m=await pg.evaluate(()=>window.__A.moire());const mp=m<=MOIRE;if(!mp)fail++;mo=`  moiré ${(100*m).toFixed(2)}% ${mp?'OK':'FAIL'}`}
    console.log(`${sc.n.padEnd(10)} ${rend.padEnd(8)} N=${N} Nl=${String(Nl).padEnd(4)} worst |pixel − brute force| ${worst.toExponential(2)} at ${at.padEnd(10)} (tol ${tol}) ${pass?'OK':'FAIL'}${mo}`)}}
  if(errs.length){fail++;console.log('page errors:',errs.join('; '))}
  await ctx.close()}
 await br.close();PAGE.done();console.log(fail?`${fail} FAILED`:'all OK');process.exit(fail?1:0)})();
