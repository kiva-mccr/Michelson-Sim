let ringKey='',ringWasLive=false;
function ringInputs(){sublines();return JSON.stringify([slKey,$('d').value,$('fov').value,$('tx').value,$('ty').value,ring.width,RB.active,...box($('prof')),document.documentElement.dataset.theme])}
function renderRingIfNeeded(){const k=ringInputs();if(k===ringKey&&!(ringWasLive&&!ringLive))return;ringKey=k;ringWasLive=ringLive;renderRing()}
/* reusable image buffers (one per size) and the small off-screen canvas for previews */
const ringImgs=new Map();function ringImg(n){let im=ringImgs.get(n);if(!im){if(ringImgs.size>6)ringImgs.clear();im=rctx.createImageData(n,n);ringImgs.set(n,im)}
  if(!RB.off)RB.off=document.createElement('canvas');if(RB.off.width!==n){RB.off.width=n;RB.off.height=n}return im}
function renderRing(sync){
  const N=ring.width,M=ringModel(),cs=act(),tilted=!!(M.kx||M.ky),job=ringJob+1;RB.wDone=null;  /* job is claimed only once this call really renders */
  const T0=performance.now();
  if(!ringLive)LQ.mv.M=null;  /* the next preview starts its motion measurement afresh */
  if(RB.active==='webgpu'||RB.active==='webgl2'){/* GPU */
    const pr=cs.length?prepSL(sublines()):{n:0,G:[],KB:[]};let gain=1;
    if(cs.length){let fX=0,fY=0,fZ=0;for(const o of sublines()){fX+=o.p*o.X[0];fY+=o.p*o.X[1];fZ+=o.p*o.X[2]}gain=1/Math.max(...desat(toLin([fX,fY,fZ])),1e-9)}
    /* one frame in flight at a time: a newer request waits and then draws the latest state. While moving, the grid size Nl
       comes from the adaptive preview; at rest Nl = N (every pixel). Each grid point is still an exact footprint average,
       over its whole block of k = N/Nl device pixels. */
    ringProfile(M);if(RB.busy&&!sync){RB.dirty=true;return}
    ringJob=job;if(ringLive)lqMotion(M,N);
    const Nl=ringLive?lqPick('gpu',N,true,false):N,k=N/Nl;showRes(N,Nl,ringLive);
    const pk=packRing(pr,M),s2=(PIXSD*2*k/N)**2;Ibuf=null;RB.busy=true;const t0=performance.now();
    let done;try{done=RB.active==='webgpu'?gpuDraw(RB.gpu,N,M,pk,s2,gain,Nl):glDraw(RB.gl,N,M,pk,s2,gain,Nl)}catch(e){RB.busy=false;console.warn(RB.active,'failed, falling back',e);if(RB.active==='webgpu')RB.gpu=null;else RB.gl=null;pickBackend('error');return}
    /* a lost device rejects the pending frame: fall back instead of leaving an unhandled rejection and a renderer stuck busy */
    const be=RB.active;
    RB.done=done.then(()=>{if(ringLive)lqRecord('gpu',Nl,performance.now()-t0);RB.busy=false;if(RB.dirty){RB.dirty=false;renderRing()}},
      e=>{RB.busy=false;RB.dirty=false;console.warn(be,'frame failed, falling back:',e&&e.message);if(be==='webgpu')RB.gpu=null;else RB.gl=null;if(RB.active===be)pickBackend(be+' frame failed')});
    return}
  const pathKey=!tilted?'cpuR':RB.active==='workers'?'wk':'cpuT';
  if(RB.active==='workers'&&tilted&&!sync&&RB.workers.busy&&ringLive){RB.workers.dirty=true;ringProfile(M);return}  /* one worker job in flight while moving */
  ringJob=job;if(RB.workers)RB.workers.busy=false;  /* a newer render supersedes any worker job in flight */
  if(ringLive)lqMotion(M,N);
  const Nl=ringLive?lqPick(pathKey,N,false,pathKey!=='wk'):N,k=N/Nl;showRes(N,Nl,ringLive);
  /* a moving preview is an Nl×Nl grid of exact block averages, drawn into a small image and scaled up smoothly, so its fixed cost shrinks with it */
  const small=Nl<N,img=ringImg(Nl),D=img.data;Ibuf=small?null:new Float32Array(N*N);
  const present=(jA,jB)=>{if(small){RB.off.getContext('2d').putImageData(img,0,0);rctx.imageSmoothingEnabled=true;rctx.imageSmoothingQuality='high';rctx.drawImage(RB.off,0,0,Nl,Nl,0,0,N,N)}else rctx.putImageData(img,0,0,0,jA,N,jB-jA)};
  if(cs.length){const SL=sublines(),pr=prepSL(SL),A=cs.reduce((t,c)=>t+P(c),0);let fX=0,fY=0,fZ=0;for(const o of SL){fX+=o.p*o.X[0];fY+=o.p*o.X[1];fZ+=o.p*o.X[2]}
    const fl=desat(toLin([fX,fY,fZ])),gain=1/Math.max(...fl,1e-9),h=N/2,px=2/N*k,sd=PIXSD*px,rc=rcut(N,k),rc2=rc*rc;
    /* grid point (j, i): one image pixel; at full resolution also the I/I_tot buffer */
    const put=(j,i,X,Y,Z,I)=>{if(j>=Nl)return;let r=MX[0][0]*X+MX[0][1]*Y+MX[0][2]*Z,g=MX[1][0]*X+MX[1][1]*Y+MX[1][2]*Z,b=MX[2][0]*X+MX[2][1]*Y+MX[2][2]*Z;const m=Math.min(r,g,b,0);
      const o=4*(j*Nl+i);D[o]=enc((r-m)*gain);D[o+1]=enc((g-m)*gain);D[o+2]=enc((b-m)*gain);D[o+3]=255;if(!small)Ibuf[j*N+i]=I/A};
    if(!tilted&&ringLive){/* moving and untilted: a radial grid at 4 samples per grid pixel, linearly interpolated (preview only) */
      const Nr=Math.ceil(1.42*h/k*4)+2,dr=1.42/(Nr-1),RX=new Float64Array(Nr),RY=new Float64Array(Nr),RZ=new Float64Array(Nr),RI=new Float64Array(Nr);
      const Nq=Math.min(Nr,Math.ceil(rc/dr)+2);  /* the table keeps its spacing dr, but stops just past rcut */
      for(let q=0;q<Nq;q++){const r=q*dr,dm=2*M.d*Math.cos(Math.atan(r*M.T)),[f1,f2,fr]=M.rad(r),v=pixVal(dm,f1,0,f2,0,fr,sd*sd,pr,true);RX[q]=v[0];RY[q]=v[1];RZ[q]=v[2];RI[q]=v[3]}
      for(let j=0;j<Nl;j++){const v=-((j+0.5)*k-h)/h;for(let i=0;i<Nl;i++){const u=((i+0.5)*k-h)/h;if(u*u+v*v>rc2){put(j,i,0,0,0,0);continue}const t=Math.hypot(u,v)/dr,q=Math.min(Nr-2,t|0),f=t-q;
        put(j,i,RX[q]+(RX[q+1]-RX[q])*f,RY[q]+(RY[q+1]-RY[q])*f,RZ[q]+(RZ[q+1]-RZ[q])*f,RI[q]+(RI[q+1]-RI[q])*f)}}}
    else{const kbm=Math.max(...SL.map(o=>o.kb)),s2=sd*sd;
      /* grid point (j, i): the exact footprint average, or 0 beyond rcut (MS-13) */
      const pix=(j,i)=>{const v=-((j+0.5)*k-h)/h,u=((i+0.5)*k-h)/h;if(u*u+v*v>rc2)return put(j,i,0,0,0,0);const r=Math.hypot(u,v),[f1,f2,fr]=M.rad(r),ux=r>1e-12?u/r:1,uy=r>1e-12?v/r:0;
        const gx=f1*ux+M.kx,gy=f1*uy+M.ky,h11=f2*ux*ux+fr*(1-ux*ux),h22=f2*uy*uy+fr*(1-uy*uy),h12=(f2-fr)*ux*uy,quad=!ringLive&&kbm*s2*Math.max(Math.abs(f2),Math.abs(fr))>=3e-4;  /* the second-order correction only in the at-rest pass */
        const p=pixVal(M.opd(u,v),gx,gy,h11,h12,h22,s2,pr,quad);put(j,i,p[0],p[1],p[2],p[3])};
      const rows=(j0,j1)=>{for(let j=j0;j<j1;j++)for(let i=0;i<Nl;i++)pix(j,i)};
      if(!tilted){/* at rest and untilted (MS-15): the pattern and the pixel grid share the square's 8 symmetries (u → −u, v → −v, u ↔ v),
          so only the octant 0 ≤ i ≤ j < N/2 is evaluated, exactly as above, and each value is copied to its 8 mirror pixels. */
        const n=N-1,H=Math.ceil(N/2);
        const cp=(o,a)=>{D[a]=D[o];D[a+1]=D[o+1];D[a+2]=D[o+2];D[a+3]=255};
        const oct=(j0,j1)=>{for(let j=j0;j<j1;j++)for(let i=0;i<=j;i++){pix(j,i);const o=4*(j*N+i),I=Ibuf[j*N+i];
          for(const m of [j*N+n-i,(n-j)*N+i,(n-j)*N+n-i,i*N+j,i*N+n-j,(n-i)*N+j,(n-i)*N+n-j]){cp(o,4*m);Ibuf[m]=I}}};
        if(sync)oct(0,H);
        else{/* progressive, in 12 ms slices; RB.wDone resolves when done or superseded (the checks await it on the workers renderer) */
          let j=0,done;RB.wDone=new Promise(r=>done=r);const slice=()=>{if(job!==ringJob)return done();const t0=performance.now();while(j<H&&performance.now()-t0<12){oct(j,j+1);j++}
            present(0,N);if(j<H)setTimeout(slice,0);else done()};
          slice();ringProfile(M);return}}
      else if(RB.active==='workers'&&!sync){/* split the grid rows over every worker; each block is painted as it arrives */
        const W=RB.workers,id=++W.job,blk=8,t0=performance.now(),live=ringLive;let pending=0,next=0,done;RB.wDone=new Promise(r=>done=r);W.busy=true;
        const msg={N,Nl,rc2,d:M.d,T:M.T,kx:M.kx,ky:M.ky,s2:sd*sd,kbm,pr:{n:pr.n,P:pr.P,KA:pr.KA,KB:pr.KB,X:pr.X,Y:pr.Y,Z:pr.Z,G:pr.G}};
        const send=w=>{if(next>=Nl)return;const j0=next,j1=Math.min(Nl,next+blk);next=j1;pending++;w.postMessage({...msg,id,j0,j1})};
        W.pool.forEach(w=>{w.onmessage=e=>{const r=e.data;if(r.id!==W.job||job!==ringJob)return;pending--;let o=0;
          for(let j=r.j0;j<r.j1;j++)for(let i=0;i<Nl;i++){put(j,i,r.out[o],r.out[o+1],r.out[o+2],r.out[o+3]);o+=4}
          present(r.j0,r.j1);send(w);if(!pending){if(live)lqRecord('wk',Nl,performance.now()-t0);W.busy=false;done();if(W.dirty){W.dirty=false;renderRing()}}};send(w)});
        ringProfile(M);return}
      else if(ringLive||sync)rows(0,Nl);
      else{/* progressive full-resolution pass */
        let j=0;const slice=()=>{if(job!==ringJob)return;const t0=performance.now(),jj=j;while(j<N&&performance.now()-t0<12){rows(j,j+4);j+=4}
          present(jj,Math.min(j,N));if(j<N)setTimeout(slice,0)};
        slice();ringProfile(M);return}}
  }else{D.fill(0);for(let o=3;o<D.length;o+=4)D[o]=255}
  present(0,N);ringProfile(M);if(ringLive&&cs.length)lqRecord(pathKey,Nl,performance.now()-T0);LQ.ms=performance.now()-T0}
