import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayOutcome,
  DisplayOutcomeAction,
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
} from '../../types/calculator';
import { formatNumber, latexToApproxText } from '../format';
import { solveCircle, solveArcSector } from './circles';
import {
  solveDistance,
  solveLineEquation,
  solveMidpoint,
  solveSlope,
} from './coordinate';
import { parseGeometryDraft } from './parser';
import {
  solveCone,
  solveCube,
  solveCuboid,
  solveCylinder,
  solveRectangle,
  solveSphere,
  solveSquare,
} from './shapes';
import { solveTriangleArea, solveTriangleHeron } from './triangles';
import {
  geometryError,
  geometryResult,
  type GeometryEvaluation,
} from './shared';

type BoxedLike = {
  json: unknown;
  latex: string;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

type ScalarResolution = {
  ok: boolean;
  value: number;
  normalizedLatex: string;
  error: string;
};

type PointResolution = {
  ok: boolean;
  point: { x: string; y: string };
  error: string;
};

type CoordinateResolution = {
  ok: boolean;
  unknown: boolean;
  value: number;
  normalizedLatex: string;
  error: string;
};

const ce = new ComputeEngine();

function requestTitle(request: GeometryRequest): string {
  switch (request.kind) {
    case 'square':
    case 'squareSolveMissing':
      return 'Square';
    case 'rectangle':
    case 'rectangleSolveMissing':
      return 'Rectangle';
    case 'circle':
    case 'circleSolveMissing':
      return 'Circle';
    case 'arcSector':
      return 'Arc and Sector';
    case 'cube':
    case 'cubeSolveMissing':
      return 'Cube';
    case 'cuboid':
      return 'Cuboid';
    case 'cylinder':
    case 'cylinderSolveMissing':
      return 'Cylinder';
    case 'cone':
      return 'Cone';
    case 'sphere':
    case 'sphereSolveMissing':
      return 'Sphere';
    case 'triangleArea':
    case 'triangleAreaSolveMissing':
      return 'Triangle Area';
    case 'triangleHeron':
      return 'Heron';
    case 'distance':
    case 'distanceSolveMissing':
      return 'Distance';
    case 'midpoint':
    case 'midpointSolveMissing':
      return 'Midpoint';
    case 'slope':
    case 'slopeSolveMissing':
      return 'Slope';
    case 'lineEquation':
      return 'Line Equation';
    default:
      return 'Geometry';
  }
}

function toOutcome(parseResult: GeometryParseResult, title = 'Geometry'): DisplayOutcome {
  if (parseResult.ok) {
    return {
      kind: 'error',
      title,
      error: 'Unsupported Geometry state.',
      warnings: [],
    };
  }

  return {
    kind: 'error',
    title,
    error: parseResult.error,
    warnings: [],
  };
}

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();
  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof (numeric.json as { num: unknown }).num === 'string'
  ) {
    const parsed = Number((numeric.json as { num: string }).num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveScalar(latex: string, label: string): ScalarResolution {
  const trimmed = latex.trim();
  if (!trimmed || trimmed === '?') {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `Enter ${label} before evaluating.`,
    };
  }

  try {
    // Geometry solve-missing templates commonly include `pi` in relation values.
    const normalizedForCe = trimmed.replace(/\bpi\b/g, '\\pi');
    const boxed = ce.parse(normalizedForCe) as BoxedLike;
    const value = boxedToFiniteNumber(boxed);
    if (value === undefined) {
      return {
        ok: false,
        value: Number.NaN,
        normalizedLatex: '',
        error: `${label} must evaluate to a finite numeric value.`,
      };
    }

    return {
      ok: true,
      value,
      normalizedLatex: formatNumber(value),
      error: '',
    };
  } catch {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `${label} could not be parsed as a Geometry value.`,
    };
  }
}

function resolvePositiveScalar(latex: string, label: string): ScalarResolution {
  const resolved = resolveScalar(latex, label);
  if (!resolved.ok) {
    return resolved;
  }
  if (!(resolved.value > 0)) {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `${label} must evaluate to a positive numeric value.`,
    };
  }
  return resolved;
}

