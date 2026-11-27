# _common.py and _common.js

`_common.py` is the shared helper for the Python tests: opens `index.html` in Chromium with the WebGPU/Vulkan/SwiftShader flags, lists the renderers available (`backends`, from `<html data-renderers>`), forces one by reloading with `?renderer=` (`use_renderer`, which also skips the startup speed test), and runs the in-page check table (`run_checks`, used by `verify.py` and `autopick.py`).

## Rules and pitfalls

- A page opened without `?renderer=` runs the startup speed test (MS-18) about a second after the first image and may switch renderer then; tests that need one renderer must force it.
- `MATHJAX_DIR` serves MathJax from a local copy when the CDN is blocked. `GPU_ARGS=0` drops the WebGPU/Vulkan flags on hosts where they lose both GPU contexts; WebGL2 then still runs on SwiftShader (`--enable-unsafe-swiftshader`). On such hosts check WebGPU with `node tests/gpukernel.js`, which runs its kernel alone.
- Use a Playwright version that matches the installed Chromium.

## _common.js (the Node tests)

- `hookPage(name, hook)` inserts a test's hook script before the end of `ui-loop.js` in `index.html` (or the file given as the first argument) and writes it to a temporary file named after the test and the process id; it returns the page's `url` and `done()`, which deletes the file.
- `routeMathJax(ctx)` serves MathJax from `MATHJAX_DIR` or blocks the CDN. `SWIFTSHADER` and `GPU` are the launch flags (`GPU` drops the WebGPU/Vulkan flags when `GPU_ARGS=0`, as `_common.py` does).
