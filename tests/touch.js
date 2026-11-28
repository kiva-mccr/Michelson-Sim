// Touch controls on a phone (MS-22): drags that the page must not steal, tap to add, the selection bar, pinch zooms,
// and no sideways page scroll at phone widths. Emulates an iPhone 13 (and a 360 px Android and a phone in landscape)
// with real touch events through the DevTools protocol, so the browser's own scroll and touch-action rules apply.
//   node tests/touch.js [index.html]
// Needs Node and `npm i playwright`. Prints one line per check and exits 1 if any fails.
const {chromium,devices}=require('playwright');const {hookPage,routeMathJax}=require('./_common');
const PAGE=hookPage('touch',`window.__T={comps:()=>comps,sel:()=>sel,fov:()=>+$('fov').value,dmax:()=>DMAX(),R:()=>RANGE(),win:()=>outWin().slice()};\n`);
let fail=0;const ok=(c,msg)=>{console.log((c?'pass ':'FAIL ')+msg);if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(br,dev,state){const ctx=await br.newContext({...dev});await routeMathJax(ctx);
  if(state)await ctx.addInitScript(st=>localStorage.setItem('mich-sim-v2',JSON.stringify(st)),state);
  const pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(PAGE.url+'?renderer=cpu');await pg.waitForFunction(()=>window.__T&&document.documentElement.dataset.renderer,null,{timeout:20000});await sleep(500);
  const cdp=await ctx.newCDPSession(pg);
  const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i}))});
  const rect=sel=>pg.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}},sel);
  const show=async sel=>{await pg.evaluate(s=>document.querySelector(s).scrollIntoView({block:'center'}),sel);await sleep(250);return rect(sel)};
  /* one finger along a straight path, or two fingers moving apart (k>0) or together (k<0) about a centre */
  const drag=async(x0,y0,dx,dy,n=10)=>{await T('touchStart',[[x0,y0]]);for(let i=1;i<=n;i++){await T('touchMove',[[x0+dx*i/n,y0+dy*i/n]]);await sleep(16)}await T('touchEnd',[]);await sleep(150)};
  const pinch=async(cx,cy,ax,ay,k,n=8)=>{const P=s=>[[cx-ax*s,cy-ay*s],[cx+ax*s,cy+ay*s]];await T('touchStart',[P(1)[0]]);await T('touchStart',P(1));
    for(let i=1;i<=n;i++){await T('touchMove',P(1+k*i/n));await sleep(16)}await T('touchEnd',[P(1+k)[0]]);await T('touchEnd',[]);await sleep(400)};
  return{ctx,pg,errs,T,rect,show,drag,pinch}}
