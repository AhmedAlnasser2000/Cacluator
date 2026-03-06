import type {
  ArcSectorState,
  CircleState,
  ConeState,
  CubeState,
  CuboidState,
  CylinderState,
  DistanceState,
  GeometryRequest,
  GeometryScreen,
  GeometrySerializerOptions,
  LineEquationState,
  MidpointState,
  RectangleState,
  SlopeState,
  SphereState,
  SquareState,
  TriangleAreaState,
  TriangleHeronState,
} from '../../types/calculator';

function filledValue(value: string) {
  return value.trim() || '?';
}

function pointValue(point: { x: string; y: string }) {
  return `(${filledValue(point.x)}, ${filledValue(point.y)})`;
}

function lineFormValue(form: LineEquationState['form']) {
  return form;
}

export function serializeGeometryRequest(
  request: GeometryRequest,
  options: GeometrySerializerOptions = { style: 'structured' },
) {
  if (options.style !== 'structured') {
    return '';
  }

  switch (request.kind) {
    case 'square':
      return `square(side=${filledValue(request.sideLatex)})`;
    case 'rectangle':
      return `rectangle(width=${filledValue(request.widthLatex)}, height=${filledValue(request.heightLatex)})`;
    case 'circle':
      return `circle(radius=${filledValue(request.radiusLatex)})`;
    case 'arcSector':
      return `arcSector(radius=${filledValue(request.radiusLatex)}, angle=${filledValue(request.angleLatex)}, unit=${request.angleUnit})`;
    case 'cube':
      return `cube(side=${filledValue(request.sideLatex)})`;
    case 'cuboid':
      return `cuboid(length=${filledValue(request.lengthLatex)}, width=${filledValue(request.widthLatex)}, height=${filledValue(request.heightLatex)})`;
    case 'cylinder':
      return `cylinder(radius=${filledValue(request.radiusLatex)}, height=${filledValue(request.heightLatex)})`;
    case 'cone':
      return `cone(radius=${filledValue(request.radiusLatex)}, height=${filledValue(request.heightLatex ?? '')}, slantHeight=${filledValue(request.slantHeightLatex ?? '')})`;
    case 'sphere':
      return `sphere(radius=${filledValue(request.radiusLatex)})`;
    case 'triangleArea':
      return `triangleArea(base=${filledValue(request.baseLatex)}, height=${filledValue(request.heightLatex)})`;
    case 'triangleHeron':
      return `triangleHeron(a=${filledValue(request.aLatex)}, b=${filledValue(request.bLatex)}, c=${filledValue(request.cLatex)})`;
    case 'distance':
      return `distance(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })})`;
    case 'midpoint':
      return `midpoint(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })})`;
    case 'slope':
      return `slope(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })})`;
    case 'lineEquation':
      return `lineEquation(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })}, form=${lineFormValue(request.form)})`;
    case 'squareSolveMissing':
      return `square(${[
        `side=${filledValue(request.sideLatex)}`,
        ...(request.areaLatex ? [`area=${filledValue(request.areaLatex)}`] : []),
        ...(request.perimeterLatex ? [`perimeter=${filledValue(request.perimeterLatex)}`] : []),
        ...(request.diagonalLatex ? [`diagonal=${filledValue(request.diagonalLatex)}`] : []),
      ].join(', ')})`;
    case 'circleSolveMissing':
      return `circle(${[
        `radius=${filledValue(request.radiusLatex)}`,
        ...(request.diameterLatex ? [`diameter=${filledValue(request.diameterLatex)}`] : []),
        ...(request.circumferenceLatex ? [`circumference=${filledValue(request.circumferenceLatex)}`] : []),
        ...(request.areaLatex ? [`area=${filledValue(request.areaLatex)}`] : []),
      ].join(', ')})`;
    case 'cubeSolveMissing':
      return `cube(${[
        `side=${filledValue(request.sideLatex)}`,
        ...(request.volumeLatex ? [`volume=${filledValue(request.volumeLatex)}`] : []),
        ...(request.surfaceAreaLatex ? [`surfaceArea=${filledValue(request.surfaceAreaLatex)}`] : []),
        ...(request.diagonalLatex ? [`diagonal=${filledValue(request.diagonalLatex)}`] : []),
      ].join(', ')})`;
    case 'sphereSolveMissing':
      return `sphere(${[
        `radius=${filledValue(request.radiusLatex)}`,
        ...(request.volumeLatex ? [`volume=${filledValue(request.volumeLatex)}`] : []),
        ...(request.surfaceAreaLatex ? [`surfaceArea=${filledValue(request.surfaceAreaLatex)}`] : []),
      ].join(', ')})`;
    case 'triangleAreaSolveMissing':
      return `triangleArea(base=${filledValue(request.baseLatex)}, height=${filledValue(request.heightLatex)}, area=${filledValue(request.areaLatex)})`;
    case 'rectangleSolveMissing':
      return `rectangle(${[
        `width=${filledValue(request.widthLatex)}`,
        `height=${filledValue(request.heightLatex)}`,
        ...(request.areaLatex ? [`area=${filledValue(request.areaLatex)}`] : []),
        ...(request.perimeterLatex ? [`perimeter=${filledValue(request.perimeterLatex)}`] : []),
        ...(request.diagonalLatex ? [`diagonal=${filledValue(request.diagonalLatex)}`] : []),
      ].join(', ')})`;
    case 'cylinderSolveMissing':
      return `cylinder(radius=${filledValue(request.radiusLatex)}, height=${filledValue(request.heightLatex)}, volume=${filledValue(request.volumeLatex)})`;
    case 'distanceSolveMissing':
      return `distance(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })}, distance=${filledValue(request.distanceLatex)})`;
    case 'midpointSolveMissing':
      return `midpoint(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })}, mid=${pointValue({ x: request.mid.xLatex, y: request.mid.yLatex })})`;
    case 'slopeSolveMissing':
      return `slope(p1=${pointValue({ x: request.p1.xLatex, y: request.p1.yLatex })}, p2=${pointValue({ x: request.p2.xLatex, y: request.p2.yLatex })}, slope=${filledValue(request.slopeLatex)})`;
  }
}

