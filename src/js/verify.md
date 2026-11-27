# verify.js

The verification table (`verify`, Method and checks → Run checks), Simpson quadrature (`simpson`, `quadSpec`), the coherence length (`coherence`: the HWHM of |γ| and Mandel's ∫|γ|² dδ) and the live equations (`eqs`).

## Rules and pitfalls

- Every rendered number or image needs a row here that compares it against an independent computation (quadrature or a brute-force 2-D pixel integral), never against the same code path.
- Tolerances are part of the spec: 1e-6 for the interferogram, 1e-3 for the sub-bands and ring pixels, 1e-2 for XYZ, 1e-4 for Mandel. Never loosen one to make a check pass.
- The live equations put 2 terms per line when the window is at least 900 px wide, otherwise 1.
