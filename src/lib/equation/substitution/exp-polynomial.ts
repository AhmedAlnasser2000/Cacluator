import {
  matchScaledVariableArgument,
} from '../../trigonometry/normalize';
import {
  exponentialDomainError,
} from '../domain-guards';
import type {
  ExpCarrier,
  SubstitutionSolveResult,
} from './types';
import {
  EPSILON,
  boxLatex,
  extractTermCore,
  flattenAdd,
  formatBranchValue,
  isFiniteNumber,
  isNodeArray,
  normalizeAst,
  numericFromNode,
  sameNode,
  solveLinearOrQuadratic,
} from './shared';

function matchSupportedExponentialCarrier(node: unknown): ExpCarrier | null {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (sameNode(normalized[1], 'x')) {
      return { kind: 'exp', baseNode: 'ExponentialE', baseLatex: 'e' };
    }
    return null;
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const [, base, exponent] = normalized;
  if (!sameNode(exponent, 'x')) {
    return null;
  }

  if (base === 'ExponentialE') {
    return { kind: 'exp', baseNode: base, baseLatex: 'e' };
  }

  const numericBase = numericFromNode(base);
  if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
    return { kind: 'power', baseNode: base, baseLatex: boxLatex(base) };
  }

  return null;
}

function expTermDegree(symbolic: unknown, carrier: ExpCarrier): number | null {
  const normalized = normalizeAst(symbolic);

  if (carrier.kind === 'exp' && isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (sameNode(normalized[1], 'x')) {
      return 1;
    }

    const scaledExp = matchScaledVariableArgument(normalized[1]);
    if (scaledExp && Number.isInteger(scaledExp.coefficient) && scaledExp.coefficient > 0 && scaledExp.coefficient <= 2) {
      return scaledExp.coefficient;
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const [, base, exponent] = normalized;
    if (sameNode(base, carrier.baseNode)) {
      if (sameNode(exponent, 'x')) {
        return 1;
      }

      const scaled = matchScaledVariableArgument(exponent);
      if (scaled) {
        return scaled.coefficient <= 2 ? scaled.coefficient : null;
      }
    }

    if (sameNode(base, ['Power', carrier.baseNode, 'x']) && isFiniteNumber(exponent) && Number.isInteger(exponent) && exponent > 0 && exponent <= 2) {
      return exponent;
    }

    if (
      isNodeArray(base)
      && base[0] === 'Power'
      && base.length === 3
      && sameNode(base[1], carrier.baseNode)
      && sameNode(base[2], 'x')
      && isFiniteNumber(exponent)
      && Number.isInteger(exponent)
      && exponent > 0
      && exponent <= 2
    ) {
      return exponent;
    }
  }

  return null;
}

function parseExpPolynomialTerm(node: unknown, carrier: ExpCarrier | null) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier,
    };
  }

  if (!carrier) {
    const directCarrier = matchSupportedExponentialCarrier(core.symbolic);
    if (directCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 1 as const,
        carrier: directCarrier,
      };
    }

    const normalized = normalizeAst(core.symbolic);
    if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
      const scaled = matchScaledVariableArgument(normalized[1]);
      if (scaled && Number.isInteger(scaled.coefficient) && scaled.coefficient > 0 && scaled.coefficient <= 2) {
        return {
          coefficient: core.coefficient,
          degree: scaled.coefficient as 1 | 2,
          carrier: { kind: 'exp' as const, baseNode: 'ExponentialE', baseLatex: 'e' },
        };
      }
    }

    if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
      const [, base, exponent] = normalized;
      const scaled = matchScaledVariableArgument(exponent);
      if (scaled && Number.isInteger(scaled.coefficient) && scaled.coefficient > 0 && scaled.coefficient <= 2) {
        if (base === 'ExponentialE') {
          return {
            coefficient: core.coefficient,
            degree: scaled.coefficient as 1 | 2,
            carrier: { kind: 'exp' as const, baseNode: base, baseLatex: 'e' },
          };
        }

        const numericBase = numericFromNode(base);
        if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
          return {
            coefficient: core.coefficient,
            degree: scaled.coefficient as 1 | 2,
            carrier: { kind: 'power' as const, baseNode: base, baseLatex: boxLatex(base) },
          };
        }
      }
    }
  }

  if (carrier) {
    const degree = expTermDegree(core.symbolic, carrier);
    if (degree && degree <= 2) {
      return {
        coefficient: core.coefficient,
        degree: degree as 1 | 2,
        carrier,
      };
    }
  }

  return null;
}

function exponentBranchEquation(carrier: ExpCarrier, root: number) {
  const rootLatex = formatBranchValue(root);
  if (carrier.kind === 'exp') {
    return `e^x=${rootLatex}`;
  }

  return `${carrier.baseLatex}^x=${rootLatex}`;
}

function matchExponentialPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  let carrier: ExpCarrier | null = null;
  const coefficients = new Map<number, number>();

  for (const term of terms) {
    const parsed = parseExpPolynomialTerm(term, carrier);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0 && parsed.carrier) {
      carrier = parsed.carrier;
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);
  if (roots.length === 0) {
    return { kind: 'none' };
  }

  const uniqueRoots = roots
    .filter((root, index, list) => list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index);

  const equations = uniqueRoots
    .filter((root) => !exponentialDomainError(formatBranchValue(root)))
    .map((root) => exponentBranchEquation(carrier!, root));

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: 'No real solutions because exponential expressions are always positive.',
    };
  }

  const carrierLabel = carrier.kind === 'exp' ? 'e^x' : `${carrier.baseLatex}^x`;
  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;

  return {
    kind: 'branches',
    equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
    diagnostics: {
      family: 'exp-polynomial',
      carrierKind: carrier.kind,
      polynomialDegree: degree as 1 | 2,
      branchCount: equations.length,
      filteredBranchCount: Math.max(0, uniqueRoots.length - equations.length),
    },
  };
}

export { matchExponentialPolynomialSubstitution };