export function buildGeometryStructuredDraft(
  screen: GeometryScreen,
  state: {
    triangleArea: TriangleAreaState;
    triangleHeron: TriangleHeronState;
    rectangle: RectangleState;
    square: SquareState;
    circle: CircleState;
    arcSector: ArcSectorState;
    cube: CubeState;
    cuboid: CuboidState;
    cylinder: CylinderState;
    cone: ConeState;
    sphere: SphereState;
    distance: DistanceState;
    midpoint: MidpointState;
    slope: SlopeState;
    lineEquation: LineEquationState;
  },
) {
  switch (screen) {
    case 'triangleArea':
      return serializeGeometryRequest({
        kind: 'triangleArea',
        baseLatex: state.triangleArea.base,
        heightLatex: state.triangleArea.height,
      });
    case 'triangleHeron':
      return serializeGeometryRequest({
        kind: 'triangleHeron',
        aLatex: state.triangleHeron.a,
        bLatex: state.triangleHeron.b,
        cLatex: state.triangleHeron.c,
      });
    case 'rectangle':
      return serializeGeometryRequest({
        kind: 'rectangle',
        widthLatex: state.rectangle.width,
        heightLatex: state.rectangle.height,
      });
    case 'square':
      return serializeGeometryRequest({
        kind: 'square',
        sideLatex: state.square.side,
      });
    case 'circle':
      return serializeGeometryRequest({
        kind: 'circle',
        radiusLatex: state.circle.radius,
      });
    case 'arcSector':
      return serializeGeometryRequest({
        kind: 'arcSector',
        radiusLatex: state.arcSector.radius,
        angleLatex: state.arcSector.angle,
        angleUnit: state.arcSector.angleUnit,
      });
    case 'cube':
      return serializeGeometryRequest({
        kind: 'cube',
        sideLatex: state.cube.side,
      });
    case 'cuboid':
      return serializeGeometryRequest({
        kind: 'cuboid',
        lengthLatex: state.cuboid.length,
        widthLatex: state.cuboid.width,
        heightLatex: state.cuboid.height,
      });
    case 'cylinder':
      return serializeGeometryRequest({
        kind: 'cylinder',
        radiusLatex: state.cylinder.radius,
        heightLatex: state.cylinder.height,
      });
    case 'cone':
      return serializeGeometryRequest({
        kind: 'cone',
        radiusLatex: state.cone.radius,
        heightLatex: state.cone.height,
        slantHeightLatex: state.cone.slantHeight,
      });
    case 'sphere':
      return serializeGeometryRequest({
        kind: 'sphere',
        radiusLatex: state.sphere.radius,
      });
    case 'distance':
      return serializeGeometryRequest({
        kind: 'distance',
        p1: { xLatex: state.distance.p1.x, yLatex: state.distance.p1.y },
        p2: { xLatex: state.distance.p2.x, yLatex: state.distance.p2.y },
      });
    case 'midpoint':
      return serializeGeometryRequest({
        kind: 'midpoint',
        p1: { xLatex: state.midpoint.p1.x, yLatex: state.midpoint.p1.y },
        p2: { xLatex: state.midpoint.p2.x, yLatex: state.midpoint.p2.y },
      });
    case 'slope':
      return serializeGeometryRequest({
        kind: 'slope',
        p1: { xLatex: state.slope.p1.x, yLatex: state.slope.p1.y },
        p2: { xLatex: state.slope.p2.x, yLatex: state.slope.p2.y },
      });
    case 'lineEquation':
      return serializeGeometryRequest({
        kind: 'lineEquation',
        p1: { xLatex: state.lineEquation.p1.x, yLatex: state.lineEquation.p1.y },
        p2: { xLatex: state.lineEquation.p2.x, yLatex: state.lineEquation.p2.y },
        form: state.lineEquation.form,
      });
    default:
      return '';
  }
}
