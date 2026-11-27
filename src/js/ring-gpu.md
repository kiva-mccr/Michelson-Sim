# ring-gpu.js

The two GPU renderers: WebGPU (`initWebGPU`, `gpuDraw`, `gpuRead`) and WebGL2 (`initWebGL2`, `glData`, `glDraw`, `glRead`). Both take the grid size Nl (N at rest) and return a promise that resolves when the GPU has finished.

## Rules and pitfalls

- Both must support readback (`gpuRead`, `glRead`): the "Ring pixels" check reads back the active renderer.
- A lost device or context falls back through `pickBackend`; never leave a renderer stuck busy.
- GL rows run bottom-up: `glRead` flips them to top-down like the other backends.
- `bench` (the startup speed test, MS-18): compute only, skipping the display pass, so the visible canvas is untouched. The output buffer is overwritten, so the caller must render again before a readback.
- `initWebGPU`/`initWebGL2` record the adapter info and the WebGL renderer string (`RB.gpuName`, `RB.glName`) for the speed test's per-device cache key.
