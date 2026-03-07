import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { runNumericIntervalSolve } from '../numeric-interval-solve';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

function numericIntervalSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  if (!request.numericInterval) {
    return null;
  }

  const numeric = runNumericIntervalSolve(
    request.resolvedLatex,
    request.numericInterval,
    request.domainConstraints,
  );
  if (numeric.kind === 'error') {
    return errorOutcome(
      'Solve',
      numeric.error,
      [],
      [],
      ['Numeric Interval', 'Candidate Checked'],
      numeric.summaryText,
      numeric.rejectedCandidateCount,
      undefined,
      numeric.method,
    );
  }

  return successOutcome(
    'Solve',
    undefined,
    `x ~= ${numeric.roots.map((value) => value.toFixed(6).replace(/0+$/,'').replace(/\.$/, '')).join(', ')}`,
    [],
    [],
    ['Numeric Interval', 'Candidate Checked'],
    numeric.summaryText,
    numeric.rejectedCandidateCount,
    undefined,
    numeric.method,
  );
}

export { numericIntervalSolve };
