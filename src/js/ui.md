# ui.js

Last in the build order. The component table, auto ranges (`settleOPD`, `fitRange`), presets, the drag controls (mirror rail, tilt dot and field-of-view rim on the ring overlay, Michelson schematic), editable numbers (`editable`), dialogs and citation links (`openDlg`), ring sizing (`fitRing`) and the draw loop (`draw`, `update`).

## Rules and pitfalls

- Controls are dragged, not slid. Only the white dot sets the tilt. It snaps to 0, 0 near the centre and appears on hover at 0, 0. The rim or the scroll wheel sets the field of view. Scrolling on the rail rescales the d range.
- Every number next to a control goes through `editable()`.
- Keep the file ending `update(false);` followed by `}` and `</script>`: `tests/snapshot.js` and `tests/fastpath.js` insert their hooks there.
- The CPU ring is capped at 480² pixels. The GPUs render at device resolution, up to 1024².
