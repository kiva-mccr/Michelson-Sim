# verify.py

Runs the in-page verification table for every preset, with and without tilt, on every available renderer. Exits 1 on any FAIL.

## Rules and pitfalls

- Headless Chrome shows WebGPU canvases as black, but this test still checks WebGPU's numbers through readback.
