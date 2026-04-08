import type { FactoringStrategy } from '../../types/calculator';
import { exactScalarToNumber, getExactPolynomialCoefficient, parseExactPolynomial } from '../polynomial-core';
import { factorBoundedPolynomialAst } from '../polynomial-factor-solve';
import {
  addTerms,
  buildTermNode,
  decomposeProduct,
  flattenAdd,
  isNodeArray,
  mergeFactor,
  type FactorMap,
} from './patterns';

function gcd(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }

  return left;
}

function factorEntriesFromKey(key: string, factors: FactorMap) {
  return factors.get(key);
}

function sortGroupedTerms(terms: unknown[]) {
  return [...terms].sort((left, right) => {
    const leftRank = typeof left === 'number' ? 0 : typeof left === 'string' ? 1 : 2;
    const rightRank = typeof right === 'number' ? 0 : typeof right === 'string' ? 1 : 2;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

function factorBySharedSymbolicGroup(ast: unknown) {
  const terms = flattenAdd(ast);
  if (terms.length < 3) {
    return undefined;
  }

  const decomposedTerms = terms.map(decomposeProduct);
  if (decomposedTerms.some((term) => term === null)) {
    return undefined;
  }

  const validTerms = decomposedTerms as { coefficient: number; factors: FactorMap }[];
  const candidates = new Map<
    string,
    { subset: number[]; exponent: number; node: unknown }
  >();

  for (let index = 0; index < validTerms.length; index += 1) {
    for (const [key, value] of validTerms[index].factors.entries()) {
      const current = candidates.get(key);
      if (!current) {
        candidates.set(key, { subset: [index], exponent: value.exponent, node: value.node });
        continue;
      }

      current.subset.push(index);
      current.exponent = Math.min(current.exponent, value.exponent);
    }
  }

  const best = [...candidates.values()]
    .filter((candidate) => candidate.subset.length >= 2 && candidate.subset.length < validTerms.length)
    .sort((left, right) => {
      if (right.subset.length !== left.subset.length) {
        return right.subset.length - left.subset.length;
      }

      if (right.exponent !== left.exponent) {
        return right.exponent - left.exponent;
      }

      return JSON.stringify(left.node).localeCompare(JSON.stringify(right.node));
    })[0];

  if (!best) {
    return undefined;
  }

  const groupedTerms = best.subset.map((index) => {
    const term = validTerms[index];
    const remainderFactors = new Map<string, { node: unknown; exponent: number }>();
    for (const [key, value] of term.factors.entries()) {
      const removedExponent = key === JSON.stringify(best.node) ? best.exponent : 0;
      const exponent = value.exponent - removedExponent;
      if (exponent > 0) {
        remainderFactors.set(key, {
          node: value.node,
          exponent,
        });
      }
    }

    return buildTermNode(term.coefficient, remainderFactors);
  });

  const groupedFactor = new Map<string, { node: unknown; exponent: number }>();
  mergeFactor(groupedFactor, best.node, best.exponent);
  const groupedNode = [
    'Multiply',
    buildTermNode(1, groupedFactor),
    addTerms(sortGroupedTerms(groupedTerms)),
  ];

  const remaining = terms.filter((_, index) => !best.subset.includes(index));
  return addTerms([groupedNode, ...remaining]);
}

function commonFactor(ast: unknown) {
  const terms = flattenAdd(ast);
  if (terms.length < 2) {
    return undefined;
  }

  const decomposedTerms = terms.map(decomposeProduct);
  if (decomposedTerms.some((term) => term === null)) {
    return undefined;
  }

  const validTerms = decomposedTerms as { coefficient: number; factors: FactorMap }[];
  let commonCoefficient = 0;
  const commonFactors = new Map<string, { node: unknown; exponent: number }>();

  validTerms.forEach((term, index) => {
    commonCoefficient = index === 0
      ? Math.abs(term.coefficient)
      : gcd(commonCoefficient, Math.abs(term.coefficient));

    if (index === 0) {
      for (const [key, value] of term.factors) {
        commonFactors.set(key, { ...value });
      }
      return;
    }

    for (const [key, current] of [...commonFactors.entries()]) {
      const candidate = factorEntriesFromKey(key, term.factors);
      if (!candidate) {
        commonFactors.delete(key);
        continue;
      }

      commonFactors.set(key, {
        node: current.node,
        exponent: Math.min(current.exponent, candidate.exponent),
      });
    }
  });

  if (commonCoefficient === 1 && commonFactors.size === 0) {
    return undefined;
  }

  const remainingTerms = validTerms.map((term) => {
    const remainderFactors = new Map<string, { node: unknown; exponent: number }>();
    for (const [key, value] of term.factors) {
      const common = commonFactors.get(key)?.exponent ?? 0;
      const exponent = value.exponent - common;
      if (exponent > 0) {
        remainderFactors.set(key, {
          node: value.node,
          exponent,
        });
      }
    }

    return buildTermNode(term.coefficient / (commonCoefficient || 1), remainderFactors);
  });

  const commonNode = buildTermNode(commonCoefficient || 1, commonFactors);
  const remainderNode = addTerms(remainingTerms);

  let strategy: FactoringStrategy = 'none';
  if (commonFactors.size > 0) {
    strategy = 'symbolic-common-factor';
  } else if (commonCoefficient > 1) {
    strategy = 'numeric-gcd';
  }

  return {
    node: ['Multiply', commonNode, remainderNode],
    strategy,
  };
}

function perfectSquareBase(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && node[2] === 2) {
    return node[1];
  }

  if (typeof node === 'number' && node >= 0) {
    const root = Math.sqrt(node);
    if (Number.isInteger(root)) {
      return root;
    }
  }

  return undefined;
}

function differenceOfSquares(ast: unknown) {
  const terms = flattenAdd(ast);
  if (terms.length !== 2) {
    return undefined;
  }

  for (const [left, right] of [
    [terms[0], terms[1]],
    [terms[1], terms[0]],
  ] as const) {
    if (!isNodeArray(right) || right[0] !== 'Negate' || right.length !== 2) {
      continue;
    }

    const leftBase = perfectSquareBase(left);
    const rightBase = perfectSquareBase(right[1]);
    if (leftBase === undefined || rightBase === undefined) {
      continue;
    }

    return [
      'Multiply',
      ['Add', leftBase, ['Negate', rightBase]],
      ['Add', leftBase, rightBase],
    ];
  }

  return undefined;
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

function variableQuadratic(ast: unknown) {
  const symbols = [...collectPolynomialSymbols(ast)];
  if (symbols.length !== 1) {
    return undefined;
  }

  const variable = symbols[0];
  const polynomial = parseExactPolynomial(ast, variable, 2);
  if (!polynomial) {
    return undefined;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  if (a.numerator === 0) {
    return undefined;
  }

  return {
    variable,
    a: exactScalarToNumber(a),
    b: exactScalarToNumber(getExactPolynomialCoefficient(polynomial, 1)),
    c: exactScalarToNumber(getExactPolynomialCoefficient(polynomial, 0)),
  };
}

function divisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const result = new Set<number>();
  for (let candidate = 1; candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      result.add(candidate);
      result.add(-candidate);
    }
  }

  return [...result];
}

function buildLinearFactor(coefficient: number, constant: number, variable: string) {
  const variableTerm =
    coefficient === 1
      ? variable
      : coefficient === -1
        ? ['Negate', variable]
        : ['Multiply', coefficient, variable];

  if (constant === 0) {
    return variableTerm;
  }

  return ['Add', variableTerm, constant];
}

function quadraticFactor(ast: unknown) {
  const quadratic = variableQuadratic(ast);
  if (!quadratic) {
    return undefined;
  }

  const { variable, a, b, c } = quadratic;
  if (![a, b, c].every(Number.isInteger)) {
    return undefined;
  }

  for (const left of divisors(a)) {
    if (left === 0) {
      continue;
    }

    const right = a / left;
    for (const constantLeft of divisors(c)) {
      const constantRight = c === 0 ? 0 : c / constantLeft;
      if (left * constantRight + right * constantLeft === b) {
        return [
          'Multiply',
          buildLinearFactor(left, constantLeft, variable),
          buildLinearFactor(right, constantRight, variable),
        ];
      }
    }
  }

  return undefined;
}

export function factorAst(ast: unknown) {
  const diffSquares = differenceOfSquares(ast);
  if (diffSquares) {
    return {
      node: diffSquares,
      strategy: 'algebraic-identity' as const,
    };
  }

  const quadratic = quadraticFactor(ast);
  if (quadratic) {
    return {
      node: quadratic,
      strategy: 'algebraic-identity' as const,
    };
  }

  const boundedPolynomial = factorBoundedPolynomialAst(ast);
  if (boundedPolynomial) {
    return {
      node: boundedPolynomial.factorizedNode,
      strategy: 'polynomial-factorization' as const,
    };
  }

  const grouped = factorBySharedSymbolicGroup(ast);
  if (grouped) {
    return {
      node: grouped,
      strategy: 'symbolic-like-terms' as const,
    };
  }

  const common = commonFactor(ast);
  if (common) {
    return common;
  }

  return {
    node: ast,
    strategy: 'none' as const,
  };
}
