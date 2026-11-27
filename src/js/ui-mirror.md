# ui-mirror.js

The mirror rail (`renderRail`, drag, wheel to rescale), the Michelson schematic (`renderMini`, drag M₂), the sweep (`tick`), `ringReadback` for the checks, `probeBackends()` and the ? popup on the pattern panel.

## Rules and pitfalls

- Scrolling on the rail rescales the d range.
- The schematic shows the tilt on the fixed mirror M₁ (500 µrad draws as 10°): αx turns it in the drawing's plane, either way; αy leans it, drawn as a shaded strip of its silvered face below the bar (+αy) or of its dark back above it (−αy), as deep as |αy|. M₂ only slides with d. The physics is unchanged: δ depends only on the tilt between the two mirror images.
- The ? popup stays open while you drag the pattern and closes on ?, Escape or a click outside the panel.
- The sweep (MS-14): one pass from −range to +range takes `SWT` seconds (set in the rail header, default 8 s), so the time per pass stays the same when Auto-fit changes the range. `sweepStep` is the only code that moves d during a sweep; the verification table's Sweep row runs it with uneven frame times, so keep the tick going through it.
- The beam to M₁ (`m1Beam`) ends at the pivot dot (`m1p`), and M₁ turns about that point: the middle of the visible silvered face (the bar's lower edge, or the middle of the +αy strip). The beam is drawn after the mirror so the strip never hides its end. Everything varies continuously with αy (strip depth 10·|αy|/500, no minimum, fixed label), so passing through αy = 0 doesn't jump (Kiva's comment, 2026-11-27).
