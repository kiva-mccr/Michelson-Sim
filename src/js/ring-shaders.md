# ring-shaders.js

The renderer overview, the backend state `RB`, `packRing` (sub-bands and groups packed for the GPU) and the shader sources: `PIX_GLSL`/`TONE_GLSL`/`GLSL_*` for WebGL2 and `WGSL`/`WGSL_R` for WebGPU, the same expressions line for line.

## Rules and pitfalls

- GPU precision: `k_b·2d mod 2π` is computed in float64 on the CPU (`packRing`). The GPU adds only `k_b·Δ`. sin and cos of θ come from square roots, and the fringe cosine is `cosA` (range reduction plus a Taylor series). Never swap these for built-in GPU trig: it failed the 1e-3 tolerance at d = 5 mm.
- Any change to one shader language must be mirrored in the other.
- The tone passes take the direct fetch when Nl = N (at rest) and interpolate bilinearly only for a preview grid. Keep it that way: the at-rest image must stay bit-identical.
- `RB.pref` comes from `?renderer=` (tests only). The old menu's `mich-renderer` localStorage key is cleared on load.
