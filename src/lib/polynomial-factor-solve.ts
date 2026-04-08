import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber, solutionsToLatex } from './format';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
  type ExactScalar,
} from './polynomial-core';
import { normalizeAst } from './symbolic-engine/normalize';

const ce = new ComputeEngine();
const ROOT_TOLERANCE = 1e-8;

type PolynomialFactorizationStrategy = 'rational-root' | 'biquadratic' | 'quadratic-pair';

export type BoundedPolynomialFactor = {
  node: unknown;
  latex: string;
  multiplicity: number;
  degree: number;
};

export type BoundedPolynomialFactorization = {
  variable: string;
  scalar: ExactScalar;
  factorizedNode: unknown;
  factorizedLatex: string;
  factors: BoundedPolynomialFactor[];
  strategy: PolynomialFactorizationStrategy;
};

export type BoundedPolynomialSolveResult = {
  variable: string;
  exactLatex: string;
  approxText: string;
  exactSolutions: string[];
  approxSolutions: number[];
  factorization: BoundedPolynomialFactorization;
};

type RecognizedPolynomialEquation = {
  variable: string;
  polynomial: ExactPolynomial;
};

type PrimitiveIntegerPolynomial = {
  polynomial: ExactPolynomial;
  scalar: ExactScalar;
};

type QuadraticExactRoots =
  | { kind: 'real'; roots: Array<{ node: unknown; latex: string; numeric: number }> }
  | { kind: 'complex' };

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isExactInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

function gcd(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function lcm(left: number, right: number) {
  return Math.abs(left * right) / gcd(left, right);
}

function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator;
}

function exactScalarIsInteger(value: ExactScalar) {
  return normalizeExactScalar(value).denominator === 1;
}

function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function exactScalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return 0;
  }
  return normalized.numerator > 0 ? 1 : -1;
}

function normalizePolynomial(polynomial: ExactPolynomial) {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const normalized = normalizeExactScalar(coefficient);
    if (normalized.numerator !== 0) {
      terms.set(degree, normalized);
    }
  }

  return {
    variable: polynomial.variable,
    terms,
  } satisfies ExactPolynomial;
}

function buildPolynomialFromCoefficients(variable: string, coefficients: ExactScalar[]) {
  const degree = coefficients.length - 1;
  const terms = new Map<number, ExactScalar>();
  coefficients.forEach((coefficient, index) => {
    const normalized = normalizeExactScalar(coefficient);
    if (normalized.numerator !== 0) {
      terms.set(degree - index, normalized);
    }
  });
  return normalizePolynomial({
    variable,
    terms,
  });
}

function coefficientArray(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    getExactPolynomialCoefficient(polynomial, degree - index));
}

function simplifyNode(node: unknown) {
  try {
    return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
  } catch {
    return normalizeAst(node);
  }
}

function nodeLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function numericValueForNode(node: unknown): number | null {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function sortAndDedupeApprox(values: number[]) {
  return values
    .slice()
    .sort((left, right) => left - right)
    .filter((value, index, list) =>
      index === 0 || Math.abs(value - list[index - 1]) > ROOT_TOLERANCE);
}

function positiveDivisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const divisors = new Set<number>();
  for (let candidate = 1; candidate * candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
      divisors.add(absolute / candidate);
    }
  }
  return [...divisors].sort((left, right) => left - right);
}

function allDivisors(value: number) {
  if (value === 0) {
    return [0];
  }
  const positives = positiveDivisors(value);
  const negatives = positives.map((candidate) => -candidate);
  return [...negatives, ...positives].sort((left, right) => left - right);
}

