import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayDetailSection,
  RangeProofReason,
  RealRangeInterval,
  SolveDomainConstraint,
} from '../../types/calculator';
import { formatApproxNumber } from '../format';
import { normalizeAst } from '../symbolic-engine/normalize';
import {
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
} from '../symbolic-engine/patterns';
import { parseSupportedRatio } from '../trigonometry/angles';
import { matchTrigCall, matchTrigSquare } from '../trigonometry/normalize';

const ce = new ComputeEngine();
const EPSILON = 1e-9;
const DOMAIN_SAMPLE_STEPS = [1e-1, 5e-2, 1e-2, 5e-3, 1e-3, 5e-4, 1e-4];

export type RealRangeProof =
  | {
      kind: 'exact';
      interval: RealRangeInterval;
      reason: RangeProofReason;
      expressionLatex: string;
    }
  | { kind: 'unknown' };

export type DomainConstraintViolation = {
  constraint: SolveDomainConstraint;
  message: string;
};

export type OneSidedDomainCheck =
  | { kind: 'safe'; constraints: SolveDomainConstraint[] }
  | { kind: 'outside-domain'; constraints: SolveDomainConstraint[]; violation: DomainConstraintViolation }
  | { kind: 'unknown'; constraints: SolveDomainConstraint[] };

export type IntervalDomainCheck =
  | { kind: 'safe'; constraints: SolveDomainConstraint[] }
  | { kind: 'unsafe'; constraints: SolveDomainConstraint[]; value: number; violation: DomainConstraintViolation }
  | { kind: 'unknown'; constraints: SolveDomainConstraint[] };

type LatexEvaluator = (expressionLatex: string, value: number) => number | null;

function interval(min: number, max: number, minInclusive = true, maxInclusive = true): RealRangeInterval {
  return { min, max, minInclusive, maxInclusive };
}

function cleanNumber(value: number) {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < EPSILON ? rounded : value;
}

function formatNumber(value: number) {
  if (Number.isFinite(value)) {
    return `${cleanNumber(value) === value ? formatApproxNumber(value) : cleanNumber(value)}`;
  }

  if (value === Number.POSITIVE_INFINITY) {
    return '\\infty';
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return '-\\infty';
  }

  return `${value}`;
}

export function formatRangeInterval(value: RealRangeInterval) {
  return `${value.minInclusive ? '[' : '('}${formatNumber(value.min)}, ${formatNumber(value.max)}${value.maxInclusive ? ']' : ')'}`;
}

export function intervalsDisjoint(left: RealRangeInterval, right: RealRangeInterval) {
  if (left.max < right.min - EPSILON) {
    return true;
  }
  if (right.max < left.min - EPSILON) {
    return true;
  }
  if (Math.abs(left.max - right.min) < EPSILON && (!left.maxInclusive || !right.minInclusive)) {
    return true;
  }
  if (Math.abs(right.max - left.min) < EPSILON && (!right.maxInclusive || !left.minInclusive)) {
    return true;
  }
  return false;
}

function reflectInterval(value: RealRangeInterval): RealRangeInterval {
  return {
    min: -value.max,
    max: -value.min,
    minInclusive: value.maxInclusive,
    maxInclusive: value.minInclusive,
  };
}

function addIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  return {
    min: left.min + right.min,
    max: left.max + right.max,
    minInclusive: left.minInclusive && right.minInclusive,
    maxInclusive: left.maxInclusive && right.maxInclusive,
  };
}

function scaleInterval(value: RealRangeInterval, scalar: number): RealRangeInterval {
  if (scalar >= 0) {
    return {
      min: value.min * scalar,
      max: value.max * scalar,
      minInclusive: value.minInclusive,
      maxInclusive: value.maxInclusive,
    };
  }

  return {
    min: value.max * scalar,
    max: value.min * scalar,
    minInclusive: value.maxInclusive,
    maxInclusive: value.minInclusive,
  };
}

function safeProduct(left: number, right: number) {
  const product = left * right;
  if (!Number.isNaN(product)) {
    return product;
  }

  return undefined;
}

function multiplyIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  const products = [
    safeProduct(left.min, right.min),
    safeProduct(left.min, right.max),
    safeProduct(left.max, right.min),
    safeProduct(left.max, right.max),
  ].filter((value): value is number => value !== undefined);

  return products.length > 0
    ? interval(Math.min(...products), Math.max(...products))
    : interval(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

function constantValue(node: unknown): number | null {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : value;
}

function exactProof(
  proofInterval: RealRangeInterval,
  reason: RangeProofReason,
  expressionLatex: string,
): RealRangeProof {
  return {
    kind: 'exact',
    interval: proofInterval,
    reason,
    expressionLatex,
  };
}

function isPositiveExponential(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return false;
  }

  const [, base] = normalized;
  if (base === 'ExponentialE') {
    return true;
  }

  const baseValue = constantValue(base);
  return baseValue !== null && baseValue > 0 && Math.abs(baseValue - 1) > EPSILON;
}

export function proveRealRange(node: unknown): RealRangeProof {
  const normalized = normalizeAst(node);
  const expressionLatex = boxLatex(normalized);

  const numeric = constantValue(normalized);
  if (numeric !== null) {
    return exactProof(interval(numeric, numeric), 'affine-bounded', expressionLatex);
  }

  if (isPositiveExponential(normalized)) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY, false, false), 'positive-exponential', expressionLatex);
  }

  const trig = matchTrigCall(normalized);
  if (trig?.kind === 'sin' || trig?.kind === 'cos') {
    return exactProof(interval(-1, 1), 'trig-carrier', expressionLatex);
  }

  const trigSquare = matchTrigSquare(normalized);
  if (trigSquare?.kind === 'sin' || trigSquare?.kind === 'cos') {
    return exactProof(interval(0, 1), 'trig-square', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY), 'principal-root', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY), 'absolute-value', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner = proveRealRange(normalized[1]);
    return inner.kind === 'exact'
      ? exactProof(reflectInterval(inner.interval), inner.reason, expressionLatex)
      : { kind: 'unknown' };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    let current: RealRangeInterval | null = interval(0, 0);
    for (const term of flattenAdd(normalized)) {
      const termProof = proveRealRange(term);
      if (termProof.kind !== 'exact' || !current) {
        return { kind: 'unknown' };
      }
      current = addIntervals(current, termProof.interval);
    }

    return exactProof(current, 'bounded-sum', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let scalar = 1;
    const rangedFactors: RealRangeInterval[] = [];

    for (const factor of flattenMultiply(normalized)) {
      if (isFiniteNumber(factor)) {
        scalar *= factor;
        continue;
      }

      const factorNumeric = constantValue(factor);
      if (factorNumeric !== null) {
        scalar *= factorNumeric;
        continue;
      }

      const proof = proveRealRange(factor);
      if (proof.kind !== 'exact') {
        return { kind: 'unknown' };
      }
      rangedFactors.push(proof.interval);
    }

    let current = interval(1, 1);
    for (const factorRange of rangedFactors) {
      current = multiplyIntervals(current, factorRange);
    }

    current = scaleInterval(current, scalar);
    return exactProof(current, rangedFactors.length > 1 ? 'bounded-product' : 'affine-bounded', expressionLatex);
  }

  return { kind: 'unknown' };
}

function isNegativeNumericExponent(node: unknown) {
  return typeof node === 'number' && Number.isFinite(node) && node < 0;
}

function dedupeConstraints(constraints: SolveDomainConstraint[]) {
  const keyed = new Map<string, SolveDomainConstraint>();
  for (const constraint of constraints) {
    keyed.set(JSON.stringify(constraint), constraint);
  }
  return [...keyed.values()];
}

