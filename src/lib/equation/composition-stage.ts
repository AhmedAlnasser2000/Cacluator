import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber, formatNumber, solutionsToLatex } from '../format';
import { evaluateRealNumericExpression } from '../real-numeric-eval';
import {
  formatRangeInterval,
  proveRealRange,
} from './range-impossibility';
import { dedupeNumericRoots } from './candidate-validation';
import {
  checkCandidateAgainstConstraints,
  equationToZeroFormLatex,
  readNumericNode,
} from './domain-guards';
import { dedupe, extractApproxSolutions, extractExactSolutions, mergeDisplayOutcomes } from './guarded/merge';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './guarded/outcome';
import { equationStateKey } from './guarded/state-key';
import { convertAngle, evaluateSpecialTrig, formatDegreesAsUnitLatex } from '../trigonometry/angles';
import { buildTrigPeriodicTemplate, type TrigPeriodicBranch } from '../trigonometry/equations';
import { dependsOnVariable, isNodeArray } from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import { matchAffineVariableArgument } from '../trigonometry/normalize';
import type {
  AngleUnit,
  CandidateValidationResult,
  DisplayDetailSection,
  DisplayOutcome,
  GuardedSolveRequest,
  PeriodicFamilyInfo,
  PeriodicPiecewiseBranch,
  PeriodicFamilyRepresentative,
  PeriodicIntervalSuggestion,
  SolveBadge,
  SolveDomainConstraint,
} from '../../types/calculator';

const ce = new ComputeEngine();
const EPSILON = 1e-9;
const RESIDUAL_TOLERANCE = 1e-6;
const MAX_TRIG_BRANCHES = 12;
const MAX_COMPOSITION_INVERSION_DEPTH = 2;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

type NumericTarget = {
  node: unknown;
  latex: string;
  value: number;
};

type NonPeriodicTransform = {
  equations: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  unresolvedError: string;
  exactSupplementLatex?: string[];
  detailSections?: DisplayDetailSection[];
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>;
};

type TrigBranchResult =
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'branches';
      equations: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'unresolved';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    };

type SymbolicFamilyBranch = {
  node: unknown;
  latex: string;
  representativeValue: number;
};

type PeriodicFamilySolveResult =
  | {
      kind: 'solved';
      family: PeriodicFamilyInfo;
      domainConstraints?: SolveDomainConstraint[];
      supplementLatex?: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'guided';
      family: PeriodicFamilyInfo;
      error: string;
      domainConstraints?: SolveDomainConstraint[];
      supplementLatex?: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    };

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function mergeConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

function buildConstraintSupplementLatex(constraints: SolveDomainConstraint[] = []) {
  const supported = constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'positive':
        return [`${constraint.expressionLatex}>0`];
      case 'nonnegative':
        return [`${constraint.expressionLatex}\\ge0`];
      default:
        return [];
    }
  });

  if (supported.length === 0) {
    return [] as string[];
  }

  return [`\\text{Conditions: } ${supported.join(',\\;')}`];
}

function appendSolveMetadata(
  outcome: DisplayOutcome,
  badges: SolveBadge[],
  summary: string,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  return {
    ...outcome,
    solveBadges: dedupe([...(outcome.solveBadges ?? []), ...badges]),
    solveSummaryText: outcome.solveSummaryText
      ? `${summary}; ${outcome.solveSummaryText}`
      : summary,
  };
}

function withNestedRecursionBadges(badges: SolveBadge[] = []) {
  return dedupe<SolveBadge>([...badges, 'Nested Recursion']);
}

function compositionDepthLimitError(
  badges: SolveBadge[],
  summaryText: string,
) {
  return errorOutcome(
    'Solve',
    'This recognized composition family exceeds the current bounded two-step outer-inversion limit. Use Numeric Solve with a chosen interval in Equation mode.',
    [],
    [],
    withNestedRecursionBadges(badges),
    summaryText,
  );
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function rewriteDirectTrigAngles(node: unknown, angleUnit: AngleUnit): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}

function evaluateResidualAt(
  equationLatex: string,
  value: number,
  angleUnit: AngleUnit,
) {
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const expr = ce.parse(zeroFormLatex);
  const substituted = expr.subs({ x: value });
  const rewrittenJson = rewriteDirectTrigAngles(substituted.json, angleUnit);
  const rewrittenLatex = boxLatex(rewrittenJson);
  const numeric = evaluateRealNumericExpression(rewrittenJson, rewrittenLatex);
  if (numeric.kind === 'success') {
    return numeric.value;
  }

  const evaluated = ce.box(rewrittenJson as Parameters<typeof ce.box>[0]).evaluate();
  const fallback = evaluated.N?.() ?? evaluated;
  return readNumericNode(fallback.json);
}

function validateCompositionCandidates(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
) {
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];

  for (const candidate of dedupeNumericRoots(candidates)) {
    const violation = checkCandidateAgainstConstraints(candidate, constraints, angleUnit);
    if (violation) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: violation,
      });
      continue;
    }

    const residual = evaluateResidualAt(equationLatex, candidate, angleUnit);
    if (residual === null) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'produces an undefined or non-real substitution',
      });
      continue;
    }

    if (Math.abs(residual) > RESIDUAL_TOLERANCE) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'does not satisfy the original equation after substitution',
      });
      continue;
    }

    accepted.push(candidate);
  }

  return {
    accepted: dedupeNumericRoots(accepted),
    rejected,
  };
}

function compositionRejectionMessage(rejected: CandidateValidationResult[], constraints: SolveDomainConstraint[]) {
  const rejectedReasons = rejected.flatMap((entry) =>
    entry.kind === 'rejected' ? [entry.reason.toLowerCase()] : []);

  if (rejectedReasons.some((reason) => reason.includes('undefined or non-real substitution'))) {
    return 'Candidate roots were found but rejected because the original composite expression becomes undefined in the real domain.';
  }

  if (
    rejectedReasons.some((reason) =>
      reason.includes('denominator zero')
      || reason.includes('non-positive')
      || reason.includes('even root negative')
      || reason.includes('outside the permitted interval')
      || reason.includes('must stay positive'))
  ) {
    return 'Candidate roots were found but rejected after applying preserved domain conditions to the original composite equation.';
  }

  if (constraints.length > 0) {
    return 'Candidate roots were found but rejected after applying preserved domain conditions to the original composite equation.';
  }

  return 'Candidate roots were found but rejected after substitution back into the original composite equation.';
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function parseFiniteNumericValue(latex: string): number | null {
  const normalized = latex.trim();
  if (/\^\{\\circ\}$/.test(normalized)) {
    const degreeText = normalized.replace(/\^\{\\circ\}$/, '');
    const degreeValue = Number(degreeText);
    return Number.isFinite(degreeValue) ? degreeValue : null;
  }

  try {
    const numeric = ce.parse(normalized).N?.().json;
    const parsed = readNumericNode(numeric);
    if (parsed !== null) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function matchAcceptedExactSolutions(exactLatex: string | undefined, accepted: number[]) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);

  if (exactCandidates.length === 0) {
    return [] as string[];
  }

  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = exactCandidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= 1e-6);
    if (candidateIndex < 0) {
      return [] as string[];
    }
    used.add(candidateIndex);
    matched.push(exactCandidates[candidateIndex].latex);
  }

  return matched;
}

function collectOutcomeCandidates(outcome: DisplayOutcome) {
  if (outcome.kind === 'prompt') {
    return [] as number[];
  }

  const exact = dedupe(extractExactSolutions(outcome.exactLatex))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
  if (exact.length > 0) {
    return exact;
  }

  if (outcome.kind === 'success' && outcome.candidateValues && outcome.candidateValues.length > 0) {
    return dedupeNumericRoots(outcome.candidateValues);
  }

  return dedupe(extractApproxSolutions(outcome.approxText))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
}

function parseNumericTarget(node: unknown): NumericTarget | null {
  const normalized = normalizeAst(node);
  try {
    const numeric = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.().json;
    const value = readNumericNode(numeric);
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return {
      node: normalized,
      latex: boxLatex(normalized),
      value,
    };
  } catch {
    return null;
  }
}

function evaluateRealNode(node: unknown) {
  try {
    const boxed = ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).evaluate();
    const numeric = boxed.N?.() ?? boxed;
    return readNumericNode(numeric.json) ?? readNumericNode(boxed.json);
  } catch {
    return null;
  }
}

