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
import { parseExactPolynomial } from './polynomial-core';
import { evaluateLatexAt } from './equation/domain-guards';
import { normalizeAst } from './symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from './symbolic-engine/patterns';

const ce = new ComputeEngine();
const ABS_NUMERIC_EPSILON = 1e-8;
const ABS_PLACEHOLDER_SYMBOL = '__calcwiz_abs_u';

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

export function buildAbsoluteValueNode(node: unknown) {
  return simplifyNode(['Abs', node]);
}

export function buildAbsoluteValueNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return {
    kind: 'nonnegative',
    expressionLatex: boxLatex(expression),
  };
}

export function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  const normalized = normalizeAst(node);

  if (containsAbsoluteValue(normalized)) {
    return false;
  }

  if (
    readExactScalar(normalized)
    || parseExactPolynomial(normalized, variable, 4)
    || matchSupportedRadical(normalized, variable)
    || matchSupportedRationalPower(normalized, variable)
  ) {
    return true;
  }

  if (!expressionHasVariable(normalized)) {
    return true;
  }

  return detectSingleVariable(normalized) === variable;
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
): AbsoluteValueEquationFamily {
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
  const branchEquations = [...new Set([
    `${boxLatex(normalizedBase)}=${boxLatex(effectiveComparison)}`,
    `${boxLatex(normalizedBase)}=${boxLatex(negateNode(effectiveComparison))}`,
  ])];

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
    branchEquations,
    branchConstraints: pureComparisonAbs
      ? []
      : [buildAbsoluteValueNonnegativeConstraint(normalizedComparison)],
  };
}

export function matchDirectAbsoluteValueEquationNode(node: unknown): AbsoluteValueEquationFamily | null {
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

  return null;
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

function branchHasPotential(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const samples = sampleFiniteValues(`(${equationLatex.split('=')[0]})-(${equationLatex.split('=').slice(1).join('=')})`, start, end, subdivisions, angleUnit);
  if (samples.some((value) => Math.abs(value) <= ABS_NUMERIC_EPSILON)) {
    return true;
  }

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index - 1] * samples[index] < 0) {
      return true;
    }
  }

  return false;
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

  if (family.kind !== 'abs-equals-abs') {
    const comparisonValues = sampleFiniteValues(
      boxLatex(family.comparisonNode),
      start,
      end,
      subdivisions,
      angleUnit,
    );

    if (comparisonValues.length > 0 && comparisonValues.every((value) => value < -ABS_NUMERIC_EPSILON)) {
      return `This recognized absolute-value family requires ${boxLatex(family.comparisonNode)}\\ge0, but it stays negative across the chosen interval.`;
    }
  }

  const branchPotentials = family.branchEquations.map((branchEquation) => ({
    branchEquation,
    potential: branchHasPotential(branchEquation, start, end, Math.min(subdivisions, 48), angleUnit),
  }));
  const activeBranches = branchPotentials.filter((entry) => entry.potential);

  if (family.branchEquations.length === 1) {
    return `This recognized absolute-value family reduces to the single branch ${family.branchEquations[0]}. Shift the interval toward that branch if you want numeric confirmation.`;
  }

  if (activeBranches.length === 0) {
    return `This recognized absolute-value family splits into ${family.branchEquations.join(' and ')}, but the chosen interval does not sample a sign change or near-zero hit on either branch.`;
  }

  if (activeBranches.length === 1) {
    return `This recognized absolute-value family splits into ${family.branchEquations.join(' and ')}; the chosen interval only samples the ${activeBranches[0].branchEquation} branch.`;
  }

  return `This recognized absolute-value family splits into ${family.branchEquations.join(' and ')}. Try isolating one branch with a narrower interval or shifting the interval center.`;
}
