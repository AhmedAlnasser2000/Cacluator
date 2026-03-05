import type {
  AngleUnit,
  DisplayOutcome,
  DisplayOutcomeAction,
  TrigIdentityState,
  TrigParseResult,
  TrigRequest,
  TrigScreen,
} from '../../types/calculator';
import { canonicalizeMathInput } from '../input-canonicalization';
import { planMathExecution } from '../semantic-planner';
import { runSharedEquationSolve } from '../equation/shared-solve';
import { convertAngleState, type TrigEvaluation } from './angles';
import { evaluateTrigFunction } from './functions';
import { evaluateTrigIdentity } from './identities';
import { parseTrigDraft } from './parser';
import { solveCosineRule, solveRightTriangle, solveSineRule } from './triangles';

function toOutcome(
  title: string,
  evaluation: TrigEvaluation,
): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
  };
}

function withCanonicalMetadata(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  return {
    ...outcome,
    resolvedInputLatex: resolvedLatex !== originalLatex.trim() ? resolvedLatex : undefined,
    plannerBadges: resolvedLatex !== originalLatex.trim() ? ['Canonicalized'] : outcome.plannerBadges,
  };
}

function requestTitle(request: TrigRequest, screenHint?: TrigScreen) {
  switch (request.kind) {
    case 'function':
      return screenHint === 'specialAngles' ? 'Special Angles' : 'Trig Functions';
    case 'identitySimplify':
      return 'Identity Simplify';
    case 'identityConvert':
      return 'Identity Convert';
    case 'equationSolve':
      return 'Trig Equation';
    case 'rightTriangle':
      return 'Right Triangle';
    case 'sineRule':
      return 'Sine Rule';
    case 'cosineRule':
      return 'Cosine Rule';
    case 'angleConvert':
      return 'Angle Convert';
  }
}

function runTrigRequest(
  request: TrigRequest,
  angleUnit: AngleUnit,
  screenHint?: TrigScreen,
): DisplayOutcome {
  const title = requestTitle(request, screenHint);

  switch (request.kind) {
    case 'function':
      return toOutcome(title, evaluateTrigFunction(request.expressionLatex, angleUnit));
    case 'identitySimplify':
      return toOutcome(title, evaluateTrigIdentity({
        expressionLatex: request.expressionLatex,
        targetForm: 'simplified',
      }));
    case 'identityConvert':
      return toOutcome(title, evaluateTrigIdentity({
        expressionLatex: request.expressionLatex,
        targetForm: request.targetForm,
      }));
    case 'equationSolve': {
      const planner = planMathExecution(request.equationLatex, {
        mode: 'trigonometry',
        intent: 'equation-solve',
        angleUnit,
        screenHint: 'equationSolve',
      });

      if (planner.kind === 'blocked') {
        return {
          kind: 'error',
          title,
          error: planner.error,
          warnings: [],
          resolvedInputLatex: planner.canonicalLatex,
          plannerBadges: planner.badges,
        };
      }

      const outcome = runSharedEquationSolve({
        originalLatex: request.equationLatex,
        resolvedLatex: planner.resolvedLatex,
        angleUnit,
        outputStyle: 'both',
        ansLatex: '',
      });

      if (outcome.kind === 'prompt') {
        return outcome;
      }

      const shouldOfferEquationHandoff =
        outcome.kind === 'error'
        && !(outcome.solveBadges ?? []).includes('Range Guard')
        && !outcome.exactLatex
        && (outcome.error.includes('outside the supported symbolic solve families')
          || outcome.error.includes('outside the current exact bounded solve set')
          || outcome.error.includes('recognized mixed-base log family')
          || outcome.error.includes('recognized trig sum-to-product family')
          || outcome.error.includes('No symbolic solution')
          || outcome.error.includes('No bracketed real roots')
          || outcome.error.includes('No bracketed or near-zero real roots')
          || outcome.error.includes('Candidate roots were found but rejected'));
      const actions: DisplayOutcomeAction[] | undefined = shouldOfferEquationHandoff
        ? [{ kind: 'send', target: 'equation', latex: request.equationLatex }]
        : outcome.actions;

      return {
        ...outcome,
        title,
        actions,
        resolvedInputLatex: planner.resolvedLatex !== request.equationLatex.trim()
          ? planner.resolvedLatex
          : outcome.resolvedInputLatex,
        plannerBadges: [
          ...(planner.badges ?? []),
          ...((outcome.plannerBadges ?? []).filter((badge) => !(planner.badges ?? []).includes(badge))),
        ],
      };
    }
    case 'rightTriangle':
      return toOutcome(title, solveRightTriangle({
        knownSideA: request.knownSideA ?? '',
        knownSideB: request.knownSideB ?? '',
        knownSideC: request.knownSideC ?? '',
        knownAngleA: request.knownAngleA ?? '',
        knownAngleB: request.knownAngleB ?? '',
      }));
    case 'sineRule':
      return toOutcome(title, solveSineRule({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      }));
    case 'cosineRule':
      return toOutcome(title, solveCosineRule({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      }));
    case 'angleConvert':
      return toOutcome(title, convertAngleState({
        value: request.valueLatex,
        from: request.from,
        to: request.to,
      }));
  }
}

function parseFailureToOutcome(parsed: Extract<TrigParseResult, { ok: false }>): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Trigonometry',
    error: parsed.error,
    warnings: [],
  };
}

export function runTrigonometryCoreDraft(
  rawLatex: string,
  options: {
    screenHint?: TrigScreen;
    angleUnit: AngleUnit;
    identityTargetForm?: TrigIdentityState['targetForm'];
  },
) {
  const canonicalized = canonicalizeMathInput(rawLatex, {
    mode: 'trigonometry',
    screenHint: options.screenHint,
  });
  const source = canonicalized.ok ? canonicalized.canonicalLatex : rawLatex;
  const parsed = parseTrigDraft(source, options);
  if (!parsed.ok) {
    return {
      outcome: withCanonicalMetadata(parseFailureToOutcome(parsed), rawLatex, source),
      parsed,
    };
  }

  return {
    outcome: withCanonicalMetadata(runTrigRequest(parsed.request, options.angleUnit, options.screenHint), rawLatex, source),
    parsed,
  };
}
