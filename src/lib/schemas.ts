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

export const settingsSchema = z.object({
  angleUnit: angleUnitSchema,
  outputStyle: outputStyleSchema,
  historyEnabled: z.boolean(),
  autoSwitchToEquation: z.boolean().default(false),
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
  geometryScreen: geometryScreenSchema.optional(),
  trigScreen: trigScreenSchema.optional(),
  statisticsScreen: statisticsScreenSchema.optional(),
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
