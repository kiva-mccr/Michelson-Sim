/* ---------- the copy / save menu on every plot (MS-22) ---------- */
/* Right-click a plot, or long-press it on a touch screen, for Copy image, Download PNG and Download SVG at 2×, 4× or 8× its
   on-screen size (exports in export.js). A long-press is a touch held 500 ms that moves less than 10 px, with one finger, not
   starting on a drag handle (spectrum dots and width handles, the ring's dot and rim), so slow drags still work. */
const rgbOf=v=>`rgb(${cssRGB(v).join(',')})`;
const XM={k:null,s:4,busy:0,el:$('xmenu')};try{XM.s=+localStorage.getItem('mich-export-scale')||4}catch(e){}
const pngOf=o=>new Promise((ok,no)=>o.toBlob(b=>b?ok(b):no(new Error('PNG encoding failed')),'image/png'));
const xSay=t=>{$('xmStat').textContent=t};
function xSizes(){$('xmSize').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.s===XM.s)));const[w,h]=xSize(XM.k,XM.s);$('xmPx').textContent=`${w} × ${h} px`}
function xOpen(k,x,y){XM.k=k;XM.busy++;const m=XM.el;$('xmT').textContent=XP[k].title;xSay('');xSizes();m.hidden=false;
  const sheet=matchMedia('(pointer:coarse)').matches||innerWidth<600;m.classList.toggle('sheet',sheet);
  if(!sheet){const r=m.getBoundingClientRect();m.style.left=Math.min(x,innerWidth-r.width-8)+'px';m.style.top=Math.min(y,innerHeight-r.height-8)+'px'}
  m.querySelector('[data-x]').focus({preventScroll:true})}
function xClose(){if(!XM.el.hidden){XM.el.hidden=true;XM.busy++}}  /* busy++ cancels a running ring export */
const xStop=id=>()=>XM.busy!==id;
function xSave(blob,ext){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=`${XP[XM.k].name}.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
async function xDo(what){const k=XM.k,s=XM.s,id=XM.busy,prog=f=>xSay(`Rendering… ${Math.round(100*f)}%`);xSay(k==='ring'?'Rendering… 0%':'Rendering…');
  try{if(what==='copy'){const blob=exportPNG(k,s,prog,xStop(id)).then(pngOf);
      try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw 0;await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);xSay('Copied to the clipboard')}
      catch(e){if(e&&e.message==='cancelled')throw e;const b=await blob,u=URL.createObjectURL(b),im=$('copyImg'),a=$('copyDl');URL.revokeObjectURL(im.src);im.src=u;a.href=u;a.download=XP[k].name+'.png';xClose();openDlg('copyDlg')}}
    else if(what==='png'){xSave(await pngOf(await exportPNG(k,s,prog,xStop(id))),'png');xSay('Saved')}
    else{xSave(new Blob([await exportSVG(k,s,prog,xStop(id))],{type:'image/svg+xml'}),'svg');xSay('Saved')}}
  catch(e){if(e&&e.message!=='cancelled'){console.warn('export failed',e);xSay('Failed: '+(e.message||e))}}}
XM.el.querySelectorAll('[data-x]').forEach(b=>b.addEventListener('click',()=>xDo(b.dataset.x)));
$('xmSize').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{XM.s=+b.dataset.s;try{localStorage.setItem('mich-export-scale',XM.s)}catch(e){}xSizes()}));
document.addEventListener('pointerdown',e=>{if(!XM.el.hidden&&!XM.el.contains(e.target))xClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')xClose()});
/* is this press on something that drags? */
const onHandle={spec:e=>!!hit(...pos(e)),ring:e=>{const g=ovGeom(e);if(g.rr>g.R+4)return false;const[dx,dy]=dotPos(g.R);return Math.hypot(g.x+g.R-dx,g.y+g.R-dy)<14||onRim(g)}};
for(const[k,id]of [['spec','spec'],['ring','ringOv'],['prof','profBox'],['ifg','ifgBox'],['out','outBox']]){const el=$(id);let t=null,x0=0,y0=0,n=0,lp=false;
  const cancel=()=>{clearTimeout(t);t=null};
  el.addEventListener('contextmenu',e=>{e.preventDefault();if(lp){lp=false;return}xOpen(k,e.clientX,e.clientY)});
  el.addEventListener('pointerdown',e=>{n++;lp=false;if(e.pointerType==='mouse'||n>1||onHandle[k]?.(e)){cancel();return}x0=e.clientX;y0=e.clientY;
    t=setTimeout(()=>{t=null;lp=true;xOpen(k,x0,y0)},500)});
  el.addEventListener('pointermove',e=>{if(t&&Math.hypot(e.clientX-x0,e.clientY-y0)>10)cancel()});
  for(const ev of ['pointerup','pointercancel'])el.addEventListener(ev,()=>{n=Math.max(0,n-1);cancel()})}
/* Exported plots check: each range plot exported at the device's own scale, PNG-encoded and decoded again, against the displayed
   canvas wherever the canvas is opaque (8-bit levels; PNG is lossless, and the export recomputes the plot, so a difference means
   the export isn't the displayed plot) */
async function exportCheck(){let e=0,n=0;const s=window.devicePixelRatio||1;
  for(const k of ['ifg','prof']){const cv=$(XP[k].cv),a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,bm=await createImageBitmap(await pngOf(rangePixels(k,s))),
      t=document.createElement('canvas');t.width=bm.width;t.height=bm.height;const g=t.getContext('2d');g.drawImage(bm,0,0);const b=g.getImageData(0,0,t.width,t.height).data;
    for(let i=0;i<a.length;i+=4)if(a[i+3]===255){n++;for(let c=0;c<3;c++)e=Math.max(e,Math.abs(a[i+c]-b[i+c]))}}
  return n?e:Infinity}
