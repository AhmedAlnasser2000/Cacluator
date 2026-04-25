import { formatApproxNumber, latexToApproxText, numberToLatex } from './format';
import {
  basicFiniteLimitWarning,
  boxedToFiniteNumber,
  boxNode,
  evaluateBodyAt,
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
  evaluateNumericDefiniteIntegralFromAst,
  nodeToFiniteNumber,
  resolveIndefiniteIntegralFromAst,
  type BoxedLike,
} from './calculus-core';
import { differentiateAstWithMetadata } from './symbolic-engine/differentiation';
import type {
  CalculusDerivativeStrategy,
  LimitDirection,
  LimitTargetKind,
  ResultOrigin,
  CalculusIntegrationStrategy,
} from '../types/calculator';

type CalculusEvaluation =
  | {
      kind: 'handled';
    exactLatex: string;
      approxText?: string;
      warnings: string[];
      resultOrigin?: ResultOrigin;
      integrationStrategy?: CalculusIntegrationStrategy;
      derivativeStrategies?: CalculusDerivativeStrategy[];
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
  return boxNode(node);
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

function limitFallbackWarning(direction: LimitDirection, targetKind: LimitTargetKind) {
  if (targetKind !== 'finite') {
    return 'Symbolic limit unavailable; showing a numeric limit approximation at infinity.';
  }

  return basicFiniteLimitWarning(direction);
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

  const derivative = differentiateAstWithMetadata(derivativeAtPoint.body, derivativeAtPoint.variable);
  const exactDerivative = box(derivative.ast);
  const substituted = exactDerivative.subs({ [derivativeAtPoint.variable]: point }).evaluate();
  const numericDerivative = boxedToFiniteNumber(substituted);
  if (numericDerivative !== undefined) {
    return {
      kind: 'handled',
      exactLatex: substituted.latex,
      approxText: latexToApproxText((substituted.N?.() ?? substituted).latex),
      warnings: [],
      resultOrigin: 'symbolic-engine',
      derivativeStrategies: derivative.strategies,
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
    approxText: formatApproxNumber(numeric),
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

    if (!isDefinite) {
      const resolved = resolveIndefiniteIntegralFromAst({
        body: integral.body,
        variable: integral.variable,
        computed: evaluatedExpr,
        unresolvedComputeEngine: unresolvedIntegral,
        computeEngineOrigin: 'compute-engine',
        unsupportedError: 'This antiderivative could not be determined symbolically in this milestone.',
        normalizeRuleLatex: true,
      });

      if (resolved.error) {
        return {
          kind: 'error',
          error: resolved.error,
          warnings: resolved.warnings,
        };
      }

      return {
        kind: 'handled',
        exactLatex: resolved.exactLatex ?? '',
        approxText: resolved.approxText,
        warnings: resolved.warnings,
        resultOrigin: resolved.resultOrigin,
        integrationStrategy: resolved.integrationStrategy,
      };
    }

    if (!unresolvedIntegral) {
      return {
        kind: 'handled',
        exactLatex: evaluatedExpr.latex,
        approxText: latexToApproxText((evaluatedExpr.N?.() ?? evaluatedExpr).latex),
        warnings: [],
        resultOrigin: 'compute-engine',
      };
    }

    if (unresolvedIntegral) {
      const lower = nodeToFiniteNumber(integral.lower);
      const upper = nodeToFiniteNumber(integral.upper);
      if (lower === undefined || upper === undefined) {
        return {
          kind: 'error',
          error: 'Definite integrals require numeric bounds in this milestone.',
          warnings: [],
        };
      }

      const numeric = evaluateNumericDefiniteIntegralFromAst({
        body: integral.body,
        variable: integral.variable,
        lower,
        upper,
        unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
      });
      if (numeric.error) {
        return {
          kind: 'error',
          error: numeric.error,
          warnings: numeric.warnings,
        };
      }

      return {
        kind: 'handled',
        exactLatex: numeric.exactLatex ?? '',
        approxText: numeric.approxText,
        warnings: numeric.warnings,
        resultOrigin: numeric.resultOrigin,
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

      const resolved = evaluateFiniteLimitFromAst({
        body: limit.body,
        variable: limit.variable,
        target,
        direction,
        messages: {
          mismatchError: 'Left and right behavior do not agree near the target.',
          unstableError: 'This limit could not be stabilized numerically in this milestone.',
          numericFallbackWarning: basicFiniteLimitWarning,
          oneSidedUnboundedError: (side) =>
            `${side === 'left' ? 'Left-hand' : 'Right-hand'} limit appears unbounded near the target.`,
          oneSidedDomainError: (side) =>
            `${side === 'left' ? 'Left-hand' : 'Right-hand'} behavior is outside the real domain near the target.`,
        },
      });
      if (resolved.error) {
        return {
          kind: 'error',
          error: resolved.error,
          warnings: resolved.warnings,
        };
      }

      return {
        kind: 'handled',
        exactLatex: resolved.exactLatex ?? '',
        approxText: resolved.approxText,
        warnings: resolved.warnings,
        resultOrigin: resolved.resultOrigin,
      };
    }

    const resolved = evaluateInfiniteLimitFromAst({
      body: limit.body,
      variable: limit.variable,
      targetKind,
      messages: {
        targetLabel: (kind) => (kind === 'posInfinity' ? '+∞' : '-∞'),
        unstableError: 'This limit could not be stabilized numerically in this milestone.',
        numericFallbackWarning: limitFallbackWarning(direction, targetKind),
      },
    });
    if (resolved.error) {
      return {
        kind: 'error',
        error: resolved.error,
        warnings: resolved.warnings,
      };
    }

    return {
      kind: 'handled',
      exactLatex: resolved.exactLatex ?? '',
      approxText: resolved.approxText,
      warnings: resolved.warnings,
      resultOrigin: resolved.resultOrigin,
    };
  }

  const derivative = extractDerivative(originalExpr.json);
  if (derivative) {
    try {
      const resolvedDerivative = differentiateAstWithMetadata(derivative.body, derivative.variable);
      const exactDerivative = box(resolvedDerivative.ast);
      return {
        kind: 'handled',
        exactLatex: exactDerivative.latex,
        approxText: latexToApproxText((exactDerivative.N?.() ?? exactDerivative).latex),
        warnings: [],
        resultOrigin: 'symbolic-engine',
        derivativeStrategies: resolvedDerivative.strategies,
      };
    } catch {
      if (evaluatedExpr.latex !== originalExpr.latex) {
        return {
          kind: 'handled',
          exactLatex: evaluatedExpr.latex,
          approxText: latexToApproxText((evaluatedExpr.N?.() ?? evaluatedExpr).latex),
          warnings: [],
          resultOrigin: 'compute-engine',
          derivativeStrategies: ['compute-engine'],
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
