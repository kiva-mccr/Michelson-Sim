# dialogs-eq.html

The five "Equations and notes" popups (one per panel) and the Components popup. Placed by `build.py` at `<!--@INCLUDE dialogs-eq.html@-->` in the template.

## Rules and pitfalls

- All formulas are LaTeX (MathJax), with no sideways scrolling; the live equations go into the empty `eqS`, `eqP`, `eqI`, `eqO`, `eqC` elements.
- Citation links are `href="#sN"` and open the Sources dialog.
