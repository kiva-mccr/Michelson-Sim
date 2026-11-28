/* ---------- direct manipulation: drag on the pattern for tilt / field of view, mirror rail for d ---------- */
const ov=$('ringOv'),TMAXU=500;let rdrag=null;
/* field of view: 0.5–85° (the ring maps tanθ linearly, so 85° is near the lens limit) */
const setFov=v=>widen('fov',+clamp(v,0.5,85).toPrecision(4),false);
const setTilt=(x,y)=>{widen('tx',Math.round(x*10)/10,true);widen('ty',Math.round(y*10)/10,true)};
function ovGeom(e){const r=ov.getBoundingClientRect(),R=r.width/2,x=e.clientX-r.left-R,y=e.clientY-r.top-R;return{R,x,y,rr:Math.hypot(x,y)}}
const onRim=(g,k=1)=>Math.abs(g.rr-g.R)<Math.max(9*k,0.06*g.R);
/* tilt handle: the white dot sits at (αx, αy) scaled so 500 µrad = 92% of the radius, and follows the cursor 1:1 while dragged.
   Within SNAP px of the centre it locks to 0, 0. At 0, 0 it is hidden until the pointer is over the pattern, except on touch devices, which have no hover. */
const DOTK=0.92,SNAP=10;let ovHover=null;
const dotPos=c=>{const ax=+$('tx').value,ay=+$('ty').value,f=c*DOTK/TMAXU;let x=ax*f,y=-ay*f;const L=Math.hypot(x,y),mx=c*DOTK;if(L>mx){x*=mx/L;y*=mx/L}return[c+x,c+y]};
function renderOv(){const s=box(ov)[0];if(!s)return;const c=s/2,[ex,ey]=dotPos(c),L=Math.hypot(ex-c,ey-c),zero=L<0.5;
  const hx=c+(c-3)*Math.SQRT1_2,hy=c+(c-3)*Math.SQRT1_2,drag=rdrag&&rdrag.m!=='rim';
  const showDot=!zero||!!ovHover||drag||TOUCH;  /* at 0, 0 the dot shows whenever the pointer is over the pattern (always on touch) */
  const big=drag||(ovHover&&Math.hypot(ovHover[0]-ex,ovHover[1]-ey)<14);
  const tx=+$('tx').value,ty=+$('ty').value,tn=Math.hypot(tx,ty),nx=tn?tx/tn:1,ny=tn?ty/tn:0;  /* dashed profile cut through the centre along the tilt direction */
  /* the cut line is a persistent element, only moved when the tilt direction or the size changes, never repainted with the pattern */
  if(!ov.querySelector('#ovCut')){ov.innerHTML='<line id="ovCut" stroke="#fff" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 5" pointer-events="none"/><g id="ovDyn"></g>'}
  const cut=ov.querySelector('#ovCut'),key=[c,nx,ny].join();if(cut.dataset.k!==key){cut.dataset.k=key;cut.setAttribute('x1',c-nx*c);cut.setAttribute('y1',c+ny*c);cut.setAttribute('x2',c+nx*c);cut.setAttribute('y2',c-ny*c)}
  ov.querySelector('#ovDyn').innerHTML=`<circle cx="${c}" cy="${c}" r="${c-3}" fill="none" stroke="#fff" stroke-opacity="${rdrag&&rdrag.m==='rim'?.9:.25}" stroke-width="2" stroke-dasharray="5 6"/>`+
   (drag?`<circle cx="${c}" cy="${c}" r="${SNAP}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-dasharray="2 2"/>`:'')+
   (L>1.5?`<line x1="${c}" y1="${c}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round"/>`:'')+
   (showDot?`<circle cx="${ex}" cy="${ey}" r="${(big?7:5.5)*(TOUCH?1.4:1)}" fill="#fff" fill-opacity="${zero&&!drag?.75:.95}" stroke="#000" stroke-opacity=".35"/>`:'')+
   `<circle cx="${hx}" cy="${hy}" r="6" fill="${css('--acc')}" stroke="#fff" stroke-width="1.5"/>`}
/* MS-9: snapping glides. Entering the snap circle (or Reset tilt, or a double-click) moves the tilt itself to 0, 0 over
   GLIDE ms (ease-out cubic), and leaving the circle glides back out to the cursor. The tilt value glides, not just the dot,
   so every frame of the glide is the true pattern for that tilt (as a live preview; the exact image follows when it lands).
   A target that moves during a glide (the cursor) is followed. With reduced motion, it jumps. */
