import type {
  SolveDomainConstraint,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';

export type SubstitutionSolveResult =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | {
      kind: 'branches';
      equations: string[];
      solveBadges: SolveBadge[];
      solveSummaryText: string;
      domainConstraints?: SolveDomainConstraint[];
      diagnostics?: SubstitutionSolveDiagnostics;
    };

export type TrigCarrier = {
  kind: 'sin' | 'cos' | 'tan';
  argument: unknown;
  argumentLatex: string;
};

export type ExpCarrier = {
  kind: 'exp' | 'power';
  baseNode: unknown;
  baseLatex: string;
};

export type InverseCarrier =
  | { kind: 'ln'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'log'; inner: unknown; innerLatex: string; carrierLatex: string; baseLatex: string; baseNumeric: number }
  | { kind: 'exp'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'power'; inner: unknown; innerLatex: string; carrierLatex: string; baseLatex: string };

export type LogCallKind = 'ln' | 'log';

export type LogCall = {
  kind: LogCallKind;
  inner: unknown;
  innerLatex: string;
  baseNode: unknown;
  baseLatex: string;
  baseNumeric: number;
  carrierLatex: string;
};

export type LogCallMatch =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'matched'; call: LogCall };

export type LogCombineCarrier = {
  family: 'same-base' | 'mixed-base';
  left: LogCall;
  right: LogCall;
  carrierLatex: string;
};

export type LogCombineCarrierMatch =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'carrier'; carrier: LogCombineCarrier };

export type LinearLogCombineParseResult =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'linear'; carrier: LogCombineCarrier; coefficient: number; constant: number };
