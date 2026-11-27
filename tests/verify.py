"""Run the in-page verification table for every preset (with and without tilt) on every available renderer."""
import asyncio, sys
from playwright.async_api import async_playwright
from _common import open_page, backends, use_renderer, run_checks

PRESETS = ["hene", "na", "led", "two"]

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
