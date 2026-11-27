# ring-preview.js

The adaptive preview resolution while moving (MS-10, MS-11): the cost model and controller (`LQ`, `lqPick`, `lqRecord`), the motion-driven budget (`lqMotion`, `lqBudget`), the display refresh measurement (`FR`, `measureFrame`) and the resolution readout (`showRes`).

## Rules and pitfalls

- Only the live preview may depend on the device or on motion. At rest every pixel is rendered (Nl = N), so snapshots stay identical.
- `lqPick` returns a whole Nl from N/16 to N; k = N/Nl. It goes coarser at once and finer half the way (log space). The budget adds time when the fringes move slowly: a frame may last as long as they take to cross one preview pixel (k/v), capped at 100 ms (50 ms on the main-thread CPU).
- Call `lqMotion` only when a live frame really renders (after the busy checks), or the speed is measured over the wrong interval.
- `FR()` is the 25th percentile of idle rAF steps, clamped to 16.7–33.4 ms (120 Hz screens still get 60 Hz-quality previews), re-measured on resize and on becoming visible.
- The workers path (`wk`) gets the GPU paths' base budget, 85% of a display frame (MS-19): the workers run in parallel with the main thread's plots, so the plots' time isn't taken off it. Its cost is the workers' compute time, not wall time.
