import type {
  LogCall,
  LogCallMatch,
  SubstitutionSolveResult,
} from './types';
import { createBranchSet } from '../../algebra/branch-core';
import {
  EPSILON,
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  normalizeAst,
  numericFromNode,
  toInlineSummaryMath,
  formatBranchValue,
} from './shared';
import { termKey } from '../../symbolic-engine/patterns';

type SignedLogTerm = {
  coefficient: number;
  call: LogCall;
};

type ParsedLogSide =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'linear'; terms: SignedLogTerm[]; constant: number };

type BinaryLogAggregate =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | {
      kind: 'aggregate';
      relation: 'product' | 'quotient';
      left: LogCall;
      right: LogCall;
      argumentLatex: string;
      family: 'same-base' | 'mixed-base';
      carrierLatex: string;
    };

type RationalValue = {
  numerator: number;
  denominator: number;
};

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function normalizeRational(numerator: number, denominator: number): RationalValue {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

function addRational(left: RationalValue, right: RationalValue) {
  return normalizeRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function rationalToNumber(value: RationalValue) {
  return value.numerator / value.denominator;
}

function approximateRational(value: number, maxDenominator = 16) {
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) <= EPSILON) {
      return normalizeRational(numerator, denominator);
    }
  }
  return null;
}

function isValidLogBase(base: number) {
  return base > 0 && Math.abs(base - 1) > EPSILON;
}

function canonicalBaseLatex(base: number, fallbackLatex: string) {
  const rounded = Math.round(base);
  if (Math.abs(base - rounded) < EPSILON) {
    return `${rounded}`;
  }

  return fallbackLatex;
}

function logCallToNaturalTermLatex(call: LogCall) {
  const inner = `\\ln\\left(${call.innerLatex}\\right)`;
  if (Math.abs(call.baseNumeric - Math.E) < EPSILON) {
    return inner;
  }

  return `\\frac{${inner}}{\\ln\\left(${canonicalBaseLatex(call.baseNumeric, call.baseLatex)}\\right)}`;
}

function sameLogBase(left: LogCall, right: LogCall) {
  if (Math.abs(left.baseNumeric - right.baseNumeric) < EPSILON) {
    return true;
  }

  return termKey(normalizeAst(left.baseNode)) === termKey(normalizeAst(right.baseNode));
}

function sameBaseTargetLatex(base: LogCall, isolatedValueLatex: string) {
  if (Math.abs(base.baseNumeric - Math.E) < EPSILON) {
    return `e^{${isolatedValueLatex}}`;
  }

  const baseLatex = canonicalBaseLatex(base.baseNumeric, base.baseLatex);
  return `${baseLatex}^{${isolatedValueLatex}}`;
}

function singleLogEquationLatex(call: LogCall, isolatedValueLatex: string) {
  if (Math.abs(call.baseNumeric - Math.E) < EPSILON) {
    return `\\ln\\left(${call.innerLatex}\\right)=${isolatedValueLatex}`;
  }
  if (Math.abs(call.baseNumeric - 10) < EPSILON) {
    return `\\log\\left(${call.innerLatex}\\right)=${isolatedValueLatex}`;
  }
  return `\\log_{${canonicalBaseLatex(call.baseNumeric, call.baseLatex)}}\\left(${call.innerLatex}\\right)=${isolatedValueLatex}`;
}

