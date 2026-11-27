# ring-bench.js

The startup speed test (MS-18) that makes the page use the fastest renderer on the device: `benchWork` (the fixed workload), `benchRun`/`benchTime` (one timed run per renderer), `benchAll`, `benchRank`, `benchSchedule`, and the per-device cache (`benchLoad`, `benchSig`, localStorage `mich-renderer-bench`).

## Rules and pitfalls

- Equal work for every renderer: the same fixed image (LED preset, d = 3 µm, 10° field, tx 40 / ty 25 µrad) on a 160² grid, every grid point inside `rcut` an exact footprint average. It does not depend on the user's spectrum, so the cached ranking stays valid when they change it.
- The GPUs run with `bench = true` (`gpuDraw`, `glDraw`): compute only, no display pass, so the visible canvas keeps its image. Their output buffer does hold the test image afterwards, so `ringKey` is reset and the real image is rendered again (also needed for `ringReadback`).
- One warm-up run (shader compilation, JIT), then the median of three. A renderer whose warm-up is over 5× the best so far is not timed again. A run that throws or takes over 3 s counts as failed and ranks last.
- Ranking: fastest first, but within 10% of each other the default order (WebGPU, WebGL2, workers, CPU) decides, so timing noise does not flip it.
- While `RB.benching`, `renderRingIfNeeded` does nothing (the ring keeps its last image). The test starts only when nothing is moving, no frame is in flight and the last at-rest image is finished (`RB.wDone`), and it stops between runs as soon as `ringLive` is set or the tab is hidden; it tries again 1.5 s later (up to 60 times).
- The worker runs use the pool's own `onmessage`; this is safe only because no render runs during the test. `verify()` awaits `RB.benchP` before the Ring pixels check.
- The main-thread CPU run is sliced into 8-row chunks with a yield between them, and only the computing time counts.
- The cache key (`benchSig`) holds `BENCH_V`, the user agent, `hardwareConcurrency`, the WebGPU adapter info, the WebGL renderer string and the list of available renderers; bump `BENCH_V` when the workload or the kernels change enough to reorder renderers. Entries expire after 30 days.
- `?renderer=` (the tests) skips the test and the cache entirely.
- The ranking is at equal work. The GPU renderers then draw at up to 1024² device pixels and the CPU ones at up to 480², as before.
