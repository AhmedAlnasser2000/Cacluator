import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  buildAbsoluteValueEquationFamily,
  buildAbsoluteValueNonnegativeConstraint as buildSharedAbsNonnegativeConstraint,
  buildAbsoluteValueUnresolvedError,
  collectAbsoluteValueTargets as collectSharedAbsoluteValueTargets,
  isSupportedAbsoluteValueExpression as isSharedAbsoluteValueExpression,
  matchDirectAbsoluteValueEquationNode,
  type RecognizedAbsoluteValueEquationFamily,
  matchAbsoluteValueTarget as matchSharedAbsoluteValueTarget,
  matchPerfectSquareAbsoluteValueCarrier as matchSharedPerfectSquareAbsoluteValueCarrier,
} from '../../abs-core';
import {
  buildSquareRootConjugateProfile,
  isSupportedRadicand,
  mergeSolveDomainConstraints as mergeConstraints,
  matchSupportedRadical,
  matchSupportedRationalPower,
  type SupportedRadical,
  type SupportedRationalPower,
} from '../../radical-core';
import { createBranchSet, mergeBranchFamilies } from '../../algebra/branch-core';
import { parseExactPolynomial } from '../../polynomial-core';
import { recognizeBoundedPolynomialEquationAst } from '../../polynomial-factor-solve';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../symbolic-engine/patterns';
import { buildRationalizedSquareRootQuotient } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { mergeExactSupplementLatex } from '../../exact-supplements';
import { evaluateRealNumericExpression } from '../../real-numeric-eval';
import { solveBoundedPolynomialCarrierEquationAst } from '../polynomial-carrier-follow-on';
import type {
  AbsoluteValueTargetDescriptor,
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
const REPEATED_CLEARING_BUDGET_ERROR = 'This recognized repeated-clearing radical family would require more than one extra bounded radical clear. Use Numeric Solve with an interval in Equation mode.';

type ExactScalar = {
  numerator: number;
  denominator: number;
};

function parseRadicalIndex(node: unknown): number | null {
  return typeof node === 'number' && Number.isInteger(node) && node >= 2
    ? node
    : null;
}

function isEquationSupportedQuadraticRadicand(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(normalizeAst(node), variable, 2);
  return Boolean(polynomial && Math.max(...polynomial.terms.keys(), 0) === 2);
}

function matchEquationSupportedRadical(node: unknown, variable: string): SupportedRadical | null {
  const shared = matchSupportedRadical(node, variable);
  if (shared) {
    return shared;
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (
    normalized[0] === 'Sqrt'
    && normalized.length === 2
    && isEquationSupportedQuadraticRadicand(normalized[1], variable)
  ) {
    return {
      node: normalized,
      radicand: normalized[1],
      index: 2,
    };
  }

  if (
    normalized[0] === 'Root'
    && normalized.length === 3
    && isEquationSupportedQuadraticRadicand(normalized[1], variable)
  ) {
    const index = parseRadicalIndex(normalized[2]);
    if (index !== null) {
      return {
        node: normalized,
        radicand: normalized[1],
        index,
      };
    }
  }

  return null;
}

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

type AlgebraTransform = {
  equationLatex: string;
  branchEquations?: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  unresolvedError: string;
  emptyBranchError?: string;
  blockOnGuidedBranchError?: boolean;
  radicalStepCost?: number;
  repeatedClearingStepCost?: number;
  polynomialCarrierHints?: unknown[];
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

function buildStructuredNegatedNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode(negateScalar(scalar));
  }

  return ['Negate', node];
}

function buildStructuredSumNode(left: unknown, right: unknown) {
  const leftScalar = readExactScalar(left);
  if (leftScalar && isZeroScalar(leftScalar)) {
    return right;
  }

  const rightScalar = readExactScalar(right);
  if (rightScalar && isZeroScalar(rightScalar)) {
    return left;
  }

  return ['Add', left, right];
}

function buildStructuredDifferenceNode(left: unknown, right: unknown) {
  return buildStructuredSumNode(left, buildStructuredNegatedNode(right));
}

function buildProductNode(left: unknown, right: unknown) {
  return simplifyNode(['Multiply', left, right]);
}

function buildQuotientNode(numerator: unknown, denominator: unknown) {
  return simplifyNode(['Divide', numerator, denominator]);
}

function buildStructuredQuotientNode(numerator: unknown, denominator: unknown) {
  const denominatorScalar = readExactScalar(denominator);
  if (denominatorScalar && denominatorScalar.numerator === denominatorScalar.denominator) {
    return numerator;
  }

  return ['Divide', numerator, denominator];
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

function buildNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return buildSharedAbsNonnegativeConstraint(expression);
}

function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  return isSharedAbsoluteValueExpression(node, variable);
}

