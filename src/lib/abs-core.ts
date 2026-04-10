import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AbsoluteValueEquationFamily,
  AbsoluteValueEquationFamilyKind,
  AbsoluteValueExactScalar,
  AbsoluteValueNormalizationResult,
  AbsoluteValueTargetDescriptor,
  AngleUnit,
  SolveDomainConstraint,
} from '../types/calculator';
import {
  buildConditionSupplementLatex,
  detectSingleVariable,
  expressionHasVariable,
  matchSupportedRadical,
  matchSupportedRationalPower,
  recognizePerfectSquareRadicand,
} from './radical-core';
import { createBranchSet, createTwoBranchSet } from './algebra/branch-core';
import {
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
} from './polynomial-core';
import { solveBoundedPolynomialEquationAst } from './polynomial-factor-solve';
import { evaluateLatexAt } from './equation/domain-guards';
import { normalizeAst } from './symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from './symbolic-engine/patterns';

const ce = new ComputeEngine();
const ABS_NUMERIC_EPSILON = 1e-8;
const ABS_PLACEHOLDER_SYMBOL = 'calcwizabsu';
const ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL = 'calcwizabst';
const ABS_OUTER_NON_PERIODIC_MAX_TRANSFORMS = 2;

export type RecognizedAbsoluteValueEquationFamily = AbsoluteValueEquationFamily & {
  normalizationKind: 'direct' | 'outer-polynomial' | 'outer-nonperiodic';
  blockOnGuidedBranchError?: boolean;
  emptyBranchError?: string;
};

type AbsoluteValueExpressionSupportKind =
  | 'constant'
  | 'affine'
  | 'polynomial'
  | 'radical'
  | 'rational-power'
  | 'generic-expression';

function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
}

function normalizeScalar(numerator: number, denominator: number): AbsoluteValueExactScalar | null {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
    return null;
  }

  if (numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

function readExactScalar(node: unknown): AbsoluteValueExactScalar | null {
  if (typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && Number.isInteger(node[1])
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] !== 0
  ) {
    const sign = node[2] < 0 ? -1 : 1;
    const numerator = sign * node[1];
    const denominator = Math.abs(node[2]);
    return { numerator, denominator };
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalar(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

function buildScalarNode(value: AbsoluteValueExactScalar): unknown {
  if (value.denominator === 1) {
    return value.numerator;
  }

  return ['Rational', value.numerator, value.denominator];
}

function negateNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode({
      numerator: -scalar.numerator,
      denominator: scalar.denominator,
    });
  }

  return simplifyNode(['Negate', node]);
}

function negateScalar(value: AbsoluteValueExactScalar): AbsoluteValueExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

function isZeroScalar(value: AbsoluteValueExactScalar) {
  return value.numerator === 0;
}

function isUnitScalar(value: AbsoluteValueExactScalar) {
  return value.numerator === value.denominator;
}

function multiplyScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divideScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function addScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function buildSumNode(left: unknown, right: unknown) {
  return simplifyNode(['Add', left, right]);
}

function buildDifferenceNode(left: unknown, right: unknown) {
  return buildSumNode(left, negateNode(right));
}

function buildQuotientNode(numerator: unknown, denominator: unknown) {
  return simplifyNode(['Divide', numerator, denominator]);
}

function buildScaledNode(node: unknown, scalar: AbsoluteValueExactScalar) {
  if (isZeroScalar(scalar)) {
    return 0;
  }

  if (isUnitScalar(scalar)) {
    return node;
  }

  return simplifyNode(['Multiply', buildScalarNode(scalar), node]);
}

function parsePositiveEvenInteger(node: unknown) {
  const scalar = readExactScalar(normalizeAst(node));
  if (!scalar || scalar.denominator !== 1 || scalar.numerator <= 0 || scalar.numerator % 2 !== 0) {
    return null;
  }

  return scalar.numerator;
}

function stripNegation(node: unknown): unknown | null {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    return normalized[1];
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply' && normalized.length >= 3) {
    const children = normalized.slice(1);
    const negativeScalars = children.filter((child) => {
      const scalar = readExactScalar(child);
      return Boolean(scalar && scalar.numerator < 0);
    });

    if (negativeScalars.length !== 1) {
      return null;
    }

    const rebuiltChildren = children.flatMap((child) => {
      if (child !== negativeScalars[0]) {
        return [child];
      }

      const scalar = readExactScalar(child);
      if (!scalar) {
        return [child];
      }

      const positiveScalar = {
        numerator: Math.abs(scalar.numerator),
        denominator: scalar.denominator,
      };

      return positiveScalar.numerator === positiveScalar.denominator
        ? []
        : [buildScalarNode(positiveScalar)];
    });

    if (rebuiltChildren.length === 0) {
      return 1;
    }

    if (rebuiltChildren.length === 1) {
      return rebuiltChildren[0];
    }

    return simplifyNode(['Multiply', ...rebuiltChildren]);
  }

  return null;
}

function containsAbsoluteValue(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Abs') {
    return true;
  }

  return node.slice(1).some((child) => containsAbsoluteValue(child));
}

function detectEquationVariable(...nodes: unknown[]) {
  const variables = new Set<string>();

  const collectVariables = (node: unknown) => {
    if (typeof node === 'string') {
      if (node !== 'Pi' && node !== 'ExponentialE') {
        variables.add(node);
      }
      return;
    }

    if (!isNodeArray(node) || node.length === 0) {
      return;
    }

    for (const child of node.slice(1)) {
      collectVariables(child);
    }
  };

  for (const node of nodes) {
    collectVariables(node);
  }

  return variables.size === 1 ? [...variables][0] : 'x';
}

function collectEquationVariables(node: unknown, variables: Set<string> = new Set<string>()) {
  if (typeof node === 'string') {
    if (node !== 'Pi' && node !== 'ExponentialE') {
      variables.add(node);
    }
    return variables;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return variables;
  }

  for (const child of node.slice(1)) {
    collectEquationVariables(child, variables);
  }

  return variables;
}

function containsPlaceholder(node: unknown, placeholder: string): boolean {
  if (node === placeholder) {
    return true;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).some((child) => containsPlaceholder(child, placeholder));
}

