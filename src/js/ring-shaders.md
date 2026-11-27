# ring-shaders.js

The renderer overview, the backend state `RB`, `packRing` (sub-bands and groups packed for the GPU) and the shader sources: `PIX_GLSL`/`TONE_GLSL`/`GLSL_*` for WebGL2 and `WGSL`/`WGSL_R` for WebGPU, the same expressions line for line.

## Rules and pitfalls

- GPU precision: `k_b·2d mod 2π` (and the fast path's `Δk_b·2d mod 2π`) is computed in float64 on the CPU (`packRing`). The GPU adds only `k_b·Δ`. sin and cos of θ come from square roots, and the fringe cosine is `cosA` (range reduction plus a Taylor series). Never swap these for built-in GPU trig: it failed the 1e-3 tolerance at d = 5 mm.
- Any change to one shader language must be mirrored in the other.
- The tone passes take the direct fetch when Nl = N (at rest) and interpolate bilinearly only for a preview grid. Keep it that way: the at-rest image must stay bit-identical.
- `RB.pref` comes from `?renderer=` (tests only).
- `gam` (sRGB encoding) is only needed by the tone pass, so it lives in `TONE_GLSL`, not in the shared pixel maths.
- Sub-band records (MS-16) are (KA, KB, phase0, 0), (P·X, P·Y, P·Z, P): the weights are premultiplied so the inner loop is one fetch and one multiply-add. Group records are three vec4s: (a, b, pka, cI), (cX, cY, cZ, Δk_b), (Δk_b·2d mod 2π, …). Change `packRing` and both shaders together.
- GPU fast path (MS-16): a first-order, evenly spaced group (Δk_b = `g.lin` ≠ 0) steps e^{ex} by exact ratios and the fringe cosine by a rotation, re-evaluated directly (`exp`, `cosA`) every `GSTEP` = 8 sub-bands, like `pixVal`'s CPU fast path. The phase step is (Δk_b·2d mod 2π, float64 on the CPU) + Δk_b·Δ − Δk_b·δ̄·(q−1)/q, never Δk_b·δ̄ in float32. If even the group's first sub-band has ex < −40 the group adds only its constant part. Checked by `tests/gpukernel.js` (largest error 9e-6 of I, the same as before MS-16).
- The compute and fragment pixel passes return 0 beyond `rc = 1 + 6k/N` (the corner skip, see ring-model.md); keep it equal to `rcut()`.
