/* ---------- export any plot as a high-resolution PNG or an SVG (MS-23) ---------- */
/* Every export is computed again at its own size with the same exact formulas, never scaled up: the range plots are redrawn
   with XDPR = scale (one synchronous redraw, then put back), the ring is a fresh grid of exact footprint averages on its own
   worker pool, and the axes are the plot's own SVG. SVG: the spectrum plots are native vector; the interferogram and the
   profile are the true curve I(δ) as a vector path (the interferogram's stroke a gradient of its perceived colour along δ);
   the ring has no vector form, so its SVG embeds the exact PNG. */
const XP={spec:{box:'specBox',svg:'spec',name:'source-spectrum',title:'Source spectrum'},
  ring:{box:'ringWrap',name:'interference-pattern',title:'Interference pattern'},
  prof:{box:'profBox',svg:'prof',cv:'profC',name:'pattern-profile',title:'Pattern profile',redraw:()=>ringProfile(ringModel())},
  ifg:{box:'ifgBox',svg:'ifg',cv:'ifgC',name:'interferogram',title:'Interferogram',redraw:()=>renderIfg()},
  out:{box:'outBox',svg:'out',name:'interfered-spectrum',title:'Interfered spectrum'}};
const XMAX=4096,xSize=(k,s)=>{const[W,H]=box($(XP[k].box));return k==='ring'?[Math.min(XMAX,Math.round(W*s)),Math.min(XMAX,Math.round(W*s))]:[Math.round(W*s),Math.round(H*s)]};
/* the plot's SVG as a standalone file: the computed presentation styles are inlined (an SVG file sees none of the page's CSS,
   and colours here are CSS variables such as light-dark()), on the panel colour, with optional content under the axes */
