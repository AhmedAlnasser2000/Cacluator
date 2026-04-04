# TRACK-PRL4 Manual Verification Checklist

Use this after the automated gate for a quick visual pass on bounded Equation solves for exponentials, roots, and logs.

## Equation
- `e^(x+1)=e^(3x-5)`
  - `Solve`
  - expected exact result: `x=3`
  - expected solve badges include:
    - `Same-Base Equality`
    - `Candidate Checked`

- `\ln(x+1)=\ln(2x-3)`
  - `Solve`
  - expected exact result: `x=4`
  - expected condition line includes:
    - `x+1>0`
    - `2x-3>0`
  - expected solve badges include:
    - `Same-Base Equality`

- `\ln(x+1)-\ln(x)=\ln(2)`
  - `Solve`
  - expected exact result: `x=1`
  - expected condition line includes:
    - `x+1>0`
    - `x>0`
  - expected solve badges include:
    - `Log Quotient`
    - `Same-Base Equality`

- `\log_{2}(x)+\log_{4}(x)=3`
  - `Solve`
  - expected exact result: `x=4`
  - expected solve badges include:
    - `Log Base Normalize`
    - `Log Combine`
    - `Candidate Checked`

- `\log_{2}(x)+\log_{3}(x)=2`
  - `Solve`
  - expected result: bounded symbolic stop with explicit numeric-guidance messaging
  - expected no fake exact symbolic solution

- `x^{3/2}=8`
  - `Solve`
  - expected exact result: `x=4`
  - expected condition line includes `x\ge0`
  - expected solve badges include:
    - `Power Lift`
    - `Candidate Checked`

- `(2x+1)^{2/3}=5`
  - `Solve`
  - expected exact result: two real solutions
  - expected candidate validation to reject no valid real branch
  - expected solve badges include:
    - `Power Lift`
    - `Candidate Checked`

## Boundary checks
- `\log(x+5)-\log(x)` in `Calculate > Simplify`
  - expected unchanged or bounded unsupported behavior
  - confirms PRL4 did not broaden `Calculate` log algebra beyond Equation

- `\log_{x}(x+1)=2`
  - `Solve`
  - expected unresolved / unsupported behavior
  - confirms variable log bases remain out of scope

## Gate
- Required automated close-out:
  - `npm run test:gate`
