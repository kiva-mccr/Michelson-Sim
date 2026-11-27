# fastpath.js

Compares `pixVal`'s stepped fast path with direct evaluation of every sub-band at 20,000 random pixels per spectrum, in float64. Fails if any output differs by more than 1e-12 or if no group used the fast path.

## Rules and pitfalls

- It hooks in by finding the end of `ui-loop.js` (the last JS file); see `src/js/ui-loop.md`.
