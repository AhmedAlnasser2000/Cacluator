import { z } from 'zod';
import type { LauncherCategory, LauncherLaunchTarget, MenuNode } from '../types/calculator';

export const modeIdSchema = z.enum([
  'calculate',
  'equation',
  'matrix',
  'vector',
  'table',
  'guide',
  'advancedCalculus',
  'trigonometry',
  'statistics',
  'geometry',
]);

export const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
export const outputStyleSchema = z.enum(['exact', 'decimal', 'both']);
export const mathNotationDisplaySchema = z.enum(['rendered', 'plainText', 'latex']);
export const numericNotationModeSchema = z.enum(['decimal', 'scientific', 'auto']);
export const scientificNotationStyleSchema = z.enum(['times10', 'e']);

export const settingsSchema = z.object({
  angleUnit: angleUnitSchema,
  outputStyle: outputStyleSchema,
  mathNotationDisplay: mathNotationDisplaySchema.default('rendered'),
  historyEnabled: z.boolean(),
  autoSwitchToEquation: z.boolean().default(false),
  uiScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  mathScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  resultScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  highContrast: z.boolean().default(false),
  symbolicDisplayMode: z.enum(['roots', 'powers', 'auto']).default('auto'),
  flattenNestedRootsWhenSafe: z.boolean().default(true),
  approxDigits: z.preprocess(
    (value) =>
      typeof value === 'number'
        ? Math.min(20, Math.max(0, Math.trunc(value)))
        : value,
    z.number().int().default(6),
  ),
  numericNotationMode: numericNotationModeSchema.default('decimal'),
  scientificNotationStyle: scientificNotationStyleSchema.default('times10'),
});

export const menuNodeSchema: z.ZodType<MenuNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    hotkey: z.string().optional(),
    children: z.array(menuNodeSchema).optional(),
  }),
);

const calculateScreenSchema = z.enum(['standard', 'calculusHome', 'derivative', 'derivativePoint', 'integral', 'limit']);
const advancedCalcScreenSchema = z.enum([
  'home',
  'integralsHome',
  'indefiniteIntegral',
  'definiteIntegral',
  'improperIntegral',
  'limitsHome',
  'finiteLimit',
  'infiniteLimit',
  'seriesHome',
  'maclaurin',
  'taylor',
  'partialsHome',
  'partialDerivative',
  'odeHome',
  'odeFirstOrder',
  'odeSecondOrder',
  'odeNumericIvp',
]);
const trigScreenSchema = z.enum([
  'home',
  'functions',
  'identitiesHome',
  'identitySimplify',
  'identityConvert',
  'equationsHome',
  'equationSolve',
  'trianglesHome',
  'rightTriangle',
  'sineRule',
  'cosineRule',
  'angleConvert',
  'specialAngles',
]);
const statisticsScreenSchema = z.enum([
  'home',
  'dataEntry',
  'descriptive',
  'frequency',
  'probabilityHome',
  'binomial',
  'normal',
  'poisson',
  'regression',
  'correlation',
]);
const geometryScreenSchema = z.enum([
  'home',
  'shapes2dHome',
  'shapes3dHome',
  'triangleHome',
  'circleHome',
  'coordinateHome',
  'triangleArea',
  'triangleHeron',
  'rectangle',
  'square',
  'circle',
  'arcSector',
  'cube',
  'cuboid',
  'cylinder',
  'cone',
  'sphere',
  'distance',
  'midpoint',
  'slope',
  'lineEquation',
]);
const equationScreenSchema = z.enum([
  'home',
  'symbolic',
  'polynomialMenu',
  'quadratic',
  'cubic',
  'quartic',
  'simultaneousMenu',
  'linear2',
  'linear3',
]);
const numericSolveIntervalSchema = z.object({
  start: z.string(),
  end: z.string(),
  subdivisions: z.number(),
});
const calculateSeedSchema = z.object({
  bodyLatex: z.string().optional(),
  point: z.string().optional(),
  kind: z.enum(['indefinite', 'definite']).optional(),
  lower: z.string().optional(),
  upper: z.string().optional(),
  target: z.string().optional(),
  direction: z.enum(['two-sided', 'left', 'right']).optional(),
  targetKind: z.enum(['finite', 'posInfinity', 'negInfinity']).optional(),
});
const advancedCalcSeedSchema = z.object({
  bodyLatex: z.string().optional(),
  lower: z.string().optional(),
  upper: z.string().optional(),
  lowerKind: z.enum(['finite', 'negInfinity']).optional(),
  upperKind: z.enum(['finite', 'posInfinity']).optional(),
  target: z.string().optional(),
  direction: z.enum(['two-sided', 'left', 'right']).optional(),
  targetKind: z.enum(['posInfinity', 'negInfinity']).optional(),
  kind: z.enum(['maclaurin', 'taylor']).optional(),
  center: z.string().optional(),
  order: z.number().optional(),
  variable: z.enum(['x', 'y', 'z']).optional(),
  lhsLatex: z.string().optional(),
  rhsLatex: z.string().optional(),
  classification: z.enum(['separable', 'linear', 'exact']).optional(),
  a2: z.string().optional(),
  a1: z.string().optional(),
  a0: z.string().optional(),
  forcingLatex: z.string().optional(),
  x0: z.string().optional(),
  y0: z.string().optional(),
  xEnd: z.string().optional(),
  step: z.string().optional(),
  method: z.enum(['rk4', 'rk45']).optional(),
});

