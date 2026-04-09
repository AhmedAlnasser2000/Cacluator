import {
  ComputeEngine,
  expand,
  factor,
} from '@cortex-js/compute-engine';
import type {
  CalculateAction,
  EquationAction,
  ExpressionExecutionBudget,
  EvaluateRequest,
  EvaluateResponse,
  TableRequest,
  TableResponse,
} from '../types/calculator';
import {
  formatApproxNumber,
  latexToApproxText,
  solutionsToLatex,
} from './format';
import {
  canUseExpressionNumericFallback,
  getExpressionExecutionBudget,
} from './kernel/runtime-profile';
import { resolveCalculusEvaluation } from './calculus-eval';
import { canonicalizeMathInput } from './input-canonicalization';
import {
  containsRealNumericFamily,
  evaluateRealNumericExpression,
} from './real-numeric-eval';
import { rewriteDiscreteOperators } from './discrete-eval';
import { mergeExactSupplementLatex } from './exact-supplements';
import { getResultGuardError } from './result-guard';
import { normalizeExactAbsoluteValueNode } from './abs-core';
import { factorMathJson } from './symbolic-factor';
import { runFactoringEngine } from './symbolic-engine/orchestrator';
import { parsePartialDerivativeLatex, resolvePartialDerivative } from './symbolic-engine/partials';
import { normalizeExactPowerLogNode } from './symbolic-engine/power-log';
import { normalizeExactRadicalNode } from './symbolic-engine/radical';
import { normalizeExactRationalNode } from './symbolic-engine/rational';

export type SymbolicAction =
  | CalculateAction
  | EquationAction;

const ce = new ComputeEngine();
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);