type PlaceholderLinearExpression = {
  a: AbsoluteValueExactScalar;
  remainder: unknown;
};

function parseLinearPlaceholder(node: unknown, placeholder: string): PlaceholderLinearExpression | null {
  const normalized = normalizeAst(node);
  if (normalized === placeholder) {
    return {
      a: { numerator: 1, denominator: 1 },
      remainder: 0,
    };
  }

  const scalar = readExactScalar(normalized);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      remainder: buildScalarNode(scalar),
    };
  }

  if (!containsPlaceholder(normalized, placeholder)) {
    return {
      a: { numerator: 0, denominator: 1 },
      remainder: normalized,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseLinearPlaceholder(normalized[1], placeholder);
    if (!child) {
      return null;
    }

    return {
      a: negateScalar(child.a),
      remainder: negateNode(child.remainder),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: AbsoluteValueExactScalar = { numerator: 0, denominator: 1 };
    let remainder: unknown = 0;

    for (const child of normalized.slice(1)) {
      const parsed = parseLinearPlaceholder(child, placeholder);
      if (!parsed) {
        return null;
      }

      const nextCoefficient = addScalar(coefficient, parsed.a);
      if (!nextCoefficient) {
        return null;
      }
      coefficient = nextCoefficient;
      remainder = buildSumNode(remainder, parsed.remainder);
    }

    return {
      a: coefficient,
      remainder,
    };
  }

  if (normalized[0] === 'Multiply') {
    let scalarFactor: AbsoluteValueExactScalar = { numerator: 1, denominator: 1 };
    let linearChild: PlaceholderLinearExpression | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalar(child);
      if (childScalar) {
        const nextFactor = multiplyScalar(scalarFactor, childScalar);
        if (!nextFactor) {
          return null;
        }
        scalarFactor = nextFactor;
        continue;
      }

      const parsed = parseLinearPlaceholder(child, placeholder);
      if (!parsed || linearChild) {
        return null;
      }
      linearChild = parsed;
    }

    if (!linearChild) {
      return {
        a: { numerator: 0, denominator: 1 },
        remainder: buildScalarNode(scalarFactor),
      };
    }

    const nextA = multiplyScalar(scalarFactor, linearChild.a);
    if (!nextA) {
      return null;
    }

    return {
      a: nextA,
      remainder: buildScaledNode(linearChild.remainder, scalarFactor),
    };
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const denominatorScalar = readExactScalar(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorLinear = parseLinearPlaceholder(normalized[1], placeholder);
    if (!numeratorLinear) {
      return null;
    }

    const nextA = divideScalar(numeratorLinear.a, denominatorScalar);
    if (!nextA) {
      return null;
    }

    return {
      a: nextA,
      remainder: buildQuotientNode(numeratorLinear.remainder, buildScalarNode(denominatorScalar)),
    };
  }

  return null;
}

function replaceFirstMatch(node: unknown, targetKey: string, replacement: unknown): { node: unknown; replaced: boolean } {
  if (termKey(node) === targetKey) {
    return {
      node: replacement,
      replaced: true,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      replaced: false,
    };
  }

  const rebuilt: unknown[] = [node[0]];
  let replaced = false;
  for (const child of node.slice(1)) {
    if (replaced) {
      rebuilt.push(child);
      continue;
    }

    const next = replaceFirstMatch(child, targetKey, replacement);
    rebuilt.push(next.node);
    replaced ||= next.replaced;
  }

  return {
    node: rebuilt,
    replaced,
  };
}

function replaceAllMatches(
  node: unknown,
  targetKey: string,
  replacement: unknown,
): { node: unknown; replacementCount: number } {
  if (termKey(node) === targetKey) {
    return {
      node: replacement,
      replacementCount: 1,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      replacementCount: 0,
    };
  }

  let replacementCount = 0;
  const rebuilt = [
    node[0],
    ...node.slice(1).map((child) => {
      const next = replaceAllMatches(child, targetKey, replacement);
      replacementCount += next.replacementCount;
      return next.node;
    }),
  ];

  return {
    node: normalizeAst(rebuilt),
    replacementCount,
  };
}

type AbsoluteValuePolynomialRoot = {
  node: unknown;
  latex: string;
  numeric: number;
};

type AbsoluteValuePlaceholderSolveOutcome =
  | { kind: 'unrecognized' }
  | { kind: 'solved'; roots: AbsoluteValuePolynomialRoot[]; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic' }
  | { kind: 'no-roots'; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic'; reason: 'no-real-nonnegative-root' }
  | { kind: 'unresolved'; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic'; reason: 'outer-depth' | 'outer-sink' };

type AbsoluteValuePlaceholderTransformOutcome =
  | { kind: 'none' }
  | { kind: 'next'; equationNode: unknown }
  | { kind: 'no-roots' };

function buildAbsoluteValuePolynomialRoot(node: unknown): AbsoluteValuePolynomialRoot | null {
  const normalized = simplifyNode(node);
  const numeric = evaluateLatexAt(boxLatex(normalized), 0, 'rad').value;
  if (numeric === null || !Number.isFinite(numeric)) {
    const evaluated = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.()
      ?? ce.box(normalized as Parameters<typeof ce.box>[0]).evaluate();
    const fallback = typeof evaluated.json === 'number' ? evaluated.json : null;
    if (fallback === null || !Number.isFinite(fallback)) {
      return null;
    }
    return {
      node: normalized,
      latex: boxLatex(normalized),
      numeric: fallback,
    };
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    numeric,
  };
}

function sortAndDedupeAbsoluteValuePolynomialRoots(roots: AbsoluteValuePolynomialRoot[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ABS_NUMERIC_EPSILON);
}

function solveLinearOrQuadraticAbsoluteValuePolynomial(
  polynomial: ExactPolynomial,
): AbsoluteValuePolynomialRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 1) {
    const root = divideScalar(
      negateScalar(getExactPolynomialCoefficient(polynomial, 0)),
      getExactPolynomialCoefficient(polynomial, 1),
    );
    if (!root) {
      return null;
    }

    const solvedRoot = buildAbsoluteValuePolynomialRoot(buildScalarNode(root));
    return solvedRoot ? [solvedRoot] : null;
  }

  if (degree !== 2) {
    return null;
  }

  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return null;
  }

  const discriminantNode = buildScalarNode(discriminant);
  const discriminantRoot = buildAbsoluteValuePolynomialRoot(discriminantNode);
  const discriminantNumeric = discriminantRoot?.numeric ?? null;
  if (discriminantNumeric === null) {
    return null;
  }

  if (discriminantNumeric < -ABS_NUMERIC_EPSILON) {
    return [];
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const minusBNode = buildScalarNode(negateScalar(b));
  const twoANode = buildScalarNode(
    multiplyScalar(a, { numerator: 2, denominator: 1 }) ?? { numerator: 0, denominator: 1 },
  );

  if (Math.abs(discriminantNumeric) <= ABS_NUMERIC_EPSILON) {
    const root = buildAbsoluteValuePolynomialRoot(['Divide', minusBNode, twoANode]);
    return root ? [root] : null;
  }

  const sqrtNode = ['Sqrt', discriminantNode];
  const positive = buildAbsoluteValuePolynomialRoot(['Divide', ['Add', minusBNode, sqrtNode], twoANode]);
  const negative = buildAbsoluteValuePolynomialRoot(['Divide', ['Add', minusBNode, ['Negate', sqrtNode]], twoANode]);
  if (!positive || !negative) {
    return null;
  }

  return sortAndDedupeAbsoluteValuePolynomialRoots([positive, negative]);
}

function solveOuterAbsoluteValuePlaceholderRoots(
  polynomial: ExactPolynomial,
  placeholder: string,
): AbsoluteValuePolynomialRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 1 || degree > 4) {
    return null;
  }

  if (degree <= 2) {
    return solveLinearOrQuadraticAbsoluteValuePolynomial(polynomial);
  }

  const solved = solveBoundedPolynomialEquationAst(
    ['Equal', exactPolynomialToNode(polynomial), 0],
    placeholder,
  );
  if (!solved) {
    return null;
  }

  const roots = solved.exactSolutions
    .map((latex) => {
      try {
        return buildAbsoluteValuePolynomialRoot(ce.parse(latex).json);
      } catch {
        return null;
      }
    })
    .filter((root): root is AbsoluteValuePolynomialRoot => root !== null);

  return roots.length === solved.exactSolutions.length
    ? sortAndDedupeAbsoluteValuePolynomialRoots(roots)
    : null;
}

