# index.template.html

The page markup: the head, top bar and the three panels (layout C, "hero ring"). The dialogs live in `src/html/` and are placed at their `<!--@INCLUDE name@-->` lines; the CSS and JS at `/*@CSS@*/` and `/*@JS@*/` (all by `build.py`).

## Rules and pitfalls

- All formulas are LaTeX (MathJax 3.2.2 from jsDelivr), titles included. No equation may need sideways scrolling: put variable definitions on separate lines (`tests/layout.py` checks this).
- Citation links are `href="#sN"`. They open the Sources dialog and highlight entry `sN`, so the entry ids must stay `s1`…`s14`.
- Equations, notes, method and sources are modal `<dialog class="dlg">` elements. Components is the one non-modal dialog.
- Element ids are used by the JS and by the tests (`resV`, `rendV`, `infoBtn`, `infoPop`, `verBtn`, `verAt`, `dPlay`, `data-p` presets…). Rename them everywhere at once.
