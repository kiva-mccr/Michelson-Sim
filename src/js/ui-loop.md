# ui-loop.js

Last in the build order. Editable numbers (`editable`, `setD`, `widen`), ring sizing (`fitRing`), dialogs and citation links (`openDlg`), and the draw loop (`draw`, `update`, `goIdle`).

## Rules and pitfalls

- Every number next to a control goes through `editable()`.
- Keep the file ending `update(false);` followed by `}` and `</script>`: `tests/snapshot.js` and `tests/fastpath.js` insert their hooks there.
- `update(true)` arms `goIdle` (`IDLE` = 150 ms): a live input that stops changing gets the exact at-rest image while the button is still held.
- `draw()` keeps `LQ.other` (plot time outside the ring) and `LQ.tot` (the whole main-thread frame) as running averages while moving; the preview budgets use them.
- The CPU ring is capped at 480² pixels. The GPUs render at device resolution, up to 1024².
