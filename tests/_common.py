"""Shared helpers: open index.html in Chromium with GPU flags, list the renderers and force one.

Set MATHJAX_DIR to a local copy of the mathjax@3.2.2 npm package to run without the CDN
(e.g. `npm i mathjax@3.2.2`, then MATHJAX_DIR=node_modules/mathjax).
Set GPU_ARGS=0 to launch without the WebGPU/Vulkan flags (some headless hosts lose both GPU contexts with them); WebGL2 then runs on
SwiftShader. tests/gpukernel.js checks the WebGPU kernel on its own where the full page loses it."""
import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
if os.environ.get("GPU_ARGS") == "0":
    ARGS = ["--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
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
    """The renderers this browser offers, in the automatic order."""
    await pg.wait_for_function("document.documentElement.dataset.renderers")
    return (await pg.evaluate("document.documentElement.dataset.renderers")).split(",")

async def use_renderer(pg, be):
    """Reload the page with one renderer forced. The page has no renderer control; ?renderer= exists for the tests."""
    await pg.goto(f"{URL}?renderer={be}")
    await pg.wait_for_function("window.MathJax && MathJax.startup && MathJax.startup.promise")
    await pg.wait_for_function(f"document.documentElement.dataset.renderer === '{be}'")
    await pg.wait_for_timeout(1000)

async def run_checks(pg):
    """Open Method and checks, press Run checks, and return the table rows."""
    await pg.click("#openMethod"); await pg.click("#verBtn")
    await pg.wait_for_function("document.getElementById('verAt').textContent.startsWith('Last run')", timeout=180000)
    rows = await pg.evaluate("[...document.querySelectorAll('#ver tr')].map(t=>t.innerText.replace(/\\s+/g,' '))")
    await pg.keyboard.press("Escape")
    return rows