function clearPolynomialDenominators(polynomial: ExactPolynomial): PrimitiveIntegerPolynomial | null {
  const coefficients = coefficientArray(polynomial);
  const denominatorLcm = coefficients.reduce((current, coefficient) =>
    lcm(current, normalizeExactScalar(coefficient).denominator), 1);
  const integerCoefficients = coefficients.map((coefficient) => {
    const normalized = normalizeExactScalar(coefficient);
    return normalized.numerator * (denominatorLcm / normalized.denominator);
  });

  if (!integerCoefficients.every(isExactInteger)) {
    return null;
  }

  const nonZero = integerCoefficients.filter((value) => value !== 0);
  if (nonZero.length === 0) {
    return null;
  }

  const content = nonZero.reduce((current, value) => gcd(current, value), Math.abs(nonZero[0]));
  const leading = integerCoefficients[0];
  const sign = leading < 0 ? -1 : 1;
  const divisor = content * sign;
  const primitive = integerCoefficients.map((value) => value / divisor);

  return {
    scalar: normalizeExactScalar({ numerator: divisor, denominator: denominatorLcm }),
    polynomial: buildPolynomialFromCoefficients(
      polynomial.variable,
      primitive.map((value) => ({ numerator: value, denominator: 1 })),
    ),
  };
}

function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = coefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, value), coefficients[index]);
  }
  return normalizeExactScalar(current);
}

function exactScalarKey(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return `${normalized.numerator}/${normalized.denominator}`;
}

function rationalRootCandidates(polynomial: ExactPolynomial) {
  const leading = getExactPolynomialCoefficient(polynomial, exactPolynomialDegree(polynomial));
  const constant = getExactPolynomialCoefficient(polynomial, 0);
  if (!exactScalarIsInteger(leading) || !exactScalarIsInteger(constant)) {
    return [] as ExactScalar[];
  }

  const leadingValue = Math.abs(normalizeExactScalar(leading).numerator);
  const constantValue = Math.abs(normalizeExactScalar(constant).numerator);
  const candidates = new Map<string, ExactScalar>();

  if (constantValue === 0) {
    candidates.set('0/1', { numerator: 0, denominator: 1 });
  }

  for (const numerator of positiveDivisors(constantValue)) {
    for (const denominator of positiveDivisors(leadingValue)) {
      const positive = normalizeExactScalar({ numerator, denominator });
      const negative = normalizeExactScalar({ numerator: -numerator, denominator });
      candidates.set(exactScalarKey(positive), positive);
      candidates.set(exactScalarKey(negative), negative);
    }
  }

  return [...candidates.values()];
}

function dividePolynomialByLinearRoot(polynomial: ExactPolynomial, root: ExactScalar): ExactPolynomial | null {
  const coefficients = coefficientArray(polynomial);
  if (coefficients.length < 2) {
    return null;
  }

  const quotient: ExactScalar[] = [coefficients[0]];
  for (let index = 1; index < coefficients.length - 1; index += 1) {
    quotient.push(addExactScalars(coefficients[index], multiplyExactScalars(root, quotient[index - 1])));
  }
  const remainder = addExactScalars(
    coefficients[coefficients.length - 1],
    multiplyExactScalars(root, quotient[quotient.length - 1]),
  );
  if (!exactScalarIsZero(remainder)) {
    return null;
  }

  return buildPolynomialFromCoefficients(polynomial.variable, quotient);
}

function buildLinearFactorNode(variable: string, root: ExactScalar) {
  const rootNode = buildExactScalarNode(root);
  if (exactScalarIsZero(root)) {
    return variable;
  }
  if (exactScalarSign(root) > 0) {
    return ['Add', variable, ['Negate', rootNode]];
  }
  return ['Add', variable, buildExactScalarNode(negateExactScalar(root))];
}

function buildQuadraticFactorNode(variable: string, rootNode: unknown) {
  if (rootNode === 0) {
    return ['Power', variable, 2];
  }
  return ['Add', ['Power', variable, 2], ['Negate', rootNode]];
}

