# ring.js

The ring image. `ringModel` (tanθ = r·tanθmax, δ = 2d cosθ + 2(αx·x + αy·y), L = 28.4 mm), the pixel average (`pixVal`, `avgQ`, `avgQpre`, `prepSL`), and the four renderers selected by `RB`: WebGPU (WGSL), WebGL2 (GLSL into an RGBA32F target), Blob workers, and the CPU main thread. Also the adaptive preview resolution (`LQ`, `lqPick`, `lqRecord`), `renderRingIfNeeded` and `ringProfile`.

## Rules and pitfalls

- GPU precision: `k_b·2d mod 2π` is computed in float64 on the CPU (`packRing`). The GPU adds only `k_b·Δ`. sin and cos of θ come from square roots, and the fringe cosine is `cosA` (range reduction plus a Taylor series). Never swap these for built-in GPU trig: it failed the 1e-3 tolerance at d = 5 mm.
- The workers run the source text of `pixVal`/`avgQ`, so those functions must stay self-contained.
- The fast path in `pixVal` (evenly spaced groups, `g.lin`) steps the exponentials and phases by exact ratios and re-evaluates directly every 16 sub-bands. After any change, run `node tests/fastpath.js`. The −40 cut-off is still tested exactly per sub-band.
- `avgQ` (the second-order correction) applies only when the fringe curvature matters (the 3e-4 test).
- Only one GPU or worker frame is in flight at a time (busy/dirty). At rest, every pixel is rendered. On the CPU the work is cut into 12 ms slices.
- MS-11: previews are an Nl×Nl grid (any Nl from N/16 to N; `gpuDraw`/`glDraw` and the workers take Nl, with k = N/Nl as a float). Keep the at-rest path at Nl = N exactly: there `((i+0.5)*k-h)/h` with k = 1 equals the old expression bit for bit, and the GPU tone passes take the direct fetch, not the bilinear one. `lqPick` sets k from the last frame's time (`lqRecord` keeps the cost per pixel^p) and the motion budget (`lqBudget`, `lqMotion`). Call `lqMotion` only when a live frame really renders (after the busy checks), or the speed is measured over the wrong interval.
- The base preview budget is `FR()`, the measured display refresh interval (`measureFrame`: 25th percentile of idle rAF steps, clamped to 16.7–33.4 ms, so 120 Hz screens still get 60 Hz-quality previews). Re-measured on resize and on becoming visible. Only the live preview may depend on the device; at rest every pixel is rendered, so snapshots stay identical.
- There is no renderer control on the page (MS-8). `?renderer=` forces one for the tests, and `pickBackend` writes the available and active renderers to `<html data-renderers data-renderer>` and the renderer's name to the ? popup on the pattern panel (`rendV`; `resV` is the resolution). The old menu's `mich-renderer` localStorage key is cleared on load.
- The "Ring pixels" check reads back the active renderer (`ringReadback`), so every renderer must support readback.
