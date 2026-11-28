# style.css

All styles. The layout is a single screen with no page scroll at 1920×1080, 1366×657 and 1280×600.

## Rules and pitfalls

- After any layout change, run `python tests/layout.py` at all three sizes.
- No native browser dialogs or validation bubbles. Messages go in the page or in the page's own dialogs.
- `.railhd .brk` forces a line break so range, pass time and speed always share the rail header's second row (MS-14); `tests/layout.py` covers the panel's height.
- Touch (MS-22): `@media (pointer:coarse)` enlarges buttons, checkboxes, the ? button and the rail. `#spec` needs `touch-action:none` (see `plots-spectrum.md`), and `#ifgBox` has `touch-action:pan-y` in the template so the page still scrolls over it and a sideways pinch reaches the page.
- Phones: below 700 px the top bar's buttons grow to fill whole rows; in the stacked layout the plot hints take their own line, and the interferogram's two checkboxes wrap together (`.chks`). `tests/touch.js` checks there is no sideways scroll at 320, 390 and 750 px.
- `.selbar` is hidden by `(min-width:1100px) and (min-aspect-ratio:4/3) and (pointer:fine)`; keep that guard, or the bar takes height from the editor in the one-screen layout.
