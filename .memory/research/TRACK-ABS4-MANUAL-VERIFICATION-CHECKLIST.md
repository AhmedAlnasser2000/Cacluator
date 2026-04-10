# TRACK-ABS4 Manual Verification Checklist

## What Is Achieved Now
- Bounded exact closure now includes one-placeholder outer-polynomial absolute-value families `P(|u|)=0` on the existing exact polynomial surface.
- The shared abs lane still uses the same bounded `u = \pm v` branch model from `ABS1` through `ABS3`; no nested abs or new branch engine was added.
- Trig and composition-backed abs carriers can now close exactly when each generated abs branch lands in already-shipped periodic/composition sinks.
- Recognized outer-polynomial abs families that still exceed the bounded sink set now stop honestly and preserve branch-aware numeric guidance plus periodic/principal-range metadata when relevant.

## Manual App Steps
1. In `Equation > Symbolic`, solve `|x-1|^2-5|x-1|+6=0`.
2. In `Equation > Symbolic`, solve `2|x^2-1|^2-8|x^2-1|=0`.
3. In `Equation > Symbolic`, solve `|\sqrt{x+1}-2|^2=1`.
4. In `Equation > Symbolic`, solve `|x^{1/3}-1|^2-|x^{1/3}-1|-2=0`.
5. In `Equation > Symbolic`, solve `|sin(x)|=1/2`.
6. In `Equation > Symbolic`, solve `|sin(x^2+x)|=1/2`.
7. In `Equation > Symbolic`, solve `6|sin(x^3+x)|^2-5|sin(x^3+x)|+1=0`.
8. In `Equation > Numeric Solve`, retry `6|sin(x^3+x)|^2-5|sin(x^3+x)|+1=0` on an interval like `[0,1]` in degree mode.

## Expected Results
- `|x-1|^2-5|x-1|+6=0` returns `x \in {-1, 2, 4, 7}` exactly.
- `2|x^2-1|^2-8|x^2-1|=0` returns only the real exact roots from `|x^2-1| \in {0, 4}`.
- `|\sqrt{x+1}-2|^2=1` closes exactly through the existing radical sink and preserves the required domain condition.
- `|x^{1/3}-1|^2-|x^{1/3}-1|-2=0` closes exactly through the existing rational-power sink.
- `|sin(x)|=1/2` closes through the shipped periodic-family lane.
- `|sin(x^2+x)|=1/2` closes through the shipped composition-backed periodic sink while keeping the same abs branch model.
- `6|sin(x^3+x)|^2-5|sin(x^3+x)|+1=0` stays unresolved exactly and reports a bounded outer-polynomial abs stop instead of mixing exact and guided branches.
- Numeric follow-up for `6|sin(x^3+x)|^2-5|sin(x^3+x)|+1=0` keeps branch-aware guidance and surfaces the generated `\sin(x^3+x)=...` branches rather than a generic unsupported-family message.
