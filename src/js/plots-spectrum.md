# plots-spectrum.js

The spectral axes (`axes`, `gpath` for the editor's fills) and the spectrum editor (`renderSpec`, `specTraces`, dragging components). The interfered spectrum is in `plots-out.js`.

## Rules and pitfalls

- Wavelength axes run 800 → 400 nm, left to right.
- Moving d redraws only what depends on it. The editor is skipped when `specKey` is unchanged (it includes `DPR()`, so an export's redraw at another scale is not skipped). A new input must go into the key, or the plot goes stale.
- The editor's curves (the combined Gaussian shape, dashed, and each Gaussian in its colour) are drawn by the shared 1-D helper (`plot1d.js`) on the `specC` canvas under the SVG (MS-25); the SVG keeps the fills, stems, dots and handles.
- A dragged Gaussian narrower than FWHM 0.008 µm⁻¹ snaps back to a line.
- Touch (MS-22): `#spec` has `touch-action:none` in `style.css`; without it the browser takes a finger drag as a page scroll after a few pixels and cancels it (`pointercancel`). Hit tolerances scale with `fat(e)` (2 for a finger) and the nearest dot wins; drawn handles are larger when `TOUCH` (`SDOT`, `HW`, `HH`). A mouse press on empty plot adds a line and drags it at once; a finger adds one only on a tap (lifted within 500 ms, moved under 10 px), so swipes and long-presses (the copy menu) add nothing. A drag follows only the pointer that started it (`drag.id`).
- `renderSpec` also updates the selection bar (`selBar()` in `ui-table.js`), so the bar follows `specKey` like the plot.
- The editor ignores presses with a button other than the left one: a right-click opens the copy menu (MS-23) and must not add a line.
