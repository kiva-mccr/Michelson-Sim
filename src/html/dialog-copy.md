# dialog-copy.html

The Copy image fallback popup (`copyDlg`, MS-22): the copied interferogram (`copyImg`) to long-press or right-click, and a Download PNG link (`copyDl`). `ui-copy.js` fills both and opens it only when the browser refuses the clipboard. Placed at `<!--@INCLUDE dialog-copy.html@-->`.

## Rules and pitfalls

- It's a centred modal like the other popups; its Close button uses the shared `data-close` handler.
- `ui-copy.js` revokes the previous object URL before setting a new one, so keep the image and the link on the same URL.