function resolvePoint(
  point: { xLatex: string; yLatex: string },
  label: string,
): PointResolution {
  const x = resolveScalar(point.xLatex, `${label} x-coordinate`);
  if (!x.ok) {
    return {
      ok: false,
      point: { x: '', y: '' },
      error: x.error,
    };
  }

  const y = resolveScalar(point.yLatex, `${label} y-coordinate`);
  if (!y.ok) {
    return {
      ok: false,
      point: { x: '', y: '' },
      error: y.error,
    };
  }

  return {
    ok: true,
    point: {
      x: x.normalizedLatex,
      y: y.normalizedLatex,
    },
    error: '',
  };
}

type SolveMissingResult = {
  evaluation: GeometryEvaluation;
  handoffEquationLatex?: string;
};

function isUnknownLatex(value: string) {
  return value.trim() === '?';
}

function resolveCoordinateValue(
  valueLatex: string,
  label: string,
): CoordinateResolution {
  if (isUnknownLatex(valueLatex)) {
    return {
      ok: true,
      unknown: true,
      value: Number.NaN,
      normalizedLatex: '?',
      error: '',
    };
  }
  const resolved = resolveScalar(valueLatex, label);
  if (!resolved.ok) {
    return {
      ok: false,
      unknown: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: resolved.error,
    };
  }
  return {
    ok: true,
    unknown: false,
    value: resolved.value,
    normalizedLatex: resolved.normalizedLatex,
    error: '',
  };
}

function solveSquareMissing(request: Extract<GeometryRequest, { kind: 'squareSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.sideLatex)) {
    return { evaluation: geometryError('square solve-missing requires side=? in this milestone.') };
  }

  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Square area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(Math.sqrt(area.value)) }) };
  }
  if (request.perimeterLatex) {
    const perimeter = resolvePositiveScalar(request.perimeterLatex, 'Square perimeter');
    if (!perimeter.ok) {
      return { evaluation: geometryError(perimeter.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(perimeter.value / 4) }) };
  }
  if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Square diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(diagonal.value / Math.SQRT2) }) };
  }

  return { evaluation: geometryError('square(side=?, ...) needs one known relation: area, perimeter, or diagonal.') };
}

function solveCircleMissing(request: Extract<GeometryRequest, { kind: 'circleSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.radiusLatex)) {
    return { evaluation: geometryError('circle solve-missing requires radius=? in this milestone.') };
  }

  if (request.diameterLatex) {
    const diameter = resolvePositiveScalar(request.diameterLatex, 'Circle diameter');
    if (!diameter.ok) {
      return { evaluation: geometryError(diameter.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(diameter.value / 2) }) };
  }
  if (request.circumferenceLatex) {
    const circumference = resolvePositiveScalar(request.circumferenceLatex, 'Circle circumference');
    if (!circumference.ok) {
      return { evaluation: geometryError(circumference.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(circumference.value / (2 * Math.PI)) }) };
  }
  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Circle area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(Math.sqrt(area.value / Math.PI)) }) };
  }

  return { evaluation: geometryError('circle(radius=?, ...) needs one known relation: diameter, circumference, or area.') };
}

function solveCubeMissing(request: Extract<GeometryRequest, { kind: 'cubeSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.sideLatex)) {
    return { evaluation: geometryError('cube solve-missing requires side=? in this milestone.') };
  }

  if (request.volumeLatex) {
    const volume = resolvePositiveScalar(request.volumeLatex, 'Cube volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(Math.cbrt(volume.value)) }) };
  }
  if (request.surfaceAreaLatex) {
    const surfaceArea = resolvePositiveScalar(request.surfaceAreaLatex, 'Cube surface area');
    if (!surfaceArea.ok) {
      return { evaluation: geometryError(surfaceArea.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(Math.sqrt(surfaceArea.value / 6)) }) };
  }
  if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Cube diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(diagonal.value / Math.sqrt(3)) }) };
  }

  return { evaluation: geometryError('cube(side=?, ...) needs one known relation: volume, surfaceArea, or diagonal.') };
}