function quadraticRootNodes(polynomial: ExactPolynomial): QuadraticExactRoots {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return { kind: 'complex' };
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return { kind: 'complex' };
  }

  const discriminantNode = buildExactScalarNode(discriminant);
  const discriminantValue = numericValueForNode(discriminantNode);
  if (discriminantValue === null || discriminantValue < -ROOT_TOLERANCE) {
    return { kind: 'complex' };
  }

  const minusBNode = buildExactScalarNode(negateExactScalar(b));
  const twoANode = buildExactScalarNode(multiplyExactScalars(a, { numerator: 2, denominator: 1 }));
  const sqrtNode = simplifyNode(['Sqrt', discriminantNode]);

  if (Math.abs(discriminantValue) <= ROOT_TOLERANCE) {
    const node = simplifyNode(['Divide', minusBNode, twoANode]);
    const numeric = numericValueForNode(node);
    if (numeric === null) {
      return { kind: 'complex' };
    }
    return {
      kind: 'real',
      roots: [{ node, latex: nodeLatex(node), numeric }],
    };
  }

  const positive = simplifyNode(['Divide', ['Add', minusBNode, sqrtNode], twoANode]);
  const negative = simplifyNode(['Divide', ['Add', minusBNode, ['Negate', sqrtNode]], twoANode]);
  const positiveNumeric = numericValueForNode(positive);
  const negativeNumeric = numericValueForNode(negative);
  if (positiveNumeric === null || negativeNumeric === null) {
    return { kind: 'complex' };
  }

  return {
    kind: 'real',
    roots: [
      { node: positive, latex: nodeLatex(positive), numeric: positiveNumeric },
      { node: negative, latex: nodeLatex(negative), numeric: negativeNumeric },
    ],
  };
}

function extractRationalRootFactorization(
  polynomial: ExactPolynomial,
) {
  const factors: BoundedPolynomialFactor[] = [];
  let current = polynomial;

  while (exactPolynomialDegree(current) >= 3) {
    const root = rationalRootCandidates(current)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current, candidate)));
    if (!root) {
      break;
    }

    let multiplicity = 0;
    while (true) {
      const divided = dividePolynomialByLinearRoot(current, root);
      if (!divided) {
        break;
      }
      current = divided;
      multiplicity += 1;
    }

    const factorNode = simplifyNode(buildLinearFactorNode(current.variable, root));
    factors.push({
      node: factorNode,
      latex: nodeLatex(factorNode),
      multiplicity,
      degree: 1,
    });
  }

  return {
    factors,
    remainder: current,
  };
}

function biquadraticFactorization(
  polynomial: ExactPolynomial,
) {
  if (exactPolynomialDegree(polynomial) !== 4) {
    return null;
  }

  const x3 = getExactPolynomialCoefficient(polynomial, 3);
  const x1 = getExactPolynomialCoefficient(polynomial, 1);
  if (!exactScalarIsZero(x3) || !exactScalarIsZero(x1)) {
    return null;
  }

  const yPolynomial = buildPolynomialFromCoefficients(polynomial.variable, [
    getExactPolynomialCoefficient(polynomial, 4),
    getExactPolynomialCoefficient(polynomial, 2),
    getExactPolynomialCoefficient(polynomial, 0),
  ]);
  const roots = quadraticRootNodes(yPolynomial);
  if (roots.kind !== 'real') {
    return null;
  }

  const leading = getExactPolynomialCoefficient(polynomial, 4);
  const factors = roots.roots.map((root) => {
    const factorNode = simplifyNode(buildQuadraticFactorNode(polynomial.variable, root.node));
    return {
      node: factorNode,
      latex: nodeLatex(factorNode),
      multiplicity: 1,
      degree: 2,
    } satisfies BoundedPolynomialFactor;
  });

  return {
    scalar: leading,
    factors,
    strategy: 'biquadratic' as const,
  };
}

function integerQuadraticRoots(a: number, b: number, c: number) {
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return [] as number[];
  }
  const root = Math.sqrt(discriminant);
  if (!Number.isInteger(root)) {
    return [] as number[];
  }

  const denominator = 2 * a;
  const first = (-b + root) / denominator;
  const second = (-b - root) / denominator;
  const result: number[] = [];
  if (Number.isInteger(first)) {
    result.push(first);
  }
  if (Number.isInteger(second) && second !== first) {
    result.push(second);
  }
  return result;
}

