/* ---------- ring pattern ----------
   Screen point (u,v) in [-1,1]^2 (r = 1 at the edge of the field). Lens mapping: tan(theta) = r tan(theta_max).
   Mirror-plane coordinates for the tilt wedge: x = a u, y = a v, a = L tan(theta_max), L = 28.4 mm (a = 5 mm at 10°).
   OPD: delta(u,v) = 2 d cos(theta) + 2 (alpha_x x + alpha_y y). Every pixel is the exact footprint average above.
   With zero tilt the pattern is radial, so it is evaluated on a radial grid at 16 samples per pixel (4 while moving) and linearly interpolated. */
const ring=$('ring'),rctx=ring.getContext('2d');let ringLive=false,Ibuf=null;
/* The canvas is square but shown as a circle (CSS border-radius), so grid points with r > rcut are never seen and are not evaluated:
   they are stored as 0 (black). The margin is RCUT grid cells, wider than the CSS edge anti-aliasing and the preview upscaling filters. */
const RCUT=3,rcut=(N,k)=>1+RCUT*2*k/N;
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
  const er=Q.e0+Q.hs*(k2r*qr-k2i*qi)-0.25*Math.log(dd);if(er<-40)return 0;  /* cut off before the phase is needed */
  return Math.exp(er)*Math.cos(kb*dm+Q.hs*(k2r*qi+k2i*qr)-0.5*Math.atan2(di,dr))}
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