function solveSphereMissing(request: Extract<GeometryRequest, { kind: 'sphereSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.radiusLatex)) {
    return { evaluation: geometryError('sphere solve-missing requires radius=? in this milestone.') };
  }

  if (request.volumeLatex) {
    const volume = resolvePositiveScalar(request.volumeLatex, 'Sphere volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    return { evaluation: solveSphere({ radius: formatNumber(Math.cbrt((3 * volume.value) / (4 * Math.PI))) }) };
  }
  if (request.surfaceAreaLatex) {
    const surfaceArea = resolvePositiveScalar(request.surfaceAreaLatex, 'Sphere surface area');
    if (!surfaceArea.ok) {
      return { evaluation: geometryError(surfaceArea.error) };
    }
    return { evaluation: solveSphere({ radius: formatNumber(Math.sqrt(surfaceArea.value / (4 * Math.PI))) }) };
  }

  return { evaluation: geometryError('sphere(radius=?, ...) needs one known relation: volume or surfaceArea.') };
}

function solveTriangleAreaMissing(request: Extract<GeometryRequest, { kind: 'triangleAreaSolveMissing' }>): SolveMissingResult {
  const area = resolvePositiveScalar(request.areaLatex, 'Triangle area');
  if (!area.ok) {
    return { evaluation: geometryError(area.error) };
  }

  if (request.unknown === 'base') {
    if (!isUnknownLatex(request.baseLatex)) {
      return { evaluation: geometryError('triangleArea solve-missing base workflow requires base=?') };
    }
    const height = resolvePositiveScalar(request.heightLatex, 'Triangle height');
    if (!height.ok) {
      return { evaluation: geometryError(height.error) };
    }
    return { evaluation: solveTriangleArea({ base: formatNumber((2 * area.value) / height.value), height: height.normalizedLatex }) };
  }

  if (!isUnknownLatex(request.heightLatex)) {
    return { evaluation: geometryError('triangleArea solve-missing height workflow requires height=?') };
  }
  const base = resolvePositiveScalar(request.baseLatex, 'Triangle base');
  if (!base.ok) {
    return { evaluation: geometryError(base.error) };
  }
  return { evaluation: solveTriangleArea({ base: base.normalizedLatex, height: formatNumber((2 * area.value) / base.value) }) };
}

function solveRectangleMissing(request: Extract<GeometryRequest, { kind: 'rectangleSolveMissing' }>): SolveMissingResult {
  const unknown = request.unknown;
  const unknownLatex = unknown === 'width' ? request.widthLatex : request.heightLatex;
  const otherLatex = unknown === 'width' ? request.heightLatex : request.widthLatex;
  if (!isUnknownLatex(unknownLatex)) {
    return { evaluation: geometryError('rectangle solve-missing unknown marker must match width=? or height=?') };
  }
  const other = resolvePositiveScalar(otherLatex, `Rectangle ${unknown === 'width' ? 'height' : 'width'}`);
  if (!other.ok) {
    return { evaluation: geometryError(other.error) };
  }

  let solvedValue: number | null = null;
  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Rectangle area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    solvedValue = area.value / other.value;
  } else if (request.perimeterLatex) {
    const perimeter = resolvePositiveScalar(request.perimeterLatex, 'Rectangle perimeter');
    if (!perimeter.ok) {
      return { evaluation: geometryError(perimeter.error) };
    }
    solvedValue = perimeter.value / 2 - other.value;
  } else if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Rectangle diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    const underRadical = diagonal.value ** 2 - other.value ** 2;
    if (underRadical < 0) {
      return { evaluation: geometryError('No real rectangle dimension fits this diagonal with the known side.') };
    }
    solvedValue = Math.sqrt(Math.max(underRadical, 0));
  }

  if (solvedValue === null) {
    return { evaluation: geometryError('rectangle solve-missing needs one known relation: area, perimeter, or diagonal.') };
  }
  if (!(solvedValue > 0)) {
    return { evaluation: geometryError('Solved rectangle dimension must be positive.') };
  }

  const width = unknown === 'width' ? solvedValue : other.value;
  const height = unknown === 'height' ? solvedValue : other.value;
  return { evaluation: solveRectangle({ width: formatNumber(width), height: formatNumber(height) }) };
}

function solveCylinderMissing(request: Extract<GeometryRequest, { kind: 'cylinderSolveMissing' }>): SolveMissingResult {
  const volume = resolvePositiveScalar(request.volumeLatex, 'Cylinder volume');
  if (!volume.ok) {
    return { evaluation: geometryError(volume.error) };
  }

  if (request.unknown === 'radius') {
    if (!isUnknownLatex(request.radiusLatex)) {
      return { evaluation: geometryError('cylinder solve-missing radius workflow requires radius=?') };
    }
    const height = resolvePositiveScalar(request.heightLatex, 'Cylinder height');
    if (!height.ok) {
      return { evaluation: geometryError(height.error) };
    }
    return { evaluation: solveCylinder({ radius: formatNumber(Math.sqrt(volume.value / (Math.PI * height.value))), height: height.normalizedLatex }) };
  }

  if (!isUnknownLatex(request.heightLatex)) {
    return { evaluation: geometryError('cylinder solve-missing height workflow requires height=?') };
  }
  const radius = resolvePositiveScalar(request.radiusLatex, 'Cylinder radius');
  if (!radius.ok) {
    return { evaluation: geometryError(radius.error) };
  }
  return { evaluation: solveCylinder({ radius: radius.normalizedLatex, height: formatNumber(volume.value / (Math.PI * radius.value ** 2)) }) };
}

