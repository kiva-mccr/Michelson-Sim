# physics.js

First in the build order. Constants, the embedded CVRL CIE 2006 2° colour matching functions and XYZ → sRGB, the presets and the state (`comps`, saved to localStorage under `mich-sim-v2`), the spectrum shape (`shape`, `dens`, `P`), `gamma` (the normalised interferogram from Wiener–Khinchin) and `sublines` (the colour sub-bands of the current spectrum, cached; `splitBands(cs)` splits any component list, used by the speed test).

## Rules and pitfalls

- Line shapes are defined in wavenumber σ (µm⁻¹). Gaussians use `w = FWHM/(2√ln2)` and stay symmetric in σ.
- Heights are true peak densities: a Gaussian's power is `√π·a·w`, and a line's power is `√π·a·w₀` with w₀ from FWHM 0.008 µm⁻¹. Never rescale them for display.
- `sublines`: K is between 15 and 241, spanning ±2.8w, each sub-band at most 0.012 µm⁻¹ wide. Light outside 390–780 nm adds no colour but still counts in the power.
- Any change here can move every output. Compare snapshots before and after (`tests/snapshot.js`).
- `css()` and `box()` are cached (`CSSC`, `SZC`, MS-13). `box(el)` returns [clientWidth, clientHeight] and caches it only when the width is nonzero; `SZC` is cleared on resize (ResizeObserver and window resize), `CSSC` on a theme or colour-scheme change. A new layout change that resizes an element without a resize event must clear its `SZC` entry.
- `gammaOf(cs)` gives `re(d)` and `mag(d)` with the same expressions as `gamma`, so results are bit-identical; keep them in step if `gamma` changes.
- `SWT` (sweep seconds per pass, MS-14) is saved with the state as `swt` and clamped to 0.5–600 s by `SWTset`.