(async()=>{const br=await chromium.launch();
  /* ---- iPhone 13: the spectrum editor ---- */
  {const P=await open(br,devices['iPhone 13']),{pg}=P;
    const sp=await P.show('#spec'),dotAt=()=>pg.evaluate(()=>{const r=document.querySelector('#spec circle').getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2]});
    let[x,y]=await dotAt();const s0=(await pg.evaluate(()=>__T.comps()[0].s));
    await P.drag(x+8,y+6,-80,60);const[x1,y1]=await dotAt();
    ok(Math.abs(x1-(x+8-80))<1.5&&Math.abs(y1-(y+6+60))<1.5,`spectrum: a finger drag moves the dot all the way (${(x1-x).toFixed(1)}, ${(y1-y).toFixed(1)} px for -72, 66 from the dot)`);
    ok((await pg.evaluate(()=>__T.comps()[0].s))!==s0&&(await pg.evaluate(()=>__T.sel()))===0,'spectrum: the dragged component changed and is selected');
    const n0=await pg.evaluate(()=>__T.comps().length);
    await P.drag(sp.x+sp.w*0.85,sp.y+sp.h*0.45,0,0,1);
    ok(await pg.evaluate(()=>__T.comps().length)===n0+1,'spectrum: a tap on empty plot adds a line');
    await P.drag(sp.x+sp.w*0.3,sp.y+sp.h*0.3,4,-60);
    ok(await pg.evaluate(()=>__T.comps().length)===n0+1,'spectrum: a swipe on empty plot adds nothing');
    await P.T('touchStart',[[sp.x+sp.w*0.3,sp.y+sp.h*0.5]]);await sleep(650);await P.T('touchEnd',[]);await sleep(150);
    ok(await pg.evaluate(()=>__T.comps().length)===n0+1,'spectrum: a long-press on empty plot adds nothing');
    ok(await pg.evaluate(()=>!document.getElementById('selBar').hidden),'spectrum: the selection bar shows the selected component');
    await pg.tap('#sbL');await pg.keyboard.press('Control+A');await pg.keyboard.type('600');await pg.keyboard.press('Enter');await sleep(200);
    const l=await pg.evaluate(()=>1000/__T.comps()[__T.sel()].s);ok(Math.abs(l-600)<1e-9,`spectrum: typing 600 into the bar sets λ = ${l} nm`);
    await pg.tap('#sbF');await pg.keyboard.press('Control+A');await pg.keyboard.type('5');await pg.keyboard.press('Enter');await sleep(200);
    const fw=await pg.evaluate(()=>{const c=__T.comps()[__T.sel()];return 1000*c.f/(c.s*c.s)});ok(Math.abs(fw-5)<1e-9,`spectrum: typing FWHM 5 nm makes it a Gaussian (${fw} nm)`);
    await pg.tap('#sbDel');await sleep(150);
    ok(await pg.evaluate(()=>__T.comps().length)===n0&&await pg.evaluate(()=>document.getElementById('selBar').hidden),'spectrum: Delete removes it and hides the bar');
    /* ---- the ring: the tilt dot shows at 0, 0 without hover; pinch sets the field of view ---- */
    const rg=await P.show('#ringOv');
    ok(await pg.evaluate(()=>[...document.querySelectorAll('#ovDyn circle')].some(c=>c.getAttribute('fill')==='#fff')),'ring: the tilt dot is drawn at 0, 0 on a touch device');
    let f0=await pg.evaluate(()=>__T.fov());await P.pinch(rg.x+rg.w/2,rg.y+rg.h/2,30,30,1);let f1=await pg.evaluate(()=>__T.fov());
    ok(Math.abs(f1/f0-0.5)<0.03,`ring: spreading two fingers to twice the distance halves the field of view (${f0}° → ${f1}°)`);
    /* ---- the rail, the interferogram and the interfered spectrum: pinch zooms ---- */
    const rl=await P.show('#rail');let m0=await pg.evaluate(()=>__T.dmax());await P.pinch(rl.x+rl.w/2,rl.y+rl.h/2,40,0,-0.5);let m1=await pg.evaluate(()=>__T.dmax());
    ok(Math.abs(m1/m0-2)<0.05,`rail: closing two fingers to half the distance doubles the range (±${m0} → ±${m1} µm)`);
    const ig=await P.show('#ifgBox');let r0=await pg.evaluate(()=>__T.R());await P.pinch(ig.x+ig.w/2,ig.y+ig.h/2,40,0,1);let r1=await pg.evaluate(()=>__T.R());
    ok(Math.abs(r1/r0-0.5)<0.03,`interferogram: a sideways pinch out halves the range (±${r0} → ±${r1} µm)`);
    const ob=await P.show('#outBox');let w0=await pg.evaluate(()=>__T.win());await P.pinch(ob.x+ob.w/2,ob.y+ob.h/2,40,0,1);let w1=await pg.evaluate(()=>__T.win());
    ok(Math.abs((w1[1]-w1[0])/(w0[1]-w0[0])-0.5)<0.03,`interfered spectrum: a pinch out halves the window (${(w0[1]-w0[0]).toFixed(1)} → ${(w1[1]-w1[0]).toFixed(1)} nm)`);
    ok(!P.errs.length,'iPhone 13: no page errors '+P.errs.join('; '));await P.ctx.close()}
  /* ---- phone widths: no sideways scroll, the top bar's buttons fill their rows, the checkboxes stay together ---- */
  for(const name of ['iPhone 13','Galaxy S9+','iPhone 13 landscape']){const P=await open(br,devices[name]),{pg}=P;
    const r=await pg.evaluate(()=>{const w=document.documentElement.scrollWidth,iw=innerWidth,a=document.getElementById('rAuto').getBoundingClientRect(),e=document.getElementById('envOn').getBoundingClientRect();return{w,iw,same:Math.abs(a.y-e.y)<2}});
    ok(r.w<=r.iw,`${name}: no sideways scroll (${r.w} ≤ ${r.iw} px)`);ok(r.same,`${name}: Auto-fit and Envelope share a line`);await P.ctx.close()}
  /* ---- desktop with a mouse: unchanged, a click adds and drags at once, no selection bar in the one-screen layout ---- */
  {const ctx=await br.newContext({viewport:{width:1366,height:657}});await routeMathJax(ctx);const pg=await ctx.newPage();
    await pg.goto(PAGE.url+'?renderer=cpu');await pg.waitForFunction(()=>window.__T&&document.documentElement.dataset.renderer,null,{timeout:20000});
    const sp=await pg.evaluate(()=>{const r=document.getElementById('spec').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}),n0=await pg.evaluate(()=>__T.comps().length);
    await pg.mouse.move(sp.x+sp.w*0.85,sp.y+sp.h*0.4);await pg.mouse.down();await pg.mouse.move(sp.x+sp.w*0.8,sp.y+sp.h*0.4,{steps:4});await pg.mouse.up();await sleep(150);
    ok(await pg.evaluate(()=>__T.comps().length)===n0+1,'desktop: a mouse press on empty plot adds a line and drags it');
    ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('selBar')).display==='none'),'desktop 1366×657: no selection bar in the one-screen layout');
    await ctx.close()}
  await br.close();PAGE.done();console.log(fail?`${fail} FAILED`:'all passed');process.exit(fail?1:0)})();