function readExactScalar(node: unknown): { numerator: number; denominator: number } | null {
  if (typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && Number.isInteger(node[1])
    && Number.isInteger(node[2])
    && node[2] !== 0
  ) {
    const sign = node[2] < 0 ? -1 : 1;
    return {
      numerator: sign * node[1],
      denominator: Math.abs(node[2]),
    };
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child: { numerator: number; denominator: number } | null = readExactScalar(node[1]);
    return child ? { numerator: -child.numerator, denominator: child.denominator } : null;
  }

  return null;
}

function buildScalarNode(numerator: number, denominator = 1): unknown {
  if (denominator === 1) {
    return numerator;
  }

  return ['Rational', numerator, denominator];
}

function buildEquationLatex(left: unknown, right: unknown) {
  return `${boxLatex(left)}=${boxLatex(right)}`;
}

function periodicFamilyToExactLatex(family: PeriodicFamilyInfo) {
  return family.branchesLatex.length === 1
    ? `${family.carrierLatex}=${family.branchesLatex[0]}`
    : `${family.carrierLatex}\\in\\left\\{${family.branchesLatex.join(', ')}\\right\\}`;
}

function periodicFamilyParameterSupplement(family: PeriodicFamilyInfo) {
  return `\\text{Parameter: } ${family.parameterLatex}`;
}

function periodicFamilyConstraintSupplements(family: PeriodicFamilyInfo) {
  if (!family.parameterConstraintLatex || family.parameterConstraintLatex.length === 0) {
    return [] as string[];
  }

  return [`\\text{Parameter constraints: } ${family.parameterConstraintLatex.join(',\\;')}`];
}

function buildPeriodicBranchConditionSupplement(branchLatex: string[]) {
  if (branchLatex.length === 0) {
    return [] as string[];
  }

  return [`\\text{Branch conditions: } ${branchLatex.join(',\\;')}`];
}

function formatBranchConstant(value: number, angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return formatDegreesAsUnitLatex(convertAngle(value, 'rad', 'deg'), 'rad');
  }

  return formatNumber(value, 12);
}

function formatAngleUnitValueText(value: number, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return `${formatNumber(value)} deg`;
  }
  if (angleUnit === 'grad') {
    return `${formatNumber(value)} grad`;
  }
  return `${formatNumber(value)} rad`;
}

function inverseTrigPrincipalRange(kind: 'asin' | 'acos' | 'atan', angleUnit: AngleUnit) {
  if (kind === 'acos') {
    return {
      min: 0,
      max: convertAngle(180, 'deg', angleUnit),
      minInclusive: true,
      maxInclusive: true,
    };
  }

  return {
    min: convertAngle(-90, 'deg', angleUnit),
    max: convertAngle(90, 'deg', angleUnit),
    minInclusive: kind === 'asin',
    maxInclusive: kind === 'asin',
  };
}

function isWithinPrincipalRange(
  value: number,
  range: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
) {
  const minCheck = range.minInclusive ? value >= range.min - EPSILON : value > range.min + EPSILON;
  const maxCheck = range.maxInclusive ? value <= range.max + EPSILON : value < range.max - EPSILON;
  return minCheck && maxCheck;
}

function buildInverseTrigPrincipalRangeMessage(
  kind: 'asin' | 'acos' | 'atan',
  angleUnit: AngleUnit,
) {
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const opener = range.minInclusive ? '[' : '(';
  const closer = range.maxInclusive ? ']' : ')';
  return `${opener}${formatAngleUnitValueText(range.min, angleUnit)}, ${formatAngleUnitValueText(range.max, angleUnit)}${closer}`;
}

function formatAngleUnitValueLatex(value: number, angleUnit: AngleUnit) {
  return formatDegreesAsUnitLatex(convertAngle(value, angleUnit, 'deg'), angleUnit);
}

function buildInverseTrigPrincipalRangeLatex(
  kind: 'asin' | 'acos' | 'atan',
  angleUnit: AngleUnit,
) {
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const opener = range.minInclusive ? '\\left[' : '\\left(';
  const closer = range.maxInclusive ? '\\right]' : '\\right)';
  return `${opener}${formatAngleUnitValueLatex(range.min, angleUnit)}, ${formatAngleUnitValueLatex(range.max, angleUnit)}${closer}`;
}

function intervalWithinPrincipalRange(
  interval: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
  principalRange: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
) {
  const minOkay = principalRange.minInclusive
    ? interval.min >= principalRange.min - EPSILON
    : interval.min > principalRange.min + EPSILON;
  const maxOkay = principalRange.maxInclusive
    ? interval.max <= principalRange.max + EPSILON
    : interval.max < principalRange.max - EPSILON;
  return minOkay && maxOkay;
}

function mergeDetailSections(
  left: DisplayDetailSection[] = [],
  right: DisplayDetailSection[] = [],
) {
  const encoded = dedupe([...left, ...right].map((section) => JSON.stringify(section)));
  return encoded.map((entry) => JSON.parse(entry));
}

function mergePeriodicFamilyExtras(
  family: PeriodicFamilyInfo | undefined,
  extras: Partial<PeriodicFamilyInfo> | undefined,
) {
  if (!family || !extras) {
    return family;
  }

  return {
    ...family,
    piecewiseBranches: dedupe(
      [...(family.piecewiseBranches ?? []), ...(extras.piecewiseBranches ?? [])]
        .map((entry) => JSON.stringify(entry)),
    ).map((entry) => JSON.parse(entry)),
    principalRangeLatex: extras.principalRangeLatex ?? family.principalRangeLatex,
    reducedCarrierLatex: extras.reducedCarrierLatex ?? family.reducedCarrierLatex,
    structuredStopReason: extras.structuredStopReason ?? family.structuredStopReason,
  } satisfies PeriodicFamilyInfo;
}

function buildNumericTargetFromNode(node: unknown, fallbackValue?: number): NumericTarget | null {
  const normalized = normalizeAst(node);
  const parsed = parseNumericTarget(normalized);
  if (parsed) {
    return parsed;
  }

  if (fallbackValue === undefined || !Number.isFinite(fallbackValue)) {
    return null;
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    value: fallbackValue,
  };
}

function buildInverseTrigValueTarget(
  kind: 'sin' | 'cos' | 'tan',
  target: NumericTarget,
  angleUnit: AngleUnit,
) {
  const degrees = convertAngle(target.value, angleUnit, 'deg');
  const exactLatex = evaluateSpecialTrig(kind, degrees);
  if (exactLatex && exactLatex !== '\\text{undefined}') {
    return buildNumericTargetFromNode(ce.parse(exactLatex).json);
  }

  const radians = convertAngle(target.value, angleUnit, 'rad');
  const value =
    kind === 'sin'
      ? Math.sin(radians)
      : kind === 'cos'
        ? Math.cos(radians)
        : Math.tan(radians);

  return {
    node: value,
    latex: formatNumber(value, 12),
    value,
  } satisfies NumericTarget;
}

function buildSymbolicFamilyBranch(branch: TrigPeriodicBranch): SymbolicFamilyBranch {
  const node = normalizeAst(ce.parse(branch.latex).json);
  return {
    node,
    latex: boxLatex(node),
    representativeValue: branch.representativeValue,
  };
}

function buildSymbolicFamilyBranchFromNode(node: unknown, representativeValue?: number): SymbolicFamilyBranch {
  const normalized = normalizeAst(node);
  return {
    node: normalized,
    latex: boxLatex(normalized),
    representativeValue:
      representativeValue
      ?? evaluateRealNode(normalized)
      ?? Number.NaN,
  };
}

function dedupeSymbolicFamilyBranches(branches: SymbolicFamilyBranch[]) {
  const seen = new Set<string>();
  return branches.filter((branch) => {
    if (seen.has(branch.latex)) {
      return false;
    }
    seen.add(branch.latex);
    return true;
  });
}

function substituteFamilyBranchLatex(latex: string, kValue: number) {
  const expression = ce.parse(latex).subs({ k: kValue });
  if (/\\arc(?:sin|cos|tan)/.test(latex)) {
    return expression.latex;
  }
  return expression.simplify().latex;
}

function evaluateFamilyBranchAt(branch: SymbolicFamilyBranch, kValue: number) {
  try {
    const substituted = ce.box(branch.node as Parameters<typeof ce.box>[0]).subs({ k: kValue });
    const numeric = evaluateRealNumericExpression(substituted.json, substituted.latex);
    if (numeric.kind === 'success') {
      return numeric.value;
    }
    const fallback = substituted.N?.() ?? substituted;
    return readNumericNode(fallback.json);
  } catch {
    return null;
  }
}

