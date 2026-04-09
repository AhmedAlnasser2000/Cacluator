import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../types/calculator';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  type ExactScalar,
} from './polynomial-core';
import { factorBoundedPolynomialAst } from './polynomial-factor-solve';
import { normalizeAst } from './symbolic-engine/normalize';
import { flattenAdd, isNodeArray, termKey } from './symbolic-engine/patterns';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

export type Monomial = {
  scalar: ExactScalar;
  variable?: string;
  exponent: number;
};

export type AffineExpression = {
  a: ExactScalar;
  b: ExactScalar;
};

export type SupportedRadical = {
  node: unknown;
  radicand: unknown;
  index: number;
};

export type SupportedRationalPower = {
  node: unknown;
  base: unknown;
  numerator: number;
  denominator: number;
};

export type SupportedBinomial = {
  node: unknown;
  variable?: string;
};

export type PerfectSquareRadicandProfile = {
  outsideScalar: ExactScalar;
  absInnerNode: unknown;
  normalizedNode: unknown;
};

export type SquareRootConjugateFamilyId =
  | 'two-term-other-radical'
  | 'two-term-double-radical'
  | 'three-term-scalar-double-radical';

export type SquareRootConjugateProfile = {
  denominatorNode: unknown;
  conjugateNode: unknown;
  denominatorProductNode: unknown;
  conditionConstraints: SolveDomainConstraint[];
  radicalCount: number;
  familyId: SquareRootConjugateFamilyId;
  residualCleanupEligible: boolean;
};

function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

function expandAndSimplifyNode(node: unknown) {
  try {
    const expanded = expand(ce.box(node as Parameters<typeof ce.box>[0]) as never) as { json: unknown };
    return simplifyNode(expanded.json);
  } catch {
    return simplifyNode(node);
  }
}

function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator;
}

function combineVariables(left?: string, right?: string) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return left === right ? left : null;
}

function collectVariables(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return;
  }

  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
}

export function detectSingleVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  if (variables.size > 1) {
    return null;
  }

  return [...variables][0];
}

export function expressionHasVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  return variables.size > 0;
}

export function mergeSolveDomainConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

export function buildConditionSupplementLatex(constraints: SolveDomainConstraint[]) {
  const supported = constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return [`${constraint.expressionLatex}\\ne0`];
      case 'nonnegative':
        return [`${constraint.expressionLatex}\\ge0`];
      case 'positive':
        return [`${constraint.expressionLatex}>0`];
      default:
        return [];
    }
  });

  if (supported.length === 0) {
    return [] as string[];
  }

  return [`\\text{Conditions: } ${supported.join(',\\;')}`];
}

export function parseInteger(node: unknown) {
  if (isExactIntegerNode(node)) {
    return node;
  }

  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : null;
}

function parsePositiveRational(node: unknown): ExactScalar | null {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.numerator <= 0 || scalar.denominator <= 0) {
    return null;
  }

  return scalar;
}

export function parseMonomial(node: unknown): Monomial | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      scalar,
      exponent: 0,
    };
  }

  if (typeof normalized === 'string') {
    if (NUMERIC_CONSTANT_SYMBOLS.has(normalized)) {
      return null;
    }

    return {
      scalar: { numerator: 1, denominator: 1 },
      variable: normalized,
      exponent: 1,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseMonomial(normalized[1]);
    if (!child) {
      return null;
    }

    return {
      ...child,
      scalar: normalizeExactScalar({
        numerator: -child.scalar.numerator,
        denominator: child.scalar.denominator,
      }),
    };
  }

  if (
    normalized[0] === 'Power'
    && normalized.length === 3
    && typeof normalized[1] === 'string'
    && !NUMERIC_CONSTANT_SYMBOLS.has(normalized[1])
  ) {
    const exponent = parseInteger(normalized[2]);
    if (exponent === null || exponent === 0) {
      return null;
    }

    return {
      scalar: { numerator: 1, denominator: 1 },
      variable: normalized[1],
      exponent,
    };
  }

  if (normalized[0] === 'Multiply') {
    let current: Monomial = { scalar: { numerator: 1, denominator: 1 }, exponent: 0 };

    for (const child of normalized.slice(1)) {
      const parsed = parseMonomial(child);
      if (!parsed) {
        return null;
      }

      const variable = combineVariables(current.variable, parsed.variable);
      if (variable === null) {
        return null;
      }

      const scalarProduct = multiplyExactScalars(current.scalar, parsed.scalar);
      current = {
        scalar: scalarProduct,
        variable,
        exponent: current.exponent + parsed.exponent,
      };
    }

    return current;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const left = parseMonomial(normalized[1]);
    const right = parseMonomial(normalized[2]);
    if (!left || !right) {
      return null;
    }

    const variable = combineVariables(left.variable, right.variable);
    if (variable === null) {
      return null;
    }

    const scalarQuotient = divideExactScalars(left.scalar, right.scalar);
    if (!scalarQuotient) {
      return null;
    }

    return {
      scalar: scalarQuotient,
      variable,
      exponent: left.exponent - right.exponent,
    };
  }

  return null;
}

