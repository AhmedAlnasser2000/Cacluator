# Track C P0 + P1 Manual Verification Checklist

Date: 2026-03-06
Status: PASS (automated parity + targeted Geometry app-path checks)

## P0 Stabilization (Post-Track-R Smoke)

### Achieved Now
- Ran a full regression gate across the current post-Track-R shell before closing this bundle:
  - `npm test -- --run`
  - `npm run build`
  - `npm run lint`
  - `cargo check`
- Fixed Geometry core typing regressions introduced during the new P1 solve-missing wiring.
- Confirmed no cross-mode test regressions in Calculate/Equation/Trigonometry/Geometry/Statistics/Guide/Table/Matrix/Vector/Advanced Calc paths covered by the repo test suite.

### Manual Steps
1. Open each top-level mode once and run one representative action.
Expected:
- No blank-screen, routing, or input-shell regressions.
Pass/Fail: PASS (automated parity coverage via full test/build/lint/cargo gate)

2. In `Equation > Symbolic`, run one solved equation and one unsupported equation.
Expected:
- Solve and error cards still render with expected actions and no runtime errors.
Pass/Fail: PASS (covered by `src/lib/modes/equation.test.ts`, `src/lib/equation/*.test.ts`)

3. In `Trigonometry`, run one function and one equation solve flow.
Expected:
- Shared draft/editor and result rendering remain stable post-refactor.
Pass/Fail: PASS (covered by `src/lib/trigonometry/core.test.ts` and parser/navigation suites)

## P1 Geometry Milestone 1 (Solve Missing `?`)

### Achieved Now
- Added bounded solve-missing request variants to `GeometryRequest`.
- Added strict one-unknown parser behavior for structured and shorthand Geometry requests.
- Added in-scope solve-missing execution for:
  - Formula families: square, circle, cube, sphere, triangle area, rectangle, cylinder.
  - Coordinate families: distance, midpoint, slope.
- Added distance branch behavior:
  - two real branches surfaced with explicit warning
  - repeated-root single result
  - no-real-solution hard stop.
- Added unresolved-but-eligible coordinate handoff behavior through explicit `send -> equation` action.
- Added Geometry workspace template chips to seed canonical solve-missing drafts into the top Geometry editor.

### Manual Steps
1. Run `square(side=?, area=25)` on Geometry square screen.
Expected:
- Solves side, returns standard square outputs.
Pass/Fail: PASS (`src/lib/geometry/core.test.ts`)

2. Run `circle(radius=?, circumference=10*pi)`, `cube(side=?, volume=64)`, `sphere(radius=?, surfaceArea=36*pi)`.
Expected:
- Each solves the missing dimension with valid positive-domain behavior.
Pass/Fail: PASS (`src/lib/geometry/core.test.ts`)

3. Run `triangleArea(base=?, height=6, area=30)`, `rectangle(width=?, height=5, area=40)`, `cylinder(radius=?, height=8, volume=72*pi)`.
Expected:
- Each in-scope family solves correctly; unsupported combinations remain explicit errors.
Pass/Fail: PASS (`src/lib/geometry/core.test.ts`, `src/lib/geometry/parser.test.ts`)

4. Run coordinate requests:
- `distance(p1=(0,0), p2=(3,?), distance=5)`
- `midpoint(p1=(1,2), p2=(?,8), mid=(3,5))`
- `slope(p1=(1,2), p2=(?,8), slope=2)`
Expected:
- Distance returns two branches + warning.
- Midpoint and slope solve single missing coordinate.
Pass/Fail: PASS (`src/lib/geometry/core.test.ts`)

5. Run unresolved coordinate handoff:
- `slope(p1=(?,2), p2=(4,2), slope=0)`
Expected:
- Explicit unresolved message with `Send to Equation` action only for this eligible unresolved case.
Pass/Fail: PASS (`src/lib/geometry/core.test.ts`)

6. Run multi-unknown parser rejection:
- `rectangle(width=?, height=?, area=40)`
Expected:
- Explicit `exactly one ?` parser error.
Pass/Fail: PASS (`src/lib/geometry/parser.test.ts`)

## Evidence
- `npm test -- --run src/lib/geometry/core.test.ts src/lib/geometry/parser.test.ts src/lib/geometry/navigation.test.ts`
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`
