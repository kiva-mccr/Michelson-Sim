# _common.py

Shared helper for the Python tests: opens `index.html` in Chromium with the WebGPU/Vulkan/SwiftShader flags lists the renderers available (`backends`, from `<html data-renderers>`) and forces one by reloading with `?renderer=` (`use_renderer`).

## Rules and pitfalls

- `MATHJAX_DIR` serves MathJax from a local copy when the CDN is blocked. `GPU_ARGS=0` drops the WebGPU/Vulkan flags on hosts where they lose both GPU contexts; WebGL2 then still runs on SwiftShader (`--enable-unsafe-swiftshader`). On such hosts check WebGPU with `node tests/gpukernel.js`, which runs its kernel alone.
- Use a Playwright version that matches the installed Chromium.
