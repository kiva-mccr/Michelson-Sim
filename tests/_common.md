# _common.py

Shared helper for the Python tests: opens `index.html` in Chromium with the WebGPU/Vulkan/SwiftShader flags and lists the renderers available.

## Rules and pitfalls

- `MATHJAX_DIR` serves MathJax from a local copy when the CDN is blocked. `GPU_ARGS=0` drops the GPU flags on hosts where they lose both GPU contexts.
- Use a Playwright version that matches the installed Chromium.
