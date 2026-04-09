export type RuntimeProfileId = 'default';

export type EquationExecutionBudget = {
  maxRecursionDepth: number;
  maxCompositionInversionDepth: number;
  maxPeriodicReductionDepth: number;
  maxRadicalTransformSteps: number;
};

export type ExpressionExecutionBudget = {
  allowEvaluateRealNumericFallback: boolean;
  allowSymbolicNormalizationNumericFallback: boolean;
  allowInternalSolveNumericFallback: boolean;
};

export type RuntimeExecutionBudget = {
  equation: EquationExecutionBudget;
  expression: ExpressionExecutionBudget;
};

export type RuntimeExecutionProfile = {
  id: RuntimeProfileId;
  label: string;
  budget: RuntimeExecutionBudget;
};
