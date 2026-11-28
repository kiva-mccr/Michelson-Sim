# plots-out.js

The interfered spectrum S_out(σ; δ₀) = S(σ)·½[1 + cos 2πσδ₀]: its window (`outAutoWin`, `outWin`, `setOutMan`, `OG` for the zoom and pan in `ui-table.js`), its traces (`outTraces`), its fill (`avgST`, `outFill`), its SVG export (`outVec`) and `renderOut`.

## Rules and pitfalls

- The curves (the modulation T in grey, the Gaussian part of S dashed, and S·T) go through the shared 1-D helper (`plot1d.js`) on the `outCv` canvas under the SVG. Before MS-25 they were SVG paths sampled twice per pixel, which aliased into false fringes at large d.
- The fill under S·T is its exact average over each device pixel's footprint (a Gaussian of sd `PIXSD` px, taken in σ), in closed form (`avgST`). When the fringes are finer than a pixel it tends to S/2. The Interfered spectrum fill check compares it with Simpson quadrature over the footprint (1e-6).
- The dashed S(σ) does not depend on d, so it is drawn once into a layer of its own (`outC.ts`, keyed by `outC.tk`: the axes key, the components, `DPR()` and the colour) and copied each frame. Cost per frame while d moves, on the cloud host: about 3–9 ms at device pixel ratio 1 and 8–13 ms at 2 (it was under 1 ms when it sampled 2 points per pixel and aliased).
- Lines (delta components) are stems in the SVG, from 0 to a·T(σ_n): exact at any zoom.
- The axes are cached by `outC.key` (window, size, YM, theme) and stay in the DOM; each frame rewrites only the canvas and the stems group (the SVG's last child). A new input to the axes must go into the key.
- Wavelength runs right to left (800 nm on the left): t = 0 is l1, t = 1 is l0, as in `specSig`.
