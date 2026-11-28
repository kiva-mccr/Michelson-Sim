# mp4.js

MP4 video without a library (MS-23): `mp4Encoder(w, h, fps)` encodes canvases to H.264 with WebCodecs (`VideoEncoder`) and `mp4File` writes the container (ftyp, moov with one video track in one chunk, mdat). `MP4OK()` says whether the browser can do it; the menu hides Download MP4 where it can't.

## Rules and pitfalls

- Frame i gets timestamp i/fps exactly, so a video whose frames take seconds each to compute still plays at its true speed. Never use MediaRecorder for this: it timestamps by wall-clock time.
- H.264 needs even sizes: the encoder crops the last odd row or column (`w &= ~1`), it never rescales the exact frame.
- Encode with `avc: {format: 'avc'}`: samples are then length-prefixed, as MP4 needs, and the `avcC` box is the encoder's `decoderConfig.description`. The codec string is the first of High 5.1, High 4.0, Main 4.0, Baseline 3.1 that `isConfigSupported` accepts at that size.
- A keyframe every 2 s; the encoder queue is kept at 4 frames or fewer.
- WebCodecs needs a secure context (https or file://), which the artifact is. Checked by decoding the files with ffmpeg and by `tests/export.js` (box layout, frame count, size).