export const launcherLaunchTargetSchema: z.ZodType<LauncherLaunchTarget> = z.union([
  z.object({ mode: z.literal('calculate'), calculateScreen: calculateScreenSchema.optional() }),
  z.object({ mode: z.literal('equation'), equationScreen: equationScreenSchema.optional() }),
  z.object({ mode: z.literal('matrix') }),
  z.object({ mode: z.literal('vector') }),
  z.object({ mode: z.literal('table') }),
  z.object({ mode: z.literal('advancedCalculus'), advancedCalcScreen: advancedCalcScreenSchema.optional() }),
  z.object({ mode: z.literal('trigonometry'), trigScreen: trigScreenSchema.optional() }),
  z.object({ mode: z.literal('statistics'), statisticsScreen: statisticsScreenSchema.optional() }),
  z.object({ mode: z.literal('geometry'), geometryScreen: geometryScreenSchema.optional() }),
]);

export const launcherCategorySchema: z.ZodType<LauncherCategory> = z.object({
  id: z.enum(['core', 'linear', 'calculus', 'shapeMath', 'data']),
  label: z.string(),
  description: z.string(),
  hotkey: z.string(),
  entries: z.array(z.object({
    id: z.enum([
      'calculate',
      'equation',
      'matrix',
      'vector',
      'table',
      'calculus',
      'advancedCalculus',
      'trigonometry',
      'statistics',
      'geometry',
    ]),
    label: z.string(),
    description: z.string(),
    hotkey: z.string(),
    launch: launcherLaunchTargetSchema,
  })),
});

export const historyEntrySchema = z.object({
  id: z.string(),
  mode: modeIdSchema,
  inputLatex: z.string(),
  resolvedInputLatex: z.string().optional(),
  resultLatex: z.string().optional(),
  approxText: z.string().optional(),
  calculateScreen: calculateScreenSchema.optional(),
  calculateSeed: calculateSeedSchema.optional(),
  advancedCalcScreen: advancedCalcScreenSchema.optional(),
  advancedCalcSeed: advancedCalcSeedSchema.optional(),
  geometryScreen: geometryScreenSchema.optional(),
  trigScreen: trigScreenSchema.optional(),
  statisticsScreen: statisticsScreenSchema.optional(),
  numericInterval: numericSolveIntervalSchema.optional(),
  timestamp: z.string(),
});

export const appBootstrapSchema = z.object({
  currentMode: modeIdSchema,
  settings: settingsSchema,
  modeTree: z.array(menuNodeSchema),
  historyCount: z.number(),
  version: z.string(),
});

export const modeStateSchema = z.object({
  activeMode: modeIdSchema,
  menu: z.array(menuNodeSchema),
});