function solveLinearAbsoluteValuePlaceholderRoots(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderSolveOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'unrecognized' };
  }

  const zeroForm = normalizeAst(['Add', normalized[1], ['Negate', normalized[2]]]);
  const linear = parseLinearPlaceholder(zeroForm, placeholder);
  if (!linear || isZeroScalar(linear.a)) {
    return { kind: 'unrecognized' };
  }

  const rootNode = buildQuotientNode(negateNode(linear.remainder), buildScalarNode(linear.a));
  const root = buildAbsoluteValuePolynomialRoot(rootNode);
  if (!root) {
    return {
      kind: 'unresolved',
      normalizationKind: 'outer-nonperiodic',
      reason: 'outer-sink',
    };
  }

  return {
    kind: 'solved',
    normalizationKind: 'outer-nonperiodic',
    roots: [root],
  };
}

function solvePolynomialAbsoluteValuePlaceholderRoots(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderSolveOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'unrecognized' };
  }

  const zeroForm = normalizeAst(['Add', normalized[1], ['Negate', normalized[2]]]);
  const polynomial = parseExactPolynomial(zeroForm, placeholder, 4);
  if (!polynomial || exactPolynomialDegree(polynomial) < 1) {
    return { kind: 'unrecognized' };
  }

  const roots = solveOuterAbsoluteValuePlaceholderRoots(polynomial, placeholder);
  if (!roots) {
    return {
      kind: 'unresolved',
      normalizationKind: 'outer-polynomial',
      reason: 'outer-sink',
    };
  }

  return {
    kind: 'solved',
    normalizationKind: 'outer-polynomial',
    roots,
  };
}

type AbsoluteValuePlaceholderCarrier =
  | {
      family: 'log';
      kind: 'ln' | 'log';
      inner: unknown;
      baseNode: unknown;
      baseNumeric: number;
    }
  | {
      family: 'power';
      kind: 'exp' | 'power';
      inner: unknown;
      baseNode: unknown;
      baseNumeric: number;
    };

function isValidLogLikeBase(baseNumeric: number) {
  return Number.isFinite(baseNumeric) && baseNumeric > 0 && Math.abs(baseNumeric - 1) > ABS_NUMERIC_EPSILON;
}

function matchAbsoluteValuePlaceholderCarrier(node: unknown): AbsoluteValuePlaceholderCarrier | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Ln' && normalized.length === 2) {
    return {
      family: 'log',
      kind: 'ln',
      inner: normalized[1],
      baseNode: 'ExponentialE',
      baseNumeric: Math.E,
    };
  }

  if (normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3)) {
    const baseNode = normalized.length === 2 ? 10 : normalized[2];
    const baseNumeric = readFiniteNumericValue(baseNode);
    if (baseNumeric === null || !isValidLogLikeBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'log',
      kind: 'log',
      inner: normalized[1],
      baseNode,
      baseNumeric,
    };
  }

  if (normalized[0] === 'Exp' && normalized.length === 2) {
    return {
      family: 'power',
      kind: 'exp',
      inner: normalized[1],
      baseNode: 'ExponentialE',
      baseNumeric: Math.E,
    };
  }

  if (normalized[0] === 'Power' && normalized.length === 3) {
    const baseNode = normalized[1];
    const exponent = normalized[2];
    if (baseNode === 'ExponentialE') {
      return {
        family: 'power',
        kind: 'exp',
        inner: exponent,
        baseNode,
        baseNumeric: Math.E,
      };
    }

    const baseNumeric = readFiniteNumericValue(baseNode);
    if (baseNumeric === null || !isValidLogLikeBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'power',
      kind: 'power',
      inner: exponent,
      baseNode,
      baseNumeric,
    };
  }

  return null;
}

function reduceSameBaseAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const leftCarrier = matchAbsoluteValuePlaceholderCarrier(normalized[1]);
  const rightCarrier = matchAbsoluteValuePlaceholderCarrier(normalized[2]);
  if (!leftCarrier || !rightCarrier) {
    return { kind: 'none' };
  }

  if (
    leftCarrier.family !== rightCarrier.family
    || Math.abs(leftCarrier.baseNumeric - rightCarrier.baseNumeric) > ABS_NUMERIC_EPSILON
  ) {
    return { kind: 'none' };
  }

  return {
    kind: 'next',
    equationNode: normalizeAst(['Equal', leftCarrier.inner, rightCarrier.inner]),
  };
}

function reduceInverseAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const attempts: Array<{ carrierSide: unknown; otherSide: unknown }> = [
    { carrierSide: normalizeAst(normalized[1]), otherSide: normalizeAst(normalized[2]) },
    { carrierSide: normalizeAst(normalized[2]), otherSide: normalizeAst(normalized[1]) },
  ];

  for (const attempt of attempts) {
    const carrier = matchAbsoluteValuePlaceholderCarrier(attempt.carrierSide);
    if (!carrier) {
      continue;
    }

    if (expressionHasVariable(attempt.otherSide)) {
      continue;
    }

    if (carrier.family === 'log') {
      return {
        kind: 'next',
        equationNode: normalizeAst([
          'Equal',
          carrier.inner,
          simplifyNode(['Power', carrier.baseNode, attempt.otherSide]),
        ]),
      };
    }

    const otherNumeric = readFiniteNumericValue(attempt.otherSide);
    if (otherNumeric === null || otherNumeric <= ABS_NUMERIC_EPSILON) {
      return { kind: 'no-roots' };
    }

    const inverseNode = carrier.kind === 'exp'
      ? simplifyNode(['Ln', attempt.otherSide])
      : simplifyNode(['Divide', ['Ln', attempt.otherSide], ['Ln', carrier.baseNode]]);

    return {
      kind: 'next',
      equationNode: normalizeAst(['Equal', carrier.inner, inverseNode]),
    };
  }

  return { kind: 'none' };
}

function readFiniteNumericValue(node: unknown) {
  return buildAbsoluteValuePolynomialRoot(node)?.numeric ?? null;
}

function isEvenInteger(value: number) {
  return Number.isInteger(value) && value % 2 === 0;
}

function invertRationalExponent(
  numerator: number,
  denominator: number,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(denominator, numerator);
}

function matchOuterPlaceholderRadical(
  node: unknown,
  placeholder: string,
): { inner: unknown; index: number } | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Sqrt' && normalized.length === 2) {
    if (!containsPlaceholder(normalized[1], placeholder) || containsAbsoluteValue(normalized[1])) {
      return null;
    }

    return {
      inner: normalized[1],
      index: 2,
    };
  }

  if (normalized[0] === 'Root' && normalized.length === 3) {
    const index = readExactScalar(normalized[2]);
    if (
      !index
      || index.denominator !== 1
      || index.numerator < 2
      || !containsPlaceholder(normalized[1], placeholder)
      || containsAbsoluteValue(normalized[1])
    ) {
      return null;
    }

    return {
      inner: normalized[1],
      index: index.numerator,
    };
  }

  return null;
}

function matchOuterPlaceholderRationalPower(
  node: unknown,
  placeholder: string,
): { base: unknown; exponent: AbsoluteValueExactScalar } | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const exponent = readExactScalar(normalized[2]);
  if (
    !exponent
    || exponent.numerator <= 0
    || exponent.denominator <= 0
    || !containsPlaceholder(normalized[1], placeholder)
    || containsAbsoluteValue(normalized[1])
  ) {
    return null;
  }

  return {
    base: normalized[1],
    exponent,
  };
}

function reduceRadicalAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const attempts: Array<{ radicalSide: unknown; otherSide: unknown }> = [
    { radicalSide: normalizeAst(normalized[1]), otherSide: normalizeAst(normalized[2]) },
    { radicalSide: normalizeAst(normalized[2]), otherSide: normalizeAst(normalized[1]) },
  ];

  for (const attempt of attempts) {
    if (containsPlaceholder(attempt.otherSide, placeholder)) {
      continue;
    }

    const radical = matchOuterPlaceholderRadical(attempt.radicalSide, placeholder);
    if (radical) {
      const otherNumeric = readFiniteNumericValue(attempt.otherSide);
      if (otherNumeric === null) {
        return {
          kind: 'next',
          equationNode: normalizeAst([
            'Equal',
            radical.inner,
            simplifyNode(['Power', attempt.otherSide, radical.index]),
          ]),
        };
      }

      if (isEvenInteger(radical.index) && otherNumeric < -ABS_NUMERIC_EPSILON) {
        return { kind: 'no-roots' };
      }

      return {
        kind: 'next',
        equationNode: normalizeAst([
          'Equal',
          radical.inner,
          simplifyNode(['Power', attempt.otherSide, radical.index]),
        ]),
      };
    }

    const rationalPower = matchOuterPlaceholderRationalPower(attempt.radicalSide, placeholder);
    if (!rationalPower) {
      continue;
    }

    const invertedExponent = invertRationalExponent(
      rationalPower.exponent.numerator,
      rationalPower.exponent.denominator,
    );
    if (!invertedExponent) {
      return { kind: 'none' };
    }

    const otherNumeric = readFiniteNumericValue(attempt.otherSide);
    if (
      otherNumeric !== null
      && isEvenInteger(invertedExponent.denominator)
      && otherNumeric < -ABS_NUMERIC_EPSILON
    ) {
      return { kind: 'no-roots' };
    }

    return {
      kind: 'next',
      equationNode: normalizeAst([
        'Equal',
        rationalPower.base,
        simplifyNode(['Power', attempt.otherSide, buildScalarNode(invertedExponent)]),
      ]),
    };
  }

  return { kind: 'none' };
}

function solveAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
  placeholder: string,
  remainingTransforms: number,
): AbsoluteValuePlaceholderSolveOutcome {
  const linearSink = solveLinearAbsoluteValuePlaceholderRoots(equationNode, placeholder);
  if (linearSink.kind !== 'unrecognized') {
    return linearSink;
  }

  const polynomialSink = solvePolynomialAbsoluteValuePlaceholderRoots(equationNode, placeholder);
  if (polynomialSink.kind !== 'unrecognized') {
    return polynomialSink;
  }

  const transforms = [
    reduceSameBaseAbsoluteValuePlaceholderEquation(equationNode),
    reduceInverseAbsoluteValuePlaceholderEquation(equationNode),
    reduceRadicalAbsoluteValuePlaceholderEquation(equationNode, placeholder),
  ];

  for (const transform of transforms) {
    if (transform.kind === 'none') {
      continue;
    }

    if (transform.kind === 'no-roots') {
      return {
        kind: 'no-roots',
        normalizationKind: 'outer-nonperiodic',
        reason: 'no-real-nonnegative-root',
      };
    }

    if (remainingTransforms <= 0) {
      return {
        kind: 'unresolved',
        normalizationKind: 'outer-nonperiodic',
        reason: 'outer-depth',
      };
    }

    const recursive = solveAbsoluteValuePlaceholderEquation(
      transform.equationNode,
      placeholder,
      remainingTransforms - 1,
    );

    return recursive.kind === 'unrecognized'
      ? {
          kind: 'unresolved',
          normalizationKind: 'outer-nonperiodic',
          reason: 'outer-sink',
        }
      : recursive;
  }

  return { kind: 'unrecognized' };
}

export function buildAbsoluteValueNode(node: unknown) {
  return simplifyNode(['Abs', node]);
}

export function buildAbsoluteValueNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return {
    kind: 'nonnegative',
    expressionLatex: boxLatex(expression),
  };
}

function classifyAbsoluteValueExpressionSupport(
  node: unknown,
  variable: string,
): AbsoluteValueExpressionSupportKind | null {
  const normalized = normalizeAst(node);

  if (containsAbsoluteValue(normalized)) {
    return null;
  }

  if (readExactScalar(normalized) || !expressionHasVariable(normalized)) {
    return 'constant';
  }

  const polynomial = parseExactPolynomial(normalized, variable, 4);
  if (polynomial) {
    return exactPolynomialDegree(polynomial) <= 1 ? 'affine' : 'polynomial';
  }

  if (matchSupportedRadical(normalized, variable)) {
    return 'radical';
  }

  if (matchSupportedRationalPower(normalized, variable)) {
    return 'rational-power';
  }

  return detectSingleVariable(normalized) === variable ? 'generic-expression' : null;
}

function isStrongerAbsoluteValueCarrierKind(kind: AbsoluteValueExpressionSupportKind | null) {
  return kind === 'polynomial' || kind === 'radical' || kind === 'rational-power';
}

function isStrongerAbsoluteValueFamily(family: AbsoluteValueEquationFamily) {
  const targetKind = classifyAbsoluteValueExpressionSupport(family.target.base, family.variable);
  const comparisonKind = classifyAbsoluteValueExpressionSupport(
    family.comparisonTarget?.base ?? family.comparisonNode,
    family.variable,
  );
  return isStrongerAbsoluteValueCarrierKind(targetKind) || isStrongerAbsoluteValueCarrierKind(comparisonKind);
}

function buildAbsoluteValueFamilyLabel(family: AbsoluteValueEquationFamily) {
  return isStrongerAbsoluteValueFamily(family)
    ? 'stronger absolute-value carrier family'
    : 'absolute-value family';
}

export function buildAbsoluteValueUnresolvedError(family: AbsoluteValueEquationFamily) {
  if ('normalizationKind' in family && family.normalizationKind === 'outer-polynomial') {
    return buildOuterPolynomialUnresolvedError(buildAbsoluteValueFamilyLabel(family));
  }
  if ('normalizationKind' in family && family.normalizationKind === 'outer-nonperiodic') {
    return buildOuterNonPeriodicUnresolvedError(buildAbsoluteValueFamilyLabel(family));
  }
  return `This recognized ${buildAbsoluteValueFamilyLabel(family)} is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.`;
}

export function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  if (classifyAbsoluteValueExpressionSupport(node, variable)) {
    return true;
  }

  return false;
}

export function matchAbsoluteValueTarget(node: unknown, variable: string): AbsoluteValueTargetDescriptor | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    if (!isSupportedAbsoluteValueExpression(normalized[1], variable)) {
      return null;
    }

    return {
      targetNode: normalized,
      base: normalized[1],
      coefficient: { numerator: 1, denominator: 1 },
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply' && normalized.length >= 3) {
    const absChildren = normalized.slice(1).filter((child) =>
      isNodeArray(child) && child[0] === 'Abs' && child.length === 2);
    if (absChildren.length !== 1) {
      return null;
    }

    const scalarChildren = normalized
      .slice(1)
      .filter((child) => child !== absChildren[0])
      .every((child) => Boolean(readExactScalar(child)));
    if (!scalarChildren) {
      return null;
    }

    const absBase = (absChildren[0] as unknown[])[1];
    if (!isSupportedAbsoluteValueExpression(absBase, variable)) {
      return null;
    }

    return {
      targetNode: normalized,
      base: absBase,
      coefficient: normalized
        .slice(1)
        .filter((child) => child !== absChildren[0])
        .map((child) => readExactScalar(child)!)
        .reduce<AbsoluteValueExactScalar>((accumulator, child) =>
          multiplyScalar(accumulator, child) ?? accumulator, { numerator: 1, denominator: 1 }),
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3) {
    const numerator = normalizeAst(normalized[1]);
    const denominatorScalar = readExactScalar(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorTarget = matchAbsoluteValueTarget(numerator, variable);
    if (!numeratorTarget) {
      return null;
    }

    return {
      targetNode: normalized,
      base: numeratorTarget.base,
      coefficient: divideScalar(
        numeratorTarget.coefficient,
        denominatorScalar,
      ) ?? numeratorTarget.coefficient,
    };
  }

  return null;
}

export function collectAbsoluteValueTargets(
  node: unknown,
  variable: string,
  targets: AbsoluteValueTargetDescriptor[] = [],
) {
  const normalized = normalizeAst(node);
  const target = matchAbsoluteValueTarget(normalized, variable);
  if (target) {
    targets.push(target);
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectAbsoluteValueTargets(child, variable, targets);
  }

  return targets;
}

function collectRawAbsoluteValueTargets(
  node: unknown,
  variable: string,
  targets: AbsoluteValueTargetDescriptor[] = [],
) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    if (isSupportedAbsoluteValueExpression(normalized[1], variable)) {
      targets.push({
        targetNode: normalized,
        base: normalized[1],
        coefficient: { numerator: 1, denominator: 1 },
      });
    }
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRawAbsoluteValueTargets(child, variable, targets);
  }

  return targets;
}

