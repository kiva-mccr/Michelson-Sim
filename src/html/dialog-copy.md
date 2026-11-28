# dialog-copy.html

The copy / save menu (`xmenu`: title `xmT`, the three actions with `data-x`, the sizes `xmSize`, the pixel size `xmPx`, the status line `xmStat`) and the Copy image fallback popup (`copyDlg`, with `copyImg` and `copyDl`). `ui-copy.js` drives both. Placed at `<!--@INCLUDE dialog-copy.html@-->`.

## Rules and pitfalls

- The menu is a fixed popup, not a `<dialog>`: it opens at the pointer (or as a bottom sheet, class `sheet`) and closes on Escape or a press outside it.
- `copyDlg` is a centred modal like the other popups; its Close button uses the shared `data-close` handler. `ui-copy.js` revokes the previous object URL before setting a new one, so keep the image and the link on the same URL.
