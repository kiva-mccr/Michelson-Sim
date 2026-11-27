/* ---------- ring renderers: WebGPU → WebGL2 → CPU workers → CPU main thread ----------
   Every backend evaluates the same per-pixel formula as pixVal() above: the exact Gaussian-footprint average of each sub-band,
   first-order or second-order (avgQ) by the same 3e-4 curvature test, with the same group skipping.
   GPUs work in 32-bit floats, so the large part of each fringe phase is taken out in 64-bit on the CPU:
   k_b·δ̄ = [k_b·2d mod 2π] + k_b·Δ, with Δ = −4d sin²(θ/2) + k_x u + k_y v computed on the GPU.
   Where Δ is large the fringes are far finer than a pixel and the footprint average has already damped them to ~0.
   In an evenly spaced group the first-order terms are stepped from sub-band to sub-band (exact ratios and a rotation) and re-evaluated
   directly every GSTEP sub-bands, as pixVal's CPU fast path does (MS-16).
   The verification table reads the active backend's pixels back and checks them against brute-force integration. */
const RB={pref:'auto',active:'cpu',gpu:null,gl:null,workers:null,busy:false,dirty:false,done:null};
/* always the automatic choice; tests force one with ?renderer=webgpu|webgl2|workers|cpu (no control on the page).
   The old Renderer menu saved its choice here: clear it so nobody stays stuck on it. */
try{RB.pref=new URLSearchParams(location.search).get('renderer')||'auto'}catch(e){}
try{localStorage.removeItem('mich-renderer')}catch(e){}
const TAU=2*Math.PI,GSTEP=8;  /* GPU fast path: sub-bands between direct re-evaluations */
/* pack sub-bands and groups for the GPU: per sub-band (KA, KB, phase0, 0), (P·X, P·Y, P·Z, P);
   per group (a, b, pka, cI), (cX, cY, cZ, Δk_b), (Δk_b·2d mod 2π, 0, 0, 0). Δk_b = g.lin (0 when the group is not evenly spaced). */
function packRing(pr,M){const n=pr.n,sb=new Float32Array(Math.max(8,n*8)),G=pr.G,gr=new Float32Array(Math.max(12,G.length*12));
  for(let k=0;k<n;k++){const o=8*k,p=pr.P[k];sb[o]=pr.KA[k];sb[o+1]=pr.KB[k];sb[o+2]=(pr.KB[k]*2*M.d)%TAU;sb[o+4]=p*pr.X[k];sb[o+5]=p*pr.Y[k];sb[o+6]=p*pr.Z[k];sb[o+7]=p}
  G.forEach((g,i)=>{const o=12*i;gr[o]=g.a;gr[o+1]=g.b;gr[o+2]=g.pka;gr[o+3]=g.cI;gr[o+4]=g.cX;gr[o+5]=g.cY;gr[o+6]=g.cZ;gr[o+7]=g.lin;gr[o+8]=(g.lin*2*M.d)%TAU});
  let kbm=0;for(let k=0;k<n;k++)kbm=Math.max(kbm,pr.KB[k]);return{sb,gr,n,ng:G.length,kbm}}

