/* ---------- ring pattern ----------
   Screen point (u,v) in [-1,1]^2 (r = 1 at the edge of the field). Lens mapping: tan(theta) = r tan(theta_max).
   Mirror-plane coordinates for the tilt wedge: x = a u, y = a v, a = L tan(theta_max), L = 28.4 mm (a = 5 mm at 10°).
   OPD: delta(u,v) = 2 d cos(theta) + 2 (alpha_x x + alpha_y y). Every pixel is the exact footprint average above.
   With zero tilt the pattern is radial, so it is evaluated on a radial grid at 16 samples per pixel (4 while moving) and linearly interpolated. */
const ring=$('ring'),rctx=ring.getContext('2d');let ringLive=false,Ibuf=null;
function ringModel(){const d=+$('d').value,tm=(+$('fov').value)*Math.PI/180,T=Math.tan(tm),aE=AMM*T/Math.tan(10*Math.PI/180),kx=2e-3*(+$('tx').value)*aE,ky=2e-3*(+$('ty').value)*aE;
  return{d,T,kx,ky,
    th:r=>Math.atan(r*T),
    opd(u,v){const r=Math.hypot(u,v);return 2*d*Math.cos(Math.atan(r*T))+kx*u+ky*v},
    ddr(r){const th=Math.atan(r*T);return -2*d*Math.sin(th)*T/(1+(r*T)**2)},
    rad(r){const th=Math.atan(r*T),q=1+r*r*T*T,c=T/q,cp=-2*r*T**3/(q*q),f1=-2*d*Math.sin(th)*c,f2=-2*d*(Math.cos(th)*c*c+Math.sin(th)*cp);return[f1,f2,r>1e-12?f1/r:f2]},
    grad(u,v){const r=Math.hypot(u,v);if(r<1e-12)return[kx,ky];const g=this.ddr(r);return[g*u/r+kx,g*v/r+ky]}}}
/* groups: one per parent component, with its constant (non-fringe) XYZ. A Gaussian's fringe term is skipped only when
   e^{-a_parent·δmin²} < e^{-30} for every OPD in the footprint (δmin = |δ̄| − 5τ), i.e. below 1e-13. */
function prepSL(SL){const n=SL.length,o={n,P:new Float64Array(n),KA:new Float64Array(n),KB:new Float64Array(n),X:new Float64Array(n),Y:new Float64Array(n),Z:new Float64Array(n),G:[]};
  SL.forEach((s,k)=>{o.P[k]=0.5*s.p;o.KA[k]=s.ka;o.KB[k]=s.kb;o.X[k]=s.X[0];o.Y[k]=s.X[1];o.Z[k]=s.X[2];
    let g=o.G[o.G.length-1];if(!g||g.id!==s.g){g={id:s.g,a:k,b:k+1,pka:s.pka,cX:0,cY:0,cZ:0,cI:0};o.G.push(g)}g.b=k+1;g.cX+=o.P[k]*s.X[0];g.cY+=o.P[k]*s.X[1];g.cZ+=o.P[k]*s.X[2];g.cI+=o.P[k]});
  /* lin: the k_b step of a group whose sub-bands share a and are evenly spaced in k_b (every split Gaussian), for pixVal's fast path */
  for(const g of o.G){g.lin=0;const n=g.b-g.a;if(n<3)continue;const D=(o.KB[g.b-1]-o.KB[g.a])/(n-1);let ok=D!==0;
    for(let k=g.a;k<g.b&&ok;k++)ok=o.KA[k]===o.KA[g.a]&&Math.abs(o.KB[k]-(o.KB[g.a]+(k-g.a)*D))<=1e-12*Math.abs(o.KB[k]);if(ok)g.lin=D}
  return o}
/* Second-order footprint average. Over a Gaussian footprint Δ ~ N(0, s²I) the OPD is expanded to second order,
   δ = δ̄ + gᵀΔ + ½ΔᵀHΔ, and the sub-band envelope e^{-aδ²} to first order in Δ. Then for e^{-aδ²+ibδ} the average is the
   Gaussian integral  det(I − s²B)^{-1/2} · exp(−aδ̄² + ibδ̄ + ½κ²s² gᵀ(I − s²B)^{-1}g),  κ = −2aδ̄ + ib,  B = κH − 2a ggᵀ.
   With H = 0 it reduces exactly to avgTerm above; for lines (a = 0) it is exact for any quadratic OPD. */
/* It is split in two so pixVal() can evaluate the parts shared by every sub-band of one Gaussian (same a, same pixel) once:
   avgQpre() for those, avgQ() for the rest. The expressions are the same as written in full, so the result is bit-identical. */
const QS={kr:0,k2:0,kk:0,b11r:0,b12r:0,b22r:0,m11r:0,m12r:0,m22r:0,p1:0,p2:0,nr:0,e0:0,hs:0};
function avgQpre(ka,dm,gx,gy,h11,h12,h22,s2){const Q=QS,kr=-2*ka*dm;Q.kr=kr;Q.kk=kr*kr;Q.k2=2*kr;
  const b11r=kr*h11-2*ka*gx*gx,b12r=kr*h12-2*ka*gx*gy,b22r=kr*h22-2*ka*gy*gy;Q.b11r=b11r;Q.b12r=b12r;Q.b22r=b22r;
  const m11r=1-s2*b11r,m12r=-s2*b12r,m22r=1-s2*b22r;Q.m11r=m11r;Q.m12r=m12r;Q.m22r=m22r;Q.p1=m11r*m22r;Q.p2=m12r*m12r;
  Q.nr=m22r*gx*gx-2*m12r*gx*gy+m11r*gy*gy;Q.e0=-ka*dm*dm;Q.hs=0.5*s2}
