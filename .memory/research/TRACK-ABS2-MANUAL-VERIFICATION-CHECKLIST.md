# Track ABS2 Manual Verification Checklist

## What Is Achieved Now
- Direct affine-wrapped absolute-value equations can now solve through the shared abs core, not only the older top-level `|u|=...` surface.
- Transform-produced wrapped abs follow-ons now reuse the same bounded branch path when a perfect-square radical collapse exposes an absolute-value family.
- Equation numeric follow-up is now more branch-aware for recognized abs families that stay outside exact bounded closure.
- `Calculate > Simplify` keeps the same narrow promise while sharing the broader abs canonicalization/readback core.

## Manual App Steps
1. Open `Equation > Symbolic` and solve `|2x-3|+1=6`.
2. Open `Equation > Symbolic` and solve `2|x+1|-3=x`.
3. Open `Equation > Symbolic` and solve `3|2x-1|+4=|x+5|`.
4. Open `Equation > Symbolic` and solve `\sqrt{(x+1)^2}+1=6`.
5. Open `Equation > Symbolic`, enter `|x^2+1|+1=e^x`, and check the follow-up guidance.
6. Open `Calculate > Simplify` and evaluate `||x+1||`.
7. Open `Calculate > Simplify` and evaluate `\sqrt{x^2+2x+1}`.

## Expected Results
1. `|2x-3|+1=6` returns the exact solutions `x\in\left\{-1,\frac{7}{2}\right\}`.
2. `2|x+1|-3=x` returns the exact solutions `x\in\left\{\frac{1}{3},-5\right\}` and preserves the normalized nonnegativity side condition in grouped supplements.
3. `3|2x-1|+4=|x+5|` returns the exact solutions `x\in\left\{\frac{4}{5},\frac{2}{7}\right\}` with a clean grouped condition showing the normalized comparison side stays nonnegative.
4. `\sqrt{(x+1)^2}+1=6` closes through the transform-produced wrapped abs path and returns `x\in\left\{4,-6\right\}`.
5. `|x^2+1|+1=e^x` stays honest: it is recognized as a bounded abs family for numeric follow-up, but exact closure is not fabricated.
6. `||x+1||` simplifies to `|x+1|`.
7. `\sqrt{x^2+2x+1}` still simplifies to `|x+1|`.
