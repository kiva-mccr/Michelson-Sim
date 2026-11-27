# snapshot.js

Records every output (gamma, sub-bands, coherence, plot SVGs, canvas pixels, the ring buffer, equations, readouts, check table) for 7 spectra on the CPU, worker and WebGL2 renderers. Needs Node and `npm i playwright`.

## Rules and pitfalls

- Two runs of the same build give identical files, so any difference is real. Run it on the old and the new build, then compare with `compare_snapshots.py`.
- It hooks in by finding the end of `ui-loop.js` (the last JS file); see `src/js/ui-loop.md`.
