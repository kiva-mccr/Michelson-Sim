# ui-table.js

The components table (`table`), the auto ranges (`settleOPD`, `fitRange`, `autoR`, the interferogram and interfered-spectrum zoom), and the presets.

## Rules and pitfalls

- `settle()` renders the at-rest frame 200 ms after the last wheel notch; every wheel control (rail, ring, interferogram, interfered spectrum) uses it.
- `d`, `fov`, `tx` and `ty` live in hidden inputs. Only scripts change them; a `change` event on one (the tests send it) redraws at rest.
- The auto ranges are definitions, not physics, and are described in the Method dialog (section 5). Change both together.
- `setComp(c,k,v)` is the one place a typed wavelength, height or FWHM (nm) becomes σ, a, f; the table and the selection bar both use it. `delComp(i)` (in `plots-spectrum.js`) removes a component everywhere.
- The selection bar (MS-22, `selBar`, `#selBar`): the selected component's λ, height and FWHM as `editable()` numbers plus Delete. It shows in the stacked layout and on touch devices, and is hidden in the one-screen layout with a fine pointer (`style.css`), so the 16:9 layout is unchanged.
- Pinch (MS-22) on the interferogram and the interfered spectrum mirrors their wheels. Read the current value before changing the Auto-fit box (`RANGE()` switches source with it), and scale the interfered spectrum's current window `outWin()`, not `OG`, which lags until the next frame is drawn.
