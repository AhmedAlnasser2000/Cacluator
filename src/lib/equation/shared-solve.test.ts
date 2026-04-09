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

  it('solves same-base exponential equalities through bounded reduction', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'e^{x+1}=e^{3x-5}',
      resolvedLatex: 'e^{x+1}=e^{3x-5}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.candidateValues?.[0]).toBeCloseTo(3, 8);
    expect(result.solveBadges).toContain('Same-Base Equality');
    expect(result.substitutionDiagnostics?.family).toBe('same-base-equality');
  });

  it('solves same-base logarithmic equalities with positivity conditions', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
      resolvedLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.candidateValues?.[0]).toBeCloseTo(4, 8);
    expect(result.solveBadges).toContain('Same-Base Equality');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1>0');
    expect(result.exactSupplementLatex?.[0]).toContain('2x-3>0');
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

  it('solves bounded log-quotient families', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(x+1\\right)-\\ln\\left(x\\right)=\\ln\\left(2\\right)',
      resolvedLatex: '\\ln\\left(x+1\\right)-\\ln\\left(x\\right)=\\ln\\left(2\\right)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Log Quotient');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x+1>0');
    expect(supplements).toContain('x>0');
  });

  it('solves bounded mixed-base log equations when coefficients normalize exactly', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3',
      resolvedLatex: '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=4');
    expect(result.solveBadges).toContain('Log Base Normalize');
    expect(result.substitutionDiagnostics?.family).toBe('log-mixed-base-rational');
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
    expect(result.candidateValues).toEqual([-1, 0]);
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

  it('solves bounded two-root same-side equations through sequential radical isolation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+1}+\\sqrt{x}=3',
      resolvedLatex: '\\sqrt{x+1}+\\sqrt{x}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=\\frac{16}{9}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1\\ge0');
  });

  it('solves root-vs-root-plus-affine equations through two bounded radical steps', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+1}=\\sqrt{2x-1}+1',
      resolvedLatex: '\\sqrt{x+1}=\\sqrt{2x-1}+1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.candidateValues?.[0]).toBeCloseTo(5 - 2 * Math.sqrt(5), 8);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(1);
    expect(result.resolvedInputLatex).toBe('2x-1=\\frac{(x-1)^2}{4}');
    expect(result.exactSupplementLatex?.[0]).toContain('2x-1\\ge0');
  });

  it('solves bounded absolute-value follow-ons produced by exact square-root squares', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x+1)^2}=x+3',
      resolvedLatex: '\\sqrt{(x+1)^2}=x+3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-2');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+3\\ge0']);
  });

  it('solves wrapped absolute-value follow-ons produced by exact square-root squares', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x+1)^2}+1=6',
      resolvedLatex: '\\sqrt{(x+1)^2}+1=6',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-6');
    expect(result.exactLatex).toContain('4');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=c families through the shared abs core', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|2x-3\\right|=5',
      resolvedLatex: '\\left|2x-3\\right|=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('4');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=v families with preserved nonnegativity conditions', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x+1\\right|=x+3',
      resolvedLatex: '\\left|x+1\\right|=x+3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-2');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+3\\ge0']);
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=|v| families through exact branch reduction', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|2x-1\\right|=\\left|x+4\\right|',
      resolvedLatex: '\\left|2x-1\\right|=\\left|x+4\\right|',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('5');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves affine-wrapped |u|=v families through the broader shared abs core', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '2\\left|x+1\\right|-3=x',
      resolvedLatex: '2\\left|x+1\\right|-3=x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\frac{-5}{3}');
    expect(result.exactLatex).toContain('1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } \\frac{x}{2}+\\frac{3}{2}\\ge0']);
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves affine-wrapped |u|=|v| families through repeated reuse of the same branch model', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '3\\left|2x-1\\right|+4=\\left|x+5\\right|',
      resolvedLatex: '3\\left|2x-1\\right|+4=\\left|x+5\\right|',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\frac{4}{5}');
    expect(result.exactLatex).toContain('\\frac{2}{7}');
    expect(result.exactSupplementLatex?.[0]).toContain('\\frac{\\vert x+5\\vert}{3}-\\frac{4}{3}\\ge0');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves bounded radical equations that polynomialize into algebraic biquadratic follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^4-5x^2+4}=1',
      resolvedLatex: '\\sqrt{x^4-5x^2+4}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{5}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('solves direct radical equations that hand off into quadratic-carrier polynomial follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x^2+x)^2-(x^2+x)}=1',
      resolvedLatex: '\\sqrt{(x^2+x)^2-(x^2+x)}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.candidateValues).toHaveLength(2);
  });

  it('solves sequential radical families that reach the broader quadratic-carrier bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+x+\\sqrt{5-(x^2+x)}}=2',
      resolvedLatex: '\\sqrt{x^2+x+\\sqrt{5-(x^2+x)}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
  });

  it('solves sequential radical families that hand off into bounded biquadratic exact follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+\\sqrt{5-x^2}}=2',
      resolvedLatex: '\\sqrt{x^2+\\sqrt{5-x^2}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('hands bounded outer-inversion radical carriers into the same algebraic biquadratic follow-on bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{x^4-5x^2+4}\\right)=0',
      resolvedLatex: '\\ln\\left(\\sqrt{x^4-5x^2+4}\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{5}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
  });

  it('hands outer-inversion radical carriers into the shared quadratic-carrier follow-on bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{(x^2+x)^2-5(x^2+x)+4}\\right)=0',
      resolvedLatex: '\\ln\\left(\\sqrt{(x^2+x)^2-5(x^2+x)+4}\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
  });

  it('solves broader even-power affine carrier follow-ons without widening Factor or Simplify', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(2x+1)^4-5(2x+1)^2+4}=1',
      resolvedLatex: '\\sqrt{(2x+1)^4-5(2x+1)^2+4}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves bounded repeated-clearing nested square-root families that close after one extra clear', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
      resolvedLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}-\\frac{\\sqrt{5}}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('uses mixed-carrier factorization incidentally when it feeds bounded square-root factor sinks', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x-5\\sqrt{x}+6=0',
      resolvedLatex: 'x-5\\sqrt{x}+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('4');
    expect(result.exactLatex).toContain('9');
    expect(result.solveSummaryText).toContain('Factored the mixed carrier expression');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('keeps mixed-carrier factorization incidental when no bounded factor sink improves the solve', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x^{4/3}+3x-x^{2/3}-4x^{1/3}+2=0',
      resolvedLatex: 'x^{4/3}+3x-x^{2/3}-4x^{1/3}+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('outside the current exact bounded solve set');
  });

  it('solves bounded repeated-clearing nested carrier families through the shared bounded carrier sink', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+x+\\sqrt{4-(x^2+x)}}=2',
      resolvedLatex: '\\sqrt{x^2+x+\\sqrt{4-(x^2+x)}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing carrier success outcome');
    }
    expect(result.exactLatex).toContain('\\sqrt{13}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
  });

  it('rejects extraneous candidates after repeated-clearing nested radical lifting', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{3-x}}=2',
      resolvedLatex: '\\sqrt{x+\\sqrt{3-x}}=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a repeated-clearing rejection outcome');
    }
    expect(result.error).toContain('No real solutions remain after resolving the bounded carrier roots.');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('rejects invalid absolute-value branches after radical square collapse while keeping valid polynomial branches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x^2-1)^2}=x',
      resolvedLatex: '\\sqrt{(x^2-1)^2}=x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{2}+\\frac{\\sqrt{5}}{2}');
    expect(result.exactLatex).toContain('\\frac{\\sqrt{5}}{2}-\\frac{1}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('stops when a radical solve would exceed the bounded RAD2 transform budget', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+1}=x-1',
      resolvedLatex: '\\sqrt{x+1}=x-1',
      radicalTransformDepth: 2,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a bounded-radical-budget error outcome');
    }
    expect(result.error).toContain('more than two bounded radical transform steps');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+1\\ge0']);
  });

  it('stops when a repeated-clearing path would require a second extra bounded clear', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{x+\\sqrt{x+\\sqrt{x}}}}=1',
      resolvedLatex: '\\sqrt{x+\\sqrt{x+\\sqrt{x+\\sqrt{x}}}}=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a bounded repeated-clearing-budget error outcome');
    }
    expect(result.error).toContain('more than one extra bounded radical clear');
    expect(result.solveBadges).toContain('Radical Isolation');
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
    expect(result.candidateValues?.[0]).toBeCloseTo(14, 8);
    expect(result.solveBadges).toContain('Radical Isolation');
  });

  it('solves bounded rational-power isolation families exactly', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x^{\\frac{3}{2}}=8',
      resolvedLatex: 'x^{\\frac{3}{2}}=8',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=4');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ge0');
  });

  it('keeps bounded radical families outside the algebraic biquadratic bridge on honest guidance', () => {
    const cubicLike = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^3-6x^2+11x-6}=1',
      resolvedLatex: '\\sqrt{x^3-6x^2+11x-6}=1',
    });
    const unsupportedQuartic = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^4+x+1}=2',
      resolvedLatex: '\\sqrt{x^4+x+1}=2',
    });

    expect(cubicLike.kind).toBe('error');
    if (cubicLike.kind !== 'error') {
      throw new Error('Expected a bounded-support error outcome');
    }
    expect(cubicLike.error).toContain('outside the current exact bounded solve set');

    expect(unsupportedQuartic.kind).toBe('error');
    if (unsupportedQuartic.kind !== 'error') {
      throw new Error('Expected a bounded-support error outcome');
    }
    expect(unsupportedQuartic.error).toContain('outside the current exact bounded solve set');
  });

  it('solves bounded two-sided rational-power families with candidate validation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
      resolvedLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.solveBadges).toContain('Power Lift');
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
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+1\\ne0');
  });

  it('solves widened affine-scaled conjugate families when the transformed equation lands in an existing bounded sink', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
      resolvedLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('LCD Clear');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+2\\ne0');
  });

  it('keeps widened two-radical conjugate families honest when they exceed the bounded follow-on budget', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x-1}}=1',
      resolvedLatex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x-1}}=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('more than two bounded radical transform steps');
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves selected three-term reciprocal families by clearing into an existing bounded denominator equation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
      resolvedLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=0');
    expect(result.solveBadges).toContain('LCD Clear');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('\\sqrt{x}+\\sqrt{x+1}+1\\ne0');
    expect(supplements).toContain('x\\ge0');
  });

  it('keeps selected three-term reciprocal families on bounded guidance when the resulting denominator equation still overreaches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
      resolvedLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('outside the current exact bounded solve set');
    expect(result.solveBadges).toContain('LCD Clear');
  });
});
