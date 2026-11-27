"""Shared helpers: open index.html in Chromium with GPU flags.

Set MATHJAX_DIR to a local copy of the mathjax@3.2.2 npm package to run without the CDN
(e.g. `npm i mathjax@3.2.2`, then MATHJAX_DIR=node_modules/mathjax).
Set GPU_ARGS=0 to launch without the WebGPU/Vulkan flags (some headless hosts lose the GPU with them)."""
import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--use-angle=swiftshader"]
if os.environ.get("GPU_ARGS") == "0":
    ARGS = ["--ignore-gpu-blocklist", "--use-angle=swiftshader"]
MJ = os.environ.get("MATHJAX_DIR")

async def open_page(p, w=1920, h=1080):
    b = await p.chromium.launch(args=ARGS)
    pg = await b.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    if MJ:
        root = pathlib.Path(MJ).resolve()
        await pg.route("**/mathjax@3.2.2/**", lambda r: r.fulfill(path=str(root / r.request.url.split("mathjax@3.2.2/", 1)[1])))
    await pg.goto(URL)
    await pg.wait_for_function("window.MathJax && MathJax.startup && MathJax.startup.promise")
    await pg.wait_for_timeout(1500)
    return b, pg, errs

async def backends(pg):
    return await pg.evaluate("[...document.querySelectorAll('#rendSel option')].filter(o=>o.value!=='auto'&&!o.disabled).map(o=>o.value)")
