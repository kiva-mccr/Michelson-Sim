# _common.py

Shared helper for the Python tests: opens `index.html` in Chromium with the WebGPU/Vulkan/SwiftShader flags, lists the renderers available (`backends`, from `<html data-renderers>`), forces one by reloading with `?renderer=` (`use_renderer`, which also skips the startup speed test), and runs the in-page check table (`run_checks`, used by `verify.py` and `autopick.py`).

## Rules and pitfalls

- A page opened without `?renderer=` runs the startup speed test (MS-18) about a second after the first image and may switch renderer then; tests that need one renderer must force it.
- `MATHJAX_DIR` serves MathJax from a local copy when the CDN is blocked. `GPU_ARGS=0` drops the WebGPU/Vulkan flags on hosts where they lose both GPU contexts; WebGL2 then still runs on SwiftShader (`--enable-unsafe-swiftshader`). On such hosts check WebGPU with `node tests/gpukernel.js`, which runs its kernel alone.
- Use a Playwright version that matches the installed Chromium.