/* shared pixel maths in GLSL (the WGSL version below repeats it line for line) */
const PIX_GLSL=`
const int GSTEP=${GSTEP};
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
  for(int gi=0;gi<uNG;gi++){vec4 g0=fetchG(3*gi),g1=fetchG(3*gi+1);
    if(g0.z*dmin*dmin>30.){acc+=vec4(g1.xyz,g0.w);continue;}
    int a=int(g0.x+0.5),b=int(g0.y+0.5);
    if(!quad&&g1.w!=0.){/* first-order, evenly spaced group: e^{ex} and the fringe phase stepped (see above) */
      vec4 sa=fetchS(2*a);float D=g1.w,ka=sa.x,kb0=sa.y,qq=1.+2.*ka*t2,rq=(qq-1.)/qq,isq=ka>0.?1./sqrt(qq):1.,e0=ka*dm*dm,st=fetchG(3*gi+2).x+D*Dl-D*dm*rq;
      if(-(e0+0.5*kb0*kb0*t2)/qq<-40.){acc+=vec4(g1.xyz,g0.w);continue;}  /* every fringe term below e^{-40}: the constant part only */
      float c1=cosA(st),s1=cosA(st-1.5707963),g2=exp(-t2*D*D/qq),E=0.,R=0.,C=0.,S=0.;int j=GSTEP;
      for(int k=a;k<b;k++){
        if(j==GSTEP){vec4 s0=fetchS(2*k);float kb=s0.y,ph=s0.z+kb*Dl-kb*dm*rq;E=exp(-(e0+0.5*kb*kb*t2)/qq)*isq;C=cosA(ph);S=cosA(ph-1.5707963);R=exp(-t2*(kb*D+0.5*D*D)/qq);j=0;}
        acc+=fetchS(2*k+1)*(1.+E*C);E*=R;R*=g2;float c=C*c1-S*s1;S=S*c1+C*s1;C=c;j++;}
      continue;}
    for(int k=a;k<b;k++){vec4 s0=fetchS(2*k);float ka=s0.x,kb=s0.y,ph=s0.z+kb*Dl,f;
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
      acc+=fetchS(2*k+1)*(1.+f);}}
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
const GSTEP=${GSTEP};
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
  for(var gi=0;gi<NG;gi++){let g0=GR[3*gi];let g1=GR[3*gi+1];
    if(g0.z*dmin*dmin>30.){acc+=vec4f(g1.xyz,g0.w);continue;}
    let a=i32(g0.x+0.5);let b=i32(g0.y+0.5);
    if(!quad&&g1.w!=0.){/* first-order, evenly spaced group: e^{ex} and the fringe phase stepped (see the GLSL) */
      let sa=SB[2*a];let D=g1.w;let ka=sa.x;let kb0=sa.y;let qq=1.+2.*ka*t2;let rq=(qq-1.)/qq;let isq=select(1.,1./sqrt(qq),ka>0.);let e0=ka*dm*dm;let st=GR[3*gi+2].x+D*Dl-D*dm*rq;
      if(-(e0+0.5*kb0*kb0*t2)/qq<-40.){acc+=vec4f(g1.xyz,g0.w);continue;}  /* every fringe term below e^{-40}: the constant part only */
      let c1=cosA(st);let s1=cosA(st-1.5707963);let g2=exp(-t2*D*D/qq);var E=0.;var R=0.;var C=0.;var S=0.;var j=GSTEP;
      for(var k=a;k<b;k++){
        if(j==GSTEP){let s0=SB[2*k];let kb=s0.y;let ph=s0.z+kb*Dl-kb*dm*rq;E=exp(-(e0+0.5*kb*kb*t2)/qq)*isq;C=cosA(ph);S=cosA(ph-1.5707963);R=exp(-t2*(kb*D+0.5*D*D)/qq);j=0;}
        acc+=SB[2*k+1]*(1.+E*C);E*=R;R*=g2;let c=C*c1-S*s1;S=S*c1+C*s1;C=c;j++;}
      continue;}
    for(var k=a;k<b;k++){let s0=SB[2*k];let ka=s0.x;let kb=s0.y;let ph=s0.z+kb*Dl;var f=0.;
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
      acc+=SB[2*k+1]*(1.+f);}}
  return acc;}
@compute @workgroup_size(8,8) fn cmain(@builtin(global_invocation_id) id:vec3u){
  let N=f32(P.a.x);let k=P.a.z;let Nl=u32(P.a.w);if(id.x>=Nl||id.y>=Nl){return;}let h=N*0.5;
  let u=((f32(id.x)+0.5)*k-h)/h;let v=-((f32(id.y)+0.5)*k-h)/h;let rc=1.+6.*k/N;if(u*u+v*v>rc*rc){OUT[id.y*Nl+id.x]=vec4f(0.);return;}OUT[id.y*Nl+id.x]=pix(u,v);}`;
