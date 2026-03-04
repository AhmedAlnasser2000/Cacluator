import { describe, expect, it } from 'vitest';
import { matchBoundedTrigEquation } from './equation-match';

describe('matchBoundedTrigEquation', () => {
  it('matches bounded single-function trig equations structurally', () => {
    const matched = matchBoundedTrigEquation('\\sin\\left(2x\\right)=0');
    expect(matched).toEqual({
      kind: 'sin',
      coefficient: 2,
      rhsLatex: '0',
    });
  });

  it('does not guess broader multi-factor trig equations as bounded single-function forms', () => {
    const matched = matchBoundedTrigEquation('\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}');
    expect(matched).toBeNull();
  });
});