function collectAbsoluteValueTargets(node: unknown, variable: string, targets: AbsoluteValueTargetDescriptor[] = []) {
  return collectSharedAbsoluteValueTargets(node, variable, targets);
}

function matchPerfectSquareRadicalCarrier(node: unknown, variable: string) {
  return matchSharedPerfectSquareAbsoluteValueCarrier(node, variable);
}

function collectPerfectSquareAbsoluteValueCarriers(
  node: unknown,
  variable: string,
  targets: Array<Exclude<ReturnType<typeof matchPerfectSquareRadicalCarrier>, null>> = [],
) {
  const normalized = normalizeAst(node);
  const target = matchPerfectSquareRadicalCarrier(normalized, variable);
  if (target) {
    targets.push(target);
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectPerfectSquareAbsoluteValueCarriers(child, variable, targets);
  }

  return targets;
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
  const radical = matchEquationSupportedRadical(node, variable);
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
  const root = matchEquationSupportedRadical(normalized, variable);
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
    const denominatorRoot = matchEquationSupportedRadical(normalized[2], variable);
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

function getRepeatedClearingDepth(request: GuardedSolveRequest) {
  return request.repeatedClearingDepth ?? 0;
}

function mergePolynomialCarrierHints(
  existing: unknown[] = [],
  next: unknown[] = [],
) {
  const merged = new Map<string, unknown>();

  for (const hint of [...existing, ...next]) {
    const normalized = normalizeAst(hint);
    const key = termKey(normalized);
    if (!merged.has(key)) {
      merged.set(key, normalized);
    }
  }

  return [...merged.values()];
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
  if (
    readExactScalar(normalized)
    || isSupportedRadicand(normalized, variable)
    || isEquationSupportedQuadraticRadicand(normalized, variable)
  ) {
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

function countEquationRadicalTargets(
  leftNode: unknown,
  rightNode: unknown,
  variable: string,
) {
  return collectRepeatedClearingTargets(leftNode, variable).length + collectRepeatedClearingTargets(rightNode, variable).length;
}

function isRepeatedClearingSupportedTarget(target: RadicalTarget) {
  if (target.kind === 'power') {
    return target.power.denominator === 2 || target.power.denominator % 2 === 1;
  }

  return target.root.index === 2 || target.root.index % 2 === 1;
}

function collectRepeatedClearingTargets(node: unknown, variable: string, targets: RadicalTarget[] = []) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length > 0) {
    if (normalized[0] === 'Sqrt' && normalized.length === 2) {
      targets.push({
        kind: 'root',
        targetNode: normalized,
        root: {
          node: normalized,
          radicand: normalized[1],
          index: 2,
        },
      });
    } else if (normalized[0] === 'Root' && normalized.length === 3) {
      const index = parseRadicalIndex(normalized[2]);
      if (index !== null) {
        targets.push({
          kind: 'root',
          targetNode: normalized,
          root: {
            node: normalized,
            radicand: normalized[1],
            index,
          },
        });
      }
    } else {
      const power = matchSupportedRationalPower(normalized, variable);
      if (power) {
        targets.push({
          kind: 'power',
          targetNode: normalized,
          power,
        });
      }
    }
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRepeatedClearingTargets(child, variable, targets);
  }

  return targets;
}

function buildRepeatedClearingHints(target: RadicalTarget) {
  if (target.kind === 'power') {
    return [target.power.base];
  }

  return [target.root.radicand];
}

function isRecognizedPolynomialSink(
  parsedEquation: unknown,
  carrierHints: unknown[] = [],
) {
  if (recognizeBoundedPolynomialEquationAst(parsedEquation, 'x')) {
    return true;
  }

  return solveBoundedPolynomialCarrierEquationAst(parsedEquation, carrierHints).kind !== 'none';
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
): { isolated: unknown; structuredIsolated: unknown } | null {
  const replaced = replaceFirstMatch(targetSide, targetKey, PLACEHOLDER_SYMBOL);
  if (!replaced.replaced) {
    return null;
  }

  const linear = parseLinearPlaceholder(replaced.node, PLACEHOLDER_SYMBOL);
  if (!linear || isZeroScalar(linear.a)) {
    return null;
  }

  const numerator = buildDifferenceNode(otherSide, linear.remainder);
  const structuredNumerator = buildStructuredDifferenceNode(otherSide, linear.remainder);
  const denominatorNode = buildScalarNode(linear.a);
  const isolated = buildQuotientNode(numerator, buildScalarNode(linear.a));
  const structuredIsolated = buildStructuredQuotientNode(structuredNumerator, denominatorNode);
  return {
    isolated,
    structuredIsolated,
  };
}

function buildRadicalPowerTransform(
  root: SupportedRadical,
  isolated: unknown,
  extraConstraints: SolveDomainConstraint[] = [],
  preserveSquareStructure = false,
): AlgebraTransform {
  const powered = root.index === 2
    ? preserveSquareStructure
      ? normalizeAst(buildPowerNode(isolated, 2))
      : normalizeAst((expand(ce.box(['Power', isolated, 2] as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json)
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

  const branchEquations = createBranchSet({
    equations: branchNodes.map((branchNode) => `${boxLatex(power.base)}=${boxLatex(branchNode)}`),
    constraints: domainConstraints,
    provenance: 'guarded-algebra-stage',
  });

  return {
    equationLatex: branchEquations.equations[0],
    branchEquations: branchEquations.equations,
    domainConstraints: branchEquations.constraints ?? domainConstraints,
    solveBadges: ['Power Lift'],
    solveSummaryText: 'Isolated a rational power and applied an exact lift',
    unresolvedError: 'This recognized rational-power family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function buildRepeatedClearingTransform(
  target: RadicalTarget,
  structuredIsolated: unknown,
): AlgebraTransform {
  if (target.kind === 'power') {
    const transform = buildLiftedPowerTransform(target.power, structuredIsolated);
    return {
      ...transform,
      radicalStepCost: 0,
      repeatedClearingStepCost: 1,
      polynomialCarrierHints: buildRepeatedClearingHints(target),
    };
  }

  if (target.kind === 'root') {
    const transform = buildRadicalPowerTransform(target.root, structuredIsolated, [], true);
    return {
      ...transform,
      radicalStepCost: 0,
      repeatedClearingStepCost: 1,
      polynomialCarrierHints: buildRepeatedClearingHints(target),
    };
  }

  const radicalExpression = buildQuotientNode(
    buildScalarNode(target.numeratorScalar),
    structuredIsolated,
  );
  const transform = buildRadicalPowerTransform(target.root, radicalExpression, [{
    kind: 'nonzero',
    expressionLatex: boxLatex(structuredIsolated),
  }], true);

  return {
    ...transform,
    radicalStepCost: 0,
    repeatedClearingStepCost: 1,
    polynomialCarrierHints: buildRepeatedClearingHints(target),
  };
}

function buildAbsoluteValueRadicalTransform(
  absNode: unknown,
  otherSide: unknown,
  variable: string,
): AlgebraTransform {
  const target = matchSharedAbsoluteValueTarget(absNode, variable);
  if (target) {
    const family = buildAbsoluteValueEquationFamily(target, otherSide, variable);
    return {
      equationLatex: family.branchEquations[0],
      branchEquations: family.branchEquations,
      domainConstraints: family.branchConstraints,
      solveBadges: ['Radical Isolation'],
      solveSummaryText: 'Reduced an exact square-root square into a bounded absolute-value carrier',
      unresolvedError: buildAbsoluteValueUnresolvedError(family),
      radicalStepCost: 1,
    };
  }

  return {
    equationLatex: `${boxLatex(absNode)}=${boxLatex(otherSide)}`,
    solveBadges: ['Radical Isolation'],
    solveSummaryText: 'Reduced an exact square-root square into a bounded absolute-value carrier',
    unresolvedError: 'This recognized absolute-value family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function buildAbsoluteValueBranchTransform(family: RecognizedAbsoluteValueEquationFamily): AlgebraTransform {
  return {
    equationLatex: family.branchEquations[0] ?? '',
    branchEquations: family.branchEquations,
    domainConstraints: family.branchConstraints,
    solveBadges: [],
    solveSummaryText: 'Branched a bounded absolute-value family into exact cases',
    unresolvedError: buildAbsoluteValueUnresolvedError(family),
    emptyBranchError: family.emptyBranchError,
    blockOnGuidedBranchError: family.blockOnGuidedBranchError,
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
      const allowsPolynomialIsolation =
        (request.repeatedClearingDepth ?? 0) > 0
        || (request.polynomialCarrierHints?.length ?? 0) > 0;
      if (
        !isSupportedRightSideExpression(isolatedBase.isolated, variable)
        && !isSupportedRightSideExpression(isolatedBase.structuredIsolated, variable)
        && !(
          allowsPolynomialIsolation
          && (
            parseExactPolynomial(normalizeAst(isolatedBase.isolated), variable, 4)
            || parseExactPolynomial(normalizeAst(isolatedBase.structuredIsolated), variable, 4)
          )
        )
      ) {
        continue;
      }

      if (candidate.kind === 'power') {
        const useStructuredIsolation =
          (request.repeatedClearingDepth ?? 0) > 0
          || (request.polynomialCarrierHints?.length ?? 0) > 0;
        const transform = buildLiftedPowerTransform(
          candidate.power,
          useStructuredIsolation ? isolatedBase.structuredIsolated : isolatedBase.isolated,
        );
        if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
          return transform;
        }
        continue;
      }

      if (candidate.kind === 'root') {
        const useStructuredIsolation =
          (request.repeatedClearingDepth ?? 0) > 0
          || (request.polynomialCarrierHints?.length ?? 0) > 0;
        const transform = buildRadicalPowerTransform(
          candidate.root,
          useStructuredIsolation ? isolatedBase.structuredIsolated : isolatedBase.isolated,
          [],
          useStructuredIsolation,
        );
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
    const candidates = collectPerfectSquareAbsoluteValueCarriers(attempt.targetSide, variable);

    for (const target of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(target.targetNode),
      );
      if (!isolatedBase || !isSupportedRightSideExpression(isolatedBase.isolated, variable)) {
        continue;
      }

      const transform = buildAbsoluteValueRadicalTransform(target.absNode, isolatedBase.isolated, variable);
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

function matchRepeatedClearingTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const currentTargetCount = countEquationRadicalTargets(leftNode, rightNode, variable);
  if (currentTargetCount === 0) {
    return null;
  }

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const candidates = collectRepeatedClearingTargets(attempt.targetSide, variable)
      .filter((target) => isRepeatedClearingSupportedTarget(target));

    for (const candidate of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedBase) {
        continue;
      }

      const transform = buildRepeatedClearingTransform(
        candidate,
        isolatedBase.structuredIsolated,
      );
      if (equationStateKey(transform.equationLatex) === equationStateKey(request.resolvedLatex)) {
        continue;
      }

      const transformedParsed = ce.parse(transform.equationLatex).json;
      if (!isNodeArray(transformedParsed) || transformedParsed[0] !== 'Equal' || transformedParsed.length !== 3) {
        continue;
      }

      const nextLeftNode = normalizeAst(transformedParsed[1]);
      const nextRightNode = normalizeAst(transformedParsed[2]);
      const nextTargetCount = countEquationRadicalTargets(nextLeftNode, nextRightNode, variable);
      const carrierHints = mergePolynomialCarrierHints(
        request.polynomialCarrierHints,
        transform.polynomialCarrierHints,
      );

      if (isRecognizedPolynomialSink(transformedParsed, carrierHints)) {
        return {
          ...transform,
          polynomialCarrierHints: carrierHints,
        };
      }

      if (nextTargetCount > 0 && nextTargetCount < currentTargetCount) {
        return {
          ...transform,
          polynomialCarrierHints: carrierHints,
        };
      }
    }
  }

  return null;
}

function tryRationalizeSquareRootDenominatorSide(node: unknown, variable: string): AlgebraTransform | null {
  const normalized = normalizeAst(node);
  const quotient =
    isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3
      ? { numerator: normalized[1], denominator: normalized[2] }
      : isNodeArray(normalized)
        && normalized[0] === 'Power'
        && normalized.length === 3
        && normalized[2] === -1
          ? { numerator: 1 as unknown, denominator: normalized[1] }
          : null;
  if (!quotient) {
    return null;
  }

  const rationalized = buildRationalizedSquareRootQuotient(
    quotient.numerator,
    quotient.denominator,
    variable,
  );
  if (!rationalized) {
    return null;
  }

  const constraints: SolveDomainConstraint[] = [{
    kind: 'nonzero',
    expressionLatex: boxLatex(quotient.denominator),
  }];

  return {
    equationLatex: boxLatex(rationalized.node),
    domainConstraints: mergeConstraints(constraints, rationalized.conditionConstraints),
    solveBadges: ['Conjugate Transform'],
    solveSummaryText: rationalized.usedResidualCleanup
      ? 'Applied bounded conjugates to remove the supported square-root denominator'
      : 'Applied a conjugate to remove a square-root denominator',
    unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function extractReciprocalTargetNode(node: unknown): unknown | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3 && normalized[1] === 1) {
    return normalized[2];
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3 && normalized[2] === -1) {
    return normalized[1];
  }

  const scalar = readExactScalar(normalized);
  if (!scalar || scalar.numerator === 0) {
    return null;
  }

  return buildScalarNode({
    numerator: scalar.denominator,
    denominator: scalar.numerator,
  });
}

function matchThreeTermReciprocalEqualityTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const attempts: Array<{ reciprocalSide: unknown; otherSide: unknown }> = [
    { reciprocalSide: leftNode, otherSide: rightNode },
    { reciprocalSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const reciprocalDenominator = extractReciprocalTargetNode(attempt.reciprocalSide);
    if (!reciprocalDenominator) {
      continue;
    }

    const profile = buildSquareRootConjugateProfile(reciprocalDenominator, variable);
    if (!profile || profile.familyId !== 'three-term-scalar-double-radical') {
      continue;
    }

    const reciprocalTarget = extractReciprocalTargetNode(attempt.otherSide);
    if (!reciprocalTarget || !isSupportedRightSideExpression(reciprocalTarget, variable)) {
      continue;
    }

    const equationLatex = `${boxLatex(reciprocalDenominator)}=${boxLatex(reciprocalTarget)}`;
    if (equationStateKey(equationLatex) === equationStateKey(request.resolvedLatex)) {
      continue;
    }

    return {
      equationLatex,
      domainConstraints: mergeConstraints([{
        kind: 'nonzero',
        expressionLatex: boxLatex(reciprocalDenominator),
      }], profile.conditionConstraints),
      solveBadges: ['LCD Clear'],
      solveSummaryText: 'Cleared a bounded reciprocal equality into a supported denominator equation',
      unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
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

function equationContainsDivision(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Divide') {
    return true;
  }

  return node.slice(1).some((child) => equationContainsDivision(child));
}

function canUseBoundedConjugateEquation(
  equationLatex: string,
  request: GuardedSolveRequest,
  variable: string,
  currentTargetCount: number,
) {
  const transformedParsed = ce.parse(equationLatex).json;
  if (!isNodeArray(transformedParsed) || transformedParsed[0] !== 'Equal' || transformedParsed.length !== 3) {
    return false;
  }

  if (isRecognizedPolynomialSink(transformedParsed, request.polynomialCarrierHints)) {
    return true;
  }

  const nextLeftNode = normalizeAst(transformedParsed[1]);
  const nextRightNode = normalizeAst(transformedParsed[2]);
  const nextTargetCount = countEquationRadicalTargets(nextLeftNode, nextRightNode, variable);

  if (
    !equationContainsDivision(nextLeftNode)
    && !equationContainsDivision(nextRightNode)
    && nextTargetCount > 0
    && nextTargetCount <= currentTargetCount
  ) {
    return true;
  }

  return nextTargetCount > 0 && nextTargetCount < currentTargetCount;
}

function matchBoundedAbsoluteValueTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const directFamily = matchDirectAbsoluteValueEquationNode(parsed);
  if (directFamily) {
    const transform = buildAbsoluteValueBranchTransform(directFamily);
    if (transform.emptyBranchError) {
      return transform;
    }
    if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return transform;
    }
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

      const transform = buildAbsoluteValueBranchTransform(
        buildAbsoluteValueEquationFamily(candidate, isolatedMagnitude.isolated, variable),
      );
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
  const currentTargetCount = countEquationRadicalTargets(leftNode, rightNode, variable);

  const reciprocalEqualityTransform = matchThreeTermReciprocalEqualityTransform(request);
  if (reciprocalEqualityTransform) {
    return reciprocalEqualityTransform;
  }

  const leftTransform = tryRationalizeSquareRootDenominatorSide(leftNode, variable);
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
    if (
      equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)
      && canUseBoundedConjugateEquation(equationLatex, request, variable, currentTargetCount)
    ) {
      return {
        ...leftTransform,
        equationLatex,
      };
    }
  }

  const rightTransform = tryRationalizeSquareRootDenominatorSide(rightNode, variable);
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
    if (
      equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)
      && canUseBoundedConjugateEquation(equationLatex, request, variable, currentTargetCount)
    ) {
      return {
        ...rightTransform,
        equationLatex,
      };
    }
  }

  return null;
}

function isGuidedUnsupportedAbsBranchOutcome(outcome: DisplayOutcome) {
  if (outcome.kind !== 'error') {
    return false;
  }

  if (outcome.error === UNSUPPORTED_FAMILY_ERROR) {
    return true;
  }

  const solveBadges = outcome.solveBadges ?? [];
  return solveBadges.includes('Periodic Family')
    || solveBadges.includes('Composition Branch');
}

function buildBlockedAbsBranchOutcome(
  request: GuardedSolveRequest,
  transform: AlgebraTransform,
  recursiveOutcomes: DisplayOutcome[],
): DisplayOutcome {
  const warnings = dedupe(recursiveOutcomes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(
    recursiveOutcomes.flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.plannerBadges ?? []),
  );
  const solveBadges = dedupe(
    recursiveOutcomes.flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.solveBadges ?? []).concat(transform.solveBadges),
  );
  const periodicFamily = mergeBranchFamilies(
    recursiveOutcomes
      .flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.periodicFamily ? [outcome.periodicFamily] : []),
  );
  const newTransformConstraints = subtractConstraints(
    transform.domainConstraints,
    request.domainConstraints,
  );
  const exactSupplementLatex = mergeExactSupplementLatex(
    ...recursiveOutcomes
      .flatMap((outcome) =>
        outcome.kind === 'prompt'
          ? []
          : [{ latex: outcome.exactSupplementLatex, source: 'legacy' as const }]),
    { constraints: newTransformConstraints, source: 'transform' },
  );

  return {
    kind: 'error',
    title: 'Solve',
    error: transform.unresolvedError,
    warnings,
    plannerBadges,
    solveBadges,
    solveSummaryText: dedupe([
      transform.solveSummaryText,
      ...recursiveOutcomes
        .flatMap((outcome) => (outcome.kind !== 'prompt' && outcome.solveSummaryText ? [outcome.solveSummaryText] : [])),
    ]).join('; '),
    periodicFamily,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    rejectedCandidateCount: recursiveOutcomes.reduce(
      (total, outcome) => total + (outcome.kind === 'prompt' ? 0 : outcome.rejectedCandidateCount ?? 0),
      0,
    ) || undefined,
  };
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
  const nextRepeatedClearingDepth = getRepeatedClearingDepth(request) + (transform.repeatedClearingStepCost ?? 0);
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

  if (nextRepeatedClearingDepth > executionBudget.maxRepeatedClearingSteps) {
    return errorOutcome(
      'Solve',
      REPEATED_CLEARING_BUDGET_ERROR,
      [],
      [],
      transform.solveBadges,
      transform.solveSummaryText,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = createBranchSet({
    equations: transform.branchEquations ?? [transform.equationLatex],
    constraints: transform.domainConstraints,
    provenance: 'guarded-algebra-stage',
  }).equations.filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    if (transform.emptyBranchError) {
      return errorOutcome(
        'Solve',
        transform.emptyBranchError,
        [],
        [],
        transform.solveBadges,
        transform.solveSummaryText,
      );
    }
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
        repeatedClearingDepth: nextRepeatedClearingDepth,
        polynomialCarrierHints: mergePolynomialCarrierHints(
          request.polynomialCarrierHints,
          transform.polynomialCarrierHints,
        ),
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

  if (
    transform.blockOnGuidedBranchError
    && recursiveOutcomes.some((outcome) => isGuidedUnsupportedAbsBranchOutcome(outcome))
  ) {
    if (request.numericInterval) {
      return null;
    }

    return buildBlockedAbsBranchOutcome(request, transform, recursiveOutcomes);
  }

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
          const supplements = mergeExactSupplementLatex(
            { latex: recursiveOutcome.exactSupplementLatex, source: 'legacy' },
            { constraints: newTransformConstraints, source: 'transform' },
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

  const repeatedClearingTransform = matchRepeatedClearingTransform(request);
  if (repeatedClearingTransform) {
    const recursive = recurseTransform(
      request,
      repeatedClearingTransform,
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