const XPROPS=['fill','stroke','stroke-width','stroke-opacity','fill-opacity','opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','font-size','font-weight','font-family','display','visibility'];
function svgFile(k,under=''){const svg=$(XP[k].svg),[W,H]=box(svg),c=svg.cloneNode(true),a=[svg,...svg.querySelectorAll('*')],b=[c,...c.querySelectorAll('*')];
  a.forEach((e,i)=>{const s=getComputedStyle(e);for(const p of XPROPS){const v=s.getPropertyValue(p);if(v)b[i].setAttribute(p,v)}b[i].removeAttribute('style');b[i].removeAttribute('class')});
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${getComputedStyle(svg).fontFamily.replace(/"/g,"'")}"><rect width="${W}" height="${H}" fill="${rgbOf('--panel')}"/>${under}${c.innerHTML}</svg>`}
/* an SVG drawn into a canvas at the given scale */
async function svgRaster(src,g,s){const im=new Image();im.src=URL.createObjectURL(new Blob([src],{type:'image/svg+xml'}));
  try{await im.decode();g.drawImage(im,0,0,im.width*s,im.height*s)}finally{URL.revokeObjectURL(im.src)}}
/* a range plot's pixel layer redrawn at s device px per CSS px, copied, then the plot is put back as it was */
function rangePixels(k,s){const o=XP[k],cv=$(o.cv);XDPR=s;try{o.redraw()}finally{XDPR=0}
  const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;c.getContext('2d').drawImage(cv,0,0);o.redraw();return c}
/* the true curve as a vector path: n+1 samples, enough for 16 per fringe */
function curvePath(n,xy){let p='';for(let i=0;i<=n;i++){const[x,y]=xy(i/n);p+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)}return p}
const fringeN=(dAt,cs)=>{const smax=Math.max(...cs.map(c=>c.s+3*wOf(c)));let tv=0,p=dAt(0);for(let i=1;i<=2000;i++){const d=dAt(i/2000);tv+=Math.abs(d-p);p=d}return clamp(Math.ceil(tv*smax*16),2000,400000)};
function curveSVG(k){const cs=act(),[W,H]=box($(XP[k].svg)),pl=46,pr=10,pt=10,pb=42,X=t=>pl+t*(W-pl-pr),Y=v=>pt+(1-v)*(H-pt-pb);if(!cs.length)return'';
  let dAt,stroke,defs='';
  if(k==='ifg'){const R=RANGE(),SL=sublines();dAt=t=>-R+2*R*t;const m=clamp(Math.ceil(fringeN(dAt,cs)/2),256,20000);let st='';
    for(let i=0;i<=m;i++){const c=rgb8(hueOf(xyzAt(dAt(i/m),0,SL)));st+=`<stop offset="${(i/m).toFixed(6)}" stop-color="rgb(${c})"/>`}
    defs=`<defs><linearGradient id="ifgHue" gradientUnits="userSpaceOnUse" x1="${pl}" x2="${W-pr}" y1="0" y2="0">${st}</linearGradient></defs><rect x="${pl}" y="${pt}" width="${W-pl-pr}" height="${H-pt-pb}" fill="#05070f"/>`;stroke='url(#ifgHue)'}
  else{const M=ringModel(),ax=+$('tx').value,ay=+$('ty').value,an=Math.hypot(ax,ay),nx=an?ax/an:1,ny=an?ay/an:0;dAt=t=>{const u=-1+2*t;return M.opd(u*nx,u*ny)};stroke=rgbOf('--fr')}
  const g=gammaOf(cs),n=fringeN(dAt,cs);
  return defs+`<path d="${curvePath(n,t=>[X(t),Y(0.5*(1+g.re(dAt(t))))])}" fill="none" stroke="${stroke}" stroke-width="${k==='ifg'?0.6:1.5}" stroke-linejoin="round"/>`}
/* the ring at N×N exact footprint averages (N = scale × its CSS size, at most XMAX), on a pool of its own, outside the circle
   transparent (anti-aliased edge); I holds I/I_tot for the Exported ring check. prog(fraction); stop() true cancels. */
async function ringExport(N,prog=()=>{},stop=()=>false){const M=ringModel(),cs=act(),c=document.createElement('canvas');c.width=c.height=N;
  const g=c.getContext('2d'),img=g.createImageData(N,N),D=img.data,I=new Float32Array(N*N),h=N/2;
  if(cs.length){const SL=sublines(),pr=prepSL(SL),gain=ringGain(SL),A=Itot(cs),s2=(PIXSD*2/N)**2,rc=rcut(N,1),blk=16;
    const take=(j0,j1,out)=>{let o=0;for(let j=j0;j<j1;j++)for(let i=0;i<N;i++,o+=4){xyzRGB(D,4*(j*N+i),out[o],out[o+1],out[o+2],gain);I[j*N+i]=out[o+3]/A}};
    let P=null;try{P=window.Worker?initWorkers():null}catch(e){}
    if(P){const msg=wkMsg(N,N,rc*rc,M,s2,pr);let next=0,left=0,done=0;
      await new Promise((res,rej)=>{const send=w=>{if(stop()){P.pool.forEach(x=>x.terminate());rej(new Error('cancelled'));return}if(next>=N){if(!left)res();return}
          const j0=next,j1=Math.min(N,next+blk);next=j1;left++;w.postMessage({...msg,id:1,j0,j1})};
        P.pool.forEach(w=>{w.onmessage=e=>{const m=e.data;take(m.j0,m.j1,m.out);left--;done+=m.j1-m.j0;prog(done/N);send(w)};w.onerror=rej;send(w)})}).finally(()=>P.pool.forEach(x=>x.terminate()))}
    else for(let j0=0;j0<N;j0+=blk){if(stop())throw new Error('cancelled');const j1=Math.min(N,j0+blk),out=new Float32Array((j1-j0)*N*4);let o=0;
      for(let j=j0;j<j1;j++){const v=-((j+0.5)-h)/h;for(let i=0;i<N;i++,o+=4){const u=((i+0.5)-h)/h;if(u*u+v*v>rc*rc)continue;const p=gridPix(M,pr,s2,u,v);out[o]=p[0];out[o+1]=p[1];out[o+2]=p[2];out[o+3]=p[3]}}
      take(j0,j1,out);prog(j1/N);await new Promise(r=>setTimeout(r,0))}}
  else for(let q=3;q<D.length;q+=4)D[q]=255;
  for(let j=0;j<N;j++){const v=(j+0.5-h)/h;for(let i=0;i<N;i++){const u=(i+0.5-h)/h;D[4*(j*N+i)+3]*=clamp((1-Math.hypot(u,v))*h+0.5,0,1)}}
  g.putImageData(img,0,0);return{canvas:c,I,N,M}}
/* the export itself: a PNG canvas, or SVG text */
async function exportPNG(k,s,prog,stop){const o=XP[k];
  if(k==='ring'){const[N]=xSize(k,s);return(await ringExport(N,prog,stop)).canvas}
  const[W,H]=box($(o.svg)),c=document.createElement('canvas');c.width=Math.round(W*s);c.height=Math.round(H*s);const g=c.getContext('2d');
  g.fillStyle=rgbOf('--panel');g.fillRect(0,0,c.width,c.height);if(o.cv)g.drawImage(rangePixels(k,s),0,0);
  await svgRaster(svgFile(k).replace(`fill="${rgbOf('--panel')}"/>`,'fill="none"/>'),g,s);return c}
async function exportSVG(k,s,prog,stop){
  if(k==='ring'){const[W]=box($(XP.ring.box)),c=await exportPNG(k,s,prog,stop);
    return`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><image width="${W}" height="${W}" xlink:href="${c.toDataURL('image/png')}"/></svg>`}
  return svgFile(k,XP[k].cv?curveSVG(k):'')}
