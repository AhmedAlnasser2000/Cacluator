import type { TrigEquationState } from '../../types/calculator';
import type { TrigEvaluation } from './angles';
import { formatNumber } from '../format';
import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from './equation-match';
import {
  convertAngle,
  formatDegreesAsUnitLatex,
  formatDegreesAsUnitText,
  parseAngleInput,
} from './angles';

const EPSILON = 1e-9;

type TrigEquationKind = 'sin' | 'cos' | 'tan';

export type TrigPeriodicBranch = {
  latex: string;
  representativeValue: number;
};

export type TrigPeriodicTemplate = {
  kind: TrigEquationKind;
  branches: TrigPeriodicBranch[];
  periodLatex: string;
  periodValue: number;
};

function dedupe(values: number[]) {
  return values.filter((value, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - value) < EPSILON) === index,
  );
}

function toInlineSummaryMath(latex: string) {
  return latex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{([^{}]+)\}/g, '($1)')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDegrees(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return Math.abs(normalized - 360) < EPSILON ? 0 : normalized;
}

function mapCycleDegreesToXDegrees(
  cycleDegrees: number[],
  coefficient: number,
  offsetDegrees: number,
) {
  return dedupe(
    cycleDegrees.map((value) => (value - offsetDegrees) / coefficient),
  ).sort((left, right) => left - right);
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

function buildExactLatex(solutionsDegrees: number[], unit: TrigEquationState['angleUnit']) {
  const values = solutionsDegrees
    .map((degrees) => formatDegreesAsUnitLatex(degrees, unit));

  return values.length === 1
    ? `x=${values[0]}`
    : `x\\in\\left\\{${values.join(', ')}\\right\\}`;
}

function buildApproxText(solutionsDegrees: number[], unit: TrigEquationState['angleUnit']) {
  const values = solutionsDegrees
    .map((degrees) => formatDegreesAsUnitText(degrees, unit));
  return values.length === 1 ? `x ~= ${values[0]}` : `x ~= ${values.join(', ')}`;
}

function formatPeriodicUnitScalarLatex(degrees: number, unit: TrigEquationState['angleUnit']) {
  if (unit === 'rad') {
    return formatDegreesAsUnitLatex(degrees, unit);
  }

  const value = unit === 'deg' ? degrees : convertAngle(degrees, 'deg', unit);
  return formatNumber(value);
}

function buildPeriodicFamily(kind: TrigEquationKind, solutionsDegrees: number[], coefficient: number, unit: TrigEquationState['angleUnit']) {
  const periodDegrees = kind === 'tan' ? 180 / coefficient : 360 / coefficient;
  const families = solutionsDegrees.map((degrees) => {
    const start = formatDegreesAsUnitText(degrees, unit);
    const period = formatDegreesAsUnitText(periodDegrees, unit);
    return `x = ${start} + ${period}*n`;
  });

  return `Periodic families: ${families.join(' or ')}.`;
}

function branchFormulaLatex(baseLatex: string, periodLatex: string) {
  return `${baseLatex}+k\\cdot\\left(${periodLatex}\\right)`;
}

function inverseFamilyBranches(
  kind: TrigEquationKind,
  valueLatex: string,
  value: number,
  unit: TrigEquationState['angleUnit'],
): TrigPeriodicBranch[] {
  if (unit !== 'rad') {
    const startsDegrees = dedupe(numericCycleSolutions(kind, value)).map(normalizeDegrees);
    return startsDegrees.map((degrees) => ({
      latex: branchFormulaLatex(
        formatPeriodicUnitScalarLatex(degrees, unit),
        formatPeriodicUnitScalarLatex(kind === 'tan' ? 180 : 360, unit),
      ),
      representativeValue: unit === 'deg' ? degrees : convertAngle(degrees, 'deg', unit),
    }));
  }

  if (kind === 'sin') {
    const principal = `\\arcsin\\left(${valueLatex}\\right)`;
    return dedupeBranchByLatex([
      { latex: branchFormulaLatex(principal, '2\\pi'), representativeValue: Math.asin(value) },
      { latex: branchFormulaLatex(`\\pi-${principal}`, '2\\pi'), representativeValue: Math.PI - Math.asin(value) },
    ]);
  }

  if (kind === 'cos') {
    const principal = `\\arccos\\left(${valueLatex}\\right)`;
    return dedupeBranchByLatex([
      { latex: branchFormulaLatex(principal, '2\\pi'), representativeValue: Math.acos(value) },
      { latex: branchFormulaLatex(`-${principal}`, '2\\pi'), representativeValue: -Math.acos(value) },
    ]);
  }

  const principal = `\\arctan\\left(${valueLatex}\\right)`;
  return [
    { latex: branchFormulaLatex(principal, '\\pi'), representativeValue: Math.atan(value) },
  ];
}

function dedupeBranchByLatex(branches: TrigPeriodicBranch[]) {
  const seen = new Set<string>();
  return branches.filter((branch) => {
    if (seen.has(branch.latex)) {
      return false;
    }
    seen.add(branch.latex);
    return true;
  });
}

export function buildTrigPeriodicTemplate(
  kind: TrigEquationKind,
  value: number,
  valueLatex: string,
  unit: TrigEquationState['angleUnit'],
): TrigPeriodicTemplate | null {
  if ((kind === 'sin' || kind === 'cos') && (value < -1 - EPSILON || value > 1 + EPSILON)) {
    return null;
  }

  const exactSolutions = exactCycleSolutions(kind, value);
  const periodDegrees = kind === 'tan' ? 180 : 360;
  const periodLatex = formatPeriodicUnitScalarLatex(periodDegrees, unit);
  const periodValue = unit === 'deg' ? periodDegrees : convertAngle(periodDegrees, 'deg', unit);

  const branches = exactSolutions
    ? dedupeBranchByLatex(
        dedupe(exactSolutions)
          .map(normalizeDegrees)
          .map((degrees) => ({
            latex: branchFormulaLatex(formatPeriodicUnitScalarLatex(degrees, unit), periodLatex),
            representativeValue: unit === 'deg' ? degrees : convertAngle(degrees, 'deg', unit),
          })),
      )
    : dedupeBranchByLatex(inverseFamilyBranches(kind, valueLatex, value, unit));

  return {
    kind,
    branches,
    periodLatex,
    periodValue,
  };
}

function solveMixedLinearTrigEquation(state: TrigEquationState): TrigEvaluation | null {
  const parsed = matchBoundedMixedLinearTrigEquation(state.equationLatex);
  if (!parsed) {
    return null;
  }

  const offsetDegrees = parseAngleInput(parsed.argument.offsetLatex, state.angleUnit);
  if (offsetDegrees === null) {
    return {
      error: `The phase-shift term in ${parsed.argument.argumentLatex} must be a numeric angle in ${state.angleUnit.toUpperCase()} units.`,
      warnings: [],
    };
  }

  const amplitude = Math.hypot(parsed.sinCoefficient, parsed.cosCoefficient);
  if (amplitude < EPSILON) {
    return {
      error: 'The mixed trig coefficients collapse to zero and cannot define a bounded solve family.',
      warnings: [],
    };
  }

  const normalizedRhs = parsed.rhsValue / amplitude;
  if (normalizedRhs < -1 - EPSILON || normalizedRhs > 1 + EPSILON) {
    return {
      error: 'No real solutions because the normalized mixed trig target must be between -1 and 1.',
      warnings: [],
    };
  }

  const phaseDegrees = normalizeDegrees(
    convertAngle(Math.atan2(parsed.cosCoefficient, parsed.sinCoefficient), 'rad', 'deg'),
  );
  const shiftedOffset = offsetDegrees + phaseDegrees;
  const syntheticEquation = `\\sin\\left(${parsed.argument.argumentLatex}\\right)=${normalizedRhs}`;
  const syntheticEquationText = toInlineSummaryMath(syntheticEquation);
  const cycleSolutions = exactCycleSolutions('sin', normalizedRhs)
    ?? numericCycleSolutions('sin', normalizedRhs);
  const normalizedCycle = dedupe(cycleSolutions).map(normalizeDegrees);
  const xSolutions = mapCycleDegreesToXDegrees(
    normalizedCycle,
    parsed.argument.coefficient,
    shiftedOffset,
  );

  if (xSolutions.length === 0) {
    return {
      error: 'No real solutions were found for this mixed trig equation.',
      warnings: [],
    };
  }

  return {
    exactLatex: buildExactLatex(xSolutions, state.angleUnit),
    approxText: buildApproxText(xSolutions, state.angleUnit),
    warnings: [
      `Reduced ${parsed.sinCoefficient}sin(A)+${parsed.cosCoefficient}cos(A)=c to Rsin(A+phi)=c with A=${parsed.argument.argumentLatex}.`,
      buildPeriodicFamily('sin', xSolutions, parsed.argument.coefficient, state.angleUnit),
      `Reference normalized equation: ${syntheticEquationText}.`,
    ],
    resultOrigin: exactCycleSolutions('sin', normalizedRhs) ? 'exact-special-angle' : 'numeric',
  };
}

export function solveTrigEquation(state: TrigEquationState): TrigEvaluation {
  const parsed = matchBoundedTrigEquation(state.equationLatex);
  if (!parsed) {
    const mixed = solveMixedLinearTrigEquation(state);
    if (mixed) {
      return mixed;
    }

    return {
      error: 'Use a supported equation such as sin(x)=1/2, cos(x)=0, tan(x)=1, sin(2x)=0, or a*sin(x+b)+b*cos(x+b)=c.',
      warnings: [],
    };
  }

  const offsetDegrees = parseAngleInput(parsed.argument.offsetLatex, state.angleUnit);
  if (offsetDegrees === null) {
    return {
      error: `The phase-shift term in ${parsed.argument.argumentLatex} must be a numeric angle in ${state.angleUnit.toUpperCase()} units.`,
      warnings: [],
    };
  }

  const value = parsed.rhsValue;

  if ((parsed.kind === 'sin' || parsed.kind === 'cos') && (value < -1 - EPSILON || value > 1 + EPSILON)) {
    return {
      error: 'sin(x)=c and cos(x)=c require c between -1 and 1.',
      warnings: [],
    };
  }

  const exactSolutions = exactCycleSolutions(parsed.kind, value);
  const numericSolutions = exactSolutions ?? numericCycleSolutions(parsed.kind, value);
  const filteredSolutions = mapCycleDegreesToXDegrees(
    dedupe(numericSolutions)
      .map(normalizeDegrees),
    parsed.argument.coefficient,
    offsetDegrees,
  )
    .filter((degrees) => Number.isFinite(degrees))
    .sort((left, right) => left - right);

  if (filteredSolutions.length === 0) {
    return {
      error: 'No real solutions were found for this trig equation.',
      warnings: [],
    };
  }

  return {
    exactLatex: buildExactLatex(filteredSolutions, state.angleUnit),
    approxText: buildApproxText(filteredSolutions, state.angleUnit),
    warnings: [
      `Angle unit: ${state.angleUnit.toUpperCase()}.`,
      buildPeriodicFamily(parsed.kind, filteredSolutions, parsed.argument.coefficient, state.angleUnit),
    ],
    resultOrigin: exactSolutions ? 'exact-special-angle' : 'numeric',
  };
}