function branchDependsOnParameter(branch: SymbolicFamilyBranch) {
  return dependsOnVariable(branch.node, 'k');
}

function enumerateParameterizedBranchValuesOnInterval(
  branch: SymbolicFamilyBranch,
  intervalMin: number,
  intervalMax: number,
) {
  const atZero = evaluateFamilyBranchAt(branch, 0);
  const atOne = evaluateFamilyBranchAt(branch, 1);
  if (atZero === null || atOne === null || !Number.isFinite(atZero) || !Number.isFinite(atOne)) {
    return null;
  }

  const step = atOne - atZero;
  if (Math.abs(step) <= EPSILON) {
    return atZero >= intervalMin - EPSILON && atZero <= intervalMax + EPSILON
      ? [0]
      : [];
  }

  const rawStart = (intervalMin - atZero) / step;
  const rawEnd = (intervalMax - atZero) / step;
  const startK = Math.ceil(Math.min(rawStart, rawEnd) - EPSILON);
  const endK = Math.floor(Math.max(rawStart, rawEnd) + EPSILON);
  if (endK < startK) {
    return [];
  }

  if (endK - startK + 1 > MAX_TRIG_BRANCHES) {
    return null;
  }

  const values: number[] = [];
  for (let k = startK; k <= endK; k += 1) {
    values.push(k);
  }
  return values;
}

function expandBranchesWithinInterval(
  branches: SymbolicFamilyBranch[],
  intervalMin: number,
  intervalMax: number,
) {
  const expanded: SymbolicFamilyBranch[] = [];

  for (const branch of branches) {
    if (!branchDependsOnParameter(branch)) {
      const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
      continue;
    }

    const parameterValues = enumerateParameterizedBranchValuesOnInterval(branch, intervalMin, intervalMax);
    if (parameterValues === null) {
      return null;
    }

    for (const kValue of parameterValues) {
      const latex = substituteFamilyBranchLatex(branch.latex, kValue);
      const node = ce.parse(latex).json;
      const target = buildNumericTargetFromNode(node, evaluateFamilyBranchAt(branch, kValue) ?? undefined);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
    }
  }

  return dedupeSymbolicFamilyBranches(expanded);
}

function appendPeriodicSolveBadges(
  result: PeriodicFamilySolveResult,
  badges: SolveBadge[],
): PeriodicFamilySolveResult {
  return {
    ...result,
    solveBadges: dedupe<SolveBadge>([...(result.solveBadges ?? []), ...badges]),
  };
}

function numericAffineCarrier(node: unknown) {
  if (isBareVariable(node)) {
    return {
      coefficient: 1,
      offsetNode: 0 as unknown,
      offsetValue: 0,
    };
  }

  const affine = matchAffineVariableArgument(node);
  if (!affine) {
    return null;
  }

  const offsetValue = evaluateRealNode(affine.offsetNode);
  if (offsetValue === null) {
    return null;
  }

  return {
    coefficient: affine.coefficient,
    offsetNode: affine.offsetNode,
    offsetValue,
  };
}

function transformAffineBranches(
  carrier: ReturnType<typeof numericAffineCarrier>,
  branches: SymbolicFamilyBranch[],
): SymbolicFamilyBranch[] {
  if (!carrier) {
    return [];
  }

  return branches.map((branch) => {
    const node = carrier.coefficient === 1 && carrier.offsetValue === 0
      ? branch.node
      : normalizeAst(['Divide', ['Subtract', branch.node, carrier.offsetNode], carrier.coefficient]);
    return {
      node,
      latex: boxLatex(node),
      representativeValue: (branch.representativeValue - carrier.offsetValue) / carrier.coefficient,
    };
  });
}

function matchParameterizedPowerCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const exponent = readExactScalar(normalized[2]);
  if (
    !exponent
    || exponent.denominator !== 1
    || exponent.numerator < 2
    || exponent.numerator > 6
  ) {
    return null;
  }

  const affineBase = numericAffineCarrier(normalized[1]);
  if (!affineBase || !dependsOnVariable(normalized[1], 'x')) {
    return null;
  }

  return {
    degree: exponent.numerator,
    baseNode: normalized[1],
    affineBase,
  };
}

function buildNthRootNode(node: unknown, degree: number) {
  if (degree === 2) {
    return normalizeAst(['Sqrt', node]);
  }

  return normalizeAst(['Root', node, degree]);
}

function nthRootRepresentativeValue(value: number, degree: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (degree % 2 === 0) {
    if (value < 0) {
      return Number.NaN;
    }
    return Math.pow(value, 1 / degree);
  }

  return Math.sign(value) * Math.pow(Math.abs(value), 1 / degree);
}

function buildParameterizedPowerBranches(
  carrier: NonNullable<ReturnType<typeof matchParameterizedPowerCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  const transformedBranches: SymbolicFamilyBranch[] = [];
  const parameterConstraints: string[] = [];

  for (const branch of branches) {
    const constantTarget = parseNumericTarget(branch.node);
    if (carrier.degree % 2 === 0 && constantTarget && constantTarget.value < -EPSILON) {
      continue;
    }

    const rootNode = buildNthRootNode(branch.node, carrier.degree);
    const rootRepresentative = nthRootRepresentativeValue(branch.representativeValue, carrier.degree);
    const rootBranch: SymbolicFamilyBranch = {
      node: rootNode,
      latex: boxLatex(rootNode),
      representativeValue: rootRepresentative,
    };

    const affineSolved = transformAffineBranches(carrier.affineBase, [rootBranch]);
    transformedBranches.push(...affineSolved);

    if (carrier.degree % 2 === 0) {
      const negativeRootNode = normalizeAst(['Negate', rootNode]);
      const negativeBranch: SymbolicFamilyBranch = {
        node: negativeRootNode,
        latex: boxLatex(negativeRootNode),
        representativeValue: Number.isFinite(rootRepresentative) ? -rootRepresentative : Number.NaN,
      };
      transformedBranches.push(...transformAffineBranches(carrier.affineBase, [negativeBranch]));

      if (!constantTarget || Math.abs(constantTarget.value) > EPSILON) {
        parameterConstraints.push(`${branch.latex}\\ge0`);
      }
    }
  }

  return {
    branches: dedupeSymbolicFamilyBranches(transformedBranches),
    parameterConstraintLatex: dedupe(parameterConstraints),
  };
}

function buildRepresentativeBranches(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  carrierNode?: unknown,
): PeriodicFamilyRepresentative[] {
  const entries: Array<{ value: number; label: string; exactLatex: string; approxText: string }> = [];
  const carrierRange = carrierNode ? proveRealRange(carrierNode) : null;

  for (const kValue of [0, -1, 1, 2, -2]) {
    for (const branch of branches) {
      const value = evaluateFamilyBranchAt(branch, kValue);
      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      if (
        !isCarrierRepresentativeFeasible(carrierNode, carrierRange, value)
      ) {
        continue;
      }

      if (entries.some((entry) => Math.abs(entry.value - value) <= 1e-6)) {
        continue;
      }

      const exactLatex = `${carrierLatex}=${substituteFamilyBranchLatex(branch.latex, kValue)}`;
      entries.push({
        value,
        label: `k=${kValue}`,
        exactLatex,
        approxText: `${carrierLatex} ~= ${formatApproxNumber(value)}`,
      });
    }
  }

  return entries
    .sort((left, right) => Math.abs(left.value) - Math.abs(right.value) || left.value - right.value)
    .slice(0, 3)
    .map((entry) => ({
      label: entry.label,
      exactLatex: entry.exactLatex,
      approxText: entry.approxText,
    }));
}

function isCarrierRepresentativeFeasible(
  carrierNode: unknown,
  carrierRange: ReturnType<typeof proveRealRange> | null,
  value: number,
) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (
    carrierRange?.kind === 'exact'
    && (value < carrierRange.interval.min - EPSILON || value > carrierRange.interval.max + EPSILON)
  ) {
    return false;
  }

  const normalized = carrierNode ? normalizeAst(carrierNode) : null;
  if (
    normalized
    && isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
  ) {
    if (normalized[1] === 'ExponentialE') {
      return value > 0;
    }

    if (isBareVariable(normalized[1])) {
      const exponent = readExactScalar(normalized[2]);
      if (exponent?.denominator === 1 && exponent.numerator > 0 && exponent.numerator % 2 === 0) {
        return value >= -EPSILON;
      }
    }
  }

  return true;
}