function solveDistanceMissing(request: Extract<GeometryRequest, { kind: 'distanceSolveMissing' }>): SolveMissingResult {
  const d = resolvePositiveScalar(request.distanceLatex, 'Distance');
  if (!d.ok) {
    return { evaluation: geometryError(d.error) };
  }
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('distance solve-missing requires exactly one unknown coordinate.') };
  }

  const p1KnownX = p1x.unknown ? null : p1x.value;
  const p1KnownY = p1y.unknown ? null : p1y.value;
  const p2KnownX = p2x.unknown ? null : p2x.value;
  const p2KnownY = p2y.unknown ? null : p2y.value;
  const unknownKey = unknownEntries[0][0];

  const axis = unknownKey.endsWith('x') ? 'x' : 'y';
  const anchor = axis === 'x'
    ? (unknownKey.startsWith('p1') ? p2KnownX : p1KnownX)
    : (unknownKey.startsWith('p1') ? p2KnownY : p1KnownY);
  const fixedDelta = axis === 'x'
    ? ((p2KnownY ?? 0) - (p1KnownY ?? 0))
    : ((p2KnownX ?? 0) - (p1KnownX ?? 0));
  if (anchor === null) {
    return { evaluation: geometryError('distance solve-missing could not identify the known anchor coordinate.') };
  }
  const rhs = d.value ** 2 - fixedDelta ** 2;
  if (rhs < 0) {
    return { evaluation: geometryError('No real solutions because this distance constraint is impossible for the known coordinates.') };
  }
  const variableLabel = unknownKey === 'p1x'
    ? 'x_1'
    : unknownKey === 'p1y'
      ? 'y_1'
      : unknownKey === 'p2x'
        ? 'x_2'
        : 'y_2';

  if (Math.abs(rhs) < 1e-9) {
    return {
      evaluation: geometryResult(
        [
          { label: variableLabel, latex: formatNumber(anchor) },
          { label: 'd', latex: d.normalizedLatex },
        ],
        [],
        'geometry-coordinate',
      ),
    };
  }

  const root = Math.sqrt(rhs);
  const first = anchor + root;
  const second = anchor - root;
  return {
    evaluation: geometryResult(
      [
        { label: `${variableLabel}^{(1)}`, latex: formatNumber(first) },
        { label: `${variableLabel}^{(2)}`, latex: formatNumber(second) },
        { label: 'd', latex: d.normalizedLatex },
      ],
      ['Two real coordinate branches satisfy this distance constraint.'],
      'geometry-coordinate',
    ),
  };
}

function solveMidpointMissing(request: Extract<GeometryRequest, { kind: 'midpointSolveMissing' }>): SolveMissingResult {
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }
  const midX = resolveCoordinateValue(request.mid.xLatex, 'Midpoint x-coordinate');
  if (!midX.ok) {
    return { evaluation: geometryError(midX.error) };
  }
  const midY = resolveCoordinateValue(request.mid.yLatex, 'Midpoint y-coordinate');
  if (!midY.ok) {
    return { evaluation: geometryError(midY.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
    ['mx', midX],
    ['my', midY],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('midpoint solve-missing requires exactly one unknown coordinate.') };
  }
  const unknownKey = unknownEntries[0][0];

  const solved = (() => {
    switch (unknownKey) {
      case 'p1x':
        return 2 * midX.value - p2x.value;
      case 'p1y':
        return 2 * midY.value - p2y.value;
      case 'p2x':
        return 2 * midX.value - p1x.value;
      case 'p2y':
        return 2 * midY.value - p1y.value;
      case 'mx':
        return (p1x.value + p2x.value) / 2;
      default:
        return (p1y.value + p2y.value) / 2;
    }
  })();

  const labelMap: Record<typeof unknownKey, string> = {
    p1x: 'x_1',
    p1y: 'y_1',
    p2x: 'x_2',
    p2y: 'y_2',
    mx: 'm_x',
    my: 'm_y',
  };
  return {
    evaluation: geometryResult(
      [{ label: labelMap[unknownKey], latex: formatNumber(solved) }],
      [],
      'geometry-coordinate',
    ),
  };
}