function avgQ(kb,dm,gx,gy,h11,h12,h22,s2){const Q=QS,ki=kb;
  const b11i=ki*h11,b12i=ki*h12,b22i=ki*h22;
  const m11r=Q.m11r,m12r=Q.m12r,m22r=Q.m22r,m11i=-s2*b11i,m12i=-s2*b12i,m22i=-s2*b22i;
  const dr=Q.p1-m11i*m22i-(Q.p2-m12i*m12i),di=m11r*m22i+m11i*m22r-2*m12r*m12i;
  const nr=Q.nr,ni=m22i*gx*gx-2*m12i*gx*gy+m11i*gy*gy;
  const dd=dr*dr+di*di,qr=(nr*dr+ni*di)/dd,qi=(ni*dr-nr*di)/dd,k2r=Q.kk-ki*ki,k2i=Q.k2*ki;
  const er=Q.e0+Q.hs*(k2r*qr-k2i*qi)-0.25*Math.log(dd),ei=kb*dm+Q.hs*(k2r*qi+k2i*qr)-0.5*Math.atan2(di,dr);
  return er<-40?0:Math.exp(er)*Math.cos(ei)}
const PV=[0,0,0,0];
/* quad=false uses the first-order form (H = 0); it is only chosen when the curvature phase kb·s²·|H| < 3e-4, below which the two agree to that level.
   All sub-bands of one Gaussian share a, so the terms that depend only on a are computed once per run of equal a.
   First-order fast path for an evenly spaced group (gr.lin = Δk_b): along the group the exponent is quadratic and the phase linear in k,
   so e^{ex} and cos/sin of the phase are stepped by exact ratios (two multiplies and a rotation per sub-band) and re-evaluated
   directly every 16 sub-bands. The drift between re-evaluations is a few ulp (< 1e-14 relative); the −40 cut-off is tested exactly. */
function pixVal(dm,gx,gy,h11,h12,h22,s2,pr,quad){let X=0,Y=0,Z=0,I=0;const t2=s2*(gx*gx+gy*gy),dmin=Math.max(0,Math.abs(dm)-5*Math.sqrt(t2));
  for(const gr of pr.G){if(gr.pka*dmin*dmin>30){X+=gr.cX;Y+=gr.cY;Z+=gr.cZ;I+=gr.cI;continue}
  if(!quad&&gr.lin){const D=gr.lin,ka=pr.KA[gr.a],q=1+2*ka*t2,sq=ka?Math.sqrt(q):1,e0=ka*dm*dm,ph1=D*dm/q,c1=Math.cos(ph1),s1=Math.sin(ph1),g2=Math.exp(-(t2*D*D)/q);
    let E=0,R=0,C=0,S=0,j=16;
    for(let k=gr.a;k<gr.b;k++){const kb=pr.KB[k],ex=-(e0+0.5*kb*kb*t2)/q;let f=0;
      if(ex>-40){if(j>=16){E=Math.exp(ex);const ph=kb*dm/q;C=Math.cos(ph);S=Math.sin(ph);R=Math.exp(-(t2*kb*D+0.5*t2*D*D)/q);j=0}
        f=E*C/sq;E*=R;R*=g2;const c=C*c1-S*s1;S=S*c1+C*s1;C=c;j++}else j=16;
      const v=pr.P[k]*(1+f);I+=v;X+=v*pr.X[k];Y+=v*pr.Y[k];Z+=v*pr.Z[k]}
    continue}
  let kaG=NaN,q=0,sq=1,e0=0;
  for(let k=gr.a;k<gr.b;k++){const ka=pr.KA[k],kb=pr.KB[k];let f;
    if(ka!==kaG){kaG=ka;if(quad)avgQpre(ka,dm,gx,gy,h11,h12,h22,s2);else{q=1+2*ka*t2;sq=ka?Math.sqrt(q):1;e0=ka*dm*dm}}
    if(quad)f=avgQ(kb,dm,gx,gy,h11,h12,h22,s2);else{const ex=-(e0+0.5*kb*kb*t2)/q;f=ex>-40?Math.exp(ex)*Math.cos(kb*dm/q)/sq:0}
    const v=pr.P[k]*(1+f);I+=v;X+=v*pr.X[k];Y+=v*pr.Y[k];Z+=v*pr.Z[k]}}
  PV[0]=X;PV[1]=Y;PV[2]=Z;PV[3]=I;return PV}

/* ---------- ring renderers: WebGPU → WebGL2 → CPU workers → CPU main thread ----------
   Every backend evaluates the same per-pixel formula as pixVal() above: the exact Gaussian-footprint average of each sub-band,
   first-order or second-order (avgQ) by the same 3e-4 curvature test, with the same group skipping.
   GPUs work in 32-bit floats, so the large part of each fringe phase is taken out in 64-bit on the CPU:
   k_b·δ̄ = [k_b·2d mod 2π] + k_b·Δ, with Δ = −4d sin²(θ/2) + k_x u + k_y v computed on the GPU.
   Where Δ is large the fringes are far finer than a pixel and the footprint average has already damped them to ~0.
   The verification table reads the active backend's pixels back and checks them against brute-force integration. */
const RB={pref:'auto',active:'cpu',gpu:null,gl:null,workers:null,busy:false,dirty:false,done:null};
try{RB.pref=localStorage.getItem('mich-renderer')||'auto'}catch(e){}
const TAU=2*Math.PI;
/* pack sub-bands and groups for the GPU: per sub-band (P, KA, KB, phase0), (X, Y, Z, 0); per group (a, b, pka, cI), (cX, cY, cZ, 0) */
function packRing(pr,M){const n=pr.n,sb=new Float32Array(Math.max(8,n*8)),G=pr.G,gr=new Float32Array(Math.max(8,G.length*8));
  for(let k=0;k<n;k++){const o=8*k,ph=(pr.KB[k]*2*M.d)%TAU;sb[o]=pr.P[k];sb[o+1]=pr.KA[k];sb[o+2]=pr.KB[k];sb[o+3]=ph;sb[o+4]=pr.X[k];sb[o+5]=pr.Y[k];sb[o+6]=pr.Z[k]}
  G.forEach((g,i)=>{const o=8*i;gr[o]=g.a;gr[o+1]=g.b;gr[o+2]=g.pka;gr[o+3]=g.cI;gr[o+4]=g.cX;gr[o+5]=g.cY;gr[o+6]=g.cZ});
  let kbm=0;for(let k=0;k<n;k++)kbm=Math.max(kbm,pr.KB[k]);return{sb,gr,n,ng:G.length,kbm}}

