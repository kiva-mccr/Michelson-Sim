# ui-mirror.js

The mirror rail (`renderRail`, drag, wheel to rescale), the Michelson schematic (`renderMini`, drag M₂), the sweep (`tick`), `ringReadback` for the checks, `probeBackends()` and the ? popup on the pattern panel.

## Rules and pitfalls

- Scrolling on the rail rescales the d range.
- The schematic shows the tilt on the fixed mirror M₁ (500 µrad draws as 10°): αx turns it in the drawing's plane, either way; αy leans it, drawn as a shaded strip of its silvered face below the bar (+αy) or of its dark back above it (−αy), as deep as |αy|. M₂ only slides with d. The physics is unchanged: δ depends only on the tilt between the two mirror images.
- The ? popup stays open while you drag the pattern and closes on ?, Escape or a click outside the panel.
- The sweep (MS-14): one pass from −range to +range takes `SWT` seconds (set in the rail header, default 8 s), so the time per pass stays the same when Auto-fit changes the range. `sweepStep` is the only code that moves d during a sweep; the verification table's Sweep row runs it with uneven frame times, so keep the tick going through it.
- The pivot dot (`m1p`, at (100, 54)) is the middle of M₁ and its apparent pivot (Kiva, 2026-11-28): the bar is centred on it, αx turns the bar and strip about it, and the αy strip (silvered face for +αy, back in `--mute` for −αy) leans about a horizontal axis through it, so it is centred on the dot too. The beam (`m1Beam`) ends at the dot, so its length never changes (moving the end with the tilt made it grow and shrink). Drawing order: the bar (`m1g2`, opaque backing since its shading is translucent), the αy strip (`m1g`), then the beam and dot on top. Everything varies continuously with αy (strip depth 10·|αy|/500, no minimum, fixed label), so passing through αy = 0 doesn't jump.
- The interferogram's δ₀ marker can be dragged (MS-26, `onMarker`, `mkDrag`): only within 6·`fat(e)` px of the line, keeping the grab offset, clamped to the window at the start of the drag (so the view never scrolls under the pointer) and to the mirror range. It stops the sweep like the rail. `onMarker` is also the interferogram's `onHandle` for the long-press menu (`ui-copy.js`), and the pinch on the interferogram cancels a marker drag (`ui-table.js`). The box keeps `touch-action:pan-y`, so a sideways finger drag reaches it.
- A two-finger pinch on the rail rescales the range like the wheel (MS-22). On touch devices the rail is 48 px tall (`style.css`).
