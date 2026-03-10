import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import {
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  termKey,
} from './patterns';
import { normalizeAst } from './normalize';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

type ExactScalar = {
  numerator: number;
  denominator: number;
};

type RadicalNormalizationMode = 'simplify' | 'factor' | 'expand' | 'equation';

type Monomial = {
  scalar: ExactScalar;
  variable?: string;
  exponent: number;
};

type NormalizedNodeResult = {
  node: unknown;
  changed: boolean;
  conditionConstraints: SolveDomainConstraint[];
  rationalized: boolean;
};

export type RadicalNormalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
  rationalized: boolean;
};

export type RadicalConjugateTransformResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
};

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

function addScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  ) ?? { numerator: 0, denominator: 1 };
}

function multiplyScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divideScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function powerScalar(scalar: ExactScalar, exponent: number): ExactScalar | null {
  if (!Number.isInteger(exponent) || exponent < 0) {
    return null;
  }

  return normalizeScalar(
    scalar.numerator ** exponent,
    scalar.denominator ** exponent,
  );
}

function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

function readExactScalar(node: unknown): ExactScalar | null {
  if (isExactIntegerNode(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && isExactIntegerNode(node[1])
    && isExactIntegerNode(node[2])
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

function buildScalarNode(scalar: ExactScalar): unknown {
  if (scalar.denominator === 1) {
    return scalar.numerator;
  }

  return ['Rational', scalar.numerator, scalar.denominator];
}

function buildPowerNode(base: unknown, exponent: number) {
  if (exponent === 1) {
    return base;
  }

  return ['Power', base, exponent];
}

function buildProductNode(parts: unknown[]) {
  const flattened = parts.flatMap((part) =>
    isNodeArray(part) && part[0] === 'Multiply'
      ? part.slice(1)
      : [part]);

  if (flattened.length === 0) {
    return 1;
  }

  if (flattened.length === 1) {
    return flattened[0];
  }

  return ['Multiply', ...flattened];
}

function buildRootNode(index: number, radicand: unknown) {
  if (radicand === 1) {
    return 1;
  }

  return index === 2 ? ['Sqrt', radicand] : ['Root', radicand, index];
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

function detectSingleVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  if (variables.size > 1) {
    return null;
  }

  return [...variables][0];
}

function expressionHasVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  return variables.size > 0;
}

function mergeConstraints(
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

function buildConditionSupplement(constraints: SolveDomainConstraint[]) {
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

function containsRadical(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Sqrt' || node[0] === 'Root') {
    return true;
  }

  return node.slice(1).some((child) => containsRadical(child));
}

function parseInteger(node: unknown) {
  if (isExactIntegerNode(node)) {
    return node;
  }

  const scalar = readExactScalar(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : null;
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

function parseMonomial(node: unknown): Monomial | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalar(normalized);
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

    const nextScalar = multiplyScalars(child.scalar, { numerator: -1, denominator: 1 });
    return nextScalar ? { ...child, scalar: nextScalar } : null;
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

      const scalarProduct = multiplyScalars(current.scalar, parsed.scalar);
      if (!scalarProduct) {
        return null;
      }

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

    const scalarQuotient = divideScalars(left.scalar, right.scalar);
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

function parseSupportedBinomial(node: unknown) {
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

function isSupportedRadicandExpression(node: unknown) {
  return Boolean(readExactScalar(node) || parseMonomial(node) || parseSupportedBinomial(node));
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

function needsEvenRootConstraint(node: unknown) {
  const monomial = parseMonomial(node);
  if (monomial) {
    return monomialDependsOnVariable(monomial) && !isProvablyNonnegativeMonomial(monomial);
  }

  return Boolean(parseSupportedBinomial(node) && expressionHasVariable(node));
}

function buildMonomialNode(monomial: Monomial): unknown {
  const numeratorParts: unknown[] = [];
  const denominatorParts: unknown[] = [];

  if (monomial.scalar.numerator === 0) {
    return 0;
  }

  const sign = monomial.scalar.numerator < 0 ? -1 : 1;
  const numerator = Math.abs(monomial.scalar.numerator);
  if (numerator !== 1 || (!monomial.variable || monomial.exponent === 0)) {
    numeratorParts.push(sign === -1 ? -numerator : numerator);
  } else if (sign === -1) {
    numeratorParts.push(-1);
  }

  if (monomial.scalar.denominator !== 1) {
    denominatorParts.push(monomial.scalar.denominator);
  }

  if (monomial.variable && monomial.exponent !== 0) {
    const powerNode = buildPowerNode(monomial.variable, Math.abs(monomial.exponent));
    if (monomial.exponent > 0) {
      numeratorParts.push(powerNode);
    } else {
      denominatorParts.push(powerNode);
    }
  }

  const numeratorNode = buildProductNode(numeratorParts);
  const denominatorNode = buildProductNode(denominatorParts);

  if (denominatorNode === 1) {
    return numeratorNode;
  }

  return ['Divide', numeratorNode, denominatorNode];
}

function factorInteger(value: number) {
  const factors = new Map<number, number>();
  let remaining = value;
  let divisor = 2;

  while (divisor * divisor <= remaining) {
    while (remaining % divisor === 0) {
      factors.set(divisor, (factors.get(divisor) ?? 0) + 1);
      remaining /= divisor;
    }
    divisor += divisor === 2 ? 1 : 2;
  }

  if (remaining > 1) {
    factors.set(remaining, (factors.get(remaining) ?? 0) + 1);
  }

  return factors;
}

function extractIntegerPerfectPower(value: number, index: number) {
  if (!Number.isInteger(value) || index < 2) {
    return null;
  }

  if (value === 0) {
    return { outside: 0, residual: 1 };
  }

  const isNegative = value < 0;
  if (isNegative && index % 2 === 0) {
    return null;
  }

  const factors = factorInteger(Math.abs(value));
  let outside = 1;
  let residual = 1;
  for (const [prime, exponent] of factors.entries()) {
    outside *= prime ** Math.floor(exponent / index);
    residual *= prime ** (exponent % index);
  }

  return {
    outside: isNegative ? -outside : outside,
    residual,
  };
}

function buildAbsPowerNode(variable: string, exponent: number) {
  const absNode: unknown = ['Abs', variable];
  return exponent === 1 ? absNode : ['Power', absNode, exponent];
}

function buildSimpleRootFromMonomial(monomial: Monomial, index: number): unknown {
  const parts: unknown[] = [];
  if (Math.abs(monomial.scalar.numerator) !== 1 || monomial.exponent === 0 || !monomial.variable) {
    parts.push(buildScalarNode(monomial.scalar));
  } else if (monomial.scalar.numerator === -1) {
    parts.push(-1);
  }

  if (monomial.variable && monomial.exponent !== 0) {
    parts.push(buildPowerNode(monomial.variable, Math.abs(monomial.exponent)));
  }

  const radicand = buildProductNode(parts);
  return buildRootNode(index, radicand);
}

function composeQuotient(
  numeratorNode: unknown,
  denominatorNode: unknown,
): unknown {
  const denominatorScalar = readExactScalar(denominatorNode);
  if (denominatorScalar && denominatorScalar.numerator === 1 && denominatorScalar.denominator === 1) {
    return numeratorNode;
  }

  if (denominatorScalar && denominatorScalar.denominator === 1 && denominatorScalar.numerator < 0) {
    return composeQuotient(
      normalizeAst(['Negate', numeratorNode]),
      buildScalarNode({ numerator: -denominatorScalar.numerator, denominator: 1 }),
    );
  }

  if (denominatorScalar) {
    const reciprocal = normalizeScalar(denominatorScalar.denominator, denominatorScalar.numerator);
    if (reciprocal) {
      return buildProductNode([buildScalarNode(reciprocal), numeratorNode]);
    }
  }

  return ['Divide', numeratorNode, denominatorNode];
}

function normalizeDivisionSign(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return node;
  }

  const denominatorScalar = readExactScalar(node[2]);
  if (!denominatorScalar || denominatorScalar.denominator !== 1 || denominatorScalar.numerator >= 0) {
    return node;
  }

  return composeQuotient(
    normalizeAst(['Negate', node[1]]),
    buildScalarNode({ numerator: -denominatorScalar.numerator, denominator: 1 }),
  );
}

function normalizeMonomialRoot(
  monomial: Monomial,
  index: number,
  mode: RadicalNormalizationMode,
): { node: unknown; conditionConstraints: SolveDomainConstraint[] } | null {
  if (monomial.scalar.numerator === 0) {
    return {
      node: 0,
      conditionConstraints: [],
    };
  }

  const scalarExtraction = extractIntegerPerfectPower(monomial.scalar.numerator, index);
  const denominatorExtraction = extractIntegerPerfectPower(monomial.scalar.denominator, index);
  if (!scalarExtraction || !denominatorExtraction) {
    return null;
  }

  const evenRoot = index % 2 === 0;
  const numeratorParts: unknown[] = [];
  const denominatorParts: unknown[] = [];
  const constraints: SolveDomainConstraint[] = [];

  if (monomial.variable && monomial.exponent < 0) {
    constraints.push({
      kind: 'nonzero',
      expressionLatex: monomial.variable,
    });
  }

  if (scalarExtraction.outside !== 1) {
    numeratorParts.push(scalarExtraction.outside);
  }

  if (denominatorExtraction.outside !== 1) {
    denominatorParts.push(denominatorExtraction.outside);
  }

  let numeratorResidualExponent = 0;
  let denominatorResidualExponent = 0;

  if (monomial.variable && monomial.exponent !== 0) {
    if (evenRoot && mode === 'equation') {
      if (monomial.exponent > 0) {
        numeratorResidualExponent = monomial.exponent;
      } else {
        denominatorResidualExponent = -monomial.exponent;
      }
    } else if (monomial.exponent > 0) {
      const outsideExponent = Math.floor(monomial.exponent / index);
      const residualExponent = monomial.exponent % index;
      if (outsideExponent > 0) {
        numeratorParts.push(evenRoot
          ? buildAbsPowerNode(monomial.variable, outsideExponent)
          : buildPowerNode(monomial.variable, outsideExponent));
      }
      numeratorResidualExponent = residualExponent;
    } else {
      const absoluteExponent = -monomial.exponent;
      const outsideExponent = Math.floor(absoluteExponent / index);
      const residualExponent = absoluteExponent % index;
      if (outsideExponent > 0) {
        denominatorParts.push(evenRoot
          ? buildAbsPowerNode(monomial.variable, outsideExponent)
          : buildPowerNode(monomial.variable, outsideExponent));
      }
      denominatorResidualExponent = residualExponent;
    }
  }

  const numeratorResidual: Monomial = {
    scalar: { numerator: scalarExtraction.residual, denominator: 1 },
    variable: monomial.variable,
    exponent: numeratorResidualExponent,
  };
  const denominatorResidual: Monomial = {
    scalar: { numerator: denominatorExtraction.residual, denominator: 1 },
    variable: monomial.variable,
    exponent: denominatorResidualExponent,
  };

  if (evenRoot) {
    if (monomialDependsOnVariable(numeratorResidual) && !isProvablyNonnegativeMonomial(numeratorResidual)) {
      constraints.push({
        kind: 'nonnegative',
        expressionLatex: boxLatex(buildMonomialNode(numeratorResidual)),
      });
    }

    if (monomialDependsOnVariable(denominatorResidual) && !isProvablyNonnegativeMonomial(denominatorResidual)) {
      constraints.push({
        kind: 'nonnegative',
        expressionLatex: boxLatex(buildMonomialNode(denominatorResidual)),
      });
    }
  }

  if (!(numeratorResidual.scalar.numerator === 1 && numeratorResidual.exponent === 0)) {
    numeratorParts.push(buildSimpleRootFromMonomial(numeratorResidual, index));
  }

  if (!(denominatorResidual.scalar.numerator === 1 && denominatorResidual.exponent === 0)) {
    denominatorParts.push(buildSimpleRootFromMonomial(denominatorResidual, index));
  }

  const numeratorNode = buildProductNode(numeratorParts);
  const denominatorNode = buildProductNode(denominatorParts);

  return {
    node: denominatorNode === 1
      ? numeratorNode
      : composeQuotient(numeratorNode, denominatorNode),
    conditionConstraints: constraints,
  };
}

function decomposeAddTerm(node: unknown) {
  const factors = flattenMultiply(node).map((factor) => normalizeAst(factor));
  let scalar: ExactScalar = { numerator: 1, denominator: 1 };
  const symbolicFactors: unknown[] = [];

  for (const factor of factors) {
    const factorScalar = readExactScalar(factor);
    if (factorScalar) {
      const nextScalar = multiplyScalars(scalar, factorScalar);
      if (!nextScalar) {
        return null;
      }
      scalar = nextScalar;
    } else {
      symbolicFactors.push(factor);
    }
  }

  const normalizedFactors = symbolicFactors
    .slice()
    .sort((left, right) => termKey(left).localeCompare(termKey(right)));

  return {
    scalar,
    factors: normalizedFactors,
  };
}

function buildAddTerm(
  scalar: ExactScalar,
  factors: unknown[],
): unknown {
  if (scalar.numerator === 0) {
    return 0;
  }

  const parts: unknown[] = [];
  if (scalar.numerator !== 1 || scalar.denominator !== 1 || factors.length === 0) {
    parts.push(buildScalarNode(scalar));
  }
  parts.push(...factors);

  return buildProductNode(parts);
}

function addChildren(children: unknown[]) {
  if (children.length === 0) {
    return 0;
  }
  if (children.length === 1) {
    return children[0];
  }
  return ['Add', ...children];
}

function multiplyChildren(children: unknown[]) {
  if (children.length === 0) {
    return 1;
  }
  if (children.length === 1) {
    return children[0];
  }
  return ['Multiply', ...children];
}

function combineAddTerms(children: unknown[]) {
  const terms = children.flatMap((child) => flattenAdd(child));
  const groups = new Map<string, { scalar: ExactScalar; factors: unknown[] }>();

  for (const term of terms) {
    const decomposed = decomposeAddTerm(term);
    if (!decomposed) {
      return { node: addChildren(terms), changed: false };
    }

    const key = JSON.stringify(decomposed.factors);
    const current = groups.get(key);
    groups.set(key, {
      factors: decomposed.factors,
      scalar: current ? addScalars(current.scalar, decomposed.scalar) : decomposed.scalar,
    });
  }

  const combined = [...groups.values()]
    .filter((entry) => entry.scalar.numerator !== 0)
    .map((entry) => buildAddTerm(entry.scalar, entry.factors));

  const originalNode = addChildren(terms);
  const combinedNode = addChildren(combined);
  return {
    node: combinedNode,
    changed: termKey(combinedNode) !== termKey(originalNode),
  };
}

function isSupportedConjugateOther(node: unknown, variable?: string) {
  if (readExactScalar(node)) {
    return true;
  }

  if (parseSupportedBinomial(node)) {
    return true;
  }

  if (!variable) {
    return false;
  }

  const monomial = parseMonomial(node);
  if (!monomial || monomial.variable !== variable) {
    return false;
  }

  return Math.abs(monomial.exponent) <= 1;
}

function matchSquareRoot(node: unknown) {
  return isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2 ? node[1] : null;
}

function decomposeSignedTerm(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return {
      sign: -1,
      node: node[1],
    };
  }

  return {
    sign: 1,
    node,
  };
}

function tryRationalizeMonomialDenominator(
  numerator: unknown,
  denominator: unknown,
  mode: RadicalNormalizationMode,
) {
  if (mode !== 'simplify') {
    return null;
  }

  const factors = flattenMultiply(denominator).map((factor) => normalizeAst(factor));
  let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
  const symbolicFactors: unknown[] = [];

  for (const factor of factors) {
    const exact = readExactScalar(factor);
    if (exact) {
      const nextScalar = multiplyScalars(scalarFactor, exact);
      if (!nextScalar) {
        return null;
      }
      scalarFactor = nextScalar;
    } else {
      symbolicFactors.push(factor);
    }
  }

  if (symbolicFactors.length !== 1) {
    return null;
  }

  const radicalFactor = symbolicFactors[0];
  const index = isNodeArray(radicalFactor) && radicalFactor[0] === 'Sqrt'
    ? 2
    : isNodeArray(radicalFactor) && radicalFactor[0] === 'Root' && radicalFactor.length === 3
      ? parseInteger(radicalFactor[2])
      : null;
  const radicand = isNodeArray(radicalFactor) && radicalFactor[0] === 'Sqrt'
    ? radicalFactor[1]
    : isNodeArray(radicalFactor) && radicalFactor[0] === 'Root'
      ? radicalFactor[1]
      : null;

  if (!index || !radicand) {
    return null;
  }

  const monomial = parseMonomial(radicand);
  if (!monomial) {
    return null;
  }

  const multiplierScalar = powerScalar(monomial.scalar, index - 1);
  if (!multiplierScalar) {
    return null;
  }

  const multiplierMonomial: Monomial = {
    scalar: multiplierScalar,
    variable: monomial.variable,
    exponent: monomial.exponent * (index - 1),
  };
  const multiplierRadicand = buildMonomialNode(multiplierMonomial);
  const multiplierNode = buildRootNode(index, multiplierRadicand);
  const newNumerator = buildProductNode([numerator, multiplierNode]);

  const denominatorMultiplier = buildMonomialNode(monomial);
  const newDenominator = buildProductNode([buildScalarNode(scalarFactor), denominatorMultiplier]);

  return {
    node: normalizeDivisionSign(composeQuotient(newNumerator, newDenominator)),
    rationalized: true,
  };
}

function tryRationalizeSquareRootBinomial(
  numerator: unknown,
  denominator: unknown,
  mode: RadicalNormalizationMode,
  variable: string | undefined,
) {
  if (mode !== 'simplify' || !isNodeArray(denominator) || denominator[0] !== 'Add' || denominator.length !== 3) {
    return null;
  }

  const first = decomposeSignedTerm(denominator[1]);
  const second = decomposeSignedTerm(denominator[2]);
  const rootFirst = matchSquareRoot(first.node);
  const rootSecond = matchSquareRoot(second.node);

  const rootTerm = rootFirst !== null
    ? { rootNode: first.node, radicand: rootFirst, sign: first.sign, other: second.node }
    : rootSecond !== null
      ? { rootNode: second.node, radicand: rootSecond, sign: second.sign, other: first.node }
      : null;
  if (!rootTerm) {
    return null;
  }

  if (!isSupportedRadicandExpression(rootTerm.radicand) || !isSupportedConjugateOther(rootTerm.other, variable)) {
    return null;
  }

  const conjugate = addChildren([
    rootTerm.other,
    rootTerm.sign === 1
      ? ['Negate', rootTerm.rootNode]
      : rootTerm.rootNode,
  ]);
  const numeratorProduct = buildProductNode([numerator, conjugate]);
  const denominatorDifference = addChildren([
    ['Power', rootTerm.other, 2],
    ['Negate', rootTerm.radicand],
  ]);

  return {
    node: normalizeDivisionSign(composeQuotient(numeratorProduct, denominatorDifference)),
    rationalized: true,
  };
}

function canApplyConjugateTransform(
  node: unknown,
  variable: string | undefined,
) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Divide' || normalized.length !== 3) {
    return false;
  }

  const denominator = normalizeAst(normalized[2]);
  if (!isNodeArray(denominator) || denominator[0] !== 'Add' || denominator.length !== 3) {
    return false;
  }

  const first = decomposeSignedTerm(denominator[1]);
  const second = decomposeSignedTerm(denominator[2]);
  const rootFirst = matchSquareRoot(first.node);
  const rootSecond = matchSquareRoot(second.node);

  const rootTerm = rootFirst !== null
    ? { radicand: rootFirst, other: second.node }
    : rootSecond !== null
      ? { radicand: rootSecond, other: first.node }
      : null;

  return Boolean(
    rootTerm
    && isSupportedRadicandExpression(rootTerm.radicand)
    && isSupportedConjugateOther(rootTerm.other, variable)
  );
}

function normalizeNode(
  node: unknown,
  mode: RadicalNormalizationMode,
  variable?: string,
): NormalizedNodeResult {
  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      changed: false,
      conditionConstraints: [],
      rationalized: false,
    };
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      changed: termKey(normalized) !== termKey(node),
      conditionConstraints: [],
      rationalized: false,
    };
  }

  const operator = normalized[0];
  const children = normalized.slice(1);

  if (operator === 'Sqrt' && children.length === 1) {
    const childResult = normalizeNode(children[0], mode, variable);
    const monomial = parseMonomial(childResult.node);
    const rootResult = monomial
      ? normalizeMonomialRoot(monomial, 2, mode)
      : null;
    if (rootResult) {
      return {
        node: rootResult.node,
        changed: childResult.changed || termKey(rootResult.node) !== termKey(normalized),
        conditionConstraints: mergeConstraints(childResult.conditionConstraints, rootResult.conditionConstraints),
        rationalized: childResult.rationalized,
      };
    }

    const conditionConstraints = needsEvenRootConstraint(childResult.node)
      ? mergeConstraints(childResult.conditionConstraints, [{
        kind: 'nonnegative',
        expressionLatex: boxLatex(childResult.node),
      }])
      : childResult.conditionConstraints;

    return {
      node: ['Sqrt', childResult.node],
      changed: childResult.changed,
      conditionConstraints,
      rationalized: childResult.rationalized,
    };
  }

  if (operator === 'Root' && children.length === 2) {
    const index = parseInteger(children[1]);
    if (index === null || Math.abs(index) < 2) {
      return {
        node: normalized,
        changed: false,
        conditionConstraints: [],
        rationalized: false,
      };
    }

    if (index < 0) {
      return normalizeNode(['Divide', 1, ['Root', children[0], -index]], mode, variable);
    }

    const childResult = normalizeNode(children[0], mode, variable);
    const monomial = parseMonomial(childResult.node);
    const rootResult = monomial
      ? normalizeMonomialRoot(monomial, index, mode)
      : null;
    if (rootResult) {
      return {
        node: rootResult.node,
        changed: childResult.changed || termKey(rootResult.node) !== termKey(normalized),
        conditionConstraints: mergeConstraints(childResult.conditionConstraints, rootResult.conditionConstraints),
        rationalized: childResult.rationalized,
      };
    }

    const conditionConstraints = index % 2 === 0 && needsEvenRootConstraint(childResult.node)
      ? mergeConstraints(childResult.conditionConstraints, [{
        kind: 'nonnegative',
        expressionLatex: boxLatex(childResult.node),
      }])
      : childResult.conditionConstraints;

    return {
      node: ['Root', childResult.node, index],
      changed: childResult.changed,
      conditionConstraints,
      rationalized: childResult.rationalized,
    };
  }

  if (operator === 'Add') {
    const childResults = children.map((child) => normalizeNode(child, mode, variable));
    const combined = combineAddTerms(childResults.map((child) => child.node));
    return {
      node: combined.node,
      changed: childResults.some((child) => child.changed) || combined.changed,
      conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
        (current, child) => mergeConstraints(current, child.conditionConstraints),
        [],
      ),
      rationalized: childResults.some((child) => child.rationalized),
    };
  }

  if (operator === 'Multiply') {
    const childResults = children.map((child) => normalizeNode(child, mode, variable));
    const scalarFactors: ExactScalar[] = [];
    const symbolicFactors: unknown[] = [];

    for (const child of childResults) {
      for (const factor of flattenMultiply(child.node)) {
        const scalar = readExactScalar(factor);
        if (scalar) {
          scalarFactors.push(scalar);
        } else {
          symbolicFactors.push(factor);
        }
      }
    }

    const combinedScalar = scalarFactors.reduce<ExactScalar>(
      (current, scalar) => multiplyScalars(current, scalar) ?? current,
      { numerator: 1, denominator: 1 },
    );
    const parts: unknown[] = [];
    if (combinedScalar.numerator !== 1 || combinedScalar.denominator !== 1 || symbolicFactors.length === 0) {
      parts.push(buildScalarNode(combinedScalar));
    }
    parts.push(...symbolicFactors);

    const rebuilt = multiplyChildren(parts);
    return {
      node: rebuilt,
      changed: childResults.some((child) => child.changed) || termKey(rebuilt) !== termKey(normalized),
      conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
        (current, child) => mergeConstraints(current, child.conditionConstraints),
        [],
      ),
      rationalized: childResults.some((child) => child.rationalized),
    };
  }

  if (operator === 'Divide' && children.length === 2) {
    const numeratorResult = normalizeNode(children[0], mode, variable);
    const denominatorResult = normalizeNode(children[1], mode, variable);
    const initialConstraints = mergeConstraints(
      numeratorResult.conditionConstraints,
      denominatorResult.conditionConstraints,
    );

    const denominatorHasRadical = containsRadical(children[1]) || containsRadical(denominatorResult.node);
    const denominatorCondition = denominatorHasRadical && expressionHasVariable(children[1])
      ? [{
          kind: 'nonzero' as const,
          expressionLatex: boxLatex(children[1]),
        }]
      : [];

    const monomialRationalized = tryRationalizeMonomialDenominator(
      numeratorResult.node,
      denominatorResult.node,
      mode,
    );
    if (monomialRationalized) {
      const rerun = normalizeNode(monomialRationalized.node, mode === 'simplify' ? 'factor' : mode, variable);
      return {
        node: rerun.node,
        changed: true,
        conditionConstraints: mergeConstraints(initialConstraints, mergeConstraints(denominatorCondition, rerun.conditionConstraints)),
        rationalized: true,
      };
    }

    const binomialRationalized = tryRationalizeSquareRootBinomial(
      numeratorResult.node,
      denominatorResult.node,
      mode,
      variable,
    );
    if (binomialRationalized) {
      const rerun = normalizeNode(binomialRationalized.node, mode === 'simplify' ? 'factor' : mode, variable);
      return {
        node: rerun.node,
        changed: true,
        conditionConstraints: mergeConstraints(initialConstraints, mergeConstraints(denominatorCondition, rerun.conditionConstraints)),
        rationalized: true,
      };
    }

    return {
      node: normalizeDivisionSign(composeQuotient(numeratorResult.node, denominatorResult.node)),
      changed: numeratorResult.changed || denominatorResult.changed,
      conditionConstraints: mergeConstraints(initialConstraints, denominatorCondition),
      rationalized: numeratorResult.rationalized || denominatorResult.rationalized,
    };
  }

  const childResults = children.map((child) => normalizeNode(child, mode, variable));
  const rebuilt = [operator, ...childResults.map((child) => child.node)];
  return {
    node: rebuilt,
    changed: childResults.some((child) => child.changed) || termKey(rebuilt) !== termKey(normalized),
    conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
      (current, child) => mergeConstraints(current, child.conditionConstraints),
      [],
    ),
    rationalized: childResults.some((child) => child.rationalized),
  };
}

