# build.py

Builds the single-file `index.html` from `src/`: the template, then `style.css`, then the JS files in `JS_ORDER`, concatenated inside one block scope. Standard library only.

## Rules and pitfalls

- `JS_ORDER` is explicit, so a new JS file must be added to it. The `.md` notes in `src/js/` are never picked up.
- The template must hold exactly one `/*@CSS@*/` and one `/*@JS@*/`.
- Run `python3 build.py --check` before publishing. It exits 1 if `index.html` is out of date.
- Never edit `index.html` by hand: the next build overwrites it.
