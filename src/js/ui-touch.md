# ui-touch.js

Touch support shared by the controls: `TOUCH` (the main pointer is coarse), `fat(e)` (hit-radius factor for a finger), the touch wording of the hints (`data-touch`), and `pinch(el,{start,scale,end})`, the two-finger version of scroll-to-zoom.

## Rules and pitfalls

- Runs right after `physics.js`, before every file that uses it.
- Size hit tests by the event's own `pointerType` (`fat(e)`), not by `TOUCH`: a touch laptop has a fine main pointer and fingers too. Size the drawn handles by `TOUCH`, and put it in the plot's cache key.
- `pinch` listens in the capture phase and stops the pinch's events, so the element's one-finger handlers never see the second finger. It does nothing for a mouse or pen.
- A pinch gives the ratio old/new finger distance since the last move (> 1 when the fingers close), so it plugs into the same code as a wheel factor `1.0015^deltaY`. Call `settle()` from `end` where the wheel does.
- An element that can be pinched needs `touch-action:none` (or `pan-y`, then only a sideways pinch is sure to reach it), or the browser zooms or scrolls the page instead and sends `pointercancel`.
- Hint text with a `data-touch` attribute is swapped for that text on touch devices; keep it plain text (no MathJax, no child elements).
- `longPress(el, open, onHandle)` (MS-23): a right-click, or one finger held 500 ms moving less than 10 px, not starting where `onHandle(e)` is true. It never calls `preventDefault` or `stopPropagation` on pointer events. A second finger anywhere cancels it through a document capture listener, because `pinch` swallows the second finger's events on the element. Android sends its own `contextmenu` after a long-press; one within 1.5 s of the timer firing is dropped. `tests/export.js` checks taps, pinches, handles and long-presses on an emulated phone.