const GLIDE=300;let tGlide=null,inSnap=false;
const noMotion=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function glideTilt(x,y){if(noMotion()){setTilt(x,y);update(!!rdrag);return}
  if(tGlide){tGlide.x1=x;tGlide.y1=y;return}
  tGlide={x0:+$('tx').value,y0:+$('ty').value,x1:x,y1:y,t0:performance.now()};
  const step=t=>{const g=tGlide;if(!g)return;const p=clamp((t-g.t0)/GLIDE,0,1),e=1-(1-p)**3;
    if(p<1){setTilt(g.x0+(g.x1-g.x0)*e,g.y0+(g.y1-g.y0)*e);update(true);requestAnimationFrame(step)}
    else{tGlide=null;setTilt(g.x1,g.y1);update(!!rdrag)}};
  requestAnimationFrame(step)}
function tiltFromDot(c,x,y,fine){/* x,y: dot position relative to the centre, in px */
  const f=TMAXU/(c*DOTK),now=!fine&&Math.hypot(x,y)<SNAP,edge=now!==inSnap;inSnap=now;
  if(now){if(edge)glideTilt(0,0);return}
  if(edge||tGlide)glideTilt(x*f,-y*f);else setTilt(x*f,-y*f)}
ov.addEventListener('pointermove',e=>{const g=ovGeom(e);ovHover=[g.x+g.R,g.y+g.R];
  if(!rdrag){const[dx,dy]=dotPos(g.R),onDot=Math.hypot(ovHover[0]-dx,ovHover[1]-dy)<14;ov.style.cursor=onDot?'grab':onRim(g)?'nwse-resize':'default';renderOv();return}
  if(rdrag.m==='rim')setFov(rdrag.f0*Math.max(g.rr,4)/Math.max(rdrag.r0,4));
  else tiltFromDot(g.R,g.x,g.y,e.shiftKey);update(true)});
ov.addEventListener('pointerleave',()=>{ovHover=null;if(!rdrag)renderOv()});
/* which handle a press is on: 'dot', 'rim' or null (also the long-press test in ui-copy.js) */
const ovHandle=(g,k)=>{const[dx,dy]=dotPos(g.R);return Math.hypot(g.x+g.R-dx,g.y+g.R-dy)<14*k?'dot':onRim(g,k)?'rim':null};
/* a finger double-tap resets the tilt like a double-click (not every touch browser sends dblclick) */
let lastTap=null;
ov.addEventListener('pointerdown',e=>{if(e.button>0)return;const g=ovGeom(e),k=fat(e);if(g.rr>g.R+4*k)return;
  if(e.pointerType==='touch'){const now=performance.now();if(lastTap&&now-lastTap.t<350&&Math.hypot(g.x-lastTap.x,g.y-lastTap.y)<30){lastTap=null;glideTilt(0,0);return}lastTap={t:now,x:g.x,y:g.y}}
  const m=ovHandle(g,k);if(!m)return;
  e.preventDefault();ov.setPointerCapture(e.pointerId);if(m==='dot')inSnap=!+$('tx').value&&!+$('ty').value;rdrag={m,r0:g.rr,f0:+$('fov').value};if(onDot)ov.style.cursor='grabbing';renderOv()});
const rend=()=>{if(rdrag){const wasDot=rdrag.m==='dot';rdrag=null;ov.style.cursor=wasDot?'grab':'default';renderOv();update(false)}};ov.addEventListener('pointerup',rend);ov.addEventListener('pointercancel',rend);
ov.addEventListener('dblclick',()=>glideTilt(0,0));
/* scrolling on the pattern zooms: scroll up narrows the field of view (zoom in), scroll down widens it */
ov.addEventListener('wheel',e=>{e.preventDefault();setFov(+$('fov').value*Math.pow(1.0015,e.deltaY));update(true);settle()},{passive:false});
pinch(ov,{start:()=>{rdrag=null;renderOv()},scale:f=>{setFov(+$('fov').value*f);update(true)},end:settle});
ov.addEventListener('keydown',e=>{const st=e.shiftKey?1:10,k={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,st],ArrowDown:[0,-st]}[e.key];
  if(k){e.preventDefault();tGlide=null;setTilt(+$('tx').value+k[0],+$('ty').value+k[1]);update(false)}
  if(e.key==='+'||e.key==='-'){e.preventDefault();setFov(+$('fov').value*(e.key==='+'?1.1:1/1.1));update(false)}});
