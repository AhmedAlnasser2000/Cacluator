import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  buildConditionSupplementLatex as buildConstraintSupplementLatex,
  buildSquareRootConjugateProfile,
  isSupportedRadicand,
  mergeSolveDomainConstraints as mergeConstraints,
  matchSupportedRadical,
  matchSupportedRationalPower,
  recognizePerfectSquareRadicand,
  type SupportedRadical,
  type SupportedRationalPower,
} from '../../radical-core';
import { parseExactPolynomial } from '../../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../symbolic-engine/patterns';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { evaluateRealNumericExpression } from '../../real-numeric-eval';
import type {
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { dedupe, mergeDisplayOutcomes } from './merge';
import { equationStateKey } from './state-key';

const ce = new ComputeEngine();
const PLACEHOLDER_SYMBOL = '__calcwiz_r3_u';
const RADICAL_STEP_BUDGET_ERROR = 'This recognized radical family would require more than two bounded radical transform steps. Use Numeric Solve with an interval in Equation mode.';
const CONDITION_PREFIX = '\\text{Conditions: } ';
const EXCLUSION_PREFIX = '\\text{Exclusions: } ';

type ExactScalar = {
  numerator: number;
  denominator: number;
};

type PlaceholderLinearExpression = {
  a: ExactScalar;
  remainder: unknown;
};

type RadicalTarget =
  | {
      kind: 'root';
      targetNode: unknown;
      root: SupportedRadical;
    }
  | {
      kind: 'reciprocal-root';
      targetNode: unknown;
      root: SupportedRadical;
      numeratorScalar: ExactScalar;
    }
  | {
      kind: 'power';
      targetNode: unknown;
      power: SupportedRationalPower;
    };

type AbsoluteValueTarget = {
  targetNode: unknown;
  base: unknown;
};

type AlgebraTransform = {
  equationLatex: string;
  branchEquations?: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  unresolvedError: string;
  radicalStepCost?: number;
};

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
}

