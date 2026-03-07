import {
  ComputeEngine,
  expand,
  factor,
} from '@cortex-js/compute-engine';
import type {
  CalculateAction,
  EquationAction,
  EvaluateRequest,
  EvaluateResponse,
  TableRequest,
  TableResponse,
} from '../types/calculator';
import {
  latexToApproxText,
  solutionsToLatex,
} from './format';
import { resolveCalculusEvaluation } from './calculus-eval';
import { canonicalizeMathInput } from './input-canonicalization';
import { rewriteDiscreteOperators } from './discrete-eval';
import { getResultGuardError } from './result-guard';
import { factorMathJson } from './symbolic-factor';
import { runFactoringEngine } from './symbolic-engine/orchestrator';
import { parsePartialDerivativeLatex, resolvePartialDerivative } from './symbolic-engine/partials';
import { normalizeExactRationalNode } from './symbolic-engine/rational';

export type SymbolicAction =
  | CalculateAction
  | EquationAction;

const ce = new ComputeEngine();
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);

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

function containsPiSymbol(node: unknown): boolean {
  if (typeof node === 'string') {
    return node === 'Pi';
  }

  if (isMathJsonArray(node)) {
    return node.some((child) => containsPiSymbol(child));
  }

  return false;
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
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
    && !containsPiSymbol(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
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

export function runExpressionAction(
  request: EvaluateRequest,
  action: SymbolicAction,
): EvaluateResponse {
  const canonicalized = canonicalizeMathInput(request.document.latex, {
    mode: request.mode,
    screenHint: action === 'solve' ? 'symbolic' : 'standard',
  });
  const rawLatex = (canonicalized.ok ? canonicalized.canonicalLatex : request.document.latex).trim();
  if (!rawLatex) {
    return {
      warnings: [],
      error: 'Enter an expression first.',
    };
  }

  if (action === 'evaluate' && isExplicitNegativeFactorial(rawLatex)) {
    return {
      warnings: [],
      error: 'Factorial is defined only for non-negative integers in this milestone.',
    };
  }

  if (action === 'evaluate') {
    const partial = parsePartialDerivativeLatex(rawLatex);
    if (partial) {
      const resolved = resolvePartialDerivative(partial);
      if (resolved.kind === 'error') {
        return {
          warnings: [],
          error: resolved.error,
        };
      }

      return {
        exactLatex: resolved.exactLatex,
        approxText: latexToApproxText(resolved.exactLatex),
        normalizedMathJson: request.document.mathJson,
        warnings: [],
        resultOrigin: 'symbolic-engine',
      };
    }
  }

  try {
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
        warnings: prepared.warnings,
        error: prepared.error,
      };
    }
    const expr = prepared.expr;

    const rational =
      action === 'simplify' || action === 'factor'
        ? normalizeExactRationalNode(expr.json, action)
        : null;
    if (rational) {
      const exactExpr = ce.box(rational.normalizedNode as Parameters<typeof ce.box>[0]) as BoxedLike;
      const approx = numericExpression(exactExpr);
      const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
      if (guardError) {
        return {
          warnings: prepared.warnings,
          error: guardError,
          exactSupplementLatex: rational.exactSupplementLatex,
        };
      }

      return {
        exactLatex: rational.normalizedLatex,
        exactSupplementLatex: rational.exactSupplementLatex,
        approxText: latexToApproxText(approx?.latex),
        normalizedMathJson: rational.normalizedNode,
        warnings: prepared.warnings,
        resultOrigin: 'symbolic-engine',
      };
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

    const exact = exactExpression(expr, action);
    if (action === 'evaluate') {
      const calculus = resolveCalculusEvaluation(expr, exact, request.calculusOptions);
      if (calculus.kind === 'error') {
        return {
          warnings: [...prepared.warnings, ...calculus.warnings],
          error: calculus.error,
        };
      }

      if (calculus.kind === 'handled') {
        const guardError = getResultGuardError(calculus.exactLatex, calculus.approxText);
        if (guardError) {
          return {
            warnings: [...prepared.warnings, ...calculus.warnings],
            error: guardError,
          };
        }

        return {
          exactLatex: calculus.exactLatex,
          approxText: calculus.approxText,
          normalizedMathJson: expr.json,
          warnings: [...prepared.warnings, ...calculus.warnings],
          resultOrigin: calculus.resultOrigin,
        };
      }
    }

    const factorOutcome =
      action === 'factor'
      && (exact?.latex ?? expr.latex) === expr.latex
        ? runFactoringEngine(rawLatex)
        : undefined;
    const symbolicFactorSucceeded =
      factorOutcome?.kind === 'success' && factorOutcome.strategy !== 'none';
    const fallbackExact = factorOutcome?.kind === 'success'
      && factorOutcome.strategy !== 'none'
      ? factorMathJson(expr.json)
      : undefined;
    const exactExpr = fallbackExact
      ? (ce.box(fallbackExact as Parameters<typeof ce.box>[0]) as BoxedLike)
      : exact;
    const approx = numericExpression(exactExpr);
    const guardError = getResultGuardError(approx?.latex, exactExpr?.latex);
    if (guardError) {
      return {
        warnings: prepared.warnings,
        error: guardError,
      };
    }

    return {
      exactLatex: exactExpr?.latex ?? expr.latex,
      approxText: latexToApproxText(approx?.latex),
      normalizedMathJson: expr.json,
      warnings:
        action === 'factor' && (exactExpr?.latex ?? expr.latex) === expr.latex
          ? ['No simpler factorization was found for this expression.']
          : action === 'factor' && symbolicFactorSucceeded
            ? [`Factored via ${factorOutcome.strategy!.replaceAll('-', ' ')}.`]
            : prepared.warnings,
      resultOrigin:
        action === 'factor' && symbolicFactorSucceeded
          ? 'symbolic-engine'
          : undefined,
    };
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
  const evaluated = substituted.evaluate();
  const numeric = evaluated.N?.() ?? evaluated;
  return latexToApproxText(numeric.latex) ?? 'undefined';
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
    const rows = Array.from({ length: estimatedRows }, (_, index) => {
      const x = request.start + request.step * index;
      return {
        x: `${x}`,
        primary: evaluateAtPoint(primaryLatex, request.variable, x),
        secondary: secondaryLatex
          ? evaluateAtPoint(secondaryLatex, request.variable, x)
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
      warnings: [],
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
