
const LN2=Math.log(2),KW=2*Math.sqrt(LN2),LMIN=380,LMAX=800,SMIN=1000/LMAX,SMAX=1000/LMIN,AMM=5;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* CVRL CIE 2006 2-degree XYZ colour-matching functions (CIE 170-2:2015), 390–780 nm in 5 nm steps */
const CMF=[0.00377,0.0004146,0.01847,0.009383,0.00106,0.0461,0.02214,0.002452,0.1096,0.04743,0.004972,0.2369,0.08954,0.00908,0.4508,0.1446,0.01429,0.7379,0.2036,0.02027,1.052,0.2489,0.02612,1.305,0.2918,0.03319,1.553,0.3227,0.04158,1.748,0.3483,0.05034,1.917,0.3418,0.05743,1.918,0.3225,0.06472,1.849,0.2827,0.07238,1.664,0.2485,0.08515,1.522,0.222,0.106,1.428,0.1807,0.1299,1.251,0.1292,0.1535,0.9992,0.08183,0.1788,0.7552,0.04601,0.2065,0.5617,0.02084,0.2379,0.4099,0.007098,0.2851,0.3106,0.002462,0.3484,0.2377,0.003649,0.4278,0.172,0.01557,0.5205,0.1177,0.04315,0.6206,0.08284,0.07963,0.7181,0.0565,0.1268,0.7946,0.03752,0.1818,0.8576,0.02438,0.2405,0.9071,0.01566,0.3098,0.9545,0.009846,0.3804,0.9814,0.006131,0.4494,0.989,0.00379,0.528,0.9995,0.002327,0.6134,0.9968,0.001432,0.7017,0.9903,0.0008823,0.7968,0.9733,0.0005452,0.8853,0.9425,0.0003387,0.9638,0.8964,0.0002118,1.051,0.8587,0.0001335,1.11,0.8116,8.494e-05,1.144,0.7545,5.461e-05,1.151,0.6919,3.55e-05,1.135,0.627,2.335e-05,1.084,0.5584,1.555e-05,1.007,0.4896,1.048e-05,0.9143,0.423,0,0.8136,0.3609,0,0.6925,0.2981,0,0.5755,0.2417,0,0.4731,0.1943,0,0.3845,0.1547,0,0.2997,0.1193,0,0.2278,0.0898,0,0.1708,0.06671,0,0.1264,0.049,0,0.09225,0.0356,0,0.0664,0.02554,0,0.04711,0.01808,0,0.03292,0.01262,0,0.02262,0.008661,0,0.01575,0.006028,0,0.01097,0.004196,0,0.007609,0.002911,0,0.005215,0.001996,0,0.003569,0.001367,0,0.002465,0.0009447,0,0.001704,0.0006537,0,0.001186,0.0004556,0,0.000827,0.000318,0,0.0005758,0.0002217,0,0.0004058,0.0001566,0,0.0002857,0.0001104,0,0.0002022,7.827e-05,0,0.0001438,5.579e-05,0,0.0001025,3.982e-05,0,7.348e-05,2.86e-05,0,5.26e-05,2.051e-05,0,3.806e-05,1.487e-05,0];
const MX=[[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const toLin=x=>MX.map(r=>r[0]*x[0]+r[1]*x[1]+r[2]*x[2]);
const desat=c=>{const m=Math.min(c[0],c[1],c[2]);return m<0?c.map(v=>v-m):c};
const gam=v=>{v=clamp(v,0,1);return v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055};
const hex=c=>'#'+c.map(v=>Math.round(255*gam(v)).toString(16).padStart(2,'0')).join('');
function cmf(l){if(l<390||l>780)return null;const t=(l-390)/5,i=Math.min(77,Math.floor(t)),f=t-i;return[0,1,2].map(k=>CMF[3*i+k]*(1-f)+CMF[3*(i+1)+k]*f)}
const GREY=[0.95*0.25,0.25,1.09*0.25];
const xyzOf=l=>cmf(l)||GREY;   /* marker colour only */
/* physics colour: light outside the tabulated 390–780 nm CMF range (or at σ ≤ 0) is invisible and adds nothing to XYZ,
   but it still carries power, so it counts in I_tot, the interferogram and the ring intensity */
const ZERO3=[0,0,0],visXYZ=l=>cmf(l)||ZERO3;
const norm=c=>{const m=Math.max(c[0],c[1],c[2]);return m>1e-9?c.map(v=>v/m):[0.5,0.5,0.5]};
const markHex=l=>hex(norm(desat(toLin(xyzOf(l)))));
let BARMAX=0;for(let l=390;l<=780;l++){const c=desat(toLin(cmf(l)));BARMAX=Math.max(BARMAX,...c)}
const barHex=l=>{const x=cmf(l);return x?hex(desat(toLin(x)).map(v=>v/BARMAX)):'#000000'};

const presets={
  hene:[{s:1000/632.8,a:0.85,f:0}],
  na:[{s:1000/588.995,a:0.9,f:0},{s:1000/589.592,a:0.6,f:0}],
  led:[{s:1000/450,a:1.0,f:20*1000/450**2},{s:1000/555,a:0.58,f:100*1000/555**2},{s:1000/610,a:0.25,f:90*1000/610**2}],
  two:[{s:1.55,a:0.8,f:0.06},{s:1.85,a:0.6,f:0.06}]
};
let comps=[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true}],sel=-1,drag=null;
try{const v=JSON.parse(localStorage.getItem('mich-sim-v2')||'null');
  if(v&&Array.isArray(v.c)){comps=v.c;$('d').value=v.d;if(v.fov)$('fov').value=v.fov;if(v.tx!=null){$('tx').value=v.tx;$('ty').value=v.ty}if(v.ra===false)$('rAuto').checked=false;if(v.env===false)$('envOn').checked=false}}catch(e){}
comps.forEach(c=>{if(c.on===undefined)c.on=true});
const save=()=>{try{localStorage.setItem('mich-sim-v2',JSON.stringify({c:comps,d:$('d').value,fov:$('fov').value,tx:$('tx').value,ty:$('ty').value,ra:$('rAuto').checked,rm:Rman,env:$('envOn').checked,swt:SWT}))}catch(e){}};
/* Reading computed styles or box sizes after a DOM write forces the browser to recompute style or layout, and the draw loop
   alternates reads and writes. So theme colours and plot box sizes are read once and cached: colours until the theme changes
   (CSSC, cleared in ui-loop.js), sizes until a ResizeObserver or window resize reports a change (SZC). Same values, read once. */
const CSSC=new Map(),SZC=new Map();
const css=n=>{let v=CSSC.get(n);if(v===undefined){v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();CSSC.set(n,v)}return v};
const box=el=>{let v=SZC.get(el);if(!v){v=[el.clientWidth,el.clientHeight];if(v[0])SZC.set(el,v)}return v};
const F=(x,n=3)=>{if(!isFinite(x))return'\\infty';if(x===0)return'0';return String(Number(x.toPrecision(n)))};
const wOf=c=>c.f/KW;
/* Heights are what you see: a Gaussian's height a_n is its peak spectral density, so its power is the area under its curve,
   I_n = a_n·√π·w_n. A line's height a_n is drawn as if spread over the narrowest Gaussian the editor allows
   (FWHM 0.008 µm⁻¹, where dragging snaps back to a line), I_n = a_n·√π·w_0, so the power is continuous when a line widens into a Gaussian. */
const F0=0.008,W0=F0/KW,P=c=>c.a*Math.sqrt(Math.PI)*(c.f?wOf(c):W0);
const act=()=>comps.filter(c=>c.on);
const D0=()=>2*(+$('d').value);
let Rauto=50,Rman=91;  /* interferogram half-range (µm): automatic, or manual once the user zooms */
const RANGE=()=>$('rAuto').checked?Rauto:Rman;
let SWT=8;  /* sweep: seconds for one pass from −range to +range (MS-14), 0.5–600 s */
const SWTset=t=>{if(t>0)SWT=clamp(t,0.5,600)};
try{const v=JSON.parse(localStorage.getItem('mich-sim-v2')||'null');if(v&&v.rm)Rman=v.rm;if(v&&v.swt)SWTset(+v.swt)}catch(e){}
const col=c=>markHex(1000/c.s);
function gamma(d,cs=act()){let re=0,im=0,A=0;for(const c of cs){const w=wOf(c),pc=P(c),e=w?pc*Math.exp(-((Math.PI*w*d)**2)):pc,p=2*Math.PI*c.s*d;re+=e*Math.cos(p);im+=e*Math.sin(p);A+=pc}  /* a line (w = 0) has e^0 = 1 exactly */
  return A?[re/A,im/A]:[0,0]}
/* gamma for many OPDs of one spectrum (the range plots): the per-component constants are taken out of the loop and no array is
   allocated. Each term is the same expression as in gamma(), in the same order (Math.PI*w*d = (Math.PI*w)*d and
   2*Math.PI*c.s*d = (2*Math.PI*c.s)*d), so re() and mag() equal gamma()[0] and |gamma()| bit for bit. re() skips the sines. */
function gammaOf(cs){const n=cs.length,W=new Float64Array(n),PC=new Float64Array(n),PW=new Float64Array(n),TS=new Float64Array(n);let A=0;
  cs.forEach((c,i)=>{W[i]=wOf(c);PC[i]=P(c);PW[i]=Math.PI*W[i];TS[i]=2*Math.PI*c.s;A+=PC[i]});
  const e=(i,d)=>W[i]?PC[i]*Math.exp(-((PW[i]*d)**2)):PC[i];
  return{re(d){if(!A)return 0;let re=0;for(let i=0;i<n;i++)re+=e(i,d)*Math.cos(TS[i]*d);return re/A},
    mag(d){if(!A)return 0;let re=0,im=0;for(let i=0;i<n;i++){const ei=e(i,d),p=TS[i]*d;re+=ei*Math.cos(p);im+=ei*Math.sin(p)}return Math.hypot(re/A,im/A)}}}
const shape=(c,s)=>c.f?c.a*Math.exp(-4*LN2*(s-c.s)**2/(c.f*c.f)):0;
const dens=(c,s)=>c.f?c.a*Math.exp(-(((s-c.s)/wOf(c))**2)):0;
/* combined continuous spectrum: the sum of the Gaussian outlines exactly as drawn (no rescaling) */
function trueShape(){const g=act().filter(c=>c.f);if(!g.length)return null;return s=>g.reduce((t,c)=>t+shape(c,s),0)}
/* vertical scale of the spectrum plots: 0–1, extended (in steps of 0.25, just above the combined peak) only when overlapping components add more than 5% above 1; frozen while dragging */
let YM=1;function calcYM(){if(drag)return YM;const ts=trueShape();let m=Math.max(1,...act().map(c=>c.a));
  if(ts)for(let i=0;i<=1400;i++)m=Math.max(m,ts(1000/(LMIN+(LMAX-LMIN)*i/1400)));return YM=m>1.05?Math.ceil(m*1.04/0.25)*0.25:1}
/* sub-bands: each Gaussian is split into K narrower Gaussians (width = their spacing; 15 ≤ K ≤ 241, see below) so colour mixing across its band is physical.
   Giving each sub-band its own coherence envelope keeps the sum equal to the analytic Gaussian (error < 1e-4) at every OPD;
   bare delta-function sub-lines would falsely "revive" interference at delta ~ 1/spacing. */
const SPAN=2.8;let slKey='',slVal=null;
function sublines(){const key=JSON.stringify(act().map(c=>[c.s,c.a,c.f]));if(key===slKey)return slVal;slKey=key;const out=[];let gi=0;for(const c of act()){gi++;if(!c.f){out.push({s:c.s,p:P(c),w:0,g:gi,pka:0});continue}
  /* sub-band count: at least 15, and fine enough that each sub-band is ≤ 0.012 µm⁻¹ wide (≈ 3.5 nm at 550 nm), max 241; spans ±2.8w */
  const w=wOf(c),K=clamp(Math.ceil(2*SPAN*w/0.012)+1,15,241),dx=2*SPAN/(K-1),wc=Math.sqrt(1-dx*dx),pka=(Math.PI*w)**2;let ws=[],t=0;
  for(let k=0;k<K;k++){const x=-SPAN+dx*k,g=Math.exp(-((x/wc)**2));ws.push([c.s+x*w,g]);t+=g}
  for(const[s,g]of ws)out.push({s,p:P(c)*g/t,w:dx*w,g:gi,pka})}
  for(const o of out){o.X=bandXYZ(o.s,o.w);o.ka=(Math.PI*o.w)**2;o.kb=2*Math.PI*o.s}slVal=out;return out}
/* XYZ of one sub-band: its own Gaussian shape integrated against the CVRL functions (Simpson, 41 points over ±3.5 w_s) */
function bandXYZ(s,ws){if(!ws)return visXYZ(1000/s);const n=40,a=s-3.5*ws,h=7*ws/n,X=[0,0,0];let tw=0;
  for(let i=0;i<=n;i++){const sg=a+i*h,wt=(i===0||i===n?1:(i%2?4:2))*Math.exp(-(((sg-s)/ws)**2)),x=visXYZ(1000/sg);X[0]+=wt*x[0];X[1]+=wt*x[1];X[2]+=wt*x[2];tw+=wt}return X.map(v=>v/tw)}

