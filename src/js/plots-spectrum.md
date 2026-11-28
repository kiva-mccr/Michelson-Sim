# plots-spectrum.js

The spectral plots: shared axes (`axes`, `gpath`), the spectrum editor (`renderSpec`, dragging components) and the interfered spectrum (`renderOut`, `outC`).

## Rules and pitfalls

- Wavelength axes run 800 → 400 nm, left to right.
- Moving d redraws only what depends on it. The editor is skipped when `specKey` is unchanged. The interfered spectrum keeps its axes, grid and S(σ) (`outC`) and re-evaluates only T(σ;δ₀). A new input to either must go into its cache key, or the plot goes stale.
- A dragged Gaussian narrower than FWHM 0.008 µm⁻¹ snaps back to a line.
- `renderOut` builds its DOM once per key (`outC.ns`, `outC.dom`) and afterwards only updates the `d`, `y2` and `cy` attributes, giving markup identical to a rebuild. If you add an element that depends on δ₀, update it in both branches, or the child-count check falls back to a rebuild.
- Touch (MS-22): `#spec` has `touch-action:none` in `style.css`; without it the browser takes a finger drag as a page scroll after a few pixels and cancels it (`pointercancel`). Hit tolerances scale with `fat(e)` (2 for a finger) and the nearest dot wins; drawn handles are larger when `TOUCH` (`SDOT`, `HW`, `HH`). A mouse press on empty plot adds a line and drags it at once; a finger adds one only on a tap (lifted within 500 ms, moved under 10 px), so swipes and long-presses (the copy menu) add nothing. A drag follows only the pointer that started it (`drag.id`).
- `renderSpec` also updates the selection bar (`selBar()` in `ui-table.js`), so the bar follows `specKey` like the plot.
