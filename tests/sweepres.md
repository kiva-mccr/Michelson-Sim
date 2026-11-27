# sweepres.js

Checks that the mirror sweep drives the same adaptive preview resolution as a drag (MS-11, asked by Kiva after MS-14). On CPU, workers and WebGL2, for a tilted and an untilted spectrum, it sweeps with a 1 s pass and with a 600 s pass and samples the ring every 100 ms. Each sample must be a live preview with a measured fringe speed. The slow sweep's median preview grid must be at least as fine as the fast one's, and after stopping the image must be the full exact one. Needs Node and `npm i playwright`.

## Rules and pitfalls

- It hooks in at the end of `ui-loop.js` like `snapshot.js` (see `src/js/ui-loop.md`) and reads `ringLive`, `LQ.mv.v` and the `resV` readout.
- "Slow" has to be slow in screen pixels, not just in seconds: with the auto range a 120 s pass still moves the fringes about 0.35 px/ms, which leaves no extra budget (k/v is under a frame). That's why it uses 600 s.
- The numbers come from headless Chromium on a cloud machine. Only the direction of the comparison is checked, not the grid sizes.
