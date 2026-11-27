/* ---- WebGPU ---- */
async function initWebGPU(cv){if(!navigator.gpu)throw new Error('no navigator.gpu');const ad=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!ad)throw new Error('no adapter');{const i=ad.info||{};RB.gpuName=[i.vendor,i.architecture,i.device,i.description].join('/')}
  const dev=await ad.requestDevice(),ctx=cv.getContext('webgpu'),fmt=navigator.gpu.getPreferredCanvasFormat();ctx.configure({device:dev,format:fmt,alphaMode:'opaque'});
  const mk=async code=>{const m=dev.createShaderModule({code}),info=await m.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw new Error(info.messages.map(x=>x.message).join('; '));return m};
  const mod=await mk(WGSL),modR=await mk(WGSL_R);
  const bgl=dev.createBindGroupLayout({entries:[{binding:0,visibility:4,buffer:{type:'uniform'}},{binding:1,visibility:4,buffer:{type:'read-only-storage'}},{binding:2,visibility:4,buffer:{type:'read-only-storage'}},{binding:3,visibility:4,buffer:{type:'storage'}}]});
  const bglR=dev.createBindGroupLayout({entries:[{binding:0,visibility:3,buffer:{type:'uniform'}},{binding:3,visibility:2,buffer:{type:'read-only-storage'}}]});
  const cp=dev.createComputePipeline({layout:dev.createPipelineLayout({bindGroupLayouts:[bgl]}),compute:{module:mod,entryPoint:'cmain'}});
  const rp=dev.createRenderPipeline({layout:dev.createPipelineLayout({bindGroupLayouts:[bglR]}),vertex:{module:modR,entryPoint:'vmain'},fragment:{module:modR,entryPoint:'fmain',targets:[{format:fmt}]},primitive:{topology:'triangle-list'}});
  const G={dev,ctx,cp,rp,bgl,bglR,ubuf:dev.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),sb:null,gr:null,out:null,sizes:{}};
  dev.lost.then(i=>{console.warn('WebGPU device lost',i.message);RB.gpu=null;pickBackend('webgpu lost')});
  dev.addEventListener('uncapturederror',e=>{console.warn('WebGPU error:',e.error.message);if(!RB.gpuBad){RB.gpuBad=true;RB.gpu=null;pickBackend('webgpu error')}});
  return G}
