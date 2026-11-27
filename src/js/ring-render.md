# ring-render.js

Drawing the ring: `ringInputs`/`renderRingIfNeeded` (re-render only on a change), `renderRing` (GPU, workers or main-thread CPU; radial fast path when untilted; progressive 12 ms slices at rest) and the profile cut (`ringProfile`).

## Rules and pitfalls

- Only one GPU or worker frame is in flight at a time (busy/dirty).
- At rest (Nl = N) every pixel is an exact footprint average and `Ibuf` holds I/I_tot for the checks; previews (Nl < N) leave `Ibuf` empty.
- Keep the at-rest expressions exactly as they are, e.g. `((i+0.5)*k-h)/h` with k = 1: they are what the snapshots compare.
