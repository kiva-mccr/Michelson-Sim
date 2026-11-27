# ring-render.js

Drawing the ring: `ringInputs`/`renderRingIfNeeded` (re-render only on a change), `renderRing` (GPU, workers or main-thread CPU; untilted: an exact octant mirrored 8 ways at rest (MS-15), a radial interpolated grid while moving; progressive 12 ms slices at rest) and the profile cut (`ringProfile`).

## Rules and pitfalls

- Only one GPU or worker frame is in flight at a time (busy/dirty).
- At rest (Nl = N) every pixel is an exact footprint average and `Ibuf` holds I/I_tot for the checks; previews (Nl < N) leave `Ibuf` empty and the CPU paths put their Nl×Nl grid's I/I_tot in `Pbuf` instead (for `tests/antialias.js`).
- Previews use the same second-order curvature test (`quad`, 3e-4) as the at-rest pass, on every path. Their footprint is k times wider, so curvature matters more there, not less: before MS-17 the CPU tilted and worker previews skipped it, and coarse previews got the ring centre wrong.
- The untilted octant (MS-15) relies on the grid being exactly symmetric: u of column N−1−i is exactly −u of column i, and v of row j is exactly −u of column j. Only the octant 0 ≤ i ≤ j < N/2 is computed; each value goes to its 8 mirror pixels. Before MS-15 the at-rest image was a radial grid at 16 samples per pixel, interpolated; that was off by up to 1.1e-3 of I/I_tot near the edge at d = 3 mm (He–Ne), above the 1e-3 check tolerance.
- The radial interpolated grid is for moving previews only (`!tilted&&ringLive`); its cost is linear in N, which the preview cost model assumes (p = 1).
- Keep the at-rest expressions exactly as they are, e.g. `((i+0.5)*k-h)/h` with k = 1: they are what the snapshots compare.
- Corner skip (MS-13): pixels with r > `rcut` are `put` as 0. The radial table (moving previews only since MS-15) keeps its spacing `dr` (from r up to 1.42) but is only filled up to `Nq`, just past `rcut`, so visible pixels are bit-identical to the uncut version.
- The profile canvas is resized only when its size changes (resizing reallocates it).
- `gridPix` is the one grid-point evaluation for the main thread (and the speed test's CPU run); the worker source has its own copy of the same expressions, keep them identical.
- Every progressive at-rest pass sets `RB.wDone`, resolved when it finishes or is superseded (the speed test waits for it).
- `renderRingIfNeeded` does nothing while the speed test runs (`RB.benching`).
