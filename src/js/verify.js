/* ---------- verification: every rendered quantity checked against an independent computation ---------- */
function simpson(f,a,b,n){n+=n%2;const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3}
function quadSpec(fn,delta){/* ∫ S(σ)·fn(σ) dσ, lines exact, Gaussians by Simpson over ±8w with ≥40 points per fringe */
  let s=0;for(const c of act()){if(!c.f){s+=P(c)*fn(c.s);continue}const w=wOf(c),n=clamp(Math.ceil(16*w*Math.abs(delta)*40),4000,400000);s+=simpson(sg=>dens(c,sg)*fn(sg),c.s-8*w,c.s+8*w,n)}return s}
async function verify(){
  const cs=act(),out=[];if(!cs.length){$('ver').innerHTML='<tr><td colspan="4" class="empty">Switch on at least one component.</td></tr>';return}
  const A=Itot(cs),SL=sublines(),R=RANGE(),d0=D0(),M=ringModel(),fmt=v=>v===0?'0':v.toExponential(2);
  const row=(name,what,err,tol)=>out.push(`<tr><td>${name}</td><td>${what}</td><td>${fmt(err)}</td><td>${fmt(tol)}</td><td style="color:${err<=tol?'#1a8f4a':'#e0115f'};font-weight:700">${err<=tol?'pass':'FAIL'}</td></tr>`);
  /* 1 interferogram closed form vs direct numerical integration of ½∫S(1+cos) */
  let e1=0;const Dm=Math.max(R,Math.abs(d0));for(let i=0;i<=24;i++){const d=Dm*i/24,Ia=0.5*(1+gamma(d,cs)[0]),Iq=quadSpec(sg=>0.5*(1+Math.cos(2*Math.PI*sg*d)),d)/A;e1=Math.max(e1,Math.abs(Ia-Iq))}
  row('Interferogram','closed-form I(δ) vs numerical ½∫S(σ)[1+cos 2πσδ]dσ, 25 OPDs',e1,1e-6);
  /* 2 interfered spectrum identity */
  const Io=quadSpec(sg=>0.5*(1+Math.cos(2*Math.PI*sg*d0)),d0)/A,e2=Math.abs(Io-0.5*(1+gamma(d0,cs)[0]));
  row('Interfered spectrum','∫S_out(σ;δ₀)dσ vs I(δ₀)',e2,1e-6);
  /* 3 sub-band model vs analytic fringe term over every OPD the page can show */
  let hiD=Math.max(R,Math.abs(d0),2*Math.abs(M.d)+1.42*(Math.abs(M.kx)+Math.abs(M.ky))),e3=0;
  for(let i=0;i<=6000;i++){const d=hiD*i/6000;let v=0;for(const o of SL)v+=o.p*avgTerm(o.ka,o.kb,d,0);e3=Math.max(e3,Math.abs(v/A-gamma(d,cs)[0]))}
  row('Colour sub-bands','Σ sub-band fringe terms vs Re γ(δ), 0 ≤ δ ≤ '+F(hiD,3)+' µm',e3,1e-3);
  /* 4 colour: sub-band XYZ vs full spectral integral with the CVRL functions */
  let e4=0;for(const d of [0,d0,R/2]){const q=[0,1,2].map(k=>quadSpec(sg=>0.5*(1+Math.cos(2*Math.PI*sg*d))*visXYZ(1000/sg)[k],d)),sb=xyzAt(d,0,SL);
    e4=Math.max(e4,Math.hypot(sb[0]-q[0],sb[1]-q[1],sb[2]-q[2])/Math.max(1e-12,Math.hypot(...q)))}
  row('Colour (XYZ)','sub-band XYZ vs ∫S·½(1+cos)·x̄ȳz̄ dσ at δ = 0, δ₀, δmax/2 (relative)',e4,1e-2);
  /* 5 rendered ring pixels vs brute-force 2-D integration of the exact pattern over each pixel's footprint */
  if(RB.benchP)await RB.benchP;  /* a running speed test may still switch the renderer */
  ringLive=false;if(RB.active==='workers'){renderRing();if(RB.wDone)await RB.wDone}else{while(RB.busy)await RB.done;renderRing(true);if(RB.done)await RB.done}await ringReadback();let e5=0;const N=ring.width,hN=N/2,sd=PIXSD*2/N;
  for(const[fi,fj]of [[0.5,0.5],[0.503,0.497],[0.508,0.512],[0.75,0.5],[0.675,0.325],[0.15,0.3],[0.972,0.475],[0.6,0.95]]){const i0=Math.floor(fi*N),j0=Math.floor(fj*N);const u0=(i0+0.5-hN)/hN,v0=-(j0+0.5-hN)/hN;
    const gr=M.grad(u0,v0),fr=8*sd*Math.hypot(...gr)*Math.max(...SL.map(o=>o.s)),n=clamp(Math.ceil(fr*12)+21,21,801);
    let sw=0,si=0;for(let a=0;a<n;a++){const du=-4*sd+8*sd*a/(n-1),wa=Math.exp(-0.5*(du/sd)**2);for(let b=0;b<n;b++){const dv=-4*sd+8*sd*b/(n-1),wt=wa*Math.exp(-0.5*(dv/sd)**2);si+=wt*0.5*(1+gamma(M.opd(u0+du,v0+dv),cs)[0]);sw+=wt}}
    e5=Math.max(e5,Math.abs(Ibuf[j0*N+i0]-si/sw))}
  row('Ring pixels',`rendered pixel intensity (${beName(RB.active)}) vs brute-force 2-D integral of the exact pattern over its footprint, 8 pixels`,e5,1e-3);
  /* 6 coherence */
  const C=coherence();
  if(isFinite(C.hw)){row('Coherence (HWHM)','|γ(l_c)| − ½ at the reported value',Math.abs(Math.hypot(...gamma(C.hw,cs))-0.5),1e-3)}
  if(isFinite(C.mandel)){const wmin=Math.min(...cs.map(wOf)),L=7/(Math.PI*wmin),spread=Math.max(...cs.map(c=>c.s))-Math.min(...cs.map(c=>c.s))+0.01,n=clamp(Math.ceil(2*L*spread*40),20000,2000000);
    const num=simpson(d=>{const g2=gamma(d,cs);return g2[0]*g2[0]+g2[1]*g2[1]},-L,L,n);row('Coherence (Mandel)','closed form vs numerical ∫|γ|²dδ (relative)',Math.abs(num-C.mandel)/C.mandel,1e-4)}
  if(cs.length===1&&cs[0].f){row('Single Gaussian','numerical HWHM vs (2 ln2/π)/Δσ (relative)',Math.abs(C.hw-2*LN2/(Math.PI*cs[0].f))/(2*LN2/(Math.PI*cs[0].f)),1e-3)}
  /* 7 auto range follows its stated definition */
  const gs=cs.filter(c=>c.f);if(gs.length){const sOPD=settleOPD(),b=gs.reduce((t,c)=>t+P(c)*Math.exp(-((Math.PI*wOf(c)*sOPD)**2)),0)/A;
    if(sOPD>3/(cs.reduce((t,c)=>t+c.s*P(c),0)/A)+1e-9&&b<0.02+1e-9&&Itot(gs)/A>0.02)row('Auto range','Σ I_g e^{−(πw_gδ_s)²}/I_tot − 0.02 at the settle point',Math.abs(b-0.02),1e-6)}
  /* 8 sweep (MS-14): step the mirror from −range with uneven frame times until it turns at +range; the pass, less the clipped
     last step cut at the turn, must take the set time, and the speed readout must equal the distance over that time */
  {const m=DMAX();let v=-m,dir=1,t=0,s=12345,dt=0;while(dir>0){s=s*16807%2147483647;dt=0.005+0.035*s/2147483647;const v0=v;[v,dir]=sweepStep(v,dir,dt,m,SWT);t+=dir>0?dt:(m-v0)/(2*m/SWT)}
    row('Sweep','one pass from −range to +range with uneven frames vs the set time, and the speed readout vs 2·range / that time (relative)',Math.max(Math.abs(t-SWT)/SWT,Math.abs(sweepV()-2*m/t)/sweepV()),1e-9)}
  /* 9 copy image: the PNG decoded again vs the displayed interferogram pixels (8-bit levels; PNG is lossless) */
  row('Copied image','interferogram PNG, decoded again, vs the displayed plot pixels (largest 8-bit difference)',await copyCheck(),0);
  $('ver').innerHTML=out.join('');$('verAt').textContent=`Last run: ${cs.length} component${cs.length>1?'s':''}, d = ${F(+$('d').value,4)} µm, tilt (${$('tx').value}, ${$('ty').value}) µrad, θmax = ${$('fov').value}°.`}

