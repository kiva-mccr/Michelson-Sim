# plots-range.js

The shared exact pixel maths (`avgTerm`, `xyzAt`, `PIXSD`), the anti-aliased range plot (`densityPlot`, `DPK`) used by the profile and the interferogram, and the interferogram itself (`renderIfg`).

## Rules and pitfalls

- The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves with d. A new input must go into `ifgKey`.
- The range plots always use `DPK` = 8 sub-columns per pixel, moving or at rest. Never adapt it to the frame time: dense fringes look very different at 2 and at 8 (a solid band against the true crowding at ½(1 ± |γ|)), so switching made the plots flicker while dragging (MS-10/MS-11 did this; fixed in MS-17, checked by `tests/plotstable.js`). The plots must not depend on `ringLive` at all.
- `PIXSD` = 0.5 px is the ring's footprint sd (MS-17; it was 0.4). A fringe at the pixel pitch keeps e^{−2π²·PIXSD²} of its contrast and samples to a flat tone, which shows as ghost ring centres (moiré): 4.2% at 0.4 px was visible, 0.7% at 0.5 px is not. Don't narrow it for sharpness. `tests/antialias.js` measures the moiré; `tests/gpukernel.js` reads `PIXSD` from this file.
- `spanOf` returns the shared array `SPAN2`: read it before the next call.
