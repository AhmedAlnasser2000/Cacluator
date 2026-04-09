import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit, NumericSolveInterval, SolveDomainConstraint } from '../../types/calculator';
import { buildAbsoluteValueNumericGuidance } from '../abs-core';
import { dedupeNumericRoots, validateCandidateRoots } from './candidate-validation';
import { readNumericNode, evaluateLatexAt, equationToZeroFormLatex } from './domain-guards';
import { convertAngle } from '../trigonometry/angles';
import { formatApproxNumber, formatNumber } from '../format';

const SAMPLE_ZERO_TOLERANCE = 1e-7;
const BISECTION_TOLERANCE = 1e-10;
const LOCAL_MIN_SEED_TOLERANCE = 0.15;
const LOCAL_MIN_ACCEPT_TOLERANCE = 1e-6;
const GOLDEN_SECTION_ITERATIONS = 48;
const MIN_SUBDIVISIONS = 8;
const NUMERIC_METHOD_LABEL = 'Bracket-first bisection + local-minimum recovery';
const ce = new ComputeEngine();
const EPSILON = 1e-9;

type SamplePoint = {
  x: number;
  value: number;
};

type NumericDiagnostics = {
  sampleHitCount: number;
  signBracketCount: number;
  localMinSeedCount: number;
  recoveredCandidateCount: number;
};

type DirectTrigEquationInfo = {
  kind: 'sin' | 'cos' | 'tan';
  innerNode: unknown;
  innerLatex: string;
  targetValue: number;
  targetLatex: string;
};

type SampledImage = {
  min: number;
  max: number;
  sawUndefined: boolean;
};

type AffineModel = {
  coefficient: number;
  offset: number;
};

export type NumericIntervalSolveResult =
  | {
      kind: 'success';
      roots: number[];
      rejectedCandidateCount: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
    }
  | {
      kind: 'error';
      error: string;
      rejectedCandidateCount?: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
    };

function parseInterval(interval: NumericSolveInterval) {
  const start = Number(interval.start);
  const end = Number(interval.end);
  const subdivisions = Number(interval.subdivisions);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return { kind: 'error' as const, error: 'Use a numeric interval with Start < End.' };
  }

  if (!Number.isInteger(subdivisions) || subdivisions < MIN_SUBDIVISIONS) {
    return { kind: 'error' as const, error: `Use at least ${MIN_SUBDIVISIONS} subdivisions for numeric solving.` };
  }

  return { kind: 'ok' as const, start, end, subdivisions };
}

function bisectRoot(zeroFormLatex: string, left: number, right: number, angleUnit: AngleUnit) {
  let lo = left;
  let hi = right;
  let loValue = evaluateLatexAt(zeroFormLatex, lo, angleUnit).value;
  let hiValue = evaluateLatexAt(zeroFormLatex, hi, angleUnit).value;

  if (loValue === null || hiValue === null) {
    return null;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (lo + hi) / 2;
    const midValue = evaluateLatexAt(zeroFormLatex, mid, angleUnit).value;
    if (midValue === null) {
      return null;
    }

    if (Math.abs(midValue) <= BISECTION_TOLERANCE || Math.abs(hi - lo) <= BISECTION_TOLERANCE) {
      return mid;
    }

    if (loValue * midValue <= 0) {
      hi = mid;
      hiValue = midValue;
    } else {
      lo = mid;
      loValue = midValue;
    }
  }

  return (lo + hi) / 2;
}

function finiteValue(zeroFormLatex: string, x: number, angleUnit: AngleUnit) {
  const value = evaluateLatexAt(zeroFormLatex, x, angleUnit).value;
  return value !== null && Number.isFinite(value) ? value : null;
}