function normalizeScalar(numerator: number, denominator: number): ExactScalar | null {
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

function readExactScalar(node: unknown): ExactScalar | null {
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
  ) {
    return normalizeScalar(node[1], node[2]);
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalar(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

function expressionHasVariable(node: unknown): boolean {
  if (typeof node === 'string') {
    return node !== 'Pi' && node !== 'ExponentialE';
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  for (const child of node.slice(1)) {
    if (expressionHasVariable(child)) {
      return true;
    }
  }

  return false;
}

function multiplyScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divideScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function addScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function negateScalar(value: ExactScalar): ExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

function isZeroScalar(value: ExactScalar) {
  return value.numerator === 0;
}

function buildScalarNode(value: ExactScalar): unknown {
  if (value.denominator === 1) {
    return value.numerator;
  }

  return ['Rational', value.numerator, value.denominator];
}

function simplifyNode(node: unknown): unknown {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

function buildNegatedNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode(negateScalar(scalar));
  }
  return simplifyNode(['Negate', node]);
}

function buildSumNode(left: unknown, right: unknown) {
  return simplifyNode(['Add', left, right]);
}

function buildDifferenceNode(left: unknown, right: unknown) {
  return buildSumNode(left, buildNegatedNode(right));
}

function buildProductNode(left: unknown, right: unknown) {
  return simplifyNode(['Multiply', left, right]);
}

function buildQuotientNode(numerator: unknown, denominator: unknown) {
  return simplifyNode(['Divide', numerator, denominator]);
}

function buildPowerNode(base: unknown, exponent: number) {
  return simplifyNode(['Power', base, exponent]);
}

function buildPoweredNode(base: unknown, exponent: ExactScalar) {
  const poweredNode = simplifyNode(['Power', base, buildScalarNode(exponent)]);
  if (!expressionHasVariable(poweredNode)) {
    const numeric = evaluateRealNumericExpression(poweredNode, boxLatex(poweredNode));
    if (numeric.kind === 'success') {
      const roundedInteger = Math.round(numeric.value);
      if (Math.abs(numeric.value - roundedInteger) < 1e-10) {
        return roundedInteger;
      }
    }
  }

  return poweredNode;
}

function buildScaledNode(node: unknown, scalar: ExactScalar) {
  if (isZeroScalar(scalar)) {
    return 0;
  }

  if (scalar.numerator === scalar.denominator) {
    return node;
  }

  return buildProductNode(buildScalarNode(scalar), node);
}

function buildAbsoluteValueNode(node: unknown) {
  return simplifyNode(['Abs', node]);
}

function buildNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return {
    kind: 'nonnegative',
    expressionLatex: boxLatex(expression),
  };
}

function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  const normalized = normalizeAst(node);
  if (readExactScalar(normalized)) {
    return true;
  }

  if (parseExactPolynomial(normalized, variable, 4)) {
    return true;
  }

  return isSupportedRightSideExpression(normalized, variable);
}

function matchAbsoluteValueTarget(node: unknown, variable: string): AbsoluteValueTarget | null {
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
      isNodeArray(child) && child[0] === 'Abs' && child.length === 2,
    );
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

function collectAbsoluteValueTargets(node: unknown, variable: string, targets: AbsoluteValueTarget[] = []) {
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

function matchPerfectSquareRadicalCarrier(node: unknown, variable: string) {
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
    if (!profile || getSolveVariable(profile.absInnerNode) !== variable) {
      return null;
    }

    return {
      targetNode: normalized,
      absNode: buildScaledNode(profile.absInnerNode, profile.outsideScalar),
    };
  }

  return null;
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
      remainder: buildNegatedNode(child.remainder),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: ExactScalar = { numerator: 0, denominator: 1 };
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
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
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

function collectSupportedRoots(node: unknown, variable: string, roots: SupportedRadical[] = []) {
  const radical = matchSupportedRadical(node, variable);
  if (radical) {
    roots.push(radical);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return roots;
  }

  for (const child of node.slice(1)) {
    collectSupportedRoots(child, variable, roots);
  }

  return roots;
}

function collectRadicalTargets(node: unknown, variable: string, targets: RadicalTarget[] = []) {
  const normalized = normalizeAst(node);
  const root = matchSupportedRadical(normalized, variable);
  if (root) {
    targets.push({
      kind: 'root',
      targetNode: normalized,
      root,
    });
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Divide'
    && normalized.length === 3
  ) {
    const numeratorScalar = readExactScalar(normalized[1]);
    const denominatorRoot = matchSupportedRadical(normalized[2], variable);
    if (numeratorScalar && denominatorRoot) {
      targets.push({
        kind: 'reciprocal-root',
        targetNode: normalized,
        root: denominatorRoot,
        numeratorScalar,
      });
    }
  }

  const power = matchSupportedRationalPower(normalized, variable);
  if (power) {
    targets.push({
      kind: 'power',
      targetNode: normalized,
      power,
    });
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRadicalTargets(child, variable, targets);
  }

  return targets;
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

function appendSolveMetadata(
  outcome: DisplayOutcome,
  badges: SolveBadge[],
  summary: string,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const solveBadges = dedupe([...(outcome.solveBadges ?? []), ...badges]);
  const solveSummaryText = outcome.solveSummaryText
    ? `${summary}; ${outcome.solveSummaryText}`
    : summary;

  return {
    ...outcome,
    solveBadges,
    solveSummaryText,
  };
}

function subtractConstraints(
  constraints: SolveDomainConstraint[] = [],
  existing: SolveDomainConstraint[] = [],
): SolveDomainConstraint[] {
  if (constraints.length === 0) {
    return [];
  }

  const existingKeys = new Set(existing.map((constraint) => JSON.stringify(constraint)));
  return constraints.filter((constraint) => !existingKeys.has(JSON.stringify(constraint)));
}

function getRadicalTransformDepth(request: GuardedSolveRequest) {
  return request.radicalTransformDepth ?? 0;
}

function mergeConditionSupplementLatex(
  existing: string[] = [],
  constraints: SolveDomainConstraint[] = [],
) {
  const supplements: string[] = [];
  const seenConditionFragments = new Set<string>();
  const explicitExclusions = new Set<string>();

  const isTautologicalConditionFragment = (fragment: string) => {
    const operators = ['\\ge0', '>0', '\\ne0'];
    for (const operator of operators) {
      if (!fragment.endsWith(operator)) {
        continue;
      }

      const expressionLatex = fragment.slice(0, -operator.length);
      const numeric = evaluateRealNumericExpression(ce.parse(expressionLatex).json, expressionLatex);
      if (numeric.kind !== 'success') {
        return false;
      }

      if (operator === '\\ge0') {
        return numeric.value >= -1e-10;
      }
      if (operator === '>0') {
        return numeric.value > 1e-10;
      }
      return Math.abs(numeric.value) > 1e-10;
    }

    return false;
  };

  const addConditionFragments = (line: string) => {
    const fragments = line.slice(CONDITION_PREFIX.length).split(',\\;').map((entry) => entry.trim()).filter(Boolean);
    for (const fragment of fragments) {
      if (explicitExclusions.has(fragment) || isTautologicalConditionFragment(fragment)) {
        continue;
      }
      seenConditionFragments.add(fragment);
    }
  };

  for (const line of existing) {
    if (line.startsWith(EXCLUSION_PREFIX)) {
      line.slice(EXCLUSION_PREFIX.length).split(',\\;').map((entry) => entry.trim()).filter(Boolean).forEach((entry) => explicitExclusions.add(entry));
    }

    if (line.startsWith(CONDITION_PREFIX)) {
      addConditionFragments(line);
      continue;
    }

    supplements.push(line);
  }

  for (const line of buildConstraintSupplementLatex(constraints)) {
    if (line.startsWith(CONDITION_PREFIX)) {
      addConditionFragments(line);
      continue;
    }

    supplements.push(line);
  }

  if (seenConditionFragments.size > 0) {
    supplements.push(`${CONDITION_PREFIX}${[...seenConditionFragments].join(',\\;')}`);
  }

  return dedupe(supplements);
}

function getSolveVariable(...nodes: unknown[]) {
  const variables = new Set<string>();
  const collectVariables = (node: unknown) => {
    if (typeof node === 'string' && node !== PLACEHOLDER_SYMBOL && node !== 'Pi' && node !== 'ExponentialE') {
      variables.add(node);
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

function isSupportedRightSideExpression(node: unknown, variable: string): boolean {
  const normalized = normalizeAst(node);
  if (readExactScalar(normalized) || isSupportedRadicand(normalized, variable)) {
    return true;
  }

  if (matchSupportedRadical(normalized, variable)) {
    return true;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return false;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return isSupportedRightSideExpression(normalized[1], variable);
  }

  if (normalized[0] === 'Add') {
    return (
      collectSupportedRoots(normalized, variable).length <= 1
      && normalized.slice(1).every((child) => isSupportedRightSideExpression(child, variable))
    );
  }

  if (normalized[0] === 'Multiply') {
    return (
      collectSupportedRoots(normalized, variable).length <= 1
      && normalized.slice(1).every((child) =>
        Boolean(readExactScalar(child) || isSupportedRightSideExpression(child, variable)))
    );
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    return Boolean(
      readExactScalar(normalized[2])
      && isSupportedRightSideExpression(normalized[1], variable)
    );
  }

  return false;
}

function matchRationalTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const zeroForm = normalizeAst(['Add', parsed[1], ['Negate', parsed[2]]]);
  const rational = normalizeExactRationalNode(zeroForm, 'simplify');
  if (!rational?.denominatorNode) {
    return null;
  }

  const equationLatex = `${rational.numeratorLatex}=0`;
  if (equationStateKey(equationLatex) === equationStateKey(request.resolvedLatex)) {
    return null;
  }

  return {
    equationLatex,
    domainConstraints: rational.exclusionConstraints,
    solveBadges: ['LCD Clear'],
    solveSummaryText: 'Cleared the LCD and reduced the equation to an exact solve-ready form',
    unresolvedError: 'This recognized rational family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function buildIsolatedExpression(
  targetSide: unknown,
  otherSide: unknown,
  targetKey: string,
): { isolated: unknown } | null {
  const replaced = replaceFirstMatch(targetSide, targetKey, PLACEHOLDER_SYMBOL);
  if (!replaced.replaced) {
    return null;
  }

  const linear = parseLinearPlaceholder(replaced.node, PLACEHOLDER_SYMBOL);
  if (!linear || isZeroScalar(linear.a)) {
    return null;
  }

  const numerator = buildDifferenceNode(otherSide, linear.remainder);
  const isolated = buildQuotientNode(numerator, buildScalarNode(linear.a));
  return {
    isolated,
  };
}

function buildRadicalPowerTransform(
  root: SupportedRadical,
  isolated: unknown,
  extraConstraints: SolveDomainConstraint[] = [],
): AlgebraTransform {
  const powered = root.index === 2
    ? normalizeAst((expand(ce.box(['Power', isolated, 2] as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json)
    : buildPowerNode(isolated, root.index);
  const equationLatex = `${boxLatex(root.radicand)}=${boxLatex(powered)}`;
  const domainConstraints = [...extraConstraints];

  if (root.index % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(root.radicand));
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  return {
    equationLatex,
    domainConstraints,
    solveBadges: ['Radical Isolation', 'Root Isolation', 'Power Lift'],
    solveSummaryText: 'Isolated a root and applied an exact power lift',
    unresolvedError: 'This recognized radical family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function buildLiftedPowerTransform(
  power: SupportedRationalPower,
  isolated: unknown,
): AlgebraTransform {
  const inverseExponent = normalizeScalar(power.denominator, power.numerator);
  const domainConstraints: SolveDomainConstraint[] = [];
  if (!inverseExponent) {
    return {
      equationLatex: `${boxLatex(power.node)}=${boxLatex(isolated)}`,
      solveBadges: ['Power Lift'],
      solveSummaryText: 'Isolated a rational power and applied an exact lift',
      unresolvedError: 'This recognized rational-power family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (power.denominator % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(power.base));
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  if (power.denominator % 2 !== 0 && power.numerator % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  const solvedMagnitude = buildPoweredNode(isolated, inverseExponent);
  const branchNodes = [solvedMagnitude];
  if (power.denominator % 2 !== 0 && power.numerator % 2 === 0) {
    branchNodes.push(buildNegatedNode(solvedMagnitude));
  }

  const branchEquations = dedupe(
    branchNodes.map((branchNode) => `${boxLatex(power.base)}=${boxLatex(branchNode)}`),
  );

  return {
    equationLatex: branchEquations[0],
    branchEquations,
    domainConstraints,
    solveBadges: ['Power Lift'],
    solveSummaryText: 'Isolated a rational power and applied an exact lift',
    unresolvedError: 'This recognized rational-power family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function buildAbsoluteValueRadicalTransform(
  absNode: unknown,
  otherSide: unknown,
): AlgebraTransform {
  return {
    equationLatex: `${boxLatex(absNode)}=${boxLatex(otherSide)}`,
    solveBadges: ['Radical Isolation'],
    solveSummaryText: 'Reduced an exact square-root square into a bounded absolute-value carrier',
    unresolvedError: 'This recognized radical family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function buildAbsoluteValueBranchTransform(
  base: unknown,
  isolated: unknown,
): AlgebraTransform {
  const branchEquations = dedupe([
    `${boxLatex(base)}=${boxLatex(isolated)}`,
    `${boxLatex(base)}=${boxLatex(buildNegatedNode(isolated))}`,
  ]);

  return {
    equationLatex: branchEquations[0],
    branchEquations,
    domainConstraints: [buildNonnegativeConstraint(isolated)],
    solveBadges: [],
    solveSummaryText: 'Branched a bounded absolute-value carrier into exact cases',
    unresolvedError: 'This recognized radical family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function matchDirectRationalPowerTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ target: unknown; other: unknown }> = [
    { target: leftNode, other: rightNode },
    { target: rightNode, other: leftNode },
  ];

  for (const attempt of attempts) {
    const power = matchSupportedRationalPower(attempt.target, variable);
    if (!power || !isSupportedRightSideExpression(attempt.other, variable)) {
      continue;
    }
    const normalizedTarget = normalizeAst(attempt.target);
    if (
      isNodeArray(normalizedTarget)
      && (normalizedTarget[0] === 'Sqrt' || normalizedTarget[0] === 'Root')
      && power.numerator === 1
    ) {
      continue;
    }

    const transform = buildLiftedPowerTransform(power, attempt.other);
    if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return transform;
    }
  }

  return null;
}

function matchRadicalIsolationTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }
  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const supportedRoots = [
    ...collectSupportedRoots(leftNode, variable),
    ...collectSupportedRoots(rightNode, variable),
  ];
  const supportedTargets = [
    ...collectRadicalTargets(leftNode, variable),
    ...collectRadicalTargets(rightNode, variable),
  ];

  if (supportedTargets.length === 0) {
    return null;
  }

  if (supportedRoots.length > 2) {
    return null;
  }

  if (supportedRoots.length > 1 && supportedRoots.some((root) => root.index !== 2)) {
    return null;
  }

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    if (!isSupportedRightSideExpression(attempt.otherSide, variable)) {
      continue;
    }

    const candidates = collectRadicalTargets(attempt.targetSide, variable).sort((left, right) => {
      const priority = (target: RadicalTarget) => {
        if (target.kind === 'reciprocal-root') {
          return 0;
        }
        if (target.kind === 'root') {
          return 1;
        }
        return 2;
      };
      return priority(left) - priority(right);
    });

    for (const candidate of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedBase) {
        continue;
      }

      if (candidate.kind === 'power') {
        const transform = buildLiftedPowerTransform(candidate.power, isolatedBase.isolated);
        if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
          return transform;
        }
        continue;
      }

      if (candidate.kind === 'root') {
        const transform = buildRadicalPowerTransform(candidate.root, isolatedBase.isolated);
        if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
          return transform;
        }
        continue;
      }

      const radicalExpression = buildQuotientNode(
        buildScalarNode(candidate.numeratorScalar),
        isolatedBase.isolated,
      );
      const transform = buildRadicalPowerTransform(candidate.root, radicalExpression, [{
        kind: 'nonzero',
        expressionLatex: boxLatex(isolatedBase.isolated),
      }]);
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

function matchPerfectSquareAbsoluteValueTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const target = matchPerfectSquareRadicalCarrier(attempt.targetSide, variable);
    if (!target || !isSupportedRightSideExpression(attempt.otherSide, variable)) {
      continue;
    }

    const transform = buildAbsoluteValueRadicalTransform(target.absNode, attempt.otherSide);
    if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return transform;
    }
  }

  return null;
}

function tryRationalizeSquareRootBinomialSide(node: unknown, variable: string): AlgebraTransform | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Divide' || normalized.length !== 3) {
    return null;
  }

  const profile = buildSquareRootConjugateProfile(normalized[2], variable);
  if (!profile || profile.radicalCount !== 1) {
    return null;
  }

  const rationalizedNode = normalizeAst(['Divide',
    buildProductNode(normalized[1], profile.conjugateNode),
    profile.denominatorProductNode,
  ]);

  const constraints: SolveDomainConstraint[] = [{
    kind: 'nonzero',
    expressionLatex: boxLatex(profile.denominatorNode),
  }];

  return {
    equationLatex: boxLatex(rationalizedNode),
    domainConstraints: mergeConstraints(constraints, profile.conditionConstraints),
    solveBadges: ['Conjugate Transform'],
    solveSummaryText: 'Applied a conjugate to remove a square-root denominator',
    unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function isSupportedClearableDenominator(node: unknown, variable: string) {
  return Boolean(readExactScalar(node) || isSupportedRadicand(node, variable));
}

function tryCrossMultiplySingleFractionEquation(equationLatex: string, variable: string) {
  const parsed = ce.parse(equationLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const attempts: Array<{ fractionSide: unknown; otherSide: unknown; fractionOnLeft: boolean }> = [
    { fractionSide: leftNode, otherSide: rightNode, fractionOnLeft: true },
    { fractionSide: rightNode, otherSide: leftNode, fractionOnLeft: false },
  ];

  for (const attempt of attempts) {
    if (
      !isNodeArray(attempt.fractionSide)
      || attempt.fractionSide[0] !== 'Divide'
      || attempt.fractionSide.length !== 3
    ) {
      continue;
    }

    const denominator = normalizeAst(attempt.fractionSide[2]);
    if (!isSupportedClearableDenominator(denominator, variable)) {
      continue;
    }

    const clearedLeft = attempt.fractionOnLeft
      ? normalizeAst(attempt.fractionSide[1])
      : buildProductNode(leftNode, denominator);
    const clearedRight = attempt.fractionOnLeft
      ? buildProductNode(rightNode, denominator)
      : normalizeAst(attempt.fractionSide[1]);

    return {
      equationLatex: `${boxLatex(clearedLeft)}=${boxLatex(clearedRight)}`,
      domainConstraints: [],
      solveBadges: ['Conjugate Transform', 'LCD Clear'] as SolveBadge[],
      solveSummaryText: 'Applied a conjugate and cleared the remaining supported denominator',
      unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

function matchBoundedAbsoluteValueTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  if (getRadicalTransformDepth(request) <= 0) {
    return null;
  }

  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    if (!isSupportedAbsoluteValueExpression(attempt.otherSide, variable)) {
      continue;
    }

    const candidates = collectAbsoluteValueTargets(attempt.targetSide, variable);
    for (const candidate of candidates) {
      const isolatedMagnitude = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedMagnitude) {
        continue;
      }

      const transform = buildAbsoluteValueBranchTransform(candidate.base, isolatedMagnitude.isolated);
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

function matchConjugateTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }
  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const leftTransform = tryRationalizeSquareRootBinomialSide(leftNode, variable);
  if (leftTransform) {
    const equationLatex = `${leftTransform.equationLatex}=${boxLatex(rightNode)}`;
    const cleared = tryCrossMultiplySingleFractionEquation(equationLatex, variable);
    if (cleared && equationStateKey(cleared.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...cleared,
        domainConstraints: mergeConstraints(leftTransform.domainConstraints, cleared.domainConstraints),
        radicalStepCost: leftTransform.radicalStepCost,
      };
    }
    if (equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...leftTransform,
        equationLatex,
      };
    }
  }

  const rightTransform = tryRationalizeSquareRootBinomialSide(rightNode, variable);
  if (rightTransform) {
    const equationLatex = `${boxLatex(leftNode)}=${rightTransform.equationLatex}`;
    const cleared = tryCrossMultiplySingleFractionEquation(equationLatex, variable);
    if (cleared && equationStateKey(cleared.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...cleared,
        domainConstraints: mergeConstraints(rightTransform.domainConstraints, cleared.domainConstraints),
        radicalStepCost: rightTransform.radicalStepCost,
      };
    }
    if (equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...rightTransform,
        equationLatex,
      };
    }
  }

  return null;
}

function recurseTransform(
  request: GuardedSolveRequest,
  transform: AlgebraTransform,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      transform.solveBadges,
      transform.solveSummaryText,
    );
  }

  const nextRadicalTransformDepth = getRadicalTransformDepth(request) + (transform.radicalStepCost ?? 0);
  if (nextRadicalTransformDepth > executionBudget.maxRadicalTransformSteps) {
    return errorOutcome(
      'Solve',
      RADICAL_STEP_BUDGET_ERROR,
      [],
      [],
      transform.solveBadges,
      transform.solveSummaryText,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = dedupe(transform.branchEquations ?? [transform.equationLatex]).filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    return null;
  }

  const recursiveOutcomes = branchEquations.map((equationLatex) =>
    runGuardedEquationSolve(
      {
        ...request,
        originalLatex: equationLatex,
        resolvedLatex: equationLatex,
        validationLatex: request.validationLatex ?? request.resolvedLatex,
        numericInterval: undefined,
        domainConstraints: mergeConstraints(request.domainConstraints, transform.domainConstraints),
        radicalTransformDepth: nextRadicalTransformDepth,
      },
      depth + 1,
      new Set(trail),
    ));

  const recursiveOutcome = recursiveOutcomes.length === 1
    ? recursiveOutcomes[0]
    : mergeDisplayOutcomes(
        recursiveOutcomes,
        transform.solveBadges,
        dedupe([
          transform.solveSummaryText,
          ...recursiveOutcomes
            .flatMap((outcome) => (outcome.kind !== 'prompt' && outcome.solveSummaryText ? [outcome.solveSummaryText] : [])),
        ]).join('; '),
      );

  if (recursiveOutcome.kind === 'error' && recursiveOutcome.error === UNSUPPORTED_FAMILY_ERROR) {
    if (request.numericInterval) {
      return null;
    }

    return errorOutcome(
      'Solve',
      transform.unresolvedError,
      recursiveOutcome.warnings,
      recursiveOutcome.plannerBadges ?? [],
      dedupe([...(recursiveOutcome.solveBadges ?? []), ...transform.solveBadges]),
      transform.solveSummaryText,
      recursiveOutcome.rejectedCandidateCount,
      recursiveOutcome.substitutionDiagnostics,
      recursiveOutcome.numericMethod,
    );
  }

  const supplementedOutcome: DisplayOutcome =
    recursiveOutcome.kind === 'success'
      ? (() => {
          const newTransformConstraints = subtractConstraints(
            transform.domainConstraints,
            request.domainConstraints,
          );
          const supplements = mergeConditionSupplementLatex(
            recursiveOutcome.exactSupplementLatex ?? [],
            newTransformConstraints,
          );
          return {
            ...recursiveOutcome,
            exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          };
        })()
      : recursiveOutcome;

  if (recursiveOutcomes.length > 1) {
    return supplementedOutcome;
  }

  return appendSolveMetadata(supplementedOutcome, transform.solveBadges, transform.solveSummaryText);
}

function algebraTransformSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const rationalTransform = matchRationalTransform(request);
  if (rationalTransform) {
    const recursive = recurseTransform(
      request,
      rationalTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const directPowerTransform = matchDirectRationalPowerTransform(request);
  if (directPowerTransform) {
    const recursive = recurseTransform(
      request,
      directPowerTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const perfectSquareAbsTransform = matchPerfectSquareAbsoluteValueTransform(request);
  if (perfectSquareAbsTransform) {
    const recursive = recurseTransform(
      request,
      perfectSquareAbsTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const radicalTransform = matchRadicalIsolationTransform(request);
  if (radicalTransform) {
    const recursive = recurseTransform(
      request,
      radicalTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const absoluteValueTransform = matchBoundedAbsoluteValueTransform(request);
  if (absoluteValueTransform) {
    const recursive = recurseTransform(
      request,
      absoluteValueTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const conjugateTransform = matchConjugateTransform(request);
  if (conjugateTransform) {
    const recursive = recurseTransform(
      request,
      conjugateTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  return null;
}

export { algebraTransformSolve };