function ringProfile(M){const cs=act();
  /* profile cut: through the centre along the tilt direction n = (αx, αy)/|α| (along x when there is no tilt) */
  const ax=+$('tx').value,ay=+$('ty').value,an=Math.hypot(ax,ay),nx=an?ax/an:1,ny=an?ay/an:0,phi=Math.atan2(ny,nx)*180/Math.PI;
  const svg=$('prof'),[W,H]=box(svg);if(!W)return;
  const pl=46,pr2=10,pt=10,pb=42,x=u=>pl+(u+1)/2*(W-pl-pr2),y=v=>pt+(1-v)*(H-pt-pb),mute=css('--mute');
  let s='';for(const v of [0,0.5,1])s+=`<line x1="${pl}" x2="${W-pr2}" y1="${y(v)}" y2="${y(v)}" stroke="${mute}" stroke-opacity="${v?0.15:0.5}"/><text x="${pl-6}" y="${y(v)+4}" font-size="12" fill="${mute}" text-anchor="end">${v}</text>`;
  for(const u of [-1,-0.5,0,0.5,1]){const t=Math.sign(u)*M.th(Math.abs(u))*180/Math.PI;s+=`<text x="${x(u)}" y="${H-pb+16}" font-size="12" fill="${mute}" text-anchor="${u<-0.9?'start':u>0.9?'end':'middle'}">${F(t,2)}°</text>`}
  /* same anti-aliased range plot as the interferogram, along the cut */
  {const pc=$('profC'),dpr=window.devicePixelRatio||1,cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(pc.width!==cw||pc.height!==ch){pc.width=cw;pc.height=ch}  /* resizing a canvas reallocates it: only when the size changes */const pg=pc.getContext('2d');pg.clearRect(0,0,pc.width,pc.height);
    if(cs.length){const col=cssRGB('--fr'),t0=performance.now(),K=dpK();densityPlot(pg,Math.round(pl*dpr),Math.round(pt*dpr),Math.round((W-pl-pr2)*dpr),Math.round((H-pt-pb)*dpr),t=>{const u=-1+2*t;return M.opd(u*nx,u*ny)},cs,()=>col);if(ringLive)dpRecord(K,performance.now()-t0)}}
  s+=`<text x="${(pl+W-pr2)/2}" y="${H-4}" font-size="12" fill="${mute}" text-anchor="middle">${an?`θ along the tilt direction (${F(phi,3)}° from x)`:"θ along x"}</text><text transform="translate(12 ${(pt+H-pb)/2}) rotate(-90)" font-size="12" fill="${mute}" text-anchor="middle">I / I_tot</text>`;svg.innerHTML=s}