function solveSlopeMissing(request: Extract<GeometryRequest, { kind: 'slopeSolveMissing' }>): SolveMissingResult {
  const slope = resolveScalar(request.slopeLatex, 'Slope');
  if (!slope.ok) {
    return { evaluation: geometryError(slope.error) };
  }
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('slope solve-missing requires exactly one unknown coordinate.') };
  }
  const unknownKey = unknownEntries[0][0];

  const yDiff = p2y.value - p1y.value;
  const m = slope.value;

  if ((unknownKey === 'p1x' || unknownKey === 'p2x') && Math.abs(m) < 1e-12) {
    if (Math.abs(yDiff) < 1e-9) {
      const equation =
        unknownKey === 'p1x'
          ? `(${formatNumber(p2y.value)}-${formatNumber(p1y.value)})/(${formatNumber(p2x.value)}-x)=0`
          : `(${formatNumber(p2y.value)}-${formatNumber(p1y.value)})/(x-${formatNumber(p1x.value)})=0`;
      return {
        evaluation: geometryError('This slope constraint leaves infinitely many x-values; add another condition to isolate one coordinate.'),
        handoffEquationLatex: equation,
      };
    }
    return { evaluation: geometryError('No real solution for this slope/point combination.') };
  }

  const solved = (() => {
    switch (unknownKey) {
      case 'p1y':
        return p2y.value - m * (p2x.value - p1x.value);
      case 'p2y':
        return p1y.value + m * (p2x.value - p1x.value);
      case 'p1x':
        return p2x.value - (p2y.value - p1y.value) / m;
      default:
        return p1x.value + (p2y.value - p1y.value) / m;
    }
  })();

  const labelMap: Record<typeof unknownKey, string> = {
    p1x: 'x_1',
    p1y: 'y_1',
    p2x: 'x_2',
    p2y: 'y_2',
  };
  return {
    evaluation: geometryResult(
      [
        { label: labelMap[unknownKey], latex: formatNumber(solved) },
        { label: 'm', latex: slope.normalizedLatex },
      ],
      [],
      'geometry-coordinate',
    ),
  };
}

function evaluationToOutcome(
  title: string,
  evaluation: GeometryEvaluation,
  actions?: DisplayOutcomeAction[],
): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
      actions,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
    actions,
  };
}

function solveMissingToOutcome(
  title: string,
  solved: SolveMissingResult,
) {
  const actions =
    solved.handoffEquationLatex && solved.evaluation.error
      ? [{ kind: 'send', target: 'equation', latex: solved.handoffEquationLatex } satisfies DisplayOutcomeAction]
      : undefined;
  return evaluationToOutcome(title, solved.evaluation, actions);
}