function quarticFactorIntoQuadratics(
  polynomial: ExactPolynomial,
) {
  if (exactPolynomialDegree(polynomial) !== 4) {
    return null;
  }

  const primitive = clearPolynomialDenominators(polynomial);
  if (!primitive) {
    return null;
  }

  const a = getExactPolynomialCoefficient(primitive.polynomial, 4).numerator;
  const b = getExactPolynomialCoefficient(primitive.polynomial, 3).numerator;
  const c = getExactPolynomialCoefficient(primitive.polynomial, 2).numerator;
  const d = getExactPolynomialCoefficient(primitive.polynomial, 1).numerator;
  const e = getExactPolynomialCoefficient(primitive.polynomial, 0).numerator;

  if (![a, b, c, d, e].every(isExactInteger)) {
    return null;
  }

  const positiveLeadingDivisors = positiveDivisors(a);
  const constantDivisors = allDivisors(e);

  for (const p of positiveLeadingDivisors) {
    if (p === 0 || a % p !== 0) {
      continue;
    }
    const q = a / p;

    for (const m of constantDivisors) {
      if (m === 0 || e % m !== 0) {
        continue;
      }
      const n = e / m;
      const determinant = q * m - p * n;

      const candidatePairs: Array<{ u: number; v: number }> = [];

      if (determinant !== 0) {
        const uNumerator = b * m - p * d;
        const vNumerator = q * d - b * n;
        if (uNumerator % determinant !== 0 || vNumerator % determinant !== 0) {
          continue;
        }
        candidatePairs.push({
          u: uNumerator / determinant,
          v: vNumerator / determinant,
        });
      } else {
        const uRoots = integerQuadraticRoots(
          q,
          -b,
          p * (c - p * n - q * m),
        );
        for (const u of uRoots) {
          const vNumerator = b - q * u;
          if (vNumerator % p !== 0) {
            continue;
          }
          candidatePairs.push({
            u,
            v: vNumerator / p,
          });
        }
      }

      for (const { u, v } of candidatePairs) {
        if (p * n + u * v + q * m !== c) {
          continue;
        }
        if (u * n + v * m !== d) {
          continue;
        }

        const first = simplifyNode(exactPolynomialToNode(buildPolynomialFromCoefficients(polynomial.variable, [
          { numerator: p, denominator: 1 },
          { numerator: u, denominator: 1 },
          { numerator: m, denominator: 1 },
        ])));
        const second = simplifyNode(exactPolynomialToNode(buildPolynomialFromCoefficients(polynomial.variable, [
          { numerator: q, denominator: 1 },
          { numerator: v, denominator: 1 },
          { numerator: n, denominator: 1 },
        ])));

        return {
          scalar: primitive.scalar,
          factors: [
            {
              node: first,
              latex: nodeLatex(first),
              multiplicity: 1,
              degree: 2,
            },
            {
              node: second,
              latex: nodeLatex(second),
              multiplicity: 1,
              degree: 2,
            },
          ] satisfies BoundedPolynomialFactor[],
          strategy: 'quadratic-pair' as const,
        };
      }
    }
  }

  return null;
}

function buildFactorizedNode(scalar: ExactScalar, factors: BoundedPolynomialFactor[]) {
  const repeatedFactors = factors.flatMap((factor) =>
    Array.from({ length: factor.multiplicity }, () => factor.node));

  const normalizedScalar = normalizeExactScalar(scalar);
  const isUnitScalar = exactScalarEquals(normalizedScalar, { numerator: 1, denominator: 1 });
  if (repeatedFactors.length === 0) {
    return buildExactScalarNode(normalizedScalar);
  }
  if (isUnitScalar) {
    return repeatedFactors.length === 1 ? repeatedFactors[0] : ['Multiply', ...repeatedFactors];
  }
  return ['Multiply', buildExactScalarNode(normalizedScalar), ...repeatedFactors];
}

