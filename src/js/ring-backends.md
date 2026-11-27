# ring-backends.js

The CPU workers (`initWorkers`: Blob workers running the source text of `gridPix`, `opdModel`, `pixVal`, `avgQ` and `avgQpre` over grid rows; `wkMsg` builds a block's message) and backend selection (`BACKENDS`, `availBackends`, `probeBackends`, `pickBackend`).

## Rules and pitfalls

- There is no renderer control on the page (MS-8). `pickBackend` takes the fastest available renderer by the speed test's ranking (`RB.rank`, MS-18, see `ring-bench.md`), or the default order WebGPU → WebGL2 → workers → CPU until the test has run. When a renderer fails it falls back to the next in the ranking. It writes the available (default order) and active renderers to `<html data-renderers data-renderer>` (the tests read them) and the renderer's name to the ? popup on the pattern panel (`rendV`).
- Workers use the same curvature test (`quad`) in previews as at rest (MS-17).
- The worker code works in grid units (Nl, k = N/Nl) and evaluates each point with the page's own `gridPix`. Its grid coordinates `((i+0.5)*k-h)/h` must stay the main thread's expressions, so at Nl = N the pixels are bit-identical.
- Workers skip grid points with u²+v² > `rc2` (sent in the message) and return 0 for them, matching the main thread.
- Each worker reply carries `ms`, its own compute time for the block; the preview controller uses it (MS-19). It doesn't touch the pixel values.
