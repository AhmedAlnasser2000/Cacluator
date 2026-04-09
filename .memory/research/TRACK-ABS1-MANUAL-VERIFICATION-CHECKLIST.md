# ABS1 Manual Verification Checklist

## What Is Achieved Now
- Direct bounded absolute-value equalities now solve symbolically through one shared abs core:
  - `|u| = c`
  - `|u| = v`
  - `|u| = |v|`
- Transform-produced abs follow-ons such as `\sqrt{(u)^2}` now reuse the same bounded branch logic instead of a narrow radical-only special case.
- `Calculate > Simplify` keeps current square-root-to-abs wins and adds bounded direct abs normalization without widening `Factor`.
- Equation numeric interval guidance is more abs-aware for recognized direct abs families that miss exact bounded closure.

## Manual App Steps
1. In `Equation > Symbolic`, solve `|2x-3|=5`.
2. In `Equation > Symbolic`, solve `|x+1|=x+3`.
3. In `Equation > Symbolic`, solve `|2x-1|=|x+4|`.
4. In `Equation > Symbolic`, solve `\sqrt{(x+1)^2}=x+3`.
5. In `Calculate > Simplify`, enter `\sqrt{x^2}`.
6. In `Calculate > Simplify`, enter `\sqrt{x^2+2x+1}`.
7. In `Calculate > Simplify`, enter `|x|^2`.
8. In `Equation > Symbolic`, enter `|x+1|=e^x` and inspect the follow-up guidance.

## Expected Results
- `|2x-3|=5` returns the two affine exact branches with clean grouped supplements.
- `|x+1|=x+3` solves through bounded branches and keeps any branch conditions honest.
- `|2x-1|=|x+4|` reduces to the two branch equalities and validates the surviving solutions against the original equation.
- `\sqrt{(x+1)^2}=x+3` closes through the shared abs follow-on instead of behaving like a radical-only special case.
- `\sqrt{x^2}` simplifies to `|x|`.
- `\sqrt{x^2+2x+1}` simplifies to `|x+1|`.
- `|x|^2` simplifies to `x^2`.
- `|x+1|=e^x` stays outside the exact bounded set but gives more specific follow-up messaging than a generic unsupported-family stop.
