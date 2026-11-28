# plotstable.js

Checks MS-17: the profile, interferogram and (since MS-25) interfered-spectrum plots are identical while moving and at rest, so they can't flicker while dragging. For 4 spectra on the CPU, worker and WebGL2 renderers, it steps d and the tilt through 12 states as live frames (through `renderRing`, so the adaptive preview picks its resolution as in a drag), records the three plot canvases after each, then renders the same states at rest and requires every byte to match.

## Rules and pitfalls

- It fails on MS-10 to MS-16 builds, where the plots used 2 to 8 sub-columns per pixel depending on spare frame time.
- The plots must not depend on `ringLive`, the preview resolution or frame timings. If a future speed-up wants a cheaper moving plot, it has to give the same pixels.
- It hooks in at the end of `ui-loop.js` through `hookPage` in `_common.js` (a temporary file per process).
