import type {
  CalculateAction,
  EquationAction,
  EquationExecutionBudget,
  ExpressionExecutionBudget,
  RuntimeExecutionProfile,
} from '../../types/calculator';
import type { KernelRuntimeHostId } from './runtime-hosts';

type ExpressionRuntimeAction = CalculateAction | EquationAction;
type ExpressionNumericFallbackUsage =
  | 'evaluate-real-family'
  | 'symbolic-normalization-recovery';

const DEFAULT_RUNTIME_EXECUTION_PROFILE: RuntimeExecutionProfile = {
  id: 'default',
  label: 'Default Runtime Profile',
  budget: {
    equation: {
      maxRecursionDepth: 4,
      maxCompositionInversionDepth: 2,
      maxPeriodicReductionDepth: 2,
      maxRadicalTransformSteps: 2,
    },
    expression: {
      allowEvaluateRealNumericFallback: true,
      allowSymbolicNormalizationNumericFallback: true,
      allowInternalSolveNumericFallback: false,
    },
  },
};

export function getDefaultRuntimeExecutionProfile(): RuntimeExecutionProfile {
  return DEFAULT_RUNTIME_EXECUTION_PROFILE;
}

export function resolveRuntimeExecutionProfile(
  hostId: KernelRuntimeHostId,
): RuntimeExecutionProfile {
  switch (hostId) {
    case 'expression-runtime':
    case 'equation-runtime':
    case 'table-runtime':
      return DEFAULT_RUNTIME_EXECUTION_PROFILE;
    default:
      return DEFAULT_RUNTIME_EXECUTION_PROFILE;
  }
}

export function getEquationExecutionBudget(
  hostId: KernelRuntimeHostId = 'equation-runtime',
): EquationExecutionBudget {
  return resolveRuntimeExecutionProfile(hostId).budget.equation;
}

export function getExpressionExecutionBudget(
  hostId: KernelRuntimeHostId = 'expression-runtime',
): ExpressionExecutionBudget {
  return resolveRuntimeExecutionProfile(hostId).budget.expression;
}

export function canUseExpressionNumericFallback(
  budget: ExpressionExecutionBudget,
  action: ExpressionRuntimeAction,
  usage: ExpressionNumericFallbackUsage,
): boolean {
  if (action === 'solve') {
    return budget.allowInternalSolveNumericFallback;
  }

  if (usage === 'evaluate-real-family') {
    return action === 'evaluate' && budget.allowEvaluateRealNumericFallback;
  }

  return action !== 'evaluate' && budget.allowSymbolicNormalizationNumericFallback;
}
