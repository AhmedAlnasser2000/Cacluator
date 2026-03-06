import type { TrigRewriteSolveCandidate } from '../../../types/calculator';

export type TrigRewriteMatchResult =
  | { kind: 'none' }
  | { kind: 'candidate'; candidate: TrigRewriteSolveCandidate }
  | { kind: 'blocked'; error: string }
  | { kind: 'recognized-unresolved'; error: string; summaryText: string };

export type ProductTemplateMatch = {
  coefficient: 1 | 2;
  doubledArgumentLatex: string;
};

export type ScaledSquareMatch = {
  kind: 'sin' | 'cos';
  coefficient: number;
  argumentLatex: string;
};

export type SignedTrigTermMatch = {
  sign: 1 | -1;
  trig: {
    kind: 'sin' | 'cos';
    argument: unknown;
    argumentLatex: string;
  };
};

export type TwoTermTrigFamilyMatch = {
  kind: 'sin' | 'cos';
  firstArgument: unknown;
  secondArgument: unknown;
  firstArgumentLatex: string;
  secondArgumentLatex: string;
  firstSign: 1 | -1;
  secondSign: 1 | -1;
};
