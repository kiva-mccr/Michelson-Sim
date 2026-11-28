# ui-copy.js

The interferogram's Copy image button (MS-22): `plotCanvas` composes a plot box (its pixel canvas plus the SVG axes, envelope and δ₀ marker) into one canvas at the canvas's device resolution, `copyPlot` puts it on the clipboard as a PNG, and `copyCheck` is the Copied image row of the check table.

## Rules and pitfalls

- The image is exactly what is on screen, at the canvas's own resolution (so twice the CSS size at device pixel ratio 2), on the panel colour of the current theme. Copying never re-renders anything.
- The SVG is drawn as an `<img>`, which sees none of the page's CSS: colours given as CSS variables (`css('--mute')`, a `light-dark()` string) must be swapped for resolved `rgb()` (`rgbOf`) before serialising, and the page font isn't available, so the copy uses `system-ui`. Add any new CSS-variable colour in the plot SVGs to that swap.
- Pass the PNG to `ClipboardItem` as a promise, not an awaited blob: Safari only allows the clipboard write inside the click, and building the image takes a few tens of ms.
- Where the clipboard refuses (no `ClipboardItem`, or the page is embedded without clipboard permission), the `copyDlg` popup shows the image to long-press or right-click, with a Download PNG link. Never fall back to `alert`.
- `copyCheck` decodes the PNG again and compares it with the displayed canvas wherever the canvas is opaque (the plot area), tolerance 0 in 8-bit levels: PNG is lossless, so any difference means the copy isn't the displayed image.
- The ring pattern has no copy button: the WebGPU and WebGL2 canvases can't be read back as displayed pixels without re-encoding the colour from `gpuRead`/`glRead`, so it isn't the same few lines.
