# ring-model.js

The ring's physics: `ringModel` (the current settings; `ringModelOf(d, fov, tx, ty)` for any, used by the speed test; tanθ = r·tanθmax, δ = 2d cosθ + 2(αx·x + αy·y), L = 28.4 mm), built on `opdModel` (δ and its radial derivatives), the sub-band groups (`prepSL`, which also records the largest k_b, `kbm`), the exact pixel-footprint average (`pixVal`, with the second-order correction `avgQ`/`avgQpre`) and one grid point's evaluation (`gridPix`: the OPD's gradient, Hessian and curvature test, then `pixVal`). Also the ring canvas, `ringLive` and `Ibuf`.

## Rules and pitfalls

- The workers run the source text of `avgQpre`, `avgQ`, `pixVal`, `opdModel` and `gridPix` (see `ring-backends.js`), so those functions must stay self-contained (they may use each other, `QS` and `PV`, and nothing else). That is how the workers, the main thread and the speed test evaluate a grid point with the same code; there is no second copy to keep in step.
- The fast path in `pixVal` (evenly spaced groups, `g.lin`) steps the exponentials and phases by exact ratios and re-evaluates directly every 16 sub-bands. After any change, run `node tests/fastpath.js`.
- In the fast path, ex falls monotonically along a group (k_b grows, and every floating-point operation in ex is monotonic), so testing the group's two ends decides the −40 cut-off for every sub-band (MS-16): all above → no per-sub-band test; all below → constant part only, still summed sub-band by sub-band so the result stays bit-identical. Keep the summation order if you touch this.
- `avgQ` (the second-order correction) applies only when the fringe curvature matters (the 3e-4 test).
- `rcut(N,k)` = 1 + RCUT·2k/N (RCUT = 3 grid cells): grid points beyond it lie in the square's corners, hidden by the CSS circle, and are stored as 0 instead of evaluated (MS-13). The same cut is hard-coded in the WGSL and GLSL (`1.+6.*k/N`) and passed to the workers as `rc2`: change all of them together. Every check point must stay inside r ≤ 1.
- `avgQ` returns 0 before `atan2` when `er < -40`; the result is the same.