/* shared pixel maths in GLSL (the WGSL version below repeats it line for line) */
const PIX_GLSL=`
float gam(float v){v=clamp(v,0.,1.);return v<=0.0031308?12.92*v:1.055*pow(v,1./2.4)-0.055;}
/* GPU sin/cos are only accurate to ~5e-4 (absolute), so fringe phases use this: reduce to [0, π], then a 16th-order Taylor series (error < 1e-9) */
float cosA(float x){float y=abs(x-6.283185307*floor(x/6.283185307+0.5));float sg=1.;if(y>1.5707963){y=3.14159265-y;sg=-1.;}
  float z=y*y;return sg*(1.+z*(-0.5+z*(1./24.+z*(-1./720.+z*(1./40320.+z*(-1./3628800.+z*(1./479001600.+z*(-1./87178291200.))))))));}
vec4 pix(float u,float v){
  /* tanθ = r·tanθmax, so cosθ, sinθ and sin²(θ/2) follow from square roots alone (no low-accuracy trig) */
  float r=sqrt(u*u+v*v),x2=r*r*uT*uT,q=1.+x2,sq=sqrt(q),c=uT/q,cp=-2.*r*uT*uT*uT/(q*q),s=r*uT/sq,co=1./sq;
  float f1=-2.*uD*s*c,f2=-2.*uD*(co*c*c+s*cp),fr=r>1e-12?f1/r:f2,ux=r>1e-12?u/r:1.,uy=r>1e-12?v/r:0.;
  float gx=f1*ux+uKx,gy=f1*uy+uKy,h11=f2*ux*ux+fr*(1.-ux*ux),h22=f2*uy*uy+fr*(1.-uy*uy),h12=(f2-fr)*ux*uy;
  float sh2=x2/(2.*sq*(sq+1.)),Dl=-4.*uD*sh2+uKx*u+uKy*v,dm=2.*uD+Dl;
  bool quad=uKbm*uS2*max(abs(f2),abs(fr))>=3e-4;
  float t2=uS2*(gx*gx+gy*gy),dmin=max(0.,abs(dm)-5.*sqrt(t2));
  vec4 acc=vec4(0.);
  for(int gi=0;gi<uNG;gi++){vec4 g0=fetchG(2*gi),g1=fetchG(2*gi+1);
    if(g0.z*dmin*dmin>30.){acc+=vec4(g1.xyz,g0.w);continue;}
    int a=int(g0.x+0.5),b=int(g0.y+0.5);
    for(int k=a;k<b;k++){vec4 s0=fetchS(2*k),s1=fetchS(2*k+1);float ka=s0.y,kb=s0.z,ph=s0.w+kb*Dl,f;
      if(quad){
        float kr=-2.*ka*dm,ki=kb;
        float b11r=kr*h11-2.*ka*gx*gx,b11i=ki*h11,b12r=kr*h12-2.*ka*gx*gy,b12i=ki*h12,b22r=kr*h22-2.*ka*gy*gy,b22i=ki*h22;
        float m11r=1.-uS2*b11r,m11i=-uS2*b11i,m12r=-uS2*b12r,m12i=-uS2*b12i,m22r=1.-uS2*b22r,m22i=-uS2*b22i;
        float dr=m11r*m22r-m11i*m22i-(m12r*m12r-m12i*m12i),di=m11r*m22i+m11i*m22r-2.*m12r*m12i;
        float nr=m22r*gx*gx-2.*m12r*gx*gy+m11r*gy*gy,ni=m22i*gx*gx-2.*m12i*gx*gy+m11i*gy*gy;
        float dd=dr*dr+di*di,qr=(nr*dr+ni*di)/dd,qi=(ni*dr-nr*di)/dd,k2r=kr*kr-ki*ki,k2i=2.*kr*ki;
        float er=-ka*dm*dm+0.5*uS2*(k2r*qr-k2i*qi)-0.25*log(dd),ei=ph+0.5*uS2*(k2r*qi+k2i*qr)-0.5*atan(di,dr);
        f=er<-40.?0.:exp(er)*cosA(ei);
      }else{float qq=1.+2.*ka*t2,ex=-(ka*dm*dm+0.5*kb*kb*t2)/qq;f=ex>-40.?exp(ex)*cosA(ph-kb*dm*(qq-1.)/qq)/(ka>0.?sqrt(qq):1.):0.;}
      float w=s0.x*(1.+f);acc+=vec4(w*s1.xyz,w);}}
  return acc;}`;
const TONE_GLSL=`
vec3 tone(vec4 x){vec3 c=vec3(dot(vec3(3.2406,-1.5372,-0.4986),x.xyz),dot(vec3(-0.9689,1.8758,0.0415),x.xyz),dot(vec3(0.0557,-0.2040,1.0570),x.xyz));
  float m=min(min(c.r,c.g),min(c.b,0.));c=(c-m)*uGain;return vec3(gam(c.r),gam(c.g),gam(c.b));}`;
