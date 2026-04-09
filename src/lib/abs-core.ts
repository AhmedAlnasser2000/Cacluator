import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AbsoluteValueEquationFamily,
  AbsoluteValueEquationFamilyKind,
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

function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

function readExactScalar(node: unknown): { numerator: number; denominator: number } | null {
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

function buildScalarNode(value: { numerator: number; denominator: number }): unknown {
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
  base: unknown,
  comparisonNode: unknown,
  variable: string,
): AbsoluteValueEquationFamily {
  const normalizedBase = normalizeAst(base);
  const normalizedComparison = normalizeAst(comparisonNode);
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

  const effectiveComparison = pureComparisonAbs ? pureComparisonAbs.base : normalizedComparison;
  const branchEquations = [...new Set([
    `${boxLatex(normalizedBase)}=${boxLatex(effectiveComparison)}`,
    `${boxLatex(normalizedBase)}=${boxLatex(negateNode(effectiveComparison))}`,
  ])];

  return {
    kind,
    variable,
    target: {
      targetNode: buildAbsoluteValueNode(normalizedBase),
      base: normalizedBase,
    },
    comparisonNode: effectiveComparison,
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
    const target = matchAbsoluteValueTarget(attempt.targetSide, variable);
    if (!target || termKey(target.targetNode) !== termKey(normalizeAst(attempt.targetSide))) {
      continue;
    }

    if (!isSupportedAbsoluteValueExpression(attempt.otherSide, variable) && !matchAbsoluteValueTarget(attempt.otherSide, variable)) {
      continue;
    }

    return buildAbsoluteValueEquationFamily(target.base, attempt.otherSide, variable);
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
