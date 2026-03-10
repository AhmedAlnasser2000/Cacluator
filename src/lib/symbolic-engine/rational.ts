import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import { factorAst } from './factoring';
import { normalizeAst } from './normalize';
import {
  addTerms,
  buildTermNode,
  boxLatex,
  decomposeProduct,
  flattenAdd,
  isNodeArray,
  mergeFactor,
  termKey,
  type FactorMap,
} from './patterns';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

type ExactScalar = {
  numerator: number;
  denominator: number;
};

type RationalNormalizationMode = 'simplify' | 'factor' | 'lcd';

type RationalTerm = {
  scalar: ExactScalar;
  numeratorFactors: FactorMap;
  denominatorFactors: FactorMap;
};

export type RationalNormalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  numeratorNode: unknown;
  numeratorLatex: string;
  denominatorNode?: unknown;
  denominatorLatex?: string;
  exclusionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
  variable?: string;
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

function lcm(left: number, right: number): number {
  if (left === 0 || right === 0) {
    return 0;
  }
  return Math.abs(left * right) / gcd(left, right);
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

function powerScalar(scalar: ExactScalar, exponent: number): ExactScalar | null {
  if (!Number.isInteger(exponent) || exponent < 0) {
    return null;
  }

  if (exponent === 0) {
    return { numerator: 1, denominator: 1 };
  }

  return normalizeScalar(
    scalar.numerator ** exponent,
    scalar.denominator ** exponent,
  );
}

function cloneFactors(source: FactorMap) {
  const cloned = new Map<string, { node: unknown; exponent: number }>();
  for (const [key, value] of source.entries()) {
    cloned.set(key, { node: value.node, exponent: value.exponent });
  }
  return cloned;
}

function mergeFactors(target: FactorMap, source: FactorMap, exponentScale = 1) {
  for (const value of source.values()) {
    mergeFactor(target, value.node, value.exponent * exponentScale);
  }
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
    return child ? { numerator: -child.numerator, denominator: child.denominator } : null;
  }

  return null;
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

function parseAffine(node: unknown, variable: string): { a: ExactScalar; b: ExactScalar } | null {
  if (node === variable) {
    return {
      a: { numerator: 1, denominator: 1 },
      b: { numerator: 0, denominator: 1 },
    };
  }

  const scalar = readExactScalar(node);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      b: scalar,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = parseAffine(node[1], variable);
    if (!child) {
      return null;
    }
    return {
      a: { numerator: -child.a.numerator, denominator: child.a.denominator },
      b: { numerator: -child.b.numerator, denominator: child.b.denominator },
    };
  }

  if (node[0] === 'Multiply' && node.length === 3) {
    const leftScalar = readExactScalar(node[1]);
    const rightScalar = readExactScalar(node[2]);
    if (leftScalar && node[2] === variable) {
      return {
        a: leftScalar,
        b: { numerator: 0, denominator: 1 },
      };
    }
    if (rightScalar && node[1] === variable) {
      return {
        a: rightScalar,
        b: { numerator: 0, denominator: 1 },
      };
    }
    return null;
  }

  if (node[0] === 'Add') {
    let coefficient = { numerator: 0, denominator: 1 };
    let constant = { numerator: 0, denominator: 1 };
    let sawVariable = false;

    for (const child of node.slice(1)) {
      const childAffine = parseAffine(child, variable);
      if (!childAffine) {
        return null;
      }

      coefficient = addScalars(coefficient, childAffine.a);
      constant = addScalars(constant, childAffine.b);
      sawVariable ||= childAffine.a.numerator !== 0;
    }

    return sawVariable
      ? { a: coefficient, b: constant }
      : null;
  }

  return null;
}

function addScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  ) ?? { numerator: 0, denominator: 1 };
}

function isSupportedMonomialBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  const normalized = normalizeAst(node);
  if (normalized === variable) {
    return true;
  }

  if (readExactScalar(normalized)) {
    return true;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return false;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return isSupportedMonomialBase(normalized[1], variable);
  }

  if (
    normalized[0] === 'Power'
    && normalized.length === 3
    && normalized[1] === variable
  ) {
    const exponent = readExactScalar(normalized[2]);
    return Boolean(exponent && exponent.denominator === 1 && exponent.numerator > 0);
  }

  if (normalized[0] === 'Multiply') {
    let sawSymbolic = false;
    for (const child of normalized.slice(1)) {
      if (readExactScalar(child)) {
        continue;
      }
      if (!isSupportedMonomialBase(child, variable)) {
        return false;
      }
      sawSymbolic = true;
    }
    return sawSymbolic;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    return (
      (isSupportedMonomialBase(normalized[1], variable) && Boolean(readExactScalar(normalized[2])))
      || (Boolean(readExactScalar(normalized[1])) && isSupportedMonomialBase(normalized[2], variable))
    );
  }

  return false;
}

function isSupportedBinomialBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return false;
  }

  const terms = flattenAdd(normalized);
  return terms.length === 2 && terms.every((term) => isSupportedMonomialBase(term, variable));
}

function isSupportedAtomicBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  if (isSupportedMonomialBase(node, variable)) {
    return true;
  }

  if (isSupportedBinomialBase(node, variable)) {
    return true;
  }

  const affine = parseAffine(normalizeAst(node), variable);
  return affine !== null && affine.a.numerator !== 0;
}

function isSupportedAtomicFactor(node: unknown, variable: string | undefined): boolean {
  if (isSupportedAtomicBase(node, variable)) {
    return true;
  }

  return Boolean(
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && isExactIntegerNode(node[2])
    && node[2] > 0
    && isSupportedAtomicBase(node[1], variable),
  );
}

function parseAtomicFactor(node: unknown, variable: string | undefined, allowRefactor: boolean): RationalTerm | null {
  if (isSupportedAtomicFactor(node, variable)) {
    const factors = new Map<string, { node: unknown; exponent: number }>();
    if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && isExactIntegerNode(node[2])) {
      mergeFactor(factors, normalizeAst(node[1]), node[2]);
    } else {
      mergeFactor(factors, normalizeAst(node));
    }
    return {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors: factors,
      denominatorFactors: new Map(),
    };
  }

  if (!allowRefactor) {
    return null;
  }

  const factored = factorAst(normalizeAst(node)).node;
  return termKey(factored) === termKey(normalizeAst(node))
    ? null
    : parseRationalTerm(factored, variable, false);
}

function multiplyTerms(left: RationalTerm, right: RationalTerm): RationalTerm | null {
  const scalar = multiplyScalar(left.scalar, right.scalar);
  if (!scalar) {
    return null;
  }

  const numeratorFactors = cloneFactors(left.numeratorFactors);
  const denominatorFactors = cloneFactors(left.denominatorFactors);
  mergeFactors(numeratorFactors, right.numeratorFactors);
  mergeFactors(denominatorFactors, right.denominatorFactors);

  return {
    scalar,
    numeratorFactors,
    denominatorFactors,
  };
}

function divideTerms(left: RationalTerm, right: RationalTerm): RationalTerm | null {
  const scalar = divideScalar(left.scalar, right.scalar);
  if (!scalar) {
    return null;
  }

  const numeratorFactors = cloneFactors(left.numeratorFactors);
  const denominatorFactors = cloneFactors(left.denominatorFactors);
  mergeFactors(numeratorFactors, right.denominatorFactors);
  mergeFactors(denominatorFactors, right.numeratorFactors);

  return {
    scalar,
    numeratorFactors,
    denominatorFactors,
  };
}

function powerTerm(term: RationalTerm, exponent: number): RationalTerm | null {
  const scalar = powerScalar(term.scalar, exponent);
  if (!scalar) {
    return null;
  }

  return {
    scalar,
    numeratorFactors: scaleFactors(term.numeratorFactors, exponent),
    denominatorFactors: scaleFactors(term.denominatorFactors, exponent),
  };
}

function scaleFactors(source: FactorMap, exponent: number) {
  const result = new Map<string, { node: unknown; exponent: number }>();
  for (const entry of source.values()) {
    mergeFactor(result, entry.node, entry.exponent * exponent);
  }
  return result;
}

