import { solutionsToLatex } from '../../format';
import type {
  DisplayOutcome,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
  successOutcome,
} from './outcome';

function extractExactSolutions(exactLatex?: string) {
  if (!exactLatex) {
    return [];
  }

  if (exactLatex.startsWith('x=')) {
    return [exactLatex.slice(2)];
  }

  const prefix = 'x\\in\\left\\{';
  const suffix = '\\right\\}';
  if (exactLatex.startsWith(prefix) && exactLatex.endsWith(suffix)) {
    return exactLatex
      .slice(prefix.length, -suffix.length)
      .split(/,\s*/)
      .filter(Boolean);
  }

  return [exactLatex];
}

function extractApproxSolutions(approxText?: string) {
  if (!approxText) {
    return [];
  }

  const prefix = 'x ~= ';
  if (approxText.startsWith(prefix)) {
    return approxText.slice(prefix.length).split(/,\s*/).filter(Boolean);
  }

  return [approxText];
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function mergeDisplayOutcomes(
  outcomes: DisplayOutcome[],
  solveBadges: SolveBadge[],
  solveSummaryText: string,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
): DisplayOutcome {
  const successes = outcomes.filter((outcome) => outcome.kind === 'success');
  if (successes.length === 0) {
    const firstError = outcomes.find((outcome) => outcome.kind === 'error');
    if (firstError?.kind === 'error') {
      return errorOutcome(
        'Solve',
        firstError.error,
        firstError.warnings,
        firstError.plannerBadges ?? [],
        dedupe([...(firstError.solveBadges ?? []), ...solveBadges]),
        solveSummaryText,
        firstError.rejectedCandidateCount,
        substitutionDiagnostics ?? firstError.substitutionDiagnostics,
        firstError.numericMethod,
      );
    }

    return errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
      [],
      [],
      solveBadges,
      solveSummaryText,
      undefined,
      substitutionDiagnostics,
    );
  }

  const exactValues = dedupe(successes.flatMap((outcome) => extractExactSolutions(outcome.exactLatex)));
  const approxValues = dedupe(successes.flatMap((outcome) => extractApproxSolutions(outcome.approxText)));
  const warnings = dedupe(successes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(successes.flatMap((outcome) => outcome.plannerBadges ?? []));
  const badgeSet = dedupe(successes.flatMap((outcome) => outcome.solveBadges ?? []).concat(solveBadges));
  const rejectedCandidateCount = successes.reduce((total, outcome) => total + (outcome.rejectedCandidateCount ?? 0), 0);
  const numericMethod = dedupe(successes.map((outcome) => outcome.numericMethod).filter((method): method is string => Boolean(method))).join('; ');

  return successOutcome(
    'Solve',
    exactValues.length > 0 ? solutionsToLatex('x', exactValues) : undefined,
    approxValues.length > 0 ? `x ~= ${approxValues.join(', ')}` : undefined,
    warnings,
    plannerBadges,
    badgeSet,
    solveSummaryText,
    rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    substitutionDiagnostics ?? successes.find((outcome) => outcome.substitutionDiagnostics)?.substitutionDiagnostics,
    numericMethod || undefined,
  );
}

export {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeDisplayOutcomes,
};