export function parseSupportedBinomial(node: unknown): SupportedBinomial | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return null;
  }

  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  let variable: string | undefined;
  for (const term of terms) {
    const monomial = parseMonomial(term);
    if (!monomial) {
      return null;
    }
    variable = combineVariables(variable, monomial.variable) ?? undefined;
    if (variable === undefined && monomial.variable) {
      return null;
    }
  }

  return {
    node: normalized,
    variable,
  };
}

export function parseAffine(node: unknown, variable: string): AffineExpression | null {
  const normalized = normalizeAst(node);
  if (normalized === variable) {
    return {
      a: { numerator: 1, denominator: 1 },
      b: { numerator: 0, denominator: 1 },
    };
  }

  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      b: scalar,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseAffine(normalized[1], variable);
    if (!child) {
      return null;
    }
    return {
      a: negateExactScalar(child.a),
      b: negateExactScalar(child.b),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: ExactScalar = { numerator: 0, denominator: 1 };
    let constant: ExactScalar = { numerator: 0, denominator: 1 };

    for (const child of normalized.slice(1)) {
      const childAffine = parseAffine(child, variable);
      if (!childAffine) {
        return null;
      }

      coefficient = addExactScalars(coefficient, childAffine.a);
      constant = addExactScalars(constant, childAffine.b);
    }

    return {
      a: coefficient,
      b: constant,
    };
  }

  if (normalized[0] === 'Multiply') {
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
    let affineChild: AffineExpression | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalarNode(child);
      if (childScalar) {
        scalarFactor = multiplyExactScalars(scalarFactor, childScalar);
        continue;
      }

      const childAffine = parseAffine(child, variable);
      if (!childAffine || affineChild) {
        return null;
      }
      affineChild = childAffine;
    }

    if (!affineChild) {
      return {
        a: { numerator: 0, denominator: 1 },
        b: scalarFactor,
      };
    }

    return {
      a: multiplyExactScalars(scalarFactor, affineChild.a),
      b: multiplyExactScalars(scalarFactor, affineChild.b),
    };
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const denominatorScalar = readExactScalarNode(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorAffine = parseAffine(normalized[1], variable);
    if (!numeratorAffine) {
      return null;
    }

    const nextA = divideExactScalars(numeratorAffine.a, denominatorScalar);
    const nextB = divideExactScalars(numeratorAffine.b, denominatorScalar);
    if (!nextA || !nextB) {
      return null;
    }

    return {
      a: nextA,
      b: nextB,
    };
  }

  return null;
}

function monomialMatchesVariable(monomial: Monomial | null, variable: string) {
  if (!monomial) {
    return false;
  }

  return !monomial.variable || monomial.variable === variable;
}

export function isSupportedRadicandExpression(node: unknown) {
  return Boolean(
    readExactScalarNode(node)
    || parseMonomial(node)
    || parseSupportedBinomial(node),
  );
}

export function isSupportedRadicand(node: unknown, variable: string) {
  const supportedBinomial = parseSupportedBinomial(node);
  return Boolean(
    readExactScalarNode(node)
    || monomialMatchesVariable(parseMonomial(node), variable)
    || parseAffine(node, variable)
    || (supportedBinomial && (supportedBinomial.variable ?? variable) === variable),
  );
}

function monomialDependsOnVariable(monomial: Monomial) {
  return Boolean(monomial.variable && monomial.exponent !== 0);
}

function isProvablyNonnegativeMonomial(monomial: Monomial) {
  if (monomial.scalar.numerator < 0) {
    return false;
  }

  if (!monomial.variable || monomial.exponent === 0) {
    return true;
  }

  return Math.abs(monomial.exponent) % 2 === 0;
}

export function needsEvenRootConstraint(node: unknown) {
  const monomial = parseMonomial(node);
  if (monomial) {
    return monomialDependsOnVariable(monomial) && !isProvablyNonnegativeMonomial(monomial);
  }

  return Boolean(parseSupportedBinomial(node) && expressionHasVariable(node));
}

