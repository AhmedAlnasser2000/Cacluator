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
});
