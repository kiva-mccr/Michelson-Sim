# symmetry.js

Checks MS-15: with zero tilt, the at-rest CPU ring evaluates one octant of pixels and mirrors it 8 ways. For 6 untilted spectra at two window sizes (even and odd ring widths when the layout gives them), it evaluates `pixVal` directly at every pixel and requires every pixel's X, Y, Z and I to equal its octant pixel's bit for bit, and the rendered I/I_tot buffer to equal the direct values.

## Rules and pitfalls

- It hooks in by finding the end of `ui-loop.js` (the last JS file); see `src/js/ui-loop.md`.
- The direct evaluation here must use the same expressions as `pix` in `ring-render.js`; if those change, change both.
- It writes its hooked page to a temporary file named by its process id, so it can run beside `snapshot.js`.
