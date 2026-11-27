# ring-backends.js

The CPU workers (`initWorkers`: Blob workers running the source text of `pixVal`/`avgQ`/`avgQpre` over grid rows) and backend selection (`BACKENDS`, `probeBackends`, `pickBackend`).

## Rules and pitfalls

- There is no renderer control on the page (MS-8). `pickBackend` takes the first that works, writes the available and active renderers to `<html data-renderers data-renderer>` (the tests read them) and the renderer's name to the ? popup on the pattern panel (`rendV`).
- The worker code works in grid units (Nl, k = N/Nl). At Nl = N its expressions equal the main thread's bit for bit; keep them that way.
- Workers skip grid points with u²+v² > `rc2` (sent in the message) and return 0 for them, matching the main thread.