function factorBoundedPolynomial(
  polynomial: ExactPolynomial,
): BoundedPolynomialFactorization | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > 4) {
    return null;
  }

  const primitive = clearPolynomialDenominators(polynomial);
  if (!primitive) {
    return null;
  }

  if (degree === 4) {
    const biquadratic = biquadraticFactorization(polynomial);
    if (biquadratic) {
      const factorizedNode = buildFactorizedNode(biquadratic.scalar, biquadratic.factors);
      return {
        variable: polynomial.variable,
        scalar: biquadratic.scalar,
        factorizedNode,
        factorizedLatex: nodeLatex(factorizedNode),
        factors: biquadratic.factors,
        strategy: biquadratic.strategy,
      };
    }
  }

  const extracted = extractRationalRootFactorization(primitive.polynomial);
  if (extracted.factors.length > 0) {
    const remainderDegree = exactPolynomialDegree(extracted.remainder);
    const factors = [...extracted.factors];
    if (remainderDegree === 2) {
      const remainderNode = simplifyNode(exactPolynomialToNode(extracted.remainder));
      factors.push({
        node: remainderNode,
        latex: nodeLatex(remainderNode),
        multiplicity: 1,
        degree: 2,
      });
    } else if (remainderDegree === 1) {
      const remainderRoot = divideExactScalars(
        negateExactScalar(getExactPolynomialCoefficient(extracted.remainder, 0)),
        getExactPolynomialCoefficient(extracted.remainder, 1),
      );
      if (!remainderRoot) {
        return null;
      }
      const factorNode = simplifyNode(buildLinearFactorNode(polynomial.variable, remainderRoot));
      factors.push({
        node: factorNode,
        latex: nodeLatex(factorNode),
        multiplicity: 1,
        degree: 1,
      });
    } else if (remainderDegree !== 0) {
      return null;
    }

    const factorizedNode = buildFactorizedNode(primitive.scalar, factors);
    return {
      variable: polynomial.variable,
      scalar: primitive.scalar,
      factorizedNode,
      factorizedLatex: nodeLatex(factorizedNode),
      factors,
      strategy: 'rational-root',
    };
  }

  if (degree === 4) {
    const quadraticPair = quarticFactorIntoQuadratics(polynomial);
    if (quadraticPair) {
      const factorizedNode = buildFactorizedNode(quadraticPair.scalar, quadraticPair.factors);
      return {
        variable: polynomial.variable,
        scalar: quadraticPair.scalar,
        factorizedNode,
        factorizedLatex: nodeLatex(factorizedNode),
        factors: quadraticPair.factors,
        strategy: quadraticPair.strategy,
      };
    }
  }

  return null;
}

function collectPolynomialSymbols(node: unknown, result = new Set<string>()) {
  if (typeof node === 'string') {
    result.add(node);
    return result;
  }

  if (!isNodeArray(node)) {
    return result;
  }

  node.forEach((child, index) => {
    if (index > 0) {
      collectPolynomialSymbols(child, result);
    }
  });

  return result;
}

export function recognizeBoundedPolynomialEquationAst(
  node: unknown,
  variable = 'x',
): RecognizedPolynomialEquation | null {
  const normalized = normalizeAst(node);
  const zeroForm = isNodeArray(normalized) && normalized[0] === 'Equal' && normalized.length === 3
    ? normalizeAst(['Subtract', normalized[1], normalized[2]])
    : normalized;
  const polynomial = parseExactPolynomial(zeroForm, variable, 4);
  if (!polynomial) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > 4) {
    return null;
  }

  return {
    variable,
    polynomial,
  };
}