export function collectRealDomainConstraints(node: unknown): SolveDomainConstraint[] {
  const normalized = normalizeAst(node);
  const constraints: SolveDomainConstraint[] = [];

  const visit = (entry: unknown) => {
    if (!isNodeArray(entry) || entry.length === 0 || typeof entry[0] !== 'string') {
      return;
    }

    const [head, ...children] = entry;
    if (head === 'Divide' && children.length === 2) {
      constraints.push({ kind: 'nonzero', expressionLatex: boxLatex(children[1]) });
    }

    if ((head === 'Ln' || head === 'Log') && children.length >= 1) {
      constraints.push({ kind: 'positive', expressionLatex: boxLatex(children[0]) });
    }

    if (head === 'Sqrt' && children.length === 1) {
      constraints.push({ kind: 'nonnegative', expressionLatex: boxLatex(children[0]) });
    }

    if (head === 'Power' && children.length === 2 && isNegativeNumericExponent(children[1])) {
      constraints.push({ kind: 'nonzero', expressionLatex: boxLatex(children[0]) });
    }

    if ((head === 'Arcsin' || head === 'Arccos') && children.length === 1) {
      constraints.push({
        kind: 'expression-interval',
        expressionLatex: boxLatex(children[0]),
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      });
    }

    for (const child of children) {
      visit(child);
    }
  };

  visit(normalized);
  return dedupeConstraints(constraints);
}

function defaultEvaluateLatexAt(expressionLatex: string, variable: string, value: number) {
  try {
    const parsed = ce.parse(expressionLatex);
    const substituted = parsed.subs({ [variable]: value });
    const evaluated = substituted.evaluate();
    const numeric = evaluated.N?.() ?? evaluated;
    if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
      return numeric.json;
    }
    if (numeric.json && typeof numeric.json === 'object' && 'num' in numeric.json) {
      const parsedNumber = Number((numeric.json as { num: string }).num);
      return Number.isFinite(parsedNumber) ? parsedNumber : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function checkDomainConstraintAtValue(
  constraint: SolveDomainConstraint,
  value: number,
  options: {
    variable?: string;
    evaluateLatex?: LatexEvaluator;
  } = {},
): DomainConstraintViolation | null {
  const variable = options.variable ?? 'x';
  const evaluate = options.evaluateLatex ?? ((expressionLatex, point) => defaultEvaluateLatexAt(expressionLatex, variable, point));

  switch (constraint.kind) {
    case 'interval':
      if (constraint.min !== undefined) {
        if (constraint.minInclusive ? value < constraint.min : value <= constraint.min) {
          return { constraint, message: 'outside the permitted interval' };
        }
      }
      if (constraint.max !== undefined) {
        if (constraint.maxInclusive ? value > constraint.max : value >= constraint.max) {
          return { constraint, message: 'outside the permitted interval' };
        }
      }
      return null;
    case 'nonzero': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || Math.abs(numeric) < EPSILON
        ? { constraint, message: 'would make a denominator zero' }
        : null;
    }
    case 'positive': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || numeric <= 0
        ? { constraint, message: 'would make a logarithm or constrained expression non-positive' }
        : null;
    }
    case 'nonnegative': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || numeric < 0
        ? { constraint, message: 'would make an even root negative' }
        : null;
    }
    case 'expression-interval': {
      const numeric = evaluate(constraint.expressionLatex, value);
      if (numeric === null) {
        return { constraint, message: 'would make a constrained expression non-real' };
      }
      if (constraint.min !== undefined && (constraint.minInclusive ? numeric < constraint.min : numeric <= constraint.min)) {
        return { constraint, message: 'lies outside the permitted expression range' };
      }
      if (constraint.max !== undefined && (constraint.maxInclusive ? numeric > constraint.max : numeric >= constraint.max)) {
        return { constraint, message: 'lies outside the permitted expression range' };
      }
      return null;
    }
    case 'carrier-range':
      return value < constraint.min - EPSILON || value > constraint.max + EPSILON
        ? { constraint, message: 'lies outside the real range of the trig carrier' }
        : null;
    case 'carrier-square-range':
      return value < constraint.min - EPSILON || value > constraint.max + EPSILON
        ? { constraint, message: 'lies outside the real range of the trig square carrier' }
        : null;
    case 'exp-positive':
      return value <= 0
        ? { constraint, message: 'must stay positive for an exponential carrier' }
        : null;
  }
}