function buildOuterPolynomialNoRootError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces to a bounded polynomial in \\left|u\\right| with no nonnegative real roots, so it has no real solutions.`;
}

function buildOuterPolynomialUnresolvedError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces to a bounded polynomial in \\left|u\\right|, but at least one resulting branch leaves the current exact bounded sink set. Use Numeric Solve with an interval in Equation mode.`;
}

function buildOuterNonPeriodicNoRootError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces through a bounded non-periodic outer layer to no nonnegative real \\left|u\\right| values, so it has no real solutions.`;
}

function buildOuterNonPeriodicUnresolvedError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces through a bounded non-periodic outer layer, but the resulting \\left|u\\right| equation leaves the current exact bounded sink set. Use Numeric Solve with an interval in Equation mode.`;
}

function buildOuterNonPeriodicDepthError(familyLabel: string) {
  return `This recognized ${familyLabel} would require more than one extra bounded non-periodic outer layer over \\left|u\\right|. Use Numeric Solve with an interval in Equation mode.`;
}

type AffineAbsoluteValueSide = {
  target: AbsoluteValueTargetDescriptor;
  offset: AbsoluteValueExactScalar;
};

function matchAffineAbsoluteValueSide(node: unknown, variable: string): AffineAbsoluteValueSide | null {
  const normalized = normalizeAst(node);
  const targets = collectAbsoluteValueTargets(normalized, variable).filter(
    (target, index, pool) => pool.findIndex((entry) => termKey(entry.targetNode) === termKey(target.targetNode)) === index,
  );

  for (const target of targets) {
    const replaced = replaceFirstMatch(normalized, termKey(target.targetNode), ABS_PLACEHOLDER_SYMBOL);
    if (!replaced.replaced) {
      continue;
    }

    const linear = parseLinearPlaceholder(replaced.node, ABS_PLACEHOLDER_SYMBOL);
    if (!linear || isZeroScalar(linear.a)) {
      continue;
    }

    const offset = readExactScalar(linear.remainder);
    if (!offset) {
      continue;
    }

    const coefficient = multiplyScalar(target.coefficient, linear.a);
    if (!coefficient || isZeroScalar(coefficient)) {
      continue;
    }

    return {
      target: {
        targetNode: buildScaledNode(buildAbsoluteValueNode(target.base), coefficient),
        base: target.base,
        coefficient,
      },
      offset,
    };
  }

  return null;
}

export function matchPerfectSquareAbsoluteValueCarrier(node: unknown, variable: string) {
  const normalized = normalizeAst(node);
  if (
    isNodeArray(normalized)
    && ((normalized[0] === 'Sqrt' && normalized.length === 2)
      || (normalized[0] === 'Root' && normalized.length === 3 && normalized[2] === 2))
  ) {
    const directBase =
      isNodeArray(normalized[1])
      && normalized[1][0] === 'Power'
      && normalized[1].length === 3
      && readExactScalar(normalized[1][2])?.numerator === 2
      && readExactScalar(normalized[1][2])?.denominator === 1
      && isSupportedAbsoluteValueExpression(normalized[1][1], variable)
        ? normalized[1][1]
        : null;
    if (directBase) {
      return {
        targetNode: normalized,
        absNode: buildAbsoluteValueNode(directBase),
      };
    }

    const profile = recognizePerfectSquareRadicand(normalized[1]);
    if (!profile || detectSingleVariable(profile.absInnerNode) !== variable) {
      return null;
    }

    return {
      targetNode: normalized,
      absNode: profile.normalizedNode,
    };
  }

  return null;
}

export function buildAbsoluteValueEquationFamily(
  target: AbsoluteValueTargetDescriptor,
  comparisonNode: unknown,
  variable: string,
): RecognizedAbsoluteValueEquationFamily {
  const normalizedBase = normalizeAst(target.base);
  const normalizedComparison = isUnitScalar(target.coefficient)
    ? normalizeAst(comparisonNode)
    : buildQuotientNode(normalizeAst(comparisonNode), buildScalarNode(target.coefficient));
  const comparisonTarget = matchAbsoluteValueTarget(normalizedComparison, variable);
  const pureComparisonAbs =
    comparisonTarget && termKey(comparisonTarget.targetNode) === termKey(normalizedComparison)
      ? comparisonTarget
      : undefined;

  const kind: AbsoluteValueEquationFamilyKind = pureComparisonAbs
    ? 'abs-equals-abs'
    : !expressionHasVariable(normalizedComparison)
      ? 'abs-equals-constant'
      : 'abs-equals-expression';

  const effectiveComparison = pureComparisonAbs
    ? buildScaledNode(pureComparisonAbs.base, pureComparisonAbs.coefficient)
    : normalizedComparison;
  const branchSet = createTwoBranchSet(
    `${boxLatex(normalizedBase)}=${boxLatex(effectiveComparison)}`,
    `${boxLatex(normalizedBase)}=${boxLatex(negateNode(effectiveComparison))}`,
    pureComparisonAbs
      ? []
      : [buildAbsoluteValueNonnegativeConstraint(normalizedComparison)],
    { provenance: 'abs-core' },
  );

  return {
    kind,
    variable,
    target: {
      targetNode: buildScaledNode(buildAbsoluteValueNode(normalizedBase), target.coefficient),
      base: normalizedBase,
      coefficient: target.coefficient,
    },
    comparisonNode: normalizedComparison,
    comparisonTarget: pureComparisonAbs,
    branchEquations: branchSet.equations,
    branchConstraints: branchSet.constraints ?? [],
    normalizationKind: 'direct',
  };
}

