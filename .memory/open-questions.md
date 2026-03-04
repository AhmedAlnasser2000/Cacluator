# Open Questions

- Whether a later version should move part of the symbolic engine into Rust.
- Whether Arabic localization should be added in version 2 or later.
- Whether matrix and vector editing should eventually use fully interactive MathLive matrix templates instead of guided numeric grids.
- Whether the free-form `Equation > Symbolic` branch should later gain optional numeric fallback for equations the symbolic engine cannot solve exactly.
- What the future in-app guidance page should look like: a standalone learn screen, context-aware help drawer, or both.
- What the exact first-release scope should be for the planned `Trigonometry`, `Geometry`, and `Statistics` cores before formal implementation planning starts.
- After the shipped `Trigonometry` pass, whether `Statistics` or `Geometry` should be implemented next and released as a separate milestone or bundled into a larger three-core follow-up.
- After `Geometry` took launcher hotkey `0`, where `Statistics` should land in the launcher and keyboard rollout without reshuffling user-learned hotkeys too aggressively.
- 2026-03-03: If launcher categories eventually outgrow five roots or their submenus become crowded, should the next step be an All Apps fallback, category paging, or deeper nesting?
- 2026-03-03: After the Geometry phase-1 bridge release, when should `Triangles` and `3D Solids` graduate from preview-only guided tools into the shared executable Geometry core?
- 2026-03-04: When Trigonometry and Statistics adopt the same core-mode editor pattern, should history storage move from the current Geometry-specific `geometryScreen` hint to a generic per-mode replay-context field?
- 2026-03-04: After the narrow Calculate trig-angle fix, should later consistency work extend the same explicit-unit behavior to `Table`, inverse trig output units, and mixed-unit direct input without overloading the general calculator?
- 2026-03-04: After the conservative canonical-input and pre-solve planner milestone, should the next symbolic expansion add broader trig rewrites and transcendental solve strategies first, or extend input permissiveness to patterns like `sinx` and other glued function forms?
