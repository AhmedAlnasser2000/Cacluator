import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  complexSolutionsToApproxText,
  complexSolutionsToLatex,
  formatApproxNumber,
  formatNumber,
} from '../format';
import {
  applyEquationTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../algebra-transform';
import { runExpressionAction } from '../math-engine';
import { analyzeLatex, isRelationalOperator } from '../math-analysis';
import { runSharedEquationSolve } from '../equation/shared-solve';
import { planMathExecution } from '../semantic-planner';
import { normalizeExactPowerLogNode } from '../symbolic-engine/power-log';
import { solveLinearSystem } from '../matrix';
import { solveBoundedPolynomialEquationAst } from '../polynomial-factor-solve';
import { solvePolynomialRoots } from '../polynomial-roots';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationScreen,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
  PolynomialEquationView,
  ResultOrigin,
  SolveDomainConstraint,
} from '../../types/calculator';

type PolynomialDegree = 2 | 3 | 4;

type PolynomialMeta = {
  degree: PolynomialDegree;
  title: string;
  coefficientLabels: string[];
};

const ce = new ComputeEngine();

export const POLYNOMIAL_VIEW_META: Record<PolynomialEquationView, PolynomialMeta> = {
  quadratic: {
    degree: 2,
    title: 'Quadratic',
    coefficientLabels: ['a', 'b', 'c'],
  },
  cubic: {
    degree: 3,
    title: 'Cubic',
    coefficientLabels: ['a', 'b', 'c', 'd'],
  },
  quartic: {
    degree: 4,
    title: 'Quartic',
    coefficientLabels: ['a', 'b', 'c', 'd', 'e'],
  },
};

export const DEFAULT_POLYNOMIAL_COEFFICIENTS: Record<PolynomialEquationView, number[]> = {
  quadratic: [1, -5, 6],
  cubic: [1, -6, 11, -6],
  quartic: [1, 0, -5, 0, 4],
};

type RunEquationModeRequest = {
  equationScreen: EquationScreen;
  equationLatex: string;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  system2: number[][];
  system3: number[][];
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
};

