import { describe, expect, it } from 'vitest';
import { runGuardedEquationSolve } from './guarded-solve';

describe('runGuardedEquationSolve', () => {
  const request = {
    originalLatex: '',
    resolvedLatex: '',
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };

  it('solves supported symbolic substitution families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
      resolvedLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
  });

  it('solves exponential substitution families without hitting recursion depth', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: 'e^{2x}-5e^x+6=0',
      resolvedLatex: 'e^{2x}-5e^x+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('0.693');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('1.098');
    expect(result.substitutionDiagnostics?.family).toBe('exp-polynomial');
  });

  it('solves exponential substitution families written with exp(...) notation', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0',
      resolvedLatex: '\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveBadges).toContain('Inverse Isolation');
  });

  it('solves inverse-isolation linear wrappers around exponentials', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '5e^{x+1}-10=0',
      resolvedLatex: '5e^{x+1}-10=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('-0.306');
    expect(result.substitutionDiagnostics?.family).toBe('inverse-isolation');
  });

  it('solves same-base exponential equalities through bounded substitution before generic symbolic solve', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: 'e^{x+1}=e^{3x-5}',
      resolvedLatex: 'e^{x+1}=e^{3x-5}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBe('x=3');
    expect(result.solveBadges).toContain('Same-Base Equality');
  });

  it('reports preserved domain conditions when a reduced same-base log equality has no valid real solution', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\ln(4x+2)=\\ln(5x+6)',
      resolvedLatex: '\\ln(4x+2)=\\ln(5x+6)',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.error).toContain('preserved domain conditions');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves bounded common-log inverse isolation forms', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\log\\left(x\\right)-1=0',
      resolvedLatex: '2\\log\\left(x\\right)-1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.substitutionDiagnostics?.family).toBe('inverse-isolation');
  });

  it('solves bounded explicit-base log inverse-isolation forms', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\log_{4}\\left(2x+8\\right)=3',
      resolvedLatex: '\\log_{4}\\left(2x+8\\right)=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBe('x=28');
    expect(result.solveBadges).toContain('Inverse Isolation');
  });

  it('solves affine phase-shift trig equations through the direct bounded backend', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x+30\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x+30\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('solves bounded mixed linear same-argument trig equations', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\sin\\left(x\\right)+2\\cos\\left(x\\right)=2',
      resolvedLatex: '2\\sin\\left(x\\right)+2\\cos\\left(x\\right)=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('solves tan-polynomial substitution families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0',
      resolvedLatex: '2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
  });

  it('runs numeric interval solving when an interval is provided', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\cos\\left(x\\right)=x',
      resolvedLatex: '\\cos\\left(x\\right)=x',
      numericInterval: {
        start: '0',
        end: '1',
        subdivisions: 256,
      },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded numeric solve success');
    }
    expect(result.solveBadges).toContain('Numeric Interval');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.approxText).toContain('0.739');
  });

  it('hard-stops impossible real equations before family matching', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x^2\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.error).toContain('between -1 and 1');
  });

  it('hard-stops bounded trig products that cannot reach the target', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x^2\\right)\\cos\\left(x\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)\\cos\\left(x\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.solveSummaryText).toContain('[-1, 1]');
  });

  it('solves bounded log-combination equations through the guarded backend', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
      resolvedLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Log Combine');
    expect(result.substitutionDiagnostics?.family).toBe('log-same-base');
  });

  it('solves bounded log-quotient equations through the guarded backend', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\log_{5}\\left(x+5\\right)-\\log_{5}\\left(x\\right)=1',
      resolvedLatex: '\\log_{5}\\left(x+5\\right)-\\log_{5}\\left(x\\right)=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBe('x=\\frac{5}{4}');
    expect(result.solveBadges).toContain('Log Quotient');
  });

  it('solves bounded mixed-base log equations when change-of-base coefficients stay rational', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\log_{9}\\left(x\\right)-\\log_{3}\\left(x\\right)=-1',
      resolvedLatex: '\\log_{9}\\left(x\\right)-\\log_{3}\\left(x\\right)=-1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBe('x=9');
    expect(result.solveBadges).toContain('Log Base Normalize');
    expect(result.substitutionDiagnostics?.family).toBe('log-mixed-base-rational');
  });

  it('recognizes mixed-base log equations and returns explicit numeric guidance when exact bounded solve is unavailable', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
      resolvedLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.error).toContain('recognized mixed-base log family');
    expect(result.solveBadges).toContain('Log Base Normalize');
    expect(result.substitutionDiagnostics?.family).toBe('log-mixed-base');
  });

  it('solves bounded rational-power equations through the guarded algebra stage', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: 'x^{\\frac{3}{2}}=8',
      resolvedLatex: 'x^{\\frac{3}{2}}=8',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBe('x=4');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('solves zero-target trig sum-to-product families through branch splitting', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(4x\\right)+\\sin\\left(6x\\right)=0',
      resolvedLatex: '\\sin\\left(4x\\right)+\\sin\\left(6x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded sum-to-product success');
    }
    expect(result.solveBadges).toContain('Trig Sum-Product');
  });

  it('returns explicit numeric guidance for unresolved non-zero trig sum-to-product families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(4x\\right)+\\sin\\left(6x\\right)=1',
      resolvedLatex: '\\sin\\left(4x\\right)+\\sin\\left(6x\\right)=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded sum-to-product unresolved error');
    }
    expect(result.error).toContain('recognized trig sum-to-product family');
    expect(result.solveBadges).toContain('Trig Sum-Product');
  });
});
