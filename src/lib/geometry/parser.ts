import type {
  AngleUnit,
  CoreDraftStyle,
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
  LineEquationState,
} from '../../types/calculator';

type GeometryParseOptions = {
  screenHint?: GeometryScreen;
};

function normalizeGeometrySource(source: string) {
  return source
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\operatorname\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replaceAll('P_1', 'P1')
    .replaceAll('P_2', 'P2')
    .replaceAll('\\ ', ' ')
    .replace(/\s+/g, ' ');
}

function splitTopLevel(source: string, delimiter = ',') {
  const segments: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of source) {
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (char === delimiter && depth === 0) {
      segments.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function splitAssignment(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    } else if (char === '=' && depth === 0) {
      return {
        key: source.slice(0, index).trim(),
        value: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

function stripOuterParens(source: string) {
  const trimmed = source.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parsePoint(source: string) {
  const body = stripOuterParens(source);
  const parts = splitTopLevel(body);
  if (parts.length !== 2) {
    return null;
  }

  return {
    xLatex: parts[0].trim(),
    yLatex: parts[1].trim(),
  };
}

function parseAssignments(source: string) {
  const entries = splitTopLevel(source);
  const assignments = new Map<string, string>();
  for (const entry of entries) {
    const assignment = splitAssignment(entry);
    if (!assignment) {
      return null;
    }
    assignments.set(assignment.key.toLowerCase().replaceAll(' ', ''), assignment.value);
  }

  return assignments;
}

function isUnknownValue(value?: string): value is string {
  return value?.trim() === '?';
}

function countUnknownValues(values: Array<string | undefined>) {
  return values.reduce((count, value) => (isUnknownValue(value) ? count + 1 : count), 0);
}

function parseLineForm(value?: string): LineEquationState['form'] | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll('_', '-');

  if (normalized === 'slope-intercept' || normalized === 'slopeintercept') {
    return 'slope-intercept';
  }
  if (normalized === 'point-slope' || normalized === 'pointslope') {
    return 'point-slope';
  }
  if (normalized === 'standard') {
    return 'standard';
  }

  return null;
}

function kindFromFunctionName(name: string): GeometryRequest['kind'] | null {
  switch (name.toLowerCase().replaceAll(' ', '')) {
    case 'square':
      return 'square';
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'arcsector':
    case 'sector':
      return 'arcSector';
    case 'cube':
      return 'cube';
    case 'cuboid':
      return 'cuboid';
    case 'cylinder':
      return 'cylinder';
    case 'cone':
      return 'cone';
    case 'sphere':
      return 'sphere';
    case 'trianglearea':
      return 'triangleArea';
    case 'triangleheron':
      return 'triangleHeron';
    case 'distance':
      return 'distance';
    case 'midpoint':
      return 'midpoint';
    case 'slope':
      return 'slope';
    case 'lineequation':
    case 'line':
      return 'lineEquation';
    default:
      return null;
  }
}

function familyHint(screenHint?: GeometryScreen) {
  if (!screenHint) {
    return 'none' as const;
  }

  if (screenHint === 'square' || screenHint === 'rectangle' || screenHint === 'shapes2dHome') {
    return 'shape2d' as const;
  }
  if (
    screenHint === 'cube'
    || screenHint === 'cuboid'
    || screenHint === 'cylinder'
    || screenHint === 'cone'
    || screenHint === 'sphere'
    || screenHint === 'shapes3dHome'
  ) {
    return 'shape3d' as const;
  }
  if (
    screenHint === 'triangleArea'
    || screenHint === 'triangleHeron'
    || screenHint === 'triangleHome'
  ) {
    return 'triangle' as const;
  }
  if (screenHint === 'circle' || screenHint === 'arcSector' || screenHint === 'circleHome') {
    return 'circle' as const;
  }
  if (
    screenHint === 'distance'
    || screenHint === 'midpoint'
    || screenHint === 'slope'
    || screenHint === 'lineEquation'
    || screenHint === 'coordinateHome'
  ) {
    return 'coordinate' as const;
  }

  return 'none' as const;
}

export function geometryRequestToScreen(request: GeometryRequest): GeometryScreen {
  switch (request.kind) {
    case 'square':
      return 'square';
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'arcSector':
      return 'arcSector';
    case 'cube':
      return 'cube';
    case 'cuboid':
      return 'cuboid';
    case 'cylinder':
      return 'cylinder';
    case 'cone':
      return 'cone';
    case 'sphere':
      return 'sphere';
    case 'triangleArea':
      return 'triangleArea';
    case 'triangleHeron':
      return 'triangleHeron';
    case 'distance':
      return 'distance';
    case 'midpoint':
      return 'midpoint';
    case 'slope':
      return 'slope';
    case 'lineEquation':
      return 'lineEquation';
    case 'squareSolveMissing':
      return 'square';
    case 'circleSolveMissing':
      return 'circle';
    case 'cubeSolveMissing':
      return 'cube';
    case 'sphereSolveMissing':
      return 'sphere';
    case 'triangleAreaSolveMissing':
      return 'triangleArea';
    case 'rectangleSolveMissing':
      return 'rectangle';
    case 'cylinderSolveMissing':
      return 'cylinder';
    case 'distanceSolveMissing':
      return 'distance';
    case 'midpointSolveMissing':
      return 'midpoint';
    case 'slopeSolveMissing':
      return 'slope';
  }
}

function parseStructured(source: string): GeometryParseResult | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)\((.*)\)$/.exec(source);
  if (!match) {
    return null;
  }

  const [, functionName, argumentSource] = match;
  const kind = kindFromFunctionName(functionName);
  if (kind === null) {
    return {
      ok: false,
      error: 'Use a supported Geometry request such as square(...), cube(...), triangleArea(...), distance(...), or lineEquation(...).',
    };
  }

  const assignments = parseAssignments(argumentSource);
  if (!assignments) {
    return {
      ok: false,
      error: 'Geometry requests use comma-separated key=value arguments.',
    };
  }

  const hasWidthKey = assignments.has('width') || assignments.has('w');
  const rawL = assignments.get('l');
  const lengthLatex = assignments.get('length') ?? (hasWidthKey ? rawL : undefined);
  const slantHeightLatex =
    assignments.get('slantheight')
    ?? assignments.get('slant')
    ?? (assignments.get('radius') || assignments.get('r') ? rawL : undefined);
  const explicitBaseLatex = assignments.get('base');
  const areaLatex = assignments.get('area');
  const perimeterLatex = assignments.get('perimeter') ?? assignments.get('p');
  const diagonalLatex = assignments.get('diagonal') ?? assignments.get('d');
  const diameterLatex = assignments.get('diameter') ?? assignments.get('d');
  const circumferenceLatex = assignments.get('circumference') ?? assignments.get('c');
  const volumeLatex = assignments.get('volume') ?? assignments.get('v');
  const surfaceAreaLatex = assignments.get('surfacearea') ?? assignments.get('sa') ?? assignments.get('surface');
  const aLatex = assignments.get('a');
  const cLatex = assignments.get('c');
  const baseLatex = explicitBaseLatex ?? (!aLatex && !cLatex ? assignments.get('b') : undefined);
  const distanceLatex = assignments.get('distance') ?? assignments.get('d');
  const midpointLatex = assignments.get('mid') ?? assignments.get('m');
  const slopeLatex = assignments.get('slope') ?? assignments.get('m');

  const pointPair = () => {
    const p1 = parsePoint(assignments.get('p1') ?? '');
    const p2 = parsePoint(assignments.get('p2') ?? '');
    const form = parseLineForm(assignments.get('form'));
    if (!p1 || !p2) {
      return null;
    }
    return { p1, p2, form };
  };

  switch (kind) {
    case 'square': {
      const sideLatex = assignments.get('side') ?? assignments.get('s');
      const unknownCount = countUnknownValues([
        sideLatex,
        areaLatex,
        perimeterLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in square(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(sideLatex)) {
        return { ok: false, error: 'square(...) solve-missing supports ? on side only.' };
      }
      if (isUnknownValue(sideLatex)) {
        const knownEntries = [
          ['area', areaLatex],
          ['perimeter', perimeterLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'square(side=?, ...) needs exactly one known relation: area, perimeter, or diagonal.' };
        }
        return {
          ok: true,
          request: {
            kind: 'squareSolveMissing',
            sideLatex,
            ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return sideLatex
        ? { ok: true, request: { kind, sideLatex }, style: 'structured' }
        : { ok: false, error: 'square(...) needs side=...' };
    }
    case 'rectangle': {
      const widthLatex = assignments.get('width') ?? assignments.get('w');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        widthLatex,
        heightLatex,
        areaLatex,
        perimeterLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in rectangle(...).' };
      }
      if (unknownCount === 1) {
        if (!isUnknownValue(widthLatex) && !isUnknownValue(heightLatex)) {
          return { ok: false, error: 'rectangle(...) solve-missing supports ? on width or height only.' };
        }
        const unknown = isUnknownValue(widthLatex) ? 'width' : 'height';
        const knownSideLatex = unknown === 'width' ? heightLatex : widthLatex;
        if (!knownSideLatex || isUnknownValue(knownSideLatex)) {
          return { ok: false, error: 'rectangle(...) solve-missing needs the other side as a known value.' };
        }
        const knownEntries = [
          ['area', areaLatex],
          ['perimeter', perimeterLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'rectangle(..., ? , ...) needs exactly one known relation: area, perimeter, or diagonal.' };
        }
        return {
          ok: true,
          request: {
            kind: 'rectangleSolveMissing',
            widthLatex: widthLatex ?? '?',
            heightLatex: heightLatex ?? '?',
            unknown,
            ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return widthLatex && heightLatex
        ? { ok: true, request: { kind, widthLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'rectangle(...) needs width=... and height=...' };
    }
    case 'circle': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const unknownCount = countUnknownValues([
        radiusLatex,
        diameterLatex,
        circumferenceLatex,
        areaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in circle(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(radiusLatex)) {
        return { ok: false, error: 'circle(...) solve-missing supports ? on radius only.' };
      }
      if (isUnknownValue(radiusLatex)) {
        const knownEntries = [
          ['diameter', diameterLatex],
          ['circumference', circumferenceLatex],
          ['area', areaLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'circle(radius=?, ...) needs exactly one known relation: diameter, circumference, or area.' };
        }
        return {
          ok: true,
          request: {
            kind: 'circleSolveMissing',
            radiusLatex,
            ...(knownEntries[0][0] === 'diameter' ? { diameterLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'circumference' ? { circumferenceLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return radiusLatex
        ? { ok: true, request: { kind, radiusLatex }, style: 'structured' }
        : { ok: false, error: 'circle(...) needs radius=...' };
    }
    case 'arcSector': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const angleLatex = assignments.get('angle') ?? assignments.get('theta');
      const angleUnit = (assignments.get('unit') ?? assignments.get('angleunit') ?? 'deg') as AngleUnit;
      if (!radiusLatex || !angleLatex || !['deg', 'rad', 'grad'].includes(angleUnit)) {
        return { ok: false, error: 'arcSector(...) needs radius=..., angle=..., and unit=deg|rad|grad.' };
      }
      return { ok: true, request: { kind, radiusLatex, angleLatex, angleUnit }, style: 'structured' };
    }
    case 'cube': {
      const sideLatex = assignments.get('side') ?? assignments.get('s');
      const unknownCount = countUnknownValues([
        sideLatex,
        volumeLatex,
        surfaceAreaLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cube(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(sideLatex)) {
        return { ok: false, error: 'cube(...) solve-missing supports ? on side only.' };
      }
      if (isUnknownValue(sideLatex)) {
        const knownEntries = [
          ['volume', volumeLatex],
          ['surfaceArea', surfaceAreaLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'cube(side=?, ...) needs exactly one known relation: volume, surfaceArea, or diagonal.' };
        }
        return {
          ok: true,
          request: {
            kind: 'cubeSolveMissing',
            sideLatex,
            ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return sideLatex
        ? { ok: true, request: { kind, sideLatex }, style: 'structured' }
        : { ok: false, error: 'cube(...) needs side=...' };
    }
    case 'cuboid': {
      const widthLatex = assignments.get('width') ?? assignments.get('w');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      return lengthLatex && widthLatex && heightLatex
        ? { ok: true, request: { kind, lengthLatex, widthLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'cuboid(...) needs length=..., width=..., and height=...' };
    }
    case 'cylinder': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        radiusLatex,
        heightLatex,
        volumeLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cylinder(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(radiusLatex)
          ? 'radius'
          : isUnknownValue(heightLatex)
            ? 'height'
            : null;
        if (!unknown) {
          return { ok: false, error: 'cylinder(...) solve-missing supports ? on radius or height only.' };
        }
        if (!volumeLatex || isUnknownValue(volumeLatex)) {
          return { ok: false, error: 'cylinder(..., ? , ...) needs a known volume value.' };
        }
        const knownOther = unknown === 'radius' ? heightLatex : radiusLatex;
        if (!knownOther || isUnknownValue(knownOther)) {
          return { ok: false, error: 'cylinder(...) solve-missing needs the other dimension as a known value.' };
        }
        return {
          ok: true,
          request: {
            kind: 'cylinderSolveMissing',
            radiusLatex: radiusLatex ?? '?',
            heightLatex: heightLatex ?? '?',
            volumeLatex,
            unknown,
          },
          style: 'structured',
        };
      }
      return radiusLatex && heightLatex
        ? { ok: true, request: { kind, radiusLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'cylinder(...) needs radius=... and height=...' };
    }
    case 'cone': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      if (!radiusLatex || (!heightLatex && !slantHeightLatex)) {
        return { ok: false, error: 'cone(...) needs radius=... plus height=... or slantHeight=...' };
      }
      return {
        ok: true,
        request: {
          kind,
          radiusLatex,
          ...(heightLatex ? { heightLatex } : {}),
          ...(slantHeightLatex ? { slantHeightLatex } : {}),
        },
        style: 'structured',
      };
    }
    case 'sphere': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const unknownCount = countUnknownValues([
        radiusLatex,
        volumeLatex,
        surfaceAreaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in sphere(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(radiusLatex)) {
        return { ok: false, error: 'sphere(...) solve-missing supports ? on radius only.' };
      }
      if (isUnknownValue(radiusLatex)) {
        const knownEntries = [
          ['volume', volumeLatex],
          ['surfaceArea', surfaceAreaLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'sphere(radius=?, ...) needs exactly one known relation: volume or surfaceArea.' };
        }
        return {
          ok: true,
          request: {
            kind: 'sphereSolveMissing',
            radiusLatex,
            ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return radiusLatex
        ? { ok: true, request: { kind, radiusLatex }, style: 'structured' }
        : { ok: false, error: 'sphere(...) needs radius=...' };
    }
    case 'triangleArea': {
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        baseLatex,
        heightLatex,
        areaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in triangleArea(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(baseLatex)
          ? 'base'
          : isUnknownValue(heightLatex)
            ? 'height'
            : null;
        if (!unknown) {
          return { ok: false, error: 'triangleArea(...) solve-missing supports ? on base or height only.' };
        }
        if (!areaLatex || isUnknownValue(areaLatex)) {
          return { ok: false, error: 'triangleArea(..., ? , ...) needs a known area value.' };
        }
        const knownOther = unknown === 'base' ? heightLatex : baseLatex;
        if (!knownOther || isUnknownValue(knownOther)) {
          return { ok: false, error: 'triangleArea(...) solve-missing needs the other dimension as a known value.' };
        }
        return {
          ok: true,
          request: {
            kind: 'triangleAreaSolveMissing',
            baseLatex: baseLatex ?? '?',
            heightLatex: heightLatex ?? '?',
            areaLatex,
            unknown,
          },
          style: 'structured',
        };
      }
      return baseLatex && heightLatex
        ? { ok: true, request: { kind, baseLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'triangleArea(...) needs base=... and height=...' };
    }
    case 'triangleHeron': {
      const bLatex = assignments.get('b');
      return aLatex && bLatex && cLatex
        ? { ok: true, request: { kind, aLatex, bLatex, cLatex }, style: 'structured' }
        : { ok: false, error: 'triangleHeron(...) needs a=..., b=..., and c=...' };
    }
    case 'distance':
    case 'midpoint':
    case 'slope': {
      const pair = pointPair();
      if (!pair) {
        return { ok: false, error: `${kind}(...) needs p1=(x,y) and p2=(x,y).` };
      }

      const pointUnknownCount = countUnknownValues([
        pair.p1.xLatex,
        pair.p1.yLatex,
        pair.p2.xLatex,
        pair.p2.yLatex,
      ]);
      if (pointUnknownCount > 1) {
        return { ok: false, error: `Use exactly one ? unknown in ${kind}(...).` };
      }
      if (pointUnknownCount === 1) {
        if (kind === 'distance') {
          if (!distanceLatex || isUnknownValue(distanceLatex)) {
            return { ok: false, error: 'distance(..., ? , ...) needs a known distance value.' };
          }
          return {
            ok: true,
            request: { kind: 'distanceSolveMissing', p1: pair.p1, p2: pair.p2, distanceLatex },
            style: 'structured',
          };
        }
        if (kind === 'midpoint') {
          const mid = parsePoint(midpointLatex ?? '');
          if (!mid) {
            return { ok: false, error: 'midpoint(..., ? , ...) needs mid=(x,y).' };
          }
          const midUnknownCount = countUnknownValues([mid.xLatex, mid.yLatex]);
          if (midUnknownCount > 0) {
            return { ok: false, error: 'midpoint solve-missing needs mid=(x,y) with known numeric components.' };
          }
          return {
            ok: true,
            request: { kind: 'midpointSolveMissing', p1: pair.p1, p2: pair.p2, mid },
            style: 'structured',
          };
        }
        if (!slopeLatex || isUnknownValue(slopeLatex)) {
          return { ok: false, error: 'slope(..., ? , ...) needs a known slope value.' };
        }
        return {
          ok: true,
          request: { kind: 'slopeSolveMissing', p1: pair.p1, p2: pair.p2, slopeLatex },
          style: 'structured',
        };
      }

      return { ok: true, request: { kind, p1: pair.p1, p2: pair.p2 }, style: 'structured' };
    }
    case 'lineEquation': {
      const pair = pointPair();
      const form = pair?.form ?? parseLineForm(assignments.get('form')) ?? 'slope-intercept';
      return pair
        ? { ok: true, request: { kind, p1: pair.p1, p2: pair.p2, form }, style: 'structured' }
        : { ok: false, error: 'lineEquation(...) needs p1=(x,y), p2=(x,y), and an optional form=...' };
    }
  }

  return {
    ok: false,
    error: 'Use a supported Geometry request such as square(...), cube(...), triangleArea(...), distance(...), or lineEquation(...).',
  };
}

function parseShorthand(source: string, options: GeometryParseOptions): GeometryParseResult {
  const assignments = parseAssignments(source);
  if (!assignments) {
    return {
      ok: false,
      error: 'Enter a supported Geometry request or use a guided tool to seed one.',
    };
  }

  const hint = familyHint(options.screenHint);
  const style: CoreDraftStyle = 'shorthand';
  const sideLatex = assignments.get('s') ?? assignments.get('side');
  const widthLatex = assignments.get('w') ?? assignments.get('width');
  const heightLatex = assignments.get('h') ?? assignments.get('height');
  const radiusLatex = assignments.get('r') ?? assignments.get('radius');
  const areaLatex = assignments.get('area');
  const perimeterLatex = assignments.get('perimeter') ?? assignments.get('p');
  const diagonalLatex = assignments.get('diagonal') ?? assignments.get('d');
  const diameterLatex = assignments.get('diameter') ?? assignments.get('d');
  const circumferenceLatex = assignments.get('circumference') ?? assignments.get('c');
  const volumeLatex = assignments.get('volume') ?? assignments.get('v');
  const surfaceAreaLatex = assignments.get('surfacearea') ?? assignments.get('sa') ?? assignments.get('surface');
  const angleValue = assignments.get('theta') ?? assignments.get('angle');
  const form = parseLineForm(assignments.get('form'));
  const p1 = parsePoint(assignments.get('p1') ?? '');
  const p2 = parsePoint(assignments.get('p2') ?? '');
  const hasWidthKey = assignments.has('width') || assignments.has('w');
  const rawL = assignments.get('l');
  const lengthLatex = assignments.get('length') ?? (hasWidthKey ? rawL : undefined);
  const slantHeightLatex =
    assignments.get('slantheight')
    ?? assignments.get('slant')
    ?? (radiusLatex && !hasWidthKey ? rawL : undefined);
  const explicitBaseLatex = assignments.get('base');
  const aLatex = assignments.get('a');
  const bLatex = assignments.get('b');
  const cLatex = assignments.get('c');
  const baseLatex = explicitBaseLatex ?? (!aLatex && !cLatex ? bLatex : undefined);
  const distanceLatex = assignments.get('distance') ?? assignments.get('d');
  const midLatex = assignments.get('mid') ?? assignments.get('m');
  const mid = parsePoint(midLatex ?? '');
  const slopeLatex = assignments.get('slope') ?? assignments.get('m');
  const formulaUnknownCount = countUnknownValues([
    sideLatex,
    widthLatex,
    heightLatex,
    radiusLatex,
    areaLatex,
    perimeterLatex,
    diagonalLatex,
    diameterLatex,
    circumferenceLatex,
    volumeLatex,
    surfaceAreaLatex,
    baseLatex,
  ]);

  const squareRequest =
    sideLatex ? { kind: 'square' as const, sideLatex } : null;
  const rectangleRequest =
    widthLatex && heightLatex
      ? { kind: 'rectangle' as const, widthLatex, heightLatex }
      : null;
  const cubeRequest =
    sideLatex ? { kind: 'cube' as const, sideLatex } : null;
  const cuboidRequest =
    lengthLatex && widthLatex && heightLatex
      ? { kind: 'cuboid' as const, lengthLatex, widthLatex, heightLatex }
      : null;
  const cylinderRequest =
    radiusLatex && heightLatex
      ? { kind: 'cylinder' as const, radiusLatex, heightLatex }
      : null;
  const coneRequest =
    radiusLatex && (heightLatex || slantHeightLatex)
      ? {
          kind: 'cone' as const,
          radiusLatex,
          ...(heightLatex ? { heightLatex } : {}),
          ...(slantHeightLatex ? { slantHeightLatex } : {}),
        }
      : null;
  const sphereRequest =
    radiusLatex ? { kind: 'sphere' as const, radiusLatex } : null;
  const triangleAreaRequest =
    baseLatex && heightLatex
      ? { kind: 'triangleArea' as const, baseLatex, heightLatex }
      : null;
  const triangleHeronRequest =
    aLatex && bLatex && cLatex
      ? { kind: 'triangleHeron' as const, aLatex, bLatex, cLatex }
      : null;

  if (formulaUnknownCount > 1) {
    return {
      ok: false,
      error: 'Use exactly one ? unknown for Geometry solve-missing requests.',
    };
  }

  if (options.screenHint === 'square' && isUnknownValue(sideLatex)) {
    const knownEntries = [
      ['area', areaLatex],
      ['perimeter', perimeterLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return {
        ok: false,
        error: 'square solve-missing needs side=? and exactly one known relation: area, perimeter, or diagonal.',
      };
    }
    return {
      ok: true,
      request: {
        kind: 'squareSolveMissing',
        sideLatex,
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'rectangle' && (isUnknownValue(widthLatex) || isUnknownValue(heightLatex))) {
    const unknown = isUnknownValue(widthLatex) ? 'width' : 'height';
    const knownSide = unknown === 'width' ? heightLatex : widthLatex;
    if (!knownSide || isUnknownValue(knownSide)) {
      return { ok: false, error: 'rectangle solve-missing needs the other side as a known value.' };
    }
    const knownEntries = [
      ['area', areaLatex],
      ['perimeter', perimeterLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'rectangle solve-missing needs exactly one known relation: area, perimeter, or diagonal.' };
    }
    return {
      ok: true,
      request: {
        kind: 'rectangleSolveMissing',
        widthLatex: widthLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        unknown,
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'circle' && isUnknownValue(radiusLatex)) {
    const knownEntries = [
      ['diameter', diameterLatex],
      ['circumference', circumferenceLatex],
      ['area', areaLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'circle solve-missing needs radius=? and exactly one known relation: diameter, circumference, or area.' };
    }
    return {
      ok: true,
      request: {
        kind: 'circleSolveMissing',
        radiusLatex,
        ...(knownEntries[0][0] === 'diameter' ? { diameterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'circumference' ? { circumferenceLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'cube' && isUnknownValue(sideLatex)) {
    const knownEntries = [
      ['volume', volumeLatex],
      ['surfaceArea', surfaceAreaLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'cube solve-missing needs side=? and exactly one known relation: volume, surfaceArea, or diagonal.' };
    }
    return {
      ok: true,
      request: {
        kind: 'cubeSolveMissing',
        sideLatex,
        ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'sphere' && isUnknownValue(radiusLatex)) {
    const knownEntries = [
      ['volume', volumeLatex],
      ['surfaceArea', surfaceAreaLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'sphere solve-missing needs radius=? and exactly one known relation: volume or surfaceArea.' };
    }
    return {
      ok: true,
      request: {
        kind: 'sphereSolveMissing',
        radiusLatex,
        ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'triangleArea' && (isUnknownValue(baseLatex) || isUnknownValue(heightLatex))) {
    if (!areaLatex || isUnknownValue(areaLatex)) {
      return { ok: false, error: 'triangleArea solve-missing needs a known area value.' };
    }
    return {
      ok: true,
      request: {
        kind: 'triangleAreaSolveMissing',
        baseLatex: baseLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        areaLatex,
        unknown: isUnknownValue(baseLatex) ? 'base' : 'height',
      },
      style,
    };
  }

  if (options.screenHint === 'cylinder' && (isUnknownValue(radiusLatex) || isUnknownValue(heightLatex))) {
    if (!volumeLatex || isUnknownValue(volumeLatex)) {
      return { ok: false, error: 'cylinder solve-missing needs a known volume value.' };
    }
    const unknown = isUnknownValue(radiusLatex) ? 'radius' : 'height';
    const knownOther = unknown === 'radius' ? heightLatex : radiusLatex;
    if (!knownOther || isUnknownValue(knownOther)) {
      return { ok: false, error: 'cylinder solve-missing needs the other dimension as a known value.' };
    }
    return {
      ok: true,
      request: {
        kind: 'cylinderSolveMissing',
        radiusLatex: radiusLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        volumeLatex,
        unknown,
      },
      style,
    };
  }

  if (p1 && p2) {
    const pointUnknownCount = countUnknownValues([
      p1.xLatex,
      p1.yLatex,
      p2.xLatex,
      p2.yLatex,
    ]);
    if (pointUnknownCount > 1) {
      return {
        ok: false,
        error: 'Use exactly one ? unknown in coordinate solve-missing requests.',
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'distance') {
      if (!distanceLatex || isUnknownValue(distanceLatex)) {
        return {
          ok: false,
          error: 'distance solve-missing needs a known distance value.',
        };
      }
      return {
        ok: true,
        request: { kind: 'distanceSolveMissing', p1, p2, distanceLatex },
        style,
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'midpoint') {
      if (!mid || isUnknownValue(mid.xLatex) || isUnknownValue(mid.yLatex)) {
        return {
          ok: false,
          error: 'midpoint solve-missing needs mid=(x,y) with known values.',
        };
      }
      return {
        ok: true,
        request: { kind: 'midpointSolveMissing', p1, p2, mid },
        style,
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'slope') {
      if (!slopeLatex || isUnknownValue(slopeLatex)) {
        return {
          ok: false,
          error: 'slope solve-missing needs a known slope value.',
        };
      }
      return {
        ok: true,
        request: { kind: 'slopeSolveMissing', p1, p2, slopeLatex },
        style,
      };
    }

    if (pointUnknownCount === 1) {
      return {
        ok: false,
        error: 'Use a coordinate leaf tool with one ? unknown plus a known relation (distance, midpoint, or slope).',
      };
    }

    if (form) {
      return {
        ok: true,
        request: { kind: 'lineEquation', p1, p2, form },
        style,
      };
    }

    if (options.screenHint === 'midpoint') {
      return { ok: true, request: { kind: 'midpoint', p1, p2 }, style };
    }
    if (options.screenHint === 'slope') {
      return { ok: true, request: { kind: 'slope', p1, p2 }, style };
    }
    if (options.screenHint === 'lineEquation') {
      return {
        ok: true,
        request: { kind: 'lineEquation', p1, p2, form: 'slope-intercept' },
        style,
      };
    }
    if (options.screenHint === 'distance' || hint === 'coordinate') {
      return { ok: true, request: { kind: 'distance', p1, p2 }, style };
    }

    return {
      ok: false,
      error: 'Point shorthand is ambiguous here. Use distance(...), midpoint(...), slope(...), or lineEquation(...).',
    };
  }

  if (radiusLatex && angleValue) {
    const unitMatch = /^(.*?)(deg|rad|grad)$/i.exec(angleValue.replace(/\s+/g, ''));
    const angleLatex = unitMatch ? unitMatch[1] : angleValue;
    const angleUnit = (assignments.get('unit') ?? unitMatch?.[2] ?? 'deg').toLowerCase() as AngleUnit;
    if (!['deg', 'rad', 'grad'].includes(angleUnit)) {
      return {
        ok: false,
        error: 'Use unit=deg, unit=rad, or unit=grad with arc/sector shorthand.',
      };
    }
    return {
      ok: true,
      request: { kind: 'arcSector', radiusLatex, angleLatex, angleUnit },
      style,
    };
  }

  switch (options.screenHint) {
    case 'square':
      if (squareRequest) {
        return { ok: true, request: squareRequest, style };
      }
      break;
    case 'rectangle':
      if (rectangleRequest) {
        return { ok: true, request: rectangleRequest, style };
      }
      break;
    case 'cube':
      if (cubeRequest) {
        return { ok: true, request: cubeRequest, style };
      }
      break;
    case 'cuboid':
      if (cuboidRequest) {
        return { ok: true, request: cuboidRequest, style };
      }
      break;
    case 'cylinder':
      if (cylinderRequest) {
        return { ok: true, request: cylinderRequest, style };
      }
      break;
    case 'cone':
      if (coneRequest) {
        return { ok: true, request: coneRequest, style };
      }
      break;
    case 'sphere':
      if (sphereRequest) {
        return { ok: true, request: sphereRequest, style };
      }
      break;
    case 'triangleArea':
      if (triangleAreaRequest) {
        return { ok: true, request: triangleAreaRequest, style };
      }
      break;
    case 'triangleHeron':
      if (triangleHeronRequest) {
        return { ok: true, request: triangleHeronRequest, style };
      }
      break;
    default:
      break;
  }

  if (
    options.screenHint
    && !(
      options.screenHint === 'home'
      || options.screenHint === 'shapes2dHome'
      || options.screenHint === 'shapes3dHome'
      || options.screenHint === 'triangleHome'
      || options.screenHint === 'circleHome'
      || options.screenHint === 'coordinateHome'
    )
  ) {
    return {
      ok: false,
      error: 'Use the guided fields on this Geometry tool or enter a matching structured Geometry request.',
    };
  }

  if (hint === 'triangle') {
    if (triangleHeronRequest) {
      return { ok: true, request: triangleHeronRequest, style };
    }
    if (triangleAreaRequest) {
      return { ok: true, request: triangleAreaRequest, style };
    }
    return {
      ok: false,
      error: 'Use base/height for Triangle Area or a/b/c for Heron on this Geometry screen.',
    };
  }

  if (hint === 'shape3d') {
    if (cuboidRequest) {
      return { ok: true, request: cuboidRequest, style };
    }
    if (radiusLatex && heightLatex && !slantHeightLatex) {
      return {
        ok: false,
        error: 'r=... and h=... is ambiguous here. It could mean cylinder or cone. Use cylinder(...), cone(...), or open the specific guided tool.',
      };
    }
    if (coneRequest && slantHeightLatex) {
      return { ok: true, request: coneRequest, style };
    }
    if (sphereRequest && !heightLatex && !slantHeightLatex) {
      return { ok: true, request: sphereRequest, style };
    }
    if (cubeRequest) {
      return { ok: true, request: cubeRequest, style };
    }
  }

  if (hint === 'shape2d') {
    if (rectangleRequest) {
      return { ok: true, request: rectangleRequest, style };
    }
    if (squareRequest) {
      return { ok: true, request: squareRequest, style };
    }
  }

  if (hint === 'circle' && sphereRequest) {
    return { ok: true, request: { kind: 'circle', radiusLatex: sphereRequest.radiusLatex }, style };
  }

  if (triangleHeronRequest) {
    return { ok: true, request: triangleHeronRequest, style };
  }

  if (triangleAreaRequest) {
    return { ok: true, request: triangleAreaRequest, style };
  }

  if (cuboidRequest) {
    return { ok: true, request: cuboidRequest, style };
  }

  if (rectangleRequest) {
    return { ok: true, request: rectangleRequest, style };
  }

  if (coneRequest && slantHeightLatex) {
    return { ok: true, request: coneRequest, style };
  }

  if (sideLatex) {
    return {
      ok: false,
      error: 's=... is ambiguous here. Use square(side=...) or cube(side=...) in the Geometry editor.',
    };
  }

  if (radiusLatex && heightLatex) {
    return {
      ok: false,
      error: 'r=... and h=... is ambiguous here. It could mean cylinder or cone. Use cylinder(...), cone(...), or open the specific guided tool.',
    };
  }

  if (radiusLatex) {
    return {
      ok: false,
      error: 'r=... is ambiguous here. Use circle(radius=...) or sphere(radius=...) in the Geometry editor.',
    };
  }

  if (formulaUnknownCount === 1) {
    return {
      ok: false,
      error: 'Use a supported Geometry solve-missing request with exactly one ? unknown on an in-scope Geometry leaf tool.',
    };
  }

  return {
    ok: false,
    error: 'Enter a supported Geometry request or choose a guided Geometry tool.',
  };
}

export function parseGeometryDraft(source: string, options: GeometryParseOptions = {}): GeometryParseResult {
  const normalized = normalizeGeometrySource(source);
  if (!normalized) {
    return {
      ok: false,
      error: 'Enter a Geometry request or choose a guided Geometry tool.',
    };
  }

  const structured = parseStructured(normalized);
  if (structured) {
    return structured;
  }

  return parseShorthand(normalized, options);
}

export function geometryDraftStyle(source: string): CoreDraftStyle {
  return /^[A-Za-z][A-Za-z0-9]*\(/.test(normalizeGeometrySource(source)) ? 'structured' : 'shorthand';
}
