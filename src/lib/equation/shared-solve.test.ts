import { describe, expect, it } from 'vitest';
import { runSharedEquationSolve } from './shared-solve';

describe('runSharedEquationSolve', () => {
  const request = {
    originalLatex: '',
    resolvedLatex: '',
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };

  it('solves bounded trig equations through the shared trig backend', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(2x\\right)=0',
      resolvedLatex: '\\sin\\left(2x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x');
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('returns a bounded-support message for equations that need broader trig rewrites', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('trig rewrite');
  });
});

