// Shared helpers for the Node tests (see _common.md).
const fs=require('fs'),os=require('os'),path=require('path');
/* the end of ui-loop.js, the last JS file: the tests insert their hooks just before it */
const TAIL='\nupdate(false);\n}\n</script>';
/* the page (argument 2 or ../index.html) with the hook script inserted, written to a temporary file of its own
   (named after the test and the process, so runs never overwrite each other); returns its file:// URL and path */
function hookPage(name,hook,src=process.argv[2]||path.join(__dirname,'..','index.html')){const html=fs.readFileSync(src,'utf8');
  if(!html.includes(TAIL))throw new Error('hook point not found');
  const file=path.join(os.tmpdir(),`mich-${name}-${process.pid}.html`);fs.writeFileSync(file,html.replace(TAIL,'\n'+hook+TAIL));
  return{url:'file://'+file,file,done:()=>fs.unlinkSync(file)}}
/* MathJax from a local copy (MATHJAX_DIR, the mathjax@3.2.2 npm package), otherwise the CDN request is blocked */
function routeMathJax(ctx){const MJ=process.env.MATHJAX_DIR;
  return MJ?ctx.route('**/mathjax@3.2.2/**',r=>r.fulfill({path:path.join(MJ,r.request().url().split('mathjax@3.2.2/')[1])})):ctx.route(/cdn\.jsdelivr/,r=>r.abort())}
/* Chromium flags: WebGL2 on SwiftShader, plus WebGPU/Vulkan unless GPU_ARGS=0 (as tests/_common.py) */
const SWIFTSHADER=['--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const GPU=process.env.GPU_ARGS==='0'?SWIFTSHADER:['--enable-unsafe-webgpu','--enable-features=Vulkan',...SWIFTSHADER];
module.exports={hookPage,routeMathJax,SWIFTSHADER,GPU};
