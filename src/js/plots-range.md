# plots-range.js

The shared exact pixel maths (`avgTerm`, `xyzAt`, `PIXSD`) and the interferogram (`ifgTraces`, `renderIfg`). Its trace, like every 1-D plot's, is drawn by the shared helper in `plot1d.js`.

## Rules and pitfalls

- The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves with d while it is inside the window. A new input must go into `ifgKey`.
- The window is [C − R, C + R] (`ifgWin`, MS-26): `IFGC` moves only as far as needed to keep δ₀ inside, so the marker never leaves the plot; a new R resets it to 0 (the preset buttons reset it too). Every use of the window (the trace, envelope, ticks, `ifgTraces` for the SVG export) goes through `ifgWin()`, never `RANGE()` alone. While the window follows, the trace is recomputed every frame (4–12 ms at 1366×657, dpr 2). `exportMP4` saves and restores `IFGC`, since its sweep moves the window.
- `IG` holds the drawn geometry (W, pl, pr, lo, hi) for the marker drag in `ui-mirror.js`. The marker has a grip (larger on touch, `TOUCH`); its label flips to the left near the right edge so it isn't clipped.
- The trace's sub-columns (`DPK`, in `plot1d.js`) never adapt to the frame time (MS-17).
- `PIXSD` = 0.5 px is the ring's footprint sd (MS-17; it was 0.4). A fringe at the pixel pitch keeps e^{−2π²·PIXSD²} of its contrast and samples to a flat tone, which shows as ghost ring centres (moiré): 4.2% at 0.4 px was visible, 0.7% at 0.5 px is not. Don't narrow it for sharpness. `tests/antialias.js` measures the moiré; `tests/gpukernel.js` reads `PIXSD` from this file.
