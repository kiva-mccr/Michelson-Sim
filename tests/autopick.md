# autopick.py

Checks the startup speed test (MS-18) on the page as a visitor gets it (no `?renderer=`): every available renderer is timed, the active one is the fastest by the documented ranking (10% margin, default order on ties, failed last), the ? popup says so, the ranking is cached and reused after a reload without testing again, the check table passes on the chosen renderer (LED, with and without tilt), and dragging the mirror while the test is due stops it until the page is at rest.

## Rules and pitfalls

- Each Playwright context starts with empty localStorage, so the first load always runs the test.
- On this host with `GPU_ARGS=0` it compares SwiftShader WebGL2, the workers and the main thread; with the GPU flags both GPU contexts are lost and only the CPU renderers remain. It has never timed WebGPU or a real GPU.
- `rank()` mirrors `benchRank` in `src/js/ring-bench.js`; keep them in step.
- With the GPU flags on this host, both GPU contexts exist at startup and are lost later, so after a reload the list of renderers differs from the cached one and the page tests again; the reload checks are then skipped (and say so).
