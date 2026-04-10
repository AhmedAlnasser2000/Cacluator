import { ComputeEngine } from '@cortex-js/compute-engine';
import type { TransformBadge } from '../../types/calculator';
import { mergeExactSupplementLatex } from '../exact-supplements';
import { normalizeAst } from '../symbolic-engine/normalize';
import {
  boxLatex,
  flattenAdd,
  isNodeArray,
  termKey,
} from '../symbolic-engine/patterns';
import { normalizeExactPowerLogNode } from '../symbolic-engine/power-log';
import { normalizeExactRadicalNode, applyConjugateTransformNode } from '../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../symbolic-engine/rational';

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

type ParsedEquationNode = {
  left: unknown;
  right: unknown;
};

type TransformSideResult = {
  latex: string;
  supplement?: string[];
};

type TransformDescriptor = {
  action: AlgebraTransformAction;
  label: TransformBadge;
  sourceSupportsExplicitTransform: (latex: string) => boolean;
  applyExpression: (node: unknown) => AlgebraTransformResult | null;
  applyEquation: (left: unknown, right: unknown) => AlgebraTransformResult | null;
};

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

function parseEquationNode(latex: string): ParsedEquationNode | null {
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

function supportsPowerSource(latex: string) {
  return latex.includes('^');
}

function supportsRootSource(latex: string) {
  return latex.includes('\\sqrt');
}

function supportsChangeBaseSource(latex: string) {
  return /\\log_\{/.test(latex);
}

function supportsAnySource() {
  return true;
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

function rewriteEquationSideAsRoot(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-root');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function rewriteEquationSideAsPower(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-power');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function changeEquationSideBase(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'change-base');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    supplement: normalized.exactSupplementLatex,
  };
}

function combineEquationSideFractions(node: unknown): TransformSideResult | null {
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

function cancelEquationSideFactors(node: unknown): TransformSideResult | null {
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

function rationalizeEquationSide(node: unknown): TransformSideResult | null {
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

function conjugateEquationSide(node: unknown): TransformSideResult | null {
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

function buildTwoSideEquationResult(
  left: unknown,
  right: unknown,
  leftResult: TransformSideResult | null,
  rightResult: TransformSideResult | null,
  transformBadges: TransformBadge[],
  transformSummaryText: string,
  transformSummaryLatex?: string,
): AlgebraTransformResult | null {
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges,
    transformSummaryText,
    transformSummaryLatex,
  };
}

function rewriteAsRootEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    rewriteEquationSideAsRoot(left),
    rewriteEquationSideAsRoot(right),
    ['Rewrite as Root'],
    'Rewrote supported rational exponents as exact root notation',
  );
}

function rewriteAsPowerEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    rewriteEquationSideAsPower(left),
    rewriteEquationSideAsPower(right),
    ['Rewrite as Power'],
    'Rewrote supported roots as exact rational exponents',
  );
}

function changeBaseEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    changeEquationSideBase(left),
    changeEquationSideBase(right),
    ['Change Base'],
    'Rewrote supported explicit-base logs with exact natural-log change of base',
  );
}

function combineFractionsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    combineEquationSideFractions(left),
    combineEquationSideFractions(right),
    ['Combine Fractions'],
    'Combined supported fractions on each side into exact rational form',
  );
}

function cancelFactorsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    cancelEquationSideFactors(left),
    cancelEquationSideFactors(right),
    ['Cancel Factors'],
    'Canceled supported common factors within each side of the equation',
  );
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
  return buildTwoSideEquationResult(
    left,
    right,
    rationalizeEquationSide(left),
    rationalizeEquationSide(right),
    ['Rationalize'],
    'Rationalized the supported radical denominator inside the equation',
  );
}

function conjugateEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    conjugateEquationSide(left),
    conjugateEquationSide(right),
    ['Conjugate'],
    'Applied the bounded conjugate transform inside the equation',
  );
}

const TRANSFORM_DESCRIPTORS: readonly TransformDescriptor[] = [
  {
    action: 'rewriteAsRoot',
    label: 'Rewrite as Root',
    sourceSupportsExplicitTransform: supportsPowerSource,
    applyExpression: rewriteExpressionAsRoot,
    applyEquation: rewriteAsRootEquation,
  },
  {
    action: 'rewriteAsPower',
    label: 'Rewrite as Power',
    sourceSupportsExplicitTransform: supportsRootSource,
    applyExpression: rewriteExpressionAsPower,
    applyEquation: rewriteAsPowerEquation,
  },
  {
    action: 'changeBase',
    label: 'Change Base',
    sourceSupportsExplicitTransform: supportsChangeBaseSource,
    applyExpression: changeExpressionBase,
    applyEquation: changeBaseEquation,
  },
  {
    action: 'combineFractions',
    label: 'Combine Fractions',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: combineFractionsExpression,
    applyEquation: combineFractionsEquation,
  },
  {
    action: 'cancelFactors',
    label: 'Cancel Factors',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: cancelFactorsExpression,
    applyEquation: cancelFactorsEquation,
  },
  {
    action: 'useLCD',
    label: 'Use LCD',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: rewriteWithLcdExpression,
    applyEquation: rewriteWithLcdEquation,
  },
  {
    action: 'rationalize',
    label: 'Rationalize',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: rationalizeExpression,
    applyEquation: rationalizeEquation,
  },
  {
    action: 'conjugate',
    label: 'Conjugate',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: conjugateExpression,
    applyEquation: conjugateEquation,
  },
] as const;

const TRANSFORM_DESCRIPTOR_MAP: Record<AlgebraTransformAction, TransformDescriptor> =
  TRANSFORM_DESCRIPTORS.reduce(
    (map, descriptor) => ({
      ...map,
      [descriptor.action]: descriptor,
    }),
    {} as Record<AlgebraTransformAction, TransformDescriptor>,
  );

function getTransformDescriptor(action: AlgebraTransformAction) {
  return TRANSFORM_DESCRIPTOR_MAP[action];
}

export function listTransformCoreActions(): AlgebraTransformAction[] {
  return TRANSFORM_DESCRIPTORS.map((descriptor) => descriptor.action);
}

export function getTransformCoreLabel(action: AlgebraTransformAction) {
  return getTransformDescriptor(action).label;
}

export function getEligibleExpressionTransformsForLatex(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return TRANSFORM_DESCRIPTORS
    .filter((descriptor) => descriptor.sourceSupportsExplicitTransform(latex))
    .filter((descriptor) => {
      const result = descriptor.applyExpression(parsed);
      return Boolean(
        result
        && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
      );
    })
    .map((descriptor) => descriptor.action);
}

export function applyExpressionTransformToLatex(
  latex: string,
  action: AlgebraTransformAction,
) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return null;
  }

  return getTransformDescriptor(action).applyExpression(parsed);
}

export function getEligibleEquationTransformsForLatex(latex: string) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return TRANSFORM_DESCRIPTORS
    .filter((descriptor) => descriptor.sourceSupportsExplicitTransform(latex))
    .filter((descriptor) => {
      const result = descriptor.applyEquation(equation.left, equation.right);
      return Boolean(
        result
        && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
      );
    })
    .map((descriptor) => descriptor.action);
}

export function applyEquationTransformToLatex(
  latex: string,
  action: AlgebraTransformAction,
) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return null;
  }

  return getTransformDescriptor(action).applyEquation(equation.left, equation.right);
}
