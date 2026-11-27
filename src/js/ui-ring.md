# ui-ring.js

The drag controls on the ring overlay: the tilt dot (`dotPos`, `tiltFromDot`, `glideTilt`), the field-of-view rim and wheel, and keyboard control (`renderOv` draws the overlay).

## Rules and pitfalls

- Controls are dragged, not slid. Only the white dot sets the tilt. It snaps to 0, 0 near the centre and appears on hover at 0, 0. The rim or the scroll wheel sets the field of view.
- The snap glides (MS-9, `glideTilt`): the tilt value itself moves over 300 ms (ease-out; doubled from 150 ms at Kiva's request), so every frame is the true pattern; leaving the snap circle glides back to the cursor, Reset tilt and double-click glide too, and reduced motion jumps. Typing a value or the arrow keys cancel a glide.
