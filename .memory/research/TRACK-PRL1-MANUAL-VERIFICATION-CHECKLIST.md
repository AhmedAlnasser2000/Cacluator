# TRACK-PRL1 Manual Verification Checklist

Use this only after the automated gate passes. This is a visual-confidence pass for display behavior, not the primary proof of correctness.

## Settings-driven display
- Open `Settings` and go to `Symbolic Display`.
- Confirm the preview changes live between:
  - `Prefer Roots`
  - `Prefer Powers`
  - `Auto`
- Confirm `Auto` remains power-leaning on the preview for awkward forms.

## Plain familiar roots stay roots
- In `Calculate`, enter `\sqrt{x}` and trigger a harmless exact path that keeps the expression symbolic.
- Confirm the rendered exact result still shows `\sqrt{x}` in:
  - `Auto`
  - `Prefer Powers`
  - `Prefer Roots`

## Awkward root/power forms normalize better
- Check `(\sqrt{x})^{1/3}`:
  - `Prefer Roots` should show a flattened single-root family such as `\sqrt[6]{x}`
  - `Prefer Powers` / `Auto` should show a rational exponent family such as `x^{1/6}`
- Check `(\sqrt{x})^{3}`:
  - `Prefer Roots` should stay on a root-style rendering
  - `Prefer Powers` / `Auto` should show `x^{3/2}`
- Check `\sqrt[3]{\sqrt{x}}` or `\sqrt{x^{1/3}}`:
  - `Prefer Roots` should avoid awkward nested-root display when safe
  - `Prefer Powers` / `Auto` should prefer a rational exponent form

## Raw exact LaTeX stays raw for actions
- With a result that visually changes under PRL1, click `Copy Result`.
- Confirm the copied LaTeX matches the raw engine exact form rather than the display-normalized form.
- Click `To Editor` and confirm the editor receives the raw exact LaTeX path, not the display-normalized variant.

## Light log cleanup
- Enter examples that produce exact log output and confirm:
  - base-`e` displays as `\ln(...)`
  - base-10 displays as `\log(...)`
  - non-10 constant bases still show explicit base notation
