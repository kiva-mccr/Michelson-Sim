# verify.js

The verification table (`verify`, Method and checks → Run checks), Simpson quadrature (`simpson`, `quadSpec`), the coherence length (`coherence`: the HWHM of |γ| and Mandel's ∫|γ|² dδ) and the live equations (`eqs`).

## Rules and pitfalls

- Every rendered number or image needs a row here that compares it against an independent computation (quadrature or a brute-force 2-D pixel integral), never against the same code path.
- Tolerances are part of the spec: 1e-6 for the interferogram, 1e-3 for the sub-bands and ring pixels, 1e-2 for XYZ, 1e-4 for Mandel. Never loosen one to make a check pass.
- The live equations put 2 terms per line when the window is at least 900 px wide, otherwise 1.
- MS-25 rows: Interfered spectrum fill (the closed-form footprint average `avgST` at 8 pixels vs Simpson quadrature of ∫g·S·T over the footprint, 1e-6) and Plot traces (`traceCheck` in `plot1d.js`: the span every 1-D plot's trace draws, at 48 pixels on an 800-pixel plot, vs the min/max of 2,000+ exact samples; 3e-3 of the plot height, against a bound of 0.24% for 32 samples per fringe).
- The Exported plots row (MS-23) calls `exportCheck` (in `ui-copy.js`): the interferogram and profile exported at the device scale, PNG-encoded and decoded again, against the displayed canvases, tolerance 0 in 8-bit levels. The Exported ring row exports the ring at 160² (`ringExport`) and compares 8 pixels with `ringBrute`, tolerance 1e-3.
- `ringBrute(M, cs, N, Ib)` is the brute-force 2-D footprint integral at 8 pixels inside the circle, shared by the Ring pixels and Exported ring rows.
- The Interferogram marker row (MS-26) runs two sweep passes with `sweepStep` at uneven frames, draws the interferogram at each, reads the δ₀ line's x back from the SVG, maps it through the drawn window (`IG`) and compares with 2d (fraction of the window, and how far outside the plot), tolerance 1e-9. It puts d and `IFGC` back afterwards.
- The Sweep row (MS-14) steps the mirror with `sweepStep` from −range at uneven frame times (seeded, 5–40 ms) until it turns at +range, cutting the last step at the turn, and compares the elapsed time with `SWT` and the speed readout with 2·range over that time (tolerance 1e-9, relative).
