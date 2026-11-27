# plots-range.js

The shared exact pixel maths (`avgTerm`, `xyzAt`, `PIXSD`), the anti-aliased range plot (`densityPlot`, `DPQ`, `dpK`, `dpRecord`) used by the profile and the interferogram, and the interferogram itself (`renderIfg`).

## Rules and pitfalls

- The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves with d. A new input must go into `ifgKey`.
- The range plots' sub-columns per pixel come from `dpK()`: 8 at rest, `DPQ.k` (2 to 8) while moving. `dpRecord` raises it only into spare frame time (`FR() − LQ.tot`) and only once the ring preview is at full resolution (`LQ.last === 1`, i.e. Nl = N). Don't let it spend the ring's budget: the ring's measured time includes the profile, so a plot that takes ring time drops the ring to a coarser preview, which drops the plots back, in a loop. `dpK()` is part of `ifgKey`.