type BoxedLike = {
  latex: string;
  json: unknown;
  operator?: string;
  solve?: (symbol: string) => unknown;
  simplify: () => BoxedLike;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function rewriteDirectTrigAngles(node: unknown, angleUnit: EvaluateRequest['angleUnit']): unknown {
  if (!isMathJsonArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}

function injectAns(latex: string, variables: Record<string, string>) {
  const ans = variables.Ans?.trim();
  if (!ans) {
    return latex;
  }

  return latex.replace(/\bAns\b/g, `\\left(${ans}\\right)`);
}

function isExplicitNegativeFactorial(latex: string) {
  return /^\(\s*-\s*\d+(?:\.\d+)?\s*\)!$/.test(latex.replaceAll('\\left', '').replaceAll('\\right', ''));
}

function exactExpression(expr: BoxedLike, action: SymbolicAction) {
  switch (action) {
    case 'simplify':
      return expr.simplify();
    case 'factor':
      return factor(expr as unknown as Parameters<typeof factor>[0]) as unknown as BoxedLike;
    case 'expand':
      return expand(expr as unknown as Parameters<typeof expand>[0]) as unknown as BoxedLike;
    case 'evaluate':
      return expr.evaluate();
    case 'solve':
      return expr;
    default:
      return expr;
  }
}

function prepareExpression(expr: BoxedLike, action: SymbolicAction) {
  if (action !== 'evaluate') {
    return {
      expr,
      warnings: [] as string[],
    };
  }

  const rewritten = rewriteDiscreteOperators(expr.json);
  if (rewritten.kind === 'error') {
    return {
      error: rewritten.error,
      warnings: [] as string[],
    };
  }

  return {
    expr: rewritten.changed
      ? (ce.box(rewritten.node as Parameters<typeof ce.box>[0]) as BoxedLike)
      : expr,
    warnings: [] as string[],
  };
}

function numericExpression(expr: BoxedLike) {
  if (typeof expr.N === 'function') {
    return expr.N();
  }

  return expr.evaluate?.().N?.() ?? expr;
}

function normalizedSupplementLatex(
  left: string[] | undefined,
  right: string[] | undefined,
) {
  const merged = mergeExactSupplementLatex(
    { latex: left, source: 'legacy' },
    { latex: right, source: 'legacy' },
  );
  return merged.length > 0 ? merged : undefined;
}

function solutionApproximationText(symbol: string, solutions: unknown[]) {
  const approximations = solutions
    .map((solution) => {
      const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
      const numeric = boxed.N?.() ?? boxed.evaluate();
      return latexToApproxText(numeric.latex);
    })
    .filter((value): value is string => Boolean(value));

  if (approximations.length === 0) {
    return undefined;
  }

  return approximations.length === 1
    ? `${symbol} ~= ${approximations[0]}`
    : `${symbol} ~= ${approximations.join(', ')}`;
}

function readNumericValue(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : null;
  }

  if (typeof node === 'string') {
    const value = Number(node);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function numericSolutionValues(solutions: unknown[]) {
  return solutions.map((solution) => {
    const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
    const numeric = boxed.N?.() ?? boxed.evaluate();
    return readNumericValue(numeric.json);
  });
}

function guardSolvedSolutions(solutions: unknown[]) {
  for (const solution of solutions) {
    const boxed = ce.box(solution as Parameters<typeof ce.box>[0]) as BoxedLike;
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const guardError = getResultGuardError(numeric?.latex, boxed?.latex);
    if (guardError) {
      return guardError;
    }
  }

  return undefined;
}

function isCollapsedPowerSingularity(node: unknown, rawLatex: string) {
  return (
    typeof node === 'string'
    && (node === 'NaN' || node === 'ComplexInfinity')
    && rawLatex.includes('^')
  );
}

function shouldUseRealNumericEvaluator(expr: BoxedLike, rawLatex: string) {
  return (
    containsRealNumericFamily(expr.json)
    && isNumericOnlyNode(expr.json)
  ) || isCollapsedPowerSingularity(expr.json, rawLatex);
}

function isInvalidRealNumericApprox(approxLatex?: string) {
  const approxText = latexToApproxText(approxLatex);
  return !approxText || approxText.includes('i') || approxText.includes('NaN');
}

type PreparedExpressionRequest =
  | {
      kind: 'ready';
      rawLatex: string;
    }
  | {
      kind: 'done';
      response: EvaluateResponse;
    };

type PreparedExpressionRuntime =
  | {
      kind: 'ready';
      expr: BoxedLike;
      sourceLatex: string;
      warnings: string[];
    }
  | {
      kind: 'done';
      response: EvaluateResponse;
    };

type PreparedExpressionRequestReady = Extract<PreparedExpressionRequest, { kind: 'ready' }>;
type PreparedExpressionRuntimeReady = Extract<PreparedExpressionRuntime, { kind: 'ready' }>;

type ExpressionActionContext = {
  request: EvaluateRequest;
  action: SymbolicAction;
  executionBudget: ExpressionExecutionBudget;
  preparedRequest: PreparedExpressionRequestReady;
  preparedRuntime: PreparedExpressionRuntimeReady;
};

export type ExpressionActionDescriptor = {
  id: SymbolicAction;
  label: string;
  execute: (context: ExpressionActionContext) => EvaluateResponse;
  publicCapabilityId?: 'expression.evaluate' | 'expression.simplify' | 'expression.factor' | 'expression.expand';
};

function prepareExpressionRequest(
  request: EvaluateRequest,
  action: SymbolicAction,
): PreparedExpressionRequest {
  const canonicalized = canonicalizeMathInput(request.document.latex, {
    mode: request.mode,
    screenHint: action === 'solve' ? 'symbolic' : 'standard',
  });
  const rawLatex = (canonicalized.ok ? canonicalized.canonicalLatex : request.document.latex).trim();

  if (!rawLatex) {
    return {
      kind: 'done',
      response: {
        warnings: [],
        error: 'Enter an expression first.',
      },
    };
  }

  if (action === 'evaluate' && isExplicitNegativeFactorial(rawLatex)) {
    return {
      kind: 'done',
      response: {
        warnings: [],
        error: 'Factorial is defined only for non-negative integers in this milestone.',
      },
    };
  }

  if (action === 'evaluate') {
    const partial = parsePartialDerivativeLatex(rawLatex);
    if (partial) {
      const resolved = resolvePartialDerivative(partial);
      if (resolved.kind === 'error') {
        return {
          kind: 'done',
          response: {
            warnings: [],
            error: resolved.error,
          },
        };
      }

      return {
        kind: 'done',
        response: {
          exactLatex: resolved.exactLatex,
          approxText: latexToApproxText(resolved.exactLatex),
          normalizedMathJson: request.document.mathJson,
          warnings: [],
          resultOrigin: 'symbolic-engine',
        },
      };
    }
  }

  return {
    kind: 'ready',
    rawLatex,
  };
}

function prepareExpressionRuntime(
  request: EvaluateRequest,
  action: SymbolicAction,
  rawLatex: string,
): PreparedExpressionRuntime {
  const sourceLatex = injectAns(rawLatex, request.variables);
  const parsedExpr = ce.parse(sourceLatex) as BoxedLike;
  const angleAwareExpr =
    request.mode === 'calculate' && action === 'evaluate'
      ? (() => {
          const rewrittenJson = rewriteDirectTrigAngles(parsedExpr.json, request.angleUnit);
          return rewrittenJson === parsedExpr.json
            ? parsedExpr
            : (ce.box(rewrittenJson as Parameters<typeof ce.box>[0]) as BoxedLike);
        })()
      : parsedExpr;

  const prepared = prepareExpression(angleAwareExpr, action);
  if ('error' in prepared) {
    return {
      kind: 'done',
      response: {
        warnings: prepared.warnings,
        error: prepared.error,
      },
    };
  }

  return {
    kind: 'ready',
    expr: prepared.expr,
    sourceLatex,
    warnings: prepared.warnings,
  };
}

function executePreparedExpressionAction(
  context: ExpressionActionContext,
): EvaluateResponse {
  const { request, action, executionBudget, preparedRequest, preparedRuntime } = context;
  const { expr, sourceLatex, warnings } = preparedRuntime;

  const radical =
    action === 'simplify' || action === 'factor'
      ? normalizeExactRadicalNode(expr.json, action)
      : action === 'expand'
        ? normalizeExactRadicalNode(exactExpression(expr, action).json, 'expand')
        : null;

  const radicalExpr = radical
    ? (ce.box(radical.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike)
    : expr;
  const radicalSupplementLatex = radical?.exactSupplementLatex ?? [];
  const absoluteValue =
    action === 'simplify'
      ? normalizeExactAbsoluteValueNode(radicalExpr.json)
      : null;
  const simplifyNormalizedExpr = absoluteValue
    ? (ce.box(absoluteValue.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike)
    : radicalExpr;
  const simplifySupplementLatex = action === 'simplify'
    ? mergeExactSupplementLatex(
      { latex: radicalSupplementLatex, source: 'radical-domain' },
      { latex: absoluteValue?.exactSupplementLatex, source: 'legacy' },
    )
    : radicalSupplementLatex;

  const rational =
    action === 'simplify'
      ? normalizeExactRationalNode(simplifyNormalizedExpr.json, action)
      : action === 'factor'
        ? normalizeExactRationalNode(radicalExpr.json, action)
      : null;
  if (rational) {
      const powerLog =
        action === 'simplify'
          ? normalizeExactPowerLogNode(rational.normalizedNode, 'simplify')
          : null;
      const exactExpr = ce.box(rational.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike;
      const approx = isNumericOnlyNode(exactExpr.json)
        ? numericExpression(exactExpr)
        : undefined;
      const exactSupplementLatex = mergeExactSupplementLatex(
        { latex: simplifySupplementLatex, source: 'legacy' },
        { latex: rational.exactSupplementLatex, source: 'denominator' },
      );
      if (powerLog?.changed) {
        return {
          exactLatex: powerLog.normalizedLatex,
          exactSupplementLatex: normalizedSupplementLatex(
              exactSupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
        };
      }
      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'symbolic-normalization-recovery',
        )
        && shouldUseRealNumericEvaluator(expr, sourceLatex)
        && isInvalidRealNumericApprox(approx?.latex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
              exactSupplementLatex,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            exactSupplementLatex,
            approxText: numeric.approxText,
            normalizedMathJson: rational.normalizedNode,
            warnings,
            resultOrigin: 'numeric-fallback',
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
            exactSupplementLatex,
          };
        }
      }
      const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
      if (guardError) {
        return {
          warnings,
          error: guardError,
          exactSupplementLatex,
        };
      }

      return {
        exactLatex: rational.normalizedLatex,
        exactSupplementLatex,
        approxText: latexToApproxText(approx?.latex),
        normalizedMathJson: rational.normalizedNode,
        warnings,
        resultOrigin: 'symbolic-engine',
      };
    }

    if ((radical || absoluteValue) && action === 'simplify') {
      const powerLog = normalizeExactPowerLogNode(simplifyNormalizedExpr.json, 'simplify');
      const approx = isNumericOnlyNode(simplifyNormalizedExpr.json)
        ? numericExpression(simplifyNormalizedExpr)
        : undefined;
      if (powerLog?.changed) {
        return {
          exactLatex: powerLog.normalizedLatex,
          exactSupplementLatex: normalizedSupplementLatex(
              simplifySupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
        };
      }
      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'symbolic-normalization-recovery',
        )
        &&
        shouldUseRealNumericEvaluator(expr, sourceLatex)
        && isInvalidRealNumericApprox(approx?.latex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
              exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
            approxText: numeric.approxText,
            normalizedMathJson: simplifyNormalizedExpr.json,
            warnings,
            resultOrigin: 'numeric-fallback',
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
            exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
          };
        }
      }
      const guardError = getResultGuardError(approx?.latex, simplifyNormalizedExpr?.latex);
      if (guardError) {
        return {
          warnings,
          error: guardError,
          exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
        };
      }

      return {
        exactLatex: absoluteValue?.normalizedLatex ?? radical?.normalizedLatex,
        exactSupplementLatex: simplifySupplementLatex.length > 0 ? simplifySupplementLatex : undefined,
        approxText: latexToApproxText(approx?.latex),
        normalizedMathJson: simplifyNormalizedExpr.json,
        warnings,
        resultOrigin: 'symbolic-engine',
      };
    }

    if (action === 'simplify') {
      const powerLog = normalizeExactPowerLogNode(simplifyNormalizedExpr.json, 'simplify');
      if (powerLog?.handled) {
        if (
          canUseExpressionNumericFallback(
            executionBudget,
            action,
            'symbolic-normalization-recovery',
          )
          && shouldUseRealNumericEvaluator(expr, sourceLatex)
        ) {
          const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
          if (numeric.kind === 'success') {
            const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
            if (guardError) {
              return {
                warnings,
                error: guardError,
              };
            }

            return {
              exactLatex: numeric.exactLatex,
              approxText: numeric.approxText,
              normalizedMathJson: expr.json,
              warnings,
              resultOrigin: 'numeric-fallback',
            };
          }

          if (numeric.kind === 'domain-error') {
            return {
              warnings,
              error: numeric.error,
            };
          }
        }

        const exactExpr = ce.box(powerLog.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike;
        const approx = isNumericOnlyNode(exactExpr.json)
          ? numericExpression(exactExpr)
          : undefined;
        return {
          exactLatex: powerLog.normalizedLatex,
          exactSupplementLatex: normalizedSupplementLatex(
              simplifySupplementLatex,
              powerLog.exactSupplementLatex,
            ),
          approxText: latexToApproxText(approx?.latex),
          normalizedMathJson: powerLog.normalizedNode,
          warnings,
          resultOrigin: 'symbolic-engine',
        };
      }
    }

    if (action === 'solve') {
      const solutions = expr.solve?.('x');
      if (!Array.isArray(solutions) || solutions.length === 0) {
        return {
          warnings: [],
          normalizedMathJson: expr.json,
          error: 'No symbolic solution was found for x.',
        };
      }

      const guardError = guardSolvedSolutions(solutions);
      if (guardError) {
        return {
          warnings: [],
          normalizedMathJson: expr.json,
          error: guardError,
        };
      }

      const exactLatex = solutionsToLatex(
        'x',
        solutions.map((solution) => ce.box(solution).latex),
      );

      return {
        exactLatex,
        approxText: solutionApproximationText('x', solutions),
        normalizedMathJson: expr.json,
        rawSolutions: solutions,
        rawSolutionLatex: solutions.map((solution) => ce.box(solution as Parameters<typeof ce.box>[0]).latex),
        numericSolutions: numericSolutionValues(solutions),
        warnings: [],
      };
    }

    const exact =
      action === 'expand' && radical
        ? radicalExpr
        : exactExpression(radicalExpr, action);
    if (action === 'evaluate') {
      const calculus = resolveCalculusEvaluation(expr, exact, request.calculusOptions);
      if (calculus.kind === 'error') {
          return {
            warnings: [...warnings, ...calculus.warnings],
            error: calculus.error,
          };
        }

      if (calculus.kind === 'handled') {
        const guardError = getResultGuardError(calculus.exactLatex, calculus.approxText);
          if (guardError) {
            return {
              warnings: [...warnings, ...calculus.warnings],
              error: guardError,
            };
          }

        return {
            exactLatex: calculus.exactLatex,
            approxText: calculus.approxText,
            normalizedMathJson: expr.json,
            warnings: [...warnings, ...calculus.warnings],
            resultOrigin: calculus.resultOrigin,
          };
        }

      if (
        canUseExpressionNumericFallback(
          executionBudget,
          action,
          'evaluate-real-family',
        )
        && shouldUseRealNumericEvaluator(expr, sourceLatex)
      ) {
        const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
        if (numeric.kind === 'success') {
          const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
          if (guardError) {
            return {
              warnings,
              error: guardError,
            };
          }

          return {
            exactLatex: numeric.exactLatex,
            approxText: numeric.approxText,
            normalizedMathJson: expr.json,
            warnings,
            resultOrigin: 'numeric-fallback',
          };
        }

        if (numeric.kind === 'domain-error') {
          return {
            warnings,
            error: numeric.error,
          };
        }
      }
    }

    const factorSourceNode = radical?.normalizedNode ?? expr.json;
    const factorSourceLatex = radical?.normalizedLatex ?? preparedRequest.rawLatex;
    const factorOutcome =
      action === 'factor'
        ? runFactoringEngine(factorSourceLatex)
        : undefined;
    const symbolicFactorSucceeded =
      factorOutcome?.kind === 'success' && factorOutcome.strategy !== 'none';
    const fallbackExact = factorOutcome?.kind === 'success'
      && factorOutcome.strategy !== 'none'
      ? factorMathJson(factorSourceNode)
      : undefined;
    const exactExpr = fallbackExact
      ? (ce.box(fallbackExact as Parameters<typeof ce.box>[0]) as BoxedLike)
      : exact;
    const approx = isNumericOnlyNode(exactExpr?.json ?? radicalExpr.json)
      ? numericExpression(exactExpr)
      : undefined;
    if (
      canUseExpressionNumericFallback(
        executionBudget,
        action,
        'symbolic-normalization-recovery',
      )
      && shouldUseRealNumericEvaluator(expr, sourceLatex)
      && isInvalidRealNumericApprox(approx?.latex)
    ) {
      const numeric = evaluateRealNumericExpression(expr.json, sourceLatex);
      if (numeric.kind === 'success') {
        const guardError = getResultGuardError(numeric.exactLatex, numeric.approxText);
        if (guardError) {
          return {
            warnings,
            error: guardError,
            exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
          };
        }

        return {
          exactLatex: numeric.exactLatex,
          exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
          approxText: numeric.approxText,
          normalizedMathJson: radical?.normalizedNode ?? expr.json,
          warnings,
          resultOrigin: 'numeric-fallback',
        };
      }

      if (numeric.kind === 'domain-error') {
        return {
          warnings,
          error: numeric.error,
          exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
        };
      }
    }
    const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
    if (guardError) {
      return {
        warnings,
        error: guardError,
        exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
      };
    }

    return {
      exactLatex: exactExpr?.latex ?? radicalExpr.latex,
      exactSupplementLatex: radicalSupplementLatex.length > 0 ? radicalSupplementLatex : undefined,
      approxText: latexToApproxText(approx?.latex),
      normalizedMathJson: radical?.normalizedNode ?? expr.json,
      warnings:
        action === 'factor' && (exactExpr?.latex ?? radicalExpr.latex) === radicalExpr.latex
          ? radical
            ? warnings
            : ['No simpler factorization was found for this expression.']
          : action === 'factor' && symbolicFactorSucceeded
            ? [`Factored via ${factorOutcome.strategy!.replaceAll('-', ' ')}.`]
            : warnings,
      resultOrigin:
        radical
          ? 'symbolic-engine'
          : action === 'factor' && symbolicFactorSucceeded
          ? 'symbolic-engine'
          : undefined,
    };
}

const EXPRESSION_ACTION_DESCRIPTORS: ExpressionActionDescriptor[] = [
  {
    id: 'evaluate',
    label: 'Evaluate',
    publicCapabilityId: 'expression.evaluate',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'simplify',
    label: 'Simplify',
    publicCapabilityId: 'expression.simplify',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'factor',
    label: 'Factor',
    publicCapabilityId: 'expression.factor',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'expand',
    label: 'Expand',
    publicCapabilityId: 'expression.expand',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'solve',
    label: 'Solve',
    execute: executePreparedExpressionAction,
  },
];

export function listExpressionActionDescriptors(): ExpressionActionDescriptor[] {
  return EXPRESSION_ACTION_DESCRIPTORS;
}

function runExpressionActionHost(
  context: ExpressionActionContext,
): EvaluateResponse {
  const descriptor = EXPRESSION_ACTION_DESCRIPTORS.find((entry) => entry.id === context.action);
  if (!descriptor) {
    return {
      warnings: [],
      error: 'Expression action is not supported by the shared runtime host.',
    };
  }

  return descriptor.execute(context);
}

export function runExpressionAction(
  request: EvaluateRequest,
  action: SymbolicAction,
): EvaluateResponse {
  const executionBudget = getExpressionExecutionBudget();
  const preparedRequest = prepareExpressionRequest(request, action);
  if (preparedRequest.kind === 'done') {
    return preparedRequest.response;
  }

  try {
    const preparedRuntime = prepareExpressionRuntime(request, action, preparedRequest.rawLatex);
    if (preparedRuntime.kind === 'done') {
      return preparedRuntime.response;
    }

    return runExpressionActionHost({
      request,
      action,
      executionBudget,
      preparedRequest,
      preparedRuntime,
    });
  } catch {
    return {
      warnings: [],
      error: 'Expression could not be parsed or evaluated.',
    };
  }
}

function evaluateAtPoint(latex: string, variable: string, value: number) {
  const expr = ce.parse(latex) as BoxedLike;
  const substituted = expr.subs({ [variable]: value });
  const numeric = evaluateRealNumericExpression(substituted.json, substituted.latex);
  if (numeric.kind === 'success') {
    return {
      text: numeric.approxText,
      warning: null,
    };
  }

  if (numeric.kind === 'domain-error') {
    return {
      text: 'undefined',
      warning: 'Some sampled rows were outside the real domain and are shown as undefined.',
    };
  }

  const evaluated = substituted.evaluate();
  const numericFallback = evaluated.N?.() ?? evaluated;
  const approxText = latexToApproxText(numericFallback.latex);
  if (!approxText || approxText.includes('i') || approxText.includes('NaN')) {
    return {
      text: 'undefined',
      warning: 'Some sampled rows were outside the real domain and are shown as undefined.',
    };
  }

  return {
    text: approxText,
    warning: null,
  };
}

export function buildTable(request: TableRequest): TableResponse {
  const primaryCanonical = canonicalizeMathInput(request.primaryExpression.latex, {
    mode: 'table',
    screenHint: 'table',
  });
  const secondaryCanonical = request.secondaryExpression?.latex
    ? canonicalizeMathInput(request.secondaryExpression.latex, {
        mode: 'table',
        screenHint: 'table',
      })
    : null;
  const primaryLatex = primaryCanonical.ok
    ? primaryCanonical.canonicalLatex
    : request.primaryExpression.latex;
  const secondaryLatex = secondaryCanonical?.ok
    ? secondaryCanonical.canonicalLatex
    : request.secondaryExpression?.latex;

  if (!primaryLatex.trim()) {
    return {
      headers: [],
      rows: [],
      warnings: [],
      error: 'Enter f(x) before building a table.',
    };
  }

  if (request.step <= 0) {
    return {
      headers: [],
      rows: [],
      warnings: [],
      error: 'Step size must be greater than zero.',
    };
  }

  const estimatedRows = Math.floor((request.end - request.start) / request.step) + 1;
  if (estimatedRows <= 0 || estimatedRows > 40) {
    return {
      headers: [],
      rows: [],
      warnings: [],
      error: 'Choose a range that produces between 1 and 40 rows.',
    };
  }

  try {
    const warningSet = new Set<string>();
    const rows = Array.from({ length: estimatedRows }, (_, index) => {
      const x = request.start + request.step * index;
      const primary = evaluateAtPoint(primaryLatex, request.variable, x);
      const secondary = secondaryLatex
        ? evaluateAtPoint(secondaryLatex, request.variable, x)
        : null;
      if (primary.warning) {
        warningSet.add(primary.warning);
      }
      if (secondary?.warning) {
        warningSet.add(secondary.warning);
      }
      return {
        x: formatApproxNumber(x),
        primary: primary.text,
        secondary: secondaryLatex
          ? secondary?.text
          : undefined,
      };
    });

    const headers = [
      request.variable,
      primaryLatex,
      ...(secondaryLatex ? [secondaryLatex] : []),
    ];

    return {
      headers,
      rows,
      warnings: [...warningSet],
    };
  } catch {
    return {
      headers: [],
      rows: [],
      warnings: [],
      error: 'The table formulas could not be evaluated.',
    };
  }
}
