# ifgmarker.js

Checks the interferogram's δ₀ marker (MS-26). On a 1366×657 desktop with a mouse: the ↔ cursor over the marker, a drag starting away from it moves nothing, a drag on it moves d by exactly the dragged OPD / 2, the drag stops at the window's end or the mirror range, and the window doesn't scroll during a drag. During a 2 s sweep, the marker is inside the plot and at 2d in every sampled frame while the window follows it. The Interferogram marker check row passes. On an emulated iPhone 13 with real touch events: a finger drags the marker, a long-press on it opens no copy menu, a long-press elsewhere on the plot does.

```
node tests/ifgmarker.js [index.html]
```

## Rules and pitfalls

- Each sweep sample calls `renderIfg()` first: the sweep steps d in its own animation frame, so the SVG can be one frame behind the d it reads.
