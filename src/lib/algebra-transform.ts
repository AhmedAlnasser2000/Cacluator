import { ComputeEngine } from '@cortex-js/compute-engine';
import type { TransformBadge } from '../types/calculator';
import { mergeExactSupplementLatex } from './exact-supplements';
import { normalizeAst } from './symbolic-engine/normalize';
import {
  boxLatex,
  flattenAdd,
  isNodeArray,
  termKey,
} from './symbolic-engine/patterns';
import { normalizeExactPowerLogNode } from './symbolic-engine/power-log';
import { normalizeExactRadicalNode, applyConjugateTransformNode } from './symbolic-engine/radical';
import { normalizeExactRationalNode } from './symbolic-engine/rational';

const ce = new ComputeEngine();

export type AlgebraTransformAction =
  | 'rewriteAsRoot'
  | 'rewriteAsPower'
  | 'changeBase'
  | 'combineFractions'
  | 'cancelFactors'
  | 'useLCD'
  | 'rationalize'
  | 'conjugate';

export type AlgebraTransformResult = {
  exactLatex: string;
  exactSupplementLatex?: string[];
  transformBadges: TransformBadge[];
  transformSummaryText: string;
  transformSummaryLatex?: string;
};

const ACTION_LABELS: Record<AlgebraTransformAction, string> = {
  rewriteAsRoot: 'Rewrite as Root',
  rewriteAsPower: 'Rewrite as Power',
  changeBase: 'Change Base',
  combineFractions: 'Combine Fractions',
  cancelFactors: 'Cancel Factors',
  useLCD: 'Use LCD',
  rationalize: 'Rationalize',
  conjugate: 'Conjugate',
};

const ACTION_ORDER: AlgebraTransformAction[] = [
  'rewriteAsRoot',
  'rewriteAsPower',
  'changeBase',
  'combineFractions',
  'cancelFactors',
  'useLCD',
  'rationalize',
  'conjugate',
];

function hasAdditiveStructure(node: unknown) {
  return flattenAdd(normalizeAst(node)).length > 1;
}

function parseExpressionNode(latex: string) {
  try {
    return normalizeAst(ce.parse(latex).json);
  } catch {
    return null;
  }
}

function parseEquationNode(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed || !isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  return {
    left: normalizeAst(parsed[1]),
    right: normalizeAst(parsed[2]),
  };
}

function normalizeLatexForComparison(latex: string) {
  return latex.replace(/\s+/g, '');
}

function sourceSupportsExplicitTransform(latex: string, action: AlgebraTransformAction) {
  switch (action) {
    case 'rewriteAsRoot':
      return latex.includes('^');
    case 'rewriteAsPower':
      return latex.includes('\\sqrt');
    case 'changeBase':
      return /\\log_\{/.test(latex);
    default:
      return true;
  }
}

function rewriteExpressionAsRoot(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-root');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Rewrite as Root'],
    transformSummaryText: 'Rewrote the supported power form as exact root notation',
  };
}

function rewriteExpressionAsPower(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-power');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Rewrite as Power'],
    transformSummaryText: 'Rewrote the supported root form as an exact rational exponent',
  };
}

function changeExpressionBase(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'change-base');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Change Base'],
    transformSummaryText: 'Rewrote the logarithm using exact natural-log change of base',
  };
}

function combineFractionsExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Combine Fractions'],
    transformSummaryText: rational.denominatorLatex
      ? 'Combined fractions over LCD'
      : 'Combined fractions into one exact rational form',
    transformSummaryLatex: rational.denominatorLatex,
  };
}

function cancelFactorsExpression(node: unknown): AlgebraTransformResult | null {
  const factored = normalizeExactRationalNode(node, 'factor');
  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (!factored || !simplified) {
    return null;
  }

  if (termKey(factored.normalizedNode) === termKey(simplified.normalizedNode)) {
    return null;
  }

  return {
    exactLatex: simplified.normalizedLatex,
    exactSupplementLatex: simplified.exactSupplementLatex,
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Canceled supported common factors while preserving original exclusions',
  };
}

function rewriteWithLcdExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'lcd');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Use LCD'],
    transformSummaryText: rational.denominatorLatex
      ? 'Rewrote the expression over LCD'
      : 'Rewrote the expression over an exact common denominator',
    transformSummaryLatex: rational.denominatorLatex,
  };
}

function rationalizeExpression(node: unknown): AlgebraTransformResult | null {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    exactLatex: radical.normalizedLatex,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: radical.exactSupplementLatex, source: 'legacy' },
    ),
    transformBadges: ['Rationalize'],
    transformSummaryText: 'Rationalized the supported radical denominator exactly',
  };
}

function conjugateExpression(node: unknown): AlgebraTransformResult | null {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    exactLatex: conjugate.normalizedLatex,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: conjugate.exactSupplementLatex, source: 'legacy' },
    ),
    transformBadges: ['Conjugate'],
    transformSummaryText: 'Applied a conjugate to remove a square-root denominator',
  };
}

function applyExpressionTransformNode(
  node: unknown,
  action: AlgebraTransformAction,
): AlgebraTransformResult | null {
  switch (action) {
    case 'rewriteAsRoot':
      return rewriteExpressionAsRoot(node);
    case 'rewriteAsPower':
      return rewriteExpressionAsPower(node);
    case 'changeBase':
      return changeExpressionBase(node);
    case 'combineFractions':
      return combineFractionsExpression(node);
    case 'cancelFactors':
      return cancelFactorsExpression(node);
    case 'useLCD':
      return rewriteWithLcdExpression(node);
    case 'rationalize':
      return rationalizeExpression(node);
    case 'conjugate':
      return conjugateExpression(node);
    default:
      return null;
  }
}

