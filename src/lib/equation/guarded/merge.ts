import { solutionsToLatex } from '../../format';
import type {
  DisplayOutcome,
  PeriodicFamilyInfo,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
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

function mergeDetailSections(outcomes: DisplayOutcome[]) {
  const encoded = dedupe(
    outcomes
      .flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.detailSections ?? [])
      .map((section) => JSON.stringify(section)),
  );
  return encoded.map((entry) => JSON.parse(entry));
}

function mergePeriodicFamilies(families: PeriodicFamilyInfo[]) {
  if (families.length === 0) {
    return undefined;
  }

  const carrierLatex = families[0].carrierLatex;
  const parameterLatex = families[0].parameterLatex;
  if (families.some((family) => family.carrierLatex !== carrierLatex || family.parameterLatex !== parameterLatex)) {
    return families[0];
  }

  const representatives = dedupe(
    families.flatMap((family) => family.representatives ?? []).map((entry) => JSON.stringify(entry)),
  ).map((entry) => JSON.parse(entry));
  const parameterConstraintLatex = dedupe(
    families.flatMap((family) => family.parameterConstraintLatex ?? []),
  );
  const suggestedIntervals = dedupe(
    families.flatMap((family) => family.suggestedIntervals ?? []).map((entry) => JSON.stringify(entry)),
  ).map((entry) => JSON.parse(entry));
  const piecewiseBranches = dedupe(
    families.flatMap((family) => family.piecewiseBranches ?? []).map((entry) => JSON.stringify(entry)),
  ).map((entry) => JSON.parse(entry));
  const principalRangeLatex = dedupe(
    families.map((family) => family.principalRangeLatex).filter((entry): entry is string => Boolean(entry)),
  );
  const reducedCarrierLatex = dedupe(
    families.map((family) => family.reducedCarrierLatex).filter((entry): entry is string => Boolean(entry)),
  );
  const structuredStopReason = dedupe(
    families.map((family) => family.structuredStopReason).filter((entry): entry is NonNullable<PeriodicFamilyInfo['structuredStopReason']> => Boolean(entry)),
  );

  return {
    carrierLatex,
    parameterLatex,
    parameterConstraintLatex: parameterConstraintLatex.length > 0 ? parameterConstraintLatex : undefined,
    branchesLatex: dedupe(families.flatMap((family) => family.branchesLatex)),
    representatives: representatives.length > 0 ? representatives : undefined,
    suggestedIntervals: suggestedIntervals.length > 0 ? suggestedIntervals : undefined,
    piecewiseBranches: piecewiseBranches.length > 0 ? piecewiseBranches : undefined,
    principalRangeLatex: principalRangeLatex.length > 0 ? principalRangeLatex[0] : undefined,
    reducedCarrierLatex: reducedCarrierLatex.length > 0 ? reducedCarrierLatex[0] : undefined,
    structuredStopReason: structuredStopReason.length > 0 ? structuredStopReason[0] : undefined,
  } satisfies PeriodicFamilyInfo;
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
  const exactSupplementLatex = dedupe(successes.flatMap((outcome) => outcome.exactSupplementLatex ?? []));
  const detailSections = mergeDetailSections(successes);
  const candidateValues = dedupe(successes.flatMap((outcome) => outcome.candidateValues ?? []));
  const rejectedCandidateCount = successes.reduce((total, outcome) => total + (outcome.rejectedCandidateCount ?? 0), 0);
  const numericMethod = dedupe(successes.map((outcome) => outcome.numericMethod).filter((method): method is string => Boolean(method))).join('; ');
  const periodicFamily = mergePeriodicFamilies(
    successes
      .map((outcome) => outcome.periodicFamily)
      .filter((family): family is PeriodicFamilyInfo => Boolean(family)),
  );

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: exactValues.length > 0 ? solutionsToLatex('x', exactValues) : undefined,
    periodicFamily,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    approxText: approxValues.length > 0 ? `x ~= ${approxValues.join(', ')}` : undefined,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    warnings,
    resultOrigin: approxValues.length > 0 && exactValues.length === 0 ? 'numeric-fallback' : 'symbolic',
    plannerBadges,
    solveBadges: badgeSet,
    solveSummaryText,
    candidateValues: candidateValues.length > 0 ? candidateValues : undefined,
    rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    substitutionDiagnostics: substitutionDiagnostics ?? successes.find((outcome) => outcome.substitutionDiagnostics)?.substitutionDiagnostics,
    numericMethod: numericMethod || undefined,
  };
}

export {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeDisplayOutcomes,
};
