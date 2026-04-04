import { ComputeEngine } from '@cortex-js/compute-engine';
import { solutionsToLatex } from '../../format';
import { matchSubstitutionSolve } from '../substitution-solve';
import { validateCandidateRoots } from '../candidate-validation';
import type {
  CandidateValidationResult,
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeDisplayOutcomes,
} from './merge';
import { equationStateKey } from './state-key';

const ce = new ComputeEngine();
const EXACT_MATCH_TOLERANCE = 1e-6;

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

function parseFiniteNumericValue(latex: string) {
  try {
    const numeric = ce.parse(latex).N?.().json;
    if (typeof numeric === 'number' && Number.isFinite(numeric)) {
      return numeric;
    }
    if (numeric && typeof numeric === 'object' && 'num' in numeric) {
      const parsed = Number((numeric as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }

  return null;
}

function matchAcceptedExactSolutions(exactLatex: string | undefined, accepted: number[]) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);

  if (exactCandidates.length === 0) {
    return [] as string[];
  }

  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = exactCandidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= EXACT_MATCH_TOLERANCE);
    if (candidateIndex < 0) {
      return [] as string[];
    }
    used.add(candidateIndex);
    matched.push(exactCandidates[candidateIndex].latex);
  }

  return matched;
}

function buildConstraintSupplementLatex(constraints: GuardedSolveRequest['domainConstraints'] = []) {
  const supported = constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'positive':
        return [`${constraint.expressionLatex}>0`];
      case 'nonnegative':
        return [`${constraint.expressionLatex}\\ge0`];
      case 'nonzero':
        return [`${constraint.expressionLatex}\\ne0`];
      default:
        return [];
    }
  });

  if (supported.length === 0) {
    return [] as string[];
  }

  return [`\\text{Conditions: } ${supported.join(',\\;')}`];
}

function substitutionRejectionMessage(rejected: CandidateValidationResult[]) {
  const rejectedReasons = rejected.map((entry) => entry.reason.toLowerCase());

  if (
    rejectedReasons.some((reason) =>
      reason.includes('denominator zero')
      || reason.includes('non-positive')
      || reason.includes('even root negative')
      || reason.includes('undefined or non-real substitution')
      || reason.includes('outside the permitted interval')
      || reason.includes('must stay positive'))
  ) {
    return 'Candidate roots were found but rejected after applying preserved domain conditions to the original equation.';
  }

  return 'Candidate roots were found but rejected after substitution back into the original equation.';
}

function substitutionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  maxRecursionDepth: number,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      substitution.solveBadges,
      substitution.solveSummaryText,
      undefined,
      substitution.diagnostics,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = dedupe(substitution.equations).filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );

  if (branchEquations.length === 0) {
    return null;
  }

  const outcomes = branchEquations.map((equationLatex) =>
    runGuardedEquationSolve({
      ...request,
      originalLatex: equationLatex,
      resolvedLatex: equationLatex,
      numericInterval: undefined,
    }, depth + 1, new Set(trail)));

  const merged = mergeDisplayOutcomes(
    outcomes,
    substitution.solveBadges,
    substitution.solveSummaryText,
    substitution.diagnostics,
  );
  const substitutionSupplementLatex = buildConstraintSupplementLatex(substitution.domainConstraints);

  const isSubstitutionUnsupported =
    merged.kind === 'error'
    && merged.error === UNSUPPORTED_FAMILY_ERROR;

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'log-mixed-base') {
    return errorOutcome(
      'Solve',
      'This recognized mixed-base log family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Log Base Normalize']),
      substitution.solveSummaryText,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'trig-sum-product') {
    return errorOutcome(
      'Solve',
      'This recognized trig sum-to-product family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Trig Sum-Product']),
      substitution.solveSummaryText,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind !== 'success' || !substitution.domainConstraints || substitution.domainConstraints.length === 0) {
    return merged;
  }

  const candidates = dedupe([
    ...extractExactSolutions(merged.exactLatex),
  ])
    .map((value) => parseFiniteNumericValue(value))
    .filter((value): value is number => value !== null);

  const approxCandidates = candidates.length === 0
    ? dedupe(extractApproxSolutions(merged.approxText))
      .map((value) => parseFiniteNumericValue(value))
      .filter((value): value is number => value !== null)
    : [];

  const validationCandidates = candidates.length > 0 ? candidates : approxCandidates;

  if (validationCandidates.length === 0) {
    return merged;
  }

  const validation = validateCandidateRoots(
    request.resolvedLatex,
    validationCandidates,
    substitution.domainConstraints,
    'symbolic-substitution',
  );

  if (validation.accepted.length === 0) {
    return errorOutcome(
      'Solve',
      substitutionRejectionMessage(validation.rejected),
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
      merged.solveSummaryText,
      validation.rejected.length,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const acceptedLatex = acceptedExactLatex.length === validation.accepted.length
    ? acceptedExactLatex
    : validation.accepted.map((value) => {
        const rounded = Number(value.toPrecision(12));
        return `${rounded}`;
      });

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: solutionsToLatex('x', acceptedLatex),
    exactSupplementLatex: dedupe([...(merged.exactSupplementLatex ?? []), ...substitutionSupplementLatex]),
    approxText: `x ~= ${validation.accepted.map((value) => {
      const rounded = Number(value.toFixed(12));
      return `${rounded}`.replace(/0+$/, '').replace(/\.$/, '');
    }).join(', ')}`,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
    solveSummaryText: merged.solveSummaryText,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitutionDiagnostics: substitution.diagnostics,
    numericMethod: merged.numericMethod,
  };
}

export { substitutionSolve };