function rewriteEquationSideAsRoot(node: unknown) {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-root');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function rewriteEquationSideAsPower(node: unknown) {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-power');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function changeEquationSideBase(node: unknown) {
  const normalized = normalizeExactPowerLogNode(node, 'change-base');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function combineEquationSideFractions(node: unknown) {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    latex: rational.normalizedLatex,
    supplement: rational.exactSupplementLatex,
  };
}

function cancelEquationSideFactors(node: unknown) {
  const factored = normalizeExactRationalNode(node, 'factor');
  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (!factored || !simplified) {
    return null;
  }

  if (termKey(factored.normalizedNode) === termKey(simplified.normalizedNode)) {
    return null;
  }

  return {
    latex: simplified.normalizedLatex,
    supplement: simplified.exactSupplementLatex,
  };
}

function rationalizeEquationSide(node: unknown) {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    latex: radical.normalizedLatex,
    supplement: mergeExactSupplementLatex(
      { latex: radical.exactSupplementLatex, source: 'legacy' },
    ),
  };
}

function conjugateEquationSide(node: unknown) {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    latex: conjugate.normalizedLatex,
    supplement: mergeExactSupplementLatex(
      { latex: conjugate.exactSupplementLatex, source: 'legacy' },
    ),
  };
}

function rewriteAsRootEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = rewriteEquationSideAsRoot(left);
  const rightResult = rewriteEquationSideAsRoot(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Rewrite as Root'],
    transformSummaryText: 'Rewrote supported rational exponents as exact root notation',
  };
}

function rewriteAsPowerEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = rewriteEquationSideAsPower(left);
  const rightResult = rewriteEquationSideAsPower(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Rewrite as Power'],
    transformSummaryText: 'Rewrote supported roots as exact rational exponents',
  };
}

function changeBaseEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = changeEquationSideBase(left);
  const rightResult = changeEquationSideBase(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Change Base'],
    transformSummaryText: 'Rewrote supported explicit-base logs with exact natural-log change of base',
  };
}

function combineFractionsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = combineEquationSideFractions(left);
  const rightResult = combineEquationSideFractions(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Combine Fractions'],
    transformSummaryText: 'Combined supported fractions on each side into exact rational form',
  };
}

function cancelFactorsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = cancelEquationSideFactors(left);
  const rightResult = cancelEquationSideFactors(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Canceled supported common factors within each side of the equation',
  };
}

function rewriteWithLcdEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const zeroForm = normalizeAst(['Add', left, ['Negate', right]]);
  const rational = normalizeExactRationalNode(zeroForm, 'lcd');
  if (!rational?.denominatorNode) {
    return null;
  }

  const exactLatex = `${rational.numeratorLatex}=0`;
  const originalLatex = `${boxLatex(left)}=${boxLatex(right)}`;
  if (exactLatex === originalLatex) {
    return null;
  }

  return {
    exactLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Use LCD'],
    transformSummaryText: rational.denominatorLatex
      ? 'Cleared the equation by multiplying through by LCD'
      : 'Cleared the equation with an exact LCD transform',
    transformSummaryLatex: rational.denominatorLatex,
  };
}

function rationalizeEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = rationalizeEquationSide(left);
  const rightResult = rationalizeEquationSide(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Rationalize'],
    transformSummaryText: 'Rationalized the supported radical denominator inside the equation',
  };
}

function conjugateEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = conjugateEquationSide(left);
  const rightResult = conjugateEquationSide(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges: ['Conjugate'],
    transformSummaryText: 'Applied the bounded conjugate transform inside the equation',
  };
}

function applyEquationTransformNode(
  left: unknown,
  right: unknown,
  action: AlgebraTransformAction,
): AlgebraTransformResult | null {
  switch (action) {
    case 'rewriteAsRoot':
      return rewriteAsRootEquation(left, right);
    case 'rewriteAsPower':
      return rewriteAsPowerEquation(left, right);
    case 'changeBase':
      return changeBaseEquation(left, right);
    case 'combineFractions':
      return combineFractionsEquation(left, right);
    case 'cancelFactors':
      return cancelFactorsEquation(left, right);
    case 'useLCD':
      return rewriteWithLcdEquation(left, right);
    case 'rationalize':
      return rationalizeEquation(left, right);
    case 'conjugate':
      return conjugateEquation(left, right);
    default:
      return null;
  }
}

export function getAlgebraTransformLabel(action: AlgebraTransformAction) {
  return ACTION_LABELS[action];
}

export function getEligibleExpressionTransforms(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return ACTION_ORDER.filter((action) => {
    if (!sourceSupportsExplicitTransform(latex, action)) {
      return false;
    }
    const result = applyExpressionTransformNode(parsed, action);
    return Boolean(
      result
      && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
    );
  });
}

export function applyExpressionTransform(latex: string, action: AlgebraTransformAction) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return null;
  }

  return applyExpressionTransformNode(parsed, action);
}

export function getEligibleEquationTransforms(latex: string) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return ACTION_ORDER.filter((action) => {
    if (!sourceSupportsExplicitTransform(latex, action)) {
      return false;
    }
    const result = applyEquationTransformNode(equation.left, equation.right, action);
    return Boolean(
      result
      && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
    );
  });
}

export function applyEquationTransform(latex: string, action: AlgebraTransformAction) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return null;
  }

  return applyEquationTransformNode(equation.left, equation.right, action);
}
