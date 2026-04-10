import type {
  InverseCarrier,
  SubstitutionSolveResult,
} from './types';
import { createBranchSet } from '../../algebra/branch-core';
import {
  EPSILON,
  boxLatex,
  isNodeArray,
  normalizeAst,
  numericFromNode,
  toInlineSummaryMath,
} from './shared';

function isValidLogBase(base: number) {
  return base > 0 && Math.abs(base - 1) > EPSILON;
}

type EqualityCarrier =
  | {
      family: 'log';
      kind: InverseCarrier['kind'];
      inner: unknown;
      innerLatex: string;
      carrierLatex: string;
      baseNumeric: number;
      baseLatex: string;
    }
  | {
      family: 'power';
      kind: 'exp' | 'power';
      inner: unknown;
      innerLatex: string;
      carrierLatex: string;
      baseNumeric: number;
      baseLatex: string;
    };

function matchEqualityCarrier(node: unknown): EqualityCarrier | null {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Ln') {
    return {
      family: 'log',
      kind: 'ln',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
      baseNumeric: Math.E,
      baseLatex: 'e',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3)) {
    const inner = normalized[1];
    if (normalized.length === 2) {
      return {
        family: 'log',
        kind: 'log',
        inner,
        innerLatex: boxLatex(inner),
        carrierLatex: boxLatex(normalized),
        baseNumeric: 10,
        baseLatex: '10',
      };
    }

    const baseNumeric = numericFromNode(normalized[2]);
    if (baseNumeric === undefined || !Number.isFinite(baseNumeric) || !isValidLogBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'log',
      kind: 'log',
      inner,
      innerLatex: boxLatex(inner),
      carrierLatex: boxLatex(normalized),
      baseNumeric,
      baseLatex: boxLatex(normalized[2]),
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Exp') {
    return {
      family: 'power',
      kind: 'exp',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
      baseNumeric: Math.E,
      baseLatex: 'e',
    };
  }

  if (isNodeArray(normalized) && normalized.length === 3 && normalized[0] === 'Power') {
    const base = normalized[1];
    const exponent = normalized[2];

    if (base === 'ExponentialE') {
      return {
        family: 'power',
        kind: 'exp',
        inner: exponent,
        innerLatex: boxLatex(exponent),
        carrierLatex: boxLatex(normalized),
        baseNumeric: Math.E,
        baseLatex: 'e',
      };
    }

    const baseNumeric = numericFromNode(base);
    if (baseNumeric === undefined || !Number.isFinite(baseNumeric) || !isValidLogBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'power',
      kind: 'power',
      inner: exponent,
      innerLatex: boxLatex(exponent),
      carrierLatex: boxLatex(normalized),
      baseNumeric,
      baseLatex: boxLatex(base),
    };
  }

  return null;
}

function sameBase(left: EqualityCarrier, right: EqualityCarrier) {
  return (
    left.family === right.family
    && Math.abs(left.baseNumeric - right.baseNumeric) < EPSILON
  );
}

function matchSameBaseEquality(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const left = matchEqualityCarrier(equationAst[1]);
  const right = matchEqualityCarrier(equationAst[2]);
  if (!left || !right || !sameBase(left, right)) {
    return { kind: 'none' };
  }

  const nextEquationLatex = `${left.innerLatex}=${right.innerLatex}`;
  const usesExplicitLogBase = left.family === 'log'
    && Math.abs(left.baseNumeric - Math.E) >= EPSILON
    && Math.abs(left.baseNumeric - 10) >= EPSILON;
  const branchSet = createBranchSet({
    equations: [nextEquationLatex],
    constraints: left.family === 'log'
      ? [
          { kind: 'positive', expressionLatex: left.innerLatex },
          { kind: 'positive', expressionLatex: right.innerLatex },
        ]
      : undefined,
    provenance: 'substitution-same-base-equality',
  });

  return {
    kind: 'branches',
    equations: branchSet.equations,
    solveBadges: usesExplicitLogBase
      ? ['Symbolic Substitution', 'Same-Base Equality', 'Log Base Normalize', 'Candidate Checked']
      : ['Symbolic Substitution', 'Same-Base Equality', 'Candidate Checked'],
    solveSummaryText: `Reduced same-base equality ${toInlineSummaryMath(left.carrierLatex)}=${toInlineSummaryMath(right.carrierLatex)} into ${toInlineSummaryMath(nextEquationLatex)}`,
    domainConstraints: branchSet.constraints,
    diagnostics: {
      family: 'same-base-equality',
      carrierKind: left.kind,
      branchCount: branchSet.equations.length,
      filteredBranchCount: 0,
    },
  };
}

export { matchSameBaseEquality };
