import type { TrigEquationState } from '../../types/calculator';
import type { TrigEvaluation } from './angles';
import { matchBoundedTrigEquation } from './equation-match';
import {
  convertAngle,
  formatDegreesAsUnitLatex,
  formatDegreesAsUnitText,
  parseSupportedRatio,
} from './angles';

const EPSILON = 1e-9;

type TrigEquationKind = 'sin' | 'cos' | 'tan';

function dedupe(values: number[]) {
  return values.filter((value, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - value) < EPSILON) === index,
  );
}

function exactCycleSolutions(kind: TrigEquationKind, value: number) {
  if (kind === 'sin') {
    if (Math.abs(value + 1) < EPSILON) return [270];
    if (Math.abs(value + Math.sqrt(3) / 2) < EPSILON) return [240, 300];
    if (Math.abs(value + Math.SQRT1_2) < EPSILON) return [225, 315];
    if (Math.abs(value + 0.5) < EPSILON) return [210, 330];
    if (Math.abs(value) < EPSILON) return [0, 180];
    if (Math.abs(value - 0.5) < EPSILON) return [30, 150];
    if (Math.abs(value - Math.SQRT1_2) < EPSILON) return [45, 135];
    if (Math.abs(value - Math.sqrt(3) / 2) < EPSILON) return [60, 120];
    if (Math.abs(value - 1) < EPSILON) return [90];
    return undefined;
  }

  if (kind === 'cos') {
    if (Math.abs(value + 1) < EPSILON) return [180];
    if (Math.abs(value + Math.sqrt(3) / 2) < EPSILON) return [150, 210];
    if (Math.abs(value + Math.SQRT1_2) < EPSILON) return [135, 225];
    if (Math.abs(value + 0.5) < EPSILON) return [120, 240];
    if (Math.abs(value) < EPSILON) return [90, 270];
    if (Math.abs(value - 0.5) < EPSILON) return [60, 300];
    if (Math.abs(value - Math.SQRT1_2) < EPSILON) return [45, 315];
    if (Math.abs(value - Math.sqrt(3) / 2) < EPSILON) return [30, 330];
    if (Math.abs(value - 1) < EPSILON) return [0];
    return undefined;
  }

  if (Math.abs(value + Math.sqrt(3)) < EPSILON) return [120];
  if (Math.abs(value + 1) < EPSILON) return [135];
  if (Math.abs(value + Math.sqrt(3) / 3) < EPSILON) return [150];
  if (Math.abs(value) < EPSILON) return [0];
  if (Math.abs(value - Math.sqrt(3) / 3) < EPSILON) return [30];
  if (Math.abs(value - 1) < EPSILON) return [45];
  if (Math.abs(value - Math.sqrt(3)) < EPSILON) return [60];
  return undefined;
}

function numericCycleSolutions(kind: TrigEquationKind, value: number) {
  if (kind === 'sin') {
    const principal = convertAngle(Math.asin(value), 'rad', 'deg');
    return dedupe([principal, 180 - principal]);
  }

  if (kind === 'cos') {
    const principal = convertAngle(Math.acos(value), 'rad', 'deg');
    return dedupe([principal, 360 - principal]);
  }

  return [convertAngle(Math.atan(value), 'rad', 'deg')];
}

function buildExactLatex(solutionsDegrees: number[], coefficient: number, unit: TrigEquationState['angleUnit']) {
  const values = solutionsDegrees
    .map((degrees) => formatDegreesAsUnitLatex(degrees / coefficient, unit));

  return values.length === 1
    ? `x=${values[0]}`
    : `x\\in\\left\\{${values.join(', ')}\\right\\}`;
}

function buildApproxText(solutionsDegrees: number[], coefficient: number, unit: TrigEquationState['angleUnit']) {
  const values = solutionsDegrees
    .map((degrees) => formatDegreesAsUnitText(degrees / coefficient, unit));
  return values.length === 1 ? `x ~= ${values[0]}` : `x ~= ${values.join(', ')}`;
}

function buildPeriodicFamily(kind: TrigEquationKind, solutionsDegrees: number[], coefficient: number, unit: TrigEquationState['angleUnit']) {
  const periodDegrees = kind === 'tan' ? 180 / coefficient : 360 / coefficient;
  const families = solutionsDegrees.map((degrees) => {
    const start = formatDegreesAsUnitText(degrees / coefficient, unit);
    const period = formatDegreesAsUnitText(periodDegrees, unit);
    return `x = ${start} + ${period}*n`;
  });

  return `Periodic families: ${families.join(' or ')}.`;
}

export function solveTrigEquation(state: TrigEquationState): TrigEvaluation {
  const parsed = matchBoundedTrigEquation(state.equationLatex);
  if (!parsed) {
    return {
      error: 'Use a supported equation such as sin(x)=1/2, cos(x)=0, tan(x)=1, or sin(2x)=0.',
      warnings: [],
    };
  }

  const value = parseSupportedRatio(parsed.rhsLatex);
  if (value === null) {
    return {
      error: 'The right-hand side must be a numeric constant or a supported exact trig ratio.',
      warnings: [],
    };
  }

  if ((parsed.kind === 'sin' || parsed.kind === 'cos') && (value < -1 - EPSILON || value > 1 + EPSILON)) {
    return {
      error: 'sin(x)=c and cos(x)=c require c between -1 and 1.',
      warnings: [],
    };
  }

  const exactSolutions = exactCycleSolutions(parsed.kind, value);
  const numericSolutions = exactSolutions ?? numericCycleSolutions(parsed.kind, value);
  const filteredSolutions = dedupe(numericSolutions)
    .filter((degrees) => Number.isFinite(degrees))
    .sort((left, right) => left - right);

  if (filteredSolutions.length === 0) {
    return {
      error: 'No real solutions were found for this trig equation.',
      warnings: [],
    };
  }

  return {
    exactLatex: buildExactLatex(filteredSolutions, parsed.coefficient, state.angleUnit),
    approxText: buildApproxText(filteredSolutions, parsed.coefficient, state.angleUnit),
    warnings: [
      `Angle unit: ${state.angleUnit.toUpperCase()}.`,
      buildPeriodicFamily(parsed.kind, filteredSolutions, parsed.coefficient, state.angleUnit),
    ],
    resultOrigin: exactSolutions ? 'exact-special-angle' : 'numeric',
  };
}
