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

  it('solves bounded affine trig equations through the shared backend', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\cos\\left(2x-\\frac{\\pi}{3}\\right)=0',
      resolvedLatex: '\\cos\\left(2x-\\frac{\\pi}{3}\\right)=0',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('returns a bounded-support message for equations that need broader trig rewrites', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Rewrite');
    expect(result.solveSummaryText).toContain('double-angle');
  });

  it('solves bounded trig-square equations through split branches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\cos^2\\left(x\\right)=\\frac{1}{4}',
      resolvedLatex: '\\cos^2\\left(x\\right)=\\frac{1}{4}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Rewrite');
    expect(result.solveBadges).toContain('Trig Square Split');
    expect(result.exactLatex).toContain('x\\in');
  });

  it('returns explicit real-domain errors for out-of-range trig squares', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sin^2\\left(x\\right)=2',
      resolvedLatex: '\\sin^2\\left(x\\right)=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('stay between 0 and 1');
    expect(result.solveBadges).toContain('Range Guard');
  });

  it('solves bounded exponential-polynomial families through the guarded shared backend', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'e^{2x}-5e^x+6=0',
      resolvedLatex: 'e^{2x}-5e^x+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.substitutionDiagnostics?.family).toBe('exp-polynomial');
  });

  it('solves bounded log-combine sum families', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
      resolvedLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Log Combine');
    expect(result.substitutionDiagnostics?.family).toBe('log-same-base');
  });

  it('flags recognized mixed-base log families for interval follow-up when exact bounded solve is unavailable', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
      resolvedLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('recognized mixed-base log family');
    expect(result.solveBadges).toContain('Log Base Normalize');
  });

  it('solves zero-target trig sum-to-product equations through the shared rewrite layer', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\cos\\left(4x\\right)-\\cos\\left(2x\\right)=0',
      resolvedLatex: '\\cos\\left(4x\\right)-\\cos\\left(2x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Sum-Product');
  });

  it('returns range-guard errors for impossible bounded equations', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x^2\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.error).toContain('between -1 and 1');
  });

  it('rejects excluded roots after bounded rational normalization', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{x^2-1}{x-1}=0',
      resolvedLatex: '\\frac{x^2-1}{x-1}=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x-1\\ne0']);
  });

  it('clears supported LCDs for bounded rational equations', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
      resolvedLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('LCD Clear');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1\\ne0');
  });

  it('solves broader binomial-denominator rational families after LCD clearing', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
      resolvedLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('0');
    expect(result.resolvedInputLatex).toBe('x^2+x=0');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+1\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
  });

  it('routes non-finite direct symbolic outputs back through guarded rational transforms', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{x^2-1}{x^2-x}=1',
      resolvedLatex: '\\frac{x^2-1}{x^2-x}=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.solveBadges).toContain('LCD Clear');
    expect(result.error).toContain('No real solutions');
  });

  it('solves isolated square-root equations through the guarded algebra stage', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x}=3',
      resolvedLatex: '\\sqrt{x}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=9');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('rejects extraneous roots after bounded radical isolation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+1}=x-1',
      resolvedLatex: '\\sqrt{x+1}=x-1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=3');
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('solves reciprocal square-root equations through bounded radical inversion', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{\\sqrt{x}}=2',
      resolvedLatex: '\\frac{1}{\\sqrt{x}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{4}');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves supported nth-root equations with affine radicands', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt[3]{2x-1}=3',
      resolvedLatex: '\\sqrt[3]{2x-1}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=14');
    expect(result.solveBadges).toContain('Radical Isolation');
  });

  it('recognizes bounded conjugate families without claiming false symbolic success', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{x+\\sqrt{2}}=0',
      resolvedLatex: '\\frac{1}{x+\\sqrt{2}}=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves supported conjugate families when the transformed equation stays bounded', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
      resolvedLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ge0');
  });
});
