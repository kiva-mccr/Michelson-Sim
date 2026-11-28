# ui-mirror.js

The mirror rail (`renderRail`, drag, wheel to rescale), the Michelson schematic (`renderMini`, drag M₂), the sweep (`tick`), `ringReadback` for the checks, `probeBackends()` and the ? popup on the pattern panel.

## Rules and pitfalls

- Scrolling on the rail rescales the d range.
- The schematic shows the tilt on the fixed mirror M₁ (500 µrad draws as 10°): αx turns it in the drawing's plane, either way; αy leans it, drawn as a shaded strip of its silvered face below the bar (+αy) or of its dark back above it (−αy), as deep as |αy|. M₂ only slides with d. The physics is unchanged: δ depends only on the tilt between the two mirror images.
- The ? popup stays open while you drag the pattern and closes on ?, Escape or a click outside the panel.
- The sweep (MS-14): one pass from −range to +range takes `SWT` seconds (set in the rail header, default 8 s), so the time per pass stays the same when Auto-fit changes the range. `sweepStep` is the only code that moves d during a sweep; the verification table's Sweep row runs it with uneven frame times, so keep the tick going through it.
- The beam to M₁ (`m1Beam`) has a fixed length: it ends at the pivot dot (`m1p`) on M₁'s face at (100, 54), and M₁ turns about that point. Moving the pivot with the tilt made the beam grow and shrink (Kiva, 2026-11-28). Drawing order: the αy strip (`m1g`, with an opaque backing `m1sB`), then the beam and dot, then the bar (`m1g2`, opaque backing too since its shading is translucent); both groups get the same rotation. So at +αy the beam stays visible across the silvered face up to the bar (hiding it there made the beam vanish at large +αy, Kiva 2026-11-28), and the bar covers the far half of the dot. Everything varies continuously with αy (strip depth 10·|αy|/500, no minimum, fixed label), so passing through αy = 0 doesn't jump.
- A two-finger pinch on the rail rescales the range like the wheel (MS-22). On touch devices the rail is 48 px tall (`style.css`).
