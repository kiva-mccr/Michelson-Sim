# style.css

All styles. The layout is a single screen with no page scroll at 1920×1080, 1366×657 and 1280×600.

## Rules and pitfalls

- After any layout change, run `python tests/layout.py` at all three sizes.
- No native browser dialogs or validation bubbles. Messages go in the page or in the page's own dialogs.
- `.railhd .brk` forces a line break so range, pass time and speed always share the rail header's second row (MS-14); `tests/layout.py` covers the panel's height.