const WGSL_R=WGSL_HEAD+`
@group(0) @binding(3) var<storage,read> OUT:array<vec4f>;
fn gam(v0:f32)->f32{let v=clamp(v0,0.,1.);return select(1.055*pow(v,1./2.4)-0.055,12.92*v,v<=0.0031308);}
@vertex fn vmain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fmain(@builtin(position) pos:vec4f)->@location(0) vec4f{
  let Nl=u32(P.a.w);var x:vec4f;
  if(Nl==u32(P.a.x)){x=OUT[min(u32(pos.y),Nl-1u)*Nl+min(u32(pos.x),Nl-1u)];}
  else{/* a preview grid: bilinear between the 4 nearest grid points, in XYZ and I (linear light), then toned */
    let k=P.a.x/f32(Nl);let fx=clamp(pos.x/k-0.5,0.,f32(Nl-1u));let fy=clamp(pos.y/k-0.5,0.,f32(Nl-1u));
    let i0=u32(fx);let j0=u32(fy);let i1=min(i0+1u,Nl-1u);let j1=min(j0+1u,Nl-1u);let tx=fx-f32(i0);let ty=fy-f32(j0);
    x=mix(mix(OUT[j0*Nl+i0],OUT[j0*Nl+i1],tx),mix(OUT[j1*Nl+i0],OUT[j1*Nl+i1],tx),ty);}
  var c=vec3f(dot(vec3f(3.2406,-1.5372,-0.4986),x.xyz),dot(vec3f(-0.9689,1.8758,0.0415),x.xyz),dot(vec3f(0.0557,-0.2040,1.0570),x.xyz));
  let m=min(min(c.r,c.g),min(c.b,0.));c=(c-m)*P.c.w;return vec4f(gam(c.r),gam(c.g),gam(c.b),1.);}`;
/* fragment-shader version for WebGL2 */
const GLSL_HEAD=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
uniform sampler2D uSB,uGR,uOut;uniform int uNG,uN,uNl;uniform float uD,uT,uKx,uKy,uS2,uKbm,uGain;out vec4 o;
vec4 fetchS(int t){return texelFetch(uSB,ivec2(t&1023,t>>10),0);}vec4 fetchG(int t){return texelFetch(uGR,ivec2(t&1023,t>>10),0);}`;
const GLSL_PIX=GLSL_HEAD+PIX_GLSL+`
void main(){float h=float(uN)*0.5,k=float(uN)/float(uNl);vec2 p=(floor(gl_FragCoord.xy)+0.5)*k;float u=(p.x-h)/h,v=(p.y-h)/h,rc=1.+6.*k/float(uN);if(u*u+v*v>rc*rc){o=vec4(0.);return;}o=pix(u,v);}`;
const GLSL_TONE=GLSL_HEAD+`
float gam(float v){v=clamp(v,0.,1.);return v<=0.0031308?12.92*v:1.055*pow(v,1./2.4)-0.055;}`+TONE_GLSL+`
void main(){if(uNl==uN){o=vec4(tone(texelFetch(uOut,ivec2(gl_FragCoord.xy),0)),1.);return;}
  /* a preview grid: bilinear between the 4 nearest grid points, in XYZ and I (linear light), then toned */
  float k=float(uN)/float(uNl),m=float(uNl-1);vec2 f=clamp(gl_FragCoord.xy/k-0.5,0.,m);ivec2 a=ivec2(f),b=min(a+1,uNl-1);vec2 t=f-vec2(a);
  vec4 x=mix(mix(texelFetch(uOut,a,0),texelFetch(uOut,ivec2(b.x,a.y),0),t.x),mix(texelFetch(uOut,ivec2(a.x,b.y),0),texelFetch(uOut,b,0),t.x),t.y);
  o=vec4(tone(x),1.);}`;
const GLSL_VS=`#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;

