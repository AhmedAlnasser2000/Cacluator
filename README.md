# Calcwiz Desktop

Calcwiz Desktop is a Tauri-based math workspace for textbook-style input, guarded symbolic solving, and mode-specific workflows. It is already much more than a template calculator, while staying honest about its current scope: broad and useful, but still intentionally bounded rather than full CAS parity.

## Platform direction

Version 1 is now Linux-first for development and release sequencing. The project still preserves cross-platform ground through Tauri, React/TypeScript, Rust, and repo-owned validation so Windows and macOS remain viable targets rather than abandoned platforms.

## Why try it

- Desktop-first workflow with dedicated math workspaces instead of one overloaded input box
- Textbook-style math entry and rendering via MathLive
- Exact-first result handling, with clear approximate output, warnings, and condition/exclusion lines when needed
- Direct entry and guided builders living side by side
- Active, repo-owned validation with unit, UI, browser-smoke, lint, and Rust checks

## Current capabilities

These are grounded in the repository today.

### Core workspaces

- **Calculate**
  - Evaluate expressions
  - Simplify, factor, and expand
  - Build and run core calculus workflows such as integrals and limits
- **Equation**
  - Solve symbolic equations in `x`
  - Solve guided quadratic, cubic, and quartic equations
  - Solve 2x2 and 3x3 linear systems
  - Use explicit interval-based numeric solving when symbolic solving stops short
  - Handle bounded rational and radical equation families with exclusions/conditions
- **Advanced Calc**
  - Advanced integral and limit workflows
  - Taylor and Maclaurin series workflows
  - First-order partial derivatives
  - ODE workflows, including numeric IVP handling
- **Trigonometry**
  - Trig function evaluation
  - Bounded identity simplify/convert tools
  - Trig equation solving
  - Triangle-solving tools
  - Angle conversion and special-angle support
- **Geometry**
  - 2D shapes, 3D solids, triangles, circles, and coordinate geometry
  - Solve-for-missing workflows with explicit unknown markers
- **Statistics**
  - Dataset and frequency-table workflows
  - Descriptive statistics and frequency summaries
  - Binomial, normal, and Poisson workflows
  - One-sample mean inference
  - Regression and correlation with quality summaries
- **Matrix / Vector / Table**
  - Numeric matrix and vector operations
  - Notation pads for structured reuse
  - Function table generation
- **Guide**
  - In-app help, examples, and mode-specific guidance

## What already feels strong

- **Math-input UX**
  - The app is built around textbook-style input rather than plain text math commands.
- **Mode fidelity**
  - `Calculate` evaluates expressions.
  - `Equation` owns solving.
  - Geometry, Trigonometry, and Statistics keep their own guided workflows instead of collapsing back into one generic screen.
- **Guarded solving**
  - Symbolic solving is preferred when available.
  - Numeric solving is explicit rather than silently replacing exact work.
  - Domain conditions and exclusions are surfaced instead of hidden.
- **Shared workspace pattern**
  - Several domains use one top executable editor plus guided builders below it, which makes the app feel coherent instead of stitched together.

## Why this project is different

Calcwiz is not trying to be a thin shell around one expression engine. The repo already shows a more deliberate product direction:

- multiple math domains with dedicated workspaces
- explicit separation between exact and approximate results
- guided, typed workflows for geometry, trigonometry, and statistics
- an app-owned symbolic layer that supplements external symbolic tooling instead of pretending the external engine is the entire product
- browser-first automation and repo-level validation as part of the development workflow

The result is a project that already feels like a serious math workbench, not just a Vite starter with calculator buttons attached.

## Tech stack / architecture snapshot

- **Frontend:** React 19 + TypeScript + Vite
- **Desktop shell:** Tauri 2
- **Math input/rendering:** MathLive
- **Symbolic layer:** Compute Engine plus app-owned symbolic and solve modules
- **Validation:** Vitest, Testing Library, Playwright, ESLint, `cargo check`

Architecture at a glance:

- `src/App.tsx` -> import shell
- `src/AppMain.tsx` -> runtime shell and orchestration
- `src/app/*` -> UI components, workspace views, and routing helpers
- `src/lib/modes/*` -> mode runners for Calculate, Equation, Matrix, Table, and Vector
- `src/lib/equation/*` -> guarded solving pipeline and equation logic
- `src/lib/symbolic-engine/*` -> app-owned symbolic normalization and rule layers
- `src/lib/{trigonometry,geometry,statistics,advanced-calc}/*` -> domain cores
- `src-tauri/*` -> desktop shell and Rust-side integration
- `e2e/*` -> browser smoke coverage
- `docs/*` -> milestone guides, validation notes, and project summaries

## Project structure overview

```text
.
├─ src/
│  ├─ App.tsx
│  ├─ AppMain.tsx
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  ├─ styles/
│  ├─ test/
│  └─ types/
├─ src-tauri/
├─ e2e/
├─ docs/
└─ tools/
```

## Getting started

### Prerequisites

- Node.js
- npm
- Rust toolchain
- Tauri system prerequisites for your platform

If you are setting up Tauri for the first time, use the official prerequisites guide:
- https://tauri.app/start/prerequisites/

### Install

```bash
npm install
```

### Run in browser dev mode

```bash
npm run dev
```

### Run the desktop app in development

```bash
npm run tauri:dev
```

### Build

```bash
npm run build
npm run tauri:build
```

## Validation / testing

The repo already includes multiple validation layers.

```bash
npm run test:unit
npm run test:ui
npm run test:e2e
npm run test:gate
```

`npm run test:gate` is the strongest single command. It runs:

- unit and contract tests
- jsdom-based UI integration tests
- browser smoke tests
- lint
- `cargo check`

## In active development

Calcwiz is real software today, but it is still actively expanding.

Current boundaries worth stating clearly:

- It is **not** claiming full Mathematica / Maple / industrial-grade CAS parity.
- Symbolic coverage is intentionally **bounded** and explicit.
- Matrix and Vector modes are numeric workspaces with notation pads, not full free-form symbolic matrix CAS.
- Browser-first automation is in place; desktop-shell-specific automation is still lighter than browser coverage.
- Some advanced algebra and solver families are present, but broader general-purpose CAS behavior is still under active development.

## Screenshots / demo

No checked-in screenshots or GIFs are included yet.

If you want to strengthen the GitHub landing page later, a practical set would be:

- `docs/github-assets/calculate-workspace.png`
- `docs/github-assets/equation-symbolic.png`
- `docs/github-assets/trigonometry-geometry-statistics.png`
- `docs/github-assets/demo.gif`

Recommended subjects:

- Calculate workspace with textbook-style input
- Equation workspace showing exact result plus exclusions/conditions
- A guided domain workspace such as Geometry or Statistics
- A short GIF showing launcher -> workspace -> result flow

## Contributing

Contributions are welcome, especially in:

- math correctness
- symbolic/numeric edge cases
- UI clarity and result presentation
- browser/UI automation coverage
- documentation and examples

If you want to contribute:

1. inspect the relevant domain in `src/lib/*`
2. keep claims and docs aligned with what is actually implemented
3. run the validation gate before opening a PR

```bash
npm run test:gate
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