function parseRationalTerm(
  node: unknown,
  variable: string | undefined,
  allowRefactor = true,
): RationalTerm | null {
  const scalar = readExactScalar(node);
  if (scalar) {
    return {
      scalar,
      numeratorFactors: new Map(),
      denominatorFactors: new Map(),
    };
  }

  if (typeof node === 'string') {
    if (node !== variable) {
      return null;
    }

    const numeratorFactors = new Map<string, { node: unknown; exponent: number }>();
    mergeFactor(numeratorFactors, node);
    return {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors,
      denominatorFactors: new Map(),
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  const [operator, ...children] = node;

  if (operator === 'Negate' && children.length === 1) {
    const child = parseRationalTerm(children[0], variable, allowRefactor);
    if (!child) {
      return null;
    }
    return {
      ...child,
      scalar: {
        numerator: -child.scalar.numerator,
        denominator: child.scalar.denominator,
      },
    };
  }

  if (operator === 'Multiply') {
    return children.reduce<RationalTerm | null>((current, child) => {
      const parsed = parseRationalTerm(child, variable, allowRefactor);
      if (!current || !parsed) {
        return null;
      }
      return multiplyTerms(current, parsed);
    }, {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors: new Map(),
      denominatorFactors: new Map(),
    });
  }

  if (operator === 'Divide' && children.length === 2) {
    const left = parseRationalTerm(children[0], variable, allowRefactor);
    const right = parseRationalTerm(children[1], variable, true);
    if (!left || !right) {
      return null;
    }
    return divideTerms(left, right);
  }

  if (
    operator === 'Power'
    && children.length === 2
    && isExactIntegerNode(children[1])
    && children[1] > 0
  ) {
    const atomic = parseAtomicFactor(node, variable, allowRefactor);
    if (atomic) {
      return atomic;
    }

    const base = parseRationalTerm(children[0], variable, allowRefactor);
    return base ? powerTerm(base, children[1]) : null;
  }

  return parseAtomicFactor(node, variable, allowRefactor);
}

function buildFactorNodeWithCoefficient(coefficient: number, factors: FactorMap) {
  return buildTermNode(coefficient, factors);
}

function simplifyNode(node: unknown) {
  const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
  return normalizeAst(boxed.simplify().json);
}

function factorNode(node: unknown) {
  return normalizeAst(factorAst(normalizeAst(node)).node);
}

function factorMapMaximum(terms: RationalTerm[]) {
  const result = new Map<string, { node: unknown; exponent: number }>();
  for (const term of terms) {
    for (const [key, value] of term.denominatorFactors.entries()) {
      const current = result.get(key);
      if (!current || value.exponent > current.exponent) {
        result.set(key, { node: value.node, exponent: value.exponent });
      }
    }
  }
  return result;
}

function buildCombinedNumerator(terms: RationalTerm[], denominatorLcm: number, lcdFactors: FactorMap) {
  const numeratorTerms: unknown[] = [];

  for (const term of terms) {
    const coefficient = term.scalar.numerator * (denominatorLcm / term.scalar.denominator);
    if (coefficient === 0) {
      continue;
    }

    const factors = cloneFactors(term.numeratorFactors);
    for (const [key, value] of lcdFactors.entries()) {
      const currentExponent = term.denominatorFactors.get(key)?.exponent ?? 0;
      const exponent = value.exponent - currentExponent;
      if (exponent > 0) {
        mergeFactor(factors, value.node, exponent);
      }
    }

    numeratorTerms.push(buildFactorNodeWithCoefficient(coefficient, factors));
  }

  return numeratorTerms.length === 0 ? 0 : simplifyNode(addTerms(numeratorTerms));
}

function buildCombinedDenominator(denominatorLcm: number, lcdFactors: FactorMap) {
  if (denominatorLcm === 1 && lcdFactors.size === 0) {
    return undefined;
  }

  return normalizeAst(buildFactorNodeWithCoefficient(denominatorLcm, lcdFactors));
}

function cancelCommonFactors(numeratorNode: unknown, denominatorNode: unknown | undefined) {
  if (!denominatorNode) {
    return {
      numeratorNode,
      denominatorNode: undefined,
    };
  }

  const numerator = decomposeProduct(factorNode(numeratorNode));
  const denominator = decomposeProduct(factorNode(denominatorNode));
  if (!numerator || !denominator) {
    return {
      numeratorNode,
      denominatorNode,
    };
  }

  const numeratorFactors = cloneFactors(numerator.factors);
  const denominatorFactors = cloneFactors(denominator.factors);

  for (const [key, value] of numeratorFactors.entries()) {
    const denominatorFactor = denominatorFactors.get(key);
    if (!denominatorFactor) {
      continue;
    }

    const sharedExponent = Math.min(value.exponent, denominatorFactor.exponent);
    if (sharedExponent > 0) {
      const updatedNumerator = value.exponent - sharedExponent;
      const updatedDenominator = denominatorFactor.exponent - sharedExponent;

      if (updatedNumerator > 0) {
        numeratorFactors.set(key, { node: value.node, exponent: updatedNumerator });
      } else {
        numeratorFactors.delete(key);
      }

      if (updatedDenominator > 0) {
        denominatorFactors.set(key, { node: denominatorFactor.node, exponent: updatedDenominator });
      } else {
        denominatorFactors.delete(key);
      }
    }
  }

  const coefficientGcd = gcd(numerator.coefficient, denominator.coefficient);
  let numeratorCoefficient = numerator.coefficient / coefficientGcd;
  let denominatorCoefficient = denominator.coefficient / coefficientGcd;

  if (denominatorCoefficient < 0) {
    numeratorCoefficient *= -1;
    denominatorCoefficient *= -1;
  }

  const simplifiedNumerator = normalizeAst(buildTermNode(numeratorCoefficient, numeratorFactors));
  const simplifiedDenominator =
    denominatorCoefficient === 1 && denominatorFactors.size === 0
      ? undefined
      : normalizeAst(buildTermNode(denominatorCoefficient, denominatorFactors));

  return {
    numeratorNode: simplifyNode(simplifiedNumerator),
    denominatorNode: simplifiedDenominator ? factorNode(simplifiedDenominator) : undefined,
  };
}

function extractExclusionBases(terms: RationalTerm[]) {
  const bases = new Map<string, unknown>();
  for (const term of terms) {
    for (const entry of term.denominatorFactors.values()) {
      const factored = decomposeProduct(factorNode(entry.node));
      if (factored) {
        for (const factor of factored.factors.values()) {
          bases.set(termKey(factor.node), factor.node);
        }
        continue;
      }
      bases.set(termKey(entry.node), entry.node);
    }
  }
  return [...bases.values()].sort((left, right) => boxLatex(left).localeCompare(boxLatex(right)));
}

function buildExclusionMetadata(terms: RationalTerm[]) {
  const bases = extractExclusionBases(terms);
  const constraints = bases.map<SolveDomainConstraint>((node) => ({
    kind: 'nonzero',
    expressionLatex: boxLatex(node),
  }));

  if (constraints.length === 0) {
    return {
      exclusionConstraints: constraints,
      exactSupplementLatex: [] as string[],
    };
  }

  return {
    exclusionConstraints: constraints,
    exactSupplementLatex: [
      `\\text{Exclusions: } ${bases.map((node) => `${boxLatex(node)}\\ne0`).join(',\\;')}`,
    ],
  };
}

export function normalizeExactRationalNode(
  node: unknown,
  mode: RationalNormalizationMode,
): RationalNormalizationResult | null {
  const normalizedInput = normalizeAst(node);
  const variable = detectSingleVariable(normalizedInput);
  if (variable === null) {
    return null;
  }

  const terms = flattenAdd(normalizedInput).map((term) => parseRationalTerm(term, variable ?? undefined));
  if (terms.some((term) => term === null)) {
    return null;
  }

  const validTerms = terms as RationalTerm[];
  const denominatorLcm = validTerms.reduce((current, term) => lcm(current, term.scalar.denominator), 1);
  const lcdFactors = factorMapMaximum(validTerms);
  const rawNumerator = buildCombinedNumerator(validTerms, denominatorLcm, lcdFactors);
  const rawDenominator = buildCombinedDenominator(denominatorLcm, lcdFactors);

  let numeratorNode = mode === 'factor' ? factorNode(rawNumerator) : rawNumerator;
  let denominatorNode = rawDenominator
    ? mode === 'factor'
      ? factorNode(rawDenominator)
      : factorNode(rawDenominator)
    : undefined;

  if (mode === 'simplify') {
    const cancelled = cancelCommonFactors(rawNumerator, rawDenominator);
    numeratorNode = cancelled.numeratorNode;
    denominatorNode = cancelled.denominatorNode;
  }

  const normalizedNode = denominatorNode
    ? normalizeAst(['Divide', numeratorNode, denominatorNode])
    : normalizeAst(numeratorNode);
  const exclusionMetadata = buildExclusionMetadata(validTerms);
  const normalizedLatex = boxLatex(normalizedNode);

  return {
    changed: termKey(normalizedNode) !== termKey(normalizedInput),
    normalizedNode,
    normalizedLatex,
    numeratorNode,
    numeratorLatex: boxLatex(numeratorNode),
    denominatorNode,
    denominatorLatex: denominatorNode ? boxLatex(denominatorNode) : undefined,
    exclusionConstraints: exclusionMetadata.exclusionConstraints,
    exactSupplementLatex: exclusionMetadata.exactSupplementLatex,
    variable: variable ?? undefined,
  };
}

export function normalizeExactRationalLatex(
  latex: string,
  mode: RationalNormalizationMode,
) {
  try {
    const parsed = ce.parse(latex);
    return normalizeExactRationalNode(parsed.json, mode);
  } catch {
    return null;
  }
}
