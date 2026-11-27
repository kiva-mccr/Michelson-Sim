# Roadmap

Work goes step by step. Each step has a stable ID (`MS-n`). Tick `[x]` when a step is merged.
Claude builds only the steps that Kiva has approved. To find a step, search for its ID instead of reading the whole file.

## Done

- [x] MS-1: Add the project baseline from Kiva's local copy (layout C "hero ring", drag controls, verification table, sources [1]–[14]).
- [x] MS-2: Prune orphaned code, dead CSS and stale comments.
- [x] MS-3: Speed up per-frame plotting and the CPU pixel loop (bit-identical outputs).
- [x] MS-4: Step sub-band exponentials and phases in the CPU ring loop. Add the snapshot tests (`tests/snapshot.js`, `tests/compare_snapshots.py`, `tests/fastpath.js`).
- [x] MS-5: Keep the project artifact updated on every change.
- [x] MS-6: Follow Kiva's general preferences: this roadmap, `.claude/CHECKLIST.md`, a note beside each code file, a Known gaps list and the merge rule in CLAUDE.md.
- [x] MS-10: Scale the live preview to the device: the frame budget follows the measured display refresh, and the range plots step up from 2 to 8 sub-columns using only spare frame time once the ring preview is at full resolution. At-rest outputs unchanged (Kiva, 2026-11-27).
- [x] MS-7: Tilt on the fixed arm. Show the tilt on M₁, the mirror that doesn't move, instead of on the moving M₂. Draw the tilt as the total magnitude √(αx² + αy²) of both components. Today the schematic rotates M₂ by αx alone. Revised (Kiva, 2026-11-27): αx turns M₁ either way in the drawing's plane, and αy leans it, drawn as a shaded strip of its silvered face (+αy) or dark back (−αy).
- [x] MS-8: Remove the renderer controls. The Renderer menu is gone and the page always uses the automatic choice (WebGPU → WebGL2 → workers → CPU). A round ? on the pattern panel opens a popup with the renderer in use and the live resolution (Kiva, 2026-11-27). Tests force a renderer with `?renderer=`.
- [x] MS-9: Animate the tilt snap. Entering the snap circle glides the tilt value itself to 0, 0 over 300 ms (ease-out; first 150 ms, doubled at Kiva's request), so every frame is the true pattern; leaving glides back to the cursor. Reset tilt and double-click glide too; reduced motion jumps.
- [x] MS-11: Scale the live preview to how fast it is changing. Continuous resolution (any grid size N/16…N) from the last frame's measured time, k·(t/0.9B)^(1/p); the budget grows when the fringes move slowly (a frame may last as long as the motion takes to cross one preview pixel, up to 100 ms), so slow drags are sharp and fast ones keep the display rate; a pause with the button held shows the exact image (Kiva, 2026-11-27).
- [x] MS-12: Split the source files so an LLM can work on one part without reading the rest: `ring.js` (40 KB) into six files, `ui.js` (24 KB) into four, `plots.js` (17 KB) into two, and the dialogs out of the template into `src/html/`. Every file is now under about 10 KB with its own note; `index.html` is unchanged byte for byte.
- [x] MS-15: Use the fringe symmetry: with zero tilt, evaluate one octant of the pixels at rest and mirror it 8 ways (exact, replaces the interpolated radial grid, which was off by up to 1.1e-3 at d = 3 mm). Requested by Kiva (2026-11-27).

## Next

Kiva added these on 2026-11-27. Add a step here only once Kiva has approved it.

- [x] MS-13: A new optimization study: profile, find speed-ups, deliver them as verified PRs (bit-identical outputs where possible). Done: cached layout reads and colours, `renderOut` DOM reuse, fewer DOM writes, and skipping the hidden corners of the ring square. At-rest CPU renders 12–40% faster, main-thread overhead per frame about halved, and the freed time goes into sharper previews. Visible outputs bit-identical.
- [x] MS-16: Literature-informed optimization pass (Kiva, 2026-11-27). GPU: the stepped exponential and trigonometric recurrences of the CPU fast path (re-anchored every 8 sub-bands), weights premultiplied so each sub-band is one fetch, and groups whose fringe terms are all below e^{−40} reduced to their constant part. At-rest WebGL2 frame on SwiftShader 941 → 467 ms (LED), 211 → 130 ms (two Gaussians, tilted); kernel error against float64 unchanged (9e-6 of I). CPU and workers: the −40 cut-off decided once per group (exact, by monotonicity), 10–15% faster on tilted LED, bit-identical. New test `tests/gpukernel.js`.
- [x] MS-17: Fix the plot flicker and the moiré while dragging (Kiva, 2026-11-27). The profile and interferogram now always use 8 sub-columns per pixel (switching between 2 and 8 with the spare frame time made them flicker). The ring's pixel footprint widens from sd 0.4 to 0.5 px: a fringe at the pixel pitch kept 4.2% of its contrast and showed as ghost ring centres, now 0.7% (present since the baseline, and shifting with the preview resolution while dragging). CPU and worker previews now apply the curvature correction like the GPUs. New tests `tests/antialias.js` and `tests/plotstable.js`.
- [x] MS-18: Pick the fastest renderer automatically at startup (Kiva, 2026-11-27). The fixed order WebGPU → WebGL2 → workers → CPU picked software WebGL2 (SwiftShader) on a machine without a GPU, which is slower than the CPU workers. Now a short speed test, once the first image is done, has every available renderer compute the same image and switches to the fastest (10% margin before overriding the default order); the ranking is cached per device, failures fall back to the next fastest, and the ? popup shows the times. Outputs unchanged (snapshots identical).
- [x] MS-19: Sharper worker previews (Kiva, 2026-11-27, found while checking that the sweep uses the adaptive resolution). The workers' preview cost was measured as wall time, which included the main thread's remaining draw and a canvas flush after each block, so they settled about 9× coarser than the single-threaded CPU at the same frame rate. They now report their own compute time, split a preview evenly over the workers, paint it once, and get the parallel paths' budget (85% of a frame). Fast sweep: 28² → about 260² preview, at the same or better frame rate. At-rest outputs identical.
- [x] MS-14: Sweep duration controls (Kiva chose option A of `mockups/sweep-duration-mockups.html`, 2026-11-27). The rail header shows "one pass 8 s" and the mirror speed (2·range / pass time), both editable and scrollable; the pass time stays fixed when Auto-fit changes the range and is saved with the state. New check row: Sweep.

- [x] MS-20: Fix the lobed brightness around the rings (Kiva, 2026-11-27). The CPU ring was capped at 480² and the GPUs at 1024², so the browser stretched the canvas; fringes close to the canvas grid's limit then rose and fell in brightness around each ring (4-fold lobes). Not the MS-17 footprint, and not a computation error (every renderer matched a brute-force integral to 6e-5). Every renderer now draws one grid point per device pixel. Snapshots identical at the test size; difference images in `lobing-fix/`.

## Decisions

Settled decisions. Ask Kiva before changing any of them.

### Settled

- Physics accuracy comes first. Every rendered quantity uses the exact formula, has a row in the verification table and has a numbered source.
- Spectral line shapes are defined in wavenumber σ. Gaussians stay symmetric in σ (the usual convention).
- Layout C, "hero ring": source spectrum and Michelson panel on the left, ring and profile in the middle, interferogram, interfered spectrum and coherence on the right. No page scroll at 1920×1080, 1366×657 and 1280×600.
- Wavelength axes run 800 → 400 nm, left to right.
- Heights are true heights (peak spectral density), never rescaled.
- Controls are dragged, not slid (mirror rail, ring dot for tilt, ring rim for field of view). The Michelson schematic stays as a visual.
- Equations, notes, method and sources open as centred modal popups. The Components list is a non-modal popup at the bottom left.
- GPU precision: the CPU computes `k_b·2d mod 2π` in float64, and the GPU uses square-root sin/cos and the `cosA` Taylor series instead of built-in trig.
- The page ships as one dependency-free `index.html`, built from `src/` by `build.py`.
- Claude merges its own PRs once its checks pass (Kiva, 2026-11-27).
- Indent style and British or American spelling don't matter (Kiva, 2026-11-27).

### Shelved

- Beamsplitter π-phase toggle: tried, then dropped at Kiva's request.
- Glass dispersion and compensator plate: tried, then dropped at Kiva's request.
