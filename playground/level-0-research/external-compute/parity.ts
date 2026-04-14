type SymbolicSearchSummaryShape = {
  corpusSize: number;
  baselineParityMismatches: unknown[];
  orderings: Record<
    string,
    {
      summary: {
        classificationCounts: Record<string, number>;
        cleanerBoundedPathWins: number;
        exactImprovements: string[];
        regressions: string[];
      };
      comparisons: Array<{
        caseId: string;
        baselineWinningStage: string | null;
        alternateWinningStage: string | null;
        baselineAttemptCount: number;
        alternateAttemptCount: number;
        classification: string;
      }>;
    }
  >;
};

export type ExternalComputeParityResultClass =
  | 'match'
  | 'mismatch'
  | 'remote-failed'
  | 'pullback-failed';

export type ExternalComputeParityReport = {
  resultClass: ExternalComputeParityResultClass;
  workloadId: string;
  remoteSummaryPath?: string;
  localSummaryPath?: string;
  comparedFields?: string[];
  mismatchFields?: string[];
  note?: string;
};

type ExternalComputeSummaryPayload = {
  summary?: unknown;
};

function normalizeSymbolicSearchSummary(
  summary: SymbolicSearchSummaryShape,
): SymbolicSearchSummaryShape {
  const orderingEntries = Object.entries(summary.orderings)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([orderingName, ordering]) => [
      orderingName,
      {
        summary: {
          classificationCounts: Object.fromEntries(
            Object.entries(ordering.summary.classificationCounts).sort(([left], [right]) => (
              left.localeCompare(right)
            )),
          ),
          cleanerBoundedPathWins: ordering.summary.cleanerBoundedPathWins,
          exactImprovements: [...ordering.summary.exactImprovements],
          regressions: [...ordering.summary.regressions],
        },
        comparisons: [...ordering.comparisons].map((comparison) => ({
          caseId: comparison.caseId,
          baselineWinningStage: comparison.baselineWinningStage,
          alternateWinningStage: comparison.alternateWinningStage,
          baselineAttemptCount: comparison.baselineAttemptCount,
          alternateAttemptCount: comparison.alternateAttemptCount,
          classification: comparison.classification,
        })),
      },
    ]);

  return {
    corpusSize: summary.corpusSize,
    baselineParityMismatches: [...summary.baselineParityMismatches],
    orderings: Object.fromEntries(orderingEntries),
  };
}

function extractSymbolicSearchSummary(
  payload: ExternalComputeSummaryPayload,
): SymbolicSearchSummaryShape {
  const summary = payload.summary;
  if (!summary || typeof summary !== 'object') {
    throw new Error('Expected symbolic-search summary payload to contain a summary object.');
  }

  return normalizeSymbolicSearchSummary(summary as SymbolicSearchSummaryShape);
}

export function compareSymbolicSearchParity(
  workloadId: string,
  remotePayload: ExternalComputeSummaryPayload,
  localPayload: ExternalComputeSummaryPayload,
): ExternalComputeParityReport {
  const comparedFields = [
    'corpusSize',
    'baselineParityMismatches',
    'orderings.*.summary.classificationCounts',
    'orderings.*.summary.cleanerBoundedPathWins',
    'orderings.*.summary.exactImprovements',
    'orderings.*.summary.regressions',
    'orderings.*.comparisons[*].caseId',
    'orderings.*.comparisons[*].baselineWinningStage',
    'orderings.*.comparisons[*].alternateWinningStage',
    'orderings.*.comparisons[*].baselineAttemptCount',
    'orderings.*.comparisons[*].alternateAttemptCount',
    'orderings.*.comparisons[*].classification',
  ];

  const remoteSummary = extractSymbolicSearchSummary(remotePayload);
  const localSummary = extractSymbolicSearchSummary(localPayload);

  if (JSON.stringify(remoteSummary) === JSON.stringify(localSummary)) {
    return {
      resultClass: 'match',
      workloadId,
      comparedFields,
    };
  }

  const mismatchFields: string[] = [];
  if (remoteSummary.corpusSize !== localSummary.corpusSize) {
    mismatchFields.push('corpusSize');
  }
  if (
    JSON.stringify(remoteSummary.baselineParityMismatches)
    !== JSON.stringify(localSummary.baselineParityMismatches)
  ) {
    mismatchFields.push('baselineParityMismatches');
  }
  if (JSON.stringify(remoteSummary.orderings) !== JSON.stringify(localSummary.orderings)) {
    mismatchFields.push('orderings');
  }

  return {
    resultClass: 'mismatch',
    workloadId,
    comparedFields,
    mismatchFields,
    note: 'The pulled-back remote summary does not match the local parity baseline.',
  };
}