export function checkDomainConstraintsAtValue(
  constraints: SolveDomainConstraint[],
  value: number,
  options: {
    variable?: string;
    evaluateLatex?: LatexEvaluator;
  } = {},
) {
  for (const constraint of constraints) {
    const violation = checkDomainConstraintAtValue(constraint, value, options);
    if (violation) {
      return violation;
    }
  }

  return null;
}

export function checkPointRealDomain(input: {
  node: unknown;
  variable?: string;
  value: number;
}): DomainConstraintViolation | null {
  const variable = input.variable ?? 'x';
  return checkDomainConstraintsAtValue(
    collectRealDomainConstraints(input.node),
    input.value,
    { variable },
  );
}

export function checkOneSidedRealDomain(input: {
  node: unknown;
  variable?: string;
  target: number;
  direction: 'left' | 'right';
}): OneSidedDomainCheck {
  const variable = input.variable ?? 'x';
  const constraints = collectRealDomainConstraints(input.node);
  if (constraints.length === 0) {
    return { kind: 'safe', constraints };
  }

  let firstViolation: DomainConstraintViolation | null = null;
  let safeSamples = 0;
  let violatedSamples = 0;

  for (const step of DOMAIN_SAMPLE_STEPS) {
    const samplePoint = input.direction === 'left' ? input.target - step : input.target + step;
    const violation = checkDomainConstraintsAtValue(constraints, samplePoint, { variable });
    if (violation) {
      firstViolation ??= violation;
      violatedSamples += 1;
    } else {
      safeSamples += 1;
    }
  }

  if (safeSamples > 0) {
    return { kind: 'safe', constraints };
  }

  return firstViolation && violatedSamples > 0
    ? { kind: 'outside-domain', constraints, violation: firstViolation }
    : { kind: 'unknown', constraints };
}

export function checkRealIntervalSafety(input: {
  node: unknown;
  variable?: string;
  lower: number;
  upper: number;
}): IntervalDomainCheck {
  const variable = input.variable ?? 'x';
  const constraints = collectRealDomainConstraints(input.node);
  if (constraints.length === 0) {
    return { kind: 'safe', constraints };
  }

  const lower = Math.min(input.lower, input.upper);
  const upper = Math.max(input.lower, input.upper);
  const candidates = new Set<number>([
    lower,
    upper,
    (lower + upper) / 2,
  ]);

  if (lower < 0 && upper > 0) {
    candidates.add(0);
  }
  if (lower <= 1 && upper >= 1) {
    candidates.add(1);
  }
  if (lower <= -1 && upper >= -1) {
    candidates.add(-1);
  }

  for (const value of candidates) {
    const violation = checkDomainConstraintsAtValue(constraints, value, { variable });
    if (violation) {
      return { kind: 'unsafe', constraints, value, violation };
    }
  }

  return { kind: 'safe', constraints };
}

export function domainFactsDetailSection(constraints: SolveDomainConstraint[]): DisplayDetailSection[] | undefined {
  if (constraints.length === 0) {
    return undefined;
  }

  const lines = constraints.map((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return `${constraint.expressionLatex} must stay nonzero.`;
      case 'positive':
        return `${constraint.expressionLatex} must stay positive.`;
      case 'nonnegative':
        return `${constraint.expressionLatex} must stay nonnegative.`;
      case 'expression-interval': {
        const lower = constraint.min === undefined ? '-\\infty' : `${constraint.min}`;
        const upper = constraint.max === undefined ? '\\infty' : `${constraint.max}`;
        return `${constraint.expressionLatex} must stay in ${constraint.minInclusive ? '[' : '('}${lower}, ${upper}${constraint.maxInclusive ? ']' : ')'}.`;
      }
      case 'interval':
        return 'The variable must stay inside the permitted interval.';
      case 'carrier-range':
        return 'The trig carrier target must stay between -1 and 1.';
      case 'carrier-square-range':
        return 'The trig-square carrier target must stay between 0 and 1.';
      case 'exp-positive':
        return 'The exponential carrier target must stay positive.';
    }
  });

  return [{
    title: 'Domain Facts',
    lines,
  }];
}
