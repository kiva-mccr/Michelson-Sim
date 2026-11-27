/* Timing: the tilted (non-radial) image costs one exact pixel average per block. While moving, the block size comes from the
   adaptive preview below. At rest, the full-resolution image is computed in ~12 ms slices between frames,
   sharpening top-down, so the page never blocks; a newer render cancels an unfinished one. Verification renders synchronously. */
let ringJob=0;
/* Adaptive preview resolution (MS-10, MS-11), while anything is moving (dragging, sweeping, scrolling). At rest the image is
   always rendered at every pixel, exactly. While moving, each path renders an Nl×Nl grid of exact footprint averages, Nl any
   whole number from N/16 to N, each over a block of k = N/Nl device pixels, and scales it up.
   Cost model: a frame costs t ≈ a·(N/k)^p (p = 1 for the radial pattern, 2 otherwise). After every preview frame the measured
   time updates a (running average in log space), and the next scale is the one predicted to take 90% of the budget B:
   k* = N/(0.9·B/a)^(1/p), the same as k·(t/0.9B)^(1/p) from the last frame. It goes coarser at once and finer half the way
   (in log space) per frame, so noisy timings don't make it flicker. Measurements expire after 3 s and reset when the number of
   sub-bands changes.
   Budget: the base is MS-10's (CPU: what is left of a display frame after the plots, at least 6 ms or 60% of the plots' time;
   GPU: 85% of a display frame). MS-11 adds time when the picture moves slowly: what matters is that the motion looks as smooth
   as it would at the display's rate, so a frame may take as long as the fringes need to move one preview pixel (k device px),
   T = k / v, up to 100 ms (50 ms on the main-thread CPU, which blocks the page). B = base + (T − FR) when T > FR.
   The fringe speed v (device px/ms) is the largest shift |Δδ|/|∇δ| of the pattern between the last two preview frames, at 32
   points over the field (|∇δ| floored at one fringe per field radius), over their time apart. A spectrum change, or no recent
   frame, counts as fast. When the inputs stop changing for IDLE ms with the button still held, the exact image is rendered. */
const LQ={other:4,ms:0,tot:16.7,last:1,cpuR:{p:1},cpuT:{p:2},wk:{p:2},gpu:{p:2},mv:{v:Infinity,at:0,M:null,sk:''}},KMAX=16,IDLE=150;
const lqPts=(()=>{const o=[];for(const r of [0.3,0.6,0.85,1])for(let a=0;a<8;a++)o.push([r*Math.cos(a*Math.PI/4+r),r*Math.sin(a*Math.PI/4+r)]);return o})();
/* fringe speed between the previous preview frame and this one */
function lqMotion(M,N){const mv=LQ.mv,now=performance.now(),sk=JSON.stringify(sublines().map(o=>[o.s,o.p,o.w]));
  if(!mv.M||sk!==mv.sk||now-mv.at>250)mv.v=Infinity;
  else{const smax=Math.max(...sublines().map(o=>o.s),1e-9),gmin=2/(smax*N),dt=Math.max(now-mv.at,1);let disp=0;
    for(const[u,v]of lqPts){const g=M.grad(u,v),gp=Math.max(Math.hypot(g[0],g[1])*2/N,gmin);disp=Math.max(disp,Math.abs(M.opd(u,v)-mv.M.opd(u,v))/gp)}
    const vn=disp/dt;mv.v=vn>mv.v||!isFinite(mv.v)?vn:0.6*mv.v+0.4*vn}  /* faster at once, slower gradually */
  mv.M=M;mv.sk=sk;mv.at=now}
function lqBudget(k,gpu,main){const F=FR(),base=gpu?0.85*F:Math.max(6,F-LQ.other,0.6*LQ.other),v=LQ.mv.v,T=Math.min(v>0?k/v:Infinity,main?50:100);
  return base+Math.max(0,T-F)}
/* the preview grid size Nl for a path: k from the cost model and the budget, then rounded to a whole Nl */
function lqPick(key,N,gpu,main){const q=LQ[key],n=sublines().length;
  if(q.n!==n||!q.at||performance.now()-q.at>3000){q.n=n;q.a=null}
  if(q.a==null)q.k=4;  /* no fresh measurement: start coarse, the next frame's time corrects it */
  else{let k=q.k||4,kt=k;for(let it=0;it<2;it++){kt=clamp(N/Math.pow(0.9*lqBudget(k,gpu,main)/q.a,1/q.p),1,KMAX);k=kt}  /* the budget depends on k (one preview pixel of motion): two passes settle it */
    q.k=kt>=q.k?kt:Math.exp(0.5*Math.log(q.k)+0.5*Math.log(kt))}  /* coarser at once, finer half the way (log space) */
  const Nl=q.k<1.03?N:clamp(Math.round(N/q.k),Math.ceil(N/KMAX),N);LQ.last=N/Nl;return Nl}
function lqRecord(key,Nl,ms){const q=LQ[key],a=ms/Math.pow(Nl,q.p);q.a=q.a==null?a:Math.exp(0.7*Math.log(q.a)+0.3*Math.log(a));q.at=performance.now()}
/* The frame budget follows the display: FR is its refresh interval, measured from idle requestAnimationFrame steps (the 25th
   percentile, so frames slowed by our own drawing don't count), at least 16.7 ms (60 Hz; faster displays still get 60 Hz-quality
   previews) and at most 33.4 ms. It is re-measured on load, when the window is resized (it may have moved to another screen) and
   when the page becomes visible again. */
const FRM={fr:16.7,run:0};const FR=()=>FRM.fr;
function measureFrame(){const run=++FRM.run,ts=[];const step=t=>{if(run!==FRM.run)return;ts.push(t);if(ts.length<40){requestAnimationFrame(step);return}
  const d=[];for(let i=1;i<ts.length;i++){const x=ts[i]-ts[i-1];if(x>2&&x<200)d.push(x)}if(d.length<8)return;d.sort((a,b)=>a-b);FRM.fr=clamp(d[Math.floor(d.length/4)],16.7,33.4)};requestAnimationFrame(step)}
measureFrame();document.addEventListener('visibilitychange',()=>{if(!document.hidden)measureFrame()});
const showRes=(N,Nl,live)=>{const e=$('resV');if(e)e.textContent=`${Nl}²${live&&Nl<N?' preview':''}`};
