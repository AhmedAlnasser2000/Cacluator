import { ComputeEngine } from '@cortex-js/compute-engine';
import { solutionsToLatex } from '../../format';
import { matchSubstitutionSolve } from '../substitution-solve';
import { validateCandidateRoots } from '../candidate-validation';
import type {
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

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

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
    ...extractApproxSolutions(merged.approxText),
  ])
    .map((value) => {
      try {
        const numeric = ce.parse(value).N?.().json;
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
    })
    .filter((value): value is number => value !== null);

  if (candidates.length === 0) {
    return merged;
  }

  const validation = validateCandidateRoots(
    request.resolvedLatex,
    candidates,
    substitution.domainConstraints,
    'symbolic-substitution',
  );

  if (validation.accepted.length === 0) {
    return errorOutcome(
      'Solve',
      'Candidate roots were found but rejected after substitution back into the original equation.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
      merged.solveSummaryText,
      validation.rejected.length,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  const acceptedLatex = validation.accepted.map((value) => {
    const rounded = Number(value.toPrecision(12));
    return `${rounded}`;
  });

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: solutionsToLatex('x', acceptedLatex),
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