function matchOuterPolynomialAbsoluteValueEquationNode(node: unknown): RecognizedAbsoluteValueEquationFamily | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(normalized[1]);
  const rightNode = normalizeAst(normalized[2]);
  // Preserve raw |u| structure here: simplification can incorrectly rewrite
  // outer abs powers like |sin(x)|^2 into sin(|x|)^2 before placeholder reduction.
  const zeroForm = normalizeAst(['Add', leftNode, ['Negate', rightNode]]);
  const variable = detectSingleVariable(zeroForm);
  if (variable === null && expressionHasVariable(zeroForm)) {
    return null;
  }

  const effectiveVariable = variable ?? detectEquationVariable(leftNode, rightNode);
  const rawTargets = collectRawAbsoluteValueTargets(zeroForm, effectiveVariable).filter(
    (target, index, pool) => pool.findIndex((entry) => termKey(entry.targetNode) === termKey(target.targetNode)) === index,
  );
  if (rawTargets.length !== 1) {
    return null;
  }

  const target = rawTargets[0];
  const replacedLeft = replaceAllMatches(
    leftNode,
    termKey(target.targetNode),
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
  );
  const replacedRight = replaceAllMatches(
    rightNode,
    termKey(target.targetNode),
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
  );
  if (replacedLeft.replacementCount + replacedRight.replacementCount === 0) {
    return null;
  }

  const remainingVariables = [
    ...collectEquationVariables(replacedLeft.node),
    ...collectEquationVariables(replacedRight.node),
  ];
  if (remainingVariables.some((entry) => entry !== ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL)) {
    return null;
  }

  const placeholderEquation = normalizeAst([
    'Equal',
    normalizeAst(replacedLeft.node),
    normalizeAst(replacedRight.node),
  ]);
  const placeholderSolve = solveAbsoluteValuePlaceholderEquation(
    placeholderEquation,
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
    ABS_OUTER_NON_PERIODIC_MAX_TRANSFORMS,
  );
  if (placeholderSolve.kind === 'unrecognized') {
    return null;
  }
  const familyLabel = isStrongerAbsoluteValueCarrierKind(
    classifyAbsoluteValueExpressionSupport(target.base, effectiveVariable),
  )
    ? 'stronger absolute-value carrier family'
    : 'absolute-value family';

  if (placeholderSolve.kind === 'unresolved') {
    return {
      kind: 'abs-equals-constant',
      variable: effectiveVariable,
      target,
      comparisonNode: 0,
      branchEquations: [],
      branchConstraints: [],
      normalizationKind: placeholderSolve.normalizationKind,
      blockOnGuidedBranchError: true,
      emptyBranchError: placeholderSolve.reason === 'outer-depth'
        ? buildOuterNonPeriodicDepthError(familyLabel)
        : placeholderSolve.normalizationKind === 'outer-polynomial'
          ? buildOuterPolynomialUnresolvedError(familyLabel)
          : buildOuterNonPeriodicUnresolvedError(familyLabel),
    };
  }

  const acceptedRoots = placeholderSolve.kind === 'solved'
    ? placeholderSolve.roots.filter((root) => root.numeric >= -ABS_NUMERIC_EPSILON)
    : [];
  if (acceptedRoots.length === 0) {
    return {
      kind: 'abs-equals-constant',
      variable: effectiveVariable,
      target,
      comparisonNode: 0,
      branchEquations: [],
      branchConstraints: [],
      normalizationKind: placeholderSolve.normalizationKind,
      blockOnGuidedBranchError: true,
      emptyBranchError: placeholderSolve.normalizationKind === 'outer-polynomial'
        ? buildOuterPolynomialNoRootError(familyLabel)
        : buildOuterNonPeriodicNoRootError(familyLabel),
    };
  }

  const reducedFamilies = acceptedRoots.map((root) =>
    buildAbsoluteValueEquationFamily(target, root.node, effectiveVariable));
  const branchSet = createBranchSet({
    equations: reducedFamilies.flatMap((family) => family.branchEquations),
    constraints: reducedFamilies.flatMap((family) => family.branchConstraints),
    provenance: 'abs-core',
  });

  return {
    kind: 'abs-equals-constant',
    variable: effectiveVariable,
    target: {
      targetNode: buildAbsoluteValueNode(normalizeAst(target.base)),
      base: normalizeAst(target.base),
      coefficient: { numerator: 1, denominator: 1 },
    },
    comparisonNode: acceptedRoots[0].node,
    branchEquations: branchSet.equations,
    branchConstraints: branchSet.constraints ?? [],
    normalizationKind: placeholderSolve.normalizationKind,
    blockOnGuidedBranchError: true,
  };
}

export function matchDirectAbsoluteValueEquationNode(node: unknown): RecognizedAbsoluteValueEquationFamily | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(normalized[1]);
  const rightNode = normalizeAst(normalized[2]);
  const variable = detectEquationVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const target = matchAffineAbsoluteValueSide(attempt.targetSide, variable);
    if (!target) {
      continue;
    }

    const normalizedOtherSide = normalizeAst(attempt.otherSide);
    const pureOtherTarget = matchAbsoluteValueTarget(normalizedOtherSide, variable);
    const isPureOtherTarget = pureOtherTarget && termKey(pureOtherTarget.targetNode) === termKey(normalizedOtherSide);
    if (!isSupportedAbsoluteValueExpression(normalizedOtherSide, variable) && !isPureOtherTarget) {
      continue;
    }

    const isolatedComparison = buildDifferenceNode(normalizedOtherSide, buildScalarNode(target.offset));
    return buildAbsoluteValueEquationFamily(target.target, isolatedComparison, variable);
  }

  return matchOuterPolynomialAbsoluteValueEquationNode(normalized);
}

export function matchDirectAbsoluteValueEquationLatex(latex: string) {
  const parsed = ce.parse(latex);
  return matchDirectAbsoluteValueEquationNode(parsed.json);
}

type AbsoluteNodeResult = {
  node: unknown;
  changed: boolean;
};