/* ---------- coherence ---------- */
function coherence(){
  const cs=act(),A=Itot(cs);if(!A)return null;
  const ss=cs.map(c=>c.s),spread=Math.max(...ss)-Math.min(...ss)+4*Math.max(...cs.map(wOf))+0.002;
  const step=Math.min(0.5,1/(30*spread)),LMAX=5000;let hw=Infinity,prev=1;
  for(let d=step;d<=LMAX;d+=step){const[re,im]=gamma(d,cs),m=Math.hypot(re,im);if(m<=0.5){hw=d-step*(0.5-m)/Math.max(1e-9,prev-m);break}prev=m}
  let mandel=Infinity;if(cs.every(c=>c.f>0)){mandel=0;for(const a of cs)for(const b of cs){const s2=wOf(a)**2+wOf(b)**2;mandel+=P(a)*P(b)*Math.exp(-((a.s-b.s)**2)/s2)/Math.sqrt(Math.PI*s2)}mandel/=A*A}
  return{hw,mandel,A}}
const um=v=>!isFinite(v)?'∞':v>=1000?(v/1000).toPrecision(3)+' mm':v.toPrecision(3)+' µm';

/* ---------- equations ---------- */
/* live equations: aligned rows of EQK() terms, 2 when the window is at least 900 px wide (it halves the height), otherwise 1,
   so nothing needs sideways scrolling; at most ML terms, then "+ ⋯ (n more)" */
