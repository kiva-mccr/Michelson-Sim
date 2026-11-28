# ui-copy.js

The copy / save menu on every plot (MS-23): `xOpen`/`xClose` (a popup at the pointer, or a bottom sheet on touch screens and narrow windows), `xDo` (Copy image, Download PNG, Download SVG, Download MP4), the size buttons (2×, 4×, 8×, remembered per browser), the long-press wiring for each plot, and `exportCheck` (the Exported plots row). While an MP4 renders, `mp4Eta` shows "Rendering frame i of n (x%) · about … left"; the time left is the mean time per frame since frame 1 times the frames left (frame 1 is excluded, since it includes setup), shown from frame 2 until the last frame.

## Rules and pitfalls

- Opened by `longPress` (`ui-touch.js`): a right-click, or a finger held 500 ms, not starting on a drag handle (`onHandle`: the spectrum's `hit`, the ring's `ovHandle`), so slow drags on a dot still work. The plots' own pointerdown handlers ignore buttons other than the left one (`e.button > 0`), so a right-click never adds a line or starts a drag.
- Pass the PNG to `ClipboardItem` as a promise, not an awaited blob: Safari only allows the clipboard write inside the click.
- Where the clipboard refuses (no `ClipboardItem`, or the page is embedded without clipboard permission), the `copyDlg` popup shows the image to long-press or right-click, with a Download PNG link. Never fall back to `alert`.
- Closing the menu cancels a running ring export (`XM.busy` is a counter that every open and close bumps).
- `exportCheck`: each 1-D plot (both spectra since MS-25, the interferogram, the profile) exported at the device's own scale, PNG-encoded and decoded again, against the displayed canvas wherever it is opaque, tolerance 0 in 8-bit levels.
- The plot boxes have `-webkit-touch-callout:none` and `user-select:none`, so iOS doesn't show its own callout or select text on a long-press.
- Saving goes through `xSave`: inside the claude.ai artifact viewer a page may not download a file itself (links and `a.download` do nothing there), so it asks through the platform's `downloads` capability (`window.claude.use('downloads')`, the viewer confirms; the artifact must be published with `capabilities: {downloads: true}`). Opened as a plain file there is no `window.claude`, and a download link does it. A declined save says "Not saved". `tests/export.js` checks both paths.
