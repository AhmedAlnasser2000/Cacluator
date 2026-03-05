import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../math-engine';
import { solutionsToLatex } from '../format';
import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from '../trigonometry/equation-match';
import { solveTrigEquation } from '../trigonometry/equations';
import { matchTrigEquationRewriteForSolve } from '../trigonometry/rewrite-solve';
import { runNumericIntervalSolve } from './numeric-interval-solve';
import { detectRealRangeImpossibility } from './range-impossibility';
import { matchSubstitutionSolve } from './substitution-solve';
import { equationToZeroFormLatex } from './domain-guards';
import { validateCandidateRoots } from './candidate-validation';
import { normalizeAst } from '../symbolic-engine/normalize';
import { termKey } from '../symbolic-engine/patterns';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../types/calculator';

const MAX_RECURSION_DEPTH = 4;
const UNSUPPORTED_FAMILY_ERROR = 'This equation is outside the supported symbolic solve families for this milestone.';
const ce = new ComputeEngine();

type SolveLike = ReturnType<typeof solveTrigEquation>;

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

function equationStateKey(latex: string) {
  try {
    const zeroFormLatex = equationToZeroFormLatex(latex);
    const zeroFormNode = normalizeAst(ce.parse(zeroFormLatex).json);
    const directKey = termKey(zeroFormNode);
    const negatedKey = termKey(normalizeAst(['Negate', zeroFormNode]));
    return directKey < negatedKey ? directKey : negatedKey;
  } catch {
    return latex.replace(/\\left|\\right/g, '').replace(/\s+/g, '');
  }
}

function isTrigSolveSuccess(outcome: SolveLike) {
  return !outcome.error && Boolean(outcome.exactLatex);
}

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
    const outcomes = rewriteMatch.candidate.branchLatex.map((equationLatex) => {
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

  const outcomes = rewriteMatch.candidate.branchLatex.map((equationLatex) => {
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

function substitutionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
): DisplayOutcome | null {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= MAX_RECURSION_DEPTH) {
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

  return successOutcome(
    'Solve',
    solutionsToLatex('x', acceptedLatex),
    `x ~= ${validation.accepted.map((value) => {
      const rounded = Number(value.toFixed(12));
      return `${rounded}`.replace(/0+$/, '').replace(/\.$/, '');
    }).join(', ')}`,
    merged.warnings,
    merged.plannerBadges ?? [],
    dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
    merged.solveSummaryText,
    validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitution.diagnostics,
    merged.numericMethod,
  );
}

function numericIntervalSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  if (!request.numericInterval) {
    return null;
  }

  const numeric = runNumericIntervalSolve(request.resolvedLatex, request.numericInterval);
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

export function runGuardedEquationSolve(
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

  const substituted = substitutionSolve(request, depth, trail);
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
