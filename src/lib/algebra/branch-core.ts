import type {
  PeriodicFamilyInfo,
  PeriodicFamilyRepresentative,
  PeriodicIntervalSuggestion,
  PeriodicPiecewiseBranch,
  SolveDomainConstraint,
} from '../../types/calculator';

export type BranchEquationSet = {
  equations: string[];
  constraints?: SolveDomainConstraint[];
  summaryText?: string;
  provenance?: string;
};

export type BranchFamilyMetadata = {
  carrierLatex: string;
  parameterLatex: string;
  branchesLatex: string[];
  parameterConstraintLatex?: string[];
  discoveredFamilies?: string[];
  representatives?: PeriodicFamilyRepresentative[];
  suggestedIntervals?: PeriodicIntervalSuggestion[];
  piecewiseBranches?: PeriodicPiecewiseBranch[];
  principalRangeLatex?: string;
  reducedCarrierLatex?: string;
  structuredStopReason?: PeriodicFamilyInfo['structuredStopReason'];
};

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function dedupeStructured<T>(values: T[] = []) {
  return dedupe(values.map((entry) => JSON.stringify(entry))).map((entry) => JSON.parse(entry) as T);
}

function firstDefined<T>(values: Array<T | undefined>) {
  return values.find((value): value is T => value !== undefined);
}

