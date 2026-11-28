/* ---------- touch: wording, finger-sized hit areas and two-finger pinch (the touch version of scroll-to-zoom) ---------- */
/* TOUCH: the main pointer is a finger (phones, tablets). It sizes the drawn handles; hit tests size by each event's own pointerType */
const TOUCH=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const fat=e=>e.pointerType==='touch'?2:1;   /* hit-radius factor: a fingertip covers about twice a mouse's tolerance */
if(TOUCH){document.documentElement.classList.add('touch');document.querySelectorAll('[data-touch]').forEach(el=>{el.textContent=el.dataset.touch})}
/* pinch(el,{start,scale,end}): two fingers on el. start() lets el's one-finger drag stop; scale(f,cx) gets the distance ratio
   old/new since the last move (> 1 when the fingers close, like a wheel scroll down) and the midpoint's x in el's box.
   It listens in the capture phase and swallows the events of a pinch, so el's own one-finger handlers never see them. */
function pinch(el,h){const pts=new Map();let last=0;
  const span=()=>{const[a,b]=[...pts.values()];return Math.max(Math.hypot(a.x-b.x,a.y-b.y),8)};
  const mid=()=>{const[a,b]=[...pts.values()];return(a.x+b.x)/2-el.getBoundingClientRect().left};
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){e.stopImmediatePropagation();e.preventDefault();el.setPointerCapture(e.pointerId);h.start&&h.start();last=span()}},true);
  el.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(pts.size>=2){e.stopImmediatePropagation();const s=span();h.scale(last/s,mid());last=s}},true);
  const up=e=>{if(!pts.delete(e.pointerId))return;if(pts.size===1){e.stopImmediatePropagation();h.end&&h.end()}};
  el.addEventListener('pointerup',up,true);el.addEventListener('pointercancel',up,true)}
/* longPress(el,open,onHandle): a right-click, or a finger held 500 ms that moves less than 10 px with no second finger and
   didn't start on a drag handle (onHandle(e) true), calls open(x,y) (MS-23: the copy menu). It never calls preventDefault or
   stopPropagation on pointer events, so el's own tap and drag handlers work as before. A second finger anywhere (the pinch
   swallows its events on el, so this listens on the document) cancels it. Android also sends contextmenu on a long-press:
   that one is dropped when the timer already opened the menu. */
let lpT=null;const lpCancel=()=>{clearTimeout(lpT);lpT=null};
document.addEventListener('pointerdown',()=>lpCancel(),true);
function longPress(el,open,onHandle=()=>false){let x0=0,y0=0,id=-1,fired=0;
  el.addEventListener('contextmenu',e=>{e.preventDefault();if(performance.now()-fired<1500)return;if(e.pointerType==='touch'&&onHandle(e))return;open(e.clientX,e.clientY)});
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||onHandle(e))return;x0=e.clientX;y0=e.clientY;id=e.pointerId;
    lpT=setTimeout(()=>{lpT=null;fired=performance.now();open(x0,y0)},500)});
  el.addEventListener('pointermove',e=>{if(lpT&&e.pointerId===id&&Math.hypot(e.clientX-x0,e.clientY-y0)>10)lpCancel()});
  for(const ev of ['pointerup','pointercancel'])el.addEventListener(ev,e=>{if(e.pointerId===id)lpCancel()})}
