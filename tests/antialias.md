# antialias.js

Checks MS-17: the ring is anti-aliased correctly at rest and in moving previews of any size, on every renderer the browser offers.

1. **Preview pixels.** For 5 spectra, at rest (Nl = N) and as previews at Nl ≈ N/2, N/5 and N/12 (forced through the page's own `renderRing` by replacing `lqPick`), it reads the grid back (`Ibuf` at rest, `Pbuf` for CPU previews, `gpuRead`/`glRead` on the GPUs) and compares 7 grid points, including the ring centre (smallest |∇δ|), with a brute-force 2-D integral of the exact pattern over that point's own footprint (sd `PIXSD`·k device px). Tolerance 1e-3, as the "Ring pixels" check; 1e-2 for the untilted CPU and worker previews, which interpolate a radial table at 4 samples per grid pixel (largest error seen 1.6e-3).
2. **Moiré.** On a dense ring (HeNe, d = 3 mm, 10°, fringes up to about 1.2 cycles per pixel), the displayed image's luminance is low-passed (Gaussian, sd 3 px) and the spread of that local mean over 0.35 < r < 0.9, relative to its mean, must be at most 2.5%. Real fringes are gone at that scale; what is left is aliasing (ghost ring centres). Not measured on WebGPU (headless Chrome can't read its canvas).

## Rules and pitfalls

- It fails on pre-MS-17 builds: moiré 5.1% at rest and 7.4% in a half-size preview with the old 0.4 px footprint; with the curvature correction skipped in CPU previews, the ring centre of a coarse preview is off by far more than 1e-3.
- WebGL2 preview grids sit in the bottom-left Nl×Nl of the N×N texture, rows bottom-up: grid row j (top-down) is GL row Nl−1−j, which `glRead` puts at row N−1−(Nl−1−j).
- Check points must stay inside the circle (the corners beyond `rcut` are 0, MS-13).
- It hooks in by finding the end of `ui-loop.js` (the last JS file) and writes its hooked page to a temporary file named by its process id, so it can run beside `snapshot.js`.
- On hosts without a GPU, run it with `GPU_ARGS=0` so WebGL2 survives (see `_common.py`); renderers whose context is lost are reported as skipped.
