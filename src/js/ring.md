# ring.js

The ring image. `ringModel` (tanθ = r·tanθmax, δ = 2d cosθ + 2(αx·x + αy·y), L = 28.4 mm), the pixel average (`pixVal`, `avgQ`, `avgQpre`, `prepSL`), and the four renderers selected by `RB`: WebGPU (WGSL), WebGL2 (GLSL into an RGBA32F target), Blob workers, and the CPU main thread. Also the adaptive preview resolution (`LQ`, `lqPick`, `lqRecord`), `renderRingIfNeeded` and `ringProfile`.

## Rules and pitfalls

- GPU precision: `k_b·2d mod 2π` is computed in float64 on the CPU (`packRing`). The GPU adds only `k_b·Δ`. sin and cos of θ come from square roots, and the fringe cosine is `cosA` (range reduction plus a Taylor series). Never swap these for built-in GPU trig: it failed the 1e-3 tolerance at d = 5 mm.
- The workers run the source text of `pixVal`/`avgQ`, so those functions must stay self-contained.
- The fast path in `pixVal` (evenly spaced groups, `g.lin`) steps the exponentials and phases by exact ratios and re-evaluates directly every 16 sub-bands. After any change, run `node tests/fastpath.js`. The −40 cut-off is still tested exactly per sub-band.
- `avgQ` (the second-order correction) applies only when the fringe curvature matters (the 3e-4 test).
- Only one GPU or worker frame is in flight at a time (busy/dirty). At rest, every pixel is rendered. On the CPU the work is cut into 12 ms slices.
- The "Ring pixels" check reads back the active renderer (`ringReadback`), so every renderer must support readback.
