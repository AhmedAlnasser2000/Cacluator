# Track ALG R5 Manual Verification Checklist

## Achieved Now
- Broader bounded rational solving for one-variable monomial/binomial denominator families.
- Broader bounded square-root solving for one-variable monomial/binomial radicands with safe depth-2 transform chains.
- Supported square-root-binomial conjugate equations can now solve when the transformed equation stays inside the bounded guarded-solve surface.
- Original exclusions and conditions remain visible as the second exact line, and excluded/extraneous roots are filtered against the original equation.

## Optional App Smoke

### 1. Rational LCD clearing over a binomial family
- Steps:
  - Open `Equation > Symbolic`
  - Enter `1/(x^2-1) + 1/(x-1) = 0`
  - Press `Solve`
- Expected:
  - Solves symbolically
  - Exclusions include `x ≠ 1` and `x ≠ -1`
  - No excluded root is reported as a solution

### 2. Rational solve with preserved original exclusions
- Steps:
  - Enter `(x^2-1)/(x^2-x) = 1`
  - Press `Solve`
- Expected:
  - Returns a mathematically honest no-real-solution / controlled failure outcome
  - Exclusions still show the original denominator restrictions

### 3. Two-step square-root solve
- Steps:
  - Enter `√(x+1) + √(x-1) = 4`
  - Press `Solve`
- Expected:
  - Solves symbolically or returns the bounded guarded result produced by the shipped path
  - Any reported roots are valid under back-substitution
  - Conditions remain visible when applicable

### 4. Two-step isolated radical case
- Steps:
  - Enter `√(x+1) = 1 + √(2x-1)`
  - Press `Solve`
- Expected:
  - Uses bounded radical isolation behavior
  - Rejects extraneous roots
  - Keeps domain conditions visible if needed

### 5. Conjugate solve promoted to real symbolic success
- Steps:
  - Enter `1/(√x+1) = 1/2`
  - Press `Solve`
- Expected:
  - Solves to `x = 1`
  - Shows `Conjugate Transform`
  - Shows conditions compatible with `x ≥ 0`

## Pass / Fail Notes
- Pending optional user smoke.

## Evidence Commands
- `npm run test:gate`