function runGeometryRequest(request: GeometryRequest): DisplayOutcome {
  const title = requestTitle(request);

  switch (request.kind) {
    case 'square': {
      const side = resolvePositiveScalar(request.sideLatex, 'Square side');
      if (!side.ok) {
        return { kind: 'error', title, error: side.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSquare({ side: side.normalizedLatex }));
    }
    case 'rectangle': {
      const width = resolvePositiveScalar(request.widthLatex, 'Rectangle width');
      if (!width.ok) {
        return { kind: 'error', title, error: width.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Rectangle height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveRectangle({ width: width.normalizedLatex, height: height.normalizedLatex }));
    }
    case 'circle': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Circle radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCircle({ radius: radius.normalizedLatex }));
    }
    case 'arcSector': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Sector radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const angle = resolvePositiveScalar(request.angleLatex, 'Central angle');
      if (!angle.ok) {
        return { kind: 'error', title, error: angle.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveArcSector({
        radius: radius.normalizedLatex,
        angle: angle.normalizedLatex,
        angleUnit: request.angleUnit,
      }));
    }
    case 'distance': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveDistance({ p1: p1.point, p2: p2.point }));
    }
    case 'midpoint': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveMidpoint({ p1: p1.point, p2: p2.point }));
    }
    case 'slope': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSlope({ p1: p1.point, p2: p2.point }));
    }
    case 'cube': {
      const side = resolvePositiveScalar(request.sideLatex, 'Cube side');
      if (!side.ok) {
        return { kind: 'error', title, error: side.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCube({ side: side.normalizedLatex }));
    }
    case 'cuboid': {
      const length = resolvePositiveScalar(request.lengthLatex, 'Cuboid length');
      if (!length.ok) {
        return { kind: 'error', title, error: length.error, warnings: [] };
      }
      const width = resolvePositiveScalar(request.widthLatex, 'Cuboid width');
      if (!width.ok) {
        return { kind: 'error', title, error: width.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Cuboid height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCuboid({
        length: length.normalizedLatex,
        width: width.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'cylinder': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Cylinder radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Cylinder height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCylinder({
        radius: radius.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'cone': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Cone radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }

      const height =
        request.heightLatex?.trim()
          ? resolvePositiveScalar(request.heightLatex, 'Cone height')
          : null;
      if (height && !height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }

      const slantHeight =
        request.slantHeightLatex?.trim()
          ? resolvePositiveScalar(request.slantHeightLatex, 'Cone slant height')
          : null;
      if (slantHeight && !slantHeight.ok) {
        return { kind: 'error', title, error: slantHeight.error, warnings: [] };
      }

      return evaluationToOutcome(title, solveCone({
        radius: radius.normalizedLatex,
        height: height?.normalizedLatex ?? '',
        slantHeight: slantHeight?.normalizedLatex ?? '',
      }));
    }
    case 'sphere': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Sphere radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSphere({ radius: radius.normalizedLatex }));
    }
    case 'triangleArea': {
      const base = resolvePositiveScalar(request.baseLatex, 'Triangle base');
      if (!base.ok) {
        return { kind: 'error', title, error: base.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Triangle height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveTriangleArea({
        base: base.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'triangleHeron': {
      const a = resolvePositiveScalar(request.aLatex, 'Triangle side a');
      if (!a.ok) {
        return { kind: 'error', title, error: a.error, warnings: [] };
      }
      const b = resolvePositiveScalar(request.bLatex, 'Triangle side b');
      if (!b.ok) {
        return { kind: 'error', title, error: b.error, warnings: [] };
      }
      const c = resolvePositiveScalar(request.cLatex, 'Triangle side c');
      if (!c.ok) {
        return { kind: 'error', title, error: c.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveTriangleHeron({
        a: a.normalizedLatex,
        b: b.normalizedLatex,
        c: c.normalizedLatex,
      }));
    }
    case 'lineEquation': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      const evaluation = solveLineEquation({ p1: p1.point, p2: p2.point, form: request.form });
      return evaluationToOutcome(
        title,
        evaluation,
        evaluation.exactLatex
          ? [{ kind: 'send', target: 'equation', latex: evaluation.exactLatex }]
          : undefined,
      );
    }
    case 'squareSolveMissing':
      return solveMissingToOutcome(title, solveSquareMissing(request));
    case 'circleSolveMissing':
      return solveMissingToOutcome(title, solveCircleMissing(request));
    case 'cubeSolveMissing':
      return solveMissingToOutcome(title, solveCubeMissing(request));
    case 'sphereSolveMissing':
      return solveMissingToOutcome(title, solveSphereMissing(request));
    case 'triangleAreaSolveMissing':
      return solveMissingToOutcome(title, solveTriangleAreaMissing(request));
    case 'rectangleSolveMissing':
      return solveMissingToOutcome(title, solveRectangleMissing(request));
    case 'cylinderSolveMissing':
      return solveMissingToOutcome(title, solveCylinderMissing(request));
    case 'distanceSolveMissing':
      return solveMissingToOutcome(title, solveDistanceMissing(request));
    case 'midpointSolveMissing':
      return solveMissingToOutcome(title, solveMidpointMissing(request));
    case 'slopeSolveMissing':
      return solveMissingToOutcome(title, solveSlopeMissing(request));
  }
}

export function runGeometryCoreDraft(
  rawLatex: string,
  screenHint?: GeometryScreen,
) {
  const parsed = parseGeometryDraft(rawLatex, { screenHint });
  if (!parsed.ok) {
    return {
      outcome: toOutcome(parsed),
      parsed,
    };
  }

  return {
    outcome: runGeometryRequest(parsed.request),
    parsed,
  };
}
