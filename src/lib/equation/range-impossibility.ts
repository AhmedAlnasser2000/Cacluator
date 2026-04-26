import { ComputeEngine } from '@cortex-js/compute-engine';
import type { RangeImpossibilityResult, RangeProofReason, RealRangeInterval } from '../../types/calculator';
import {
  formatRangeInterval,
  intervalsDisjoint,
  proveRealRange,
} from '../algebra/domain-range-core';
import { normalizeAst } from '../symbolic-engine/normalize';
import { isNodeArray } from '../symbolic-engine/patterns';
import { parseSupportedRatio } from '../trigonometry/angles';

const ce = new ComputeEngine();

export { formatRangeInterval, proveRealRange };

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function interval(min: number, max: number, minInclusive = true, maxInclusive = true): RealRangeInterval {
  return { min, max, minInclusive, maxInclusive };
}

function constantValue(node: unknown): number | null {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : value;
}

function rangeError(reason: RangeProofReason) {
  if (reason === 'trig-carrier') {
    return 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.';
  }

  if (reason === 'trig-square') {
    return 'No real solutions because sin^2(theta) and cos^2(theta) stay between 0 and 1.';
  }

  if (reason === 'positive-exponential') {
    return 'No real solutions because exponential expressions are always positive.';
  }

  if (reason === 'principal-root') {
    return 'No real solutions because principal square roots are always nonnegative.';
  }

  if (reason === 'absolute-value') {
    return 'No real solutions because absolute values are always nonnegative.';
  }

  return 'No real solutions because this bounded expression can never equal the requested value.';
}

function compareAgainstConstant(
  expression: {
    interval: RealRangeInterval;
    reason: RangeProofReason;
    expressionLatex: string;
  },
  constant: number,
  constantLatex: string,
): RangeImpossibilityResult | null {
  const target = interval(constant, constant);
  if (!intervalsDisjoint(expression.interval, target)) {
    return null;
  }

  return {
    kind: 'impossible',
    error: rangeError(expression.reason),
    summaryText: `Range guard: ${expression.expressionLatex} stays in ${formatRangeInterval(expression.interval)}, so it cannot equal ${constantLatex}.`,
    badge: 'Range Guard',
    reason: expression.reason,
    derivedRange: expression.interval,
    comparedTarget: constantLatex,
  };
}

export function detectRealRangeImpossibility(
  equationLatex: string,
): RangeImpossibilityResult {
  let parsed: unknown;
  try {
    parsed = normalizeAst(ce.parse(equationLatex).json);
  } catch {
    return { kind: 'none' };
  }

  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = parsed;
  const leftProof = proveRealRange(left);
  const rightProof = proveRealRange(right);
  const leftConstant = constantValue(left);
  const rightConstant = constantValue(right);

  if (leftProof.kind === 'exact' && rightConstant !== null) {
    const impossible = compareAgainstConstant(leftProof, rightConstant, boxLatex(right));
    if (impossible) {
      return impossible;
    }
  }

  if (rightProof.kind === 'exact' && leftConstant !== null) {
    const impossible = compareAgainstConstant(rightProof, leftConstant, boxLatex(left));
    if (impossible) {
      return impossible;
    }
  }

  if (leftProof.kind === 'exact' && rightProof.kind === 'exact' && intervalsDisjoint(leftProof.interval, rightProof.interval)) {
    return {
      kind: 'impossible',
      error: 'No real solutions because the two sides have disjoint real ranges.',
      summaryText: `Range guard: the left side stays in ${formatRangeInterval(leftProof.interval)} while the right side stays in ${formatRangeInterval(rightProof.interval)}.`,
      badge: 'Range Guard',
      reason: leftProof.reason === 'bounded-sum' || rightProof.reason === 'bounded-sum'
        ? 'bounded-sum'
        : leftProof.reason === 'bounded-product' || rightProof.reason === 'bounded-product'
          ? 'bounded-product'
          : leftProof.reason,
      derivedRange: leftProof.interval,
    };
  }

  return { kind: 'none' };
}
