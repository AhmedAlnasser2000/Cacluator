import type { AngleUnit, ModeId, OutputStyle } from './mode-types';
import type { CalculusDerivativeStrategy, ExecutionIntent } from './execution-types';

export type PlannerBadge =
  | 'Canonicalized'
  | 'Reduced Derivative'
  | 'Reduced Partial'
  | 'Reduced Numeric Operator'
  | 'Compacted Repeated Factors'
  | 'Trig Solve Backend'
  | 'Hard Stop';

export type SolveBadge =
  | 'Reciprocal Rewrite'
  | 'Principal Range'
  | 'Outer Inversion'
  | 'Composition Branch'
  | 'Nested Recursion'
  | 'Periodic Family'
  | 'Parameterized Family'
  | 'Trig Rewrite'
  | 'Trig Square Split'
  | 'Trig Sum-Product'
  | 'Log Combine'
  | 'Log Quotient'
  | 'Log Base Normalize'
  | 'Same-Base Equality'
  | 'LCD Clear'
  | 'Radical Isolation'
  | 'Root Isolation'
  | 'Power Lift'
  | 'Conjugate Transform'
  | 'Symbolic Substitution'
  | 'Inverse Isolation'
  | 'Numeric Interval'
  | 'Candidate Checked'
  | 'Range Guard';

export type TransformBadge =
  | 'Rewrite as Root'
  | 'Rewrite as Power'
  | 'Change Base'
  | 'Combine Fractions'
  | 'Cancel Factors'
  | 'Use LCD'
  | 'Rationalize'
  | 'Conjugate';

export type RealRangeInterval = {
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type RangeProofReason =
  | 'trig-carrier'
  | 'trig-square'
  | 'bounded-product'
  | 'bounded-sum'
  | 'positive-exponential'
  | 'principal-root'
  | 'absolute-value'
  | 'affine-bounded'
  | 'composition-image';

export type RangeImpossibilityResult =
  | { kind: 'none' }
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      badge: 'Range Guard';
      reason: RangeProofReason;
      derivedRange: RealRangeInterval;
      comparedTarget?: string;
    };

export type PlannerStep =
  | { kind: 'canonicalize-token'; before: string; after: string }
  | { kind: 'reduce-derivative'; before: string; after: string }
  | { kind: 'reduce-partial'; before: string; after: string }
  | { kind: 'reduce-numeric-operator'; before: string; after: string }
  | { kind: 'compact-identical-product'; before: string; after: string }
  | { kind: 'normalize-equation'; before: string; after: string }
  | { kind: 'unsupported-node'; nodeKind: string; message: string };

export type PlannerOutcome =
  | {
      kind: 'ready';
      originalLatex: string;
      canonicalLatex: string;
      resolvedLatex: string;
      badges: PlannerBadge[];
      steps: PlannerStep[];
      derivativeStrategies?: CalculusDerivativeStrategy[];
    }
  | {
      kind: 'blocked';
      originalLatex: string;
      canonicalLatex: string;
      badges: ['Hard Stop'];
      steps: PlannerStep[];
      error: string;
    };

export type CanonicalizationContext = {
  mode: ModeId;
  screenHint?: string;
  liveAssist?: boolean;
};

export type PlannerContext = {
  mode: ModeId;
  intent: ExecutionIntent;
  angleUnit: AngleUnit;
  screenHint?: string;
};

export type NumericSolveInterval = {
  start: string;
  end: string;
  subdivisions: number;
};

export type SolveDomainConstraint =
  | { kind: 'interval'; variable: 'x'; min?: number; minInclusive: boolean; max?: number; maxInclusive: boolean }
  | { kind: 'nonzero'; expressionLatex: string }
  | { kind: 'positive'; expressionLatex: string }
  | { kind: 'nonnegative'; expressionLatex: string }
  | { kind: 'expression-interval'; expressionLatex: string; min?: number; minInclusive: boolean; max?: number; maxInclusive: boolean }
  | { kind: 'carrier-range'; carrier: 'sin' | 'cos'; min: -1; max: 1 }
  | { kind: 'carrier-square-range'; carrier: 'sin2' | 'cos2'; min: 0; max: 1 }
  | { kind: 'exp-positive' };

export type CandidateOrigin =
  | 'symbolic-direct'
  | 'symbolic-lcd'
  | 'symbolic-radical'
  | 'symbolic-substitution'
  | 'symbolic-inverse'
  | 'numeric-interval';

export type CandidateValidationResult =
  | { kind: 'accepted'; value: number; residual: number }
  | { kind: 'rejected'; value: number; reason: string };

export type GuardedSolveStage =
  | 'symbolic-direct'
  | 'algebra-rational'
  | 'algebra-radical'
  | 'trig-rewrite'
  | 'symbolic-substitution'
  | 'inverse-isolation'
  | 'numeric-interval'
  | 'blocked';

export type SolveCarrierKind =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'exp'
  | 'power'
  | 'ln'
  | 'log';

export type SubstitutionSolveCandidate =
  | {
      kind: 'polynomial-carrier';
      carrier: SolveCarrierKind;
      carrierLatex: string;
      polynomialCoefficients: number[];
      summaryText: string;
    }
  | {
      kind: 'inverse-isolation';
      carrier: SolveCarrierKind;
      isolatedLatex: string;
      nextEquationLatex: string;
      summaryText: string;
    };

export type SubstitutionSolveDiagnostics = {
  family:
    | 'trig-polynomial'
    | 'exp-polynomial'
    | 'inverse-isolation'
    | 'same-base-equality'
    | 'log-same-base'
    | 'log-quotient'
    | 'log-mixed-base'
    | 'log-mixed-base-rational'
    | 'trig-sum-product';
  carrierKind: SolveCarrierKind;
  polynomialDegree?: 1 | 2;
  branchCount: number;
  filteredBranchCount: number;
};

export type GuardedSolveRequest = {
  originalLatex: string;
  resolvedLatex: string;
  validationLatex?: string;
  compositionInversionDepth?: number;
  periodicReductionDepth?: number;
  radicalTransformDepth?: number;
  repeatedClearingDepth?: number;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
  domainConstraints?: SolveDomainConstraint[];
  exactSupplementLatex?: string[];
  polynomialCarrierHints?: unknown[];
};
