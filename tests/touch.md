# touch.js

Checks the touch controls (MS-22) in an emulated iPhone 13, a 320 px Android and a phone in landscape, with real touch events through the DevTools protocol, so the browser's own scrolling and `touch-action` rules apply. Then checks that a mouse on a 1366×657 desktop still adds a line on press and sees no selection bar.

```
node tests/touch.js [index.html]
```

## Rules and pitfalls

- Touch events go through `Input.dispatchTouchEvent`, not `page.touchscreen`, because only that can hold two fingers (the pinches) and move them.
- A pinch moves two fingers about a centre; the expected ratio is exact (distance doubled → value halved), within 3% for the first move's rounding.
- The selection-bar checks type into the bar like a user (`editable()` opens an input on tap). Use `Control+A` before typing so the old value is replaced.
- Exits 1 if any check fails. Runs on the CPU renderer, since the ring's pixels don't matter here.