/* WGSL is different enough that it is written out separately (same expressions, line for line) */
const WGSL_HEAD=`struct Prm{a:vec4f,b:vec4f,c:vec4f};
@group(0) @binding(0) var<uniform> P:Prm;`;
const WGSL=WGSL_HEAD+`
@group(0) @binding(1) var<storage,read> SB:array<vec4f>;
@group(0) @binding(2) var<storage,read> GR:array<vec4f>;
@group(0) @binding(3) var<storage,read_write> OUT:array<vec4f>;
fn cosA(x:f32)->f32{var y=abs(x-6.283185307*floor(x/6.283185307+0.5));var sg=1.;if(y>1.5707963){y=3.14159265-y;sg=-1.;}
  let z=y*y;return sg*(1.+z*(-0.5+z*(1./24.+z*(-1./720.+z*(1./40320.+z*(-1./3628800.+z*(1./479001600.+z*(-1./87178291200.))))))));}
fn pix(u:f32,v:f32)->vec4f{
  let uD=P.b.y;let uT=P.b.z;let uKx=P.b.w;let uKy=P.c.x;let uS2=P.c.y;let uKbm=P.c.z;let NG=i32(P.a.y);
  let r=sqrt(u*u+v*v);let x2=r*r*uT*uT;let q=1.+x2;let sq=sqrt(q);let c=uT/q;let cp=-2.*r*uT*uT*uT/(q*q);let s=r*uT/sq;let co=1./sq;
  let f1=-2.*uD*s*c;let f2=-2.*uD*(co*c*c+s*cp);let fr=select(f2,f1/r,r>1e-12);let ux=select(1.,u/r,r>1e-12);let uy=select(0.,v/r,r>1e-12);
  let gx=f1*ux+uKx;let gy=f1*uy+uKy;let h11=f2*ux*ux+fr*(1.-ux*ux);let h22=f2*uy*uy+fr*(1.-uy*uy);let h12=(f2-fr)*ux*uy;
  let sh2=x2/(2.*sq*(sq+1.));let Dl=-4.*uD*sh2+uKx*u+uKy*v;let dm=2.*uD+Dl;
  let quad=uKbm*uS2*max(abs(f2),abs(fr))>=3e-4;
  let t2=uS2*(gx*gx+gy*gy);let dmin=max(0.,abs(dm)-5.*sqrt(t2));
  var acc=vec4f(0.);
  for(var gi=0;gi<NG;gi++){let g0=GR[2*gi];let g1=GR[2*gi+1];
    if(g0.z*dmin*dmin>30.){acc+=vec4f(g1.xyz,g0.w);continue;}
    let a=i32(g0.x+0.5);let b=i32(g0.y+0.5);
    for(var k=a;k<b;k++){let s0=SB[2*k];let s1=SB[2*k+1];let ka=s0.y;let kb=s0.z;let ph=s0.w+kb*Dl;var f=0.;
      if(quad){
        let kr=-2.*ka*dm;let ki=kb;
        let b11r=kr*h11-2.*ka*gx*gx;let b11i=ki*h11;let b12r=kr*h12-2.*ka*gx*gy;let b12i=ki*h12;let b22r=kr*h22-2.*ka*gy*gy;let b22i=ki*h22;
        let m11r=1.-uS2*b11r;let m11i=-uS2*b11i;let m12r=-uS2*b12r;let m12i=-uS2*b12i;let m22r=1.-uS2*b22r;let m22i=-uS2*b22i;
        let dr=m11r*m22r-m11i*m22i-(m12r*m12r-m12i*m12i);let di=m11r*m22i+m11i*m22r-2.*m12r*m12i;
        let nr=m22r*gx*gx-2.*m12r*gx*gy+m11r*gy*gy;let ni=m22i*gx*gx-2.*m12i*gx*gy+m11i*gy*gy;
        let dd=dr*dr+di*di;let qr=(nr*dr+ni*di)/dd;let qi=(ni*dr-nr*di)/dd;let k2r=kr*kr-ki*ki;let k2i=2.*kr*ki;
        let er=-ka*dm*dm+0.5*uS2*(k2r*qr-k2i*qi)-0.25*log(dd);let ei=ph+0.5*uS2*(k2r*qi+k2i*qr)-0.5*atan2(di,dr);
        if(er>=-40.){f=exp(er)*cosA(ei);}
      }else{let qq=1.+2.*ka*t2;let ex=-(ka*dm*dm+0.5*kb*kb*t2)/qq;if(ex>-40.){f=exp(ex)*cosA(ph-kb*dm*(qq-1.)/qq)/select(1.,sqrt(qq),ka>0.);}}
      let w=s0.x*(1.+f);acc+=vec4f(w*s1.xyz,w);}}
  return acc;}
@compute @workgroup_size(8,8) fn cmain(@builtin(global_invocation_id) id:vec3u){
  let N=f32(P.a.x);let k=P.a.z;let Nl=u32(P.a.w);if(id.x>=Nl||id.y>=Nl){return;}let h=N*0.5;
  let u=((f32(id.x)+0.5)*k-h)/h;let v=-((f32(id.y)+0.5)*k-h)/h;OUT[id.y*Nl+id.x]=pix(u,v);}`;
const WGSL_R=WGSL_HEAD+`
@group(0) @binding(3) var<storage,read> OUT:array<vec4f>;
fn gam(v0:f32)->f32{let v=clamp(v0,0.,1.);return select(1.055*pow(v,1./2.4)-0.055,12.92*v,v<=0.0031308);}
@vertex fn vmain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fmain(@builtin(position) pos:vec4f)->@location(0) vec4f{
  let k=u32(P.a.z);let Nl=u32(P.a.w);let i=min(u32(pos.x)/k,Nl-1u);let j=min(u32(pos.y)/k,Nl-1u);let x=OUT[j*Nl+i];
  var c=vec3f(dot(vec3f(3.2406,-1.5372,-0.4986),x.xyz),dot(vec3f(-0.9689,1.8758,0.0415),x.xyz),dot(vec3f(0.0557,-0.2040,1.0570),x.xyz));
  let m=min(min(c.r,c.g),min(c.b,0.));c=(c-m)*P.c.w;return vec4f(gam(c.r),gam(c.g),gam(c.b),1.);}`;
/* fragment-shader version for WebGL2 */
const GLSL_HEAD=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
uniform sampler2D uSB,uGR,uOut;uniform int uNG,uN,uK;uniform float uD,uT,uKx,uKy,uS2,uKbm,uGain;out vec4 o;
vec4 fetchS(int t){return texelFetch(uSB,ivec2(t%1024,t/1024),0);}vec4 fetchG(int t){return texelFetch(uGR,ivec2(t%1024,t/1024),0);}`;
const GLSL_PIX=GLSL_HEAD+PIX_GLSL+`
void main(){float h=float(uN)*0.5,k=float(uK);vec2 p=(floor(gl_FragCoord.xy)+0.5)*k;float u=(p.x-h)/h,v=(p.y-h)/h;o=pix(u,v);}`;
const GLSL_TONE=GLSL_HEAD+`
float gam(float v){v=clamp(v,0.,1.);return v<=0.0031308?12.92*v:1.055*pow(v,1./2.4)-0.055;}`+TONE_GLSL+`
void main(){o=vec4(tone(texelFetch(uOut,ivec2(gl_FragCoord.xy)/uK,0)),1.);}`;
const GLSL_VS=`#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;

