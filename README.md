# Michelson interferometer simulator

Open `index.html` in a browser. It needs no server (MathJax comes from a CDN).

While you drag, the ring shows a lower-resolution preview sized to what your device can draw. Each preview pixel is still an exact average over its own, larger footprint, so the preview is softer but never aliased. The profile and interferogram plots are drawn exactly the same way moving or at rest, so they don't flicker. Every 1-D plot (both spectra, the profile and the interferogram) draws its curves with one shared anti-aliased helper: when fringes are finer than a pixel, as in the interfered spectrum at large mirror distances, the curve fills the band it really covers instead of showing false fringes, and the interfered spectrum's shaded area is its exact average over each pixel. The slower the picture is changing, the sharper the preview, because a frame can then take longer without the motion looking less smooth; when you stop moving, even with the button held, the exact image appears. You can also drag the red δ₀ line on the interferogram to move the mirror; when the mirror goes past the end of the plot (for example during a sweep), the plot scrolls with it so the line stays on screen. Sweep moves the mirror back and forth on its own; the rail header shows how long one pass takes and the mirror speed, and you can type or scroll either. At rest every pixel is computed exactly, at one point per screen pixel on every renderer (the canvas is never stretched, which used to show as lobes of brightness around the rings), so the results never depend on how fast the device is. The pattern is drawn by the fastest renderer on your device (WebGPU, WebGL2, the CPU on all cores, or the CPU on one core): once the first image is done, a short speed test has each one compute the same image, switches to the fastest and remembers it for this device. The ? in the corner of the pattern panel shows which renderer is drawing, the test's times, and the resolution. Right-click any plot (long-press on a phone) to copy it or save it as PNG, SVG or MP4 (one mirror sweep, every frame computed exactly) at 2×, 4× or 8× its size on screen; the export is computed again at that size, and the SVGs are vector where the plot allows it (the interferogram's curve is a path stroked with its colour gradient). Copy image, on the interferogram panel, copies the plot as you see it to the clipboard as a PNG; where the browser doesn't allow that, it opens the image to long-press or right-click, with a download link.

On the interference pattern, drag the white dot to tilt the mirror, and drag the rim (or the two-way arrow on it, bottom right) or scroll to change the field of view.

On a phone or tablet, the controls work by touch: drag the dots and handles on the spectrum, tap to add a line, tap a dot to type its exact values or delete it in the bar below the plot, and pinch where a mouse would scroll (the pattern's field of view, the mirror range, both plots' zoom). Double-tap the pattern to reset the tilt.

`index.html` is built from `src/` with `python3 build.py` (standard library only). Edit the files in `src/`, then rebuild.

- `index.html`: the simulator (generated, single file)
- `src/`, `build.py`: the sources it is built from, in small files (template and dialogs in `src/html/`, styles, and the script in `src/js/`), each with a note beside it
- `reference/michelson-table.html`: the sourced formula table (single line → N lines → Gaussian → N Gaussians → arbitrary spectrum)
- `mockups/controls-mockups.html`: the drag-control mockups (A, B and C)
- `mockups/roadmap-mockups.html`: the mock-ups for MS-7, MS-8, MS-9 and MS-11
- `mockups/sweep-duration-mockups.html`: the three sweep-time options for MS-14 (A was built)
- `tests/`: Playwright checks for correctness, layout and performance, plus `snapshot.js` / `compare_snapshots.py` (Node) to confirm that a change leaves every output identical, `gpukernel.js` (Node) to check the GPU pixel kernels against the exact float64 formula, `antialias.js` (Node) to check moving previews against brute-force footprint integrals and the ring for moiré, `plotstable.js` (Node) to check that the profile, interferogram and interfered spectrum are identical moving and at rest, `sweepres.js` (Node) to check that the sweep uses the same adaptive preview as a drag, `touch.js` (Node) to check the touch controls in an emulated phone, `ifgmarker.js` (Node) to check dragging the interferogram's δ₀ marker and the window following it, `export.js` (Node) to check the copy/save menu and its exports, and `autopick.py` to check that the startup speed test picks the fastest renderer; `_common.py` and `_common.js` hold the shared setup
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
