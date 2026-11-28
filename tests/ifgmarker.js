// The interferogram's δ₀ marker (MS-26): drag it with a mouse or a finger to move the mirror, and it stays on screen at the end
// of the window (the window follows it during a sweep). Also checks that a long-press on the marker opens no copy menu, while a
// long-press elsewhere on the plot still does, and that the Interferogram marker check row passes.
//   node tests/ifgmarker.js [index.html]
// Needs Node and `npm i playwright`. Prints one line per check and exits 1 if any fails.
const {chromium,devices}=require('playwright');const {hookPage,routeMathJax}=require('./_common');
const PAGE=hookPage('ifgmarker',`window.__M={d:()=>+$('d').value,R:()=>RANGE(),dmax:()=>DMAX(),IG:()=>({...IG}),swt:v=>SWTset(v),draw:()=>renderIfg(),menu:()=>!XM.el.hidden,
  mk:()=>{const l=$('ifg').querySelector('line[stroke="#ff4d8d"]'),r=$('ifg').getBoundingClientRect();return l?{x:r.left+(+l.getAttribute('x1')),y:r.top+(+l.getAttribute('y1'))+30}:null}};\n`);
let fail=0;const ok=(c,msg)=>{console.log((c?'pass ':'FAIL ')+msg);if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(br,opts){const ctx=await br.newContext(opts);await routeMathJax(ctx);const pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(PAGE.url+'?renderer=cpu');await pg.waitForFunction(()=>window.__M&&document.documentElement.dataset.renderer,null,{timeout:20000});await sleep(600);return{ctx,pg,errs}}
/* where 2d should be drawn: δ mapped through the drawn window, in page px */
const expX=(pg,d)=>pg.evaluate(d=>{const g=__M.IG(),r=document.getElementById('ifg').getBoundingClientRect();return r.left+g.pl+(2*d-g.lo)/(g.hi-g.lo)*(g.W-g.pl-g.pr)},d);
(async()=>{const br=await chromium.launch();
  /* ---- desktop, mouse ---- */
  {const{ctx,pg,errs}=await open(br,{viewport:{width:1366,height:657}});await pg.click('[data-p="hene"]');await sleep(300);
    let m=await pg.evaluate(()=>__M.mk()),d0=await pg.evaluate(()=>__M.d());const g=await pg.evaluate(()=>__M.IG()),R=await pg.evaluate(()=>__M.R());
    await pg.mouse.move(m.x+3,m.y);await sleep(50);ok(await pg.evaluate(()=>document.getElementById('ifgBox').style.cursor)==='ew-resize','mouse: the cursor turns to ↔ over the marker');
    await pg.mouse.move(m.x-60,m.y);await sleep(50);ok(await pg.evaluate(()=>document.getElementById('ifgBox').style.cursor)==='','mouse: and back away from it');
    await pg.mouse.down();await pg.mouse.move(m.x-160,m.y,{steps:4});await pg.mouse.up();await sleep(100);
    ok(Math.abs(await pg.evaluate(()=>__M.d())-d0)<1e-12,'mouse: a drag starting away from the marker does not move the mirror');
    await pg.mouse.move(m.x+3,m.y);await pg.mouse.down();await pg.mouse.move(m.x-97,m.y,{steps:8});await sleep(50);
    const d1=await pg.evaluate(()=>__M.d()),want=d0-100/(g.W-g.pl-g.pr)*2*R/2;
    ok(Math.abs(d1-want)<1e-9*R,`mouse: dragging the marker 100 px left moves d by ${(d1-d0).toFixed(4)} µm (expected ${(want-d0).toFixed(4)})`);
    m=await pg.evaluate(()=>__M.mk());ok(Math.abs(m.x-(await expX(pg,d1)))<0.01,'mouse: the marker is drawn at 2d');
    await pg.mouse.move(m.x+2000,m.y,{steps:4});await sleep(50);const d2=await pg.evaluate(()=>__M.d()),dm=await pg.evaluate(()=>__M.dmax());
    ok(Math.abs(d2-Math.min(g.hi/2,dm))<1e-9*R,`mouse: past the right edge d stops at the window's end or the mirror range (${d2.toFixed(4)} µm)`);
    await pg.mouse.up();await sleep(200);
    ok(JSON.stringify(await pg.evaluate(()=>[__M.IG().lo,__M.IG().hi]))===JSON.stringify([g.lo,g.hi]),'mouse: the window does not scroll during or after a drag inside it');
    /* sweep: the marker stays on screen and at 2d while the window follows it (each sample draws the interferogram for the current d first, as the frame would) */
    await pg.evaluate(()=>__M.swt(2));await pg.click('#dPlay');let bad=0,n=0,moved=0,out=0;const lo0=g.lo;
    for(let i=0;i<60;i++){await sleep(60);const s=await pg.evaluate(()=>{__M.draw();const g=__M.IG(),l=document.querySelector('#ifg line[stroke="#ff4d8d"]');return{g,x:l?+l.getAttribute('x1'):NaN,d:__M.d()}});
      n++;const f=(s.x-s.g.pl)/(s.g.W-s.g.pl-s.g.pr);if(!(f>=-1e-9&&f<=1+1e-9))out++;if(Math.abs(s.g.lo+f*(s.g.hi-s.g.lo)-2*s.d)>1e-6*R)bad++;if(s.g.lo!==lo0)moved++}
    await pg.click('#dPlay');
    ok(!out&&!bad,`sweep: the marker is inside the plot and at 2d in all ${n} sampled frames (${out} outside, ${bad} off)`);
    ok(moved>0,`sweep: the window follows the marker past the end of the span (${moved} of ${n} frames scrolled; mirror range ±${dm} µm, window ±${R} µm)`);
    await pg.evaluate(()=>document.getElementById('verBtn').click());await pg.waitForFunction(()=>!/Running/.test(document.getElementById('verAt').textContent),null,{timeout:120000});
    const row=await pg.evaluate(()=>[...document.querySelectorAll('#ver tr')].map(r=>r.innerText).find(t=>/Interferogram marker/.test(t))||'');
    ok(/pass/.test(row),'check table: '+row.replace(/\s+/g,' '));
    ok(!errs.length,'desktop: no page errors '+errs.join('; '));await ctx.close()}
  /* ---- phone, finger ---- */
  {const{ctx,pg,errs}=await open(br,{...devices['iPhone 13']});const cdp=await ctx.newCDPSession(pg),T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i}))});
    await pg.evaluate(()=>document.getElementById('ifgBox').scrollIntoView({block:'center'}));await sleep(300);
    let m=await pg.evaluate(()=>__M.mk());const d0=await pg.evaluate(()=>__M.d());
    await T('touchStart',[[m.x+8,m.y]]);for(let i=1;i<=10;i++){await T('touchMove',[[m.x+8-6*i,m.y]]);await sleep(16)}await T('touchEnd',[]);await sleep(200);
    const d1=await pg.evaluate(()=>__M.d());m=await pg.evaluate(()=>__M.mk());
    ok(d1<d0&&Math.abs(m.x-(await expX(pg,d1)))<0.01,`phone: a finger drags the marker (d ${d0.toFixed(3)} → ${d1.toFixed(3)} µm, drawn at 2d)`);
    await T('touchStart',[[m.x+5,m.y]]);await sleep(700);await T('touchEnd',[]);await sleep(200);
    ok(!(await pg.evaluate(()=>__M.menu())),'phone: a long-press on the marker opens no copy menu');
    const r=await pg.evaluate(()=>{const r=document.getElementById('ifgBox').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}),fx=Math.abs(m.x-(r.x+r.w*0.3))>40?0.3:0.6;
    await T('touchStart',[[r.x+r.w*fx,r.y+r.h*0.4]]);await sleep(700);await T('touchEnd',[]);await sleep(200);
    ok(await pg.evaluate(()=>__M.menu()),'phone: a long-press elsewhere on the plot still opens the copy menu');
    ok(!errs.length,'phone: no page errors '+errs.join('; '));await ctx.close()}
  await br.close();PAGE.done();process.exit(fail?1:0)})().catch(e=>{console.error(e);PAGE.done();process.exit(1)});
