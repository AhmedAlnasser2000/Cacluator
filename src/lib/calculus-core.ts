import { ComputeEngine } from '@cortex-js/compute-engine';
import { integrateAdaptiveSimpson } from './adaptive-simpson';
import { formatApproxNumber, latexToApproxText, numberToLatex } from './format';
import {
  numericLimitAtInfinity,
  resolveInfiniteLimitHeuristic,
} from './limit-heuristics';
import { getResultGuardError, MAX_RESULT_MAGNITUDE } from './result-guard';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from './calculus-verification';
import {
  resolveSymbolicIntegralFromAst,
  type IntegralStrategy,
} from './symbolic-engine/integration';
import { resolveFiniteLimitRule } from './symbolic-engine/limits';
import type {
  LimitDirection,
  LimitTargetKind,
  ResultOrigin,
} from '../types/calculator';

const ce = new ComputeEngine();
const LIMIT_TOLERANCE = 1e-4;
const LIMIT_STEPS = [1e-1, 5e-2, 1e-2, 5e-3, 1e-3, 5e-4, 1e-4];
const LIMIT_UNBOUNDED_THRESHOLD = 1e4;

export type CalculusCoreEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
  integrationStrategy?: IntegralStrategy;
  antiderivativeBackcheck?: AntiderivativeBackcheck;
};

export type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

type OneSidedLimitResult =
  | { kind: 'success'; value: number }
  | { kind: 'unbounded' }
  | { kind: 'domain-error' }
  | { kind: 'unstable' };

type FiniteLimitMessages = {
  mismatchError: string;
  unstableError: string;
  numericFallbackWarning: (direction: LimitDirection) => string;
  oneSidedUnboundedError: (direction: Exclude<LimitDirection, 'two-sided'>) => string;
  oneSidedDomainError?: (direction: Exclude<LimitDirection, 'two-sided'>) => string;
};

type InfiniteLimitMessages = {
  targetLabel: (targetKind: Exclude<LimitTargetKind, 'finite'>) => string;
  unstableError: string;
  numericFallbackWarning: string;
};

export function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();

  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof numeric.json.num === 'string'
  ) {
    const parsed = Number(numeric.json.num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const text = latexToApproxText(numeric.latex);
  if (!text) {
    return undefined;
  }

  const value = Number(text.replace(/\s+/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

export function boxNode(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

export function nodeToFiniteNumber(node: unknown) {
  return boxedToFiniteNumber(boxNode(node));
}

export function evaluateBodyAt(body: unknown, variable: string, value: number) {
  try {
    const numeric = boxNode(body).subs({ [variable]: value }).evaluate();
    return boxedToFiniteNumber(numeric);
  } catch {
    return undefined;
  }
}

function normalizeExactLatex(latex: string) {
  return (ce.parse(latex) as BoxedLike).latex;
}

function resolvedComputeEngineIntegral(
  computed: BoxedLike | undefined,
  unresolvedComputeEngine: boolean,
  origin: ResultOrigin,
  body: unknown,
  variable: string,
): CalculusCoreEvaluation | undefined {
  if (!computed || unresolvedComputeEngine) {
    return undefined;
  }

  return {
    exactLatex: computed.latex,
    approxText: latexToApproxText((computed.N?.() ?? computed).latex),
    warnings: [],
    resultOrigin: origin,
    integrationStrategy: 'compute-engine',
    antiderivativeBackcheck: backcheckAntiderivative({
      antiderivativeLatex: computed.latex,
      integrand: body,
      variable,
    }),
  };
}

export function resolveIndefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  computed?: BoxedLike;
  unresolvedComputeEngine: boolean;
  computeEngineOrigin: ResultOrigin;
  unsupportedError: string;
  normalizeRuleLatex?: boolean;
}): CalculusCoreEvaluation {
  const symbolicEngine = resolveSymbolicIntegralFromAst(input.body, input.variable);
  if (symbolicEngine.kind === 'success') {
    return {
      exactLatex: input.normalizeRuleLatex
        ? normalizeExactLatex(symbolicEngine.exactLatex)
        : symbolicEngine.exactLatex,
      warnings: [],
      resultOrigin: symbolicEngine.origin,
      integrationStrategy: symbolicEngine.strategy,
      antiderivativeBackcheck: symbolicEngine.verification,
    };
  }

  const computed = resolvedComputeEngineIntegral(
    input.computed,
    input.unresolvedComputeEngine,
    input.computeEngineOrigin,
    input.body,
    input.variable,
  );
  if (computed) {
    return computed;
  }

  return {
    warnings: [],
    error: input.unsupportedError,
  };
}

function stabilizeSamples(samples: number[]) {
  if (samples.length < 2) {
    return undefined;
  }

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const scale = Math.max(1, Math.abs(current), Math.abs(previous));

    if (Math.abs(current - previous) <= LIMIT_TOLERANCE * scale) {
      return current;
    }
  }

  return undefined;
}

function isUnboundedTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last >= LIMIT_UNBOUNDED_THRESHOLD
    && previous > 0
    && older > 0
    && last > previous * 1.5
    && previous > older * 1.5;
}

function isZeroTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last <= 5e-2 && last < previous && previous < older;
}

