# ui-mirror.js

The mirror rail (`renderRail`, drag, wheel to rescale), the Michelson schematic (`renderMini`, drag M₂), the sweep (`tick`), `ringReadback` for the checks, `probeBackends()` and the ? popup on the pattern panel.

## Rules and pitfalls

- Scrolling on the rail rescales the d range.
- The schematic shows the tilt on the fixed mirror M₁ (500 µrad draws as 10°): αx turns it in the drawing's plane, either way; αy leans it, drawn as a shaded strip of its silvered face below the bar (+αy) or of its dark back above it (−αy), as deep as |αy|. M₂ only slides with d. The physics is unchanged: δ depends only on the tilt between the two mirror images.
- The ? popup stays open while you drag the pattern and closes on ?, Escape or a click outside the panel.
- The sweep (MS-14): one pass from −range to +range takes `SWT` seconds (set in the rail header, default 8 s), so the time per pass stays the same when Auto-fit changes the range. `sweepStep` is the only code that moves d during a sweep; the verification table's Sweep row runs it with uneven frame times, so keep the tick going through it.
