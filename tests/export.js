// The copy / save menu on every plot (MS-23): right-click opens it on each plot, PNG and SVG downloads at the chosen size,
// the SVGs are well formed (the interferogram a vector curve stroked with a colour gradient), the clipboard gets a PNG, the
// exported ring agrees with a brute-force integral, and on a phone a long-press opens it while taps, pinches and presses on
// drag handles don't.
//   node tests/export.js [index.html]
// Needs Node and `npm i playwright`. Prints one line per check and exits 1 if any fails.
const {chromium,devices}=require('playwright');const fs=require('fs');const {hookPage,routeMathJax}=require('./_common');
const PAGE=hookPage('export',`window.__X={xSize,ringExport,ringBrute,ringModel,act,comps:()=>comps,menu:()=>!$('xmenu').hidden,setT:t=>SWTset(t),passN:()=>Math.round(SWT*MP4FPS)+1,title:()=>$('xmT').textContent,sheet:()=>$('xmenu').classList.contains('sheet')};\n`);
let fail=0;const ok=(c,msg)=>{console.log((c?'pass ':'FAIL ')+msg);if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PLOTS={spec:['#spec',0.3,0.5,'Source spectrum'],ring:['#ringOv',0.3,0.3,'Interference pattern'],prof:['#profBox',0.5,0.5,'Pattern profile'],ifg:['#ifgBox',0.5,0.5,'Interferogram'],out:['#outBox',0.5,0.5,'Interfered spectrum']};
(async()=>{const br=await chromium.launch();
  {const ctx=await br.newContext({viewport:{width:1366,height:657},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});await routeMathJax(ctx);
    const pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(PAGE.url+'?renderer=workers');await pg.waitForFunction(()=>window.__X&&document.documentElement.dataset.renderer,null,{timeout:20000});await sleep(1500);
    const n0=await pg.evaluate(()=>__X.comps().length);
    for(const[k,[sel,fx,fy,title]]of Object.entries(PLOTS)){const b=await pg.locator(sel).boundingBox();
      await pg.mouse.click(b.x+b.width*fx,b.y+b.height*fy,{button:'right'});await sleep(100);
      ok(await pg.evaluate(()=>__X.menu())&&(await pg.evaluate(()=>__X.title()))===title,`${k}: right-click opens the menu (${title})`);
      await pg.click('#xmSize button[data-s="2"]');const[w,h]=await pg.evaluate(k=>__X.xSize(k,2),k);
      const[dp]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),pg.click('[data-x="png"]')]);const png=await fs.promises.readFile(await dp.path());
      const W=png.readUInt32BE(16),H=png.readUInt32BE(20);ok(W===w&&H===h,`${k}: PNG at 2× is ${W}×${H} px (expected ${w}×${h})`);
      const[ds]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),pg.click('[data-x="svg"]')]);const svg=await fs.promises.readFile(await ds.path(),'utf8');
      const info=await pg.evaluate(s=>{const d=new DOMParser().parseFromString(s,'image/svg+xml');return{bad:!!d.querySelector('parsererror'),img:d.querySelectorAll('image').length,stops:d.querySelectorAll('linearGradient#ifgHue stop').length,grad:!!d.querySelector('path[stroke="url(#ifgHue)"]'),vars:/var\(|light-dark/.test(s)}},svg);
      ok(!info.bad&&!info.vars,`${k}: SVG is well formed, with no CSS variables left`);
      if(k==='ring')ok(info.img===1,'ring: SVG embeds the exact PNG');else ok(info.img===0,`${k}: SVG is all vector (no embedded image)`);
      if(k==='ifg')ok(info.grad&&info.stops>=256,`ifg: SVG curve is stroked with the colour gradient (${info.stops} stops)`);
      await pg.click('[data-x="copy"]');await pg.waitForFunction(()=>/Copied|Failed/.test(document.getElementById('xmStat').textContent),null,{timeout:60000});
      const types=await pg.evaluate(async()=>(await navigator.clipboard.read())[0].types);ok(types.includes('image/png'),`${k}: Copy image puts a PNG on the clipboard`);
      await pg.keyboard.press('Escape');ok(!(await pg.evaluate(()=>__X.menu())),`${k}: Escape closes the menu`)}
    ok(await pg.evaluate(()=>__X.comps().length)===n0,'spectrum: a right-click adds no line');
    /* MP4: one sweep at a 1 s pass time, read back box by box (ftyp, moov, mdat) with the sample count from stsz */
    await pg.evaluate(()=>__X.setT(1));const nf=await pg.evaluate(()=>__X.passN()),d0=await pg.inputValue('#d');
    for(const[k,sel]of [['ifg','#ifgBox'],['ring','#ringOv']]){const b=await pg.locator(sel).boundingBox();await pg.mouse.click(b.x+b.width*0.3,b.y+b.height*0.3,{button:'right'});await pg.click('#xmSize button[data-s="2"]');
      const[dv]=await Promise.all([pg.waitForEvent('download',{timeout:300000}),pg.click('#xmMp4')]);const v=await fs.promises.readFile(await dv.path());
      const boxes=[];for(let o=0;o<v.length;){const n=v.readUInt32BE(o);boxes.push(v.toString('latin1',o+4,o+8));if(n<8)break;o+=n}
      const i=v.indexOf('stsz','latin1'),cnt=v.readUInt32BE(i+12),wh=v.indexOf('avc1',v.indexOf('stsd','latin1'),'latin1'),W=v.readUInt16BE(wh+28),H=v.readUInt16BE(wh+30),[w,h]=await pg.evaluate(k=>__X.xSize(k,2),k);
      ok(boxes.join()==='ftyp,moov,mdat'&&cnt===nf&&W===(w&~1)&&H===(h&~1),`${k}: MP4 of one sweep has ${cnt} frames (expected ${nf}) at ${W}×${H} (boxes ${boxes.join(', ')})`);await pg.keyboard.press('Escape')}
    ok(await pg.inputValue('#d')===d0,'MP4: the mirror is put back where it was');
    {const b=await pg.locator('#spec').boundingBox();await pg.mouse.click(b.x+b.width*0.3,b.y+b.height*0.5,{button:'right'});ok(!(await pg.isVisible('#xmMp4')),'spec: no MP4 (the source spectrum does not change with d)');await pg.keyboard.press('Escape')}
    const e=await pg.evaluate(async()=>{const X=await __X.ringExport(240);return __X.ringBrute(X.M,__X.act(),X.N,X.I)});ok(e<1e-3,`ring: export at 240² vs brute force, largest error ${e.toExponential(2)} (tolerance 1e-3)`);
    ok(!errs.length,'desktop: no page errors '+errs.join('; '));await ctx.close()}
  {const ctx=await br.newContext({...devices['iPhone 13']});await routeMathJax(ctx);const pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(PAGE.url+'?renderer=cpu');await pg.waitForFunction(()=>window.__X&&document.documentElement.dataset.renderer,null,{timeout:20000});await sleep(500);
    const cdp=await ctx.newCDPSession(pg),T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i}))});
    const show=async s=>{await pg.evaluate(s=>document.querySelector(s).scrollIntoView({block:'center'}),s);await sleep(250);return pg.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}},s)};
    const hold=async(x,y,ms=650)=>{await T('touchStart',[[x,y]]);await sleep(ms);await T('touchEnd',[]);await sleep(150)};
    const menu=()=>pg.evaluate(()=>__X.menu()),close=async()=>{await pg.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));await sleep(50)};
    let r=await show('#ifgBox');await hold(r.x+r.w*0.5,r.y+r.h*0.4);ok(await menu()&&await pg.evaluate(()=>__X.sheet()),'phone: a long-press on the interferogram opens the menu as a bottom sheet');await close();
    await hold(r.x+r.w*0.5,r.y+r.h*0.4,120);ok(!(await menu()),'phone: a tap on the interferogram opens nothing');
    const P=s=>[[r.x+r.w*0.5-40*s,r.y+r.h*0.4],[r.x+r.w*0.5+40*s,r.y+r.h*0.4]];await T('touchStart',[P(1)[0]]);await T('touchStart',P(1));await sleep(700);await T('touchEnd',[P(1)[0]]);await T('touchEnd',[]);await sleep(150);
    ok(!(await menu()),'phone: two fingers held still (a pinch) open nothing');await close();
    r=await show('#spec');const n0=await pg.evaluate(()=>__X.comps().length);await hold(r.x+r.w*0.3,r.y+r.h*0.5);
    ok(await menu()&&await pg.evaluate(()=>__X.comps().length)===n0,'phone: a long-press on empty spectrum opens the menu and adds no line');await close();
    const[dx,dy]=await pg.evaluate(()=>{const b=document.querySelector('#spec circle').getBoundingClientRect();return[b.x+b.width/2,b.y+b.height/2]});await hold(dx,dy);
    ok(!(await menu()),'phone: a long-press on a spectrum dot opens nothing (it starts a drag)');await close();
    r=await show('#ringOv');await hold(r.x+r.w*0.5,r.y+r.h*0.03);ok(!(await menu()),'phone: a long-press on the ring rim opens nothing (it starts a drag)');await close();
    await hold(r.x+r.w*0.35,r.y+r.h*0.35);ok(await menu(),'phone: a long-press inside the ring opens the menu');await close();
    ok(!errs.length,'phone: no page errors '+errs.join('; '));await ctx.close()}
  await br.close();PAGE.done();console.log(fail?`${fail} failed`:'all passed');process.exit(fail?1:0)})();
