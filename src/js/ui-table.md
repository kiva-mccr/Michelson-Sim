# ui-table.js

The components table (`table`), the auto ranges (`settleOPD`, `fitRange`, `autoR`, the interferogram and interfered-spectrum zoom), and the presets.

## Rules and pitfalls

- `settle()` renders the at-rest frame 200 ms after the last wheel notch; every wheel control (rail, ring, interferogram, interfered spectrum) uses it.
- `d`, `fov`, `tx` and `ty` live in hidden inputs. Only scripts change them; a `change` event on one (the tests send it) redraws at rest.
- The auto ranges are definitions, not physics, and are described in the Method dialog (section 5). Change both together.
