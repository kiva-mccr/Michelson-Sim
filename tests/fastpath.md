# fastpath.js

Compares `pixVal`'s stepped fast path with direct evaluation of every sub-band at 20,000 random pixels per spectrum, in float64. Fails if any output differs by more than 1e-12 or if no group used the fast path.

## Rules and pitfalls

- It hooks in through `hookPage` in `_common.js`; see `src/js/ui-loop.md`.
