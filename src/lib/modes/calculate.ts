import { runExpressionAction } from '../math-engine';
import { analyzeLatex, isRelationalOperator } from '../math-analysis';
import { planMathExecution } from '../semantic-planner';
import type {
  AngleUnit,
  CalculateAction,
  DisplayOutcome,
  LimitDirection,
  LimitTargetKind,
  OutputStyle,
  PlannerBadge,
  ResultOrigin,
} from '../../types/calculator';

type RunCalculateModeRequest = {
  action: CalculateAction;
  latex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
};

function actionTitle(action: CalculateAction) {
  switch (action) {
    case 'evaluate':
      return 'Numeric';
    case 'simplify':
      return 'Simplify';
    case 'factor':
      return 'Factor';
    case 'expand':
      return 'Expand';
    default:
      return 'Calculate';
  }
}

function toOutcome(
  title: string,
  exactLatex?: string,
  exactSupplementLatex?: string[],
  approxText?: string,
  warnings: string[] = [],
  error?: string,
  resultOrigin?: ResultOrigin,
): DisplayOutcome {
  if (error) {
    return {
      kind: 'error',
      title,
      error,
      warnings,
      exactLatex,
      exactSupplementLatex,
      approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex,
    exactSupplementLatex,
    approxText,
    warnings,
    resultOrigin,
  };
}

function withPlannerMetadata(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
  plannerBadges: PlannerBadge[] | undefined,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  return {
    ...outcome,
    resolvedInputLatex: resolvedLatex !== originalLatex.trim() ? resolvedLatex : undefined,
    plannerBadges,
  };
}

export function runCalculateMode({
  action,
  latex,
  angleUnit,
  outputStyle,
  ansLatex,
  limitDirection,
  limitTargetKind,
}: RunCalculateModeRequest): DisplayOutcome {
  const title = actionTitle(action);
  const planner = planMathExecution(latex, {
    mode: 'calculate',
    intent:
      action === 'evaluate'
        ? 'calculate-evaluate'
        : action === 'simplify'
          ? 'calculate-simplify'
          : action === 'factor'
            ? 'calculate-factor'
            : 'calculate-expand',
    angleUnit,
    screenHint: 'standard',
  });

  if (planner.kind === 'blocked') {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      latex,
      planner.canonicalLatex,
      planner.badges,
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (analysis.kind === 'equation') {
    return {
      kind: 'prompt',
      title,
      message: 'Use Equation mode to solve this expression.',
      targetMode: 'equation',
      carryLatex: planner.resolvedLatex,
      warnings: [],
    };
  }

  if (isRelationalOperator(analysis.topLevelOperator)) {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: 'Inequalities and ≠ notation are visible in Algebra, but this milestone only evaluates expressions and equations.',
        warnings: [],
      },
      latex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  if (analysis.kind === 'invalid') {
    return withPlannerMetadata(
      {
        kind: 'error',
        title,
        error: 'Expression could not be parsed or evaluated.',
        warnings: [],
      },
      latex,
      planner.resolvedLatex,
      planner.badges,
    );
  }

  const response = runExpressionAction(
    {
      mode: 'calculate',
      document: { latex: planner.resolvedLatex },
      angleUnit,
      outputStyle,
      variables: { Ans: ansLatex },
      calculusOptions: {
        limitDirection,
        limitTargetKind,
      },
    },
    action,
  );

  return withPlannerMetadata(
    toOutcome(
      title,
      response.exactLatex,
      response.exactSupplementLatex,
      response.approxText,
      response.warnings,
      response.error,
      response.resultOrigin,
    ),
    latex,
    planner.resolvedLatex,
    planner.badges,
  );
}
