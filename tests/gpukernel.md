# gpukernel.js

Runs the WebGPU (WGSL) and WebGL2 (GLSL) pixel kernels on their own, on small grids, for 9 spectrum and OPD settings × 5 tilts × 2 grid sizes, and compares every grid point inside the circle with `pixVal` in float64. Prints the largest difference relative to the pixel's I and fails above 1e-4 (the in-page "Ring pixels" check allows 1e-3). `node tests/gpukernel.js [src/js dir]`; `V=1` prints every case. Pass an older `src/js` (e.g. from `git show`) to compare kernels before and after a change.

## Rules and pitfalls

- It loads `ring-model.js` and `ring-shaders.js` from `src/js` directly (no build needed), with stand-ins for `$`, `AMM`, `PIXSD` and `clamp`, and a smooth stand-in for the colour. If those files start to use other names, add stand-ins here.
- WebGPU runs compute-only (no canvas) in a browser launched with `--disable-webgl`, and WebGL2 in a separate browser: on hosts without a GPU, SwiftShader's GPU process otherwise loses both contexts, which is why the full page falls back to the CPU there.
- Its grid-point positions follow each shader (WebGL2 rows run bottom-up).
