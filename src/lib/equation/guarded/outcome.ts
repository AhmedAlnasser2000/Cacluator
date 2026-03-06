import type {
  DisplayOutcome,
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';

const UNSUPPORTED_FAMILY_ERROR = 'This equation is outside the supported symbolic solve families for this milestone.';

function successOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
): DisplayOutcome {
  return {
    kind: 'success',
    title,
    exactLatex,
    approxText,
    warnings,
    resultOrigin: approxText && !exactLatex ? 'numeric-fallback' : 'symbolic',
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  };
}

function errorOutcome(
  title: string,
  error: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
): DisplayOutcome {
  return {
    kind: 'error',
    title,
    error,
    warnings,
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  };
}

export {
  UNSUPPORTED_FAMILY_ERROR,
  successOutcome,
  errorOutcome,
};