function containsFiniteDomainBoundary(node: unknown): boolean {
  if (!Array.isArray(node)) {
    return false;
  }

  const [head, ...children] = node;
  if (head === 'Ln' || head === 'Log' || head === 'Sqrt') {
    return true;
  }

  return children.some(containsFiniteDomainBoundary);
}

function numericOneSidedLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: 'left' | 'right',
): OneSidedLimitResult {
  const samples: number[] = [];
  let skippedSamples = 0;

  for (const step of LIMIT_STEPS) {
    const samplePoint = direction === 'left' ? target - step : target + step;
    const value = evaluateBodyAt(body, variable, samplePoint);

    if (value === undefined) {
      skippedSamples += 1;
      continue;
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE) {
      return { kind: 'unbounded' };
    }

    samples.push(value);
  }

  if (samples.length === 0 && skippedSamples > 0 && containsFiniteDomainBoundary(body)) {
    return { kind: 'domain-error' };
  }

  const stabilized = stabilizeSamples(samples);
  if (stabilized !== undefined) {
    return { kind: 'success', value: stabilized };
  }

  if (isZeroTrend(samples)) {
    return { kind: 'success', value: 0 };
  }

  if (isUnboundedTrend(samples)) {
    return { kind: 'unbounded' };
  }

  return { kind: 'unstable' };
}

function numericFiniteLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: LimitDirection,
) {
  if (direction === 'left') {
    return numericOneSidedLimit(body, variable, target, 'left');
  }

  if (direction === 'right') {
    return numericOneSidedLimit(body, variable, target, 'right');
  }

  const left = numericOneSidedLimit(body, variable, target, 'left');
  if (left.kind === 'unbounded') {
    return { kind: 'left-unbounded' as const };
  }
  if (left.kind === 'domain-error') {
    return { kind: 'left-domain-error' as const };
  }
  if (left.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const right = numericOneSidedLimit(body, variable, target, 'right');
  if (right.kind === 'unbounded') {
    return { kind: 'right-unbounded' as const };
  }
  if (right.kind === 'domain-error') {
    return { kind: 'right-domain-error' as const };
  }
  if (right.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const scale = Math.max(1, Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(left.value - right.value) > LIMIT_TOLERANCE * scale) {
    return { kind: 'mismatch' as const };
  }

  return {
    kind: 'success' as const,
    value: (left.value + right.value) / 2,
  };
}

export function basicFiniteLimitWarning(direction: LimitDirection) {
  if (direction === 'two-sided') {
    return 'Symbolic limit unavailable; showing a numeric limit approximation.';
  }

  return `Symbolic limit unavailable; showing a numeric ${direction}-hand limit approximation.`;
}

export function evaluateFiniteLimitFromAst(input: {
  body: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
  messages: FiniteLimitMessages;
}): CalculusCoreEvaluation {
  if (containsFiniteDomainBoundary(input.body)) {
    const domainProbe =
      input.direction === 'left'
        ? { side: 'left' as const, result: numericOneSidedLimit(input.body, input.variable, input.target, 'left') }
        : input.direction === 'right'
          ? { side: 'right' as const, result: numericOneSidedLimit(input.body, input.variable, input.target, 'right') }
          : undefined;

    if (domainProbe?.result.kind === 'domain-error') {
      return {
        warnings: [],
        error: input.messages.oneSidedDomainError?.(domainProbe.side) ?? input.messages.unstableError,
      };
    }

    if (input.direction === 'two-sided') {
      const left = numericOneSidedLimit(input.body, input.variable, input.target, 'left');
      if (left.kind === 'domain-error') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('left') ?? input.messages.unstableError,
        };
      }
      const right = numericOneSidedLimit(input.body, input.variable, input.target, 'right');
      if (right.kind === 'domain-error') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('right') ?? input.messages.unstableError,
        };
      }
    }
  }

  const symbolic = resolveFiniteLimitRule(input.body, input.target, input.variable);
  if (symbolic.kind === 'success') {
    return {
      exactLatex: numberToLatex(symbolic.value),
      approxText: formatApproxNumber(symbolic.value),
      warnings:
        symbolic.origin === 'heuristic-symbolic'
          ? ["Rule-based limit resolution used capped L'Hopital on a supported ratio form."]
          : [],
      resultOrigin: symbolic.origin,
    };
  }

  const numeric = numericFiniteLimit(input.body, input.variable, input.target, input.direction);
  if (numeric.kind === 'left-unbounded') {
    return { warnings: [], error: input.messages.oneSidedUnboundedError('left') };
  }
  if (numeric.kind === 'right-unbounded') {
    return { warnings: [], error: input.messages.oneSidedUnboundedError('right') };
  }
  if (numeric.kind === 'left-domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.('left') ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'right-domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.('right') ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'unbounded') {
    return {
      warnings: [],
      error: input.messages.oneSidedUnboundedError(
        input.direction === 'right' ? 'right' : 'left',
      ),
    };
  }
  if (numeric.kind === 'domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.(
        input.direction === 'right' ? 'right' : 'left',
      ) ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'mismatch') {
    return { warnings: [], error: input.messages.mismatchError };
  }
  if (numeric.kind !== 'success') {
    return { warnings: [], error: input.messages.unstableError };
  }

  const exactLatex = numberToLatex(numeric.value);
  const approxText = formatApproxNumber(numeric.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: [input.messages.numericFallbackWarning(input.direction)],
    resultOrigin: 'numeric-fallback',
  };
}

export function evaluateInfiniteLimitFromAst(input: {
  body: unknown;
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  messages: InfiniteLimitMessages;
}): CalculusCoreEvaluation {
  const heuristic = resolveInfiniteLimitHeuristic(input.body, input.variable);
  if (heuristic.kind === 'success') {
    return {
      exactLatex: numberToLatex(heuristic.value),
      approxText: formatApproxNumber(heuristic.value),
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
    };
  }

  const targetLabel = input.messages.targetLabel(input.targetKind);
  if (heuristic.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${targetLabel}.`,
    };
  }

  const numeric = numericLimitAtInfinity(
    (value) => evaluateBodyAt(input.body, input.variable, value),
    input.targetKind,
  );

  if (numeric.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${targetLabel}.`,
    };
  }

  if (numeric.kind !== 'success') {
    return {
      warnings: [],
      error: input.messages.unstableError,
    };
  }

  const exactLatex = numberToLatex(numeric.value);
  const approxText = formatApproxNumber(numeric.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: [input.messages.numericFallbackWarning],
    resultOrigin: 'numeric-fallback',
  };
}

export function evaluateNumericDefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  lower: number;
  upper: number;
  unreliableError: string;
}): CalculusCoreEvaluation {
  const result = integrateAdaptiveSimpson(
    (value) => evaluateBodyAt(input.body, input.variable, value),
    input.lower,
    input.upper,
  );
  if (result.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'The numeric integral became too large or too small to display safely.',
    };
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: input.unreliableError,
    };
  }

  const exactLatex = numberToLatex(result.value);
  const approxText = formatApproxNumber(result.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: ['Symbolic integral unavailable; showing a numeric definite integral.'],
    resultOrigin: 'numeric-fallback',
  };
}
