# plots.js

The spectrum editor (`renderSpec`, dragging components), the interfered spectrum (`renderOut`), the shared pixel maths (`avgTerm`, `xyzAt`, `PIXSD`), the range plots and the interferogram (`renderIfg`).

## Rules and pitfalls

- Wavelength axes run 800 → 400 nm, left to right.
- Moving d redraws only what depends on it. The editor is skipped when `specKey` is unchanged. The interfered spectrum keeps its axes, grid and S(σ) (`outC`) and re-evaluates only T(σ;δ₀). The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves. A new input to any of these must go into its cache key, or the plot goes stale.
- The range plots' sub-columns per pixel come from `dpK()`: 8 at rest, `DPQ.k` (2 to 8) while moving. `dpRecord` raises it only into spare frame time (`FR() − LQ.tot`) and only once the ring preview is at full resolution (`LQ.last === 1`). Don't let it spend the ring's budget: the ring's measured time includes the profile, so a plot that takes ring time drops the ring to a coarser preview, which drops the plots back, in a loop. `dpK()` is part of `ifgKey`.
- A dragged Gaussian narrower than FWHM 0.008 µm⁻¹ snaps back to a line.
