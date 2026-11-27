# compare_snapshots.py

Compares two snapshot files and prints IDENTICAL, or the largest absolute and relative difference per output. Exits 1 if anything differs.

## Rules and pitfalls

- Accept a difference only at floating-point noise level, and say so in the PR.
