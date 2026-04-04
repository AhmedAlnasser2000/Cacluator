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

  it('reports meaningful real-domain wording when a reduced same-base log equality has no valid real solution', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\ln(4x+2)=\\ln(5x+6)',
      resolvedLatex: '\\ln(4x+2)=\\ln(5x+6)',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.error).toContain('undefined in the real domain');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('keeps decimal-only symbolic roots as approximate output after same-base equality reduction', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\log(x^2+9x-5)=\\log(8x+\\ln 4)',
      resolvedLatex: '\\log(x^2+9x-5)=\\log(8x+\\ln 4)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.exactLatex).toBeUndefined();
    expect(result.approxText).toContain('2.076101');
    expect(result.solveBadges).toContain('Same-Base Equality');
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
      angleUnit: 'rad',
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

  it('respects the selected angle unit in Equation numeric interval solving', () => {
    const degreeResult = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      numericInterval: {
        start: '20',
        end: '40',
        subdivisions: 256,
      },
    });

    expect(degreeResult.kind).toBe('success');
    if (degreeResult.kind !== 'success') {
      throw new Error('Expected guarded numeric solve success');
    }
    expect(degreeResult.approxText).toContain('30');

    const gradResult = runGuardedEquationSolve({
      ...request,
      angleUnit: 'grad',
      originalLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      numericInterval: {
        start: '30',
        end: '40',
        subdivisions: 256,
      },
    });

    expect(gradResult.kind).toBe('success');
    if (gradResult.kind !== 'success') {
      throw new Error('Expected guarded numeric solve success');
    }
    expect(gradResult.approxText).toContain('33.333');
  });

  it('lets explicit numeric interval solving bypass unresolved composition guidance when a valid interval is provided', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      resolvedLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      numericInterval: {
        start: '1',
        end: '2',
        subdivisions: 512,
      },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded numeric solve success');
    }
    expect(result.solveBadges).toContain('Numeric Interval');
    expect(result.approxText).toContain('1.19328');
  });

  it('returns unit-aware interval guidance when Equation numeric solve misses a tan-log branch in degree mode', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      resolvedLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      numericInterval: {
        start: '0',
        end: '10',
        subdivisions: 512,
      },
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded numeric solve guidance');
    }
    expect(result.solveBadges).toContain('Numeric Interval');
    expect(result.error).toContain('ln(x+1) stays about in');
    expect(result.error).toContain('45 deg + 180 deg * k');
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

  it('solves logarithmic compositions through one bounded outer inversion handoff', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\ln\\left(x^2+1\\right)=3',
      resolvedLatex: '\\ln\\left(x^2+1\\right)=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.exactLatex ?? '').toContain('\\sqrt');
  });

  it('solves nested root-log compositions through bounded recursive handoff', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sqrt{\\ln\\left(x+1\\right)}=2',
      resolvedLatex: '\\sqrt{\\ln\\left(x+1\\right)}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded nested composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.exactLatex).toBe('x=\\exponentialE^{4}-1');
  });

  it('solves exponential compositions before the direct inverse-isolation stage', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: 'e^{x^2-1}=5',
      resolvedLatex: 'e^{x^2-1}=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded exponential composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.exactLatex).toBeUndefined();
    expect(result.approxText ?? '').toContain('1.615');
  });

  it('solves bounded explicit-base log compositions with a nonlinear inner carrier', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\log_{3}\\left((x+1)^2\\right)=2',
      resolvedLatex: '\\log_{3}\\left((x+1)^2\\right)=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded explicit-base composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves two-step bounded non-periodic composition chains', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sqrt{\\log_{3}\\left((x+1)^2\\right)}=2',
      resolvedLatex: '\\sqrt{\\log_{3}\\left((x+1)^2\\right)}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded two-step composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('8');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('-10');
  });

  it('hands off inverted composition chains into the bounded trig solver', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
      resolvedLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded trig-handoff composition success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.periodicFamily?.branchesLatex[0]).toContain('2\\pi k');
    expect(result.exactLatex ?? '').toContain('\\frac{\\pi}{2}');
  });

  it('hands off inverted composition chains into bounded PRL power-lift solving', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sqrt{\\left(x+1\\right)^{\\frac{2}{3}}}=3',
      resolvedLatex: '\\sqrt{\\left(x+1\\right)^{\\frac{2}{3}}}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded PRL handoff composition success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('26');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('-28');
  });

  it('proves impossible nested trig compositions from the bounded inner image', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=1',
      resolvedLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected impossible composition error');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.error).toContain('inner image');
  });

  it('branches into a finite trig family when the proven inner image leaves finitely many admissible inverses', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected finite trig composition branch success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.periodicFamily?.branchesLatex.join(' ')).toContain('\\arccos');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns explicit numeric guidance for recognized composition families with unsupported inverse branching', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(x^2\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x^2\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected unresolved composition guidance');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.error).toContain('recognized periodic family');
    expect(result.exactLatex ?? '').toContain('x^2');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('solves bounded tan composition families as explicit periodic branch families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      resolvedLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected periodic tan composition success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('\\exp');
    expect(result.exactLatex ?? '').toContain('\\pi k');
    expect(result.periodicFamily?.suggestedIntervals?.[0]?.start).toContain('0.');
  });

  it('solves positive-exponential periodic follow-on families when the downstream exact handoff stays bounded', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(e^x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(e^x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected periodic exponential follow-on success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('\\ln');
    expect(result.exactSupplementLatex?.join(' ') ?? '').toContain('Branch conditions');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('formats periodic branch families in the selected non-radian unit', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
      resolvedLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected degree-mode periodic family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('360k+90');
    expect(result.periodicFamily?.representatives?.[0]?.exactLatex ?? '').toContain('90');
  });

  it('stops with explicit numeric guidance when a composition would exceed the two-step inversion cap', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
      resolvedLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected composition depth-cap guidance');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.error).toContain('two-step outer-inversion limit');
  });
});
