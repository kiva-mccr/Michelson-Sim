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
/* saving a file: inside the claude.ai artifact viewer a page may not download by itself, so it asks the viewer through the
   platform's downloads capability (a confirmation); opened as a plain file, use() is absent and a download link does it */
const DL=()=>window.claude?.use?Promise.resolve(window.claude.use('downloads')).catch(()=>null):Promise.resolve(null);  /* use() is memoized by the platform */
async function xSave(blob,name){const d=await DL();
  if(d){try{await d.save({filename:name,data:blob});return'Saved'}catch(e){if(e&&e.code==='declined')return'Not saved';
    if(!['unavailable','not_granted','capability_disabled','capability_removed'].includes(e&&e.code))throw new Error(e&&e.code==='host_unavailable'?'this app cannot save files; open the page in a browser':(e&&(e.message||e.code))||'save failed')}}
  const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);return'Saved'}
/* the MP4's progress with an estimate of the time left: the mean time per frame since the first one (which also sets up the
   encoder) times the frames still to go, shown from the second frame on */
const hms=t=>{t=Math.max(1,Math.round(t));return t<60?`${t} s`:t<3600?`${Math.floor(t/60)} min ${String(t%60).padStart(2,'0')} s`:`${Math.floor(t/3600)} h ${String(Math.floor(t/60)%60).padStart(2,'0')} min`};
function mp4Eta(){let t1=0;return(i,n)=>{const now=performance.now();if(i===1)t1=now;
  xSay(`Rendering frame ${i} of ${n} (${Math.round(100*i/n)}%)`+(i>1&&i<n?` · about ${hms((now-t1)/(i-1)*(n-i)/1000)} left`:''))}}
async function xDo(what){const k=XM.k,s=XM.s,id=XM.busy,prog=f=>xSay(`Rendering… ${Math.round(100*f)}%`);xSay(k==='ring'?'Rendering… 0%':'Rendering…');
  try{if(what==='copy'){const blob=exportPNG(k,s,prog,xStop(id)).then(pngOf);
      try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw 0;await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);xSay('Copied to the clipboard')}
      catch(e){if(e&&e.message==='cancelled')throw e;const b=await blob,im=$('copyImg');URL.revokeObjectURL(im.src);im.src=URL.createObjectURL(b);XM.copied={b,name:XP[k].name+'.png'};xClose();openDlg('copyDlg')}}
    else if(what==='png')xSay(await xSave(await pngOf(await exportPNG(k,s,prog,xStop(id))),XP[k].name+'.png'));
    else if(what==='svg')xSay(await xSave(new Blob([await exportSVG(k,s,prog,xStop(id))],{type:'image/svg+xml'}),XP[k].name+'.svg'));
    else{xSay('Rendering frames… 0%');xSay(await xSave(await exportMP4(k,s,mp4Eta(),xStop(id)),XP[k].name+'.mp4'))}}
  catch(e){if(e&&e.message!=='cancelled'){console.warn('export failed',e);xSay('Failed: '+(e.message||e))}}}
$('copyDl').addEventListener('click',()=>{if(XM.copied)xSave(XM.copied.b,XM.copied.name).catch(e=>console.warn('save failed',e))});
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
