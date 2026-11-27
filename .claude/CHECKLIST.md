# Checklist before handing a round over

Run through this list before you open or merge a PR.

1. Physics unchanged, or changed on purpose: run `node tests/snapshot.js` on the old and new builds and compare them with `python3 tests/compare_snapshots.py`. Accept a difference only at floating-point noise level, and say so.
2. If you changed `pixVal`, run `node tests/fastpath.js`.
3. Anything new that renders a number or an image has a row in the verification table and a numbered source.
4. `python3 build.py`, then `python3 build.py --check`.
5. Tests pass: `python tests/verify.py`, `python tests/layout.py` (no page scroll and no equation overflow at 1920×1080, 1366×657 and 1280×600), and `python tests/perf.py` after performance work. For a change to text only, run just the tests that cover it.
6. Take screenshots of every changed screen at a small laptop size and at 1920×1080, plus any odd states.
7. No native browser dialogs (alert, confirm). Every number next to a control can be clicked and typed into (`editable()`).
8. Tidy what you touched: dead code, stale comments and names, debug lines, scratch files.
9. Update the note beside every code file you changed (`name.md`), adding any rule or pitfall you learnt.
10. Tick the step in `ROADMAP.md`. Update the README and CLAUDE.md (including Known gaps) in the same commit.
11. Merge the PR once the checks pass, then republish `index.html` to the project artifact (same URL).
12. In the summary, say plainly what was verified and what was only simulated or never seen for real.
