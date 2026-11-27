// The profile and interferogram plots must look the same while moving as at rest (they flickered while dragging when their
// sub-columns per pixel adapted to the frame time, 2 to 8).
//   node tests/plotstable.js [index.html]
// For several spectra it moves d and the tilt through a sequence of states as a drag does (live frames through the page's own
// renderRing, so the adaptive preview runs and picks its resolution), records the profile and interferogram canvases after each
// live frame, then renders the same states at rest and requires every canvas pixel to be identical. Needs Node and `npm i playwright`.
const {chromium}=require('playwright');const {hookPage,routeMathJax,SWIFTSHADER}=require('./_common');
const HOOK=`window.__PS=async(states,live)=>{const grab=id=>{const c=$(id);return c.getContext('2d').getImageData(0,0,c.width,c.height).data},out=[];
  for(const s of states){$('d').value=s.d;$('tx').value=s.tx;$('ty').value=s.ty;ringLive=live;renderIfg();
    if(RB.active==='workers'){renderRing();if(RB.wDone)await RB.wDone}else renderRing(live?undefined:true);
    out.push({p:grab('profC'),i:grab('ifgC')});await new Promise(r=>setTimeout(r,5))}
  ringLive=false;if(live){window.__live=out;return null}
  /* compare in the page: shipping the canvases out would be millions of numbers */
  let bp=0,bi=0;out.forEach((f,n)=>{const L=window.__live[n];for(let q=0;q<f.p.length;q++)if(f.p[q]!==L.p[q])bp++;for(let q=0;q<f.i.length;q++)if(f.i[q]!==L.i[q])bi++});return{bp,bi}};\n`;
const PAGE=hookPage('plotstable',HOOK);
const HENE={s:1000/632.8,a:0.85,f:0,on:true};
const scen=[
 {n:'hene',c:[HENE],d:3000,fov:10,path:i=>({d:3000+0.07*i,tx:0,ty:0})},
 {n:'hene-tilt',c:[HENE],d:600,fov:10,path:i=>({d:600,tx:10*i,ty:-4*i})},
 {n:'default',c:[{s:1000/632.8,a:0.6,f:0,on:true},{s:1000/540,a:0.8,f:0.06,on:true}],d:20,fov:10,path:i=>({d:20+0.4*i,tx:0,ty:0})},
 {n:'led',c:[{s:1000/450,a:1.0,f:20*1000/450**2,on:true},{s:1000/555,a:0.58,f:100*1000/555**2,on:true},{s:1000/610,a:0.25,f:90*1000/610**2,on:true}],d:0.8,fov:10,path:i=>({d:0.8+0.05*i,tx:5*i,ty:0})},
];
(async()=>{const br=await chromium.launch({args:SWIFTSHADER});let fail=0;
 for(const sc of scen)for(const rend of ['cpu','workers','webgl2']){
  const ctx=await br.newContext({viewport:{width:1400,height:820},deviceScaleFactor:1});
  await routeMathJax(ctx);
  await ctx.addInitScript(st=>localStorage.setItem('mich-sim-v2',JSON.stringify(st)),{c:sc.c,d:sc.d,r:420,fov:sc.fov,tx:0,ty:0,ra:false,rm:50,env:true});
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(PAGE.url+'?renderer='+rend);
  if(!await pg.waitForFunction(r=>window.__PS&&document.documentElement.dataset.renderer===r,rend,{timeout:15000}).then(()=>true,()=>false)){console.log(`${sc.n.padEnd(9)} ${rend.padEnd(8)} not available, skipped`);await ctx.close();continue}
  await pg.waitForTimeout(300);
  const states=Array.from({length:12},(_,i)=>sc.path(i));
  await pg.evaluate(s=>window.__PS(s,true),states);const{bp,bi}=await pg.evaluate(s=>window.__PS(s,false),states);
  const ok=!bp&&!bi&&!errs.length;if(!ok)fail++;
  console.log(`${sc.n.padEnd(9)} ${rend.padEnd(8)} ${states.length} states: profile bytes differing moving vs at rest ${bp}, interferogram ${bi}${errs.length?'  page errors: '+errs.join('; '):''}  ${ok?'OK':'FAIL'}`);
  await ctx.close()}
 await br.close();PAGE.done();console.log(fail?`${fail} FAILED`:'all OK');process.exit(fail?1:0)})();
