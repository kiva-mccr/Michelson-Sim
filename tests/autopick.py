"""The startup speed test (MS-18): with no ?renderer=, the page times every available renderer on the same image, switches to the
fastest (by the documented ranking), caches it per device, keeps the visible image while testing, stops if anything moves, and
the check table passes on the renderer it picked."""
import asyncio, json, sys
from playwright.async_api import async_playwright
from _common import open_page, run_checks

def rank(ms, default):
    """The ranking the page should produce: fastest first, the default order within 10%, failed last."""
    import functools
    inf = float("inf")
    def cmp(a, b):
        x, y = ms.get(a, inf), ms.get(b, inf)
        if x != inf and y != inf and abs(x - y) > 0.1 * min(x, y): return -1 if x < y else 1
        if (x == inf) != (y == inf): return -1 if x != inf else 1
        return default.index(a) - default.index(b)
    return sorted(default, key=functools.cmp_to_key(cmp))

async def main():
    fails = []
    ok = lambda c, m: print(("ok   " if c else "FAIL ") + m) or (c or fails.append(m))
    async with async_playwright() as p:
        b, pg, errs = await open_page(p, 1366, 657)
        avail = (await pg.evaluate("document.documentElement.dataset.renderers")).split(",")
        await pg.wait_for_function("document.documentElement.dataset.bench", timeout=60000)
        await pg.wait_for_timeout(500)
        ms = json.loads(await pg.evaluate("document.documentElement.dataset.bench"))
        act = await pg.evaluate("document.documentElement.dataset.renderer")
        print("available:", avail, " times (ms):", {k: round(v, 1) for k, v in ms.items()}, " active:", act)
        ok(set(ms) == set(avail), "every available renderer was timed")
        ok(act == rank(ms, avail)[0], f"the active renderer is the fastest by the ranking ({rank(ms, avail)})")
        note = await pg.evaluate("document.getElementById('rendNote').textContent")
        ok(note.startswith("Chosen by a speed test"), "the ? popup reports the speed test")
        cached = json.loads(await pg.evaluate("localStorage.getItem('mich-renderer-bench')"))
        ok(cached["rank"][0] == act, "the ranking is cached")
        # a reload starts straight on the cached choice and does not test again
        await pg.reload(); await pg.wait_for_function("document.documentElement.dataset.renderer")
        avail2 = (await pg.evaluate("document.documentElement.dataset.renderers")).split(",")
        if avail2 != avail:  # the cache key includes the available renderers, so a changed list must test again
            print(f"skip reload checks: the browser now offers {avail2} (GPU contexts come and go on some hosts)")
        else:
            ok(await pg.evaluate("document.documentElement.dataset.renderer") == act, "after a reload it starts on the cached renderer")
            await pg.wait_for_timeout(3000)
            ok(await pg.evaluate("JSON.parse(localStorage.getItem('mich-renderer-bench')).at") == cached["at"], "and does not test again")
        # the check table passes on the chosen renderer, with and without tilt
        for tilt in (0, 120):
            await pg.click("[data-p=led]")
            await pg.evaluate(f"document.getElementById('tx').value={tilt}; document.getElementById('d').dispatchEvent(new Event('change'))")
            await pg.wait_for_timeout(500)
            bad = [r for r in await run_checks(pg) if "FAIL" in r]
            ok(not bad, f"check table passes on {act}, tilt {tilt}" + (f": {bad}" if bad else ""))
        # moving the mirror while the test runs stops it; it finishes later, once the page is at rest
        await pg.evaluate("localStorage.removeItem('mich-renderer-bench')")
        await pg.reload(); await pg.wait_for_function("document.documentElement.dataset.renderer")
        rail = await pg.query_selector("#rail")
        bx = await rail.bounding_box()
        await pg.mouse.move(bx["x"] + bx["width"] * 0.5, bx["y"] + bx["height"] * 0.5); await pg.mouse.down()
        for i in range(60):
            await pg.mouse.move(bx["x"] + bx["width"] * (0.5 + 0.2 * ((i % 10) / 10)), bx["y"] + bx["height"] * 0.5); await pg.wait_for_timeout(50)
        has = await pg.evaluate("!!document.documentElement.dataset.bench")
        await pg.mouse.up()
        ok(not has, "no result while the mirror is being dragged")
        await pg.wait_for_function("document.documentElement.dataset.bench", timeout=60000)
        ok(True, "the test completes once the page is at rest")
        ok(not errs, f"no page errors {errs}")
        await b.close()
    sys.exit(1 if fails else 0)

asyncio.run(main())