const growBuf=(G,key,bytes,usage)=>{if(!G[key]||G.sizes[key]<bytes){G[key]&&G[key].destroy();G[key]=G.dev.createBuffer({size:bytes,usage});G.sizes[key]=bytes}return G[key]};
function gpuDraw(G,N,M,pk,s2,gain,Nl,bench){const dev=G.dev,SU=GPUBufferUsage,k=N/Nl;
  dev.queue.writeBuffer(G.ubuf,0,new Float32Array([N,pk.ng,k,Nl, 2*M.d,M.d,M.T,M.kx, M.ky,s2,pk.kbm,gain]));
  dev.queue.writeBuffer(growBuf(G,'sb',pk.sb.byteLength,SU.STORAGE|SU.COPY_DST),0,pk.sb);dev.queue.writeBuffer(growBuf(G,'gr',pk.gr.byteLength,SU.STORAGE|SU.COPY_DST),0,pk.gr);
  const out=growBuf(G,'out',N*N*16,SU.STORAGE|SU.COPY_SRC);
  const ents=[{binding:0,resource:{buffer:G.ubuf}},{binding:1,resource:{buffer:G.sb}},{binding:2,resource:{buffer:G.gr}},{binding:3,resource:{buffer:out}}];
  const bg=dev.createBindGroup({layout:G.bgl,entries:ents}),bgR=dev.createBindGroup({layout:G.bglR,entries:[ents[0],ents[3]]});
  const enc=dev.createCommandEncoder();{const p=enc.beginComputePass();p.setPipeline(G.cp);p.setBindGroup(0,bg);p.dispatchWorkgroups(Math.ceil(Nl/8),Math.ceil(Nl/8));p.end()}
  if(!bench){const p=enc.beginRenderPass({colorAttachments:[{view:G.ctx.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});p.setPipeline(G.rp);p.setBindGroup(0,bgR);p.draw(3);p.end()}
  dev.queue.submit([enc.finish()]);G.lastN=Nl;return dev.queue.onSubmittedWorkDone()}
async function gpuRead(G){const N=G.lastN,bytes=N*N*16,rb=G.dev.createBuffer({size:bytes,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
  const enc=G.dev.createCommandEncoder();enc.copyBufferToBuffer(G.out,0,rb,0,bytes);G.dev.queue.submit([enc.finish()]);await rb.mapAsync(GPUMapMode.READ);
  const a=new Float32Array(rb.getMappedRange().slice(0));rb.unmap();rb.destroy();return a}

/* ---- WebGL2 ---- */
function initWebGL2(cv){const gl=cv.getContext('webgl2',{antialias:false,depth:false,preserveDrawingBuffer:true});if(!gl)throw new Error('no webgl2');
  if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('no float render targets');RB.glName=String(gl.getParameter(gl.RENDERER));
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const prog=fs=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,GLSL_VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
  const L={gl,pPix:prog(GLSL_PIX),pTone:prog(GLSL_TONE),tSB:gl.createTexture(),tGR:gl.createTexture(),tOut:gl.createTexture(),fb:gl.createFramebuffer(),vao:gl.createVertexArray(),N:0};
  for(const t of [L.tSB,L.tGR,L.tOut]){gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST)}
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();RB.gl=null;pickBackend('webgl lost')});return L}
function glData(gl,tex,arr){const texels=arr.length/4,w=Math.min(1024,texels),h=Math.ceil(texels/1024),buf=new Float32Array(w*h*4);buf.set(arr);
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,buf)}
function glDraw(L,N,M,pk,s2,gain,Nl,bench){const gl=L.gl;
  if(L.N!==N){gl.bindTexture(gl.TEXTURE_2D,L.tOut);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,N,N,0,gl.RGBA,gl.FLOAT,null);gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,L.tOut,0);L.N=N}
  glData(gl,L.tSB,pk.sb);glData(gl,L.tGR,pk.gr);gl.bindVertexArray(L.vao);
  const set=(p)=>{gl.useProgram(p);const U=n=>gl.getUniformLocation(p,n);gl.uniform1i(U('uSB'),0);gl.uniform1i(U('uGR'),1);gl.uniform1i(U('uOut'),2);gl.uniform1i(U('uNG'),pk.ng);gl.uniform1i(U('uN'),N);gl.uniform1i(U('uNl'),Nl);
    gl.uniform1f(U('uD'),M.d);gl.uniform1f(U('uT'),M.T);gl.uniform1f(U('uKx'),M.kx);gl.uniform1f(U('uKy'),M.ky);gl.uniform1f(U('uS2'),s2);gl.uniform1f(U('uKbm'),pk.kbm);gl.uniform1f(U('uGain'),gain)};
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,L.tSB);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,L.tGR);
  gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.viewport(0,0,Nl,Nl);set(L.pPix);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(!bench){gl.viewport(0,0,N,N);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,L.tOut);set(L.pTone);gl.drawArrays(gl.TRIANGLES,0,3)}  /* bench: the speed test leaves the visible canvas alone */
  /* resolve when the GPU has finished, polling a fence so the page never blocks on it */
  const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
  return new Promise(res=>{const poll=()=>{const r=gl.clientWaitSync(fence,0,0);if(r===gl.TIMEOUT_EXPIRED)setTimeout(poll,1);else{gl.deleteSync(fence);res()}};poll()})}
function glRead(L){const gl=L.gl,N=L.N,a=new Float32Array(N*N*4);gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,a);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  /* GL rows run bottom-up: flip to top-down like the other backends */
  const o=new Float32Array(N*N*4);for(let j=0;j<N;j++)o.set(a.subarray((N-1-j)*N*4,(N-j)*N*4),j*N*4);return o}

