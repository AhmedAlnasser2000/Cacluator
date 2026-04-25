import { ComputeEngine } from '@cortex-js/compute-engine';
import { latexToApproxText } from '../format';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
  type CalculusCoreEvaluation,
} from '../calculus-core';
import type {
  AdvancedFiniteLimitState,
  AdvancedInfiniteLimitState,
  LimitDirection,
} from '../../types/calculator';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

export type AdvancedLimitEvaluation = CalculusCoreEvaluation;

function finiteTargetLabel(direction: LimitDirection) {
  return direction === 'left' ? 'Left-hand' : 'Right-hand';
}

export function evaluateAdvancedFiniteLimit(
  state: AdvancedFiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const target = Number(state.target);
  if (!bodyLatex || !Number.isFinite(target)) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  try {
    const parsed = ce.parse(`\\lim_{x\\to ${target}}\\left(${bodyLatex}\\right)`) as BoxedLike;
    const body = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\lim')) {
      return {
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    return evaluateFiniteLimitFromAst({
      body: body.json,
      variable: 'x',
      target,
      direction: state.direction,
      messages: {
        mismatchError: 'Left and right behavior do not agree near the target.',
        unstableError: 'This limit could not be stabilized numerically in Advanced Calc.',
        numericFallbackWarning: () =>
          'Symbolic limit unavailable; showing a numeric finite limit approximation.',
        oneSidedUnboundedError: (side) =>
          `${finiteTargetLabel(side)} limit appears unbounded near the target.`,
        oneSidedDomainError: (side) =>
          `${finiteTargetLabel(side)} behavior is outside the real domain near the target.`,
      },
    });
  } catch {
    return {
      warnings: [],
      error: 'This symbolic limit is outside the supported Advanced Calc rules.',
    };
  }
}

export function evaluateAdvancedInfiniteLimit(
  state: AdvancedInfiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  const body = ce.parse(bodyLatex).json;
  return evaluateInfiniteLimitFromAst({
    body,
    variable: 'x',
    targetKind: state.targetKind,
    messages: {
      targetLabel: (kind) => (kind === 'posInfinity' ? '+infinity' : '-infinity'),
      unstableError: 'This limit could not be stabilized numerically in Advanced Calc.',
      numericFallbackWarning: 'Symbolic limit unavailable; showing a numeric infinite-target approximation.',
    },
  });
}
