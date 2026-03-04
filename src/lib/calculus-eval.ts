import { ComputeEngine } from '@cortex-js/compute-engine';
import { integrateAdaptiveSimpson } from './adaptive-simpson';
import { formatNumber, latexToApproxText, numberToLatex } from './format';
import { MAX_RESULT_MAGNITUDE } from './result-guard';
import {
  numericLimitAtInfinity,
  resolveInfiniteLimitHeuristic,
} from './limit-heuristics';
import { differentiateAst } from './symbolic-engine/differentiation';
import { resolveSymbolicIntegralFromAst } from './symbolic-engine/integration';
import { resolveFiniteLimitRule } from './symbolic-engine/limits';
import type {
  LimitDirection,
  LimitTargetKind,
  ResultOrigin,
} from '../types/calculator';

const ce = new ComputeEngine();
const LIMIT_TOLERANCE = 1e-4;
const LIMIT_STEPS = [1e-1, 5e-2, 1e-2, 5e-3, 1e-3, 5e-4, 1e-4];
const LIMIT_UNBOUNDED_THRESHOLD = 1e4;

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

type CalculusEvaluation =
  | {
      kind: 'handled';
    exactLatex: string;
    approxText?: string;
    warnings: string[];
    resultOrigin?: ResultOrigin;
  }
  | {
      kind: 'error';
      error: string;
      warnings: string[];
    }
  | {
      kind: 'unhandled';
    };

type CalculusOptions = {
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function extractFunction(node: unknown) {
  if (
    !isNodeArray(node) ||
    node[0] !== 'Function' ||
    node.length !== 3 ||
    !isNodeArray(node[1]) ||
    node[1][0] !== 'Block' ||
    node[1].length !== 2 ||
    typeof node[2] !== 'string'
  ) {
    return undefined;
  }

  return {
    body: node[1][1],
    variable: node[2],
  };
}

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();

  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  const text = latexToApproxText(numeric.latex);
  if (!text) {
    return undefined;
  }

  const value = Number(text.replace(/\s+/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

function nodeToFiniteNumber(node: unknown) {
  return boxedToFiniteNumber(box(node));
}

function evaluateBodyAt(body: unknown, variable: string, value: number) {
  try {
    const numeric = box(body).subs({ [variable]: value }).evaluate();
    return boxedToFiniteNumber(numeric);
  } catch {
    return undefined;
  }
}

function extractDerivative(node: unknown) {
  if (
    !isNodeArray(node) ||
    node[0] !== 'D' ||
    node.length !== 3 ||
    typeof node[2] !== 'string'
  ) {
    return undefined;
  }

  return {
    body: node[1],
    variable: node[2],
  };
}

function extractDerivativeAtPoint(node: unknown) {
  if (
    !isNodeArray(node) ||
    node[0] !== 'Subscript' ||
    node.length !== 3 ||
    !isNodeArray(node[1]) ||
    node[1][0] !== 'EvaluateAt' ||
    node[1].length !== 2 ||
    !isNodeArray(node[2]) ||
    node[2][0] !== 'Equal' ||
    node[2].length !== 3 ||
    typeof node[2][1] !== 'string'
  ) {
    return undefined;
  }

  const wrappedDerivative = extractFunction(node[1][1]);
  if (!wrappedDerivative) {
    return undefined;
  }

  const derivative = extractDerivative(wrappedDerivative.body);
  if (!derivative) {
    return undefined;
  }

  return {
    body: derivative.body,
    variable: derivative.variable,
    point: node[2][2],
  };
}

function extractIntegral(node: unknown) {
  if (
    !isNodeArray(node) ||
    node[0] !== 'Integrate' ||
    node.length !== 3 ||
    !isNodeArray(node[2]) ||
    node[2][0] !== 'Limits' ||
    node[2].length !== 4 ||
    typeof node[2][1] !== 'string'
  ) {
    return undefined;
  }

  const fn = extractFunction(node[1]);
  if (!fn) {
    return undefined;
  }

  return {
    body: fn.body,
    variable: node[2][1],
    lower: node[2][2],
    upper: node[2][3],
  };
}

function extractLimit(node: unknown) {
  if (
    !isNodeArray(node) ||
    node[0] !== 'Limit' ||
    node.length !== 3
  ) {
    return undefined;
  }

  const fn = extractFunction(node[1]);
  if (!fn) {
    return undefined;
  }

  return {
    body: fn.body,
    variable: fn.variable,
    target: node[2],
  };
}

function extractLimitTargetKind(node: unknown): LimitTargetKind | undefined {
  if (node === 'PositiveInfinity') {
    return 'posInfinity';
  }

  if (node === 'NegativeInfinity') {
    return 'negInfinity';
  }

  return nodeToFiniteNumber(node) === undefined ? undefined : 'finite';
}

function centralDifference(body: unknown, variable: string, point: number) {
  const step = Math.max(1e-5, Math.abs(point) * 1e-5);
  const left = evaluateBodyAt(body, variable, point - step);
  const right = evaluateBodyAt(body, variable, point + step);

  if (left === undefined || right === undefined) {
    return undefined;
  }

  return (right - left) / (2 * step);
}

function numericIntegral(body: unknown, variable: string, lower: number, upper: number) {
  return integrateAdaptiveSimpson(
    (value) => evaluateBodyAt(body, variable, value),
    lower,
    upper,
  );
}

type OneSidedLimitResult =
  | { kind: 'success'; value: number }
  | { kind: 'unbounded' }
  | { kind: 'unstable' };

function stabilizeSamples(samples: number[]) {
  if (samples.length < 2) {
    return undefined;
  }

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const scale = Math.max(1, Math.abs(current), Math.abs(previous));

    if (Math.abs(current - previous) <= LIMIT_TOLERANCE * scale) {
      return current;
    }
  }

  return undefined;
}

function isUnboundedTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last >= LIMIT_UNBOUNDED_THRESHOLD
    && previous > 0
    && older > 0
    && last > previous * 1.5
    && previous > older * 1.5;
}

function numericOneSidedLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: 'left' | 'right',
): OneSidedLimitResult {
  const samples: number[] = [];

  for (const step of LIMIT_STEPS) {
    const samplePoint = direction === 'left' ? target - step : target + step;
    const value = evaluateBodyAt(body, variable, samplePoint);

    if (value === undefined) {
      continue;
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE) {
      return { kind: 'unbounded' };
    }

    samples.push(value);
  }

  const stabilized = stabilizeSamples(samples);
  if (stabilized !== undefined) {
    return { kind: 'success', value: stabilized };
  }

  if (isUnboundedTrend(samples)) {
    return { kind: 'unbounded' };
  }

  return { kind: 'unstable' };
}

function numericLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: LimitDirection,
) {
  if (direction === 'left') {
    return numericOneSidedLimit(body, variable, target, 'left');
  }

  if (direction === 'right') {
    return numericOneSidedLimit(body, variable, target, 'right');
  }

  const left = numericOneSidedLimit(body, variable, target, 'left');
  if (left.kind === 'unbounded') {
    return { kind: 'left-unbounded' as const };
  }
  if (left.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const right = numericOneSidedLimit(body, variable, target, 'right');
  if (right.kind === 'unbounded') {
    return { kind: 'right-unbounded' as const };
  }
  if (right.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const scale = Math.max(1, Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(left.value - right.value) > LIMIT_TOLERANCE * scale) {
    return { kind: 'mismatch' as const };
  }

  return {
    kind: 'success' as const,
    value: (left.value + right.value) / 2,
  };
}

function limitFallbackWarning(direction: LimitDirection, targetKind: LimitTargetKind) {
  if (targetKind !== 'finite') {
    return 'Symbolic limit unavailable; showing a numeric limit approximation at infinity.';
  }

  if (direction === 'two-sided') {
    return 'Symbolic limit unavailable; showing a numeric limit approximation.';
  }

  return `Symbolic limit unavailable; showing a numeric ${direction}-hand limit approximation.`;
}

function evaluateDerivativeAtPoint(node: unknown): CalculusEvaluation {
  const derivativeAtPoint = extractDerivativeAtPoint(node);
  if (!derivativeAtPoint) {
    return { kind: 'unhandled' };
  }

  const point = nodeToFiniteNumber(derivativeAtPoint.point);
  if (point === undefined) {
    return {
      kind: 'error',
      error: 'Derivative-at-point requires a numeric point in this milestone.',
      warnings: [],
    };
  }

  const exactDerivative = box(differentiateAst(derivativeAtPoint.body, derivativeAtPoint.variable));
  const substituted = exactDerivative.subs({ [derivativeAtPoint.variable]: point }).evaluate();
  const numericDerivative = boxedToFiniteNumber(substituted);
  if (numericDerivative !== undefined) {
    return {
      kind: 'handled',
      exactLatex: substituted.latex,
      approxText: latexToApproxText((substituted.N?.() ?? substituted).latex),
      warnings: [],
      resultOrigin: 'symbolic-engine',
    };
  }

  const numeric = centralDifference(derivativeAtPoint.body, derivativeAtPoint.variable, point);
  if (numeric === undefined) {
    return {
      kind: 'error',
      error: 'This derivative could not be evaluated reliably at the selected point.',
      warnings: [],
    };
  }

  return {
    kind: 'handled',
    exactLatex: numberToLatex(numeric),
    approxText: formatNumber(numeric),
    warnings: ['Symbolic derivative unavailable; showing a numeric derivative at the selected point.'],
    resultOrigin: 'numeric-fallback',
  };
}

export function resolveCalculusEvaluation(
  originalExpr: BoxedLike,
  evaluatedExpr: BoxedLike,
  options: CalculusOptions = {},
): CalculusEvaluation {
  const derivativeAtPoint = evaluateDerivativeAtPoint(originalExpr.json);
  if (derivativeAtPoint.kind !== 'unhandled') {
    return derivativeAtPoint;
  }

  const integral = extractIntegral(originalExpr.json);
  if (integral) {
    const isDefinite = integral.lower !== 'Nothing' && integral.upper !== 'Nothing';
    const unresolvedIntegral =
      evaluatedExpr.latex === originalExpr.latex ||
      evaluatedExpr.latex.includes('\\int') ||
      evaluatedExpr.latex.includes('\\infty');

    if (!isDefinite && !unresolvedIntegral) {
      return {
        kind: 'handled',
        exactLatex: evaluatedExpr.latex,
        warnings: [],
        resultOrigin: 'compute-engine',
      };
    }

    if (isDefinite && !unresolvedIntegral) {
      return {
        kind: 'handled',
        exactLatex: evaluatedExpr.latex,
        approxText: latexToApproxText((evaluatedExpr.N?.() ?? evaluatedExpr).latex),
        warnings: [],
        resultOrigin: 'compute-engine',
      };
    }

    if (!isDefinite && unresolvedIntegral) {
      const byRule = resolveSymbolicIntegralFromAst(integral.body, integral.variable);
      if (byRule.kind === 'success') {
        const normalized = ce.parse(byRule.exactLatex) as BoxedLike;
        return {
          kind: 'handled',
          exactLatex: normalized.latex,
          warnings: [],
          resultOrigin: byRule.origin,
        };
      }

      return {
        kind: 'error',
        error: byRule.error,
        warnings: [],
      };
    }

    if (isDefinite && unresolvedIntegral) {
      const lower = nodeToFiniteNumber(integral.lower);
      const upper = nodeToFiniteNumber(integral.upper);
      if (lower === undefined || upper === undefined) {
        return {
          kind: 'error',
          error: 'Definite integrals require numeric bounds in this milestone.',
          warnings: [],
        };
      }

      const numeric = numericIntegral(integral.body, integral.variable, lower, upper);
      if (numeric.kind === 'unsafe') {
        return {
          kind: 'error',
          error: 'The numeric integral became too large or too small to display safely.',
          warnings: [],
        };
      }

      if (numeric.kind !== 'success') {
        return {
          kind: 'error',
          error: 'This definite integral could not be evaluated reliably in this milestone.',
          warnings: [],
        };
      }

      return {
        kind: 'handled',
        exactLatex: numberToLatex(numeric.value),
        approxText: formatNumber(numeric.value),
        warnings: ['Symbolic integral unavailable; showing a numeric definite integral.'],
        resultOrigin: 'numeric-fallback',
      };
    }
  }

  const limit = extractLimit(originalExpr.json);
  if (limit && evaluatedExpr.latex === originalExpr.latex) {
    const targetKind = extractLimitTargetKind(limit.target) ?? options.limitTargetKind;
    if (!targetKind) {
      return {
        kind: 'error',
        error: 'Limits require a numeric target or ±∞ in this milestone.',
        warnings: [],
      };
    }

    const direction = options.limitDirection ?? 'two-sided';

    if (targetKind === 'finite') {
      const target = nodeToFiniteNumber(limit.target);
      if (target === undefined) {
        return {
          kind: 'error',
          error: 'Limits require a numeric target or ±∞ in this milestone.',
          warnings: [],
        };
      }

      const symbolic = resolveFiniteLimitRule(limit.body, target, limit.variable);
      if (symbolic.kind === 'success') {
        return {
          kind: 'handled',
          exactLatex: numberToLatex(symbolic.value),
          approxText: formatNumber(symbolic.value),
          warnings:
            symbolic.origin === 'heuristic-symbolic'
              ? ["Rule-based limit resolution used capped L'Hopital on a supported ratio form."]
              : [],
          resultOrigin:
            symbolic.origin === 'heuristic-symbolic'
              ? 'heuristic-symbolic'
              : 'rule-based-symbolic',
        };
      }

      const numeric = numericLimit(limit.body, limit.variable, target, direction);
      if (numeric.kind === 'left-unbounded') {
        return {
          kind: 'error',
          error: 'Left-hand limit appears unbounded near the target.',
          warnings: [],
        };
      }

      if (numeric.kind === 'right-unbounded') {
        return {
          kind: 'error',
          error: 'Right-hand limit appears unbounded near the target.',
          warnings: [],
        };
      }

      if (numeric.kind === 'unbounded') {
        return {
          kind: 'error',
          error: `${direction === 'left' ? 'Left-hand' : 'Right-hand'} limit appears unbounded near the target.`,
          warnings: [],
        };
      }

      if (numeric.kind === 'mismatch') {
        return {
          kind: 'error',
          error: 'Left and right behavior do not agree near the target.',
          warnings: [],
        };
      }

      if (numeric.kind !== 'success') {
        return {
          kind: 'error',
          error: 'This limit could not be stabilized numerically in this milestone.',
          warnings: [],
        };
      }

      return {
        kind: 'handled',
        exactLatex: numberToLatex(numeric.value),
        approxText: formatNumber(numeric.value),
        warnings: [limitFallbackWarning(direction, targetKind)],
        resultOrigin: 'numeric-fallback',
      };
    }

    const heuristic = resolveInfiniteLimitHeuristic(limit.body, limit.variable);
    if (heuristic.kind === 'success') {
      return {
        kind: 'handled',
        exactLatex: numberToLatex(heuristic.value),
        approxText: formatNumber(heuristic.value),
        warnings: [],
        resultOrigin: 'rule-based-symbolic',
      };
    }

    if (heuristic.kind === 'unbounded') {
      return {
        kind: 'error',
        error: `The limit appears unbounded as x approaches ${targetKind === 'posInfinity' ? '+∞' : '-∞'}.`,
        warnings: [],
      };
    }

    const numeric = numericLimitAtInfinity(
      (value) => evaluateBodyAt(limit.body, limit.variable, value),
      targetKind,
    );

    if (numeric.kind === 'unbounded') {
      return {
        kind: 'error',
        error: `The limit appears unbounded as x approaches ${targetKind === 'posInfinity' ? '+∞' : '-∞'}.`,
        warnings: [],
      };
    }

    if (numeric.kind !== 'success') {
      return {
        kind: 'error',
        error: 'This limit could not be stabilized numerically in this milestone.',
        warnings: [],
      };
    }

    return {
      kind: 'handled',
      exactLatex: numberToLatex(numeric.value),
      approxText: formatNumber(numeric.value),
      warnings: [limitFallbackWarning(direction, targetKind)],
      resultOrigin: 'numeric-fallback',
    };
  }

  const derivative = extractDerivative(originalExpr.json);
  if (derivative) {
    try {
      const exactDerivative = box(differentiateAst(derivative.body, derivative.variable));
      return {
        kind: 'handled',
        exactLatex: exactDerivative.latex,
        approxText: latexToApproxText((exactDerivative.N?.() ?? exactDerivative).latex),
        warnings: [],
        resultOrigin: 'symbolic-engine',
      };
    } catch {
      if (evaluatedExpr.latex !== originalExpr.latex) {
        return {
          kind: 'handled',
          exactLatex: evaluatedExpr.latex,
          approxText: latexToApproxText((evaluatedExpr.N?.() ?? evaluatedExpr).latex),
          warnings: [],
          resultOrigin: 'compute-engine',
        };
      }

      return {
        kind: 'error',
        error: 'This derivative could not be determined symbolically in this milestone.',
        warnings: [],
      };
    }
  }

  return { kind: 'unhandled' };
}
