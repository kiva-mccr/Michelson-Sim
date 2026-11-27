# ui-loop.js

Last in the build order. Editable numbers (`editable`, `setD`, `widen`), ring sizing (`fitRing`), dialogs and citation links (`openDlg`), and the draw loop (`draw`, `update`, `goIdle`).

## Rules and pitfalls

- Every number next to a control goes through `editable()`.
- Keep the file ending `update(false);` followed by `}` and `</script>`: the Node tests insert their hooks there (`hookPage` in `tests/_common.js`).
- `update(true)` arms `goIdle` (`IDLE` = 150 ms): a live input that stops changing gets the exact at-rest image while the button is still held.
- `draw()` keeps `LQ.other` (plot time outside the ring) as a running average while moving; the CPU preview budget uses it.
- Every renderer draws the ring at one grid point per device pixel (capped only at 4096²; MS-20). Don't cap the canvas below the screen size again: the CPU used to stop at 480² and the GPUs at 1024², and the browser stretched the canvas to fit. Fringes then sat close to the canvas grid's Nyquist limit (e.g. 0.37 cycles per canvas pixel at d = 1 mm), and stretching them showed lobes: brightness that rises and falls around each ring, with 4-fold symmetry (Kiva, 2026-11-27). The cost is a longer at-rest render on the CPU paths (tilted LED at dpr 2: about 1.1 s on the workers, 3.5 s on the main thread, time-sliced); previews still adapt.
- `fitRing` reads sizes through `box()` and writes the ring size only when it changed; `setTxt` writes text only when it changed. Both avoid forced layouts every frame (MS-13).
- The sweep's pass time (`sTV`) and mirror speed (`sVV`, = 2·range / pass time) are both `editable()`; typing a speed sets the pass time. Scrolling on either scales the pass time by 1.25 per notch, the same way round as the rail (scroll down makes the number bigger).
