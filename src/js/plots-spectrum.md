# plots-spectrum.js

The spectral plots: shared axes (`axes`, `gpath`), the spectrum editor (`renderSpec`, dragging components) and the interfered spectrum (`renderOut`, `outC`).

## Rules and pitfalls

- Wavelength axes run 800 → 400 nm, left to right.
- Moving d redraws only what depends on it. The editor is skipped when `specKey` is unchanged. The interfered spectrum keeps its axes, grid and S(σ) (`outC`) and re-evaluates only T(σ;δ₀). A new input to either must go into its cache key, or the plot goes stale.
- A dragged Gaussian narrower than FWHM 0.008 µm⁻¹ snaps back to a line.
