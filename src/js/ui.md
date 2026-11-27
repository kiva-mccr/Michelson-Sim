# ui.js

Last in the build order. The component table, auto ranges (`settleOPD`, `fitRange`), presets, the drag controls (mirror rail, tilt dot and field-of-view rim on the ring overlay, Michelson schematic), editable numbers (`editable`), dialogs and citation links (`openDlg`), ring sizing (`fitRing`) and the draw loop (`draw`, `update`).

## Rules and pitfalls

- Controls are dragged, not slid. Only the white dot sets the tilt. It snaps to 0, 0 near the centre and appears on hover at 0, 0. The rim or the scroll wheel sets the field of view. Scrolling on the rail rescales the d range.
- Every number next to a control goes through `editable()`.
- Keep the file ending `update(false);` followed by `}` and `</script>`: `tests/snapshot.js` and `tests/fastpath.js` insert their hooks there.
- `draw()` keeps `LQ.other` (plot time outside the ring) and `LQ.tot` (the whole main-thread frame) as running averages while moving; the preview budgets use them.
- The CPU ring is capped at 480² pixels. The GPUs render at device resolution, up to 1024².
- The Michelson schematic shows the tilt on the fixed mirror M₁ (500 µrad draws as 10°): αx turns it in the drawing's plane, either way; αy leans it, drawn as a shaded strip of its silvered face below the bar (+αy) or of its dark back above it (−αy), as deep as |αy|. M₂ only slides with d. The physics is unchanged: δ depends only on the tilt between the two mirror images.