export function buildEvenRootConditionConstraints(node: unknown) {
  return needsEvenRootConstraint(node)
    ? [{
        kind: 'nonnegative' as const,
        expressionLatex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
      }]
    : [];
}

export function matchSupportedRadical(node: unknown, variable: string): SupportedRadical | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Sqrt' && normalized.length === 2 && isSupportedRadicand(normalized[1], variable)) {
    return {
      node: normalized,
      radicand: normalized[1],
      index: 2,
    };
  }

  if (normalized[0] === 'Root' && normalized.length === 3) {
    const index = parseInteger(normalized[2]);
    if (index !== null && index >= 2 && isSupportedRadicand(normalized[1], variable)) {
      return {
        node: normalized,
        radicand: normalized[1],
        index,
      };
    }
  }

  return null;
}

export function matchSupportedRationalPower(node: unknown, variable: string): SupportedRationalPower | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Power' && normalized.length === 3) {
    const exponent = parsePositiveRational(normalized[2]);
    if (exponent && exponent.denominator > 1 && isSupportedRadicand(normalized[1], variable)) {
      if (!expressionHasVariable(normalized[1])) {
        return null;
      }
      return {
        node: normalized,
        base: normalized[1],
        numerator: exponent.numerator,
        denominator: exponent.denominator,
      };
    }

    if (!isSupportedRadicand(normalized[1], variable)) {
      const radicalBase = matchSupportedRadical(normalized[1], variable);
      const integerExponent = parseInteger(normalized[2]);
      if (!radicalBase || integerExponent === null || integerExponent <= 0) {
        return null;
      }
      if (!expressionHasVariable(radicalBase.radicand)) {
        return null;
      }

      return {
        node: normalized,
        base: radicalBase.radicand,
        numerator: integerExponent,
        denominator: radicalBase.index,
      };
    }

    return null;
  }

  const radical = matchSupportedRadical(normalized, variable);
  if (radical && expressionHasVariable(radical.radicand)) {
    if (
      isNodeArray(radical.radicand)
      && radical.radicand[0] === 'Power'
      && radical.radicand.length === 3
      && isSupportedRadicand(radical.radicand[1], variable)
    ) {
      const numerator = parseInteger(radical.radicand[2]);
      if (numerator !== null && numerator > 0) {
        return {
          node: normalized,
          base: radical.radicand[1],
          numerator,
          denominator: radical.index,
        };
      }
    }

    return {
      node: normalized,
      base: radical.radicand,
      numerator: 1,
      denominator: radical.index,
    };
  }

  return null;
}

type SupportedSquareRootConjugateTerm =
  | {
      kind: 'scalar';
      node: unknown;
      scalar: ExactScalar;
    }
  | {
      kind: 'other';
      node: unknown;
    }
  | {
      kind: 'radical';
      node: unknown;
      coefficient: ExactScalar;
      radical: SupportedRadical;
    };

function matchSupportedSquareRoot(node: unknown, variable?: string): SupportedRadical | null {
  const normalized = normalizeAst(node);
  if (variable) {
    const radical = matchSupportedRadical(normalized, variable);
    if (radical?.index === 2) {
      return radical;
    }

    if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
      const expandedRadicand = expandAndSimplifyNode(normalized[1]);
      if (isSupportedRadicand(expandedRadicand, variable)) {
        return {
          node: normalized,
          radicand: expandedRadicand,
          index: 2,
        };
      }
    }

    return null;
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Sqrt'
    && normalized.length === 2
    && (
      isSupportedRadicandExpression(normalized[1])
      || isSupportedRadicandExpression(expandAndSimplifyNode(normalized[1]))
    )
  ) {
    const expandedRadicand = expandAndSimplifyNode(normalized[1]);
    return {
      node: normalized,
      radicand: isSupportedRadicandExpression(normalized[1]) ? normalized[1] : expandedRadicand,
      index: 2,
    };
  }

  return null;
}

function isSupportedConjugateOther(node: unknown, variable?: string) {
  if (readExactScalarNode(node)) {
    return true;
  }

  if (parseSupportedBinomial(node)) {
    return true;
  }

  if (!variable) {
    return false;
  }

  const affine = parseAffine(node, variable);
  if (affine) {
    return true;
  }

  const monomial = parseMonomial(node);
  return Boolean(
    monomial
    && monomial.variable === variable
    && Math.abs(monomial.exponent) <= 1,
  );
}

