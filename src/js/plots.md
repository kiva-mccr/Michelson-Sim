# plots.js

The spectrum editor (`renderSpec`, dragging components), the interfered spectrum (`renderOut`), the shared pixel maths (`avgTerm`, `xyzAt`, `PIXSD`), the range plots and the interferogram (`renderIfg`).

## Rules and pitfalls

- Wavelength axes run 800 → 400 nm, left to right.
- Moving d redraws only what depends on it. The editor is skipped when `specKey` is unchanged. The interfered spectrum keeps its axes, grid and S(σ) (`outC`) and re-evaluates only T(σ;δ₀). The interferogram trace is cached (`ifgKey`), so only the δ₀ marker moves. A new input to any of these must go into its cache key, or the plot goes stale.
- A dragged Gaussian narrower than FWHM 0.008 µm⁻¹ snaps back to a line.