function localAbsMinimumCandidate(
  zeroFormLatex: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
): SamplePoint | null {
  let lo = left;
  let hi = right;
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const invPhiSq = invPhi * invPhi;

  let x1 = lo + invPhiSq * (hi - lo);
  let x2 = lo + invPhi * (hi - lo);
  let y1Value = finiteValue(zeroFormLatex, x1, angleUnit);
  let y2Value = finiteValue(zeroFormLatex, x2, angleUnit);
  if (y1Value === null || y2Value === null) {
    return null;
  }

  let y1 = Math.abs(y1Value);
  let y2 = Math.abs(y2Value);

  for (let iteration = 0; iteration < GOLDEN_SECTION_ITERATIONS; iteration += 1) {
    if (y1 <= y2) {
      hi = x2;
      x2 = x1;
      y2 = y1;
      x1 = lo + invPhiSq * (hi - lo);
      y1Value = finiteValue(zeroFormLatex, x1, angleUnit);
      if (y1Value === null) {
        return null;
      }
      y1 = Math.abs(y1Value);
    } else {
      lo = x1;
      x1 = x2;
      y1 = y2;
      x2 = lo + invPhi * (hi - lo);
      y2Value = finiteValue(zeroFormLatex, x2, angleUnit);
      if (y2Value === null) {
        return null;
      }
      y2 = Math.abs(y2Value);
    }
  }

  const x = (lo + hi) / 2;
  const value = finiteValue(zeroFormLatex, x, angleUnit);
  if (value === null) {
    return null;
  }

  return { x, value };
}

function numericSummary(
  interval: NumericSolveInterval,
  subdivisions: number,
  diagnostics: NumericDiagnostics,
) {
  return `Numeric solve on [${interval.start}, ${interval.end}] with ${subdivisions} subdivisions (${NUMERIC_METHOD_LABEL}; sample hits: ${diagnostics.sampleHitCount}, sign brackets: ${diagnostics.signBracketCount}, local-min seeds: ${diagnostics.localMinSeedCount}).`;
}

