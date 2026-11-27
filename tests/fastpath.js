// node tests/fastpath.js [index.html] : pixVal's stepped fast path vs direct evaluation of every sub-band, at 20,000 random pixels
// per spectrum, in float64. Fails if any output differs by more than 1e-12.
const {chromium}=require('playwright');const {hookPage}=require('./_common');
const PAGE=hookPage('fastpath','window.__Q={pixVal,prepSL,sublines,ringModel,comps:()=>comps,set:c=>{comps=c}};');
(async()=>{const br=await chromium.launch();const pg=await br.newPage();await pg.route(/^https?:\/\//,r=>r.abort());await pg.goto(PAGE.url);await pg.waitForTimeout(500);
 const r=await pg.evaluate(()=>{const Q=window.__Q;const sets={led:[[1000/450,1,20*1000/450**2],[1000/555,.58,100*1000/555**2],[1000/610,.25,90*1000/610**2]],two:[[1.55,.8,.06],[1.85,.6,.06]],wide:[[1000/780,.7,.9],[1000/420,.4,.3]],mix:[[1000/632.8,.6,0],[1000/540,.8,.06]]};
  const out={};let rng=12345;const rnd=()=>{rng=(rng*1103515245+12345)%2147483648;return rng/2147483648};
  for(const[n,cs]of Object.entries(sets)){Q.set(cs.map(([s,a,f])=>({s,a,f,on:true})));const pr=Q.prepSL(Q.sublines());const prS={...pr,G:pr.G.map(g=>({...g,lin:0}))};
    let worst=0,worstRel=0,nfast=pr.G.filter(g=>g.lin).length;
    for(let i=0;i<20000;i++){const dm=(rnd()*2-1)*Math.pow(10,rnd()*4),gx=(rnd()*2-1)*Math.pow(10,rnd()*3-1),gy=(rnd()*2-1)*Math.pow(10,rnd()*3-1),s2=Math.pow(10,-4-rnd()*4);
      const a=Q.pixVal(dm,gx,gy,0,0,0,s2,pr,false).slice(),b=Q.pixVal(dm,gx,gy,0,0,0,s2,prS,false).slice();
      for(let k=0;k<4;k++){const d=Math.abs(a[k]-b[k]);worst=Math.max(worst,d);worstRel=Math.max(worstRel,d/Math.max(Math.abs(b[k]),1e-300))}}
    out[n]={fastGroups:nfast,maxAbs:worst,maxRel:worstRel}}return out});
 let bad=0;for(const[n,v]of Object.entries(r)){const ok=v.maxAbs<=1e-12&&v.fastGroups>0;bad+=!ok;console.log(`${n.padEnd(5)} fast groups ${v.fastGroups}  max abs diff ${v.maxAbs.toExponential(2)}  ${ok?'OK':'FAIL'}`)}
 await br.close();PAGE.done();process.exit(bad?1:0)})();
