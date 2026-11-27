# ring-model.js

The ring's physics: `ringModel` (tanθ = r·tanθmax, δ = 2d cosθ + 2(αx·x + αy·y), L = 28.4 mm), the sub-band groups (`prepSL`) and the exact pixel-footprint average (`pixVal`, with the second-order correction `avgQ`/`avgQpre`). Also the ring canvas, `ringLive` and `Ibuf`.

## Rules and pitfalls

- The workers run the source text of `pixVal`/`avgQ`/`avgQpre` (see `ring-backends.js`), so those functions must stay self-contained.
- The fast path in `pixVal` (evenly spaced groups, `g.lin`) steps the exponentials and phases by exact ratios and re-evaluates directly every 16 sub-bands. After any change, run `node tests/fastpath.js`. The −40 cut-off is still tested exactly per sub-band.
- In the fast path, ex falls monotonically along a group (k_b grows, and every floating-point operation in ex is monotonic), so testing the group's two ends decides the −40 cut-off for every sub-band (MS-16): all above → no per-sub-band test; all below → constant part only, still summed sub-band by sub-band so the result stays bit-identical. Keep the summation order if you touch this.
- `avgQ` (the second-order correction) applies only when the fringe curvature matters (the 3e-4 test).
- `rcut(N,k)` = 1 + RCUT·2k/N (RCUT = 3 grid cells): grid points beyond it lie in the square's corners, hidden by the CSS circle, and are stored as 0 instead of evaluated (MS-13). The same cut is hard-coded in the WGSL and GLSL (`1.+6.*k/N`) and passed to the workers as `rc2`: change all of them together. Every check point must stay inside r ≤ 1.
- `avgQ` returns 0 before `atan2` when `er < -40`; the result is the same.
