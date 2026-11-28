# plots-range.js

The shared exact pixel maths (`avgTerm`, `xyzAt`, `PIXSD`) and the interferogram (`ifgTraces`, `renderIfg`). Its trace, like every 1-D plot's, is drawn by the shared helper in `plot1d.js`.

## Rules and pitfalls

- The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves with d. A new input must go into `ifgKey`.
- The trace's sub-columns (`DPK`, in `plot1d.js`) never adapt to the frame time (MS-17).
- `PIXSD` = 0.5 px is the ring's footprint sd (MS-17; it was 0.4). A fringe at the pixel pitch keeps e^{−2π²·PIXSD²} of its contrast and samples to a flat tone, which shows as ghost ring centres (moiré): 4.2% at 0.4 px was visible, 0.7% at 0.5 px is not. Don't narrow it for sharpness. `tests/antialias.js` measures the moiré; `tests/gpukernel.js` reads `PIXSD` from this file.
