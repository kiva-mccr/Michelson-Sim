/* ---------- copy a plot as an image ---------- */
/* plotCanvas composes a plot box (its pixel canvas plus the SVG axes on top) into one canvas at the canvas's own device
   resolution, on the panel colour. The SVG is drawn as an image, which can't see the page's CSS, so its CSS-variable
   colours are replaced by resolved rgb() first and a system font is set. overlay=false leaves the SVG out (the Copied
   image check compares that against the displayed canvas). */
const rgbOf=v=>`rgb(${cssRGB(v).join(',')})`;
async function plotCanvas(id,overlay=true){
  const bx=$(id),cv=bx.querySelector('canvas'),svg=bx.querySelector('svg'),[W,H]=box(svg),k=cv.width/W,o=document.createElement('canvas');
  o.width=cv.width;o.height=cv.height;const g=o.getContext('2d');g.fillStyle=rgbOf('--panel');g.fillRect(0,0,o.width,o.height);g.drawImage(cv,0,0);
  if(overlay){const src=svg.outerHTML.split(`"${css('--mute')}"`).join(`"${rgbOf('--mute')}"`)
      .replace('<svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui,sans-serif"`),
      im=new Image();im.src=URL.createObjectURL(new Blob([src],{type:'image/svg+xml'}));
    try{await im.decode();g.drawImage(im,0,0,W*k,H*k)}finally{URL.revokeObjectURL(im.src)}}
  return o}
const pngOf=o=>new Promise((ok,no)=>o.toBlob(b=>b?ok(b):no(new Error('PNG encoding failed')),'image/png'));
/* the clipboard where the browser allows images there; otherwise (some mobile browsers, a page embedded without
   clipboard permission) a popup with the image, which can be long-pressed or right-clicked to copy, and a download link */
async function copyPlot(btn,id,name){
  const blob=plotCanvas(id).then(pngOf),say=t=>{btn.textContent=t;clearTimeout(btn._t);btn._t=setTimeout(()=>btn.textContent='Copy image',1600)};
  try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw 0;
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);say('Copied')}
  catch(e){const b=await blob,u=URL.createObjectURL(b),im=$('copyImg'),a=$('copyDl');URL.revokeObjectURL(im.src);
    im.src=u;a.href=u;a.download=name+'.png';openDlg('copyDlg');say('Copy image')}}
$('ifgCopy').addEventListener('click',e=>copyPlot(e.currentTarget,'ifgBox','interferogram'));
/* Copied image check: the PNG, decoded again, against the displayed canvas over the plot area (where the canvas is opaque) */
async function copyCheck(){
  const cv=$('ifgC'),a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,bm=await createImageBitmap(await pngOf(await plotCanvas('ifgBox',false))),
    t=document.createElement('canvas');t.width=bm.width;t.height=bm.height;const g=t.getContext('2d');g.drawImage(bm,0,0);const b=g.getImageData(0,0,t.width,t.height).data;
  let e=0,n=0;for(let i=0;i<a.length;i+=4)if(a[i+3]===255){n++;for(let c=0;c<3;c++)e=Math.max(e,Math.abs(a[i+c]-b[i+c]))}
  return n?e:Infinity}