const ML=8,more=n=>n>ML?`\\\\&\\quad+\\cdots\\ (\\text{${n-ML} more})`:'';
const EQK=()=>window.innerWidth>=900?2:1;
const rows=(lhs,first,terms,k=EQK())=>{const t=terms.slice(0,ML);let o=`\\begin{aligned}${lhs}&=${first}`,i=0;
  if(k>1&&t.length)o+=`+${t[i++]}`;for(;i<t.length;i+=k)o+=`\\\\&\\quad+`+t.slice(i,i+k).join('+');return o+more(terms.length)+'\\end{aligned}'};
function eqs(){
  const d=+$('d').value,d0=D0(),cs=act(),A=Itot(cs),ax=+$('tx').value,ay=+$('ty').value;
  const ids=['eqS','eqI','eqP','eqO','eqC'];
  if(!cs.length){ids.filter(k=>$(k)).forEach(k=>$(k).innerHTML='<div class="empty">Add (or switch on) a wavelength to see the equations.</div>');$('coh').innerHTML='';return}
  const G=c=>`${F(c.a)}\\,e^{-(\\sigma-${F(c.s,4)})^2/${F(wOf(c))}^2}`;
  const sT=cs.map(c=>c.f?G(c):`${F(P(c))}\\,\\delta_D(\\sigma-${F(c.s,4)})`);
  const iT=arg=>cs.map(c=>c.f?`\\tfrac{${F(P(c))}}{2}e^{-(\\pi\\,${F(wOf(c))}\\,${arg})^2}\\cos(2\\pi\\,${F(c.s,4)}\\,${arg})`:`\\tfrac{${F(P(c))}}{2}\\cos(2\\pi\\,${F(c.s,4)}\\,${arg})`);
  const lines=cs.filter(c=>!c.f),gs=cs.filter(c=>c.f),T=s=>0.5*(1+Math.cos(2*Math.PI*s*d0));
  const set=(k,t)=>{if($(k))$(k).innerHTML='$$'+t+'$$'};
  set('eqS',rows('S(\\sigma)',sT[0],sT.slice(1)));
  set('eqI',rows('I(\\delta)',`\\tfrac{${F(A)}}{2}`,iT('\\delta')));
  const tl=(ax||ay)?`${ax?(ax>0?'+':'-')+F(Math.abs(0.002*ax))+'\\,x':''}${ay?(ay>0?'+':'-')+F(Math.abs(0.002*ay))+'\\,y':''}`:'';
  set('eqP',rows('I(x,y)',`\\tfrac{${F(A)}}{2}`,iT('\\delta')).replace('\\end{aligned}',`\\\\[4pt]\\delta(x,y)&=${F(2*d)}\\cos\\theta${tl}\\end{aligned}`)+(tl?'\\\\ \\small (x,y\\ \\text{in mm})':''));
  const oT=lines.map(c=>`${F(P(c)*T(c.s))}\\,\\delta_D(\\sigma-${F(c.s,4)})`).concat(gs.map(c=>`T(\\sigma)\\,${G(c)}`));
  set('eqO',rows(`S_{\\rm out}(\\sigma;${F(d0)})`,oT[0],oT.slice(1),gs.length?1:EQK())+(gs.length?`\\\\ T(\\sigma)=\\tfrac12\\big[1+\\cos(2\\pi\\sigma\\cdot ${F(d0)})\\big]`:''));
  const C=coherence();
  $('coh').innerHTML=`<div class="stat"><div class="v">${um(C.hw)}</div><div class="k">HWHM of |γ(δ)|, numerical</div></div><div class="stat"><div class="v">${um(C.mandel)}</div><div class="k">Mandel ∫|γ|²dδ${isFinite(C.mandel)?'':' (diverges with a pure line)'}</div></div>`+
    gs.map(c=>`<div class="stat"><div class="v">${um(2*LN2/(Math.PI*c.f))}</div><div class="k"><span class="sw" style="background:${col(c)}"></span> Gaussian at ${(1000/c.s).toFixed(1)} nm alone</div></div>`).join('');
  const gT=cs.map(c=>c.f?`\\tfrac{${F(P(c))}}{${F(A)}}e^{-(\\pi ${F(wOf(c))}\\delta)^2}e^{i2\\pi ${F(c.s,4)}\\delta}`:`\\tfrac{${F(P(c))}}{${F(A)}}e^{i2\\pi ${F(c.s,4)}\\delta}`);
  const hw=`l_c^{\\rm HWHM}&=${isFinite(C.hw)?F(C.hw)+'\\ \\mu\\text{m}':'>5\\ \\text{mm}'}`;
  set('eqC',isFinite(C.mandel)?`\\begin{aligned}l_c^{\\rm Mandel}&=\\frac{1}{I_{\\rm tot}^2}\\sum_{m,n}\\frac{I_mI_n\\,e^{-(\\sigma_m-\\sigma_n)^2/(w_m^2+w_n^2)}}{\\sqrt{\\pi(w_m^2+w_n^2)}}\\\\&=${F(C.mandel)}\\ \\mu\\text{m}\\\\${hw}\\end{aligned}`
    :rows('\\gamma(\\delta)',gT[0],gT.slice(1)).replace('\\end{aligned}',`\\\\[4pt]${hw}\\end{aligned}`));
  if(window.MathJax&&MathJax.typesetPromise){const els=ids.map($).filter(Boolean);MathJax.typesetClear(els);MathJax.typesetPromise(els).catch(()=>{})}
}