/* ---- WebGPU ---- */
async function initWebGPU(cv){if(!navigator.gpu)throw new Error('no navigator.gpu');const ad=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!ad)throw new Error('no adapter');
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
function gpuDraw(G,N,M,pk,s2,gain,k){const dev=G.dev,SU=GPUBufferUsage,Nl=Math.ceil(N/k);
  dev.queue.writeBuffer(G.ubuf,0,new Float32Array([N,pk.ng,k,Nl, 2*M.d,M.d,M.T,M.kx, M.ky,s2,pk.kbm,gain]));
  dev.queue.writeBuffer(growBuf(G,'sb',pk.sb.byteLength,SU.STORAGE|SU.COPY_DST),0,pk.sb);dev.queue.writeBuffer(growBuf(G,'gr',pk.gr.byteLength,SU.STORAGE|SU.COPY_DST),0,pk.gr);
  const out=growBuf(G,'out',N*N*16,SU.STORAGE|SU.COPY_SRC);
  const ents=[{binding:0,resource:{buffer:G.ubuf}},{binding:1,resource:{buffer:G.sb}},{binding:2,resource:{buffer:G.gr}},{binding:3,resource:{buffer:out}}];
  const bg=dev.createBindGroup({layout:G.bgl,entries:ents}),bgR=dev.createBindGroup({layout:G.bglR,entries:[ents[0],ents[3]]});
  const enc=dev.createCommandEncoder();{const p=enc.beginComputePass();p.setPipeline(G.cp);p.setBindGroup(0,bg);p.dispatchWorkgroups(Math.ceil(Nl/8),Math.ceil(Nl/8));p.end()}
  {const p=enc.beginRenderPass({colorAttachments:[{view:G.ctx.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});p.setPipeline(G.rp);p.setBindGroup(0,bgR);p.draw(3);p.end()}
  dev.queue.submit([enc.finish()]);G.lastN=Nl;return dev.queue.onSubmittedWorkDone()}
async function gpuRead(G){const N=G.lastN,bytes=N*N*16,rb=G.dev.createBuffer({size:bytes,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
  const enc=G.dev.createCommandEncoder();enc.copyBufferToBuffer(G.out,0,rb,0,bytes);G.dev.queue.submit([enc.finish()]);await rb.mapAsync(GPUMapMode.READ);
  const a=new Float32Array(rb.getMappedRange().slice(0));rb.unmap();rb.destroy();return a}

/* ---- WebGL2 ---- */
function initWebGL2(cv){const gl=cv.getContext('webgl2',{antialias:false,depth:false,preserveDrawingBuffer:true});if(!gl)throw new Error('no webgl2');
  if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('no float render targets');
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const prog=fs=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,GLSL_VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
  const L={gl,pPix:prog(GLSL_PIX),pTone:prog(GLSL_TONE),tSB:gl.createTexture(),tGR:gl.createTexture(),tOut:gl.createTexture(),fb:gl.createFramebuffer(),vao:gl.createVertexArray(),N:0};
  for(const t of [L.tSB,L.tGR,L.tOut]){gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST)}
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();RB.gl=null;pickBackend('webgl lost')});return L}
function glData(gl,tex,arr){const texels=arr.length/4,w=Math.min(1024,texels),h=Math.ceil(texels/1024),buf=new Float32Array(w*h*4);buf.set(arr);
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,buf)}
function glDraw(L,N,M,pk,s2,gain,k){const gl=L.gl,Nl=Math.ceil(N/k);
  if(L.N!==N){gl.bindTexture(gl.TEXTURE_2D,L.tOut);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,N,N,0,gl.RGBA,gl.FLOAT,null);gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,L.tOut,0);L.N=N}
  glData(gl,L.tSB,pk.sb);glData(gl,L.tGR,pk.gr);gl.bindVertexArray(L.vao);
  const set=(p)=>{gl.useProgram(p);const U=n=>gl.getUniformLocation(p,n);gl.uniform1i(U('uSB'),0);gl.uniform1i(U('uGR'),1);gl.uniform1i(U('uOut'),2);gl.uniform1i(U('uNG'),pk.ng);gl.uniform1i(U('uN'),N);gl.uniform1i(U('uK'),k);
    gl.uniform1f(U('uD'),M.d);gl.uniform1f(U('uT'),M.T);gl.uniform1f(U('uKx'),M.kx);gl.uniform1f(U('uKy'),M.ky);gl.uniform1f(U('uS2'),s2);gl.uniform1f(U('uKbm'),pk.kbm);gl.uniform1f(U('uGain'),gain)};
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,L.tSB);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,L.tGR);
  gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.viewport(0,0,Nl,Nl);set(L.pPix);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,N,N);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,L.tOut);set(L.pTone);gl.drawArrays(gl.TRIANGLES,0,3);
  /* resolve when the GPU has finished, polling a fence so the page never blocks on it */
  const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
  return new Promise(res=>{const poll=()=>{const r=gl.clientWaitSync(fence,0,0);if(r===gl.TIMEOUT_EXPIRED)setTimeout(poll,1);else{gl.deleteSync(fence);res()}};poll()})}
function glRead(L){const gl=L.gl,N=L.N,a=new Float32Array(N*N*4);gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,a);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  /* GL rows run bottom-up: flip to top-down like the other backends */
  const o=new Float32Array(N*N*4);for(let j=0;j<N;j++)o.set(a.subarray((N-1-j)*N*4,(N-j)*N*4),j*N*4);return o}