function toOutcome(
  title: string,
  exactLatex?: string,
  exactSupplementLatex?: string[],
  approxText?: string,
  warnings: string[] = [],
  error?: string,
  resultOrigin?: ResultOrigin,
): DisplayOutcome {
  if (error) {
    return {
      kind: 'error',
      title,
      error,
      warnings,
      exactLatex,
      exactSupplementLatex,
      approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex,
    exactSupplementLatex,
    approxText,
    warnings,
    resultOrigin,
  };
}

function withPlannerMetadata(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
  plannerBadges: PlannerBadge[] | undefined,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const mergedPlannerBadges = [
    ...(plannerBadges ?? []),
    ...((outcome.plannerBadges ?? []).filter((badge) => !(plannerBadges ?? []).includes(badge))),
  ];

  return {
    ...outcome,
    resolvedInputLatex:
      outcome.resolvedInputLatex
      ?? (resolvedLatex !== originalLatex.trim() ? resolvedLatex : undefined),
    plannerBadges: mergedPlannerBadges.length > 0 ? mergedPlannerBadges : undefined,
  };
}

function solveSystem(source: number[][], size: 2 | 3): DisplayOutcome {
  const coefficients = source.map((row) => row.slice(0, size));
  const constants = source.map((row) => row[size]);
  const solution = solveLinearSystem(coefficients, constants);

  if (!solution) {
    return {
      kind: 'error',
      title: `${size}x${size}`,
      error: 'The linear system does not have a unique solution.',
      warnings: [],
    };
  }

  const exactLatex = solution
    .map((value, index) => `${['x', 'y', 'z'][index]}=${formatNumber(value, 4)}`)
    .join(',\\;');
  const approxText = solution
    .map((value, index) => `${['x', 'y', 'z'][index]} ~= ${formatApproxNumber(value)}`)
    .join(', ');

  return {
    kind: 'success',
    title: `${size}x${size}`,
    exactLatex,
    approxText,
    warnings: [],
  };
}

function normalizedCoefficients(coefficients: number[], expectedLength: number) {
  return Array.from({ length: expectedLength }, (_, index) => {
    const value = coefficients[index];
    return Number.isFinite(value) ? value : 0;
  });
}

function containsNonEqualityRelation(latex: string) {
  return /\\(?:le|leq|ge|geq|ne|neq)(?![A-Za-z])|[<>]|[≤≥≠]/.test(latex);
}

function termLatex(coefficient: number, power: number) {
  const absoluteValue = Math.abs(coefficient);
  const coefficientText = formatNumber(absoluteValue, 6);

  if (power === 0) {
    return coefficientText;
  }

  if (absoluteValue === 1) {
    return power === 1 ? 'x' : `x^{${power}}`;
  }

  return power === 1 ? `${coefficientText}x` : `${coefficientText}x^{${power}}`;
}

export function buildPolynomialEquationLatex(
  view: PolynomialEquationView,
  coefficients: number[],
) {
  const { degree } = POLYNOMIAL_VIEW_META[view];
  const normalized = normalizedCoefficients(coefficients, degree + 1);
  const terms = normalized.reduce<string[]>((currentTerms, coefficient, index) => {
    if (Math.abs(coefficient) < 1e-10) {
      return currentTerms;
    }

    const sign = coefficient < 0 ? '-' : '+';
    const power = degree - index;
    const body = termLatex(coefficient, power);

    if (currentTerms.length === 0) {
      return [`${sign === '-' ? '-' : ''}${body}`];
    }

    return [...currentTerms, `${sign}${body}`];
  }, []);

  const leftSide = terms.length > 0 ? terms.join('') : '0';
  return `${leftSide}=0`;
}

export function equationInputLatexForScreen(
  equationScreen: EquationScreen,
  equationLatex: string,
  quadraticCoefficients: number[],
  cubicCoefficients: number[],
  quarticCoefficients: number[],
) {
  if (equationScreen === 'symbolic') {
    return equationLatex;
  }

  if (equationScreen === 'quadratic') {
    return buildPolynomialEquationLatex('quadratic', quadraticCoefficients);
  }

  if (equationScreen === 'cubic') {
    return buildPolynomialEquationLatex('cubic', cubicCoefficients);
  }

  if (equationScreen === 'quartic') {
    return buildPolynomialEquationLatex('quartic', quarticCoefficients);
  }

  return '';
}

function solvePolynomial(
  screen: PolynomialEquationView,
  coefficients: number[],
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
): DisplayOutcome {
  const meta = POLYNOMIAL_VIEW_META[screen];
  const normalized = normalizedCoefficients(coefficients, meta.degree + 1);

  if (Math.abs(normalized[0]) < 1e-10) {
    return {
      kind: 'error',
      title: meta.title,
      error: `Set ${meta.coefficientLabels[0]} to a non-zero value for the ${meta.title.toLowerCase()} equation.`,
      warnings: [],
    };
  }

  const polynomialLatex = buildPolynomialEquationLatex(screen, normalized);
  if (screen === 'cubic' || screen === 'quartic') {
    const bounded = solveBoundedPolynomialEquationAst(ce.parse(polynomialLatex).json, 'x');
    if (bounded) {
      return toOutcome(
        meta.title,
        bounded.exactLatex,
        undefined,
        bounded.approxText,
        [],
        undefined,
        'symbolic',
      );
    }
  }

  const response = screen === 'quadratic'
    ? runExpressionAction(
      {
        mode: 'equation',
        document: { latex: polynomialLatex },
        angleUnit,
        outputStyle,
        variables: { Ans: ansLatex },
      },
      'solve',
    )
    : {
      exactLatex: undefined,
      exactSupplementLatex: undefined,
      approxText: undefined,
      warnings: [] as string[],
      error: 'No bounded exact symbolic solution was found.',
    };

  if (screen === 'quadratic' && !response.error && response.exactLatex) {
    return toOutcome(
      meta.title,
      response.exactLatex,
      response.exactSupplementLatex,
      response.approxText,
      response.warnings,
      undefined,
      'symbolic',
    );
  }

  const numericRoots = solvePolynomialRoots({ coefficients: normalized });
  if (numericRoots.kind === 'error') {
    return {
      kind: 'error',
      title: meta.title,
      error: response.error ?? numericRoots.error,
      warnings: response.warnings,
    };
  }

  return {
    kind: 'success',
    title: meta.title,
    exactLatex: complexSolutionsToLatex('x', numericRoots.roots),
    approxText: complexSolutionsToApproxText('x', numericRoots.roots),
    warnings: ['Symbolic solve unavailable; showing numeric roots.'],
    resultOrigin: 'numeric-fallback',
  };
}

function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  numericInterval?: NumericSolveInterval,
): DisplayOutcome {
  if (containsNonEqualityRelation(equationLatex)) {
    return {
      kind: 'error',
      title: 'Solve',
      error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later milestone.',
      warnings: [],
    };
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return withPlannerMetadata(
      {
        kind: 'error',
        title: 'Solve',
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (
    isRelationalOperator(analysis.topLevelOperator)
    || containsNonEqualityRelation(equationLatex)
    || containsNonEqualityRelation(planner.resolvedLatex)
  ) {
    return withPlannerMetadata(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later milestone.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  if (analysis.kind !== 'equation') {
    return withPlannerMetadata(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Enter an equation containing x.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  if (!analysis.containsSymbolX) {
    return withPlannerMetadata(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode solves for x. Enter x in the equation.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  let sharedResolvedLatex = planner.resolvedLatex;
  let preprocessSupplementLatex: string[] | undefined;
  let preprocessDomainConstraints: SolveDomainConstraint[] | undefined;

  try {
    const preprocess = normalizeExactPowerLogNode(
      ce.parse(planner.resolvedLatex).json,
      'equation-preprocess',
    );
    if (
      preprocess
      && (
        preprocess.normalizedLatex.replace(/\s+/g, '') !== planner.resolvedLatex.replace(/\s+/g, '')
        || preprocess.exactSupplementLatex.length > 0
      )
    ) {
      sharedResolvedLatex = preprocess.normalizedLatex;
      preprocessSupplementLatex =
        preprocess.exactSupplementLatex.length > 0 ? preprocess.exactSupplementLatex : undefined;
      preprocessDomainConstraints =
        preprocess.conditionConstraints.length > 0 ? preprocess.conditionConstraints : undefined;
    }
  } catch {
    // Keep the original resolved equation when bounded preprocessing cannot parse cleanly.
  }

  return withPlannerMetadata(
    runSharedEquationSolve({
      originalLatex: equationLatex,
      resolvedLatex: sharedResolvedLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      numericInterval,
      domainConstraints: preprocessDomainConstraints,
      exactSupplementLatex: preprocessSupplementLatex,
    }),
    equationLatex,
    sharedResolvedLatex,
    planner.badges,
  );
}

type RunEquationAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  equationLatex: string;
  angleUnit: AngleUnit;
};

export function runEquationAlgebraTransform({
  action,
  equationLatex,
  angleUnit,
}: RunEquationAlgebraTransformRequest): DisplayOutcome {
  const title = getAlgebraTransformLabel(action);

  if (containsNonEqualityRelation(equationLatex)) {
    return {
      kind: 'error',
      title,
      error: 'Equation algebra transforms currently work only on = equations.',
      warnings: [],
    };
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);
  if (analysis.kind !== 'equation' || isRelationalOperator(analysis.topLevelOperator)) {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: 'Enter a symbolic = equation before using an explicit algebra transform.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  const result = applyEquationTransform(planner.resolvedLatex, action);
  if (!result) {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: 'No explicit algebra transform is available for this equation yet.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  return withPlannerMetadata(
    {
      kind: 'success',
      title,
      exactLatex: result.exactLatex,
      exactSupplementLatex:
        result.exactSupplementLatex && result.exactSupplementLatex.length > 0
          ? result.exactSupplementLatex
          : undefined,
      warnings: [],
      resultOrigin: 'symbolic-engine',
      transformBadges: result.transformBadges,
      transformSummaryText: result.transformSummaryText,
      transformSummaryLatex: result.transformSummaryLatex,
    },
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
  );
}

export function runEquationMode({
  equationScreen,
  equationLatex,
  quadraticCoefficients,
  cubicCoefficients,
  quarticCoefficients,
  system2,
  system3,
  angleUnit,
  outputStyle,
  ansLatex,
  numericInterval,
}: RunEquationModeRequest): DisplayOutcome {
  if (equationScreen === 'linear2') {
    return solveSystem(system2, 2);
  }

  if (equationScreen === 'linear3') {
    return solveSystem(system3, 3);
  }

  if (equationScreen === 'quadratic') {
    return solvePolynomial('quadratic', quadraticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'cubic') {
    return solvePolynomial('cubic', cubicCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'quartic') {
    return solvePolynomial('quartic', quarticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'symbolic') {
    return solveSymbolicEquation(equationLatex, angleUnit, outputStyle, ansLatex, numericInterval);
  }

  return {
    kind: 'error',
    title: 'Equation',
    error: 'Choose an equation tool before solving.',
    warnings: [],
  };
}
