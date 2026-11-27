// node tests/gpukernel.js [src/js dir] : runs the WebGPU (WGSL) and WebGL2 (GLSL) pixel kernels alone on small grids and compares every
// grid point with pixVal() in float64 (the CPU renderer's exact formula). Prints the largest difference relative to the pixel's total
// intensity, per kernel and case; fails above 1e-4 (the in-page "Ring pixels" check allows 1e-3). Needs Node and `npm i playwright`.
// WebGPU and WebGL2 run in separate browsers: on hosts without a GPU (SwiftShader) one of them can take the other's context down.
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const dir=process.argv[2]||path.join(__dirname,'..','src','js');
const js=['ring-model.js','ring-shaders.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const page=`<!doctype html><canvas id="ring" width="8" height="8"></canvas><canvas id="gl" width="8" height="8"></canvas><script>
const $=id=>document.getElementById(id),AMM=5,PIXSD=0.4,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));{
${js}
/* sub-bands like sublines(): each Gaussian split into K sub-bands over ±2.8w; a smooth stand-in for the colour (X, Y, Z) */
function SLof(cs){const out=[];let gi=0;const col=s=>[Math.exp(-(((s-1.65)/0.25)**2)),Math.exp(-(((s-1.8)/0.3)**2)),Math.exp(-(((s-2.2)/0.3)**2))+0.05];
  for(const c of cs){gi++;if(!c.f){out.push({s:c.s,p:c.a*Math.sqrt(Math.PI)*0.008/(2*Math.sqrt(Math.LN2)),w:0,g:gi,pka:0});continue}
    const w=c.f/(2*Math.sqrt(Math.LN2)),K=clamp(Math.ceil(5.6*w/0.012)+1,15,241),dx=5.6/(K-1),wc=Math.sqrt(1-dx*dx),pka=(Math.PI*w)**2;let ws=[],t=0;
    for(let k=0;k<K;k++){const x=-2.8+dx*k,g=Math.exp(-((x/wc)**2));ws.push([c.s+x*w,g]);t+=g}
    for(const[s,g]of ws)out.push({s,p:c.a*Math.sqrt(Math.PI)*w*g/t,w:dx*w,g:gi,pka})}
  for(const o of out){o.X=col(o.s);o.ka=(Math.PI*o.w)**2;o.kb=2*Math.PI*o.s}return out}
function caseOf(c){const pr=prepSL(SLof(c.cs)),T=Math.tan(c.fov*Math.PI/180),aE=AMM*T/Math.tan(10*Math.PI/180),M={d:c.d,T,kx:2e-3*c.tx*aE,ky:2e-3*c.ty*aE};
  const k=c.N/c.Nl,s2=(PIXSD*2*k/c.N)**2,pk=packRing(pr,M);return{pr,M,k,s2,pk}}
/* the exact value at grid point (u, v), as the workers compute it */
function ref(C,u,v){const {pr,M,s2,pk}=C,T=M.T,d=M.d,r=Math.hypot(u,v),th=Math.atan(r*T),q=1+r*r*T*T,c=T/q,cp=-2*r*T**3/(q*q),f1=-2*d*Math.sin(th)*c,f2=-2*d*(Math.cos(th)*c*c+Math.sin(th)*cp),fr=r>1e-12?f1/r:f2;
  const ux=r>1e-12?u/r:1,uy=r>1e-12?v/r:0,gx=f1*ux+M.kx,gy=f1*uy+M.ky,h11=f2*ux*ux+fr*(1-ux*ux),h22=f2*uy*uy+fr*(1-uy*uy),h12=(f2-fr)*ux*uy,quad=pk.kbm*s2*Math.max(Math.abs(f2),Math.abs(fr))>=3e-4;
  return [...pixVal(2*d*Math.cos(th)+M.kx*u+M.ky*v,gx,gy,h11,h12,h22,s2,pr,quad)]}
function score(C,c,out,flipY){const h=c.N/2;let worst=0;
  for(let j=0;j<c.Nl;j++)for(let i=0;i<c.Nl;i++){const u=((i+0.5)*C.k-h)/h,v=(flipY?1:-1)*((j+0.5)*C.k-h)/h;if(u*u+v*v>1)continue;const R=ref(C,u,v),o=4*(j*c.Nl+i);
    for(let q=0;q<4;q++)worst=Math.max(worst,Math.abs(out[o+q]-R[q])/R[3])}return worst}
window.runGPU=async cases=>{const ad=await navigator.gpu.requestAdapter(),dev=await ad.requestDevice(),m=dev.createShaderModule({code:WGSL}),info=await m.getCompilationInfo();
  if(info.messages.some(x=>x.type==='error'))return 'WGSL: '+info.messages.map(x=>x.message).join('; ');
  const cp=dev.createComputePipeline({layout:'auto',compute:{module:m,entryPoint:'cmain'}}),res=[];
  for(const c of cases){const C=caseOf(c),S=GPUBufferUsage,buf=(a,u)=>{const b=dev.createBuffer({size:Math.max(16,a.byteLength),usage:u|S.COPY_DST});dev.queue.writeBuffer(b,0,a);return b};
    const U=buf(new Float32Array([c.N,C.pk.ng,C.k,c.Nl,2*C.M.d,C.M.d,C.M.T,C.M.kx,C.M.ky,C.s2,C.pk.kbm,1]),S.UNIFORM),sb=buf(C.pk.sb,S.STORAGE),gr=buf(C.pk.gr,S.STORAGE),bytes=c.Nl*c.Nl*16;
    const out=dev.createBuffer({size:bytes,usage:S.STORAGE|S.COPY_SRC}),rb=dev.createBuffer({size:bytes,usage:S.MAP_READ|S.COPY_DST});
    const bg=dev.createBindGroup({layout:cp.getBindGroupLayout(0),entries:[U,sb,gr,out].map((b,i)=>({binding:i,resource:{buffer:b}}))});
    const t0=performance.now(),enc=dev.createCommandEncoder(),p=enc.beginComputePass();p.setPipeline(cp);p.setBindGroup(0,bg);p.dispatchWorkgroups(Math.ceil(c.Nl/8),Math.ceil(c.Nl/8));p.end();
    enc.copyBufferToBuffer(out,0,rb,0,bytes);dev.queue.submit([enc.finish()]);await rb.mapAsync(GPUMapMode.READ);const ms=performance.now()-t0;const a=new Float32Array(rb.getMappedRange().slice(0));rb.unmap();
    res.push({n:c.n,err:score(C,c,a,false),ms})}
  return res};
window.runGL=cases=>{const gl=$('gl').getContext('webgl2');if(!gl||!gl.getExtension('EXT_color_buffer_float'))return 'no webgl2';
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,GLSL_VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,GLSL_PIX));gl.linkProgram(p);gl.useProgram(p);gl.bindVertexArray(gl.createVertexArray());
  const tex=(unit,arr)=>{const t=gl.createTexture(),n=arr.length/4,w=Math.min(1024,n),h=Math.ceil(n/1024),b=new Float32Array(w*h*4);b.set(arr);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,b);return t};
  const res=[];for(const c of cases){const C=caseOf(c),U=n=>gl.getUniformLocation(p,n);
    const tSB=tex(0,C.pk.sb),tGR=tex(1,C.pk.gr),out=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,out);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,c.Nl,c.Nl,0,gl.RGBA,gl.FLOAT,null);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,out,0);
    gl.uniform1i(U('uSB'),0);gl.uniform1i(U('uGR'),1);gl.uniform1i(U('uNG'),C.pk.ng);gl.uniform1i(U('uN'),c.N);gl.uniform1i(U('uNl'),c.Nl);
    gl.uniform1f(U('uD'),C.M.d);gl.uniform1f(U('uT'),C.M.T);gl.uniform1f(U('uKx'),C.M.kx);gl.uniform1f(U('uKy'),C.M.ky);gl.uniform1f(U('uS2'),C.s2);gl.uniform1f(U('uKbm'),C.pk.kbm);
    const t0=performance.now();gl.viewport(0,0,c.Nl,c.Nl);gl.drawArrays(gl.TRIANGLES,0,3);const a=new Float32Array(c.Nl*c.Nl*4);gl.readPixels(0,0,c.Nl,c.Nl,gl.RGBA,gl.FLOAT,a);const ms=performance.now()-t0;
    res.push({n:c.n,err:score(C,c,a,true),ms});[tSB,tGR,out].forEach(t=>gl.deleteTexture(t));gl.deleteFramebuffer(fb)}
  return res};
}</script>`;
const LED=[{s:1000/450,a:1,f:20*1000/450**2},{s:1000/555,a:.58,f:100*1000/555**2},{s:1000/610,a:.25,f:90*1000/610**2}],TWO=[{s:1.55,a:.8,f:.06},{s:1.85,a:.6,f:.06}],
  MIX=[{s:1000/632.8,a:.6,f:0},{s:1000/540,a:.8,f:.06}],WIDE=[{s:1000/780,a:.7,f:.5},{s:1000/420,a:.4,f:0}];
const cases=[];for(const[n,cs,d]of [['led',LED,0.8],['led',LED,6],['two',TWO,2.5],['two',TWO,40],['mix',MIX,20],['mix',MIX,-7.3],['wide',WIDE,0.3],['mix',MIX,5000],['two',TWO,800]])
  for(const[tx,ty,fov]of [[0,0,10],[120,-60,12],[-40,25,20],[0,300,3],[400,-300,20]])for(const[N,Nl]of [[96,96],[480,40]])cases.push({n:`${n} d=${d} tilt=${tx},${ty} fov=${fov} N=${N}/${Nl}`,cs,d,tx,ty,fov,N,Nl});
(async()=>{const f=path.join(os.tmpdir(),'mich-gpukernel.html');fs.writeFileSync(f,page);let bad=0;
 for(const[name,args,fn]of [['webgpu',['--enable-unsafe-webgpu','--enable-unsafe-swiftshader','--disable-webgl'],'runGPU'],['webgl2',['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'],'runGL']]){
  const br=await chromium.launch({args});const pg=await br.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('file://'+f);
  let r;try{r=await pg.evaluate(c=>window[c[0]](c[1]),[fn,cases])}catch(e){r=String(e.message).slice(0,300)}
  if(typeof r==='string'||errs.length){console.log(name,'unavailable:',r,errs.join(' '));await br.close();continue}
  let worst=0,ms=0;for(const x of r){worst=Math.max(worst,x.err);ms+=x.ms;if(process.env.V)console.log(name.padEnd(7),x.n.padEnd(44),x.err.toExponential(2),x.ms.toFixed(0)+' ms')}
  const ok=worst<=1e-4;bad+=!ok;console.log(`${name.padEnd(7)} ${r.length} cases  largest |GPU − pixVal|/I ${worst.toExponential(2)}  total ${ms.toFixed(0)} ms  ${ok?'OK':'FAIL'}`);await br.close()}
 process.exit(bad?1:0)})();