function inferSimpleDomainBounds(constraints: SolveDomainConstraint[]) {
  let min = Number.NEGATIVE_INFINITY;
  let max = Number.POSITIVE_INFINITY;

  for (const constraint of constraints) {
    if (constraint.kind === 'interval') {
      if (constraint.min !== undefined) {
        min = Math.max(min, constraint.min);
      }
      if (constraint.max !== undefined) {
        max = Math.min(max, constraint.max);
      }
      continue;
    }

    if ((constraint.kind === 'positive' || constraint.kind === 'nonnegative') && constraint.expressionLatex) {
      const normalized = normalizeAst(ce.parse(constraint.expressionLatex).json);
      const affine = numericAffineCarrier(normalized);
      if (!affine) {
        continue;
      }

      const bound = -affine.offsetValue / affine.coefficient;
      if (affine.coefficient > 0) {
        min = Math.max(min, bound);
      } else {
        max = Math.min(max, bound);
      }
    }
  }

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

function buildIntervalSuggestionsFromRoots(
  values: number[],
  bounds: { min?: number; max?: number },
): PeriodicIntervalSuggestion[] {
  const sorted = dedupeNumericRoots(values)
    .sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
  if (sorted.length === 0) {
    return [];
  }

  return sorted.slice(0, 3).map((value, index) => {
    const leftGap = index > 0 ? value - sorted[index - 1] : Number.POSITIVE_INFINITY;
    const rightGap = index < sorted.length - 1 ? sorted[index + 1] - value : Number.POSITIVE_INFINITY;
    const nearestGap = Math.min(leftGap, rightGap);
    const relativeWidth = Math.max(0.25, Math.abs(value) * 0.1);
    const halfWidth = Number.isFinite(nearestGap)
      ? Math.max(0.1, Math.min(nearestGap * 0.25, relativeWidth))
      : relativeWidth;

    let start = value - halfWidth;
    let end = value + halfWidth;
    if (bounds.min !== undefined) {
      start = Math.max(start, bounds.min + 1e-6);
    }
    if (bounds.max !== undefined) {
      end = Math.min(end, bounds.max - 1e-6);
    }

    return {
      label: `near x ~= ${formatApproxNumber(value)}`,
      start: formatApproxNumber(start),
      end: formatApproxNumber(end),
    };
  });
}

function approximateCarrierRoots(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
): number[] {
  const normalized = normalizeAst(carrierNode);
  const affine = numericAffineCarrier(normalized);
  if (affine) {
    return branches
      .map((branch) => (branch.representativeValue - affine.offsetValue) / affine.coefficient)
      .filter((value) => Number.isFinite(value));
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isBareVariable(normalized[1])
  ) {
    const exponent = readExactScalar(normalized[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator > 1) {
      const degree = exponent.numerator;
      const values: number[] = [];
      for (const branch of branches) {
        const target = branch.representativeValue;
        if (!Number.isFinite(target)) {
          continue;
        }
        if (degree % 2 === 0) {
          if (target < 0) {
            continue;
          }
          const root = Math.pow(target, 1 / degree);
          values.push(-root, root);
        } else {
          values.push(Math.sign(target) * Math.pow(Math.abs(target), 1 / degree));
        }
      }
      return values.filter((value) => Number.isFinite(value));
    }
  }

  return [];
}

function buildPeriodicFamilyInfo(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
  carrierNodeForIntervals?: unknown,
  parameterConstraintLatex: string[] = [],
): PeriodicFamilyInfo {
  const representatives = buildRepresentativeBranches(carrierLatex, branches, carrierNodeForIntervals);
  const intervalRoots = carrierNodeForIntervals
    ? approximateCarrierRoots(carrierNodeForIntervals, branches)
    : [];
  const suggestedIntervals = buildIntervalSuggestionsFromRoots(
    intervalRoots.filter((value) => {
      const violation = checkCandidateAgainstConstraints(value, constraints, angleUnit);
      return !violation;
    }),
    inferSimpleDomainBounds(constraints),
  );

  return {
    carrierLatex,
    parameterLatex: 'k\\in\\mathbb{Z}',
    parameterConstraintLatex: parameterConstraintLatex.length > 0 ? dedupe(parameterConstraintLatex) : undefined,
    branchesLatex: dedupe(branches.map((branch) => branch.latex)),
    representatives: representatives.length > 0 ? representatives : undefined,
    suggestedIntervals: suggestedIntervals.length > 0 ? suggestedIntervals : undefined,
  };
}

function transformExponentialFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = baseNode === 'ExponentialE'
      ? normalizeAst(['Ln', branch.node])
      : normalizeAst(['Log', branch.node, baseNode]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function buildPoweredTarget(target: NumericTarget, numerator: number, denominator: number) {
  return ['Power', target.node, buildScalarNode(numerator, denominator)] as const;
}

function isBareVariable(node: unknown) {
  return normalizeAst(node) === 'x';
}

function isDirectAffineInner(node: unknown) {
  return isBareVariable(node) || Boolean(matchAffineVariableArgument(node));
}

function transformBlocked(error: string): NonPeriodicTransform {
  return {
    equations: [],
    solveBadges: ['Outer Inversion'],
    solveSummaryText: '',
    unresolvedError: error,
  };
}

function matchNonPeriodicTransform(
  node: unknown,
  target: NumericTarget,
  angleUnit: AngleUnit,
): NonPeriodicTransform | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const inverseTrigKind =
    isNodeArray(normalized) && normalized.length === 2 && typeof normalized[0] === 'string'
      ? normalized[0] === 'Arcsin'
        ? 'asin'
        : normalized[0] === 'Arccos'
          ? 'acos'
          : normalized[0] === 'Arctan'
            ? 'atan'
            : null
      : null;

  if (inverseTrigKind && isNodeArray(normalized)) {
    const directInner =
      isNodeArray(normalized[1])
      && normalized[1].length === 2
      && typeof normalized[1][0] === 'string'
      && (
        (inverseTrigKind === 'asin' && normalized[1][0] === 'Sin')
        || (inverseTrigKind === 'acos' && normalized[1][0] === 'Cos')
        || (inverseTrigKind === 'atan' && normalized[1][0] === 'Tan')
      )
        ? normalized[1]
        : null;
    const principalRange = inverseTrigPrincipalRange(inverseTrigKind, angleUnit);
    const principalRangeLatex = buildInverseTrigPrincipalRangeLatex(inverseTrigKind, angleUnit);
    if (directInner) {
      const directInnerRange = proveRealRange(directInner[1]);
      if (
        directInnerRange.kind === 'exact'
        && intervalWithinPrincipalRange(directInnerRange.interval, principalRange)
      ) {
        const outerLatex = boxLatex(normalized);
        const reducedCarrierLatex = boxLatex(directInner[1]);
        return {
          equations: [buildEquationLatex(directInner[1], target.node)],
          solveBadges: ['Principal Range'],
          solveSummaryText: `Principal range: ${reducedCarrierLatex} stays in ${formatRangeInterval(directInnerRange.interval)}, so ${outerLatex} reduces to ${reducedCarrierLatex}=${target.latex}.`,
          unresolvedError: 'This recognized inverse/direct trig identity is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
          exactSupplementLatex: [
            `\\text{Principal range: } ${principalRangeLatex}`,
            `\\text{Canonical reduction: } ${outerLatex}=${reducedCarrierLatex}`,
          ],
          detailSections: [
            {
              title: 'Piecewise Exact',
              lines: [
                `${outerLatex} = ${reducedCarrierLatex} when ${reducedCarrierLatex} stays in ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
              ],
            },
          ],
          periodicFamilyExtras: {
            principalRangeLatex,
            reducedCarrierLatex,
            piecewiseBranches: [
              {
                conditionLatex: `${reducedCarrierLatex}\\in${principalRangeLatex}`,
                resultLatex: `${outerLatex}=${reducedCarrierLatex}`,
              },
            ] as PeriodicPiecewiseBranch[],
          },
        };
      }
    }

    if (!isWithinPrincipalRange(target.value, principalRange)) {
      const label =
        inverseTrigKind === 'asin'
          ? 'arcsin'
          : inverseTrigKind === 'acos'
            ? 'arccos'
            : 'arctan';
      return transformBlocked(
        `No real solutions because ${label} returns principal values only on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
      );
    }

    const invertedTarget = buildInverseTrigValueTarget(
      inverseTrigKind === 'asin'
        ? 'sin'
        : inverseTrigKind === 'acos'
          ? 'cos'
          : 'tan',
      target,
      angleUnit,
    );
    if (!invertedTarget) {
      return null;
    }

    return {
      equations: [buildEquationLatex(normalized[1], invertedTarget.node)],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${invertedTarget.latex}`,
      unresolvedError: 'This recognized inverse-trig composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    return {
      equations: [buildEquationLatex(normalized[1], ['Power', 'ExponentialE', target.node])],
      domainConstraints: [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=e^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    return {
      equations: [buildEquationLatex(normalized[1], ['Power', 10, target.node])],
      domainConstraints: [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=10^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const base = parseNumericTarget(normalized[2]);
    if (!base || base.value <= 0 || Math.abs(base.value - 1) < EPSILON) {
      return null;
    }

    return {
      equations: [buildEquationLatex(normalized[1], ['Power', normalized[2], target.node])],
      domainConstraints: [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(normalized[2])}^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value <= 0) {
      return transformBlocked('No real solutions because exponential expressions are always positive.');
    }

    return {
      equations: [buildEquationLatex(normalized[1], ['Ln', target.node])],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=\\ln\\left(${target.latex}\\right)`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = normalized[1];
    const exponent = normalized[2];
    const numericBase = parseNumericTarget(base);

    if (base === 'ExponentialE' && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: [buildEquationLatex(exponent, ['Ln', target.node])],
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\ln\\left(${target.latex}\\right)`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    if (numericBase && numericBase.value > 0 && Math.abs(numericBase.value - 1) > EPSILON && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: [buildEquationLatex(exponent, ['Divide', ['Ln', target.node], ['Ln', base]])],
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\frac{\\ln\\left(${target.latex}\\right)}{\\ln\\left(${boxLatex(base)}\\right)}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    const exponentScalar = readExactScalar(exponent);
    if (dependsOnVariable(base, 'x') && !isDirectAffineInner(base) && exponentScalar && exponentScalar.numerator > 0 && exponentScalar.denominator > 1) {
      const numerator = exponentScalar.numerator;
      const denominator = exponentScalar.denominator;
      const inversePower = buildPoweredTarget(target, denominator, numerator);

      if (denominator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because an even-root composition cannot equal a negative target in the real domain.');
      }

      if (numerator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because this rational-power composition is non-negative over the real domain.');
      }

      const equations = [buildEquationLatex(base, inversePower)];
      if (denominator % 2 !== 0 && numerator % 2 === 0) {
        equations.push(buildEquationLatex(base, ['Negate', inversePower]));
      }

      return {
        equations: dedupe(equations),
        domainConstraints:
          denominator % 2 === 0
            ? [{ kind: 'nonnegative', expressionLatex: boxLatex(base) }]
            : undefined,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Lifted ${boxLatex(normalized)} into ${dedupe(equations).join(',\\;')}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    return {
      equations: [buildEquationLatex(normalized[1], ['Power', target.node, 2])],
      domainConstraints: [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }],
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, 2])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Root' && normalized.length === 3 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const index = parseNumericTarget(normalized[2]);
    if (!index || !Number.isInteger(index.value) || index.value < 2) {
      return null;
    }

    if (index.value % 2 === 0 && target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    return {
      equations: [buildEquationLatex(normalized[1], ['Power', target.node, index.value])],
      domainConstraints: index.value % 2 === 0
        ? [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }]
        : undefined,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, index.value])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

type NormalizedTrigComposite =
  | {
      kind: 'normalized';
      trigKind: 'sin' | 'cos' | 'tan';
      target: NumericTarget;
      inner: unknown;
      innerLatex: string;
      outerLatex: string;
      reducedCarrierLatex?: string;
      solveBadges?: SolveBadge[];
      summaryPrefix?: string;
    }
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
      reducedCarrierLatex?: string;
      structuredStopReason?: PeriodicFamilyInfo['structuredStopReason'];
    };

function buildReciprocalTarget(target: NumericTarget): NumericTarget {
  const node = normalizeAst(['Divide', 1, target.node]);
  return {
    node,
    latex: boxLatex(node),
    value: 1 / target.value,
  };
}

function normalizeTrigComposite(
  node: unknown,
  target: NumericTarget,
): NormalizedTrigComposite | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length !== 2 || typeof normalized[0] !== 'string') {
    return null;
  }

  const operator = normalized[0];
  const inner = normalized[1];
  if (!dependsOnVariable(inner, 'x')) {
    return null;
  }

  const innerLatex = boxLatex(inner);
  const outerLatex = boxLatex(normalized);

  if (operator === 'Sin' || operator === 'Cos' || operator === 'Tan') {
    return {
      kind: 'normalized',
      trigKind: operator === 'Sin' ? 'sin' : operator === 'Cos' ? 'cos' : 'tan',
      target,
      inner,
      innerLatex,
      outerLatex,
    };
  }

  if (operator === 'Sec' || operator === 'Csc') {
    if (Math.abs(target.value) <= EPSILON || Math.abs(target.value) < 1 - EPSILON) {
      return {
        kind: 'impossible',
        error: `No real solutions because ${operator === 'Sec' ? '\\sec' : '\\csc'} only takes values with |y|\\ge1 and never 0.`,
        summaryText: `Reciprocal rewrite: ${outerLatex}=${target.latex} would require ${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)=${boxLatex(['Divide', 1, target.node])}, but reciprocal trig targets must satisfy |${target.latex}|\\ge1 and ${target.latex}\\ne0.`,
        solveBadges: ['Reciprocal Rewrite'],
        reducedCarrierLatex: `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`,
      };
    }

    const reciprocalTarget = buildReciprocalTarget(target);
    const reducedCarrierLatex = `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: operator === 'Sec' ? 'cos' : 'sin',
      target: reciprocalTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${reciprocalTarget.latex}.`,
    };
  }

  if (operator === 'Cot') {
    const cotTarget = Math.abs(target.value) <= EPSILON
      ? {
          node: 0 as unknown,
          latex: '0',
          value: 0,
        } satisfies NumericTarget
      : buildReciprocalTarget(target);
    const reducedCarrierLatex = `${Math.abs(target.value) <= EPSILON ? '\\cos' : '\\tan'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: Math.abs(target.value) <= EPSILON ? 'cos' : 'tan',
      target: cotTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${cotTarget.latex}.`,
    };
  }

  return null;
}

function solveTrigOnInterval(
  kind: 'sin' | 'cos' | 'tan',
  target: number,
  intervalMin: number,
  intervalMax: number,
  angleUnit: AngleUnit,
): number[] | null {
  if (!Number.isFinite(intervalMin) || !Number.isFinite(intervalMax)) {
    return null;
  }

  if ((kind === 'sin' || kind === 'cos') && (target < -1 - EPSILON || target > 1 + EPSILON)) {
    return [];
  }

  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const period = kind === 'tan' ? Math.PI : Math.PI * 2;
  const bases =
    kind === 'sin'
      ? [Math.asin(target), Math.PI - Math.asin(target)]
      : kind === 'cos'
        ? [Math.acos(target), -Math.acos(target)]
        : [Math.atan(target)];

  const solutions = new Set<number>();
  for (const base of bases) {
    if (!Number.isFinite(base)) {
      continue;
    }

    const startK = Math.ceil((lower - base) / period - EPSILON);
    const endK = Math.floor((upper - base) / period + EPSILON);
    for (let k = startK; k <= endK; k += 1) {
      const valueRad = base + k * period;
      if (valueRad < lower - EPSILON || valueRad > upper + EPSILON) {
        continue;
      }
      solutions.add(convertAngle(valueRad, 'rad', angleUnit));
      if (solutions.size > MAX_TRIG_BRANCHES) {
        return null;
      }
    }
  }

  return dedupeNumericRoots([...solutions]);
}

function criticalAngles(kind: 'sin' | 'cos', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const base = kind === 'sin' ? Math.PI / 2 : 0;
  const period = Math.PI;
  const points: number[] = [];
  const startK = Math.ceil((lower - base) / period - EPSILON);
  const endK = Math.floor((upper - base) / period + EPSILON);
  for (let k = startK; k <= endK; k += 1) {
    const point = base + k * period;
    if (point >= lower - EPSILON && point <= upper + EPSILON) {
      points.push(point);
    }
  }
  return points;
}

function trigValue(kind: 'sin' | 'cos' | 'tan', valueRad: number) {
  if (kind === 'sin') {
    return Math.sin(valueRad);
  }
  if (kind === 'cos') {
    return Math.cos(valueRad);
  }
  return Math.tan(valueRad);
}

function composeTrigImage(kind: 'sin' | 'cos' | 'tan', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const samplePoints = [lower, upper];

  if (kind === 'sin' || kind === 'cos') {
    samplePoints.push(...criticalAngles(kind, intervalMin, intervalMax, angleUnit));
  } else {
    const asymptoteBase = Math.PI / 2;
    const period = Math.PI;
    const startK = Math.ceil((lower - asymptoteBase) / period - EPSILON);
    const endK = Math.floor((upper - asymptoteBase) / period + EPSILON);
    if (startK <= endK) {
      return null;
    }
  }

  const values = samplePoints.map((point) => trigValue(kind, point));
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    minInclusive: true,
    maxInclusive: true,
  };
}

function matchTrigBranches(node: unknown, target: NumericTarget, angleUnit: AngleUnit): TrigBranchResult | null {
  const normalizedTrig = normalizeTrigComposite(node, target);
  if (!normalizedTrig) {
    return null;
  }

  if (normalizedTrig.kind === 'impossible') {
    return normalizedTrig;
  }

  if (isDirectAffineInner(normalizedTrig.inner)) {
    return null;
  }

  const { trigKind: kind, target: effectiveTarget, inner, innerLatex, outerLatex, summaryPrefix } = normalizedTrig;
  const innerProof: ReturnType<typeof proveRealRange> = proveRealRange(inner);

  if (innerProof.kind !== 'exact') {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`
        : `Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchValues = solveTrigOnInterval(
    kind,
    effectiveTarget.value,
    innerProof.interval.min,
    innerProof.interval.max,
    angleUnit,
  );

  if (branchValues === null) {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves too many inverse branches for the current bounded symbolic solve set. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`
        : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  if (branchValues.length === 0) {
    const outerImage = composeTrigImage(kind, innerProof.interval.min, innerProof.interval.max, angleUnit);
    return {
      kind: 'impossible',
      error: 'No real solutions because the proven inner image makes the outer trig target unreachable.',
      summaryText: outerImage
        ? summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
        : summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} cannot equal ${effectiveTarget.latex}.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchEquations = branchValues.map((value) => `${innerLatex}=${formatBranchConstant(value, angleUnit)}`);
  return {
    kind: 'branches',
    equations: dedupe(branchEquations),
    summaryText: summaryPrefix
      ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex}=${effectiveTarget.latex} reduces to ${dedupe(branchEquations).join(',\\;')}.`
      : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex}=${effectiveTarget.latex} reduces to ${dedupe(branchEquations).join(',\\;')}.`,
    solveBadges: normalizedTrig.solveBadges,
  };
}

function transformLogFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', baseNode, branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function transformLnFamilyBranches(branches: SymbolicFamilyBranch[]) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', 'ExponentialE', branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function trigCarrierRange(kind: 'sin' | 'cos' | 'tan') {
  if (kind === 'tan') {
    return null;
  }

  return {
    min: -1,
    max: 1,
  };
}

function solveNestedTrigCarrierPeriodicFamily(
  normalized: unknown[],
  kind: 'sin' | 'cos' | 'tan',
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[],
  supplementLatex: string[],
  periodicNestingDepth: number,
): PeriodicFamilySolveResult {
  const inner = normalized[1];
  const family: PeriodicFamilyInfo = {
    ...buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized),
    reducedCarrierLatex: boxLatex(normalized),
  };

  if (periodicNestingDepth >= 1) {
    return {
      kind: 'guided',
      family: {
        ...family,
        structuredStopReason: 'second-periodic-parameter',
      },
      error: 'This recognized periodic family would require a second independent periodic parameter to continue exactly. Use Numeric Solve with one of the suggested intervals.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Further reducing ${boxLatex(normalized)} would introduce another periodic branch parameter beyond the current bounded exact solve set.`,
      solveBadges: ['Nested Recursion'],
    };
  }

  let constantBranches = branches;
  if (branches.some(branchDependsOnParameter)) {
    const range = trigCarrierRange(kind);
    if (!range) {
      return {
        kind: 'guided',
        family: {
          ...family,
          structuredStopReason: 'second-periodic-parameter',
        },
        error: 'This recognized periodic family would require a second independent periodic parameter to continue exactly. Use Numeric Solve with one of the suggested intervals.',
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `Further reducing ${boxLatex(normalized)} would introduce another periodic branch parameter beyond the current bounded exact solve set.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    const expanded = expandBranchesWithinInterval(branches, range.min, range.max);
    if (expanded === null) {
      return {
        kind: 'guided',
        family: {
          ...family,
          structuredStopReason: 'unsupported-sawtooth-closure',
        },
        error: 'This recognized periodic family leaves too many bounded follow-on trig branches for the current exact solve set. Use Numeric Solve with one of the suggested intervals.',
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `Further reducing ${boxLatex(normalized)} would require bounded trig branch pruning beyond the current exact solve set.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    if (expanded.length === 0) {
      return {
        kind: 'guided',
        family,
        error: `No real solutions remain because this periodic family never enters the real range of ${kind}.`,
        domainConstraints: constraints,
        supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
        summaryText: `All periodic targets for ${boxLatex(normalized)} stay outside the real range of ${kind}.`,
        solveBadges: ['Nested Recursion'],
      };
    }

    constantBranches = expanded;
  }

  const transformedBranches: SymbolicFamilyBranch[] = [];
  for (const branch of constantBranches) {
    const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
    if (!target) {
      continue;
    }

    const template = buildTrigPeriodicTemplate(kind, target.value, target.latex, angleUnit);
    if (!template) {
      continue;
    }

    transformedBranches.push(...template.branches.map(buildSymbolicFamilyBranch));
  }

  if (transformedBranches.length === 0) {
    return {
      kind: 'guided',
      family,
      error: 'No real solutions remain after reducing this nested periodic carrier in the real domain.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Reducing ${boxLatex(normalized)} left no real bounded branch targets to continue exactly.`,
      solveBadges: ['Nested Recursion'],
    };
  }

  return appendPeriodicSolveBadges(
    resolveCarrierPeriodicFamily(
      inner,
      dedupeSymbolicFamilyBranches(transformedBranches),
      angleUnit,
      constraints,
      supplementLatex,
      periodicNestingDepth + 1,
    ),
    ['Nested Recursion'],
  );
}

function solveNestedInverseTrigCarrierPeriodicFamily(
  normalized: unknown[],
  kind: 'asin' | 'acos' | 'atan',
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[],
  supplementLatex: string[],
  periodicNestingDepth: number,
): PeriodicFamilySolveResult {
  const inner = normalized[1];
  const inverseTrigLatex =
    kind === 'asin'
      ? '\\arcsin'
      : kind === 'acos'
        ? '\\arccos'
        : '\\arctan';
  const principalRangeLatex = buildInverseTrigPrincipalRangeLatex(kind, angleUnit);
  const family: PeriodicFamilyInfo = {
    ...buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized),
    reducedCarrierLatex: boxLatex(normalized),
    principalRangeLatex,
  };
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const expanded = expandBranchesWithinInterval(branches, range.min, range.max);

  if (expanded === null) {
    return {
      kind: 'guided',
      family: {
        ...family,
        structuredStopReason: 'unsupported-sawtooth-closure',
      },
      error: 'This recognized inverse-trig periodic family still needs broader branch pruning than the current bounded exact solve set supports. Use Numeric Solve with one of the suggested intervals.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Further reducing ${boxLatex(normalized)} would require broader principal-range branch pruning than the current exact solve set supports.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  if (expanded.length === 0) {
    return {
      kind: 'guided',
      family: {
        ...family,
        structuredStopReason: 'outside-principal-range',
      },
      error: `No real solutions remain because this periodic family never enters the principal range ${buildInverseTrigPrincipalRangeMessage(kind, angleUnit)} of ${inverseTrigLatex}.`,
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `All periodic targets for ${boxLatex(normalized)} fall outside its principal range ${buildInverseTrigPrincipalRangeMessage(kind, angleUnit)}.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  const mappedKind =
    kind === 'asin'
      ? 'sin'
      : kind === 'acos'
        ? 'cos'
        : 'tan';

  const transformedBranches = expanded.flatMap((branch) => {
    const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
    if (!target) {
      return [];
    }

    const valueTarget = buildInverseTrigValueTarget(mappedKind, target, angleUnit);
    if (!valueTarget) {
      return [];
    }
    return [buildSymbolicFamilyBranchFromNode(valueTarget.node, valueTarget.value)];
  });

  if (transformedBranches.length === 0) {
    return {
      kind: 'guided',
      family,
      error: 'No real solutions remain after bounded inverse-trig branch reduction.',
      domainConstraints: constraints,
      supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
      summaryText: `Reducing ${boxLatex(normalized)} left no real branch targets to continue exactly.`,
      solveBadges: ['Nested Recursion', 'Principal Range'],
    };
  }

  return appendPeriodicSolveBadges(
    resolveCarrierPeriodicFamily(
      inner,
      dedupeSymbolicFamilyBranches(transformedBranches),
      angleUnit,
      constraints,
      supplementLatex,
      periodicNestingDepth,
    ),
    ['Nested Recursion', 'Principal Range'],
  );
}

function resolveCarrierPeriodicFamily(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
  constraints: SolveDomainConstraint[] = [],
  supplementLatex: string[] = [],
  periodicNestingDepth = 0,
): PeriodicFamilySolveResult {
  const normalized = normalizeAst(carrierNode);
  const affine = numericAffineCarrier(normalized);
  if (affine) {
    const solvedBranches = transformAffineBranches(affine, branches);
    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo('x', solvedBranches, constraints, angleUnit, 'x'),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
    };
  }

  const parameterizedPower = matchParameterizedPowerCarrier(normalized);
  if (parameterizedPower) {
    const transformed = buildParameterizedPowerBranches(parameterizedPower, branches);
    if (transformed.branches.length === 0) {
      return {
        kind: 'guided',
      family: buildPeriodicFamilyInfo('x', [], constraints, angleUnit, 'x'),
      error: 'No real solutions remain because this even-power periodic family requires a negative branch target in the real domain.',
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
        solveBadges: ['Parameterized Family'],
      };
    }

    return {
      kind: 'solved',
      family: buildPeriodicFamilyInfo(
        'x',
        transformed.branches,
        constraints,
        angleUnit,
        'x',
        transformed.parameterConstraintLatex,
      ),
      domainConstraints: constraints,
      supplementLatex,
      summaryText: '',
      solveBadges: ['Parameterized Family'],
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && typeof normalized[0] === 'string') {
    const directTrigKind =
      normalized[0] === 'Sin'
        ? 'sin'
        : normalized[0] === 'Cos'
          ? 'cos'
          : normalized[0] === 'Tan'
            ? 'tan'
            : null;
    if (directTrigKind && dependsOnVariable(normalized[1], 'x')) {
      return solveNestedTrigCarrierPeriodicFamily(
        normalized,
        directTrigKind,
        branches,
        angleUnit,
        constraints,
        supplementLatex,
        periodicNestingDepth,
      );
    }

    const inverseTrigKind =
      normalized[0] === 'Arcsin'
        ? 'asin'
        : normalized[0] === 'Arccos'
          ? 'acos'
          : normalized[0] === 'Arctan'
            ? 'atan'
            : null;
    if (inverseTrigKind && dependsOnVariable(normalized[1], 'x')) {
      return solveNestedInverseTrigCarrierPeriodicFamily(
        normalized,
        inverseTrigKind,
        branches,
        angleUnit,
        constraints,
        supplementLatex,
        periodicNestingDepth,
      );
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    return resolveCarrierPeriodicFamily(
      normalized[1],
      transformLnFamilyBranches(branches),
      angleUnit,
      mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
      supplementLatex,
      periodicNestingDepth,
    );
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 2) {
    return resolveCarrierPeriodicFamily(
      normalized[1],
      transformLogFamilyBranches(branches, 10),
      angleUnit,
      mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
      supplementLatex,
      periodicNestingDepth,
    );
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[2]);
    if (base && base.value > 0 && Math.abs(base.value - 1) > EPSILON) {
      return resolveCarrierPeriodicFamily(
        normalized[1],
        transformLogFamilyBranches(branches, normalized[2]),
        angleUnit,
        mergeConstraints(constraints, [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }]),
        supplementLatex,
        periodicNestingDepth,
      );
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[1]);
    if (
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[2], 'x')
      && !dependsOnVariable(normalized[1], 'x')
    ) {
      return resolveCarrierPeriodicFamily(
        normalized[2],
        transformExponentialFamilyBranches(branches, normalized[1]),
        angleUnit,
        constraints,
        buildPeriodicBranchConditionSupplement(
          branches.map((branch) => `${branch.latex}>0`),
        ),
        periodicNestingDepth,
      );
    }
  }

  return {
    kind: 'guided',
    family: buildPeriodicFamilyInfo(boxLatex(normalized), branches, constraints, angleUnit, normalized),
    error: 'This recognized periodic family still requires parameterized nonlinear or currently unsupported exact solving. Use Numeric Solve with one of the suggested intervals.',
    domainConstraints: constraints,
    supplementLatex: supplementLatex.length > 0 ? supplementLatex : undefined,
    summaryText: '',
  };
}

function solveTrigPeriodicFamily(
  node: unknown,
  target: NumericTarget,
  request: GuardedSolveRequest,
): PeriodicFamilySolveResult | null {
  const normalizedTrig = normalizeTrigComposite(node, target);
  if (!normalizedTrig) {
    return null;
  }

  if (normalizedTrig.kind === 'impossible') {
    return {
      kind: 'guided',
      family: {
        carrierLatex: normalizedTrig.reducedCarrierLatex ?? normalizedTrig.summaryText,
        parameterLatex: 'k\\in\\mathbb{Z}',
        branchesLatex: [],
        reducedCarrierLatex: normalizedTrig.reducedCarrierLatex,
        structuredStopReason: normalizedTrig.structuredStopReason,
      },
      error: normalizedTrig.error,
      summaryText: normalizedTrig.summaryText,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const { trigKind: kind, target: effectiveTarget, inner, reducedCarrierLatex, solveBadges, summaryPrefix } = normalizedTrig;
  const innerIsDirect = Boolean(numericAffineCarrier(inner));
  if ((request.compositionInversionDepth ?? 0) === 0 && innerIsDirect && !(solveBadges?.length)) {
    return null;
  }

  const template = buildTrigPeriodicTemplate(kind, effectiveTarget.value, effectiveTarget.latex, request.angleUnit);
  if (!template) {
    return {
      kind: 'guided',
      family: {
        carrierLatex: boxLatex(inner),
        parameterLatex: 'k\\in\\mathbb{Z}',
        branchesLatex: [],
        reducedCarrierLatex,
      },
      error: 'No real solutions because this trig target lies outside the real range of the carrier.',
      summaryText: summaryPrefix ?? '',
      solveBadges,
    };
  }

  const resolved = resolveCarrierPeriodicFamily(
    inner,
    template.branches.map(buildSymbolicFamilyBranch),
    request.angleUnit,
  );
  if (!summaryPrefix && !reducedCarrierLatex && !(solveBadges?.length)) {
    return resolved;
  }

  return {
    ...resolved,
    family: {
      ...resolved.family,
      reducedCarrierLatex: reducedCarrierLatex ?? resolved.family.reducedCarrierLatex,
    },
    summaryText: summaryPrefix
      ? resolved.summaryText
        ? `${summaryPrefix} ${resolved.summaryText}`
        : summaryPrefix
      : resolved.summaryText,
    solveBadges: dedupe([...(resolved.solveBadges ?? []), ...(solveBadges ?? [])]),
  };
}

function periodicFamilyBadges(
  node: unknown,
  nestedContextBadges: SolveBadge[],
  extraBadges: SolveBadge[] = [],
) {
  const normalized = normalizeAst(node);
  const inner = isNodeArray(normalized) && normalized.length === 2 ? normalized[1] : null;
  return dedupe<SolveBadge>([
    'Periodic Family',
    ...extraBadges,
    ...(inner && !numericAffineCarrier(inner) ? ['Composition Branch' as const] : []),
    ...nestedContextBadges,
  ]);
}

function buildPeriodicOutcomeSupplements(periodic: PeriodicFamilySolveResult) {
  return dedupe([
    periodicFamilyParameterSupplement(periodic.family),
    ...periodicFamilyConstraintSupplements(periodic.family),
    ...(periodic.supplementLatex ?? []),
    ...buildConstraintSupplementLatex(periodic.domainConstraints),
  ]);
}

function buildPeriodicSolveSummary(
  expressionLatex: string,
  targetLatex: string,
  periodic: PeriodicFamilySolveResult,
  verb: 'yields' | 'reduces to',
) {
  const base = `Periodic family: ${expressionLatex}=${targetLatex} ${verb} ${periodicFamilyToExactLatex(periodic.family)}.`;
  return periodic.summaryText
    ? `${base} ${periodic.summaryText}`
    : base;
}

function recurseComposition(
  request: GuardedSolveRequest,
  equations: string[],
  depth: number,
  trail: Set<string>,
  maxRecursionDepth: number,
  runGuardedEquationSolve: GuardedSolveRunner,
  badges: SolveBadge[],
  summaryText: string,
  domainConstraints: SolveDomainConstraint[] = [],
  unresolvedError?: string,
  extraSupplementLatex: string[] = [],
  extraDetailSections: DisplayDetailSection[] = [],
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>,
): DisplayOutcome | null {
  const nextCompositionDepth = (request.compositionInversionDepth ?? 0) + 1;
  if (nextCompositionDepth > MAX_COMPOSITION_INVERSION_DEPTH) {
    return compositionDepthLimitError(badges, summaryText);
  }

  const effectiveBadges = withNestedRecursionBadges(badges);
  if (depth >= maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      effectiveBadges,
      summaryText,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = dedupe(equations).filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    return null;
  }

  const recursiveOutcomes = branchEquations.map((equationLatex) =>
    runGuardedEquationSolve(
      {
        ...request,
        originalLatex: equationLatex,
        resolvedLatex: equationLatex,
        validationLatex: request.validationLatex ?? request.resolvedLatex,
        compositionInversionDepth: nextCompositionDepth,
        numericInterval: undefined,
        domainConstraints: mergeConstraints(request.domainConstraints, domainConstraints),
      },
      depth + 1,
      new Set(trail),
    ));

  const merged = recursiveOutcomes.length === 1
    ? recursiveOutcomes[0]
    : mergeDisplayOutcomes(recursiveOutcomes, effectiveBadges, summaryText);

  if (merged.kind === 'error' && merged.error === UNSUPPORTED_FAMILY_ERROR && unresolvedError) {
    return errorOutcome(
      'Solve',
      unresolvedError,
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges]),
      summaryText,
      merged.rejectedCandidateCount,
      merged.substitutionDiagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind !== 'success') {
    return appendSolveMetadata(merged, effectiveBadges, summaryText);
  }

  const validationCandidates = collectOutcomeCandidates(merged);
  if (validationCandidates.length === 0) {
    const supplements = dedupe([
      ...(merged.exactSupplementLatex ?? []),
      ...extraSupplementLatex,
      ...buildConstraintSupplementLatex(domainConstraints),
    ]);
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    return appendSolveMetadata({
      ...merged,
      periodicFamily: mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras),
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
    }, effectiveBadges, summaryText);
  }

  const validation = validateCompositionCandidates(
    request.validationLatex ?? request.resolvedLatex,
    validationCandidates,
    mergeConstraints(request.domainConstraints, domainConstraints),
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const supplements = dedupe([
      ...(merged.exactSupplementLatex ?? []),
      ...extraSupplementLatex,
      ...buildConstraintSupplementLatex(domainConstraints),
    ]);
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    return {
      kind: 'error',
      title: 'Solve',
      error: compositionRejectionMessage(validation.rejected, domainConstraints),
      exactLatex: merged.exactLatex,
      periodicFamily: mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras),
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      approxText: merged.approxText,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
      warnings: merged.warnings,
      plannerBadges: merged.plannerBadges ?? [],
      solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
      solveSummaryText: summaryText,
      rejectedCandidateCount: validation.rejected.length,
      substitutionDiagnostics: merged.substitutionDiagnostics,
      numericMethod: merged.numericMethod,
    };
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const exactLatex = acceptedExactLatex.length === validation.accepted.length
    && acceptedExactLatex.length > 0
    && acceptedExactLatex.every((value) => !isApproximateOnlySolutionLatex(value))
      ? solutionsToLatex('x', acceptedExactLatex)
      : undefined;

  const supplements = dedupe([
    ...(merged.exactSupplementLatex ?? []),
    ...extraSupplementLatex,
    ...buildConstraintSupplementLatex(domainConstraints),
  ]);
  const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    periodicFamily: mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras),
    exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
    approxText: `x ~= ${validation.accepted.map((value) => formatApproxNumber(value)).join(', ')}`,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
    solveSummaryText: merged.solveSummaryText
      ? `${summaryText}; ${merged.solveSummaryText}`
      : summaryText,
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitutionDiagnostics: merged.substitutionDiagnostics,
    numericMethod: merged.numericMethod,
  };
}

function compositionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  maxRecursionDepth: number,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const nestedContextBadges = (request.compositionInversionDepth ?? 0) > 0
    ? ['Nested Recursion'] as SolveBadge[]
    : [];
  let parsed: unknown;
  try {
    parsed = normalizeAst(ce.parse(request.resolvedLatex).json);
  } catch {
    return null;
  }

  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const attempts: Array<{ composite: unknown; target: unknown }> = [
    { composite: parsed[1], target: parsed[2] },
    { composite: parsed[2], target: parsed[1] },
  ];

  for (const attempt of attempts) {
    const target = parseNumericTarget(attempt.target);
    if (!target) {
      continue;
    }

    const trigBranches = matchTrigBranches(attempt.composite, target, request.angleUnit);
    if (trigBranches?.kind === 'impossible') {
      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Range Guard', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches.summaryText,
      );
    }
    if (trigBranches?.kind === 'unresolved') {
      const periodic = solveTrigPeriodicFamily(attempt.composite, target, request);
      if (periodic?.kind === 'solved') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return {
          kind: 'success',
          title: 'Solve',
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: badges,
          solveSummaryText: buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'yields',
          ),
        };
      }
      if (periodic?.kind === 'guided') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return {
          kind: 'error',
          title: 'Solve',
          error: periodic.error,
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          plannerBadges: [],
          solveBadges: badges,
          solveSummaryText: buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'reduces to',
          ),
        };
      }

      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches.summaryText,
      );
    }
    if (trigBranches?.kind === 'branches') {
    const recursive = recurseComposition(
      request,
      trigBranches.equations,
        depth,
        trail,
        maxRecursionDepth,
      runGuardedEquationSolve,
      dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? [])]),
      trigBranches.summaryText,
      [],
      'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
      );
      if (recursive) {
        return recursive;
      }
    }

    const periodic = solveTrigPeriodicFamily(attempt.composite, target, request);
    if (periodic?.kind === 'solved') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return {
        kind: 'success',
        title: 'Solve',
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        resultOrigin: 'symbolic',
        plannerBadges: [],
        solveBadges: badges,
        solveSummaryText: buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'yields',
        ),
      };
    }
    if (periodic?.kind === 'guided') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return {
        kind: 'error',
        title: 'Solve',
        error: periodic.error,
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        plannerBadges: [],
        solveBadges: badges,
        solveSummaryText: buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'reduces to',
        ),
      };
    }

    const transform = matchNonPeriodicTransform(attempt.composite, target, request.angleUnit);
    if (!transform) {
      continue;
    }

    if (transform.equations.length === 0) {
      return errorOutcome(
        'Solve',
        transform.unresolvedError,
        [],
        [],
        dedupe<SolveBadge>([...transform.solveBadges, ...nestedContextBadges]),
        transform.solveSummaryText || undefined,
      );
    }

    const recursive = recurseComposition(
      request,
      transform.equations,
      depth,
      trail,
      maxRecursionDepth,
      runGuardedEquationSolve,
      transform.solveBadges,
      transform.solveSummaryText,
      transform.domainConstraints,
      transform.unresolvedError,
      transform.exactSupplementLatex,
      transform.detailSections,
      transform.periodicFamilyExtras,
    );
    if (recursive) {
      return recursive;
    }
  }

  return null;
}

export { compositionSolve };