function parseSupportedSquareRootConjugateTerm(
  node: unknown,
  variable?: string,
): SupportedSquareRootConjugateTerm | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      kind: 'scalar',
      node: normalized,
      scalar,
    };
  }

  if (isSupportedConjugateOther(normalized, variable)) {
    return {
      kind: 'other',
      node: normalized,
    };
  }

  const directRadical = matchSupportedSquareRoot(normalized, variable);
  if (directRadical) {
    return {
      kind: 'radical',
      node: normalized,
      coefficient: { numerator: 1, denominator: 1 },
      radical: directRadical,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseSupportedSquareRootConjugateTerm(normalized[1], variable);
    if (!child) {
      return null;
    }

    if (child.kind === 'scalar') {
      return {
        kind: 'scalar',
        node: normalized,
        scalar: negateExactScalar(child.scalar),
      };
    }

    if (child.kind === 'other') {
      return {
        kind: 'other',
        node: normalized,
      };
    }

    return {
      kind: 'radical',
      node: normalized,
      coefficient: negateExactScalar(child.coefficient),
      radical: child.radical,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
    let radical: SupportedRadical | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalarNode(child);
      if (childScalar) {
        scalarFactor = multiplyExactScalars(scalarFactor, childScalar);
        continue;
      }

      const childRadical = matchSupportedSquareRoot(child, variable);
      if (!childRadical || radical) {
        return null;
      }

      radical = childRadical;
    }

    if (!radical) {
      return null;
    }

    return {
      kind: 'radical',
      node: normalized,
      coefficient: scalarFactor,
      radical,
    };
  }

  return null;
}

function buildSquaredConjugateTermNode(term: SupportedSquareRootConjugateTerm) {
  if (term.kind === 'radical') {
    const coefficientSquared = multiplyExactScalars(term.coefficient, term.coefficient);
    if (!coefficientSquared) {
      return null;
    }

    if (coefficientSquared.numerator === 1 && coefficientSquared.denominator === 1) {
      return normalizeAst(term.radical.radicand);
    }

    return simplifyNode([
      'Multiply',
      buildExactScalarNode(coefficientSquared),
      term.radical.radicand,
    ]);
  }

  return simplifyNode(['Power', term.node, 2]);
}

export function buildSquareRootConjugateProfile(
  denominator: unknown,
  variable?: string,
  allowThreeTerm = true,
): SquareRootConjugateProfile | null {
  const normalized = normalizeAst(denominator);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return null;
  }

  const rawTerms = flattenAdd(normalized);
  if (rawTerms.length < 2) {
    return null;
  }

  const rawProfiles = rawTerms
    .map((term) => parseSupportedSquareRootConjugateTerm(term, variable))
    .filter((term): term is SupportedSquareRootConjugateTerm => Boolean(term));

  if (rawProfiles.length !== rawTerms.length) {
    return null;
  }

  const radicalProfiles = rawProfiles.filter(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical',
  );
  const nonRadicalProfiles = rawProfiles.filter((term) => term.kind !== 'radical');
  let termProfiles = rawProfiles;

  if (nonRadicalProfiles.length > 1 && radicalProfiles.length > 0) {
    const combinedNonRadicalNode = normalizeAst(['Add', ...nonRadicalProfiles.map((term) => term.node)]);
    const combinedNonRadical = parseSupportedSquareRootConjugateTerm(combinedNonRadicalNode, variable);
    if (combinedNonRadical && combinedNonRadical.kind !== 'radical') {
      termProfiles = [combinedNonRadical, ...radicalProfiles];
    }
  }

  const terms = termProfiles.map((term) => term.node);
  if (terms.length < 2 || terms.length > 3 || (terms.length === 3 && !allowThreeTerm)) {
    return null;
  }

  const radicalTerms = termProfiles
    .filter((term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical')
    .map((term) => term.radical);

  if (radicalTerms.length === 0) {
    return null;
  }

  const conditionConstraints = radicalTerms.reduce<SolveDomainConstraint[]>(
    (current, radical) => mergeSolveDomainConstraints(current, buildEvenRootConditionConstraints(radical.radicand)),
    [],
  );

  if (terms.length === 2) {
    const leftSquared = buildSquaredConjugateTermNode(termProfiles[0]);
    const rightSquared = buildSquaredConjugateTermNode(termProfiles[1]);
    if (!leftSquared || !rightSquared) {
      return null;
    }

    const conjugateNode = normalizeAst(['Add', terms[0], ['Negate', terms[1]]]);
    const denominatorProductNode = expandAndSimplifyNode([
      'Subtract',
      leftSquared,
      rightSquared,
    ]);

    return {
      denominatorNode: normalized,
      conjugateNode,
      denominatorProductNode,
      conditionConstraints,
      radicalCount: radicalTerms.length,
      familyId: radicalTerms.length === 1
        ? 'two-term-other-radical'
        : 'two-term-double-radical',
      residualCleanupEligible: false,
    };
  }

  const scalarTerm = termProfiles.find(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'scalar' }> => term.kind === 'scalar',
  );
  const radicalGroupTerms = termProfiles.filter(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical',
  );

  if (!scalarTerm || radicalGroupTerms.length !== 2) {
    return null;
  }

  const radicalGroupNode = normalizeAst(['Add', radicalGroupTerms[0].node, radicalGroupTerms[1].node]);
  const conjugateNode = normalizeAst(['Add', scalarTerm.node, ['Negate', radicalGroupNode]]);
  const denominatorProductNode = expandAndSimplifyNode([
    'Subtract',
    ['Power', scalarTerm.node, 2],
    ['Power', radicalGroupNode, 2],
  ]);
  const residualCleanupEligible = Boolean(
    buildSquareRootConjugateProfile(denominatorProductNode, variable, false),
  );

  if (!residualCleanupEligible) {
    return null;
  }

  return {
    denominatorNode: normalized,
    conjugateNode,
    denominatorProductNode,
    conditionConstraints,
    radicalCount: radicalTerms.length,
    familyId: 'three-term-scalar-double-radical',
    residualCleanupEligible: true,
  };
}

