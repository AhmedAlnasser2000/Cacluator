# COMP12A Manual Verification Checklist

## What Is Achieved Now
- Equation symbolic solve can now return exact reduced-carrier periodic families over admitted non-polynomial single-family carriers, not only reduced polynomial carriers.
- Exact reduced-carrier sawtooth closure now works for admitted shifted radical, shifted rational-power, and abs-backed carriers while preserving principal-range and piecewise metadata.
- Existing explicit `x` closure still takes priority when it already exists.
- Mixed poly-rad periodic carriers remain guided instead of widening into mixed-carrier exact search.

## Manual App Steps
1. Open `Equation`, choose `Symbolic`, switch angle unit to `RAD`, and solve `\sin\left(\sqrt{x+1}-2\right)=\frac{1}{2}`.
2. Solve `\arcsin\left(\sin\left(\sqrt{x+1}-2\right)\right)=\frac{1}{2}`.
3. Solve `\sin\left(\left|x-1\right|\right)=\frac{1}{2}`.
4. Solve `\arcsin\left(\sin\left(\left|x-1\right|\right)\right)=\frac{1}{2}`.
5. Solve `\sin\left(x^{\frac{1}{3}}-1\right)=\frac{1}{2}`.
6. Solve `\sin\left(\ln\left(x+1\right)\right)=\frac{1}{2}`.
7. Solve `\sin\left(\sqrt{x+1}+x^{\frac{1}{3}}\right)=\frac{1}{2}`.

## Expected Results
- Steps 1, 3, and 5 return exact periodic families over the reduced carriers instead of guiding to numeric solve.
- Steps 2 and 4 return exact sawtooth families with visible `Principal Range` context and piecewise details.
- Step 6 still prefers an explicit `x` family rather than regressing to reduced-carrier output.
- Step 7 stays unresolved with honest periodic-family guidance instead of fabricating exact mixed-carrier closure.
