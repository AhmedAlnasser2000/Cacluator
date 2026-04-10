import {
  matchAffineVariableArgument,
  matchTrigCall,
} from '../../trigonometry/normalize';
import {
  trigCarrierDomainError,
} from '../domain-guards';
import { createBranchSet } from '../../algebra/branch-core';
import type {
  SubstitutionSolveResult,
  TrigCarrier,
} from './types';
import {
  EPSILON,
  extractTermCore,
  flattenAdd,
  formatBranchValue,
  isFiniteNumber,
  isNodeArray,
  normalizeAst,
  sameNode,
  solveLinearOrQuadratic,
} from './shared';

function matchSupportedTrigCarrier(node: unknown): TrigCarrier | null {
  const trig = matchTrigCall(normalizeAst(node));
  const affine = trig ? matchAffineVariableArgument(trig.argument, { maxCoefficient: 6 }) : null;
  if (!trig || !affine) {
    return null;
  }

  return {
    kind: trig.kind,
    argument: trig.argument,
    argumentLatex: affine.argumentLatex,
  };
}

function trigCarrierEquation(kind: 'sin' | 'cos' | 'tan', argumentLatex: string, value: number) {
  const fn = kind === 'sin' ? '\\sin' : kind === 'cos' ? '\\cos' : '\\tan';
  return `${fn}\\left(${argumentLatex}\\right)=${formatBranchValue(value)}`;
}

function parseTrigPolynomialTerm(node: unknown) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier: null as TrigCarrier | null,
    };
  }

  const directCarrier = matchSupportedTrigCarrier(core.symbolic);
  if (directCarrier) {
    return {
      coefficient: core.coefficient,
      degree: 1 as const,
      carrier: directCarrier,
    };
  }

  const normalized = normalizeAst(core.symbolic);
  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isFiniteNumber(normalized[2])
    && normalized[2] === 2
  ) {
    const squaredCarrier = matchSupportedTrigCarrier(normalized[1]);
    if (squaredCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 2 as const,
        carrier: squaredCarrier,
      };
    }
  }

  return null;
}

function matchTrigPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  const coefficients = new Map<number, number>();
  let carrier: TrigCarrier | null = null;

  for (const term of terms) {
    const parsed = parseTrigPolynomialTerm(term);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0) {
      if (!carrier) {
        carrier = parsed.carrier;
      } else if (!parsed.carrier || carrier.kind !== parsed.carrier.kind || !sameNode(carrier.argument, parsed.carrier.argument)) {
        return { kind: 'none' };
      }
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);

  if (roots.length === 0) {
    if ((carrier.kind === 'sin' || carrier.kind === 'cos') && degree === 2) {
      return {
        kind: 'blocked',
        error: 'No real solutions were found for the substituted trig carrier.',
      };
    }

    return { kind: 'none' };
  }

  const validRoots = roots.filter((root, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index);

  const equations: string[] = [];
  for (const root of validRoots) {
    if (carrier.kind === 'sin' || carrier.kind === 'cos') {
      const error = trigCarrierDomainError(carrier.kind, formatBranchValue(root));
      if (error) {
        continue;
      }
    }
    equations.push(trigCarrierEquation(carrier.kind, carrier.argumentLatex, root));
  }

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: carrier.kind === 'sin' || carrier.kind === 'cos'
        ? 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.'
        : 'No real solutions were found for the substituted trig carrier.',
    };
  }

  const carrierLabel = carrier.kind === 'sin'
    ? `\\sin\\left(${carrier.argumentLatex}\\right)`
    : carrier.kind === 'cos'
      ? `\\cos\\left(${carrier.argumentLatex}\\right)`
      : `\\tan\\left(${carrier.argumentLatex}\\right)`;

  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;
  const branchSet = createBranchSet({
    equations,
    provenance: 'substitution-trig-polynomial',
  });

  return {
    kind: 'branches',
    equations: branchSet.equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
    diagnostics: {
      family: 'trig-polynomial',
      carrierKind: carrier.kind,
      polynomialDegree: degree as 1 | 2,
      branchCount: branchSet.equations.length,
      filteredBranchCount: Math.max(0, validRoots.length - branchSet.equations.length),
    },
  };
}

export { matchTrigPolynomialSubstitution };