function cleanStringList(values: string[] = []) {
  const cleaned = dedupe(values.filter(Boolean));
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanStructuredList<T>(values: T[] = []) {
  const cleaned = dedupeStructured(values);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function mergeBranchConstraints(...lists: Array<SolveDomainConstraint[] | undefined>) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of lists.flatMap((entry) => entry ?? [])) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

export function createBranchSet({
  equations,
  constraints,
  summaryText,
  provenance,
}: {
  equations: string[];
  constraints?: SolveDomainConstraint[];
  summaryText?: string;
  provenance?: string;
}): BranchEquationSet {
  const normalizedConstraints = mergeBranchConstraints(constraints);
  return {
    equations: dedupe(equations.filter(Boolean)),
    constraints: normalizedConstraints.length > 0 ? normalizedConstraints : undefined,
    summaryText,
    provenance,
  };
}

export function createSingleBranchSet(
  equation: string,
  constraints?: SolveDomainConstraint[],
  metadata?: Pick<BranchEquationSet, 'summaryText' | 'provenance'>,
) {
  return createBranchSet({
    equations: [equation],
    constraints,
    summaryText: metadata?.summaryText,
    provenance: metadata?.provenance,
  });
}

export function createTwoBranchSet(
  firstEquation: string,
  secondEquation: string,
  constraints?: SolveDomainConstraint[],
  metadata?: Pick<BranchEquationSet, 'summaryText' | 'provenance'>,
) {
  return createBranchSet({
    equations: [firstEquation, secondEquation],
    constraints,
    summaryText: metadata?.summaryText,
    provenance: metadata?.provenance,
  });
}

export function branchPairToSet(
  branchPair: [string, string],
  constraints?: SolveDomainConstraint[],
  metadata?: Pick<BranchEquationSet, 'summaryText' | 'provenance'>,
) {
  return createTwoBranchSet(
    branchPair[0],
    branchPair[1],
    constraints,
    metadata,
  );
}

export function branchSetToPair(branchSet: BranchEquationSet | string[]) {
  const equations = Array.isArray(branchSet)
    ? createBranchSet({ equations: branchSet }).equations
    : branchSet.equations;

  return equations.length === 2
    ? [equations[0], equations[1]] as [string, string]
    : null;
}

export function createBranchFamilyMetadata(metadata: BranchFamilyMetadata): BranchFamilyMetadata {
  return {
    carrierLatex: metadata.carrierLatex,
    parameterLatex: metadata.parameterLatex,
    branchesLatex: dedupe(metadata.branchesLatex),
    parameterConstraintLatex: cleanStringList(metadata.parameterConstraintLatex),
    discoveredFamilies: cleanStringList(metadata.discoveredFamilies),
    representatives: cleanStructuredList(metadata.representatives),
    suggestedIntervals: cleanStructuredList(metadata.suggestedIntervals),
    piecewiseBranches: cleanStructuredList(metadata.piecewiseBranches),
    principalRangeLatex: metadata.principalRangeLatex,
    reducedCarrierLatex: metadata.reducedCarrierLatex,
    structuredStopReason: metadata.structuredStopReason,
  };
}

export function toPeriodicFamilyInfo(metadata: BranchFamilyMetadata): PeriodicFamilyInfo {
  return createBranchFamilyMetadata(metadata) satisfies PeriodicFamilyInfo;
}

export function appendDiscoveredBranchFamilies(
  family: PeriodicFamilyInfo,
  discoveredFamilies: string[] = [],
) {
  return toPeriodicFamilyInfo({
    ...family,
    discoveredFamilies: [
      ...(family.discoveredFamilies ?? []),
      ...discoveredFamilies,
    ],
  });
}

export function mergeBranchFamilyExtras(
  family: PeriodicFamilyInfo | undefined,
  extras: Partial<BranchFamilyMetadata> | undefined,
) {
  if (!extras) {
    return family;
  }

  if (!family) {
    if (!extras.carrierLatex) {
      return family;
    }

    return toPeriodicFamilyInfo({
      carrierLatex: extras.carrierLatex,
      parameterLatex: extras.parameterLatex ?? 'k\\in\\mathbb{Z}',
      branchesLatex: extras.branchesLatex ?? [],
      parameterConstraintLatex: extras.parameterConstraintLatex,
      discoveredFamilies: extras.discoveredFamilies,
      representatives: extras.representatives,
      suggestedIntervals: extras.suggestedIntervals,
      piecewiseBranches: extras.piecewiseBranches,
      principalRangeLatex: extras.principalRangeLatex,
      reducedCarrierLatex: extras.reducedCarrierLatex,
      structuredStopReason: extras.structuredStopReason,
    });
  }

  return toPeriodicFamilyInfo({
    ...family,
    discoveredFamilies: [
      ...(family.discoveredFamilies ?? []),
      ...(extras.discoveredFamilies ?? []),
    ],
    piecewiseBranches: [
      ...(family.piecewiseBranches ?? []),
      ...(extras.piecewiseBranches ?? []),
    ],
    principalRangeLatex: extras.principalRangeLatex ?? family.principalRangeLatex,
    reducedCarrierLatex: extras.reducedCarrierLatex ?? family.reducedCarrierLatex,
    structuredStopReason: extras.structuredStopReason ?? family.structuredStopReason,
  });
}

export function mergeBranchFamilies(families: PeriodicFamilyInfo[]) {
  if (families.length === 0) {
    return undefined;
  }

  const discoveredFamilies = dedupe(
    families.flatMap((family) => family.discoveredFamilies ?? []),
  );
  const carrierLatex = families[0].carrierLatex;
  const parameterLatex = families[0].parameterLatex;

  if (families.some((family) => family.carrierLatex !== carrierLatex || family.parameterLatex !== parameterLatex)) {
    return toPeriodicFamilyInfo({
      ...families[0],
      discoveredFamilies: discoveredFamilies.length > 0 ? discoveredFamilies : families[0].discoveredFamilies,
    });
  }

  const representatives = dedupeStructured(
    families.flatMap((family) => family.representatives ?? []),
  );
  const suggestedIntervals = dedupeStructured(
    families.flatMap((family) => family.suggestedIntervals ?? []),
  );
  const piecewiseBranches = dedupeStructured(
    families.flatMap((family) => family.piecewiseBranches ?? []),
  );
  const principalRangeLatex = firstDefined(
    dedupe(families.map((family) => family.principalRangeLatex).filter((entry): entry is string => Boolean(entry))),
  );
  const reducedCarrierLatex = firstDefined(
    dedupe(families.map((family) => family.reducedCarrierLatex).filter((entry): entry is string => Boolean(entry))),
  );
  const structuredStopReason = firstDefined(
    dedupe(
      families
        .map((family) => family.structuredStopReason)
        .filter((entry): entry is NonNullable<PeriodicFamilyInfo['structuredStopReason']> => Boolean(entry)),
    ),
  );

  return toPeriodicFamilyInfo({
    carrierLatex,
    parameterLatex,
    branchesLatex: families.flatMap((family) => family.branchesLatex),
    parameterConstraintLatex: families.flatMap((family) => family.parameterConstraintLatex ?? []),
    discoveredFamilies,
    representatives,
    suggestedIntervals,
    piecewiseBranches,
    principalRangeLatex,
    reducedCarrierLatex,
    structuredStopReason,
  });
}