/* ---- CPU workers: the same pixVal()/avgQ() source, run on every core ---- */
function initWorkers(){if(!window.Worker||!window.Blob)throw new Error('no workers');const n=clamp((navigator.hardwareConcurrency||4)-1,2,8);
  const src=`const QS=${JSON.stringify(QS)};
${avgQpre.toString()}
${avgQ.toString()}
${pixVal.toString()}
const PV=[0,0,0,0];
onmessage=e=>{const m=e.data,{N,st,j0,j1,d,T,kx,ky,s2,kbm,pr}=m,h=N/2,out=new Float32Array(((j1-j0)/st|0)*Math.ceil(N/st)*4+8);let o=0;
  const rad=r=>{const th=Math.atan(r*T),q=1+r*r*T*T,c=T/q,cp=-2*r*T**3/(q*q),f1=-2*d*Math.sin(th)*c,f2=-2*d*(Math.cos(th)*c*c+Math.sin(th)*cp);return[f1,f2,r>1e-12?f1/r:f2]};
  for(let j=j0;j<j1;j+=st){const v=-(j+st/2-h)/h;for(let i=0;i<N;i+=st){const u=(i+st/2-h)/h,r=Math.hypot(u,v),[f1,f2,fr]=rad(r),ux=r>1e-12?u/r:1,uy=r>1e-12?v/r:0;
    const gx=f1*ux+kx,gy=f1*uy+ky,h11=f2*ux*ux+fr*(1-ux*ux),h22=f2*uy*uy+fr*(1-uy*uy),h12=(f2-fr)*ux*uy,quad=st===1&&kbm*s2*Math.max(Math.abs(f2),Math.abs(fr))>=3e-4;
    const p=pixVal(2*d*Math.cos(Math.atan(r*T))+kx*u+ky*v,gx,gy,h11,h12,h22,s2,pr,quad);out[o++]=p[0];out[o++]=p[1];out[o++]=p[2];out[o++]=p[3]}}
  postMessage({id:m.id,j0,j1,st,out},[out.buffer])}`;
  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));const W={pool:Array.from({length:n},()=>new Worker(url)),n,job:0};
  return W}

/* ---- backend selection ---- */
const BACKENDS=[['webgpu','WebGPU'],['webgl2','WebGL2'],['workers','CPU, all cores'],['cpu','CPU, one core']];
async function probeBackends(){const ok=[];
  try{RB.gpu=await initWebGPU($('ringGPU'));ok.push('webgpu')}catch(e){RB.gpuErr=e.message}
  try{RB.gl=initWebGL2($('ringGL'));ok.push('webgl2')}catch(e){RB.glErr=e.message}
  try{RB.workers=initWorkers();ok.push('workers')}catch(e){}
  ok.push('cpu');pickBackend()}
function pickBackend(why){RB.busy=false;RB.dirty=false;const avail=BACKENDS.map(b=>b[0]).filter(k=>(k==='webgpu'&&RB.gpu)||(k==='webgl2'&&RB.gl)||(k==='workers'&&RB.workers)||k==='cpu');
  RB.active=RB.pref!=='auto'&&avail.includes(RB.pref)?RB.pref:avail[0];
  $('ring').hidden=!['cpu','workers'].includes(RB.active);$('ringGL').hidden=RB.active!=='webgl2';$('ringGPU').hidden=RB.active!=='webgpu';
  const sel=$('rendSel');sel.innerHTML=`<option value="auto">Auto (${BACKENDS.find(b=>b[0]===avail[0])[1]})</option>`+BACKENDS.map(([k,t])=>`<option value="${k}" ${avail.includes(k)?'':'disabled'}>${t}${avail.includes(k)?'':' (not available)'}</option>`).join('');sel.value=RB.pref;
  sel.title=`Rendering the pattern with ${BACKENDS.find(b=>b[0]===RB.active)[1]}`+(RB.gpuErr&&!RB.gpu?` · WebGPU unavailable: ${RB.gpuErr}`:'')+(RB.glErr&&!RB.gl?` · WebGL2 unavailable: ${RB.glErr}`:'');
  if(why)console.info('renderer:',RB.active,why);update(false)}

/* Timing: the tilted (non-radial) image costs one exact pixel average per block. While moving, the block size comes from the
   adaptive preview below. At rest, the full-resolution image is computed in ~12 ms slices between frames,
   sharpening top-down, so the page never blocks; a newer render cancels an unfinished one. Verification renders synchronously. */
let ringJob=0;
/* Adaptive preview resolution, while anything is moving (dragging, sweeping, scrolling). At rest the image is always
   rendered at every pixel. Per path we keep the measured frame time (ms, running average) for every block size s that has been used. A size not yet
   tried is predicted from the nearest measured one, scaling with the number of blocks, (N/s)^p (p = 1 radial, 2 otherwise).
   The finest size predicted to fit the budget is chosen; going finer needs a 15% margin, so the choice doesn't flicker.
   Budget: CPU — what is left of a 60 Hz frame after the plots, but at least 6 ms (or 60% of the plots' time on slow devices);
   GPU — 14 ms of GPU time, which runs alongside the page. */
const LQ={other:4,ms:0,cpuR:{p:1,t:{},s:2},cpuT:{p:2,t:{},s:4},wk:{p:2,t:{},s:2},gpu:{p:2,t:{},s:1}},STEPS=[1,2,3,4,5,6,8,10,12,16];
/* measurements expire after 3 s and are cleared when the spectrum changes (cost scales with its number of sub-bands) */
const lqFresh=(q,s)=>{const e=q.t[s];return e&&performance.now()-e.at<3000?e.ms:null};
function lqPredict(q,s){const own=lqFresh(q,s);if(own!=null)return own;let best=null;for(const k in q.t){const kk=+k;if(lqFresh(q,kk)==null)continue;if(best===null||Math.abs(Math.log(kk/s))<Math.abs(Math.log(best/s)))best=kk}
  return best===null?(s>=8?5:1e9):lqFresh(q,best)*Math.pow(best/s,q.p)}
function lqPick(key,N,gpu){const q=LQ[key],n=sublines().length;if(q.n!==n){q.n=n;q.t={}}const B=gpu?14:Math.max(6,16.7-LQ.other,0.6*LQ.other);
  const s=STEPS.find(x=>lqPredict(q,x)<=(x<q.s?0.85*B:B))||16;q.s=s;return s}
