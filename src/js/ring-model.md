# ring-model.js

The ring's physics: `ringModel` (tanθ = r·tanθmax, δ = 2d cosθ + 2(αx·x + αy·y), L = 28.4 mm), the sub-band groups (`prepSL`) and the exact pixel-footprint average (`pixVal`, with the second-order correction `avgQ`/`avgQpre`). Also the ring canvas, `ringLive` and `Ibuf`.

## Rules and pitfalls

- The workers run the source text of `pixVal`/`avgQ`/`avgQpre` (see `ring-backends.js`), so those functions must stay self-contained.
- The fast path in `pixVal` (evenly spaced groups, `g.lin`) steps the exponentials and phases by exact ratios and re-evaluates directly every 16 sub-bands. After any change, run `node tests/fastpath.js`. The −40 cut-off is still tested exactly per sub-band.
- `avgQ` (the second-order correction) applies only when the fringe curvature matters (the 3e-4 test).
