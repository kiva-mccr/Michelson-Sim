# symmetry.js

Checks MS-15: with zero tilt, the at-rest CPU ring evaluates one octant of pixels and mirrors it 8 ways. For 6 untilted spectra at two window sizes (even and odd ring widths when the layout gives them), it evaluates `pixVal` directly at every pixel and requires every pixel's X, Y, Z and I to equal its octant pixel's bit for bit, and the rendered I/I_tot buffer to equal the direct values (0 in the hidden corners beyond `rcut`, MS-13).

## Rules and pitfalls

- It hooks in through `hookPage` in `_common.js` (temporary file per process); see `src/js/ui-loop.md`.
- The direct evaluation calls the page's `gridPix` at every pixel, the same evaluation the octant uses, so the test checks the mirroring, not the formula.