function lqRecord(key,st,ms){const q=LQ[key],e=q.t[st],old=e&&performance.now()-e.at<3000?e.ms:null;q.t[st]={ms:old==null?ms:0.7*old+0.3*ms,at:performance.now()}}
const showRes=(N,st,live)=>{const e=$('resV');if(e)e.textContent=`${Math.ceil(N/st)}²${live&&st>1?' preview':''}`};
let ringKey='',ringWasLive=false;
function ringInputs(){return JSON.stringify([sublines().map(o=>[o.s,o.p,o.w]),$('d').value,$('fov').value,$('tx').value,$('ty').value,ring.width,RB.active,$('prof').clientWidth,$('prof').clientHeight,document.documentElement.dataset.theme])}
function renderRingIfNeeded(){const k=ringInputs();if(k===ringKey&&!(ringWasLive&&!ringLive))return;ringKey=k;ringWasLive=ringLive;renderRing()}
/* reusable image buffers (one per size) and the small off-screen canvas for previews */
const ringImgs=new Map();function ringImg(n){let im=ringImgs.get(n);if(!im){if(ringImgs.size>6)ringImgs.clear();im=rctx.createImageData(n,n);ringImgs.set(n,im)}
  if(!RB.off)RB.off=document.createElement('canvas');if(RB.off.width!==n){RB.off.width=n;RB.off.height=n}return im}
function renderRing(sync){
  const N=ring.width,M=ringModel(),cs=act(),tilted=!!(M.kx||M.ky),job=ringJob+1;RB.wDone=null;  /* job is claimed only once this call really renders */
  let st=1;const T0=performance.now();
  if(RB.active==='webgpu'||RB.active==='webgl2'){/* GPU */
    const pr=cs.length?prepSL(sublines()):{n:0,G:[],KB:[]};let gain=1;
    if(cs.length){let fX=0,fY=0,fZ=0;for(const o of sublines()){fX+=o.p*o.X[0];fY+=o.p*o.X[1];fZ+=o.p*o.X[2]}gain=1/Math.max(...desat(toLin([fX,fY,fZ])),1e-9)}
    /* one frame in flight at a time: a newer request waits and then draws the latest state. While dragging, the block size k is
       chosen by the adaptive preview (14 ms of GPU time); at rest k = 1 (every pixel). Each block is still an exact
       footprint average, over the whole block. */
    ringProfile(M);if(RB.busy&&!sync){RB.dirty=true;return}
    ringJob=job;
    const k=ringLive?lqPick('gpu',N,true):1;showRes(N,k,ringLive);
    const pk=packRing(pr,M),s2=(PIXSD*2*k/N)**2;Ibuf=null;RB.busy=true;const t0=performance.now();
    let done;try{done=RB.active==='webgpu'?gpuDraw(RB.gpu,N,M,pk,s2,gain,k):glDraw(RB.gl,N,M,pk,s2,gain,k)}catch(e){RB.busy=false;console.warn(RB.active,'failed, falling back',e);if(RB.active==='webgpu')RB.gpu=null;else RB.gl=null;pickBackend('error');return}
    /* a lost device rejects the pending frame: fall back instead of leaving an unhandled rejection and a renderer stuck busy */
    const be=RB.active;
    RB.done=done.then(()=>{if(ringLive)lqRecord('gpu',k,performance.now()-t0);RB.busy=false;if(RB.dirty){RB.dirty=false;renderRing()}},
      e=>{RB.busy=false;RB.dirty=false;console.warn(be,'frame failed, falling back:',e&&e.message);if(be==='webgpu')RB.gpu=null;else RB.gl=null;if(RB.active===be)pickBackend(be+' frame failed')});
    return}
  const pathKey=!tilted?'cpuR':RB.active==='workers'?'wk':'cpuT';
  if(RB.active==='workers'&&tilted&&!sync&&RB.workers.busy&&ringLive){RB.workers.dirty=true;ringProfile(M);return}  /* one worker job in flight while moving */
  ringJob=job;if(RB.workers)RB.workers.busy=false;  /* a newer render supersedes any worker job in flight */
  if(ringLive)st=lqPick(pathKey,N,false);showRes(N,st,ringLive);
  /* a moving preview is rendered one pixel per block into a small image and scaled up smoothly, so its fixed cost shrinks with it */
  const small=ringLive&&st>1,W2=small?Math.ceil(N/st):N,img=ringImg(W2),D=img.data;Ibuf=small?null:new Float32Array(N*N);
  const present=(jA,jB)=>{if(small){RB.off.getContext('2d').putImageData(img,0,0);rctx.imageSmoothingEnabled=true;rctx.imageSmoothingQuality='high';rctx.drawImage(RB.off,0,0,W2,W2,0,0,W2*st,W2*st)}else rctx.putImageData(img,0,0,0,jA,N,jB-jA)};
  if(cs.length){const SL=sublines(),pr=prepSL(SL),A=cs.reduce((t,c)=>t+P(c),0);let fX=0,fY=0,fZ=0;for(const o of SL){fX+=o.p*o.X[0];fY+=o.p*o.X[1];fZ+=o.p*o.X[2]}
    const fl=desat(toLin([fX,fY,fZ])),gain=1/Math.max(...fl,1e-9),h=N/2,px=2/N*st,sd=PIXSD*px;
    const put=(j0,i0,X,Y,Z,I)=>{let r=MX[0][0]*X+MX[0][1]*Y+MX[0][2]*Z,g=MX[1][0]*X+MX[1][1]*Y+MX[1][2]*Z,b=MX[2][0]*X+MX[2][1]*Y+MX[2][2]*Z;const m=Math.min(r,g,b,0);
      const r8=enc((r-m)*gain),g8=enc((g-m)*gain),b8=enc((b-m)*gain),In=I/A;
      if(small){const o=4*((j0/st)*W2+i0/st);D[o]=r8;D[o+1]=g8;D[o+2]=b8;D[o+3]=255;return}
      for(let jj=j0;jj<Math.min(N,j0+st);jj++)for(let ii=i0;ii<Math.min(N,i0+st);ii++){const o=4*(jj*N+ii);D[o]=r8;D[o+1]=g8;D[o+2]=b8;D[o+3]=255;Ibuf[jj*N+ii]=In}};
    if(M.kx===0&&M.ky===0){const Nr=Math.ceil(1.42*h/st*(ringLive?4:16))+2,dr=1.42/(Nr-1),RX=new Float64Array(Nr),RY=new Float64Array(Nr),RZ=new Float64Array(Nr),RI=new Float64Array(Nr);
      for(let k=0;k<Nr;k++){const r=k*dr,dm=2*M.d*Math.cos(Math.atan(r*M.T)),[f1,f2,fr]=M.rad(r),v=pixVal(dm,f1,0,f2,0,fr,sd*sd,pr,true);RX[k]=v[0];RY[k]=v[1];RZ[k]=v[2];RI[k]=v[3]}
      for(let j=0;j<N;j+=st){const v=-(j+st/2-h)/h;for(let i=0;i<N;i+=st){const u=(i+st/2-h)/h,t=Math.hypot(u,v)/dr,k=Math.min(Nr-2,t|0),f=t-k;
        put(j,i,RX[k]+(RX[k+1]-RX[k])*f,RY[k]+(RY[k+1]-RY[k])*f,RZ[k]+(RZ[k+1]-RZ[k])*f,RI[k]+(RI[k+1]-RI[k])*f)}}}
    else{const kbm=Math.max(...SL.map(o=>o.kb)),s2=sd*sd;
      const rows=(j0,j1)=>{for(let j=j0;j<j1;j+=st){const v=-(j+st/2-h)/h;for(let i=0;i<N;i+=st){const u=(i+st/2-h)/h,r=Math.hypot(u,v),[f1,f2,fr]=M.rad(r),ux=r>1e-12?u/r:1,uy=r>1e-12?v/r:0;
        const gx=f1*ux+M.kx,gy=f1*uy+M.ky,h11=f2*ux*ux+fr*(1-ux*ux),h22=f2*uy*uy+fr*(1-uy*uy),h12=(f2-fr)*ux*uy,quad=!ringLive&&kbm*s2*Math.max(Math.abs(f2),Math.abs(fr))>=3e-4;  /* the second-order correction only in the at-rest pass */
        const p=pixVal(M.opd(u,v),gx,gy,h11,h12,h22,s2,pr,quad);put(j,i,p[0],p[1],p[2],p[3])}}};
      if(RB.active==='workers'&&!sync){/* split the rows over every worker; each block is painted as it arrives */
        const W=RB.workers,id=++W.job,blk=Math.max(st,8*st),t0=performance.now(),live=ringLive;let pending=0,next=0,done;RB.wDone=new Promise(r=>done=r);W.busy=true;
        const msg={N,st,d:M.d,T:M.T,kx:M.kx,ky:M.ky,s2:sd*sd,kbm,pr:{n:pr.n,P:pr.P,KA:pr.KA,KB:pr.KB,X:pr.X,Y:pr.Y,Z:pr.Z,G:pr.G}};
        const send=w=>{if(next>=N)return;const j0=next,j1=Math.min(N,next+blk);next=j1;pending++;w.postMessage({...msg,id,j0,j1})};
        W.pool.forEach(w=>{w.onmessage=e=>{const r=e.data;if(r.id!==W.job||job!==ringJob)return;pending--;let o=0;
          for(let j=r.j0;j<r.j1;j+=r.st)for(let i=0;i<N;i+=r.st){put(j,i,r.out[o],r.out[o+1],r.out[o+2],r.out[o+3]);o+=4}
          present(r.j0,r.j1);send(w);if(!pending){if(live)lqRecord('wk',st,performance.now()-t0);W.busy=false;done();if(W.dirty){W.dirty=false;renderRing()}}};send(w)});
        ringProfile(M);return}
      if(ringLive||sync)rows(0,N);
      else{/* progressive full-resolution pass */
        let j=0;const slice=()=>{if(job!==ringJob)return;const t0=performance.now(),jj=j;while(j<N&&performance.now()-t0<12){rows(j,j+4);j+=4}
          present(jj,j);if(j<N)setTimeout(slice,0)};
        slice();ringProfile(M);return}}
  }else{D.fill(0);for(let o=3;o<D.length;o+=4)D[o]=255}
  present(0,N);ringProfile(M);if(ringLive&&cs.length)lqRecord(pathKey,st,performance.now()-T0);LQ.ms=performance.now()-T0}
