# snapshot.js

Records every output (gamma, sub-bands, coherence, plot SVGs, canvas pixels, the ring buffer, equations, readouts, check table) for 7 spectra on the CPU, worker and WebGL2 renderers. Needs Node and `npm i playwright`.

## Rules and pitfalls

- Two runs of the same build give identical files, so any difference is real. Run it on the old and the new build, then compare with `compare_snapshots.py`.
- It hooks in by finding the end of `ui-loop.js` (the last JS file) through `hookPage` in `_common.js`; see `src/js/ui-loop.md`.
- The hooked page goes to a temporary file named by the process id, so two runs (old and new build) can run side by side. Before the cleanup they shared one file name, and one run could record the other's build.
