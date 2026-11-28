/* ---------- the copy / save menu on every plot (MS-23) ---------- */
/* Right-click a plot, or long-press it on a touch screen (longPress in ui-touch.js), for Copy image, Download PNG and Download
   SVG at 2×, 4× or 8× its on-screen size (exports in export.js). */
const rgbOf=v=>`rgb(${cssRGB(v).join(',')})`;
const XM={k:null,s:4,busy:0,el:$('xmenu')};try{XM.s=+localStorage.getItem('mich-export-scale')||4}catch(e){}
const pngOf=o=>new Promise((ok,no)=>o.toBlob(b=>b?ok(b):no(new Error('PNG encoding failed')),'image/png'));
const xSay=t=>{$('xmStat').textContent=t};
function xSizes(){$('xmSize').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.s===XM.s)));const[w,h]=xSize(XM.k,XM.s);$('xmPx').textContent=`${w} × ${h} px`}
function xOpen(k,x,y){XM.k=k;XM.busy++;const m=XM.el;$('xmT').textContent=XP[k].title;xSay('');xSizes();$('xmMp4').hidden=k==='spec'||!MP4OK();$('xmDur').textContent=F(SWT,3)+' s';m.hidden=false;
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
    else if(what==='svg'){xSave(new Blob([await exportSVG(k,s,prog,xStop(id))],{type:'image/svg+xml'}),'svg');xSay('Saved')}
    else{xSay('Rendering frames… 0%');xSave(await exportMP4(k,s,f=>xSay(`Rendering frames… ${Math.round(100*f)}%`),xStop(id)),'mp4');xSay('Saved')}}
  catch(e){if(e&&e.message!=='cancelled'){console.warn('export failed',e);xSay('Failed: '+(e.message||e))}}}
XM.el.querySelectorAll('[data-x]').forEach(b=>b.addEventListener('click',()=>xDo(b.dataset.x)));
$('xmSize').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{XM.s=+b.dataset.s;try{localStorage.setItem('mich-export-scale',XM.s)}catch(e){}xSizes()}));
document.addEventListener('pointerdown',e=>{if(!XM.el.hidden&&!XM.el.contains(e.target))xClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')xClose()});
/* a press on a drag handle doesn't open the menu: it starts a (possibly slow) drag */
const onHandle={spec:e=>!!hit(...pos(e),fat(e)),ring:e=>{const g=ovGeom(e),k=fat(e);return g.rr<=g.R+4*k&&!!ovHandle(g,k)}};
for(const[k,id]of [['spec','spec'],['ring','ringOv'],['prof','profBox'],['ifg','ifgBox'],['out','outBox']])longPress($(id),(x,y)=>xOpen(k,x,y),onHandle[k]);
/* Exported plots check: each range plot exported at the device's own scale, PNG-encoded and decoded again, against the displayed
   canvas wherever the canvas is opaque (8-bit levels; PNG is lossless, and the export recomputes the plot, so a difference means
   the export isn't the displayed plot) */
async function exportCheck(){let e=0,n=0;const s=window.devicePixelRatio||1;
  for(const k of ['ifg','prof']){const cv=$(XP[k].cv),a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,bm=await createImageBitmap(await pngOf(rangePixels(k,s))),
      t=document.createElement('canvas');t.width=bm.width;t.height=bm.height;const g=t.getContext('2d');g.drawImage(bm,0,0);const b=g.getImageData(0,0,t.width,t.height).data;
    for(let i=0;i<a.length;i+=4)if(a[i+3]===255){n++;for(let c=0;c<3;c++)e=Math.max(e,Math.abs(a[i+c]-b[i+c]))}}
  return n?e:Infinity}