function ringProfile(M){const cs=act();
  /* profile cut: through the centre along the tilt direction n = (αx, αy)/|α| (along x when there is no tilt) */
  const ax=+$('tx').value,ay=+$('ty').value,an=Math.hypot(ax,ay),nx=an?ax/an:1,ny=an?ay/an:0,phi=Math.atan2(ny,nx)*180/Math.PI;
  const svg=$('prof'),W=svg.clientWidth,H=svg.clientHeight;if(!W)return;
  const pl=46,pr2=10,pt=10,pb=42,x=u=>pl+(u+1)/2*(W-pl-pr2),y=v=>pt+(1-v)*(H-pt-pb),mute=css('--mute');
  let s='';for(const v of [0,0.5,1])s+=`<line x1="${pl}" x2="${W-pr2}" y1="${y(v)}" y2="${y(v)}" stroke="${mute}" stroke-opacity="${v?0.15:0.5}"/><text x="${pl-6}" y="${y(v)+4}" font-size="12" fill="${mute}" text-anchor="end">${v}</text>`;
  for(const u of [-1,-0.5,0,0.5,1]){const t=Math.sign(u)*M.th(Math.abs(u))*180/Math.PI;s+=`<text x="${x(u)}" y="${H-pb+16}" font-size="12" fill="${mute}" text-anchor="${u<-0.9?'start':u>0.9?'end':'middle'}">${F(t,2)}°</text>`}
  /* same anti-aliased range plot as the interferogram, along the cut */
  {const pc=$('profC'),dpr=window.devicePixelRatio||1;pc.width=Math.round(W*dpr);pc.height=Math.round(H*dpr);const pg=pc.getContext('2d');pg.clearRect(0,0,pc.width,pc.height);
    if(cs.length){const col=cssRGB('--fr');densityPlot(pg,Math.round(pl*dpr),Math.round(pt*dpr),Math.round((W-pl-pr2)*dpr),Math.round((H-pt-pb)*dpr),t=>{const u=-1+2*t;return M.opd(u*nx,u*ny)},cs,()=>col)}}
  s+=`<text x="${(pl+W-pr2)/2}" y="${H-4}" font-size="12" fill="${mute}" text-anchor="middle">${an?`θ along the tilt direction (${F(phi,3)}° from x)`:"θ along x"}</text><text transform="translate(12 ${(pt+H-pb)/2}) rotate(-90)" font-size="12" fill="${mute}" text-anchor="middle">I / I_tot</text>`;svg.innerHTML=s}

