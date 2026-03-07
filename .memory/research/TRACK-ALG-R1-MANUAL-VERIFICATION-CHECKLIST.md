# Track ALG-R1 Manual Verification Checklist

## Achieved Now
- `Calculate > Simplify` combines supported exact rational expressions into a single exact fraction.
- `Calculate > Factor` factors supported rational numerators and denominators separately without auto-cancelling common factors.
- `Equation > Symbolic` normalizes supported rational structure before solve and keeps denominator exclusions visible as a second exact line.
- Excluded denominator roots are filtered from finite direct symbolic solutions.

## App Steps
1. In `Calculate`, enter `\frac{1}{3}+\frac{1}{6x}` and press `Simplify`.
Expected:
- exact result is `\frac{2x+1}{6x}`
- second exact line shows `Exclusions: x \ne 0`

Pass/Fail Notes:
- 

2. In `Calculate`, enter `\frac{1}{x+1}+\frac{1}{x-1}` and press `Simplify`.
Expected:
- exact result is one fraction, not two separate addends
- second exact line shows both exclusions `x-1 \ne 0` and `x+1 \ne 0`

Pass/Fail Notes:
- 

3. In `Calculate`, enter `\frac{x^2-1}{x^2-x}` and press `Factor`.
Expected:
- result shows factored numerator and denominator separately
- common `(x-1)` is not cancelled in `Factor`
- second exact line shows exclusions for `x` and `x-1`

Pass/Fail Notes:
- 

4. In `Equation > Symbolic`, enter `\frac{1}{3}+\frac{1}{6x}=1` and solve.
Expected:
- solution is `x=\frac{1}{4}`
- resolved form shows the normalized rational equation
- second exact line shows `Exclusions: x \ne 0`

Pass/Fail Notes:
- 

5. In `Equation > Symbolic`, enter `\frac{x^2-1}{x-1}=0` and solve.
Expected:
- result keeps `x=-1`
- excluded root `x=1` is not returned
- second exact line shows `Exclusions: x-1 \ne 0`

Pass/Fail Notes:
- 

6. In `Equation > Symbolic`, enter `\frac{x}{x-1}=0` and solve.
Expected:
- result is `x=0`
- second exact line shows `Exclusions: x-1 \ne 0`

Pass/Fail Notes:
- 

7. In `Calculate`, enter `\frac{1}{x}+\frac{1}{y}` and press `Simplify`.
Expected:
- bounded rational engine does not claim multivariable support
- result falls back to current generic behavior rather than a false exact combined fraction

Pass/Fail Notes:
- 

## Evidence Commands
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`
