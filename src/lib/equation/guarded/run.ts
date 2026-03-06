import { runExpressionAction } from '../../math-engine';
import { detectRealRangeImpossibility } from '../range-impossibility';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
  successOutcome,
} from './outcome';
import { equationStateKey } from './state-key';
import { directTrigSolve } from './direct-trig-stage';
import { rewriteTrigSolve } from './rewrite-trig-stage';
import { substitutionSolve } from './substitution-stage';
import { numericIntervalSolve } from './numeric-stage';

const MAX_RECURSION_DEPTH = 4;

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
): DisplayOutcome {
  const stateKey = equationStateKey(request.resolvedLatex);
  if (trail.has(stateKey)) {
    return errorOutcome(
      'Solve',
      'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
    );
  }
  trail.add(stateKey);

  const symbolic = runExpressionAction(
    {
      mode: 'equation',
      document: { latex: request.resolvedLatex },
      angleUnit: request.angleUnit,
      outputStyle: request.outputStyle,
      variables: { Ans: request.ansLatex },
    },
    'solve',
  );

  if (!symbolic.error && symbolic.exactLatex) {
    return successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    );
  }

  const rangeImpossibility = detectRealRangeImpossibility(request.resolvedLatex);
  if (rangeImpossibility.kind === 'impossible') {
    return errorOutcome(
      'Solve',
      rangeImpossibility.error,
      symbolic.warnings,
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    );
  }

  const directTrig = directTrigSolve(request);
  if (directTrig) {
    return directTrig;
  }

  const rewriteTrig = rewriteTrigSolve(request);
  if (rewriteTrig?.kind === 'success') {
    return rewriteTrig;
  }
  if (rewriteTrig?.kind === 'error') {
    return rewriteTrig;
  }

  const substituted = substitutionSolve(
    request,
    depth,
    trail,
    MAX_RECURSION_DEPTH,
    runGuardedEquationSolve,
  );
  if (substituted?.kind === 'success') {
    return substituted;
  }
  if (substituted?.kind === 'error') {
    return substituted;
  }

  const numeric = numericIntervalSolve(request);
  if (numeric) {
    return numeric;
  }

  return errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  );
}

export { runGuardedEquationSolve };
