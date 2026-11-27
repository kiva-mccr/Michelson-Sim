"""Run the in-page verification table for every preset (with and without tilt) on every available renderer."""
import asyncio, sys
from playwright.async_api import async_playwright
from _common import open_page, backends, use_renderer

PRESETS = ["hene", "na", "led", "two"]

async def run_checks(pg):
    await pg.click("#openMethod"); await pg.click("#verBtn")
    await pg.wait_for_function("document.getElementById('verAt').textContent.startsWith('Last run')", timeout=180000)
    rows = await pg.evaluate("[...document.querySelectorAll('#ver tr')].map(t=>t.innerText.replace(/\\s+/g,' '))")
    await pg.keyboard.press("Escape")
    return rows

async def main():
    failed = 0
    async with async_playwright() as p:
        b, pg, errs = await open_page(p, 1366, 657)
        for be in await backends(pg):
            await use_renderer(pg, be)
            for pre in PRESETS:
                for tilt in (0, 120):
                    await pg.click(f"[data-p={pre}]")
                    await pg.evaluate(f"document.getElementById('tx').value={tilt}; document.getElementById('d').dispatchEvent(new Event('change'))")
                    await pg.wait_for_timeout(500)
                    rows = await run_checks(pg)
                    bad = [r for r in rows if "FAIL" in r]
                    failed += len(bad)
                    ring = next((r for r in rows if r.startswith("Ring")), "")
                    print(f"{be:8s} {pre:5s} tilt={tilt:3d}  {'OK ' if not bad else 'FAIL'}  {ring[-30:]}")
                    for r in bad: print("    ", r)
        if errs: print("page errors:", errs); failed += len(errs)
        await b.close()
    sys.exit(1 if failed else 0)

asyncio.run(main())