function quadraticRootsFromFactor(
  factor: BoundedPolynomialFactor,
  variable: string,
): QuadraticExactRoots {
  const polynomial = parseExactPolynomial(normalizeAst(factor.node), variable, 2);
  if (polynomial && exactPolynomialDegree(polynomial) === 2) {
    return quadraticRootNodes(polynomial);
  }

  const normalized = normalizeAst(factor.node);
  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && normalized[1] === variable
    && normalized[2] === 2
  ) {
    return {
      kind: 'real',
      roots: [{ node: 0, latex: '0', numeric: 0 }],
    };
  }

  const terms = isNodeArray(normalized) && normalized[0] === 'Add' ? normalized.slice(1) : [normalized];
  const squareTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === variable
    && term[2] === 2);
  const otherTerms = squareTerm ? terms.filter((term) => term !== squareTerm) : [];
  if (!squareTerm || otherTerms.length === 0) {
    return { kind: 'complex' };
  }

  let targetNode: unknown | null = null;
  if (otherTerms.every((term) => isNodeArray(term) && term[0] === 'Negate' && term.length === 2)) {
    targetNode = otherTerms.length === 1
      ? (otherTerms[0] as unknown[])[1]
      : simplifyNode(['Add', ...otherTerms.map((term) => (term as unknown[])[1])]);
  } else if (otherTerms.every((term) => term === 0)) {
    targetNode = 0;
  }
  if (targetNode === null) {
    return { kind: 'complex' };
  }

  const targetValue = numericValueForNode(targetNode);
  if (targetValue === null || targetValue < -ROOT_TOLERANCE) {
    return { kind: 'complex' };
  }

  if (Math.abs(targetValue) <= ROOT_TOLERANCE) {
    return {
      kind: 'real',
      roots: [{ node: 0, latex: '0', numeric: 0 }],
    };
  }

  const positive = simplifyNode(['Sqrt', targetNode]);
  const negative = simplifyNode(['Negate', positive]);
  const positiveNumeric = numericValueForNode(positive);
  const negativeNumeric = numericValueForNode(negative);
  if (positiveNumeric === null || negativeNumeric === null) {
    return { kind: 'complex' };
  }

  return {
    kind: 'real',
    roots: [
      { node: positive, latex: nodeLatex(positive), numeric: positiveNumeric },
      { node: negative, latex: nodeLatex(negative), numeric: negativeNumeric },
    ],
  };
}

export function solveBoundedPolynomialEquationAst(
  node: unknown,
  variable = 'x',
): BoundedPolynomialSolveResult | null {
  const recognized = recognizeBoundedPolynomialEquationAst(node, variable);
  if (!recognized) {
    return null;
  }

  const factorization = factorBoundedPolynomial(recognized.polynomial);
  if (!factorization) {
    return null;
  }

  const roots: Array<{ latex: string; numeric: number }> = [];

  for (const factor of factorization.factors) {
    if (factor.degree === 1) {
      const normalized = normalizeAst(factor.node);
      const polynomial = parseExactPolynomial(normalized, variable, 1);
      if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
        return null;
      }
      const root = divideExactScalars(
        negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
        getExactPolynomialCoefficient(polynomial, 1),
      );
      if (!root) {
        return null;
      }
      const rootNode = simplifyNode(buildExactScalarNode(root));
      const numeric = numericValueForNode(rootNode);
      if (numeric === null) {
        return null;
      }
      roots.push({ latex: nodeLatex(rootNode), numeric });
      continue;
    }

    if (factor.degree === 2) {
      const quadraticRoots = quadraticRootsFromFactor(factor, variable);
      if (quadraticRoots.kind !== 'real') {
        return null;
      }
      roots.push(...quadraticRoots.roots.map((root) => ({ latex: root.latex, numeric: root.numeric })));
      continue;
    }

    return null;
  }

  const uniqueApproximations = sortAndDedupeApprox(roots.map((root) => root.numeric));
  const uniqueRoots = roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_TOLERANCE)
    .map((root) => root.latex);

  return {
    variable,
    exactLatex: solutionsToLatex(variable, uniqueRoots),
    approxText: uniqueApproximations.length === 1
      ? `${variable} ~= ${formatApproxNumber(uniqueApproximations[0])}`
      : `${variable} ~= ${uniqueApproximations.map((value) => formatApproxNumber(value)).join(', ')}`,
    exactSolutions: uniqueRoots,
    approxSolutions: uniqueApproximations,
    factorization,
  };
}

export function factorBoundedPolynomialAst(ast: unknown, variable?: string) {
  const normalized = normalizeAst(ast);
  const resolvedVariable = variable
    ?? (() => {
      const symbols = [...collectPolynomialSymbols(normalized)].filter((symbol) => symbol !== 'Pi' && symbol !== 'ExponentialE');
      return symbols.length === 1 ? symbols[0] : null;
    })();
  if (!resolvedVariable) {
    return null;
  }

  const polynomial = parseExactPolynomial(normalized, resolvedVariable, 4);
  if (!polynomial) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > 4) {
    return null;
  }

  return factorBoundedPolynomial(polynomial);
}
