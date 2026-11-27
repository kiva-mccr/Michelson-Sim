"""Frame times and the adaptive preview resolution during a mirror sweep, per renderer."""
import asyncio
from playwright.async_api import async_playwright
from _common import open_page, backends

async def main():
    async with async_playwright() as p:
        b, pg, errs = await open_page(p, 1920, 1080)
        for be in await backends(pg):
            await pg.select_option("#rendSel", be)
            for pre, tilt in [("led", 0), ("led", 120), ("hene", 0)]:
                await pg.click(f"[data-p={pre}]")
                await pg.evaluate(f"document.getElementById('tx').value={tilt}")
                await pg.wait_for_timeout(800)
                await pg.evaluate("window.__f=[];let l=performance.now();(function f(t){__f.push(t-l);l=t;if(__f.length<150)requestAnimationFrame(f)})(performance.now())")
                await pg.click("#dPlay"); await pg.wait_for_timeout(2500)
                res = await pg.evaluate("document.getElementById('resV').textContent")
                await pg.click("#dPlay"); await pg.wait_for_timeout(800)
                f = sorted((await pg.evaluate("__f"))[2:])
                print(f"{be:8s} {pre:5s} tilt={tilt:3d}  median frame {f[len(f)//2]:5.1f} ms  p90 {f[int(len(f)*.9)]:5.1f} ms  preview {res}")
        await b.close()

asyncio.run(main())
