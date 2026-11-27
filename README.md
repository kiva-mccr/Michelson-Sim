# Michelson interferometer simulator

Open `index.html` in a browser. It needs no server (MathJax comes from a CDN).

While you drag, the ring and the range plots show a lower-resolution preview sized to what your device can draw at its display's refresh rate. At rest every pixel is computed exactly, so the results never depend on how fast the device is.

`index.html` is built from `src/` with `python3 build.py` (standard library only). Edit the files in `src/`, then rebuild.

- `index.html`: the simulator (generated, single file)
- `src/`, `build.py`: the sources it is built from
- `reference/michelson-table.html`: the sourced formula table (single line → N lines → Gaussian → N Gaussians → arbitrary spectrum)
- `mockups/controls-mockups.html`: the drag-control mockups (A, B and C)
- `tests/`: Playwright checks for correctness, layout and performance, plus `snapshot.js` / `compare_snapshots.py` (Node) to confirm that a change leaves every output identical
- `ROADMAP.md`: the steps (by ID), done and next, and the settled and shelved decisions
- `.claude/CHECKLIST.md`: what to check before handing a change over
- `*.md` beside each code file: what the file does, and its rules and pitfalls
- `CLAUDE.md`: requirements, architecture and conventions for working on this project with Claude Code

```
pip install -r tests/requirements.txt
python -m playwright install chromium
python3 build.py --check
cd tests && python verify.py && python layout.py && python perf.py
```
