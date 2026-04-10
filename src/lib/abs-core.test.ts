import { describe, expect, it } from 'vitest';
import {
  buildAbsoluteValueNumericGuidance,
  matchDirectAbsoluteValueEquationLatex,
  normalizeExactAbsoluteValueNode,
} from './abs-core';
import { boxLatex } from './symbolic-engine/patterns';

describe('abs-core', () => {
  it('recognizes bounded direct |u|=|v| families and builds exact branches', () => {
    const family = matchDirectAbsoluteValueEquationLatex('\\left|2x-3\\right|=\\left|x+4\\right|');

    expect(family).not.toBeNull();
    expect(family?.kind).toBe('abs-equals-abs');
    expect(family?.branchConstraints).toEqual([]);
    expect(family?.branchEquations).toHaveLength(2);
    expect(family?.branchEquations.join(' ; ')).toContain('2x-3');
    expect(family?.branchEquations.join(' ; ')).toContain('x+4');
  });

  it('recognizes affine-wrapped abs families and normalizes them into the shared branch model', () => {
    const family = matchDirectAbsoluteValueEquationLatex('2\\left|x+1\\right|-3=x');

    expect(family).not.toBeNull();
    expect(family?.kind).toBe('abs-equals-expression');
    expect(boxLatex(family?.comparisonNode)).toBe('\\frac{x}{2}+\\frac{3}{2}');
    expect(family?.branchEquations).toContain('x+1=\\frac{x}{2}+\\frac{3}{2}');
    expect(family?.branchEquations).toContain('x+1=\\frac{-x}{2}-\\frac{3}{2}');
    expect(family?.branchConstraints).toEqual([{ kind: 'nonnegative', expressionLatex: '\\frac{x}{2}+\\frac{3}{2}' }]);
  });

  it('rejects direct sums of unrelated absolute-value families', () => {
    const family = matchDirectAbsoluteValueEquationLatex('\\left|x\\right|+\\left|x+1\\right|=3');

    expect(family).toBeNull();
  });

  it('recognizes bounded outer-polynomial abs families through one normalized |u| placeholder', () => {
    const family = matchDirectAbsoluteValueEquationLatex('\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0');

    expect(family).not.toBeNull();
    expect(family?.normalizationKind).toBe('outer-polynomial');
    expect(family?.branchEquations).toContain('x-1=2');
    expect(family?.branchEquations).toContain('x-1=-2');
    expect(family?.branchEquations).toContain('x-1=3');
    expect(family?.branchEquations).toContain('x-1=-3');
  });

  it('recognizes bounded outer non-periodic abs families through one normalized |u| placeholder', () => {
    const family = matchDirectAbsoluteValueEquationLatex('\\ln\\left(\\left|x\\right|+1\\right)=2');

    expect(family).not.toBeNull();
    expect(family?.normalizationKind).toBe('outer-nonperiodic');
    expect(family?.branchEquations).toContain('x=\\exponentialE^{2}-1');
    expect(family?.branchEquations).toContain('x=1-\\exponentialE^{2}');
  });

  it('normalizes direct bounded abs identities for simplify-only reuse', () => {
    const normalized = normalizeExactAbsoluteValueNode(['Power', ['Abs', 'x'], 2]);

    expect(normalized).not.toBeNull();
    expect(boxLatex(normalized?.normalizedNode)).toBe('x^2');
    expect(normalized?.exactSupplementLatex).toEqual([]);
  });

  it('builds branch-aware numeric guidance for recognized abs families', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '\\left|x+1\\right|=e^x',
      5,
      6,
      32,
      'rad',
    );

    expect(guidance).toContain('absolute-value family splits into');
    expect(guidance).toContain('x+1=\\exponentialE^{x}');
  });

  it('builds wrapped-family numeric guidance from the same normalized abs descriptor', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '2\\left|x+1\\right|-3=x',
      2,
      4,
      32,
      'rad',
    );

    expect(guidance).toContain('absolute-value family splits into');
    expect(guidance).toContain('x+1=\\frac{-x}{2}-\\frac{3}{2}');
  });

  it('labels stronger-carrier unresolved families in numeric guidance', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '\\left|x^2+1\\right|+1=e^x',
      3,
      5,
      64,
      'rad',
    );

    expect(guidance).toContain('stronger absolute-value carrier family');
    expect(guidance).toContain('x^2+1=\\exponentialE^{x}-1');
  });

  it('builds outer-polynomial numeric guidance from the same normalized abs descriptor', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0',
      -10,
      -5,
      64,
      'rad',
    );

    expect(guidance).toContain('absolute-value family splits into');
    expect(guidance).toContain('x-1=2');
    expect(guidance).toContain('x-1=-3');
  });

  it('builds outer non-periodic numeric guidance from the same normalized abs descriptor', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '\\ln\\left(\\left|x\\right|+1\\right)=2',
      5,
      7,
      64,
      'rad',
    );

    expect(guidance).toContain('only samples the x=\\exponentialE^{2}-1 branch');
  });

  it('keeps composition-backed outer non-periodic abs guidance branch-aware on unresolved intervals', () => {
    const guidance = buildAbsoluteValueNumericGuidance(
      '2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}',
      0,
      0.2,
      64,
      'rad',
    );

    expect(guidance).toContain('\\sin(x^5+x)=0.500');
    expect(guidance).toContain('\\sin(x^5+x)=-0.500');
  });
});
