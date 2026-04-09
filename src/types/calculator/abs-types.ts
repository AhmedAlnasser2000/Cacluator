import type { SolveDomainConstraint } from './solver-types';

export type AbsoluteValueEquationFamilyKind =
  | 'abs-equals-constant'
  | 'abs-equals-expression'
  | 'abs-equals-abs';

export type AbsoluteValueTargetDescriptor = {
  targetNode: unknown;
  base: unknown;
};

export type AbsoluteValueEquationFamily = {
  kind: AbsoluteValueEquationFamilyKind;
  variable: string;
  target: AbsoluteValueTargetDescriptor;
  comparisonNode: unknown;
  comparisonTarget?: AbsoluteValueTargetDescriptor;
  branchEquations: string[];
  branchConstraints: SolveDomainConstraint[];
};

export type AbsoluteValueNormalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  exactSupplementLatex: string[];
};
