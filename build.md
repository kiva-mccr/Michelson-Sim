# build.py

Builds the single-file `index.html` from `src/`: the template with each `<!--@INCLUDE name@-->` line replaced by `src/html/name`, then `style.css`, then the JS files in `JS_ORDER`, concatenated inside one block scope. Standard library only.

## Rules and pitfalls

- `JS_ORDER` is explicit, so a new JS file must be added to it. The `.md` notes in `src/js/` are never picked up.
- The template must hold exactly one `/*@CSS@*/` and one `/*@JS@*/`. An include line is replaced together with its newline, so a partial must end with its own newline.
- Keep files small (MS-12): when one grows past about 10 KB, split it at a section boundary and check that `index.html` is unchanged byte for byte.
- Run `python3 build.py --check` before publishing. It exits 1 if `index.html` is out of date.
- Never edit `index.html` by hand: the next build overwrites it.
- `ui-touch.js` comes right after `physics.js`: every UI file uses `TOUCH`, `fat` and `pinch` at load time. `plot1d.js` (the 1-D plot helper, MS-25) follows it, ahead of the plots that use it.
