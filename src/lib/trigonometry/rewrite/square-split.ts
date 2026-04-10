import { parseSupportedRatio } from '../angles';
import { branchSetToPair, createTwoBranchSet } from '../../algebra/branch-core';
import {
  boxLatex,
  EPSILON,
  formatExactValueLatex,
} from './shared';
import { matchScaledTrigSquare } from './cos-double-angle';
import type { TrigRewriteMatchResult } from './types';

function matchDirectSquareSplit(expressionNode: unknown, rhsNode: unknown): TrigRewriteMatchResult {
  const square = matchScaledTrigSquare(expressionNode);
  if (!square || square.coefficient !== 1 || (square.kind !== 'sin' && square.kind !== 'cos')) {
    return { kind: 'none' };
  }

  const value = parseSupportedRatio(boxLatex(rhsNode));
  if (value === null) {
    return { kind: 'none' };
  }

  if (value < -EPSILON) {
    return {
      kind: 'blocked',
      error: 'No real solutions because sin^2(theta) and cos^2(theta) cannot be negative.',
    };
  }

  if (value > 1 + EPSILON) {
    return {
      kind: 'blocked',
      error: 'No real solutions because sin^2(theta) and cos^2(theta) cannot exceed 1.',
    };
  }

  const bounded = Math.min(Math.max(value, 0), 1);
  const rootLatex = formatExactValueLatex(Math.sqrt(bounded));
  const negativeRootLatex = formatExactValueLatex(-Math.sqrt(bounded));
  const fn = square.kind === 'sin' ? '\\sin' : '\\cos';
  const branchLatex = branchSetToPair(createTwoBranchSet(
    `${fn}\\left(${square.argumentLatex}\\right)=${rootLatex}`,
    `${fn}\\left(${square.argumentLatex}\\right)=${negativeRootLatex}`,
    undefined,
    { provenance: 'trig-square-split' },
  ));
  if (!branchLatex) {
    return { kind: 'none' };
  }

  return {
    kind: 'candidate',
    candidate: {
      kind: 'split-square',
      rewriteKind: square.kind === 'sin' ? 'sin-square-split' : 'cos-square-split',
      branchLatex,
      domainSummary: `Bounded ${square.kind}^2 solve in the real domain.`,
      summaryText: 'Split the trig square into positive and negative branches before solving.',
    },
  };
}

export { matchDirectSquareSplit };