function normalizeAbsoluteNode(node: unknown): AbsoluteNodeResult {
  const normalized = normalizeAst(node);

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      changed: false,
    };
  }

  const normalizedChildren = normalized.slice(1).map((child) => normalizeAbsoluteNode(child));
  const rebuilt = normalizedChildren.some((child) => child.changed)
    ? normalizeAst([normalized[0], ...normalizedChildren.map((child) => child.node)])
    : normalized;

  if (isNodeArray(rebuilt) && rebuilt[0] === 'Abs' && rebuilt.length === 2) {
    const inner = normalizeAst(rebuilt[1]);
    const scalar = readExactScalar(inner);
    if (scalar) {
      const absoluteScalar = {
        numerator: Math.abs(scalar.numerator),
        denominator: scalar.denominator,
      };
      return {
        node: buildScalarNode(absoluteScalar),
        changed: true,
      };
    }

    if (isNodeArray(inner) && inner[0] === 'Abs' && inner.length === 2) {
      return {
        node: inner,
        changed: true,
      };
    }

    const strippedNegation = stripNegation(inner);
    if (strippedNegation) {
      return {
        node: buildAbsoluteValueNode(strippedNegation),
        changed: true,
      };
    }

    if (
      isNodeArray(inner)
      && inner[0] === 'Power'
      && inner.length === 3
      && parsePositiveEvenInteger(inner[2]) !== null
    ) {
      return {
        node: inner,
        changed: true,
      };
    }
  }

  if (
    isNodeArray(rebuilt)
    && rebuilt[0] === 'Power'
    && rebuilt.length === 3
    && isNodeArray(rebuilt[1])
    && rebuilt[1][0] === 'Abs'
    && rebuilt[1].length === 2
  ) {
    const evenExponent = parsePositiveEvenInteger(rebuilt[2]);
    if (evenExponent !== null) {
      return {
        node: simplifyNode(['Power', rebuilt[1][1], rebuilt[2]]),
        changed: true,
      };
    }
  }

  return {
    node: rebuilt,
    changed: normalizedChildren.some((child) => child.changed),
  };
}

export function normalizeExactAbsoluteValueNode(
  node: unknown,
): AbsoluteValueNormalizationResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }

  const normalized = normalizeAbsoluteNode(node);
  if (!normalized.changed) {
    return null;
  }

  const normalizedNode = normalizeAst(normalized.node);
  return {
    changed: true,
    normalizedNode,
    normalizedLatex: boxLatex(normalizedNode),
    exactSupplementLatex: buildConditionSupplementLatex([]),
  };
}

function sampleFiniteValues(
  expressionLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const values: number[] = [];
  const step = (end - start) / subdivisions;
  for (let index = 0; index <= subdivisions; index += 1) {
    const x = start + step * index;
    const value = evaluateLatexAt(expressionLatex, x, angleUnit).value;
    if (value !== null && Number.isFinite(value)) {
      values.push(value);
    }
  }
  return values;
}

type AbsoluteValueBranchPotential = {
  branchEquation: string;
  potential: boolean;
  finiteSampleCount: number;
};

function analyzeAbsoluteValueBranchPotential(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) : AbsoluteValueBranchPotential {
  const samples = sampleFiniteValues(`(${equationLatex.split('=')[0]})-(${equationLatex.split('=').slice(1).join('=')})`, start, end, subdivisions, angleUnit);
  const nearZeroHit = samples.some((value) => Math.abs(value) <= ABS_NUMERIC_EPSILON);
  let signChange = false;

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index - 1] * samples[index] < 0) {
      signChange = true;
      break;
    }
  }

  return {
    branchEquation: equationLatex,
    potential: nearZeroHit || signChange,
    finiteSampleCount: samples.length,
  };
}

export function buildAbsoluteValueNumericGuidance(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const family = matchDirectAbsoluteValueEquationLatex(equationLatex);
  if (!family) {
    return null;
  }

  const familyLabel = buildAbsoluteValueFamilyLabel(family);

  if (family.branchEquations.length === 0) {
    return family.emptyBranchError
      ?? `This recognized ${familyLabel} does not produce any admissible real absolute-value branches on the current bounded exact surface.`;
  }

  if (family.kind !== 'abs-equals-abs') {
    const comparisonValues = sampleFiniteValues(
      boxLatex(family.comparisonNode),
      start,
      end,
      subdivisions,
      angleUnit,
    );

    if (comparisonValues.length > 0 && comparisonValues.every((value) => value < -ABS_NUMERIC_EPSILON)) {
      return `This recognized ${familyLabel} requires ${boxLatex(family.comparisonNode)}\\ge0, but it stays negative across the chosen interval.`;
    }
  }

  const branchPotentials = family.branchEquations.map((branchEquation) =>
    analyzeAbsoluteValueBranchPotential(branchEquation, start, end, Math.min(subdivisions, 48), angleUnit));
  const activeBranches = branchPotentials.filter((entry) => entry.potential);
  const domainBlockedBranches = branchPotentials.filter((entry) => entry.finiteSampleCount === 0);

  if (family.branchEquations.length === 1) {
    return `This recognized ${familyLabel} reduces to the single branch ${family.branchEquations[0]}. Shift the interval toward that branch if you want numeric confirmation.`;
  }

  if (activeBranches.length === 0) {
    const domainText = domainBlockedBranches.length > 0
      ? ' One or more branches leave the real-domain carrier range across the chosen interval.'
      : '';
    return `This recognized ${familyLabel} splits into ${family.branchEquations.join(' and ')}, but the chosen interval does not sample a sign change or near-zero hit on either branch.${domainText}`;
  }

  if (activeBranches.length === 1) {
    const domainText = domainBlockedBranches.some((entry) => entry.branchEquation !== activeBranches[0].branchEquation)
      ? ' The other branch leaves the real-domain carrier range over this interval.'
      : '';
    return `This recognized ${familyLabel} splits into ${family.branchEquations.join(' and ')}; the chosen interval only samples the ${activeBranches[0].branchEquation} branch.${domainText}`;
  }

  return `This recognized ${familyLabel} splits into ${family.branchEquations.join(' and ')}. Try isolating one branch with a narrower interval or shifting the interval center.`;
}