function isPerfectSquareInteger(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

function squareRootExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0) {
    return null;
  }

  const numeratorRoot = isPerfectSquareInteger(normalized.numerator);
  const denominatorRoot = isPerfectSquareInteger(normalized.denominator);
  if (numeratorRoot === null || denominatorRoot === null) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function buildAbsAffineNode(variable: string, root: ExactScalar) {
  const scaledVariable = root.denominator === 1
    ? variable
    : simplifyNode(['Multiply', root.denominator, variable]);
  const integerOffset = buildExactScalarNode({ numerator: root.numerator, denominator: 1 });
  const affineNode = simplifyNode(['Add', scaledVariable, ['Negate', integerOffset]]);
  return ['Abs', affineNode];
}

export function recognizePerfectSquareRadicand(
  radicand: unknown,
): PerfectSquareRadicandProfile | null {
  const variable = detectSingleVariable(radicand);
  if (variable === null || !variable) {
    return null;
  }

  let expanded = normalizeAst(radicand);
  try {
    expanded = normalizeAst((expand(ce.box(expanded as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json);
  } catch {
    expanded = normalizeAst(radicand);
  }

  const polynomial = parseExactPolynomial(expanded, variable, 2);
  if (polynomial) {
    const discriminant = quadraticDiscriminant(polynomial);
    if (!discriminant || !exactScalarIsZero(discriminant)) {
      return null;
    }

    const leading = getExactPolynomialCoefficient(polynomial, 2);
    const sqrtLeading = squareRootExactScalar(leading);
    if (!sqrtLeading) {
      return null;
    }

    const b = getExactPolynomialCoefficient(polynomial, 1);
    const denominator = multiplyExactScalars(leading, { numerator: 2, denominator: 1 });
    const root = divideExactScalars(negateExactScalar(b), denominator);
    if (!root) {
      return null;
    }

    const outsideScalar = divideExactScalars(
      sqrtLeading,
      { numerator: root.denominator, denominator: 1 },
    );
    if (!outsideScalar) {
      return null;
    }

    const absInnerNode = buildAbsAffineNode(variable, root);
    const normalizedNode = exactScalarEquals(outsideScalar, { numerator: 1, denominator: 1 })
      ? absInnerNode
      : simplifyNode(['Multiply', buildExactScalarNode(outsideScalar), absInnerNode]);

    return {
      outsideScalar,
      absInnerNode,
      normalizedNode,
    };
  }

  const boundedFactorization = factorBoundedPolynomialAst(expanded, variable);
  if (
    !boundedFactorization
    || boundedFactorization.factors.length !== 1
    || boundedFactorization.factors[0].degree !== 2
    || boundedFactorization.factors[0].multiplicity !== 2
  ) {
    return null;
  }

  const outsideScalar = squareRootExactScalar(boundedFactorization.scalar);
  if (!outsideScalar) {
    return null;
  }

  const absInnerNode = ['Abs', boundedFactorization.factors[0].node];
  const normalizedNode = exactScalarEquals(outsideScalar, { numerator: 1, denominator: 1 })
    ? absInnerNode
    : simplifyNode(['Multiply', buildExactScalarNode(outsideScalar), absInnerNode]);

  return {
    outsideScalar,
    absInnerNode,
    normalizedNode,
  };
}

export function radicalNodeKey(node: unknown) {
  return termKey(normalizeAst(node));
}
