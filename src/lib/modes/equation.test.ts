import { describe, expect, it } from 'vitest';
import { runEquationAlgebraTransform, runEquationMode } from './equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest() {
  return {
    equationLatex: 'x^2-5x+6=0',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };
}

describe('runEquationMode', () => {
  it('solves symbolic equations in x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '5x+6=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\frac');
    expect(result.approxText).toContain('x ~=');
  });

  it('rejects non-equation symbolic input', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Enter an equation containing x.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'planner-hard-stop',
      source: 'planner',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('rejects equations without x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2=4',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Equation mode solves for x. Enter x in the equation.');
  });

  it('keeps symbolic mode symbolic-only for complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported symbolic solve families for this milestone.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('returns a controlled error for inequality relations in symbolic mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ge2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('only = equations');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('attaches a shared range-guard stop reason when the guarded backend proves impossibility', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(x\\right)=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'range-guard',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'range-guard',
    });
  });

  it('marks successful symbolic equation solves as manual-only for numeric follow-up', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '5x+6=3',
    });

    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'manual-only',
    });
  });

  it('marks recognized abs families outside the bounded exact set as numeric-follow-up eligible', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x+1\\right|=e^x',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('absolute-value family is outside the current exact bounded solve set');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'host',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('keeps wrapped recognized abs families numeric-follow-up eligible when a branch falls outside the bounded exact sinks', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^2+1\\right|+1=e^x',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('stronger absolute-value carrier family is outside the current exact bounded solve set');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'host',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('solves stronger polynomial, radical, and rational-power abs carriers through the shared symbolic backend', () => {
    const polynomial = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^2+x-2\\right|=3',
    });
    const radical = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|\\sqrt{x+1}-2\\right|=1',
    });
    const rationalPower = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^{\\frac{1}{3}}-1\\right|=2',
    });

    expect(polynomial.kind).toBe('success');
    if (polynomial.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(polynomial.exactLatex).toMatch(/(\\sqrt\{21\}|21\^\{1\/2\})/);

    expect(radical.kind).toBe('success');
    if (radical.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(radical.exactLatex).toContain('8');
    expect(radical.exactLatex).toContain('0');

    expect(rationalPower.kind).toBe('success');
    if (rationalPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rationalPower.exactLatex).toContain('27');
    expect(rationalPower.exactLatex).toContain('-1');
  });

  it('solves outer-polynomial abs families through the shared symbolic backend', () => {
    const polynomial = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0',
    });
    const composition = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|\\sin\\left(x^2+x\\right)\\right|^2=\\frac{1}{4}',
    });

    expect(polynomial.kind).toBe('success');
    if (polynomial.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(polynomial.exactLatex).toContain('-2');
    expect(polynomial.exactLatex).toContain('4');

    expect(composition.kind).toBe('success');
    if (composition.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(composition.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(0);
  });

  it('returns exact reduced-carrier results for outer-polynomial composition-backed abs families when every generated branch stays exact', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '6\\left|\\sin\\left(x^3+x\\right)\\right|^2-5\\left|\\sin\\left(x^3+x\\right)\\right|+1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex ?? '').toContain('x^3+x');
    expect(result.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(1);
  });

  it('returns exact reduced-carrier composition families for shifted radical carriers after COMP12A', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\arcsin\\left(\\sin\\left(\\sqrt{x+1}-2\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
  });

  it('keeps explicit-x composition closure when sin(ln(x+1))=1/2 can still solve back to x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.periodicFamily?.carrierLatex).toBe('x');
    expect(result.exactLatex ?? '').not.toContain('\\ln\\left(x+1\\right)');
  });

  it('solves linear 2x2 systems', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      equationLatex: '',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=1');
    expect(result.exactLatex).toContain('y=2');
  });

  it('uses symbolic results for guided quadratic equations when available', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('falls back numerically for guided quadratic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('-1 - i');
    expect(result.approxText).toContain('-1 + i');
    expect(result.warnings).toContain('Symbolic solve unavailable; showing numeric roots.');
  });

  it('solves cubic coefficient entry symbolically', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'cubic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('solves quartic coefficient entry symbolically through the bounded factor-first path', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
  });

  it('falls back numerically for guided quartic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
      quarticCoefficients: [5, -6, 5, 4, 1],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('0.870267 - 1.036465i');
    expect(result.approxText).toContain('-0.270267 + 0.190128i');
  });

  it('rejects a zero leading quadratic coefficient', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [0, 2, 1],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('non-zero');
  });

  it('reduces embedded derivatives before solving for x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '12+\\frac{d}{dx}(5x)+6x=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('-2');
    const normalized = result.resolvedInputLatex?.replaceAll(' ', '') ?? '';
    expect(normalized).toContain('6x');
    expect(normalized).toContain('17');
    expect(normalized).toContain('=5');
    expect(result.plannerBadges).toContain('Reduced Derivative');
  });

  it('solves supported free-form cubic polynomial equations exactly', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3-6x^2+11x-6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('keeps unsupported free-form quartic polynomial equations on the current symbolic-only error path', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^4+x+1=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported symbolic solve families for this milestone.');
  });

  it('uses the shared bounded trig backend for symbolic trig equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(2x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('solves selected trig rewrite families from Equation mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Rewrite');
    expect(result.solveSummaryText).toContain('double-angle');
  });

  it('normalizes bounded rational equations before solving and carries exclusions', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{3}+\\frac{1}{6x}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{4}');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
    expect(result.resolvedInputLatex).toBe('\\frac{2x+1}{6x}=1');
  });

  it('keeps denominator exclusions when solving rational-zero equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{x^2-1}{x-1}=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x-1\\ne0']);
    expect(result.resolvedInputLatex).toBe('x+1=0');
  });

  it('carries radical domain conditions through symbolic solve prep', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('x\\ne0');
  });

  it('preserves radical denominator conditions on unresolved symbolic equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x+\\sqrt{2}}=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x+\\sqrt{2}\\ne0']);
  });

  it('solves bounded rational equations by clearing the LCD before guarded recursion', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('LCD Clear');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1\\ne0');
  });

  it('solves affine-radicand equations through bounded radical isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+1}=x-1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=3');
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('solves broader root-vs-root-plus-affine families through RAD2 sequential isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+1}=\\sqrt{2x-1}+1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\sqrt');
    expect(result.candidateValues?.[0]).toBeCloseTo(5 - 2 * Math.sqrt(5), 8);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.rejectedCandidateCount).toBe(1);
    expect(result.resolvedInputLatex).toBe('2x-1=\\frac{(x-1)^2}{4}');
    expect(result.exactSupplementLatex?.[0]).toContain('2x-1\\ge0');
  });

  it('uses mixed-carrier factorization incidentally for bounded symbolic square-root factor families', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x-5\\sqrt{x}+6=0',
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

  it('solves exact square-root-square families through bounded absolute-value follow-on solving', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{(x+1)^2}=x+3',
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

  it('solves bounded repeated-clearing nested radical families through the guarded equation runtime', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}-\\frac{\\sqrt{5}}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('preprocesses fractional-power and explicit-base-log notation into existing solver families', () => {
    const rootCarrier = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^{1/2}=3',
    });
    const logCarrier = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log_{e}(2x+1)=3',
    });

    expect(rootCarrier.kind).toBe('success');
    if (rootCarrier.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rootCarrier.exactLatex).toBe('x=9');
    expect(rootCarrier.resolvedInputLatex).toBe('\\sqrt{x}=3');

    expect(logCarrier.kind).toBe('success');
    if (logCarrier.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(logCarrier.exactLatex).toContain('x=');
    expect(logCarrier.exactLatex).toContain('\\exponentialE^{3}');
    expect(logCarrier.resultOrigin).toBe('symbolic');
    expect(logCarrier.resolvedInputLatex).toBe('\\ln(2x+1)=3');
  });

  it('keeps decimal-only symbolic equation roots out of the exact line while preserving the approximation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log(x^2+9x-5)=\\log(8x+\\ln 4)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toBeUndefined();
    expect(result.approxText).toContain('x ~=');
    expect(result.approxText).toContain('2.076101');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+9x-5>0');
    expect(result.exactSupplementLatex?.[0]).toContain('8x+\\ln(4)>0');
  });

  it('solves new PRL4 same-base and mixed-base log families exactly in symbolic mode', () => {
    const sameBase = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
    });
    const mixedBase = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3',
    });

    expect(sameBase.kind).toBe('success');
    if (sameBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(sameBase.exactLatex).toBe('x=4');
    expect(sameBase.solveBadges).toContain('Same-Base Equality');
    expect(sameBase.exactSupplementLatex?.[0]).toContain('2x-3>0');

    expect(mixedBase.kind).toBe('success');
    if (mixedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(mixedBase.exactLatex).toBe('x=4');
    expect(mixedBase.solveBadges).toContain('Log Base Normalize');
  });

  it('solves PRL4 bounded rational-power isolation families in symbolic mode', () => {
    const direct = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^{\\frac{3}{2}}=8',
    });
    const twoSided = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
    });

    expect(direct.kind).toBe('success');
    if (direct.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(direct.exactLatex).toBe('x=4');
    expect(direct.solveBadges).toContain('Power Lift');

    expect(twoSided.kind).toBe('success');
    if (twoSided.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(twoSided.exactLatex).toContain('x\\in');
    expect(twoSided.solveBadges).toContain('Power Lift');
  });

  it('solves bounded trig squares through exact branch splitting', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin^2\\left(x\\right)=\\frac{1}{4}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Square Split');
    expect(result.exactLatex).toContain('x\\in');
  });

  it('blocks unsupported indefinite integrals before solve', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\int x\\,dx+x=3',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('indefinite integral');
    expect(result.plannerBadges).toContain('Hard Stop');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'planner-hard-stop',
      source: 'planner',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('runs explicit equation transforms without auto-solving the transformed equation', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
  });

  it('runs PRL3 explicit equation transforms without auto-solving', () => {
    const asRoot = runEquationAlgebraTransform({
      action: 'rewriteAsRoot',
      equationLatex: 'x^{1/2}=3',
      angleUnit: 'deg',
    });
    const asPower = runEquationAlgebraTransform({
      action: 'rewriteAsPower',
      equationLatex: '\\sqrt{x}=3',
      angleUnit: 'deg',
    });
    const changedBase = runEquationAlgebraTransform({
      action: 'changeBase',
      equationLatex: '\\log_{4}(x)=2',
      angleUnit: 'deg',
    });

    expect(asRoot.kind).toBe('success');
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asRoot.exactLatex).toBe('\\sqrt{x}=3');
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root']);

    expect(asPower.kind).toBe('success');
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{2}}=3');
    expect(asPower.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(asPower.transformBadges).toEqual(['Rewrite as Power']);

    expect(changedBase.kind).toBe('success');
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}=2');
    expect(changedBase.transformBadges).toEqual(['Change Base']);
  });

  it('widens explicit equation transforms to binomial denominator families', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x^2+x=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.transformSummaryLatex).toContain('x-1');
    expect(result.transformSummaryLatex).toContain('x^2+1');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+1\\ne0');
  });

  it('solves bounded conjugate families through the shared symbolic backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves widened affine-scaled conjugate families through the shared symbolic backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('LCD Clear');
  });

  it('solves selected three-term reciprocal families only when the bounded sink closes cleanly', () => {
    const success = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
    });
    const honestStop = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
    });

    expect(success.kind).toBe('success');
    if (success.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(success.exactLatex).toBe('x=0');
    expect(success.solveBadges).toContain('LCD Clear');

    expect(honestStop.kind).toBe('error');
    if (honestStop.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(honestStop.error).toContain('bounded solve set');
    expect(honestStop.solveBadges).toContain('LCD Clear');
  });
});