function matchLogCall(node: unknown): LogCallMatch {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Ln') {
    return {
      kind: 'matched',
      call: {
        kind: 'ln',
        inner: normalized[1],
        innerLatex: boxLatex(normalized[1]),
        baseNode: Math.E,
        baseLatex: 'e',
        baseNumeric: Math.E,
        carrierLatex: boxLatex(normalized),
      },
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3)) {
    const inner = normalized[1];
    if (normalized.length === 2) {
      return {
        kind: 'matched',
        call: {
          kind: 'log',
          inner,
          innerLatex: boxLatex(inner),
          baseNode: 10,
          baseLatex: '10',
          baseNumeric: 10,
          carrierLatex: boxLatex(normalized),
        },
      };
    }

    const baseNode = normalized[2];
    const baseNumeric = numericFromNode(baseNode);
    if (baseNumeric === undefined || !Number.isFinite(baseNumeric)) {
      return {
        kind: 'blocked',
        error: 'Only constant numeric log bases are supported in this milestone.',
      };
    }

    if (!isValidLogBase(baseNumeric)) {
      return {
        kind: 'blocked',
        error: 'Log base must be a positive real number not equal to 1.',
      };
    }

    return {
      kind: 'matched',
      call: {
        kind: 'log',
        inner,
        innerLatex: boxLatex(inner),
        baseNode,
        baseLatex: boxLatex(baseNode),
        baseNumeric,
        carrierLatex: boxLatex(normalized),
      },
    };
  }

  return { kind: 'none' };
}