export function normalizeExactRadicalNode(
  node: unknown,
  mode: RadicalNormalizationMode,
): RadicalNormalizationResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }
  const variable = detectedVariable ?? undefined;

  const normalized = normalizeNode(normalizeAst(node), mode, variable);
  const conditionConstraints = mergeConstraints(normalized.conditionConstraints);
  if (!normalized.changed && conditionConstraints.length === 0) {
    return null;
  }

  const normalizedNode = normalizeAst(normalized.node);
  return {
    changed: normalized.changed,
    normalizedNode,
    normalizedLatex: ce.box(normalizedNode as Parameters<typeof ce.box>[0]).latex,
    conditionConstraints,
    exactSupplementLatex: buildConditionSupplement(conditionConstraints),
    rationalized: normalized.rationalized,
  };
}

export function normalizeExactRadicalLatex(
  latex: string,
  mode: RadicalNormalizationMode,
) {
  const parsed = ce.parse(latex);
  return normalizeExactRadicalNode(parsed.json, mode);
}

export function canApplyConjugateTransformNode(node: unknown) {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return false;
  }

  return canApplyConjugateTransform(node, detectedVariable ?? undefined);
}

export function applyConjugateTransformNode(
  node: unknown,
): RadicalConjugateTransformResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }

  if (!canApplyConjugateTransform(node, detectedVariable ?? undefined)) {
    return null;
  }

  const normalized = normalizeExactRadicalNode(node, 'simplify');
  if (!normalized?.rationalized) {
    return null;
  }

  return {
    changed: normalized.changed,
    normalizedNode: normalized.normalizedNode,
    normalizedLatex: normalized.normalizedLatex,
    conditionConstraints: normalized.conditionConstraints,
    exactSupplementLatex: normalized.exactSupplementLatex,
  };
}

export function applyConjugateTransformLatex(latex: string) {
  const parsed = ce.parse(latex);
  return applyConjugateTransformNode(parsed.json);
}
