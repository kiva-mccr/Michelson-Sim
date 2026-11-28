# plot1d.js

The one helper behind every 1-D plot (MS-25): the source spectrum, the interfered spectrum, the profile and the interferogram draw their curves through it, on screen (`traceRaster`, `drawTraces`, `plotCanvas`) and in SVG exports (`tracesSVG`, `curvePath`, `fringeN`). Also the signals (`fringeSig`, `specSig`), `spanOf`, `DPK`, `hexRGB`, and `traceCheck` for the Plot traces check row.

A trace is `{sig, col, alpha, dash, w, vary, id}`. A signal gives, over t ∈ [0,1] across the plot area (left to right) in plot units (0 at the bottom, 1 at the top): `val(t)` the exact value, `fr(a,b)` the fringes in [a,b] (0 for a smooth curve) and `band(a,b)` the band the fringes cover once [a,b] holds a whole one.

## Rules and pitfalls

- Every 1-D curve goes through here. Never draw one as an SVG path sampled at a fixed step: that is what aliased the interfered spectrum (2 samples per pixel; at d = 1 mm about 40 false fringes where there are about 2,500).
- `traceRaster` per device-pixel column: fewer than one fringe in the pixel, each of its `DPK` = 8 sub-columns covers the exact span of its slice (`spanOf`, sampled at 32 points per fringe, so a sampled max misses the true one by at most ½(1 − cos π/32) = 0.24% of the band); a whole fringe or more, each row gets the coverage a sub-column of fringe fraction N/8 gives it on average over the phase (closed form, see the code). Deciding per sub-column there made the covered span depend on the phase and beat into faint streaks when 1 to 8 fringes fell in a pixel. At N = 1 both rules give the same mean, so there is no visible step. At N ≥ 8 every row of the band is covered.
- The phase-averaged coverage takes 2·acos(u) from a 4,096-step table (`ACOS2`): a direct `acos` per row cost 5–10 ms a frame on the interfered spectrum's full-height bands. It sets shading only, never a plotted value.
- `DPK` stays 8, moving or at rest (MS-17): adapting it to the frame time made the plots flicker. `tests/plotstable.js` requires identical pixels moving and at rest.
- `specSig` with `mod`: over a span holding a whole fringe, f·T reaches 0 at a trough and f(σ_k) at each peak σ_k = k/|δ₀|, so its band is [0, max_k f(σ_k)], exact. An earlier version used max f over the span, which overshot on steep flanks (0.5% of the plot).
- `fringeSig`'s band is ½(1 ± max |γ|) at 5 points of the span, as before MS-25.
- `spanOf` returns a shared array (`SPAN2`, or the signal's own `E` for a band): read it before the next call.
- `plotCanvas` sizes a plot's canvas to its box at `DPR()` (only when the size changes, since resizing reallocates) and clears it; exports set `XDPR` so the same code draws at the export's scale.
- `tracesSVG`: the true curve `val(t)` as a path with at least 16 points per fringe (`fringeN`, 2,000 to 400,000); a trace with `vary` is stroked with a `linearGradient` of its colour (8 stops per fringe, 256 to 20,000; `id` names it, the export test looks for `ifgHue`).
