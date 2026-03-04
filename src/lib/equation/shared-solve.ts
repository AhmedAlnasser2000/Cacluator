import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../math-engine';
import { matchBoundedTrigEquation } from '../trigonometry/equation-match';
import { matchTrigCall, matchTrigSquare, normalizeTrigAst } from '../trigonometry/normalize';
import { solveTrigEquation } from '../trigonometry/equations';
import type {
  AngleUnit,
  DisplayOutcome,
  OutputStyle,
  PlannerBadge,
} from '../../types/calculator';
import { isNodeArray } from '../symbolic-engine/patterns';

const ce = new ComputeEngine();

export type SharedSolveRequest = {
  originalLatex: string;
  resolvedLatex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
};

function successOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
): DisplayOutcome {
  return {
    kind: 'success',
    title,
    exactLatex,
    approxText,
    warnings,
    resultOrigin: 'symbolic',
    plannerBadges,
  };
}

function errorOutcome(
  title: string,
  error: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
): DisplayOutcome {
  return {
    kind: 'error',
    title,
    error,
    warnings,
    plannerBadges,
  };
}

function looksTrigShaped(latex: string) {
  return /\\(?:sin|cos|tan|arcsin|arccos|arctan)/.test(latex);
}

function requiresDeferredTrigRewrite(latex: string) {
  if (matchBoundedTrigEquation(latex)) {
    return false;
  }

  try {
    const normalized = normalizeTrigAst(ce.parse(latex).json);
    return containsDeferredTrigStructure(normalized);
  } catch {
    return /\\(?:sin|cos|tan)/.test(latex);
  }
}

function containsDeferredTrigStructure(node: unknown): boolean {
  if (matchTrigSquare(node)) {
    return true;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    const trigFactorCount = node.slice(1).filter((child) => matchTrigCall(child) !== null || matchTrigSquare(child) !== null).length;
    if (trigFactorCount >= 2) {
      return true;
    }
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.slice(1).some((child) => containsDeferredTrigStructure(child));
}

export function runSharedEquationSolve(request: SharedSolveRequest): DisplayOutcome {
  const symbolic = runExpressionAction(
    {
      mode: 'equation',
      document: { latex: request.resolvedLatex },
      angleUnit: request.angleUnit,
      outputStyle: request.outputStyle,
      variables: { Ans: request.ansLatex },
    },
    'solve',
  );

  if (!symbolic.error && symbolic.exactLatex) {
    return successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    );
  }

  if (looksTrigShaped(request.resolvedLatex)) {
    const trig = solveTrigEquation({
      equationLatex: request.resolvedLatex,
      variable: 'x',
      angleUnit: request.angleUnit,
    });

    if (!trig.error && trig.exactLatex) {
      return successOutcome(
        'Solve',
        trig.exactLatex,
        trig.approxText,
        trig.warnings,
        ['Trig Solve Backend'],
      );
    }

    if (requiresDeferredTrigRewrite(request.resolvedLatex)) {
      return errorOutcome(
        'Solve',
        'This equation requires a trig rewrite outside the supported pre-solve set for this milestone.',
        trig.warnings,
      );
    }
  }

  return errorOutcome(
    'Solve',
    symbolic.error ?? 'No symbolic solution was found for x.',
    symbolic.warnings,
  );
}
