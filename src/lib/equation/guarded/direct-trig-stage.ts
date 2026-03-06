import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from '../../trigonometry/equation-match';
import { solveTrigEquation } from '../../trigonometry/equations';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

type SolveLike = ReturnType<typeof solveTrigEquation>;

function isTrigSolveSuccess(outcome: SolveLike) {
  return !outcome.error && Boolean(outcome.exactLatex);
}

function directTrigSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  const directMatch = matchBoundedTrigEquation(request.resolvedLatex);
  const mixedMatch = matchBoundedMixedLinearTrigEquation(request.resolvedLatex);
  if (!directMatch && !mixedMatch) {
    return null;
  }

  const trig = solveTrigEquation({
    equationLatex: request.resolvedLatex,
    variable: 'x',
    angleUnit: request.angleUnit,
  });

  if (isTrigSolveSuccess(trig)) {
    return successOutcome(
      'Solve',
      trig.exactLatex,
      trig.approxText,
      trig.warnings,
      ['Trig Solve Backend'],
    );
  }

  return errorOutcome(
    'Solve',
    trig.error ?? 'No symbolic solution was found for x.',
    trig.warnings,
    ['Trig Solve Backend'],
  );
}

export { directTrigSolve, isTrigSolveSuccess };
