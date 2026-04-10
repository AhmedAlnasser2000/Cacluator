import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber, solutionsToLatex } from '../../format';
import { buildConstraintSupplementLatex, mergeExactSupplementLatex } from '../../exact-supplements';
import { matchSubstitutionSolve } from '../substitution-solve';
import { validateCandidateRoots } from '../candidate-validation';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import { createBranchSet } from '../../algebra/branch-core';
import type {
  DisplayOutcome,
  EquationExecutionBudget,
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

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function substitutionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= executionBudget.maxRecursionDepth) {
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
  const branchEquations = createBranchSet({
    equations: substitution.equations,
    constraints: substitution.domainConstraints,
    provenance: 'guarded-substitution-stage',
  }).equations.filter(
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
  const substitutionSupplementLatex = buildConstraintSupplementLatex(
    substitution.domainConstraints,
    'transform',
  );

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

  const exactCandidates = dedupe([
    ...extractExactSolutions(merged.exactLatex),
  ])
    .map((value) => parseFiniteNumericValue(value))
    .filter((value): value is number => value !== null);

  const candidateValues = dedupe(merged.candidateValues ?? []);

  const approxCandidates = exactCandidates.length === 0 && candidateValues.length === 0
    ? dedupe(extractApproxSolutions(merged.approxText))
      .map((value) => parseFiniteNumericValue(value))
      .filter((value): value is number => value !== null)
    : [];

  const validationCandidates = exactCandidates.length > 0
    ? exactCandidates
    : (candidateValues.length > 0 ? candidateValues : approxCandidates);

  if (validationCandidates.length === 0) {
    return merged;
  }

  const validation = validateCandidateRoots(
    request.resolvedLatex,
    validationCandidates,
    substitution.domainConstraints,
    'symbolic-substitution',
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    return errorOutcome(
      'Solve',
      buildEquationCandidateRejectionMessage(
        classifyCandidateRejections(validation.rejected, substitution.domainConstraints),
      ),
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
    : [];
  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: substitutionSupplementLatex, source: 'transform' },
    ),
    approxText: `x ~= ${validation.accepted.map((value) => formatApproxNumber(value)).join(', ')}`,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
    solveSummaryText: merged.solveSummaryText,
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitutionDiagnostics: substitution.diagnostics,
    numericMethod: merged.numericMethod,
  };
}

export { substitutionSolve };
