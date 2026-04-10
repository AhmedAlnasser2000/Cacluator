import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { solveTrigEquation } from '../../trigonometry/equations';
import { matchTrigEquationRewriteForSolve } from '../../trigonometry/rewrite-solve';
import { branchPairToSet } from '../../algebra/branch-core';
import {
  errorOutcome,
  successOutcome,
} from './outcome';
import { mergeDisplayOutcomes } from './merge';
import { isTrigSolveSuccess } from './direct-trig-stage';

function rewriteTrigSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  const rewriteMatch = matchTrigEquationRewriteForSolve(request.resolvedLatex, request.angleUnit);
  if (rewriteMatch.kind === 'none') {
    return null;
  }

  if (rewriteMatch.kind === 'blocked') {
    return errorOutcome('Solve', rewriteMatch.error);
  }

  if (rewriteMatch.kind === 'recognized-unresolved') {
    return errorOutcome(
      'Solve',
      rewriteMatch.error,
      [],
      [],
      ['Trig Sum-Product'],
      rewriteMatch.summaryText,
    );
  }

  if (rewriteMatch.candidate.kind === 'single-call') {
    const trig = solveTrigEquation({
      equationLatex: rewriteMatch.candidate.solvedLatex,
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
        ['Trig Rewrite'],
        rewriteMatch.candidate.summaryText,
      );
    }

    return errorOutcome(
      'Solve',
      trig.error ?? 'No symbolic solution was found for x.',
      trig.warnings,
      ['Trig Solve Backend'],
      ['Trig Rewrite'],
      rewriteMatch.candidate.summaryText,
    );
  }

  if (rewriteMatch.candidate.kind === 'split-sum-product') {
    const branchSet = branchPairToSet(
      rewriteMatch.candidate.branchLatex,
      undefined,
      { provenance: 'rewrite-trig-stage' },
    );
    const outcomes = branchSet.equations.map((equationLatex) => {
      const trig = solveTrigEquation({
        equationLatex,
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
    });

    return mergeDisplayOutcomes(
      outcomes,
      ['Trig Sum-Product'],
      rewriteMatch.candidate.summaryText,
    );
  }

  const branchSet = branchPairToSet(
    rewriteMatch.candidate.branchLatex,
    undefined,
    { provenance: 'rewrite-trig-stage' },
  );
  const outcomes = branchSet.equations.map((equationLatex) => {
    const trig = solveTrigEquation({
      equationLatex,
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
  });

  return mergeDisplayOutcomes(
    outcomes,
    ['Trig Rewrite', 'Trig Square Split'],
    rewriteMatch.candidate.summaryText,
  );
}

export { rewriteTrigSolve };