function isNearAny(value: number, pool: number[], tolerance = 1e-6) {
  return pool.some((candidate) => Math.abs(candidate - value) <= tolerance);
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function parseNumericNode(node: unknown) {
  const numeric = evaluateRealNode(node);
  if (numeric === null || !Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function evaluateRealNode(node: unknown) {
  const boxed = ce.box(node as Parameters<typeof ce.box>[0]).evaluate();
  const numeric = boxed.N?.() ?? boxed;
  const direct = readNumericNode(numeric.json);
  if (direct !== null) {
    return direct;
  }
  return readNumericNode(boxed.json);
}

function parseDirectTrigEquation(equationLatex: string): DirectTrigEquationInfo | null {
  const parsed = ce.parse(equationLatex);
  const json = parsed.json;
  if (!isNodeArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  const matchSide = (candidate: unknown, other: unknown): DirectTrigEquationInfo | null => {
    if (!isNodeArray(candidate) || candidate.length !== 2 || typeof candidate[0] !== 'string') {
      return null;
    }

    const kind =
      candidate[0] === 'Sin'
        ? 'sin'
        : candidate[0] === 'Cos'
          ? 'cos'
          : candidate[0] === 'Tan'
            ? 'tan'
            : null;

    if (!kind) {
      return null;
    }

    const targetValue = parseNumericNode(other);
    if (targetValue === null) {
      return null;
    }

    return {
      kind,
      innerNode: candidate[1],
      innerLatex: boxLatex(candidate[1]),
      targetValue,
      targetLatex: boxLatex(other),
    };
  };

  return matchSide(json[1], json[2]) ?? matchSide(json[2], json[1]);
}

function sampleInnerImage(
  innerLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
): SampledImage | null {
  const sampleCount = Math.max(MIN_SUBDIVISIONS, Math.min(subdivisions, 128));
  const step = (end - start) / sampleCount;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let finiteCount = 0;
  let sawUndefined = false;

  for (let index = 0; index <= sampleCount; index += 1) {
    const x = start + step * index;
    const value = evaluateLatexAt(innerLatex, x, angleUnit).value;
    if (value === null || !Number.isFinite(value)) {
      sawUndefined = true;
      continue;
    }
    finiteCount += 1;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (finiteCount === 0) {
    return null;
  }

  return { min, max, sawUndefined };
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
  };
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
      if (solutions.size > 12) {
        return null;
      }
    }
  }

  return dedupeNumericRoots([...solutions]);
}

function formatApproxInterval(min: number, max: number) {
  return `[${formatApproxNumber(min)}, ${formatApproxNumber(max)}]`;
}

function formatAngleValueText(value: number, unit: AngleUnit) {
  return `${formatNumber(value)} ${unit}`;
}

function formatTrigBranchFamily(kind: 'sin' | 'cos' | 'tan', target: number, angleUnit: AngleUnit) {
  const principal = principalTrigBranches(kind, target, angleUnit);
  if (!principal || principal.length === 0) {
    return null;
  }
  const periodText = formatAngleValueText(
    kind === 'tan'
      ? angleUnit === 'deg'
        ? 180
        : angleUnit === 'grad'
          ? 200
          : Math.PI
      : angleUnit === 'deg'
        ? 360
        : angleUnit === 'grad'
          ? 400
          : Math.PI * 2,
    angleUnit,
  );

  if (kind === 'tan') {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k`;
  }

  if (kind === 'sin' && principal.length >= 2) {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k or ${formatAngleValueText(principal[1], angleUnit)} + ${periodText} * k`;
  }

  if (kind === 'cos' && principal.length >= 2) {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k or ${formatAngleValueText(principal[1], angleUnit)} + ${periodText} * k`;
  }

  return formatAngleValueText(principal[0], angleUnit);
}

function parseAffine(node: unknown): AffineModel | null {
  if (node === 'x') {
    return { coefficient: 1, offset: 0 };
  }
  if (isNodeArray(node) && node.length === 2 && node[0] === 'Negate' && node[1] === 'x') {
    return { coefficient: -1, offset: 0 };
  }
  if (isNodeArray(node) && node.length === 3 && node[0] === 'Multiply') {
    if (node[1] === 'x') {
      const coefficient = parseNumericNode(node[2]);
      return coefficient === null ? null : { coefficient, offset: 0 };
    }
    if (node[2] === 'x') {
      const coefficient = parseNumericNode(node[1]);
      return coefficient === null ? null : { coefficient, offset: 0 };
    }
  }
  if (isNodeArray(node) && node.length === 3 && (node[0] === 'Add' || node[0] === 'Subtract')) {
    const left = parseAffine(node[1]);
    const right = parseAffine(node[2]);
    const leftConstant = parseNumericNode(node[1]);
    const rightConstant = parseNumericNode(node[2]);

    if (left && rightConstant !== null) {
      return {
        coefficient: left.coefficient,
        offset: node[0] === 'Add' ? left.offset + rightConstant : left.offset - rightConstant,
      };
    }
    if (right && leftConstant !== null) {
      return {
        coefficient: node[0] === 'Add' ? right.coefficient : -right.coefficient,
        offset: node[0] === 'Add' ? right.offset + leftConstant : leftConstant - right.offset,
      };
    }
  }
  return null;
}

function estimateBranchX(innerNode: unknown, branchValue: number): number | null {
  const affine = parseAffine(innerNode);
  if (affine && Math.abs(affine.coefficient) > EPSILON) {
    return (branchValue - affine.offset) / affine.coefficient;
  }

  if (isNodeArray(innerNode) && innerNode.length === 2 && innerNode[0] === 'Ln') {
    const innerAffine = parseAffine(innerNode[1]);
    if (innerAffine && Math.abs(innerAffine.coefficient) > EPSILON) {
      return (Math.exp(branchValue) - innerAffine.offset) / innerAffine.coefficient;
    }
  }

  if (isNodeArray(innerNode) && innerNode.length === 2 && innerNode[0] === 'Exp') {
    const innerAffine = parseAffine(innerNode[1]);
    if (innerAffine && Math.abs(innerAffine.coefficient) > EPSILON && branchValue > 0) {
      return (Math.log(branchValue) - innerAffine.offset) / innerAffine.coefficient;
    }
  }

  return null;
}

function principalTrigBranches(kind: 'sin' | 'cos' | 'tan', target: number, angleUnit: AngleUnit) {
  const fullPeriod = kind === 'tan'
    ? angleUnit === 'deg'
      ? 180
      : angleUnit === 'grad'
        ? 200
        : Math.PI
    : angleUnit === 'deg'
      ? 360
      : angleUnit === 'grad'
        ? 400
        : Math.PI * 2;
  return solveTrigOnInterval(kind, target, 0, fullPeriod, angleUnit);
}

function buildTrigNoRootGuidance(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const trigInfo = parseDirectTrigEquation(equationLatex);
  if (!trigInfo) {
    return null;
  }

  const sampledImage = sampleInnerImage(trigInfo.innerLatex, start, end, subdivisions, angleUnit);
  const branchFamily = formatTrigBranchFamily(trigInfo.kind, trigInfo.targetValue, angleUnit);

  if (!sampledImage) {
    const branchText = branchFamily
      ? ` ${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} needs ${trigInfo.innerLatex} near ${branchFamily}.`
      : '';
    return `The chosen interval did not produce any finite values for ${trigInfo.innerLatex}; the real-domain requirement may be excluding this entire interval.${branchText}`;
  }

  const outerImage = composeTrigImage(trigInfo.kind, sampledImage.min, sampledImage.max, angleUnit);
  const branchValues = solveTrigOnInterval(trigInfo.kind, trigInfo.targetValue, sampledImage.min, sampledImage.max, angleUnit);
  const sampledImageText = `${trigInfo.innerLatex} stays about in ${formatApproxInterval(sampledImage.min, sampledImage.max)} over [${formatApproxNumber(start)}, ${formatApproxNumber(end)}]`;
  const principalBranches = principalTrigBranches(trigInfo.kind, trigInfo.targetValue, angleUnit);

  if (branchValues && branchValues.length === 0) {
    const branchText = branchFamily
      ? `${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} in ${angleUnit.toUpperCase()} needs ${trigInfo.innerLatex} near ${branchFamily}.`
      : '';
    const estimate = principalBranches && principalBranches.length > 0
      ? estimateBranchX(trigInfo.innerNode, principalBranches[0])
      : null;
    const estimateText = estimate !== null && Number.isFinite(estimate)
      ? ` A first branch estimate is x ≈ ${formatApproxNumber(estimate)}.`
      : '';
    const outerText = outerImage
      ? ` ${trigInfo.kind}(${trigInfo.innerLatex}) therefore stays about in ${formatApproxInterval(outerImage.min, outerImage.max)} on this interval.`
      : '';
    return `${sampledImageText}, so this interval misses the needed ${trigInfo.kind} branch values. ${branchText}${outerText}${estimateText}`.trim();
  }

  if (sampledImage.sawUndefined) {
    return `${sampledImageText}, but parts of the interval leave the real domain. Narrow the interval to a domain-valid slice before retrying.`;
  }

  return `${sampledImageText}. ${branchFamily ? `${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} in ${angleUnit.toUpperCase()} needs ${trigInfo.innerLatex} near ${branchFamily}.` : ''}`.trim();
}

export function runNumericIntervalSolve(
  equationLatex: string,
  interval: NumericSolveInterval,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): NumericIntervalSolveResult {
  const parsed = parseInterval(interval);
  const emptyDiagnostics: NumericDiagnostics = {
    sampleHitCount: 0,
    signBracketCount: 0,
    localMinSeedCount: 0,
    recoveredCandidateCount: 0,
  };

  if (parsed.kind === 'error') {
    return {
      kind: 'error',
      error: parsed.error,
      summaryText: `Numeric solve unavailable (${NUMERIC_METHOD_LABEL}).`,
      method: NUMERIC_METHOD_LABEL,
      diagnostics: emptyDiagnostics,
    };
  }

  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const step = (parsed.end - parsed.start) / parsed.subdivisions;
  const samples: SamplePoint[] = [];
  const sampleHits: number[] = [];
  const signBracketRoots: number[] = [];
  const localMinSeeds: number[] = [];
  let previousFinite: SamplePoint | null = null;

  for (let index = 0; index <= parsed.subdivisions; index += 1) {
    const x = parsed.start + step * index;
    const value = finiteValue(zeroFormLatex, x, angleUnit);
    if (value === null) {
      previousFinite = null;
      continue;
    }

    const sample = { x, value };
    samples.push(sample);

    if (Math.abs(value) <= SAMPLE_ZERO_TOLERANCE) {
      sampleHits.push(x);
    }

    if (previousFinite && previousFinite.value * value < 0) {
      const root = bisectRoot(zeroFormLatex, previousFinite.x, x, angleUnit);
      if (root !== null) {
        signBracketRoots.push(root);
      }
    }

    previousFinite = sample;
  }

  for (let index = 1; index < samples.length - 1; index += 1) {
    const left = samples[index - 1];
    const middle = samples[index];
    const right = samples[index + 1];
    const leftAbs = Math.abs(left.value);
    const middleAbs = Math.abs(middle.value);
    const rightAbs = Math.abs(right.value);

    if (middleAbs > LOCAL_MIN_SEED_TOLERANCE) {
      continue;
    }
    if (!(middleAbs <= leftAbs && middleAbs <= rightAbs)) {
      continue;
    }

    const localCandidate = localAbsMinimumCandidate(zeroFormLatex, left.x, right.x, angleUnit);
    if (!localCandidate) {
      continue;
    }
    if (Math.abs(localCandidate.value) <= LOCAL_MIN_ACCEPT_TOLERANCE) {
      localMinSeeds.push(localCandidate.x);
    }
  }

  const allCandidates = dedupeNumericRoots([
    ...sampleHits,
    ...signBracketRoots,
    ...localMinSeeds,
  ]);

  const validated = validateCandidateRoots(equationLatex, allCandidates, constraints, 'numeric-interval', angleUnit);
  const recoveredCandidateCount = validated.accepted.filter((value) =>
    isNearAny(value, localMinSeeds) && !isNearAny(value, [...sampleHits, ...signBracketRoots])).length;

  const diagnostics: NumericDiagnostics = {
    sampleHitCount: sampleHits.length,
    signBracketCount: signBracketRoots.length,
    localMinSeedCount: localMinSeeds.length,
    recoveredCandidateCount,
  };

  const summary = numericSummary(interval, parsed.subdivisions, diagnostics);

  if (validated.accepted.length === 0) {
    const noSeededCandidates = allCandidates.length === 0;
    const guidance = 'Try widening the interval, shifting the interval center, or increasing subdivisions.';
    const trigGuidance = noSeededCandidates
      ? buildTrigNoRootGuidance(equationLatex, parsed.start, parsed.end, parsed.subdivisions, angleUnit)
      : null;
    const absGuidance = noSeededCandidates
      ? buildAbsoluteValueNumericGuidance(
        equationLatex,
        parsed.start,
        parsed.end,
        parsed.subdivisions,
        angleUnit,
      )
      : null;
    return {
      kind: 'error',
      error: noSeededCandidates
        ? `No bracketed or near-zero real roots were found on the chosen interval. ${guidance}${trigGuidance ? ` ${trigGuidance}` : ''}${absGuidance ? ` ${absGuidance}` : ''}`
        : `Candidate roots were found but rejected after substitution back into the original equation. ${guidance}`,
      rejectedCandidateCount: validated.rejected.length,
      summaryText: summary,
      method: NUMERIC_METHOD_LABEL,
      diagnostics,
    };
  }

  const accepted = dedupeNumericRoots(validated.accepted);
  return {
    kind: 'success',
    roots: accepted,
    rejectedCandidateCount: validated.rejected.length,
    summaryText: `${summary} Accepted ${accepted.length} root(s)${validated.rejected.length > 0 ? `, rejected ${validated.rejected.length}.` : '.'}${recoveredCandidateCount > 0 ? ` Recovered ${recoveredCandidateCount} non-bracket root(s).` : ''}`,
    method: NUMERIC_METHOD_LABEL,
    diagnostics,
  };
}
