"""Check: no page scroll and no equation overflow at the target screen sizes."""
import asyncio, sys
from playwright.async_api import async_playwright
from _common import open_page

SIZES = [(1920, 1080), (1366, 657), (1280, 600)]

async def main():
    bad = 0
    async with async_playwright() as p:
        for w, h in SIZES:
            b, pg, errs = await open_page(p, w, h)
            for pre in ["led", "two", "na"]:
                await pg.click(f"[data-p={pre}]"); await pg.wait_for_timeout(1200)
                sh = await pg.evaluate("document.documentElement.scrollHeight")
                over = await pg.evaluate("""[...document.querySelectorAll('dialog')].map(d=>{const m=d.open;if(!m)d.show();
                  const o=[...d.querySelectorAll('mjx-container')].filter(e=>e.getBoundingClientRect().right>d.getBoundingClientRect().right+1||e.scrollWidth>e.clientWidth+1).length;
                  if(!m)d.close();return o?d.id+':'+o:''}).filter(Boolean)""")
                ok = sh <= h and not over
                bad += not ok
                print(f"{w}x{h} {pre:4s} scrollHeight={sh} {'OK' if ok else 'FAIL'} {over}")
            await pg.screenshot(path=f"layout-{w}x{h}.png")
            await b.close()
    sys.exit(1 if bad else 0)

asyncio.run(main())