function parseSignedLogTerm(node: unknown): ParsedLogSide {
  const normalized = normalizeAst(node);

  const direct = matchLogCall(normalized);
  if (direct.kind === 'blocked') {
    return direct;
  }
  if (direct.kind === 'matched') {
    return {
      kind: 'linear',
      terms: [{ coefficient: 1, call: direct.call }],
      constant: 0,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const parsed = parseSignedLogTerm(normalized[1]);
    if (parsed.kind !== 'linear') {
      return parsed;
    }
    return {
      kind: 'linear',
      terms: parsed.terms.map((term) => ({ ...term, coefficient: -term.coefficient })),
      constant: 0,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    const factors = flattenMultiply(normalized);
    const numericFactors: number[] = [];
    let call: LogCall | null = null;
    for (const factor of factors) {
      const numeric = numericFromNode(factor);
      if (numeric !== undefined) {
        numericFactors.push(numeric);
        continue;
      }

      const matched = matchLogCall(factor);
      if (matched.kind === 'blocked') {
        return matched;
      }
      if (matched.kind !== 'matched' || call) {
        return { kind: 'none' };
      }
      call = matched.call;
    }

    if (!call || numericFactors.length === 0) {
      return { kind: 'none' };
    }

    return {
      kind: 'linear',
      terms: [{
        coefficient: numericFactors.reduce((product, numeric) => product * numeric, 1),
        call,
      }],
      constant: 0,
    };
  }

  return { kind: 'none' };
}

function parseLogLinearSide(node: unknown): ParsedLogSide {
  const normalized = normalizeAst(node);
  const direct = parseSignedLogTerm(normalized);
  if (direct.kind !== 'none') {
    return direct;
  }

  const numeric = numericFromNode(normalized);
  if (numeric !== undefined) {
    return { kind: 'linear', terms: [], constant: numeric };
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return { kind: 'none' };
  }

  let constant = 0;
  const terms: SignedLogTerm[] = [];
  for (const child of flattenAdd(normalized)) {
    const childNumeric = numericFromNode(child);
    if (childNumeric !== undefined) {
      constant += childNumeric;
      continue;
    }

    const parsed = parseSignedLogTerm(child);
    if (parsed.kind === 'blocked') {
      return parsed;
    }
    if (parsed.kind !== 'linear') {
      return { kind: 'none' };
    }
    terms.push(...parsed.terms);
  }

  return { kind: 'linear', terms, constant };
}

function combineLikeTerms(terms: SignedLogTerm[]) {
  const grouped = new Map<string, SignedLogTerm>();
  for (const term of terms) {
    const key = `${term.call.baseNumeric}:${termKey(normalizeAst(term.call.inner))}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.coefficient += term.coefficient;
      continue;
    }
    grouped.set(key, { ...term });
  }

  return [...grouped.values()].filter((term) => Math.abs(term.coefficient) > EPSILON);
}

function matchBinaryAggregate(node: unknown): BinaryLogAggregate {
  const parsed = parseLogLinearSide(node);
  if (parsed.kind !== 'linear') {
    return parsed;
  }
  if (Math.abs(parsed.constant) > EPSILON) {
    return { kind: 'none' };
  }

  const terms = combineLikeTerms(parsed.terms);
  if (terms.length !== 2) {
    return { kind: 'none' };
  }

  const [first, second] = terms;
  const coefficients = [first.coefficient, second.coefficient];
  const supportedCoefficient = (value: number) => Math.abs(Math.abs(value) - 1) <= EPSILON;
  if (!coefficients.every(supportedCoefficient)) {
    return { kind: 'none' };
  }

  const positive = terms.filter((term) => term.coefficient > 0);
  const negative = terms.filter((term) => term.coefficient < 0);
  const relation = negative.length === 0 ? 'product' : 'quotient';
  const family = sameLogBase(first.call, second.call) ? 'same-base' : 'mixed-base';

  if (relation === 'quotient' && (positive.length !== 1 || negative.length !== 1)) {
    return { kind: 'none' };
  }

  const left = relation === 'quotient' ? positive[0].call : first.call;
  const right = relation === 'quotient' ? negative[0].call : second.call;
  const argumentLatex = relation === 'product'
    ? `\\left(${first.call.innerLatex}\\right)\\left(${second.call.innerLatex}\\right)`
    : `\\frac{${left.innerLatex}}{${right.innerLatex}}`;

  return {
    kind: 'aggregate',
    relation,
    left,
    right,
    argumentLatex,
    family,
    carrierLatex: boxLatex(normalizeAst(node)),
  };
}

function matchSingleLog(node: unknown) {
  const parsed = parseLogLinearSide(node);
  if (parsed.kind !== 'linear') {
    return parsed;
  }
  if (Math.abs(parsed.constant) > EPSILON) {
    return { kind: 'none' } as const;
  }

  const terms = combineLikeTerms(parsed.terms);
  if (terms.length !== 1 || Math.abs(terms[0].coefficient - 1) > EPSILON) {
    return { kind: 'none' } as const;
  }

  return {
    kind: 'single' as const,
    call: terms[0].call,
  };
}

function mergeDomainConstraints(calls: LogCall[]) {
  return calls.map((call) => ({
    kind: 'positive' as const,
    expressionLatex: call.innerLatex,
  }));
}

function trySameBaseAggregateSolve(
  aggregateSide: unknown,
  otherSide: unknown,
): SubstitutionSolveResult {
  const aggregate = matchBinaryAggregate(aggregateSide);
  if (aggregate.kind !== 'aggregate') {
    return aggregate;
  }
  if (aggregate.family !== 'same-base') {
    return { kind: 'none' };
  }

  const singleTarget = matchSingleLog(otherSide);
  const numericTarget = numericFromNode(normalizeAst(otherSide));
  const usesExplicitBase = Math.abs(aggregate.left.baseNumeric - Math.E) >= EPSILON
    && Math.abs(aggregate.left.baseNumeric - 10) >= EPSILON;
  const solveBadge = aggregate.relation === 'product' ? 'Log Combine' : 'Log Quotient';

  if (singleTarget.kind === 'single' && sameLogBase(aggregate.left, singleTarget.call)) {
    const nextEquationLatex = `${aggregate.argumentLatex}=${singleTarget.call.innerLatex}`;
    const branchSet = createBranchSet({
      equations: [nextEquationLatex],
      constraints: mergeDomainConstraints([aggregate.left, aggregate.right, singleTarget.call]),
      provenance: 'substitution-log-combine',
    });
    return {
      kind: 'branches',
      equations: branchSet.equations,
      solveBadges: usesExplicitBase
        ? ['Symbolic Substitution', solveBadge, 'Same-Base Equality', 'Log Base Normalize', 'Candidate Checked']
        : ['Symbolic Substitution', solveBadge, 'Same-Base Equality', 'Candidate Checked'],
      solveSummaryText: `Combined ${toInlineSummaryMath(aggregate.carrierLatex)} into ${toInlineSummaryMath(nextEquationLatex)}`,
      domainConstraints: branchSet.constraints,
      diagnostics: {
        family: aggregate.relation === 'product' ? 'log-same-base' : 'log-quotient',
        carrierKind: aggregate.left.kind,
        branchCount: branchSet.equations.length,
        filteredBranchCount: 0,
      },
    };
  }

  if (numericTarget !== undefined) {
    const targetLatex = sameBaseTargetLatex(aggregate.left, formatBranchValue(numericTarget));
    const nextEquationLatex = `${aggregate.argumentLatex}=${targetLatex}`;
    const branchSet = createBranchSet({
      equations: [nextEquationLatex],
      constraints: mergeDomainConstraints([aggregate.left, aggregate.right]),
      provenance: 'substitution-log-combine',
    });
    return {
      kind: 'branches',
      equations: branchSet.equations,
      solveBadges: usesExplicitBase
        ? ['Symbolic Substitution', solveBadge, 'Log Base Normalize', 'Candidate Checked']
        : ['Symbolic Substitution', solveBadge, 'Candidate Checked'],
      solveSummaryText: `Combined ${toInlineSummaryMath(aggregate.carrierLatex)} into ${toInlineSummaryMath(nextEquationLatex)}`,
      domainConstraints: branchSet.constraints,
      diagnostics: {
        family: aggregate.relation === 'product' ? 'log-same-base' : 'log-quotient',
        carrierKind: aggregate.left.kind,
        branchCount: branchSet.equations.length,
        filteredBranchCount: 0,
      },
    };
  }

  return { kind: 'none' };
}

function tryMixedBaseExactSolve(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const left = parseLogLinearSide(equationAst[1]);
  if (left.kind === 'blocked') {
    return left;
  }
  const right = parseLogLinearSide(equationAst[2]);
  if (right.kind === 'blocked') {
    return right;
  }
  if (left.kind !== 'linear' || right.kind !== 'linear') {
    return { kind: 'none' };
  }

  const terms = combineLikeTerms([
    ...left.terms,
    ...right.terms.map((term) => ({ ...term, coefficient: -term.coefficient })),
  ]);
  const constant = right.constant - left.constant;

  if (terms.length < 2 || !Number.isFinite(constant)) {
    return { kind: 'none' };
  }

  const argumentKey = termKey(normalizeAst(terms[0].call.inner));
  if (!terms.every((term) => termKey(normalizeAst(term.call.inner)) === argumentKey)) {
    return { kind: 'none' };
  }

  const distinctBases = new Set(terms.map((term) => canonicalBaseLatex(term.call.baseNumeric, term.call.baseLatex)));
  if (distinctBases.size < 2) {
    return { kind: 'none' };
  }

  const anchor = terms[0].call;
  let totalCoefficient: RationalValue = { numerator: 0, denominator: 1 };
  for (const term of terms) {
    const ratio = (Math.log(anchor.baseNumeric) / Math.log(term.call.baseNumeric)) * term.coefficient;
    const approximated = approximateRational(ratio);
    if (!approximated) {
      const normalizedEquationLatex = `${terms.map((logTerm) => {
        const naturalLatex = logCallToNaturalTermLatex(logTerm.call);
        return Math.abs(logTerm.coefficient - 1) <= EPSILON
          ? naturalLatex
          : `${formatBranchValue(logTerm.coefficient)}\\left(${naturalLatex}\\right)`;
      }).join('+')}=${formatBranchValue(constant)}`;
      const branchSet = createBranchSet({
        equations: [normalizedEquationLatex],
        constraints: mergeDomainConstraints(terms.map((term) => term.call)),
        provenance: 'substitution-log-combine',
      });
      return {
        kind: 'branches',
        equations: branchSet.equations,
        solveBadges: ['Symbolic Substitution', 'Log Base Normalize', 'Candidate Checked'],
        solveSummaryText: `Normalized mixed-base logs via change-of-base: ${toInlineSummaryMath(normalizedEquationLatex)}`,
        domainConstraints: branchSet.constraints,
        diagnostics: {
          family: 'log-mixed-base',
          carrierKind: 'log',
          branchCount: branchSet.equations.length,
          filteredBranchCount: 0,
        },
      };
    }
    totalCoefficient = addRational(totalCoefficient, approximated);
  }

  if (Math.abs(rationalToNumber(totalCoefficient)) <= EPSILON) {
    return { kind: 'none' };
  }

  const isolatedValue = constant / rationalToNumber(totalCoefficient);
  const isolatedValueLatex = formatBranchValue(isolatedValue);
  const nextEquationLatex = singleLogEquationLatex(anchor, isolatedValueLatex);
  const branchSet = createBranchSet({
    equations: [nextEquationLatex],
    constraints: mergeDomainConstraints(terms.map((term) => term.call)),
    provenance: 'substitution-log-combine',
  });

  return {
    kind: 'branches',
    equations: branchSet.equations,
    solveBadges: ['Symbolic Substitution', 'Log Base Normalize', 'Candidate Checked'],
    solveSummaryText: `Normalized mixed-base logs into ${toInlineSummaryMath(nextEquationLatex)}`,
    domainConstraints: branchSet.constraints,
    diagnostics: {
      family: 'log-mixed-base-rational',
      carrierKind: 'log',
      branchCount: branchSet.equations.length,
      filteredBranchCount: 0,
    },
  };
}

function tryRecognizedMixedBaseGuidance(
  aggregateSide: unknown,
  otherSide: unknown,
): SubstitutionSolveResult {
  const aggregate = matchBinaryAggregate(aggregateSide);
  if (aggregate.kind !== 'aggregate' || aggregate.family !== 'mixed-base') {
    return aggregate.kind === 'blocked' ? aggregate : { kind: 'none' };
  }

  const numericTarget = numericFromNode(normalizeAst(otherSide));
  if (numericTarget === undefined) {
    return { kind: 'none' };
  }

  const normalizedEquationLatex = `${logCallToNaturalTermLatex(aggregate.left)}${aggregate.relation === 'product' ? '+' : '-'}${logCallToNaturalTermLatex(aggregate.right)}=${formatBranchValue(numericTarget)}`;
  const branchSet = createBranchSet({
    equations: [normalizedEquationLatex],
    constraints: mergeDomainConstraints([aggregate.left, aggregate.right]),
    provenance: 'substitution-log-combine',
  });
  return {
    kind: 'branches',
    equations: branchSet.equations,
    solveBadges: ['Symbolic Substitution', 'Log Base Normalize', 'Candidate Checked'],
    solveSummaryText: `Normalized mixed-base logs via change-of-base: ${toInlineSummaryMath(normalizedEquationLatex)}`,
    domainConstraints: branchSet.constraints,
    diagnostics: {
      family: 'log-mixed-base',
      carrierKind: 'log',
      branchCount: branchSet.equations.length,
      filteredBranchCount: 0,
    },
  };
}

function matchLogCombineSolve(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const sameBaseLeft = trySameBaseAggregateSolve(equationAst[1], equationAst[2]);
  if (sameBaseLeft.kind !== 'none') {
    return sameBaseLeft;
  }

  const sameBaseRight = trySameBaseAggregateSolve(equationAst[2], equationAst[1]);
  if (sameBaseRight.kind !== 'none') {
    return sameBaseRight;
  }

  const mixedBase = tryMixedBaseExactSolve(equationAst);
  if (mixedBase.kind !== 'none') {
    return mixedBase;
  }

  const mixedBaseLeft = tryRecognizedMixedBaseGuidance(equationAst[1], equationAst[2]);
  if (mixedBaseLeft.kind !== 'none') {
    return mixedBaseLeft;
  }

  const mixedBaseRight = tryRecognizedMixedBaseGuidance(equationAst[2], equationAst[1]);
  if (mixedBaseRight.kind !== 'none') {
    return mixedBaseRight;
  }

  return { kind: 'none' };
}

export { matchLogCombineSolve };
