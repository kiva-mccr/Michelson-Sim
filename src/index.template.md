# index.template.html

The page markup: the three panels (layout C, "hero ring"), the dialogs (equation popups, Method and checks, Sources, Components) and the numbered Sources list [1]–[14]. The CSS and JS are placed at `/*@CSS@*/` and `/*@JS@*/` by `build.py`.

## Rules and pitfalls

- All formulas are LaTeX (MathJax 3.2.2 from jsDelivr), titles included. No equation may need sideways scrolling: put variable definitions on separate lines (`tests/layout.py` checks this).
- Citation links are `href="#sN"`. They open the Sources dialog and highlight entry `sN`, so the entry ids must stay `s1`…`s14`.
- Equations, notes, method and sources are modal `<dialog class="dlg">` elements. Components is the one non-modal dialog.
- Element ids are used by the JS and by the tests (`rendSel`, `verBtn`, `verAt`, `dPlay`, `resV`, `data-p` presets…). Rename them everywhere at once.
