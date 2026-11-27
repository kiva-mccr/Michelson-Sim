# Michelson interferometer simulator

Open `index.html` in a browser. It needs no server (MathJax comes from a CDN).

While you drag, the ring shows a lower-resolution preview sized to what your device can draw. Each preview pixel is still an exact average over its own, larger footprint, so the preview is softer but never aliased. The profile and interferogram plots are drawn exactly the same way moving or at rest, so they don't flicker. The slower the picture is changing, the sharper the preview, because a frame can then take longer without the motion looking less smooth; when you stop moving, even with the button held, the exact image appears. Sweep moves the mirror back and forth on its own; the rail header shows how long one pass takes and the mirror speed, and you can type or scroll either. At rest every pixel is computed exactly, at one point per screen pixel on every renderer (the canvas is never stretched, which used to show as lobes of brightness around the rings), so the results never depend on how fast the device is. The pattern is drawn by the fastest renderer on your device (WebGPU, WebGL2, the CPU on all cores, or the CPU on one core): once the first image is done, a short speed test has each one compute the same image, switches to the fastest and remembers it for this device. The ? in the corner of the pattern panel shows which renderer is drawing, the test's times, and the resolution.

`index.html` is built from `src/` with `python3 build.py` (standard library only). Edit the files in `src/`, then rebuild.

- `index.html`: the simulator (generated, single file)
- `src/`, `build.py`: the sources it is built from, in small files (template and dialogs in `src/html/`, styles, and the script in `src/js/`), each with a note beside it
- `reference/michelson-table.html`: the sourced formula table (single line → N lines → Gaussian → N Gaussians → arbitrary spectrum)
- `mockups/controls-mockups.html`: the drag-control mockups (A, B and C)
- `mockups/roadmap-mockups.html`: the mock-ups for MS-7, MS-8, MS-9 and MS-11
- `mockups/sweep-duration-mockups.html`: the three sweep-time options for MS-14 (A was built)
- `tests/`: Playwright checks for correctness, layout and performance, plus `snapshot.js` / `compare_snapshots.py` (Node) to confirm that a change leaves every output identical, `gpukernel.js` (Node) to check the GPU pixel kernels against the exact float64 formula, `antialias.js` (Node) to check moving previews against brute-force footprint integrals and the ring for moiré, `plotstable.js` (Node) to check that the plots are identical moving and at rest, `sweepres.js` (Node) to check that the sweep uses the same adaptive preview as a drag, and `autopick.py` to check that the startup speed test picks the fastest renderer; `_common.py` and `_common.js` hold the shared setup
- `ROADMAP.md`: the steps (by ID), done and next, and the settled and shelved decisions
- `.claude/CHECKLIST.md`: what to check before handing a change over
- `*.md` beside each code file: what the file does, and its rules and pitfalls
- `CLAUDE.md`: requirements, architecture and conventions for working on this project with Claude Code

```
pip install -r tests/requirements.txt
python -m playwright install chromium
python3 build.py --check
cd tests && python verify.py && python layout.py && python autopick.py && python perf.py
```
