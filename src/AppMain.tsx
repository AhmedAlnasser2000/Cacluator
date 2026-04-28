import {
  type CSSProperties,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { HistoryPanel } from './components/HistoryPanel';
import { MathEditor } from './components/MathEditor';
import { MathNotationProvider } from './components/MathNotationContext';
import { SettingsPanel } from './components/SettingsPanel';
import { SignedNumberDraftInput } from './components/SignedNumberDraftInput';
import { SignedNumberInput } from './components/SignedNumberInput';
import { MathStatic } from './components/MathStatic';
import { NotationText } from './components/NotationText';
import { createCoreDraftState, isCoreDraftEditable } from './lib/core-mode';
import {
  getAdvancedCalcMenuEntries,
  getAdvancedCalcMenuEntryAtIndex,
  getAdvancedCalcMenuEntryByHotkey,
  getAdvancedCalcMenuFooterText,
  getAdvancedCalcParentScreen,
  getAdvancedCalcRouteMeta,
  getAdvancedCalcSoftActions,
  isAdvancedCalcMenuScreen,
  moveAdvancedCalcMenuIndex,
} from './lib/advanced-calc/navigation';
import { runAdvancedCalcMode } from './lib/advanced-calc/engine';
import { runGeometryCoreDraft } from './lib/geometry/core';
import { runTrigonometryCoreDraft } from './lib/trigonometry/core';
import { runStatisticsCoreDraft } from './lib/statistics/core';
import {
  buildGeometryInputLatex,
  DEFAULT_ARC_SECTOR_STATE,
  DEFAULT_CIRCLE_STATE,
  DEFAULT_CONE_STATE,
  DEFAULT_CUBE_STATE,
  DEFAULT_CUBOID_STATE,
  DEFAULT_CYLINDER_STATE,
  DEFAULT_DISTANCE_STATE,
  DEFAULT_LINE_EQUATION_STATE,
  DEFAULT_MIDPOINT_STATE,
  DEFAULT_RECTANGLE_STATE,
  DEFAULT_SLOPE_STATE,
  DEFAULT_SPHERE_STATE,
  DEFAULT_SQUARE_STATE,
  DEFAULT_TRIANGLE_AREA_STATE,
  DEFAULT_TRIANGLE_HERON_STATE,
  GEOMETRY_LINE_FORM_LABELS,
} from './lib/geometry/examples';
import {
  getGeometryMenuEntries,
  getGeometryMenuEntryAtIndex,
  getGeometryMenuEntryByHotkey,
  getGeometryMenuFooterText,
  getGeometryParentScreen,
  getGeometryRouteMeta,
  getGeometrySoftActions,
  isGeometryCoreEditableScreen,
  isGeometryMenuScreen,
  moveGeometryMenuIndex,
} from './lib/geometry/navigation';
import {
  geometryDraftStyle,
  geometryRequestToScreen,
  parseGeometryDraft,
} from './lib/geometry/parser';
import { getAdvancedCalcProvenanceBadge } from './lib/advanced-calc/ui';
import {
  getCalculusDerivativeStrategyBadges,
  getCalculusStrategyBadge,
} from './lib/calculus-strategy';
import { setNumericOutputSettings } from './lib/numeric-output';
import {
  buildAdvancedFiniteLimitLatex,
  buildAdvancedInfiniteLimitLatex,
  buildAdvancedIntegralLatex,
  buildFirstOrderOdeLatex,
  buildNumericIvpLatex,
  buildPartialDerivativeLatex,
  buildSecondOrderOdeLatex,
  buildSeriesPreviewLatex,
  DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_FINITE_LIMIT_STATE,
  DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INFINITE_LIMIT_STATE,
  DEFAULT_FIRST_ORDER_ODE_STATE,
  DEFAULT_MACLAURIN_STATE,
  DEFAULT_NUMERIC_IVP_STATE,
  DEFAULT_PARTIAL_DERIVATIVE_STATE,
  DEFAULT_SECOND_ORDER_ODE_STATE,
  DEFAULT_TAYLOR_STATE,
} from './lib/advanced-calc/examples';
import {
  getCalculateMenuEntries,
  getCalculateMenuEntryAtIndex,
  getCalculateMenuEntryByHotkey,
  getCalculateMenuFooterText,
  getCalculateParentScreen,
  getCalculateRouteMeta,
  getCalculateSoftActions,
  isCalculateMenuScreen,
  isCalculateToolScreen,
  moveCalculateMenuIndex,
} from './lib/calculate-navigation';
import {
  getAlgebraTransformLabel,
  getEligibleEquationTransforms,
  getEligibleExpressionTransforms,
} from './lib/algebra-transform';
import {
  buildWorkbenchExpression,
  cycleIntegralKind,
  cycleLimitDirection,
  cycleLimitTargetKind,
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
  DEFAULT_INTEGRAL_WORKBENCH,
  DEFAULT_LIMIT_WORKBENCH,
} from './lib/calculus-workbench';
import { copyableGuideExampleLatex, getSelectedGuideExample } from './lib/guide/examples';
import {
  getActiveGuideHomeEntries,
  getGuideArticle,
  getGuideModeRef,
} from './lib/guide/content';
import {
  clampGuideIndex,
  getGuideListEntries,
  getGuideParentRoute,
  getGuideRouteMeta,
  moveGuideIndex,
} from './lib/guide/navigation';
import {
  inferEquationReplayTarget,
} from './lib/equation-history';
import {
  getEquationMenuEntries,
  getEquationMenuEntryAtIndex,
  getEquationMenuEntryByHotkey,
  getEquationParentScreen,
  getEquationSoftActions,
  isEquationMenuScreen,
  isPolynomialEquationScreen,
  isSimultaneousEquationScreen,
  moveEquationMenuIndex,
} from './lib/equation-navigation';
import {
  getEquationDisplayTitle,
  getEquationMenuFooterText,
  getEquationRouteMeta,
} from './lib/equation-ux';
import {
  createLauncherStateForMode,
  getLauncherAppAtIndex,
  getLauncherAppByHotkey,
  getLauncherCategoryAtIndex,
  getLauncherCategoryByHotkey,
  LAUNCHER_SOFT_ACTIONS,
  moveLauncherCategoryIndex,
  moveLauncherRootIndex,
  openLauncherCategory,
} from './lib/launcher';
import {
  buildMatrixNotationLatex,
  buildVectorNotationLatex,
  type MatrixNotationPreset,
  type VectorNotationPreset,
} from './lib/linear-algebra-workbench';
import { KEYPAD_ROWS, MODE_LABELS, SOFT_MENU_BY_MODE, type KeypadButton } from './lib/menu';
import {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  POLYNOMIAL_VIEW_META,
  equationInputLatexForScreen,
} from './lib/modes/equation';
import { runMatrixMode } from './lib/modes/matrix';
import { runTableMode } from './lib/modes/table';
import { runVectorMode } from './lib/modes/vector';
import {
  buildStatisticsInputLatex,
  defaultStatisticsDraftForScreen,
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_CORRELATION_STATE,
  DEFAULT_FREQUENCY_TABLE,
  DEFAULT_MEAN_INFERENCE_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_REGRESSION_STATE,
  DEFAULT_STATS_DATASET,
} from './lib/statistics/examples';
import {
  getStatisticsMenuEntries,
  getStatisticsMenuEntryAtIndex,
  getStatisticsMenuEntryByHotkey,
  getStatisticsMenuFooterText,
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  getStatisticsSoftActions,
  isStatisticsMenuScreen,
  moveStatisticsMenuIndex,
} from './lib/statistics/navigation';
import {
  parseStatisticsDraft,
  statisticsDraftStyle,
  statisticsRequestToScreen,
} from './lib/statistics/parser';
import {
  clearStatisticsSourceSyncState,
  collapseDatasetToFrequencyTable,
  DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  datasetTextFromValues,
  expandFrequencyTableToDataset,
  pointsTextFromState,
  statisticsSourceSyncFromDatasetEdit,
  statisticsSourceSyncFromFrequencyEdit,
  statisticsRequestToWorkingSource,
} from './lib/statistics/shared';
import {
  buildTrigInputLatex,
  defaultTrigDraftForScreen,
  DEFAULT_ANGLE_CONVERT_STATE,
  DEFAULT_COSINE_RULE_STATE,
  DEFAULT_RIGHT_TRIANGLE_STATE,
  DEFAULT_SINE_RULE_STATE,
  DEFAULT_TRIG_EQUATION_STATE,
  DEFAULT_TRIG_FUNCTION_STATE,
  DEFAULT_TRIG_IDENTITY_STATE,
  TRIG_TARGET_FORM_LABELS,
} from './lib/trigonometry/examples';
import { SPECIAL_ANGLE_REFERENCE } from './lib/trigonometry/angles';
import {
  parseTrigDraft,
  trigDraftStyle,
  trigRequestToScreen,
} from './lib/trigonometry/parser';
import { buildTrigStructuredDraft, serializeTrigRequest } from './lib/trigonometry/serializer';
import {
  getTrigMenuEntries,
  getTrigMenuEntryAtIndex,
  getTrigMenuEntryByHotkey,
  getTrigMenuFooterText,
  getTrigParentScreen,
  getTrigRouteMeta,
  getTrigSoftActions,
  isTrigMenuScreen,
  moveTrigMenuIndex,
} from './lib/trigonometry/navigation';
import {
  ACTIVE_MILESTONE_TITLE,
  createKeyboardContext,
} from './lib/virtual-keyboard/capabilities';
import { buildVirtualKeyboardLayouts } from './lib/virtual-keyboard/layouts';
import { GeneratedPreviewCard } from './app/components/GeneratedPreviewCard';
import {
  createId,
  cycleAngleUnit,
  defaultEquationNumericSolvePanelState,
  emptySystem,
  guideSoftActionLabel,
  isAnyFormTarget,
  isPlainFormTarget,
  menuIndexForEquationScreen,
  polynomialTemplateLatex,
} from './app/logic/appUtils';
import {
  appendHistoryEntry,
  bootApp,
  clearHistoryEntries,
  isDesktopRuntime,
  loadHistoryEntries,
  loadLauncherCategories,
  persistMode,
  persistSettings,
} from './lib/tauri';
import {
  createCalculateRuntimeController,
  createEquationRuntimeController,
} from './app/logic/runtimeControllers';
import { executePrimaryActionWithDeps } from './app/logic/primaryActionRouter';
import {
  DEFAULT_LAUNCHER_CATEGORIES,
  DEFAULT_SETTINGS,
  type AdvancedCalcResultOrigin,
  type BinomialState,
  type AdvancedCalcScreen,
  type AdvancedDefiniteIntegralState,
  type AdvancedFiniteLimitState,
  type AdvancedImproperIntegralState,
  type AdvancedIndefiniteIntegralState,
  type AdvancedInfiniteLimitState,
  type CorrelationState,
  type CalculateScreen,
  type CosineRuleState,
  type CoreDraftState,
  type EquationScreen,
  type DisplayOutcomeAction,
  type FrequencyTable,
  type FirstOrderOdeState,
  type DerivativePointWorkbenchState,
  type DerivativeWorkbenchState,
  type DistanceState,
  type ArcSectorState,
  type CircleState,
  type ConeState,
  type CubeState,
  type CuboidState,
  type CylinderState,
  type GuideRoute,
  type LauncherAppEntry,
  type LauncherCategory,
  type LauncherLeafId,
  type LauncherState,
  type CalculateAction,
  type DisplayOutcome,
  type GuideExample,
  type HistoryEntry,
  type MatrixOperation,
  type ModeId,
  type GeometryScreen,
  type IntegralWorkbenchState,
  type LineEquationState,
  type MeanInferenceState,
  type MidpointState,
  type LimitWorkbenchState,
  type NormalState,
  type PolynomialEquationView,
  type NumericIvpState,
  type PartialDerivativeWorkbenchState,
  type PoissonState,
  type PeriodicFamilyInfo,
  type RegressionState,
  type ResultOrigin,
  type RightTriangleState,
  type SineRuleState,
  type SeriesState,
  type Settings,
  type SettingsPatch,
  type SecondOrderOdeState,
  type RectangleState,
  type SlopeState,
  type SphereState,
  type SquareState,
  type SimultaneousEquationView,
  type StatisticsScreen,
  type StatisticsRequest,
  type StatisticsSourceSyncState,
  type StatisticsWorkingSource,
  type StatsDataset,
  type TableResponse,
  type TriangleAreaState,
  type TriangleHeronState,
  type TrigEquationState,
  type TrigFunctionState,
  type TrigIdentityState,
  type TrigScreen,
  type VectorOperation,
} from './types/calculator';
import { formatMathTextForDisplay, latexToVisibleText } from './lib/math-notation';

const SETTINGS_DOCK_BREAKPOINT = 1180;
const APP_SHELL_PADDING = 28;
const CALCULATOR_SHELL_MAX_WIDTH = 1480;
const SIDE_SURFACE_WIDTH = 400;
const SIDE_SURFACE_GAP = 24;
const SIDE_SURFACE_MIN_SLACK = SIDE_SURFACE_WIDTH + SIDE_SURFACE_GAP;

type SideSurface = 'none' | 'settings' | 'history';
type SideSurfacePresentation = 'outboard' | 'overlay';

function getPeriodicStopReasonText(reason: PeriodicFamilyInfo['structuredStopReason'] | undefined) {
  if (!reason) {
    return '';
  }

  if (reason === 'second-periodic-parameter') {
    return 'Exact closure stops here because the next bounded reduction would introduce a second independent periodic parameter.';
  }
  if (reason === 'multi-parameter-periodic-family') {
    return 'Exact closure stops here because the remaining nested periodic family would require multiple independent periodic parameters.';
  }
  if (reason === 'periodic-depth-cap') {
    return 'Exact closure stops here because this bounded milestone stops after three periodic reduction steps.';
  }
  if (reason === 'unmerged-periodic-branches') {
    return 'Exact closure stops here because the remaining bounded periodic branches could not be merged into one exact family.';
  }
  if (reason === 'outside-principal-range') {
    return 'Exact closure stops here because the remaining branches fall outside the usable principal range.';
  }
  return 'Exact closure stops here because finishing the remaining sawtooth branches would require broader principal-range pruning than this milestone allows.';
}

function getCalculusProvenanceLabel(origin?: ResultOrigin) {
  switch (origin) {
    case 'rule-based-symbolic':
      return 'Rule-based symbolic';
    case 'heuristic-symbolic':
      return 'Heuristic symbolic';
    case 'numeric-fallback':
      return 'Numeric fallback';
    case 'symbolic':
    case 'symbolic-engine':
    case 'compute-engine':
      return 'Symbolic';
    default:
      return undefined;
  }
}

export default function App() {
  const showModeTabs = import.meta.env.DEV && import.meta.env.VITE_SHOW_MODE_TABS === '1';
  const [currentMode, setCurrentMode] = useState<ModeId>('calculate');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sideSurface, setSideSurface] = useState<SideSurface>('none');
  const [sideSurfaceOutboardEligible, setSideSurfaceOutboardEligible] = useState(false);
  const [sideSurfaceOutboardLeft, setSideSurfaceOutboardLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? SETTINGS_DOCK_BREAKPOINT : window.innerWidth,
  );
  const [runtimeLabel, setRuntimeLabel] = useState('Browser preview');
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<DisplayOutcome | null>(null);
  const [launcherCategories, setLauncherCategories] = useState<LauncherCategory[]>(DEFAULT_LAUNCHER_CATEGORIES);
  const [launcherState, setLauncherState] = useState<LauncherState>({
    surface: 'app',
    level: 'root',
    rootSelectedIndex: 0,
    categoryId: null,
    categorySelectedIndex: 0,
  });
  const [calculateLatex, setCalculateLatex] = useState('\\frac{1}{3}+\\frac{1}{6}');
  const [calculateScreen, setCalculateScreen] = useState<CalculateScreen>('standard');
  const [calculateAlgebraTrayOpen, setCalculateAlgebraTrayOpen] = useState(false);
  const [calculateMenuSelection, setCalculateMenuSelection] = useState(0);
  const [derivativeWorkbench, setDerivativeWorkbench] = useState<DerivativeWorkbenchState>(
    DEFAULT_DERIVATIVE_WORKBENCH,
  );
  const [derivativePointWorkbench, setDerivativePointWorkbench] =
    useState<DerivativePointWorkbenchState>(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
  const [integralWorkbench, setIntegralWorkbench] = useState<IntegralWorkbenchState>(
    DEFAULT_INTEGRAL_WORKBENCH,
  );
  const [limitWorkbench, setLimitWorkbench] = useState<LimitWorkbenchState>(
    DEFAULT_LIMIT_WORKBENCH,
  );
  const [advancedCalcScreen, setAdvancedCalcScreen] = useState<AdvancedCalcScreen>('home');
  const [advancedCalcMenuSelection, setAdvancedCalcMenuSelection] = useState({
    home: 0,
    integralsHome: 0,
    limitsHome: 0,
    seriesHome: 0,
    partialsHome: 0,
    odeHome: 0,
  });
  const [advancedIndefiniteIntegral, setAdvancedIndefiniteIntegral] =
    useState<AdvancedIndefiniteIntegralState>(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
  const [advancedDefiniteIntegral, setAdvancedDefiniteIntegral] =
    useState<AdvancedDefiniteIntegralState>(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
  const [advancedImproperIntegral, setAdvancedImproperIntegral] =
    useState<AdvancedImproperIntegralState>(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
  const [advancedFiniteLimit, setAdvancedFiniteLimit] =
    useState<AdvancedFiniteLimitState>(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
  const [advancedInfiniteLimit, setAdvancedInfiniteLimit] =
    useState<AdvancedInfiniteLimitState>(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
  const [maclaurinState, setMaclaurinState] = useState<SeriesState>(DEFAULT_MACLAURIN_STATE);
  const [taylorState, setTaylorState] = useState<SeriesState>(DEFAULT_TAYLOR_STATE);
  const [partialDerivativeState, setPartialDerivativeState] =
    useState<PartialDerivativeWorkbenchState>(DEFAULT_PARTIAL_DERIVATIVE_STATE);
  const [firstOrderOdeState, setFirstOrderOdeState] =
    useState<FirstOrderOdeState>(DEFAULT_FIRST_ORDER_ODE_STATE);
  const [secondOrderOdeState, setSecondOrderOdeState] =
    useState<SecondOrderOdeState>(DEFAULT_SECOND_ORDER_ODE_STATE);
  const [numericIvpState, setNumericIvpState] = useState<NumericIvpState>(DEFAULT_NUMERIC_IVP_STATE);
  const [trigScreen, setTrigScreen] = useState<TrigScreen>('home');
  const [trigMenuSelection, setTrigMenuSelection] = useState({
    home: 0,
    identitiesHome: 0,
    equationsHome: 0,
    trianglesHome: 0,
  });
  const [trigFunctionState, setTrigFunctionState] =
    useState<TrigFunctionState>(DEFAULT_TRIG_FUNCTION_STATE);
  const [trigIdentityState, setTrigIdentityState] =
    useState<TrigIdentityState>(DEFAULT_TRIG_IDENTITY_STATE);
  const [trigEquationState, setTrigEquationState] =
    useState<TrigEquationState>(DEFAULT_TRIG_EQUATION_STATE);
  const [rightTriangleState, setRightTriangleState] =
    useState<RightTriangleState>(DEFAULT_RIGHT_TRIANGLE_STATE);
  const [sineRuleState, setSineRuleState] =
    useState<SineRuleState>(DEFAULT_SINE_RULE_STATE);
  const [cosineRuleState, setCosineRuleState] =
    useState<CosineRuleState>(DEFAULT_COSINE_RULE_STATE);
  const [angleConvertState, setAngleConvertState] =
    useState(DEFAULT_ANGLE_CONVERT_STATE);
  const [specialAnglesExpression, setSpecialAnglesExpression] = useState('\\cos\\left(\\frac{\\pi}{3}\\right)');
  const [trigDraftState, setTrigDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'shorthand', 'guided', true),
  );
  const [geometryScreen, setGeometryScreen] = useState<GeometryScreen>('home');
  const [geometryMenuSelection, setGeometryMenuSelection] = useState({
    home: 0,
    shapes2dHome: 0,
    shapes3dHome: 0,
    triangleHome: 0,
    circleHome: 0,
    coordinateHome: 0,
  });
  const [statisticsScreen, setStatisticsScreen] = useState<StatisticsScreen>('home');
  const [statisticsMenuSelection, setStatisticsMenuSelection] = useState({
    home: 0,
    probabilityHome: 0,
    inferenceHome: 0,
  });
  const [statisticsWorkingSource, setStatisticsWorkingSource] = useState<StatisticsWorkingSource>('dataset');
  const [statisticsSourceSyncState, setStatisticsSourceSyncState] = useState<StatisticsSourceSyncState>(
    DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  );
  const [statsDataset, setStatsDataset] = useState<StatsDataset>(DEFAULT_STATS_DATASET);
  const [frequencyTable, setFrequencyTable] = useState<FrequencyTable>(DEFAULT_FREQUENCY_TABLE);
  const [binomialState, setBinomialState] = useState<BinomialState>(DEFAULT_BINOMIAL_STATE);
  const [normalState, setNormalState] = useState<NormalState>(DEFAULT_NORMAL_STATE);
  const [poissonState, setPoissonState] = useState<PoissonState>(DEFAULT_POISSON_STATE);
  const [meanInferenceState, setMeanInferenceState] = useState<MeanInferenceState>(
    DEFAULT_MEAN_INFERENCE_STATE,
  );
  const [regressionState, setRegressionState] = useState<RegressionState>(DEFAULT_REGRESSION_STATE);
  const [correlationState, setCorrelationState] = useState<CorrelationState>(DEFAULT_CORRELATION_STATE);
  const [statisticsDraftState, setStatisticsDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const [triangleAreaState, setTriangleAreaState] =
    useState<TriangleAreaState>(DEFAULT_TRIANGLE_AREA_STATE);
  const [triangleHeronState, setTriangleHeronState] =
    useState<TriangleHeronState>(DEFAULT_TRIANGLE_HERON_STATE);
  const [rectangleState, setRectangleState] =
    useState<RectangleState>(DEFAULT_RECTANGLE_STATE);
  const [squareState, setSquareState] =
    useState<SquareState>(DEFAULT_SQUARE_STATE);
  const [circleState, setCircleState] =
    useState<CircleState>(DEFAULT_CIRCLE_STATE);
  const [arcSectorState, setArcSectorState] =
    useState<ArcSectorState>(DEFAULT_ARC_SECTOR_STATE);
  const [cubeState, setCubeState] =
    useState<CubeState>(DEFAULT_CUBE_STATE);
  const [cuboidState, setCuboidState] =
    useState<CuboidState>(DEFAULT_CUBOID_STATE);
  const [cylinderState, setCylinderState] =
    useState<CylinderState>(DEFAULT_CYLINDER_STATE);
  const [coneState, setConeState] =
    useState<ConeState>(DEFAULT_CONE_STATE);
  const [sphereState, setSphereState] =
    useState<SphereState>(DEFAULT_SPHERE_STATE);
  const [distanceState, setDistanceState] =
    useState<DistanceState>(DEFAULT_DISTANCE_STATE);
  const [midpointState, setMidpointState] =
    useState<MidpointState>(DEFAULT_MIDPOINT_STATE);
  const [slopeState, setSlopeState] =
    useState<SlopeState>(DEFAULT_SLOPE_STATE);
  const [lineEquationState, setLineEquationState] =
    useState<LineEquationState>(DEFAULT_LINE_EQUATION_STATE);
  const [geometryDraftState, setGeometryDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const [equationLatex, setEquationLatex] = useState('x^2-5x+6=0');
  const [equationScreen, setEquationScreen] = useState<EquationScreen>('home');
  const [equationAlgebraTrayOpen, setEquationAlgebraTrayOpen] = useState(false);
  const [equationNumericSolvePanel, setEquationNumericSolvePanel] = useState<{
    enabled: boolean;
    start: string;
    end: string;
    subdivisions: number;
  }>(defaultEquationNumericSolvePanelState);
  const [equationMenuSelection, setEquationMenuSelection] = useState({
    home: 0,
    polynomialMenu: 0,
    simultaneousMenu: 0,
  });
  const [quadraticCoefficients, setQuadraticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic,
  ]);
  const [cubicCoefficients, setCubicCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic,
  ]);
  const [quarticCoefficients, setQuarticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic,
  ]);
  const [ansLatex, setAnsLatex] = useState('0');
  const [matrixA, setMatrixA] = useState([
    [1, 2],
    [3, 4],
  ]);
  const [matrixB, setMatrixB] = useState([
    [5, 6],
    [7, 8],
  ]);
  const [matrixNotationLatex, setMatrixNotationLatex] = useState('');
  const [vectorA, setVectorA] = useState([1, 2, 3]);
  const [vectorB, setVectorB] = useState([4, 5, 6]);
  const [vectorNotationLatex, setVectorNotationLatex] = useState('');
  const [tablePrimaryLatex, setTablePrimaryLatex] = useState('x^2');
  const [tableSecondaryLatex, setTableSecondaryLatex] = useState('x+1');
  const [tableSecondaryEnabled, setTableSecondaryEnabled] = useState(false);
  const [tableStart, setTableStart] = useState(-2);
  const [tableEnd, setTableEnd] = useState(2);
  const [tableStep, setTableStep] = useState(1);
  const [tableResponse, setTableResponse] = useState<TableResponse | null>(null);
  const [guideRoute, setGuideRoute] = useState<GuideRoute>({ screen: 'home' });
  const [guideSelection, setGuideSelection] = useState({
    home: 0,
    domain: {
      basics: 0,
      algebra: 0,
      discrete: 0,
      calculus: 0,
      linearAlgebra: 0,
      advancedCalculus: 0,
      trigonometry: 0,
      statistics: 0,
      geometry: 0,
    },
    symbolLookup: 0,
    modeGuide: 0,
    search: 0,
    article: {} as Record<string, number>,
  });
  const [system2, setSystem2] = useState([
    [1, 1, 3],
    [2, -1, 0],
  ]);
  const [system3, setSystem3] = useState([
    [1, 1, 1, 6],
    [2, -1, 1, 3],
    [1, 2, -1, 3],
  ]);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previousNonGuideMode, setPreviousNonGuideMode] = useState<Exclude<ModeId, 'guide'>>('calculate');

  const mainFieldRef = useRef<MathfieldElement | null>(null);
  const activeFieldRef = useRef<MathfieldElement | null>(null);
  const settingsReadyRef = useRef(false);
  const calculateMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const derivativeFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointFieldRef = useRef<MathfieldElement | null>(null);
  const integralFieldRef = useRef<MathfieldElement | null>(null);
  const limitFieldRef = useRef<MathfieldElement | null>(null);
  const advancedMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const trigMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const geometryMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const statisticsMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const advancedIndefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedDefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedImproperFieldRef = useRef<MathfieldElement | null>(null);
  const advancedFiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const advancedInfiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const maclaurinFieldRef = useRef<MathfieldElement | null>(null);
  const taylorFieldRef = useRef<MathfieldElement | null>(null);
  const partialDerivativeFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeLhsFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeRhsFieldRef = useRef<MathfieldElement | null>(null);
  const secondOrderOdeForcingFieldRef = useRef<MathfieldElement | null>(null);
  const numericIvpFieldRef = useRef<MathfieldElement | null>(null);
  const trigDraftFieldRef = useRef<MathfieldElement | null>(null);
  const statisticsDraftFieldRef = useRef<MathfieldElement | null>(null);
  const geometryDraftFieldRef = useRef<MathfieldElement | null>(null);
  const matrixNotationFieldRef = useRef<MathfieldElement | null>(null);
  const vectorNotationFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointValueRef = useRef<HTMLInputElement | null>(null);
  const integralLowerRef = useRef<HTMLInputElement | null>(null);
  const limitTargetRef = useRef<HTMLInputElement | null>(null);
  const advancedDefiniteLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedImproperLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedFiniteLimitTargetRef = useRef<HTMLInputElement | null>(null);
  const taylorCenterRef = useRef<HTMLInputElement | null>(null);
  const secondOrderA2Ref = useRef<HTMLInputElement | null>(null);
  const numericIvpX0Ref = useRef<HTMLInputElement | null>(null);
  const rightTriangleSideARef = useRef<HTMLInputElement | null>(null);
  const sineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const cosineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const angleConvertValueRef = useRef<HTMLInputElement | null>(null);
  const squareSideRef = useRef<HTMLInputElement | null>(null);
  const rectangleWidthRef = useRef<HTMLInputElement | null>(null);
  const triangleAreaBaseRef = useRef<HTMLInputElement | null>(null);
  const triangleHeronARef = useRef<HTMLInputElement | null>(null);
  const circleRadiusRef = useRef<HTMLInputElement | null>(null);
  const arcSectorRadiusRef = useRef<HTMLInputElement | null>(null);
  const cubeSideRef = useRef<HTMLInputElement | null>(null);
  const cuboidLengthRef = useRef<HTMLInputElement | null>(null);
  const cylinderRadiusRef = useRef<HTMLInputElement | null>(null);
  const coneRadiusRef = useRef<HTMLInputElement | null>(null);
  const sphereRadiusRef = useRef<HTMLInputElement | null>(null);
  const distanceP1XRef = useRef<HTMLInputElement | null>(null);
  const midpointP1XRef = useRef<HTMLInputElement | null>(null);
  const slopeP1XRef = useRef<HTMLInputElement | null>(null);
  const lineEquationP1XRef = useRef<HTMLInputElement | null>(null);
  const statisticsBinomialNRef = useRef<HTMLInputElement | null>(null);
  const statisticsNormalMeanRef = useRef<HTMLInputElement | null>(null);
  const statisticsPoissonLambdaRef = useRef<HTMLInputElement | null>(null);
  const statisticsMeanInferenceLevelRef = useRef<HTMLInputElement | null>(null);
  const statisticsRegressionXRef = useRef<HTMLInputElement | null>(null);
  const statisticsCorrelationXRef = useRef<HTMLInputElement | null>(null);
  const statisticsFrequencyValueRef = useRef<HTMLInputElement | null>(null);
  const statisticsDatasetRef = useRef<HTMLTextAreaElement | null>(null);
  const equationMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const guideMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const guideSearchInputRef = useRef<HTMLInputElement | null>(null);
  const appStageRef = useRef<HTMLDivElement | null>(null);
  const calculatorShellRef = useRef<HTMLDivElement | null>(null);
  const polynomialInputRefs = useRef<Record<PolynomialEquationView, HTMLInputElement | null>>({
    quadratic: null,
    cubic: null,
    quartic: null,
  });
  const systemInputRefs = useRef<Record<SimultaneousEquationView, HTMLInputElement | null>>({
    linear2: null,
    linear3: null,
  });

  const settingsOpen = sideSurface === 'settings';
  const historyOpen = sideSurface === 'history';
  const sideSurfaceSide = 'right' as const;
  const sideSurfacePresentation: SideSurfacePresentation =
    sideSurfaceOutboardEligible ? 'outboard' : 'overlay';
  const sideSurfaceOverlayOpen = sideSurface !== 'none' && sideSurfacePresentation === 'overlay';
  const sideSurfaceOutboardOpen =
    sideSurface !== 'none' && sideSurfacePresentation === 'outboard';
  const calculatorShellStyle = {
    '--ui-scale': `${settings.uiScale / 100}`,
    '--math-scale': `${settings.mathScale / 100}`,
    '--result-scale': `${settings.resultScale / 100}`,
  } as CSSProperties;
  const symbolicDisplayPrefs = {
    symbolicDisplayMode: settings.symbolicDisplayMode,
    flattenNestedRootsWhenSafe: settings.flattenNestedRootsWhenSafe,
  } as const;
  const sideSurfaceHostStyle = {
    left: `${sideSurfaceOutboardLeft}px`,
    width: `${SIDE_SURFACE_WIDTH}px`,
  } as CSSProperties;

  const isLauncherOpen = launcherState.surface === 'launcher';
  const activeLauncherLeafId: LauncherLeafId =
    currentMode === 'calculate' && calculateScreen !== 'standard'
      ? 'calculus'
      : currentMode === 'guide'
        ? previousNonGuideMode === 'calculate' ? 'calculate' : previousNonGuideMode
        : currentMode;
  const selectedLauncherCategory = getLauncherCategoryAtIndex(
    launcherCategories,
    launcherState.rootSelectedIndex,
  );
  const activeLauncherCategory =
    launcherState.level === 'category'
      ? launcherCategories.find((category) => category.id === launcherState.categoryId)
      : selectedLauncherCategory;
  const selectedLauncherApp = activeLauncherCategory
    ? getLauncherAppAtIndex(activeLauncherCategory, launcherState.categorySelectedIndex)
    : undefined;
  const calculateRouteMeta = currentMode === 'calculate'
    ? getCalculateRouteMeta(calculateScreen)
    : null;
  const advancedCalcRouteMeta = currentMode === 'advancedCalculus'
    ? getAdvancedCalcRouteMeta(advancedCalcScreen)
    : null;
  const trigRouteMeta = currentMode === 'trigonometry'
    ? getTrigRouteMeta(trigScreen)
    : null;
  const statisticsRouteMeta = currentMode === 'statistics'
    ? getStatisticsRouteMeta(statisticsScreen)
    : null;
  const geometryRouteMeta = currentMode === 'geometry'
    ? getGeometryRouteMeta(geometryScreen)
    : null;
  const isCalculateMenuOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateMenuScreen(calculateScreen);
  const isCalculateToolOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateToolScreen(calculateScreen);
  const isAdvancedCalcMenuOpen =
    !isLauncherOpen && currentMode === 'advancedCalculus' && isAdvancedCalcMenuScreen(advancedCalcScreen);
  const isTrigMenuOpen =
    !isLauncherOpen && currentMode === 'trigonometry' && isTrigMenuScreen(trigScreen);
  const isStatisticsMenuOpen =
    !isLauncherOpen && currentMode === 'statistics' && isStatisticsMenuScreen(statisticsScreen);
  const isGeometryMenuOpen =
    !isLauncherOpen && currentMode === 'geometry' && isGeometryMenuScreen(geometryScreen);
  const advancedCalcMenuEntries = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntries(advancedCalcScreen)
    : [];
  const trigMenuEntries = isTrigMenuOpen
    ? getTrigMenuEntries(trigScreen)
    : [];
  const statisticsMenuEntries = isStatisticsMenuOpen
    ? getStatisticsMenuEntries(statisticsScreen)
    : [];
  const geometryMenuEntries = isGeometryMenuOpen
    ? getGeometryMenuEntries(geometryScreen)
    : [];
  const currentAdvancedCalcMenuIndex = isAdvancedCalcMenuOpen
    ? advancedCalcMenuSelection[
      advancedCalcScreen as keyof typeof advancedCalcMenuSelection
    ]
    : 0;
  const currentTrigMenuIndex = isTrigMenuOpen
    ? trigMenuSelection[
      trigScreen as keyof typeof trigMenuSelection
    ]
    : 0;
  const currentStatisticsMenuIndex = isStatisticsMenuOpen
    ? statisticsMenuSelection[
      statisticsScreen as keyof typeof statisticsMenuSelection
    ]
    : 0;
  const currentGeometryMenuIndex = isGeometryMenuOpen
    ? geometryMenuSelection[
      geometryScreen as keyof typeof geometryMenuSelection
    ]
    : 0;
  const selectedAdvancedCalcMenuEntry = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntryAtIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex)
    : undefined;
  const selectedTrigMenuEntry = isTrigMenuOpen
    ? getTrigMenuEntryAtIndex(trigScreen, currentTrigMenuIndex)
    : undefined;
  const selectedStatisticsMenuEntry = isStatisticsMenuOpen
    ? getStatisticsMenuEntryAtIndex(statisticsScreen, currentStatisticsMenuIndex)
    : undefined;
  const selectedGeometryMenuEntry = isGeometryMenuOpen
    ? getGeometryMenuEntryAtIndex(geometryScreen, currentGeometryMenuIndex)
    : undefined;
  const calculateMenuEntries = isCalculateMenuOpen ? getCalculateMenuEntries() : [];
  const selectedCalculateMenuEntry = isCalculateMenuOpen
    ? getCalculateMenuEntryAtIndex(calculateMenuSelection)
    : undefined;
  const calculateMenuFooterText = currentMode === 'calculate'
    ? getCalculateMenuFooterText(calculateScreen)
    : '';
  const advancedCalcMenuFooterText = currentMode === 'advancedCalculus'
    ? getAdvancedCalcMenuFooterText(advancedCalcScreen)
    : '';
  const trigMenuFooterText = currentMode === 'trigonometry'
    ? getTrigMenuFooterText(trigScreen)
    : '';
  const statisticsMenuFooterText = currentMode === 'statistics'
    ? getStatisticsMenuFooterText(statisticsScreen)
    : '';
  const geometryMenuFooterText = currentMode === 'geometry'
    ? getGeometryMenuFooterText(geometryScreen)
    : '';
  const statisticsStateSnapshot = {
    dataset: statsDataset,
    frequencyTable,
    binomial: binomialState,
    normal: normalState,
    poisson: poissonState,
    meanInference: meanInferenceState,
    regression: regressionState,
    correlation: correlationState,
  };
  const statisticsWorkbenchExpression =
    currentMode === 'statistics'
      ? buildStatisticsInputLatex(
        statisticsScreen,
        statisticsStateSnapshot,
        statisticsWorkingSource,
      )
      : '';
  const statisticsDraftLatex =
    currentMode === 'statistics'
      ? statisticsDraftState.rawLatex
      : '';
  const statisticsEditorIsEditable =
    currentMode === 'statistics'
    && statisticsRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(statisticsDraftState);
  const geometryStateSnapshot = {
    triangleArea: triangleAreaState,
    triangleHeron: triangleHeronState,
    rectangle: rectangleState,
    square: squareState,
    circle: circleState,
    arcSector: arcSectorState,
    cube: cubeState,
    cuboid: cuboidState,
    cylinder: cylinderState,
    cone: coneState,
    sphere: sphereState,
    distance: distanceState,
    midpoint: midpointState,
    slope: slopeState,
    lineEquation: lineEquationState,
  };
  const geometryWorkbenchExpression =
    currentMode === 'geometry'
      ? buildGeometryInputLatex(geometryScreen, geometryStateSnapshot)
      : '';
  const geometryDraftLatex =
    currentMode === 'geometry'
      ? geometryDraftState.rawLatex
      : '';
  const geometryEditorIsEditable =
    currentMode === 'geometry'
    && geometryRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(geometryDraftState);
  const trigStateSnapshot = {
    trigFunction: trigFunctionState,
    trigIdentity: trigIdentityState,
    trigEquation: { ...trigEquationState, angleUnit: settings.angleUnit },
    rightTriangle: rightTriangleState,
    sineRule: sineRuleState,
    cosineRule: cosineRuleState,
    angleConvert: angleConvertState,
    specialAnglesExpression,
  };
  const trigWorkbenchExpression =
    currentMode === 'trigonometry'
      ? buildTrigInputLatex(trigScreen, trigStateSnapshot)
      : '';
  const trigDraftLatex =
    currentMode === 'trigonometry'
      ? trigDraftState.rawLatex
      : '';
  const trigEditorIsEditable =
    currentMode === 'trigonometry'
    && trigRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(trigDraftState);
  const advancedCalcWorkbenchExpression =
    currentMode === 'advancedCalculus'
      ? advancedCalcScreen === 'indefiniteIntegral'
        ? buildAdvancedIntegralLatex('indefinite', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
        : advancedCalcScreen === 'definiteIntegral'
          ? buildAdvancedIntegralLatex('definite', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
          : advancedCalcScreen === 'improperIntegral'
            ? buildAdvancedIntegralLatex('improper', advancedIndefiniteIntegral, advancedDefiniteIntegral, advancedImproperIntegral)
            : advancedCalcScreen === 'finiteLimit'
              ? buildAdvancedFiniteLimitLatex(advancedFiniteLimit)
              : advancedCalcScreen === 'infiniteLimit'
                ? buildAdvancedInfiniteLimitLatex(advancedInfiniteLimit)
                : advancedCalcScreen === 'maclaurin'
                  ? buildSeriesPreviewLatex(maclaurinState)
                  : advancedCalcScreen === 'taylor'
                    ? buildSeriesPreviewLatex(taylorState)
                    : advancedCalcScreen === 'partialDerivative'
                      ? buildPartialDerivativeLatex(partialDerivativeState)
                    : advancedCalcScreen === 'odeFirstOrder'
                      ? buildFirstOrderOdeLatex(firstOrderOdeState)
                      : advancedCalcScreen === 'odeSecondOrder'
                        ? buildSecondOrderOdeLatex(secondOrderOdeState)
                        : advancedCalcScreen === 'odeNumericIvp'
                          ? buildNumericIvpLatex(numericIvpState)
                          : ''
      : '';
  const calculateWorkbenchExpression = currentMode === 'calculate'
    ? buildWorkbenchExpression(
      calculateScreen,
      derivativeWorkbench,
      derivativePointWorkbench,
      integralWorkbench,
      limitWorkbench,
    )
    : { latex: '' };
  const currentEquationMenuScreen = isEquationMenuScreen(equationScreen) ? equationScreen : null;
  const guideEnabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;
  const equationMenuEntries = currentMode === 'equation' && currentEquationMenuScreen
    ? getEquationMenuEntries(currentEquationMenuScreen)
    : [];
  const currentEquationMenuIndex = currentEquationMenuScreen
    ? equationMenuSelection[currentEquationMenuScreen]
    : 0;
  const selectedEquationMenuEntry = getEquationMenuEntryAtIndex(
    equationMenuEntries,
    currentEquationMenuIndex,
  );
  const isEquationMenuOpen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen !== null;
  const isEquationWorkScreen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen === null;
  const displayHeaderLabel =
    isLauncherOpen
      ? 'Menu'
      : currentMode === 'calculate' && calculateScreen !== 'standard'
        ? 'Calculus'
        : currentMode === 'statistics'
          ? 'Statistics'
        : currentMode === 'advancedCalculus'
          ? 'Advanced Calc'
        : MODE_LABELS[currentMode];
  const equationRouteMeta = currentMode === 'equation' ? getEquationRouteMeta(equationScreen) : null;
  const equationInputLatex = equationInputLatexForScreen(
    equationScreen,
    equationLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
  );
  const displayInputLatex =
    isLauncherOpen
      ? ''
      : currentMode === 'calculate'
        ? calculateScreen === 'standard'
          ? calculateLatex
          : calculateWorkbenchExpression.latex
      : currentMode === 'advancedCalculus'
        ? advancedCalcWorkbenchExpression
      : currentMode === 'trigonometry'
        ? trigDraftLatex
      : currentMode === 'statistics'
        ? statisticsDraftLatex
      : currentMode === 'geometry'
        ? geometryDraftLatex
      : currentMode === 'equation' && !isEquationMenuScreen(equationScreen)
        ? equationInputLatex
        : '';
  const deferredDisplayLatex = useDeferredValue(displayInputLatex);
  const displayMathLatex =
    displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.exactLatex
      : undefined;
  const equationResultTitle =
    currentMode === 'equation' ? getEquationDisplayTitle(equationScreen, displayOutcome) : null;
  const equationMenuFooterText =
    currentMode === 'equation' && isEquationMenuOpen
      ? getEquationMenuFooterText(equationScreen)
      : '';
  const guideRouteMeta = currentMode === 'guide'
    ? getGuideRouteMeta(guideRoute, guideEnabledCapabilities)
    : null;
  const guideListEntries = currentMode === 'guide'
    ? getGuideListEntries(guideRoute, guideEnabledCapabilities)
    : [];
  const currentGuideSelectionIndex =
    currentMode !== 'guide'
      ? 0
      : guideRoute.screen === 'home'
        ? guideSelection.home
        : guideRoute.screen === 'domain'
          ? guideSelection.domain[guideRoute.domainId]
          : guideRoute.screen === 'symbolLookup'
            ? guideSelection.symbolLookup
            : guideRoute.screen === 'modeGuide' && !guideRoute.modeId
              ? guideSelection.modeGuide
              : guideRoute.screen === 'search'
                ? guideSelection.search
                : guideRoute.screen === 'article'
                  ? (guideSelection.article[guideRoute.articleId] ?? 0)
                  : 0;
  const selectedGuideListEntry =
    currentMode === 'guide' && guideListEntries.length > 0
      ? guideListEntries[clampGuideIndex(currentGuideSelectionIndex, guideListEntries.length)]
      : undefined;
  const guideArticle =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getGuideArticle(guideRoute.articleId)
      : null;
  const selectedGuideExample =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getSelectedGuideExample(guideArticle ?? undefined, currentGuideSelectionIndex)
      : undefined;
  const guideModeRef =
    currentMode === 'guide' && guideRoute.screen === 'modeGuide' && guideRoute.modeId
      ? getGuideModeRef(guideRoute.modeId)
      : undefined;
  const activeGuideHomeEntries = getActiveGuideHomeEntries(guideEnabledCapabilities);
  const guideSearchQuery =
    currentMode === 'guide' && (guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup')
      ? guideRoute.query
      : '';
  const guideSoftMenu = guideRouteMeta?.softActions.map((action) => {
    const meta = guideSoftActionLabel(action);
    return {
      id: action,
      label: meta.label,
      hotkey: meta.hotkey,
    };
  }) ?? [];
  const activeSoftMenu = isLauncherOpen
    ? LAUNCHER_SOFT_ACTIONS
    : currentMode === 'guide'
      ? guideSoftMenu
    : currentMode === 'geometry'
      ? getGeometrySoftActions(geometryScreen)
    : currentMode === 'statistics'
      ? getStatisticsSoftActions(statisticsScreen)
    : currentMode === 'trigonometry'
      ? getTrigSoftActions(trigScreen)
    : currentMode === 'advancedCalculus'
      ? getAdvancedCalcSoftActions(advancedCalcScreen)
    : currentMode === 'calculate'
      ? getCalculateSoftActions(calculateScreen)
    : currentMode === 'equation'
      ? getEquationSoftActions(equationScreen)
      : SOFT_MENU_BY_MODE[currentMode];
  const calculateAlgebraTransforms =
    currentMode === 'calculate' && calculateScreen === 'standard'
      ? getEligibleExpressionTransforms(calculateLatex)
      : [];
  const equationAlgebraTransforms =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? getEligibleEquationTransforms(equationLatex)
      : [];

  function focusTrigEditor() {
    trigDraftFieldRef.current?.focus?.();
    activeFieldRef.current = trigDraftFieldRef.current;
  }

  function focusStatisticsEditor() {
    statisticsDraftFieldRef.current?.focus?.();
    activeFieldRef.current = statisticsDraftFieldRef.current;
  }

  function focusGeometryEditor() {
    geometryDraftFieldRef.current?.focus?.();
    activeFieldRef.current = geometryDraftFieldRef.current;
  }

  useEffect(() => {
    let cancelled = false;
    setRuntimeLabel(isDesktopRuntime() ? 'Desktop runtime' : 'Browser preview');

    void (async () => {
      try {
        const bootstrap = await bootApp();
        if (cancelled) {
          return;
        }

        setCurrentMode(bootstrap.currentMode);
        setSettings(bootstrap.settings);
      } catch {
        // Fall back to the existing default shell state instead of leaving the header
        // stuck on "Loading..." if a non-critical bootstrap read fails.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    void loadHistoryEntries()
      .then((loadedHistory) => {
        if (!cancelled) {
          setHistory(loadedHistory);
        }
      })
      .catch(() => {});

    void loadLauncherCategories()
      .then((loadedLauncherCategories) => {
        if (!cancelled) {
          setLauncherCategories(loadedLauncherCategories);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNumericOutputSettings({
      approxDigits: settings.approxDigits,
      numericNotationMode: settings.numericNotationMode,
      scientificNotationStyle: settings.scientificNotationStyle,
    });
  }, [
    settings.approxDigits,
    settings.numericNotationMode,
    settings.scientificNotationStyle,
  ]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!settingsReadyRef.current) {
      settingsReadyRef.current = true;
      return;
    }

    void persistSettings(settings);
  }, [hydrated, settings]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const measureSideSurfaceLayout = useEffectEvent(() => {
    let availableRightSlack = 0;
    let nextOutboardLeft = 0;

    const stageRect = appStageRef.current?.getBoundingClientRect();
    const shellRect = calculatorShellRef.current?.getBoundingClientRect();

    if (stageRect && shellRect && stageRect.width > 0 && shellRect.width > 0) {
      availableRightSlack = Math.max(0, stageRect.right - shellRect.right);
      nextOutboardLeft = Math.max(0, shellRect.right - stageRect.left + SIDE_SURFACE_GAP);
    } else {
      const appInnerWidth = Math.max(viewportWidth - APP_SHELL_PADDING * 2, 0);
      const shellWidth = Math.min(appInnerWidth, CALCULATOR_SHELL_MAX_WIDTH);
      const shellLeft = Math.max((appInnerWidth - shellWidth) / 2, 0);
      availableRightSlack = Math.max(0, appInnerWidth - (shellLeft + shellWidth));
      nextOutboardLeft = shellLeft + shellWidth + SIDE_SURFACE_GAP;
    }

    setSideSurfaceOutboardEligible(
      viewportWidth >= SETTINGS_DOCK_BREAKPOINT && availableRightSlack >= SIDE_SURFACE_MIN_SLACK,
    );
    setSideSurfaceOutboardLeft(nextOutboardLeft);
  });

  useEffect(() => {
    measureSideSurfaceLayout();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureSideSurfaceLayout();
    });

    if (appStageRef.current) {
      observer.observe(appStageRef.current);
    }

    if (calculatorShellRef.current) {
      observer.observe(calculatorShellRef.current);
    }

    return () => observer.disconnect();
  }, [settings.uiScale, viewportWidth]);

  useEffect(() => {
    if (!clipboardNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setClipboardNotice(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [clipboardNotice]);

  function patchSettings(patch: SettingsPatch) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      ...patch,
    }));
  }

  function closeSettingsPanel() {
    setSideSurface((currentSurface) => (currentSurface === 'settings' ? 'none' : currentSurface));
  }

  function closeHistoryPanel() {
    setSideSurface((currentSurface) => (currentSurface === 'history' ? 'none' : currentSurface));
  }

  function closeSideSurface() {
    setSideSurface('none');
  }

  function toggleSettingsPanel() {
    setSideSurface((currentSurface) =>
      currentSurface === 'settings' ? 'none' : 'settings',
    );
  }

  function toggleHistoryPanel() {
    if (isLauncherOpen || currentMode === 'guide') {
      return;
    }

    setSideSurface((currentSurface) =>
      currentSurface === 'history' ? 'none' : 'history',
    );
  }

  useEffect(() => {
    if (isLauncherOpen || historyOpen || sideSurfaceOverlayOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (currentMode === 'calculate') {
        if (calculateRouteMeta?.focusTarget === 'menu') {
          calculateMenuPanelRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'body') {
          const targetField =
            calculateScreen === 'derivative'
              ? derivativeFieldRef.current
              : calculateScreen === 'derivativePoint'
                ? derivativePointFieldRef.current
                : calculateScreen === 'integral'
                  ? integralFieldRef.current
                  : calculateScreen === 'limit'
                    ? limitFieldRef.current
                    : null;
          targetField?.focus?.();
          activeFieldRef.current = targetField;
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'point') {
          derivativePointValueRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'bounds') {
          integralLowerRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'target') {
          limitTargetRef.current?.focus();
          return;
        }

        mainFieldRef.current?.focus?.();
        activeFieldRef.current = mainFieldRef.current;
        return;
      }

      if (currentMode === 'advancedCalculus' && advancedCalcRouteMeta) {
        if (advancedCalcRouteMeta.focusTarget === 'menu') {
          advancedMenuPanelRef.current?.focus();
          return;
        }

        if (advancedCalcScreen === 'indefiniteIntegral') {
          advancedIndefiniteFieldRef.current?.focus?.();
          activeFieldRef.current = advancedIndefiniteFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'definiteIntegral') {
          advancedDefiniteFieldRef.current?.focus?.();
          activeFieldRef.current = advancedDefiniteFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'improperIntegral') {
          advancedImproperFieldRef.current?.focus?.();
          activeFieldRef.current = advancedImproperFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'finiteLimit') {
          advancedFiniteLimitFieldRef.current?.focus?.();
          activeFieldRef.current = advancedFiniteLimitFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'infiniteLimit') {
          advancedInfiniteLimitFieldRef.current?.focus?.();
          activeFieldRef.current = advancedInfiniteLimitFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'maclaurin') {
          maclaurinFieldRef.current?.focus?.();
          activeFieldRef.current = maclaurinFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'taylor') {
          taylorFieldRef.current?.focus?.();
          activeFieldRef.current = taylorFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'partialDerivative') {
          partialDerivativeFieldRef.current?.focus?.();
          activeFieldRef.current = partialDerivativeFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'odeFirstOrder') {
          firstOrderOdeLhsFieldRef.current?.focus?.();
          activeFieldRef.current = firstOrderOdeLhsFieldRef.current;
          return;
        }

        if (advancedCalcScreen === 'odeSecondOrder') {
          secondOrderA2Ref.current?.focus();
          return;
        }

        if (advancedCalcScreen === 'odeNumericIvp') {
          numericIvpFieldRef.current?.focus?.();
          activeFieldRef.current = numericIvpFieldRef.current;
          return;
        }
      }

      if (currentMode === 'trigonometry' && trigRouteMeta) {
        if (trigRouteMeta.focusTarget === 'menu') {
          trigMenuPanelRef.current?.focus();
          return;
        }

        if (trigRouteMeta.focusTarget === 'editor') {
          focusTrigEditor();
          return;
        }

        if (trigScreen === 'rightTriangle') {
          rightTriangleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'sineRule') {
          sineRuleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'cosineRule') {
          cosineRuleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'angleConvert') {
          angleConvertValueRef.current?.focus();
          return;
        }
      }

      if (currentMode === 'geometry' && geometryRouteMeta) {
        if (geometryRouteMeta.focusTarget === 'menu') {
          geometryMenuPanelRef.current?.focus();
          return;
        }

        if (geometryRouteMeta.focusTarget === 'editor') {
          focusGeometryEditor();
          return;
        }

        if (geometryScreen === 'square') {
          squareSideRef.current?.focus();
          return;
        }

        if (geometryScreen === 'rectangle') {
          rectangleWidthRef.current?.focus();
          return;
        }

        if (geometryScreen === 'triangleArea') {
          triangleAreaBaseRef.current?.focus();
          return;
        }

        if (geometryScreen === 'triangleHeron') {
          triangleHeronARef.current?.focus();
          return;
        }

        if (geometryScreen === 'circle') {
          circleRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'arcSector') {
          arcSectorRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cube') {
          cubeSideRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cuboid') {
          cuboidLengthRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cylinder') {
          cylinderRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cone') {
          coneRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'sphere') {
          sphereRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'distance') {
          distanceP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'midpoint') {
          midpointP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'slope') {
          slopeP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'lineEquation') {
          lineEquationP1XRef.current?.focus();
        }
      }

      if (currentMode === 'statistics' && statisticsRouteMeta) {
        if (statisticsRouteMeta.focusTarget === 'menu') {
          statisticsMenuPanelRef.current?.focus();
          return;
        }

        if (statisticsRouteMeta.focusTarget === 'editor') {
          focusStatisticsEditor();
          return;
        }

        if (statisticsScreen === 'binomial') {
          statisticsBinomialNRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'normal') {
          statisticsNormalMeanRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'poisson') {
          statisticsPoissonLambdaRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'meanInference') {
          statisticsMeanInferenceLevelRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'regression') {
          statisticsRegressionXRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'correlation') {
          statisticsCorrelationXRef.current?.focus();
          return;
        }

        if (
          statisticsScreen === 'frequency'
          || (statisticsScreen === 'descriptive' && statisticsWorkingSource === 'frequencyTable')
        ) {
          statisticsFrequencyValueRef.current?.focus();
          return;
        }

        statisticsDatasetRef.current?.focus();
        return;
      }

      if (currentMode === 'guide' && guideRouteMeta) {
        if (guideRouteMeta.focusTarget === 'menu') {
          guideMenuPanelRef.current?.focus();
          return;
        }

        if (guideRouteMeta.focusTarget === 'search') {
          guideSearchInputRef.current?.focus();
          return;
        }

        return;
      }

      if (currentMode !== 'equation' || !equationRouteMeta) {
        return;
      }

      if (equationRouteMeta.focusTarget === 'menu') {
        equationMenuPanelRef.current?.focus();
        return;
      }

      if (equationRouteMeta.focusTarget === 'symbolic') {
        mainFieldRef.current?.focus?.();
        activeFieldRef.current = mainFieldRef.current;
        return;
      }

      if (
        equationRouteMeta.focusTarget === 'polynomial' &&
        isPolynomialEquationScreen(equationScreen)
      ) {
        polynomialInputRefs.current[equationScreen]?.focus();
        return;
      }

      if (
        equationRouteMeta.focusTarget === 'simultaneous' &&
        isSimultaneousEquationScreen(equationScreen)
      ) {
        systemInputRefs.current[equationScreen]?.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    advancedCalcRouteMeta,
    advancedCalcScreen,
    calculateRouteMeta,
    calculateScreen,
    currentMode,
    equationRouteMeta,
    equationScreen,
    guideRouteMeta,
    historyOpen,
    isLauncherOpen,
    sideSurfaceOverlayOpen,
    geometryRouteMeta,
    geometryScreen,
    statisticsRouteMeta,
    statisticsScreen,
    statisticsWorkingSource,
    trigRouteMeta,
    trigScreen,
  ]);

  function openEquationScreen(screen: EquationScreen) {
    const menuSelection = menuIndexForEquationScreen(screen);
    if (menuSelection) {
      setCurrentEquationMenuIndex(menuSelection.menu, menuSelection.index);
    }
    setEquationScreen(screen);
    if (screen !== 'symbolic') {
      setEquationNumericSolvePanel(defaultEquationNumericSolvePanelState());
    }
    setDisplayOutcome(null);
  }

  function openGuideRoute(route: GuideRoute) {
    setGuideRoute(route);
  }

  function setCurrentGuideSelectionIndex(index: number) {
    setGuideSelection((currentSelection) => {
      if (guideRoute.screen === 'home') {
        return { ...currentSelection, home: index };
      }

      if (guideRoute.screen === 'domain') {
        return {
          ...currentSelection,
          domain: {
            ...currentSelection.domain,
            [guideRoute.domainId]: index,
          },
        };
      }

      if (guideRoute.screen === 'symbolLookup') {
        return { ...currentSelection, symbolLookup: index };
      }

      if (guideRoute.screen === 'modeGuide' && !guideRoute.modeId) {
        return { ...currentSelection, modeGuide: index };
      }

      if (guideRoute.screen === 'search') {
        return { ...currentSelection, search: index };
      }

      if (guideRoute.screen === 'article') {
        return {
          ...currentSelection,
          article: {
            ...currentSelection.article,
            [guideRoute.articleId]: index,
          },
        };
      }

      return currentSelection;
    });
  }

  function moveCurrentGuideSelection(delta: number) {
    const count =
      guideRoute.screen === 'article'
        ? (guideArticle?.examples.length ?? 0)
        : guideListEntries.length;
    setCurrentGuideSelectionIndex(moveGuideIndex(currentGuideSelectionIndex, delta, count));
  }

  function openSelectedGuideEntry() {
    if (selectedGuideListEntry) {
      openGuideRoute(selectedGuideListEntry.route);
    }
  }

  function goBackInGuide() {
    const parentRoute = getGuideParentRoute(guideRoute);
    if (parentRoute) {
      openGuideRoute(parentRoute);
    } else {
      openLauncher();
    }
  }

  function exitGuide() {
    setMode(previousNonGuideMode);
  }

  function applyCalculateSeed(
    screen: CalculateScreen,
    seed: GuideExample['launch']['calculateSeed'],
  ) {
    if (!seed || screen === 'standard' || screen === 'calculusHome') {
      return;
    }

    if (screen === 'derivative') {
      setDerivativeWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'derivativePoint') {
      setDerivativePointWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        point: seed.point ?? currentState.point,
      }));
      return;
    }

    if (screen === 'integral') {
      setIntegralWorkbench((currentState) => ({
        ...currentState,
        kind: seed.kind ?? currentState.kind,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'limit') {
      setLimitWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        target: seed.target ?? currentState.target,
        direction: seed.direction ?? currentState.direction,
        targetKind: seed.targetKind ?? currentState.targetKind,
      }));
    }
  }

  function applyAdvancedCalcSeed(
    screen: AdvancedCalcScreen,
    seed: GuideExample['launch']['advancedCalcSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'indefiniteIntegral') {
      setAdvancedIndefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'definiteIntegral') {
      setAdvancedDefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'improperIntegral') {
      setAdvancedImproperIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lowerKind: seed.lowerKind ?? currentState.lowerKind,
        lower: seed.lower ?? currentState.lower,
        upperKind: seed.upperKind ?? currentState.upperKind,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'finiteLimit') {
      setAdvancedFiniteLimit((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        target: seed.target ?? currentState.target,
        direction: seed.direction ?? currentState.direction,
      }));
      return;
    }

    if (screen === 'infiniteLimit') {
      setAdvancedInfiniteLimit((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        targetKind: seed.targetKind ?? currentState.targetKind,
      }));
      return;
    }

    if (screen === 'maclaurin') {
      setMaclaurinState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        order: seed.order ?? currentState.order,
      }));
      return;
    }

    if (screen === 'taylor') {
      setTaylorState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        center: seed.center ?? currentState.center,
        order: seed.order ?? currentState.order,
      }));
      return;
    }

    if (screen === 'partialDerivative') {
      setPartialDerivativeState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        variable: seed.variable ?? currentState.variable,
      }));
      return;
    }

    if (screen === 'odeFirstOrder') {
      setFirstOrderOdeState((currentState) => ({
        ...currentState,
        lhsLatex: seed.lhsLatex ?? currentState.lhsLatex,
        rhsLatex: seed.rhsLatex ?? currentState.rhsLatex,
        classification: seed.classification ?? currentState.classification,
      }));
      return;
    }

    if (screen === 'odeSecondOrder') {
      setSecondOrderOdeState((currentState) => ({
        ...currentState,
        a2: seed.a2 ?? currentState.a2,
        a1: seed.a1 ?? currentState.a1,
        a0: seed.a0 ?? currentState.a0,
        forcingLatex: seed.forcingLatex ?? currentState.forcingLatex,
      }));
      return;
    }

    if (screen === 'odeNumericIvp') {
      setNumericIvpState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        x0: seed.x0 ?? currentState.x0,
        y0: seed.y0 ?? currentState.y0,
        xEnd: seed.xEnd ?? currentState.xEnd,
        step: seed.step ?? currentState.step,
        method: seed.method ?? currentState.method,
      }));
    }
  }

  function applyTrigSeed(
    screen: TrigScreen,
    seed: GuideExample['launch']['trigSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'functions') {
      const nextState = {
        ...trigFunctionState,
        expressionLatex: seed.expressionLatex ?? trigFunctionState.expressionLatex,
      };
      setTrigFunctionState(nextState);
      setTrigDraftState(trigDraftStateForScreen(screen, nextState.expressionLatex, 'guided'));
      return;
    }

    if (screen === 'identitySimplify' || screen === 'identityConvert') {
      const nextState = {
        ...trigIdentityState,
        expressionLatex: seed.expressionLatex ?? trigIdentityState.expressionLatex,
        targetForm: seed.targetForm ?? trigIdentityState.targetForm,
      };
      setTrigIdentityState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          screen === 'identityConvert'
            ? buildTrigStructuredDraft(screen, {
                ...trigStateSnapshot,
                trigIdentity: nextState,
              })
            : nextState.expressionLatex,
          'guided',
        ),
      );
      return;
    }

    if (screen === 'equationSolve') {
      const nextState = {
        ...trigEquationState,
        equationLatex: seed.equationLatex ?? trigEquationState.equationLatex,
        angleUnit: seed.angleUnit ?? trigEquationState.angleUnit,
      };
      setTrigEquationState(nextState);
      setTrigDraftState(trigDraftStateForScreen(screen, nextState.equationLatex, 'guided'));
      return;
    }

    if (screen === 'rightTriangle') {
      const nextState = {
        ...rightTriangleState,
        knownSideA: seed.knownSideA ?? rightTriangleState.knownSideA,
        knownSideB: seed.knownSideB ?? rightTriangleState.knownSideB,
        knownSideC: seed.knownSideC ?? rightTriangleState.knownSideC,
        knownAngleA: seed.knownAngleA ?? rightTriangleState.knownAngleA,
        knownAngleB: seed.knownAngleB ?? rightTriangleState.knownAngleB,
      };
      setRightTriangleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            rightTriangle: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'sineRule') {
      const nextState = {
        ...sineRuleState,
        sideA: seed.sideA ?? sineRuleState.sideA,
        sideB: seed.sideB ?? sineRuleState.sideB,
        sideC: seed.sideC ?? sineRuleState.sideC,
        angleA: seed.angleA ?? sineRuleState.angleA,
        angleB: seed.angleB ?? sineRuleState.angleB,
        angleC: seed.angleC ?? sineRuleState.angleC,
      };
      setSineRuleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            sineRule: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cosineRule') {
      const nextState = {
        ...cosineRuleState,
        sideA: seed.sideA ?? cosineRuleState.sideA,
        sideB: seed.sideB ?? cosineRuleState.sideB,
        sideC: seed.sideC ?? cosineRuleState.sideC,
        angleA: seed.angleA ?? cosineRuleState.angleA,
        angleB: seed.angleB ?? cosineRuleState.angleB,
        angleC: seed.angleC ?? cosineRuleState.angleC,
      };
      setCosineRuleState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            cosineRule: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'angleConvert') {
      const nextState = {
        ...angleConvertState,
        value: seed.value ?? angleConvertState.value,
        from: seed.from ?? angleConvertState.from,
        to: seed.to ?? angleConvertState.to,
      };
      setAngleConvertState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            angleConvert: nextState,
          }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'specialAngles' && seed.expressionLatex) {
      setSpecialAnglesExpression(seed.expressionLatex);
      setTrigDraftState(trigDraftStateForScreen(screen, seed.expressionLatex, 'guided'));
    }
  }

  function applyGeometrySeed(
    screen: GeometryScreen,
    seed: GuideExample['launch']['geometrySeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'triangleArea') {
      const nextState = {
        ...triangleAreaState,
        base: seed.base ?? triangleAreaState.base,
        height: seed.height ?? triangleAreaState.height,
      };
      setTriangleAreaState((currentState) => ({
        ...currentState,
        base: seed.base ?? currentState.base,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleArea: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'triangleHeron') {
      const nextState = {
        ...triangleHeronState,
        a: seed.a ?? triangleHeronState.a,
        b: seed.b ?? triangleHeronState.b,
        c: seed.c ?? triangleHeronState.c,
      };
      setTriangleHeronState((currentState) => ({
        ...currentState,
        a: seed.a ?? currentState.a,
        b: seed.b ?? currentState.b,
        c: seed.c ?? currentState.c,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleHeron: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'rectangle') {
      const nextState = {
        ...rectangleState,
        width: seed.width ?? rectangleState.width,
        height: seed.height ?? rectangleState.height,
      };
      setRectangleState((currentState) => ({
        ...currentState,
        width: seed.width ?? currentState.width,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, rectangle: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'square') {
      const nextState = {
        ...squareState,
        side: seed.side ?? squareState.side,
      };
      setSquareState((currentState) => ({
        ...currentState,
        side: seed.side ?? currentState.side,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, square: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'circle') {
      const nextState = {
        ...circleState,
        radius: seed.radius ?? circleState.radius,
      };
      setCircleState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, circle: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'arcSector') {
      const nextState = {
        ...arcSectorState,
        radius: seed.radius ?? arcSectorState.radius,
        angle: seed.angle ?? arcSectorState.angle,
        angleUnit: seed.angleUnit ?? arcSectorState.angleUnit,
      };
      setArcSectorState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        angle: seed.angle ?? currentState.angle,
        angleUnit: seed.angleUnit ?? currentState.angleUnit,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, arcSector: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cube') {
      const nextState = {
        ...cubeState,
        side: seed.side ?? cubeState.side,
      };
      setCubeState((currentState) => ({
        ...currentState,
        side: seed.side ?? currentState.side,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cube: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cuboid') {
      const nextState = {
        ...cuboidState,
        length: seed.length ?? cuboidState.length,
        width: seed.width ?? cuboidState.width,
        height: seed.height ?? cuboidState.height,
      };
      setCuboidState((currentState) => ({
        ...currentState,
        length: seed.length ?? currentState.length,
        width: seed.width ?? currentState.width,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cuboid: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cylinder') {
      const nextState = {
        ...cylinderState,
        radius: seed.radius ?? cylinderState.radius,
        height: seed.height ?? cylinderState.height,
      };
      setCylinderState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        height: seed.height ?? currentState.height,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cylinder: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'cone') {
      const nextState = {
        ...coneState,
        radius: seed.radius ?? coneState.radius,
        height: seed.height ?? coneState.height,
        slantHeight: seed.slantHeight ?? coneState.slantHeight,
      };
      setConeState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
        height: seed.height ?? currentState.height,
        slantHeight: seed.slantHeight ?? currentState.slantHeight,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cone: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'sphere') {
      const nextState = {
        ...sphereState,
        radius: seed.radius ?? sphereState.radius,
      };
      setSphereState((currentState) => ({
        ...currentState,
        radius: seed.radius ?? currentState.radius,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, sphere: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'distance') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? distanceState.p1.x,
          y: seed.p1?.y ?? distanceState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? distanceState.p2.x,
          y: seed.p2?.y ?? distanceState.p2.y,
        },
      };
      setDistanceState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, distance: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'midpoint') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? midpointState.p1.x,
          y: seed.p1?.y ?? midpointState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? midpointState.p2.x,
          y: seed.p2?.y ?? midpointState.p2.y,
        },
      };
      setMidpointState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, midpoint: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'slope') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? slopeState.p1.x,
          y: seed.p1?.y ?? slopeState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? slopeState.p2.x,
          y: seed.p2?.y ?? slopeState.p2.y,
        },
      };
      setSlopeState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, slope: nextState }),
          'guided',
        ),
      );
      return;
    }

    if (screen === 'lineEquation') {
      const nextState = {
        p1: {
          x: seed.p1?.x ?? lineEquationState.p1.x,
          y: seed.p1?.y ?? lineEquationState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? lineEquationState.p2.x,
          y: seed.p2?.y ?? lineEquationState.p2.y,
        },
        form: seed.form ?? lineEquationState.form,
      };
      setLineEquationState((currentState) => ({
        p1: {
          x: seed.p1?.x ?? currentState.p1.x,
          y: seed.p1?.y ?? currentState.p1.y,
        },
        p2: {
          x: seed.p2?.x ?? currentState.p2.x,
          y: seed.p2?.y ?? currentState.p2.y,
        },
        form: seed.form ?? currentState.form,
      }));
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryInputLatex(screen, { ...geometryStateSnapshot, lineEquation: nextState }),
          'guided',
        ),
      );
    }
  }

  function launchGuideExample(example: GuideExample | undefined) {
    if (!example) {
      return;
    }

    closeLauncher();
    closeHistoryPanel();

    if (example.launch.kind === 'open-tool') {
      if (example.launch.targetMode === 'calculate') {
        const screen = example.launch.calculateScreen ?? 'standard';
        openCalculateScreen(screen);
        applyCalculateSeed(screen, example.launch.calculateSeed);
      }
      if (example.launch.targetMode === 'advancedCalculus') {
        const screen = example.launch.advancedCalcScreen ?? 'home';
        openAdvancedCalcScreen(screen);
        applyAdvancedCalcSeed(screen, example.launch.advancedCalcSeed);
      }
      if (example.launch.targetMode === 'equation') {
        setEquationScreen(example.launch.equationScreen ?? 'home');
      }
      if (example.launch.targetMode === 'trigonometry') {
        const screen = example.launch.trigScreen ?? 'home';
        openTrigScreen(screen);
        applyTrigSeed(screen, example.launch.trigSeed);
      }
      if (example.launch.targetMode === 'statistics') {
        const screen = example.launch.statisticsScreen ?? 'home';
        openStatisticsScreen(screen);
      }
      if (example.launch.targetMode === 'geometry') {
        const screen = example.launch.geometryScreen ?? 'home';
        openGeometryScreen(screen);
        applyGeometrySeed(screen, example.launch.geometrySeed);
      }
      setDisplayOutcome(null);
      setMode(example.launch.targetMode);
      setClipboardNotice(example.launch.label ?? 'Opened in tool');
      return;
    }

    const latex = example.launch.latex.trim();
    if (!latex) {
      return;
    }

    if (example.launch.targetMode === 'calculate') {
      setCalculateLatex(latex);
      const screen = example.launch.calculateScreen ?? 'standard';
      openCalculateScreen(screen);
      applyCalculateSeed(screen, example.launch.calculateSeed);
      setDisplayOutcome(null);
      setMode('calculate');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'equation') {
      setEquationLatex(latex);
      setEquationScreen(example.launch.equationScreen ?? 'symbolic');
      setDisplayOutcome(null);
      setMode('equation');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'advancedCalculus') {
      const screen = example.launch.advancedCalcScreen ?? 'home';
      openAdvancedCalcScreen(screen);
      applyAdvancedCalcSeed(screen, example.launch.advancedCalcSeed);
      setDisplayOutcome(null);
      setMode('advancedCalculus');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    if (example.launch.targetMode === 'trigonometry') {
      const screen = example.launch.trigScreen ?? 'functions';
      openTrigScreen(screen);
      applyTrigSeed(screen, example.launch.trigSeed);
      if (screen === 'functions') {
        setTrigFunctionState((currentState) => ({
          ...currentState,
          expressionLatex: latex,
        }));
      } else if (screen === 'equationSolve') {
        setTrigEquationState((currentState) => ({
          ...currentState,
          equationLatex: latex,
        }));
      } else if (screen === 'specialAngles') {
        setSpecialAnglesExpression(latex);
      } else if (screen === 'identitySimplify' || screen === 'identityConvert') {
        setTrigIdentityState((currentState) => ({
          ...currentState,
          expressionLatex: latex,
        }));
      }
      setDisplayOutcome(null);
      setMode('trigonometry');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

      if (example.launch.targetMode === 'statistics') {
        const screen = example.launch.statisticsScreen ?? 'home';
        openStatisticsScreen(screen);
        if (latex) {
          setStatisticsDraftState({
            rawLatex: latex,
            style: statisticsDraftStyle(latex),
            source: 'manual',
            executable: !isStatisticsMenuScreen(screen),
          });
        }
        setDisplayOutcome(null);
        setMode('statistics');
        setClipboardNotice(example.launch.label ?? 'Example loaded');
        return;
      }

    if (example.launch.targetMode === 'geometry') {
      const screen = example.launch.geometryScreen ?? 'home';
      openGeometryScreen(screen);
      applyGeometrySeed(screen, example.launch.geometrySeed);
      if (latex) {
        setGeometryDraftState({
          rawLatex: latex,
          style: geometryDraftStyle(latex),
          source: 'manual',
          executable: isGeometryCoreEditableScreen(screen),
        });
      }
      setDisplayOutcome(null);
      setMode('geometry');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

    setTablePrimaryLatex(latex);
    setDisplayOutcome(null);
    setMode('table');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
  }

  function setGuideQuery(query: string) {
    if (guideRoute.screen === 'search') {
      setGuideRoute({ screen: 'search', query });
      return;
    }

    if (guideRoute.screen === 'symbolLookup') {
      setGuideRoute({ screen: 'symbolLookup', query });
    }
  }

  function openGuideArticle(articleId: string) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'article', articleId });
    setMode('guide');
  }

  function openGuideHome() {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'home' });
    setMode('guide');
  }

  function openGuideMode(modeId: Exclude<ModeId, 'guide'>) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'modeGuide', modeId });
    setMode('guide');
  }

  function openAdvancedGuideForScreen(screen: AdvancedCalcScreen = advancedCalcScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'advancedCalculus' });
      setMode('guide');
      return;
    }

    if (screen === 'integralsHome' || screen === 'indefiniteIntegral' || screen === 'definiteIntegral' || screen === 'improperIntegral') {
      openGuideArticle('advanced-integrals');
      return;
    }

    if (screen === 'limitsHome' || screen === 'finiteLimit' || screen === 'infiniteLimit') {
      openGuideArticle('advanced-limits');
      return;
    }

    if (screen === 'seriesHome' || screen === 'maclaurin' || screen === 'taylor') {
      openGuideArticle('advanced-series');
      return;
    }

    if (screen === 'partialsHome' || screen === 'partialDerivative') {
      openGuideArticle('advanced-partials');
      return;
    }

    openGuideArticle('advanced-odes');
  }

  function openTrigGuideForScreen(screen: TrigScreen = trigScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'trigonometry' });
      setMode('guide');
      return;
    }

    if (screen === 'functions') {
      openGuideArticle('trig-functions');
      return;
    }

    if (screen === 'identitiesHome' || screen === 'identitySimplify' || screen === 'identityConvert') {
      openGuideArticle('trig-identities');
      return;
    }

    if (screen === 'equationsHome' || screen === 'equationSolve') {
      openGuideArticle('trig-equations');
      return;
    }

    if (screen === 'trianglesHome' || screen === 'rightTriangle' || screen === 'sineRule' || screen === 'cosineRule') {
      openGuideArticle('trig-triangles');
      return;
    }

    openGuideArticle('trig-special-angles');
  }

  function openGeometryGuideForScreen(screen: GeometryScreen = geometryScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'domain', domainId: 'geometry' });
      setMode('guide');
      return;
    }

    if (screen === 'shapes2dHome' || screen === 'square' || screen === 'rectangle') {
      openGuideArticle('geometry-shapes-2d');
      return;
    }

    if (screen === 'shapes3dHome' || screen === 'cube' || screen === 'cuboid' || screen === 'cylinder' || screen === 'cone' || screen === 'sphere') {
      openGuideArticle('geometry-solids-3d');
      return;
    }

    if (screen === 'triangleHome' || screen === 'triangleArea' || screen === 'triangleHeron') {
      openGuideArticle('geometry-triangles');
      return;
    }

    if (screen === 'circleHome' || screen === 'circle' || screen === 'arcSector') {
      openGuideArticle('geometry-circles');
      return;
    }

    openGuideArticle('geometry-coordinate');
  }

  function openStatisticsGuideForScreen(screen: StatisticsScreen = statisticsScreen) {
    if (screen === 'home') {
      openGuideRoute({ screen: 'modeGuide', modeId: 'statistics' });
      setMode('guide');
      return;
    }

    if (screen === 'dataEntry' || screen === 'descriptive' || screen === 'frequency') {
      openGuideArticle('statistics-descriptive');
      return;
    }

    if (screen === 'probabilityHome' || screen === 'binomial' || screen === 'normal' || screen === 'poisson') {
      openGuideArticle('statistics-probability');
      return;
    }

    if (screen === 'inferenceHome' || screen === 'meanInference') {
      openGuideArticle('statistics-inference');
      return;
    }

    openGuideArticle('statistics-regression');
  }

  function openCalculateScreen(screen: CalculateScreen) {
    setCalculateScreen(screen);
    setDisplayOutcome(null);
  }

  function openAdvancedCalcScreen(screen: AdvancedCalcScreen) {
    setAdvancedCalcScreen(screen);
    setDisplayOutcome(null);
  }

  function openTrigScreen(screen: TrigScreen) {
    setTrigScreen(screen);
    if (!isTrigMenuScreen(screen)) {
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigDraftForScreen(screen),
          trigDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function trigDraftStateForScreen(
    _screen: TrigScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      trigDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function buildTrigDraftForScreen(screen: TrigScreen) {
    if (screen === 'functions') {
      return trigFunctionState.expressionLatex;
    }

    if (screen === 'identitySimplify' || screen === 'identityConvert') {
      return trigIdentityState.expressionLatex;
    }

    if (screen === 'equationSolve') {
      return trigEquationState.equationLatex;
    }

    if (screen === 'specialAngles') {
      return specialAnglesExpression;
    }

    return buildTrigStructuredDraft(screen, trigStateSnapshot);
  }

  function updateTrigDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setTrigDraftState({
      rawLatex,
      style: trigDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadTrigDraft(rawLatex: string, source: CoreDraftState['source'] = 'guided', executable = true) {
    updateTrigDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        trigDraftFieldRef.current?.focus?.();
        activeFieldRef.current = trigDraftFieldRef.current;
      }, 0);
    }
  }

  function trigDraftSourceForScreen(screen: TrigScreen): CoreDraftState['source'] {
    return isTrigMenuScreen(screen) ? 'manual' : 'guided';
  }

  function isTrigDraftFocused(target?: EventTarget | null) {
    if (!trigEditorIsEditable || !trigDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === trigDraftFieldRef.current;
    }

    return activeFieldRef.current === trigDraftFieldRef.current;
  }

  function geometryDraftStateForScreen(
    _screen: GeometryScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      geometryDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function defaultGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, {
      triangleArea: DEFAULT_TRIANGLE_AREA_STATE,
      triangleHeron: DEFAULT_TRIANGLE_HERON_STATE,
      rectangle: DEFAULT_RECTANGLE_STATE,
      square: DEFAULT_SQUARE_STATE,
      circle: DEFAULT_CIRCLE_STATE,
      arcSector: DEFAULT_ARC_SECTOR_STATE,
      cube: DEFAULT_CUBE_STATE,
      cuboid: DEFAULT_CUBOID_STATE,
      cylinder: DEFAULT_CYLINDER_STATE,
      cone: DEFAULT_CONE_STATE,
      sphere: DEFAULT_SPHERE_STATE,
      distance: DEFAULT_DISTANCE_STATE,
      midpoint: DEFAULT_MIDPOINT_STATE,
      slope: DEFAULT_SLOPE_STATE,
      lineEquation: DEFAULT_LINE_EQUATION_STATE,
    });
  }

  function buildGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, geometryStateSnapshot);
  }

  function updateGeometryDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setGeometryDraftState({
      rawLatex,
      style: geometryDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadGeometryDraft(rawLatex: string, source: CoreDraftState['source'] = 'guided', executable = true) {
    updateGeometryDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        geometryDraftFieldRef.current?.focus?.();
        activeFieldRef.current = geometryDraftFieldRef.current;
      }, 0);
    }
  }

  function geometryDraftSourceForScreen(screen: GeometryScreen): CoreDraftState['source'] {
    return isGeometryMenuScreen(screen) ? 'manual' : 'guided';
  }

  function geometrySolveMissingTemplates(screen: GeometryScreen) {
    switch (screen) {
      case 'square':
        return [
          { label: 's from area', latex: 'square(side=?, area=25)' },
          { label: 's from perimeter', latex: 'square(side=?, perimeter=20)' },
        ];
      case 'rectangle':
        return [
          { label: 'w from area', latex: 'rectangle(width=?, height=5, area=40)' },
          { label: 'h from diagonal', latex: 'rectangle(width=6, height=?, diagonal=10)' },
        ];
      case 'circle':
        return [
          { label: 'r from circumference', latex: 'circle(radius=?, circumference=10*pi)' },
          { label: 'r from area', latex: 'circle(radius=?, area=49*pi)' },
        ];
      case 'triangleArea':
        return [
          { label: 'base from area', latex: 'triangleArea(base=?, height=6, area=30)' },
          { label: 'height from area', latex: 'triangleArea(base=10, height=?, area=30)' },
        ];
      case 'cube':
        return [
          { label: 'side from volume', latex: 'cube(side=?, volume=64)' },
          { label: 'side from SA', latex: 'cube(side=?, surfaceArea=54)' },
        ];
      case 'sphere':
        return [
          { label: 'r from SA', latex: 'sphere(radius=?, surfaceArea=36*pi)' },
          { label: 'r from volume', latex: 'sphere(radius=?, volume=36*pi)' },
        ];
      case 'cylinder':
        return [
          { label: 'r from volume', latex: 'cylinder(radius=?, height=8, volume=72*pi)' },
          { label: 'h from volume', latex: 'cylinder(radius=3, height=?, volume=72*pi)' },
        ];
      case 'cone':
        return [
          { label: 'r from volume', latex: 'cone(radius=?, height=4, volume=12*pi)' },
          { label: 'h from slant', latex: 'cone(radius=3, height=?, slantHeight=5)' },
          { label: 'l from r,h', latex: 'cone(radius=3, height=4, slantHeight=?)' },
        ];
      case 'cuboid':
        return [
          { label: 'l from volume', latex: 'cuboid(length=?, width=3, height=4, volume=144)' },
          { label: 'h from diagonal', latex: 'cuboid(length=3, width=4, height=?, diagonal=13)' },
        ];
      case 'arcSector':
        return [
          { label: 'r from arc', latex: 'arcSector(radius=?, angle=60, unit=deg, arc=2*pi)' },
          { label: 'angle from sector', latex: 'arcSector(radius=6, angle=?, unit=deg, sector=6*pi)' },
        ];
      case 'triangleHeron':
        return [
          { label: 'a from area', latex: 'triangleHeron(a=?, b=13, c=14, area=84)' },
        ];
      case 'distance':
        return [
          { label: 'solve point', latex: 'distance(p1=(0,0), p2=(3,?), distance=5)' },
        ];
      case 'midpoint':
        return [
          { label: 'solve point', latex: 'midpoint(p1=(1,2), p2=(?,8), mid=(3,5))' },
        ];
      case 'slope':
        return [
          { label: 'solve point', latex: 'slope(p1=(1,2), p2=(?,8), slope=2)' },
        ];
      case 'lineEquation':
        return [
          { label: 'point from slope', latex: 'lineEquation(p1=(0,0), p2=(?,8), slope=2)' },
          { label: 'point from distance', latex: 'lineEquation(p1=(0,0), p2=(3,?), distance=5)' },
          { label: 'point from midpoint', latex: 'lineEquation(p1=(1,2), p2=(?,8), mid=(3,5))' },
        ];
      default:
        return [];
    }
  }

  function loadGeometrySolveMissingTemplate(rawLatex: string) {
    loadGeometryDraft(rawLatex, 'guided', true);
    setClipboardNotice('Geometry solve-missing template loaded');
  }

  function isGeometryDraftFocused(target?: EventTarget | null) {
    if (!geometryEditorIsEditable || !geometryDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === geometryDraftFieldRef.current;
    }

    return activeFieldRef.current === geometryDraftFieldRef.current;
  }

  function openGeometryScreen(screen: GeometryScreen) {
    setGeometryScreen(screen);
    if (!isGeometryMenuScreen(screen)) {
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryDraftForScreen(screen),
          geometryDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function statisticsDraftStateForScreen(
    _screen: StatisticsScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      statisticsDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function statisticsWorkingSourceForScreen(screen: StatisticsScreen): StatisticsWorkingSource {
    if (screen === 'home' || screen === 'probabilityHome' || screen === 'inferenceHome') {
      return statisticsWorkingSource;
    }

    if (screen === 'dataEntry') {
      return 'dataset';
    }

    if (screen === 'descriptive' || screen === 'frequency' || screen === 'meanInference') {
      return statisticsWorkingSource;
    }

    return 'dataset';
  }

  function defaultStatisticsLeafForMenu(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (screen === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    const homeTarget = getStatisticsMenuEntryAtIndex(
      'home',
      statisticsMenuSelection.home,
    )?.target ?? 'dataEntry';

    if (homeTarget === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (homeTarget === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    return homeTarget;
  }

  function statisticsLeafScreenForContext(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'home' || screen === 'probabilityHome') {
      return defaultStatisticsLeafForMenu(screen);
    }

    return screen;
  }

  function buildStatisticsDraftForScreen(
    screen: StatisticsScreen,
    workingSource = statisticsWorkingSourceForScreen(screen),
  ) {
    if (isStatisticsMenuScreen(screen)) {
      return '';
    }

    return buildStatisticsInputLatex(screen, statisticsStateSnapshot, workingSource);
  }

  function updateStatisticsDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setStatisticsDraftState({
      rawLatex,
      style: statisticsDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadStatisticsDraft(
    rawLatex: string,
    source: CoreDraftState['source'] = 'guided',
    focusEditor = true,
  ) {
    updateStatisticsDraft(rawLatex, source, true);
    if (focusEditor) {
      setTimeout(() => {
        focusStatisticsEditor();
      }, 0);
    }
  }

  function isStatisticsDraftFocused(target?: EventTarget | null) {
    if (!statisticsEditorIsEditable || !statisticsDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === statisticsDraftFieldRef.current;
    }

    return activeFieldRef.current === statisticsDraftFieldRef.current;
  }

  function openStatisticsScreen(screen: StatisticsScreen) {
    setStatisticsScreen(screen);
    const nextWorkingSource = statisticsWorkingSourceForScreen(screen);
    setStatisticsWorkingSource(nextWorkingSource);
    if (!isStatisticsMenuScreen(screen)) {
      setStatisticsDraftState(
        statisticsDraftStateForScreen(
          screen,
          buildStatisticsDraftForScreen(screen, nextWorkingSource)
            || defaultStatisticsDraftForScreen(screen, nextWorkingSource),
          'guided',
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function setCurrentAdvancedCalcMenuIndex(
    screen: 'home' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome',
    index: number,
  ) {
    setAdvancedCalcMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentAdvancedCalcMenuSelection(delta: number) {
    if (!isAdvancedCalcMenuOpen) {
      return;
    }

    setCurrentAdvancedCalcMenuIndex(
      advancedCalcScreen,
      moveAdvancedCalcMenuIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex, delta),
    );
  }

  function setCurrentTrigMenuIndex(
    screen: 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
    index: number,
  ) {
    setTrigMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentTrigMenuSelection(delta: number) {
    if (!isTrigMenuOpen) {
      return;
    }

    setCurrentTrigMenuIndex(
      trigScreen as 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
      moveTrigMenuIndex(trigScreen, currentTrigMenuIndex, delta),
    );
  }

  function defaultTrigLeafForMenu(screen: TrigScreen): TrigScreen {
    if (screen === 'identitiesHome') {
      return 'identitySimplify';
    }
    if (screen === 'equationsHome') {
      return 'equationSolve';
    }
    if (screen === 'trianglesHome') {
      return 'rightTriangle';
    }
    return 'functions';
  }

  function trigLeafScreenForContext(screen: TrigScreen): TrigScreen {
    if (!isTrigMenuScreen(screen)) {
      return screen;
    }

    if (screen === 'home') {
      const target = getTrigMenuEntryAtIndex('home', trigMenuSelection.home)?.target ?? 'functions';
      if (target === 'identitiesHome') {
        return getTrigMenuEntryAtIndex('identitiesHome', trigMenuSelection.identitiesHome)?.target ?? 'identitySimplify';
      }
      if (target === 'equationsHome') {
        return 'equationSolve';
      }
      if (target === 'trianglesHome') {
        return getTrigMenuEntryAtIndex('trianglesHome', trigMenuSelection.trianglesHome)?.target ?? 'rightTriangle';
      }
      return target;
    }

    return getTrigMenuEntryAtIndex(
      screen,
      trigMenuSelection[screen as keyof typeof trigMenuSelection],
    )?.target ?? defaultTrigLeafForMenu(screen);
  }

  function setCurrentGeometryMenuIndex(
    screen: 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome',
    index: number,
  ) {
    setGeometryMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentGeometryMenuSelection(delta: number) {
    if (!isGeometryMenuOpen) {
      return;
    }

    setCurrentGeometryMenuIndex(
      geometryScreen as 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome',
      moveGeometryMenuIndex(geometryScreen, currentGeometryMenuIndex, delta),
    );
  }

  function setCurrentStatisticsMenuIndex(
    screen: 'home' | 'probabilityHome' | 'inferenceHome',
    index: number,
  ) {
    setStatisticsMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentStatisticsMenuSelection(delta: number) {
    if (!isStatisticsMenuOpen) {
      return;
    }

    setCurrentStatisticsMenuIndex(
      statisticsScreen as 'home' | 'probabilityHome' | 'inferenceHome',
      moveStatisticsMenuIndex(statisticsScreen, currentStatisticsMenuIndex, delta),
    );
  }

  function openSelectedTrigMenuEntry() {
    if (!selectedTrigMenuEntry) {
      return;
    }

    openTrigScreen(selectedTrigMenuEntry.target);
  }

  function goBackInTrigonometry() {
    const parentScreen = getTrigParentScreen(trigScreen);
    if (parentScreen) {
      openTrigScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedGeometryMenuEntry() {
    if (!selectedGeometryMenuEntry) {
      return;
    }

    openGeometryScreen(selectedGeometryMenuEntry.target);
  }

  function goBackInGeometry() {
    const parentScreen = getGeometryParentScreen(geometryScreen);
    if (parentScreen) {
      openGeometryScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedStatisticsMenuEntry() {
    if (!selectedStatisticsMenuEntry) {
      return;
    }

    openStatisticsScreen(selectedStatisticsMenuEntry.target);
  }

  function goBackInStatistics() {
    const parentScreen = getStatisticsParentScreen(statisticsScreen);
    if (parentScreen) {
      openStatisticsScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openSelectedAdvancedCalcMenuEntry() {
    if (!selectedAdvancedCalcMenuEntry) {
      return;
    }

    openAdvancedCalcScreen(selectedAdvancedCalcMenuEntry.target);
  }

  function goBackInAdvancedCalc() {
    const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
    if (parentScreen) {
      openAdvancedCalcScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function moveCurrentCalculateMenuSelection(delta: number) {
    setCalculateMenuSelection((currentSelection) =>
      moveCalculateMenuIndex(currentSelection, delta),
    );
  }

  function openSelectedCalculateMenuEntry() {
    if (!selectedCalculateMenuEntry) {
      return;
    }

    openCalculateScreen(selectedCalculateMenuEntry.target);
  }

  function setCurrentEquationMenuIndex(screen: 'home' | 'polynomialMenu' | 'simultaneousMenu', index: number) {
    setEquationMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentEquationMenuSelection(delta: number) {
    if (!currentEquationMenuScreen) {
      return;
    }

    setCurrentEquationMenuIndex(
      currentEquationMenuScreen,
      moveEquationMenuIndex(
        currentEquationMenuIndex,
        delta,
        equationMenuEntries.length,
      ),
    );
  }

  function openSelectedEquationMenuEntry() {
    if (!selectedEquationMenuEntry) {
      return;
    }

    openEquationScreen(selectedEquationMenuEntry.target);
  }

  function goBackInEquation() {
    const parentScreen = getEquationParentScreen(equationScreen);
    if (parentScreen) {
      openEquationScreen(parentScreen);
    }
  }

  function switchToEquationWithLatex(latex: string, options?: { openNumericSolve?: boolean }) {
    setEquationScreen('symbolic');
    setEquationLatex(latex);
    setEquationNumericSolvePanel((currentPanel) => ({
      ...currentPanel,
      enabled: options?.openNumericSolve ?? false,
    }));
    setDisplayOutcome(null);
    setMode('equation');
  }

  function activeExpressionLatex() {
    if (isLauncherOpen || isEquationMenuOpen || isTrigMenuOpen || isStatisticsMenuOpen) {
      return '';
    }

    if (currentMode === 'calculate') {
      return calculateScreen === 'standard'
        ? calculateLatex
        : calculateWorkbenchExpression.latex;
    }

    if (currentMode === 'equation') {
      return equationInputLatex;
    }

    if (currentMode === 'advancedCalculus') {
      return isAdvancedCalcMenuOpen ? '' : advancedCalcWorkbenchExpression;
    }

    if (currentMode === 'trigonometry') {
      return trigDraftLatex;
    }

    if (currentMode === 'statistics') {
      return statisticsDraftLatex;
    }

    if (currentMode === 'geometry') {
      return geometryDraftLatex;
    }

    if (currentMode === 'table') {
      return tablePrimaryLatex;
    }

    return '';
  }

  function activeResultEditorLatex() {
    if (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') {
      return displayOutcome.exactLatex ?? '';
    }

    return '';
  }

  function activeResultCopyText() {
    if (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') {
      const visibleLines: string[] = [];

      if (settings.outputStyle !== 'decimal' && displayOutcome.exactLatex) {
        visibleLines.push(
          latexToVisibleText(
            displayOutcome.exactLatex,
            settings.mathNotationDisplay,
            symbolicDisplayPrefs,
          ),
        );
      }

      if (settings.outputStyle !== 'exact' && displayOutcome.approxText) {
        visibleLines.push(
          formatMathTextForDisplay(displayOutcome.approxText, settings.mathNotationDisplay),
        );
      }

      return visibleLines.join('\n').trim();
    }

    return '';
  }

  function fallbackCopyText(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  async function copyText(text: string, successNotice: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to copy');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
      } else {
        fallbackCopyText(trimmed);
      }
      setClipboardNotice(successNotice);
    } catch {
      setClipboardNotice('Clipboard blocked');
    }
  }

  function sendLatexToCalculate(latex: string) {
    const trimmed = latex.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to load');
      return;
    }

    closeLauncher();

    setCalculateLatex(trimmed);
    openCalculateScreen('standard');
    setDisplayOutcome(null);
    setMode('calculate');
    setClipboardNotice('Loaded into Calculate');
  }

  function sendLatexToEquation(latex: string, options?: { openNumericSolve?: boolean }) {
    const trimmed = latex.trim();
    if (!trimmed) {
      setClipboardNotice('Nothing to load');
      return;
    }

    closeLauncher();
    switchToEquationWithLatex(trimmed, options);
    setClipboardNotice('Loaded into Equation');
  }

  function loadLatexIntoEditor(latex: string) {
    if (currentMode === 'equation') {
      sendLatexToEquation(latex);
      return;
    }

    sendLatexToCalculate(latex);
  }

  function editActiveExpression() {
    if (currentMode === 'trigonometry') {
      focusTrigEditor();
      setClipboardNotice('Trigonometry editor focused');
      return;
    }

    if (currentMode === 'statistics') {
      focusStatisticsEditor();
      setClipboardNotice('Statistics editor focused');
      return;
    }

    if (currentMode === 'geometry') {
      focusGeometryEditor();
      setClipboardNotice('Geometry editor focused');
      return;
    }

    loadLatexIntoEditor(activeExpressionLatex());
  }

  function triggerDisplayOutcomeAction(action: DisplayOutcomeAction) {
    if (action.kind === 'send') {
      if (action.target === 'equation') {
        sendLatexToEquation(action.latex, {
          openNumericSolve: currentMode === 'trigonometry',
        });
      } else {
        sendLatexToCalculate(action.latex);
      }
      return;
    }

    if (action.mode === 'geometry') {
      loadGeometryDraft(action.latex, 'guided', true);
      setMode('geometry');
      return;
    }

    if (action.mode === 'statistics') {
      const parsed = parseStatisticsDraft(action.latex);
      openStatisticsScreen(parsed.ok ? statisticsRequestToScreen(parsed.request) : 'dataEntry');
      loadStatisticsDraft(action.latex, 'guided', true);
      setMode('statistics');
      return;
    }

    loadTrigDraft(action.latex, 'guided', true);
    setMode('trigonometry');
  }

  async function pasteIntoEditor() {
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice('Paste unavailable');
        return;
      }

      const text = await navigator.clipboard.readText();
      if (
        !isLauncherOpen &&
        (currentMode === 'calculate' ||
          currentMode === 'advancedCalculus' ||
          currentMode === 'trigonometry' ||
          (currentMode === 'geometry' && geometryEditorIsEditable) ||
          currentMode === 'statistics' ||
          (currentMode === 'equation' && equationScreen === 'symbolic')) &&
        activeFieldRef.current
      ) {
        activeFieldRef.current.focus?.();
        activeFieldRef.current.insert(text);
        setClipboardNotice('Pasted into editor');
        return;
      }

      if (currentMode === 'geometry' && geometryEditorIsEditable) {
        focusGeometryEditor();
        geometryDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Geometry editor');
        return;
      }

      if (currentMode === 'statistics' && statisticsEditorIsEditable) {
        focusStatisticsEditor();
        statisticsDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Statistics editor');
        return;
      }

      if (currentMode === 'trigonometry' && trigEditorIsEditable) {
        focusTrigEditor();
        trigDraftFieldRef.current?.insert(text);
        setClipboardNotice('Pasted into Trigonometry editor');
        return;
      }

      loadLatexIntoEditor(text);
    } catch {
      setClipboardNotice('Clipboard blocked');
    }
  }

  function setPolynomialCoefficient(
    view: PolynomialEquationView,
    index: number,
    value: number,
  ) {
    const nextValue = Number.isFinite(value) ? value : 0;
    const setter =
      view === 'quadratic'
        ? setQuadraticCoefficients
        : view === 'cubic'
          ? setCubicCoefficients
          : setQuarticCoefficients;

    setter((currentCoefficients) =>
      currentCoefficients.map((coefficient, coefficientIndex) =>
        coefficientIndex === index ? nextValue : coefficient,
      ),
    );
  }

  function currentCalculateHistoryContext() {
    if (calculateScreen === 'derivative') {
      return {
        calculateScreen,
        calculateSeed: { ...derivativeWorkbench },
      };
    }

    if (calculateScreen === 'derivativePoint') {
      return {
        calculateScreen,
        calculateSeed: { ...derivativePointWorkbench },
      };
    }

    if (calculateScreen === 'integral') {
      return {
        calculateScreen,
        calculateSeed: { ...integralWorkbench },
      };
    }

    if (calculateScreen === 'limit') {
      return {
        calculateScreen,
        calculateSeed: { ...limitWorkbench },
      };
    }

    return {};
  }

  function currentAdvancedCalcHistoryContext() {
    if (advancedCalcScreen === 'indefiniteIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedIndefiniteIntegral },
      };
    }

    if (advancedCalcScreen === 'definiteIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedDefiniteIntegral },
      };
    }

    if (advancedCalcScreen === 'improperIntegral') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedImproperIntegral },
      };
    }

    if (advancedCalcScreen === 'finiteLimit') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedFiniteLimit },
      };
    }

    if (advancedCalcScreen === 'infiniteLimit') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...advancedInfiniteLimit },
      };
    }

    if (advancedCalcScreen === 'maclaurin') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...maclaurinState },
      };
    }

    if (advancedCalcScreen === 'taylor') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...taylorState },
      };
    }

    if (advancedCalcScreen === 'partialDerivative') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...partialDerivativeState },
      };
    }

    if (advancedCalcScreen === 'odeFirstOrder') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...firstOrderOdeState },
      };
    }

    if (advancedCalcScreen === 'odeSecondOrder') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...secondOrderOdeState },
      };
    }

    if (advancedCalcScreen === 'odeNumericIvp') {
      return {
        advancedCalcScreen,
        advancedCalcSeed: { ...numericIvpState },
      };
    }

    return {};
  }

  function commitOutcome(
    outcome: DisplayOutcome,
    inputLatex: string,
    mode: ModeId,
    context: Partial<Pick<
      HistoryEntry,
      | 'calculateScreen'
      | 'calculateSeed'
      | 'advancedCalcScreen'
      | 'advancedCalcSeed'
      | 'geometryScreen'
      | 'trigScreen'
      | 'statisticsScreen'
      | 'numericInterval'
    >> = {},
  ) {
    if (
      outcome.kind === 'prompt' &&
      outcome.targetMode === 'equation' &&
      settings.autoSwitchToEquation
    ) {
      switchToEquationWithLatex(outcome.carryLatex);
      return;
    }

    setDisplayOutcome(outcome);

    if (outcome.kind !== 'success' || (!outcome.exactLatex && !outcome.approxText)) {
      return;
    }

    if (outcome.exactLatex) {
      setAnsLatex(outcome.exactLatex);
    }
    if (!settings.historyEnabled) {
      return;
    }

    const entry: HistoryEntry = {
      id: createId(),
      mode,
      inputLatex,
      resolvedInputLatex: outcome.resolvedInputLatex,
      resultLatex: outcome.exactLatex,
      approxText: outcome.approxText,
      ...(mode === 'calculate'
        ? { ...currentCalculateHistoryContext(), ...context }
        : {}),
      ...(mode === 'advancedCalculus'
        ? { ...currentAdvancedCalcHistoryContext(), ...context }
        : {}),
      ...(mode === 'geometry'
        ? { geometryScreen: context.geometryScreen ?? geometryScreen }
        : {}),
      ...(mode === 'trigonometry'
        ? { trigScreen: context.trigScreen ?? trigScreen }
        : {}),
      ...(mode === 'statistics'
        ? { statisticsScreen: context.statisticsScreen ?? statisticsScreen }
        : {}),
      ...(context.numericInterval
        ? { numericInterval: context.numericInterval }
        : {}),
      timestamp: new Date().toISOString(),
    };

    setHistory((currentHistory) => [...currentHistory.slice(-79), entry]);
    void appendHistoryEntry(entry);
  }

  function setMode(mode: ModeId) {
    if (mode !== 'guide') {
      setPreviousNonGuideMode(mode);
    } else {
      closeHistoryPanel();
    }
    setCurrentMode(mode);
    setDisplayOutcome((currentOutcome) => (currentOutcome?.kind === 'prompt' ? null : currentOutcome));
    void persistMode(mode);
  }

  function openLauncher() {
    closeHistoryPanel();
    setLauncherState(
      createLauncherStateForMode(
        currentMode,
        previousNonGuideMode,
        launcherCategories,
        activeLauncherLeafId,
      ),
    );
  }

  function closeLauncher() {
    setLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      surface: 'app',
    }));
  }

  function openLauncherCategoryById(categoryId: LauncherCategory['id'], preferredLeafId?: LauncherLeafId) {
    setLauncherState(openLauncherCategory(categoryId, launcherCategories, preferredLeafId));
  }

  function launchLauncherApp(entry: LauncherAppEntry) {
    closeLauncher();
    if (entry.launch.mode === 'calculate') {
      openCalculateScreen(entry.launch.calculateScreen ?? 'standard');
      setMode('calculate');
      return;
    }

    if (entry.launch.mode === 'equation') {
      setEquationScreen(entry.launch.equationScreen ?? 'home');
      setDisplayOutcome(null);
      setMode('equation');
      return;
    }

    if (entry.launch.mode === 'matrix' || entry.launch.mode === 'vector' || entry.launch.mode === 'table') {
      setDisplayOutcome(null);
      setMode(entry.launch.mode);
      return;
    }

    if (entry.launch.mode === 'advancedCalculus') {
      openAdvancedCalcScreen(entry.launch.advancedCalcScreen ?? 'home');
      setMode('advancedCalculus');
      return;
    }

    if (entry.launch.mode === 'trigonometry') {
      openTrigScreen(entry.launch.trigScreen ?? 'home');
      setMode('trigonometry');
      return;
    }

    if (entry.launch.mode === 'statistics') {
      openStatisticsScreen(entry.launch.statisticsScreen ?? 'home');
      setMode('statistics');
      return;
    }

    openGeometryScreen(entry.launch.geometryScreen ?? 'home');
    setMode('geometry');
  }

  function openSelectedLauncherEntry() {
    if (launcherState.level === 'root') {
      if (!selectedLauncherCategory) {
        return;
      }

      openLauncherCategoryById(selectedLauncherCategory.id, activeLauncherLeafId);
      return;
    }

    if (!selectedLauncherApp) {
      return;
    }

    launchLauncherApp(selectedLauncherApp);
  }

  function goBackInLauncher() {
    if (launcherState.level === 'category') {
      setLauncherState((currentLauncherState) => ({
        ...currentLauncherState,
        level: 'root',
        categoryId: null,
        categorySelectedIndex: 0,
      }));
      return;
    }

    closeLauncher();
  }

  function moveCurrentLauncherSelection(delta: number) {
    setLauncherState((currentLauncherState) => currentLauncherState.level === 'root'
      ? {
        ...currentLauncherState,
        rootSelectedIndex: moveLauncherRootIndex(
          currentLauncherState.rootSelectedIndex,
          delta,
          launcherCategories,
        ),
      }
      : {
        ...currentLauncherState,
        categorySelectedIndex: moveLauncherCategoryIndex(
          currentLauncherState.categorySelectedIndex,
          delta,
          activeLauncherCategory,
        ),
      });
  }

  function insertLatex(latex: string) {
    const field = activeFieldRef.current ?? mainFieldRef.current;
    if (!field) {
      return;
    }

    field.focus?.();
    field.insert(latex);
  }

  function retitleOutcome(outcome: DisplayOutcome, title: string): DisplayOutcome {
    if (outcome.kind === 'prompt') {
      return { ...outcome, title };
    }

    if (outcome.kind === 'error') {
      return { ...outcome, title };
    }

    return { ...outcome, title };
  }

  const calculateRuntimeController = createCalculateRuntimeController({
    calculateLatex,
    calculateScreen,
    calculateRouteMeta,
    calculateWorkbenchExpression,
    integralWorkbench,
    limitWorkbench,
    isCalculateToolOpen,
    settings,
    ansLatex,
    startTransition,
    setDisplayOutcome,
    commitOutcome,
    retitleOutcome,
  });

  const {
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
  } = calculateRuntimeController;

  function runTrigAction() {
    const screenHint = trigLeafScreenForContext(trigScreen);
    const editorFocused = isTrigDraftFocused();

    if (isTrigMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const inputLatex =
        !isTrigMenuOpen && trigRouteMeta?.focusTarget === 'guidedForm' && !editorFocused
          ? buildTrigDraftForScreen(trigScreen).trim()
          : trigDraftState.rawLatex.trim();

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: trigRouteMeta?.label ?? 'Trigonometry',
          error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!editorFocused || trigDraftState.rawLatex.trim() !== inputLatex) {
        setTrigDraftState(trigDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      const executionLatex =
        screenHint === 'identityConvert' && trigDraftStyle(inputLatex) !== 'structured'
          ? serializeTrigRequest({
              kind: 'identityConvert',
              expressionLatex: inputLatex,
              targetForm: trigIdentityState.targetForm,
            })
          : inputLatex;

      const { outcome, parsed } = runTrigonometryCoreDraft(executionLatex, {
        screenHint,
        angleUnit: settings.angleUnit,
        identityTargetForm: trigIdentityState.targetForm,
      });

      const replayScreen = parsed.ok
        ? trigRequestToScreen(parsed.request, screenHint)
        : screenHint;

      commitOutcome(outcome, executionLatex, 'trigonometry', { trigScreen: replayScreen });
    });
  }

  function runStatisticsAction() {
    const editorFocused = isStatisticsDraftFocused();
    if (isStatisticsMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const screenHint = statisticsLeafScreenForContext(statisticsScreen);
      const inputLatex =
        !editorFocused && statisticsRouteMeta?.focusTarget === 'guidedForm'
          ? buildStatisticsDraftForScreen(screenHint)
          : statisticsDraftState.rawLatex.trim();

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: statisticsRouteMeta?.label ?? 'Statistics',
          error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!editorFocused || statisticsDraftState.rawLatex.trim() !== inputLatex) {
        setStatisticsDraftState(statisticsDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      const { outcome, parsed } = runStatisticsCoreDraft(inputLatex, {
        screenHint,
        workingSourceHint: statisticsWorkingSource,
      });
      if (parsed.ok) {
        const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
        if (nextSource) {
          setStatisticsWorkingSource(nextSource);
        }
      }
      const replayScreen = parsed.ok
        ? statisticsRequestToScreen(parsed.request, screenHint)
        : screenHint;

      commitOutcome(outcome, inputLatex, 'statistics', { statisticsScreen: replayScreen });
    });
  }

  function runGeometryAction() {
    if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
      return;
    }

    startTransition(() => {
      const inputLatex = isGeometryDraftFocused()
        ? geometryDraftState.rawLatex.trim()
        : buildGeometryDraftForScreen(geometryScreen);

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: geometryRouteMeta?.label ?? 'Geometry',
          error: 'Enter a Geometry request or use a guided tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!isGeometryDraftFocused()) {
        setGeometryDraftState(
          geometryDraftStateForScreen(geometryScreen, inputLatex, 'guided'),
        );
      }

      const { outcome } = runGeometryCoreDraft(inputLatex, geometryScreen);
      commitOutcome(outcome, inputLatex, 'geometry');
    });
  }

  const equationRuntimeController = createEquationRuntimeController({
    equationScreen,
    equationLatex,
    equationInputLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    system2,
    system3,
    equationNumericSolvePanel,
    currentMode,
    displayOutcome,
    ansLatex,
    settings,
    startTransition,
    commitOutcome,
    switchToEquationWithLatex,
    isSimultaneousEquationScreen,
  });

  const {
    openPromptTarget,
    runEquationAction,
    runEquationAlgebraTransformAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  } = equationRuntimeController;

  function runAdvancedCalcAction() {
    const generated = advancedCalcWorkbenchExpression.trim();
    if (!generated || !advancedCalcRouteMeta || isAdvancedCalcMenuOpen) {
      setDisplayOutcome({
        kind: 'error',
        title: advancedCalcRouteMeta?.label ?? 'Advanced Calc',
        error: advancedCalcRouteMeta
          ? `Fill the ${advancedCalcRouteMeta.label.toLowerCase()} inputs before evaluating.`
          : 'Choose an Advanced Calc tool before evaluating.',
        warnings: [],
      });
      return;
    }

    startTransition(() => {
      void runAdvancedCalcMode({
        screen: advancedCalcScreen,
        indefiniteIntegral: advancedIndefiniteIntegral,
        definiteIntegral: advancedDefiniteIntegral,
        improperIntegral: advancedImproperIntegral,
        finiteLimit: advancedFiniteLimit,
        infiniteLimit: advancedInfiniteLimit,
        maclaurin: maclaurinState,
        taylor: taylorState,
        partialDerivative: partialDerivativeState,
        firstOrderOde: firstOrderOdeState,
        secondOrderOde: secondOrderOdeState,
        numericIvp: numericIvpState,
      }).then((outcome) => {
        commitOutcome(outcome, generated, 'advancedCalculus');
      });
    });
  }

  function runMatrixAction(operation: MatrixOperation) {
    const outcome = runMatrixMode({ operation, matrixA, matrixB });
    commitOutcome(outcome, operation, 'matrix');
  }

  function runVectorAction(operation: VectorOperation) {
    const outcome = runVectorMode({
      operation,
      vectorA,
      vectorB,
      angleUnit: settings.angleUnit,
    });
    commitOutcome(outcome, operation, 'vector');
  }

  function runTableAction() {
    const result = runTableMode({
      primaryLatex: tablePrimaryLatex,
      secondaryLatex: tableSecondaryLatex,
      secondaryEnabled: tableSecondaryEnabled,
      start: tableStart,
      end: tableEnd,
      step: tableStep,
    });

    setTableResponse(result.response);
    commitOutcome(result.outcome, tablePrimaryLatex, 'table');
  }

  function clearCurrentMode() {
    if (isLauncherOpen) {
      closeLauncher();
      return;
    }

    if (currentMode === 'guide') {
      goBackInGuide();
    } else if (currentMode === 'statistics') {
      if (isStatisticsMenuOpen) {
        goBackInStatistics();
      } else if (statisticsScreen === 'dataEntry') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'dataEntry',
            defaultStatisticsDraftForScreen('dataEntry', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'descriptive') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'descriptive',
            defaultStatisticsDraftForScreen('descriptive', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'frequency') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setStatisticsWorkingSource('frequencyTable');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'frequency',
            defaultStatisticsDraftForScreen('frequency', 'frequencyTable'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'binomial') {
        setBinomialState(DEFAULT_BINOMIAL_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'binomial',
            defaultStatisticsDraftForScreen('binomial'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'normal') {
        setNormalState(DEFAULT_NORMAL_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'normal',
            defaultStatisticsDraftForScreen('normal'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'poisson') {
        setPoissonState(DEFAULT_POISSON_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'poisson',
            defaultStatisticsDraftForScreen('poisson'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'meanInference') {
        setStatsDataset(DEFAULT_STATS_DATASET);
        setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
        setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
        setStatisticsWorkingSource('dataset');
        setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'meanInference',
            defaultStatisticsDraftForScreen('meanInference', 'dataset'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'regression') {
        setRegressionState(DEFAULT_REGRESSION_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'regression',
            defaultStatisticsDraftForScreen('regression'),
            'guided',
          ),
        );
      } else if (statisticsScreen === 'correlation') {
        setCorrelationState(DEFAULT_CORRELATION_STATE);
        setStatisticsDraftState(
          statisticsDraftStateForScreen(
            'correlation',
            defaultStatisticsDraftForScreen('correlation'),
            'guided',
          ),
        );
      }
    } else if (currentMode === 'geometry') {
      if (isGeometryMenuOpen) {
        goBackInGeometry();
      } else if (geometryScreen === 'square') {
        setSquareState(DEFAULT_SQUARE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('square', defaultGeometryDraftForScreen('square'), 'guided'));
      } else if (geometryScreen === 'rectangle') {
        setRectangleState(DEFAULT_RECTANGLE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('rectangle', defaultGeometryDraftForScreen('rectangle'), 'guided'));
      } else if (geometryScreen === 'triangleArea') {
        setTriangleAreaState(DEFAULT_TRIANGLE_AREA_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('triangleArea', defaultGeometryDraftForScreen('triangleArea'), 'guided'));
      } else if (geometryScreen === 'triangleHeron') {
        setTriangleHeronState(DEFAULT_TRIANGLE_HERON_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('triangleHeron', defaultGeometryDraftForScreen('triangleHeron'), 'guided'));
      } else if (geometryScreen === 'circle') {
        setCircleState(DEFAULT_CIRCLE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('circle', defaultGeometryDraftForScreen('circle'), 'guided'));
      } else if (geometryScreen === 'arcSector') {
        setArcSectorState(DEFAULT_ARC_SECTOR_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('arcSector', defaultGeometryDraftForScreen('arcSector'), 'guided'));
      } else if (geometryScreen === 'cube') {
        setCubeState(DEFAULT_CUBE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cube', defaultGeometryDraftForScreen('cube'), 'guided'));
      } else if (geometryScreen === 'cuboid') {
        setCuboidState(DEFAULT_CUBOID_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cuboid', defaultGeometryDraftForScreen('cuboid'), 'guided'));
      } else if (geometryScreen === 'cylinder') {
        setCylinderState(DEFAULT_CYLINDER_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cylinder', defaultGeometryDraftForScreen('cylinder'), 'guided'));
      } else if (geometryScreen === 'cone') {
        setConeState(DEFAULT_CONE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('cone', defaultGeometryDraftForScreen('cone'), 'guided'));
      } else if (geometryScreen === 'sphere') {
        setSphereState(DEFAULT_SPHERE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('sphere', defaultGeometryDraftForScreen('sphere'), 'guided'));
      } else if (geometryScreen === 'distance') {
        setDistanceState(DEFAULT_DISTANCE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('distance', defaultGeometryDraftForScreen('distance'), 'guided'));
      } else if (geometryScreen === 'midpoint') {
        setMidpointState(DEFAULT_MIDPOINT_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('midpoint', defaultGeometryDraftForScreen('midpoint'), 'guided'));
      } else if (geometryScreen === 'slope') {
        setSlopeState(DEFAULT_SLOPE_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('slope', defaultGeometryDraftForScreen('slope'), 'guided'));
      } else if (geometryScreen === 'lineEquation') {
        setLineEquationState(DEFAULT_LINE_EQUATION_STATE);
        setGeometryDraftState(geometryDraftStateForScreen('lineEquation', defaultGeometryDraftForScreen('lineEquation'), 'guided'));
      }
    } else if (currentMode === 'trigonometry') {
      if (isTrigMenuOpen) {
        goBackInTrigonometry();
      } else if (trigScreen === 'functions') {
        setTrigFunctionState(DEFAULT_TRIG_FUNCTION_STATE);
        setTrigDraftState(trigDraftStateForScreen('functions', defaultTrigDraftForScreen('functions'), 'guided'));
      } else if (trigScreen === 'identitySimplify' || trigScreen === 'identityConvert') {
        setTrigIdentityState(DEFAULT_TRIG_IDENTITY_STATE);
        setTrigDraftState(trigDraftStateForScreen(trigScreen, defaultTrigDraftForScreen(trigScreen), 'guided'));
      } else if (trigScreen === 'equationSolve') {
        setTrigEquationState((currentState) => ({
          ...DEFAULT_TRIG_EQUATION_STATE,
          angleUnit: currentState.angleUnit,
        }));
        setTrigDraftState(trigDraftStateForScreen('equationSolve', defaultTrigDraftForScreen('equationSolve'), 'guided'));
      } else if (trigScreen === 'rightTriangle') {
        setRightTriangleState(DEFAULT_RIGHT_TRIANGLE_STATE);
        setTrigDraftState(trigDraftStateForScreen('rightTriangle', defaultTrigDraftForScreen('rightTriangle'), 'guided'));
      } else if (trigScreen === 'sineRule') {
        setSineRuleState(DEFAULT_SINE_RULE_STATE);
        setTrigDraftState(trigDraftStateForScreen('sineRule', defaultTrigDraftForScreen('sineRule'), 'guided'));
      } else if (trigScreen === 'cosineRule') {
        setCosineRuleState(DEFAULT_COSINE_RULE_STATE);
        setTrigDraftState(trigDraftStateForScreen('cosineRule', defaultTrigDraftForScreen('cosineRule'), 'guided'));
      } else if (trigScreen === 'angleConvert') {
        setAngleConvertState(DEFAULT_ANGLE_CONVERT_STATE);
        setTrigDraftState(trigDraftStateForScreen('angleConvert', defaultTrigDraftForScreen('angleConvert'), 'guided'));
      } else if (trigScreen === 'specialAngles') {
        setSpecialAnglesExpression('\\cos\\left(\\frac{\\pi}{3}\\right)');
        setTrigDraftState(trigDraftStateForScreen('specialAngles', defaultTrigDraftForScreen('specialAngles'), 'guided'));
      }
    } else if (currentMode === 'advancedCalculus') {
      if (isAdvancedCalcMenuOpen) {
        goBackInAdvancedCalc();
      } else if (advancedCalcScreen === 'indefiniteIntegral') {
        setAdvancedIndefiniteIntegral(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'definiteIntegral') {
        setAdvancedDefiniteIntegral(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'improperIntegral') {
        setAdvancedImproperIntegral(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
      } else if (advancedCalcScreen === 'finiteLimit') {
        setAdvancedFiniteLimit(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
      } else if (advancedCalcScreen === 'infiniteLimit') {
        setAdvancedInfiniteLimit(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
      } else if (advancedCalcScreen === 'maclaurin') {
        setMaclaurinState(DEFAULT_MACLAURIN_STATE);
      } else if (advancedCalcScreen === 'taylor') {
        setTaylorState(DEFAULT_TAYLOR_STATE);
      } else if (advancedCalcScreen === 'partialDerivative') {
        setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
      } else if (advancedCalcScreen === 'odeFirstOrder') {
        setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
      } else if (advancedCalcScreen === 'odeSecondOrder') {
        setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
      } else if (advancedCalcScreen === 'odeNumericIvp') {
        setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
      }
    } else if (currentMode === 'calculate') {
      if (calculateScreen === 'standard') {
        setCalculateLatex('');
      } else if (calculateScreen === 'calculusHome') {
        openCalculateScreen('standard');
      } else if (calculateScreen === 'derivative') {
        setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
      } else if (calculateScreen === 'derivativePoint') {
        setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
      } else if (calculateScreen === 'integral') {
        setIntegralWorkbench((currentState) => ({
          ...DEFAULT_INTEGRAL_WORKBENCH,
          kind: currentState.kind,
        }));
      } else if (calculateScreen === 'limit') {
        setLimitWorkbench((currentState) => ({
          ...DEFAULT_LIMIT_WORKBENCH,
          direction: currentState.direction,
          targetKind: currentState.targetKind,
        }));
      }
    } else if (currentMode === 'equation') {
      if (isEquationMenuScreen(equationScreen)) {
        goBackInEquation();
      } else if (equationScreen === 'symbolic') {
        setEquationLatex('');
      } else if (equationScreen === 'quadratic') {
        setQuadraticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
      } else if (equationScreen === 'cubic') {
        setCubicCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
      } else if (equationScreen === 'quartic') {
        setQuarticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
      } else if (equationScreen === 'linear2') {
        setSystem2(emptySystem(2));
      } else {
        setSystem3(emptySystem(3));
      }
    } else if (currentMode === 'table') {
      setTablePrimaryLatex('');
      setTableSecondaryLatex('');
      setTableResponse(null);
    }

    setDisplayOutcome(null);
  }

  function executePrimaryAction() {
    executePrimaryActionWithDeps({
      isLauncherOpen,
      currentMode,
      guideRouteScreen: guideRoute.screen,
      isAdvancedCalcMenuOpen,
      isGeometryMenuOpen,
      isStatisticsMenuOpen,
      isTrigMenuOpen,
      isCalculateMenuOpen,
      isCalculateToolOpen,
      equationScreen,
      isGeometryDraftFocused,
      isStatisticsDraftFocused,
      isTrigDraftFocused,
      openSelectedLauncherEntry,
      launchGuideExample: () => launchGuideExample(selectedGuideExample),
      openSelectedGuideEntry,
      openSelectedAdvancedCalcMenuEntry,
      runAdvancedCalcAction,
      openSelectedGeometryMenuEntry,
      runGeometryAction,
      openSelectedStatisticsMenuEntry,
      runStatisticsAction,
      openSelectedTrigMenuEntry,
      runTrigAction,
      openSelectedCalculateMenuEntry,
      runCalculateWorkbenchAction,
      runCalculateActionEvaluate: () => runCalculateAction('evaluate'),
      openSelectedEquationMenuEntry,
      runEquationAction,
      runTableAction,
    });
  }

  function handleSoftAction(actionId: string) {
    if (isLauncherOpen) {
      if (actionId === 'open') {
        openSelectedLauncherEntry();
      } else if (actionId === 'cancel') {
        closeLauncher();
      }
      return;
    }

    if (actionId === 'history') {
      toggleHistoryPanel();
      return;
    }

    if (actionId === 'clear') {
      clearCurrentMode();
      return;
    }

    if (currentMode === 'guide') {
      if (actionId === 'open') {
        openSelectedGuideEntry();
        return;
      }

      if (actionId === 'search') {
        openGuideRoute({ screen: 'search', query: guideRoute.screen === 'search' ? guideRoute.query : '' });
        return;
      }

      if (actionId === 'symbols') {
        openGuideRoute({ screen: 'symbolLookup', query: '' });
        return;
      }

      if (actionId === 'modes') {
        openGuideRoute({ screen: 'modeGuide' });
        return;
      }

      if (actionId === 'copy') {
        void copyText(copyableGuideExampleLatex(selectedGuideExample), 'Example copied');
        return;
      }

      if (actionId === 'load') {
        launchGuideExample(selectedGuideExample);
        return;
      }

      if (actionId === 'back') {
        goBackInGuide();
        return;
      }

      if (actionId === 'exit') {
        exitGuide();
      }
      return;
    }

    if (currentMode === 'advancedCalculus') {
      if (actionId === 'open') {
        openSelectedAdvancedCalcMenuEntry();
        return;
      }

      if (actionId === 'guide') {
        openAdvancedGuideForScreen();
        return;
      }

      if (actionId === 'back' || actionId === 'exit') {
        goBackInAdvancedCalc();
        return;
      }

      if (actionId === 'evaluate') {
        runAdvancedCalcAction();
        return;
      }

      if (actionId === 'toEditor') {
        loadLatexIntoEditor(advancedCalcWorkbenchExpression);
        return;
      }

      if (actionId === 'menu') {
        const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
        if (parentScreen) {
          openAdvancedCalcScreen(parentScreen);
        } else {
          openAdvancedCalcScreen('home');
        }
        return;
      }

      return;
    }

    if (currentMode === 'geometry') {
      if (actionId === 'open') {
        if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
          openSelectedGeometryMenuEntry();
        } else {
          runGeometryAction();
        }
        return;
      }

      if (actionId === 'guide') {
        openGeometryGuideForScreen();
        return;
      }

      if (actionId === 'back' || actionId === 'exit') {
        goBackInGeometry();
        return;
      }

      if (actionId === 'evaluate') {
        runGeometryAction();
        return;
      }

      if (actionId === 'menu') {
        const parentScreen = getGeometryParentScreen(geometryScreen);
        if (parentScreen) {
          openGeometryScreen(parentScreen);
        } else {
          openGeometryScreen('home');
        }
        return;
      }

      return;
    }

    if (currentMode === 'statistics') {
      if (actionId === 'open') {
        if (isStatisticsMenuOpen && !isStatisticsDraftFocused()) {
          openSelectedStatisticsMenuEntry();
        } else {
          runStatisticsAction();
        }
        return;
      }

      if (actionId === 'guide') {
        openStatisticsGuideForScreen();
        return;
      }

      if (actionId === 'back' || actionId === 'exit') {
        goBackInStatistics();
        return;
      }

      if (actionId === 'evaluate') {
        runStatisticsAction();
        return;
      }

      if (actionId === 'menu') {
        const parentScreen = getStatisticsParentScreen(statisticsScreen);
        if (parentScreen) {
          openStatisticsScreen(parentScreen);
        } else {
          openStatisticsScreen('home');
        }
        return;
      }

      return;
    }

    if (currentMode === 'trigonometry') {
      if (actionId === 'open') {
        if (isTrigMenuOpen && !isTrigDraftFocused()) {
          openSelectedTrigMenuEntry();
        } else {
          runTrigAction();
        }
        return;
      }

      if (actionId === 'guide') {
        openTrigGuideForScreen();
        return;
      }

      if (actionId === 'back' || actionId === 'exit') {
        goBackInTrigonometry();
        return;
      }

      if (actionId === 'evaluate') {
        runTrigAction();
        return;
      }

      if (actionId === 'sendToCalc') {
        sendLatexToCalculate(trigDraftLatex);
        return;
      }

      if (actionId === 'sendToEquation') {
        sendLatexToEquation(trigDraftLatex);
        return;
      }

      if (actionId === 'useInTrig') {
        loadTrigDraft(buildTrigDraftForScreen(trigScreen), 'guided', true);
        setClipboardNotice('Trigonometry request loaded');
        return;
      }

      if (actionId === 'menu') {
        const parentScreen = getTrigParentScreen(trigScreen);
        if (parentScreen) {
          openTrigScreen(parentScreen);
        } else {
          openTrigScreen('home');
        }
        return;
      }

      return;
    }

    if (currentMode === 'calculate') {
      if (calculateScreen === 'standard') {
        if (actionId === 'algebra') {
          setCalculateAlgebraTrayOpen((open) => !open);
          return;
        }

        runCalculateAction(actionId as CalculateAction);
        return;
      }

      if (calculateScreen === 'calculusHome') {
        if (actionId === 'open') {
          openSelectedCalculateMenuEntry();
          return;
        }

        if (actionId === 'standard' || actionId === 'back') {
          openCalculateScreen('standard');
          return;
        }

        return;
      }

      if (actionId === 'evaluate') {
        runCalculateWorkbenchAction();
        return;
      }

      if (actionId === 'toEditor') {
        loadLatexIntoEditor(calculateWorkbenchExpression.latex);
        return;
      }

      if (actionId === 'calculusMenu') {
        openCalculateScreen('calculusHome');
        return;
      }

      if (actionId === 'toggleIntegralKind') {
        setIntegralWorkbench((currentState) => ({
          ...currentState,
          kind: cycleIntegralKind(currentState.kind),
        }));
        setDisplayOutcome(null);
        return;
      }

      if (actionId === 'cycleLimitDirection') {
        setLimitWorkbench((currentState) => ({
          ...currentState,
          direction: cycleLimitDirection(currentState.direction),
        }));
        setDisplayOutcome(null);
        return;
      }

      return;
    }

    if (currentMode === 'equation') {
      if (actionId === 'open') {
        openSelectedEquationMenuEntry();
        return;
      }

      if (actionId === 'back') {
        goBackInEquation();
        return;
      }

      if (actionId === 'menu') {
        openEquationScreen('home');
        return;
      }

      if (actionId === 'algebra' && equationScreen === 'symbolic') {
        setEquationAlgebraTrayOpen((open) => !open);
        return;
      }

      if (actionId === 'polynomialMenu') {
        openEquationScreen('polynomialMenu');
        return;
      }

      if (actionId === 'simultaneousMenu') {
        openEquationScreen('simultaneousMenu');
        return;
      }

      runEquationAction();
      return;
    }

    if (currentMode === 'matrix') {
      runMatrixAction(actionId as MatrixOperation);
      return;
    }

    if (currentMode === 'vector') {
      runVectorAction(actionId as VectorOperation);
      return;
    }

    if (actionId === 'toggleSecondary') {
      setTableSecondaryEnabled((enabled) => !enabled);
      return;
    }

    runTableAction();
  }

  function handleKeypad(button: KeypadButton) {
    if (isLauncherOpen) {
      if (/^\d$/.test(button.id)) {
        if (launcherState.level === 'root') {
          const category = getLauncherCategoryByHotkey(launcherCategories, button.id);
          if (category) {
            openLauncherCategoryById(category.id, activeLauncherLeafId);
          }
        } else if (activeLauncherCategory) {
          const entry = getLauncherAppByHotkey(activeLauncherCategory, button.id);
          if (entry) {
            launchLauncherApp(entry);
          }
        }
        return;
      }

      if (button.command === 'clear') {
        goBackInLauncher();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentLauncherSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentLauncherSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedLauncherEntry();
        return;
      }

      if (button.command === 'open-menu') {
        return;
      }

      return;
    }

    if (currentMode === 'guide') {
      if (
        (guideRoute.screen === 'home' || guideRoute.screen === 'domain' || guideRoute.screen === 'modeGuide')
        && /^\d$/.test(button.id)
      ) {
        const matchedEntry = guideListEntries.find((entry) => entry.hotkey === button.id);
        if (matchedEntry) {
          openGuideRoute(matchedEntry.route);
          return;
        }
      }

      if (button.command === 'history') {
        openGuideRoute({ screen: 'search', query: guideRoute.screen === 'search' ? guideRoute.query : '' });
        return;
      }

      if (button.command === 'clear') {
        goBackInGuide();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentGuideSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentGuideSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        executePrimaryAction();
        return;
      }
    }

    if (currentMode === 'calculate' && isCalculateMenuOpen) {
      if (/^[1-4]$/.test(button.id)) {
        const entry = getCalculateMenuEntryByHotkey(button.id);
        if (entry) {
          openCalculateScreen(entry.target);
        }
        return;
      }

      if (button.command === 'history') {
        toggleHistoryPanel();
        return;
      }

      if (button.command === 'clear') {
        openCalculateScreen('standard');
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentCalculateMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentCalculateMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedCalculateMenuEntry();
        return;
      }
    }

    if (currentMode === 'advancedCalculus' && isAdvancedCalcMenuOpen) {
      if (/^\d$/.test(button.id)) {
        const entry = getAdvancedCalcMenuEntryByHotkey(advancedCalcScreen, button.id);
        if (entry) {
          openAdvancedCalcScreen(entry.target);
        }
        return;
      }

      if (button.command === 'history') {
        toggleHistoryPanel();
        return;
      }

      if (button.command === 'clear') {
        goBackInAdvancedCalc();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentAdvancedCalcMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentAdvancedCalcMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedAdvancedCalcMenuEntry();
        return;
      }
    }

    if (currentMode === 'geometry' && isGeometryMenuOpen && !isGeometryDraftFocused()) {
      if (/^\d$/.test(button.id)) {
        const entry = getGeometryMenuEntryByHotkey(geometryScreen, button.id);
        if (entry) {
          openGeometryScreen(entry.target);
        }
        return;
      }

      if (button.command === 'history') {
        toggleHistoryPanel();
        return;
      }

      if (button.command === 'clear') {
        goBackInGeometry();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentGeometryMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentGeometryMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedGeometryMenuEntry();
        return;
      }
    }

    if (currentMode === 'statistics' && isStatisticsMenuOpen && !isStatisticsDraftFocused()) {
      if (/^\d$/.test(button.id)) {
        const entry = getStatisticsMenuEntryByHotkey(statisticsScreen, button.id);
        if (entry) {
          openStatisticsScreen(entry.target);
        }
        return;
      }

      if (button.command === 'clear') {
        goBackInStatistics();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentStatisticsMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentStatisticsMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedStatisticsMenuEntry();
        return;
      }
    }

    if (currentMode === 'trigonometry' && isTrigMenuOpen) {
      if (/^\d$/.test(button.id)) {
        const entry = getTrigMenuEntryByHotkey(trigScreen, button.id);
        if (entry) {
          openTrigScreen(entry.target);
        }
        return;
      }

      if (button.command === 'history') {
        toggleHistoryPanel();
        return;
      }

      if (button.command === 'clear') {
        goBackInTrigonometry();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentTrigMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentTrigMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedTrigMenuEntry();
        return;
      }
    }

    if (currentMode === 'equation' && isEquationMenuScreen(equationScreen)) {
      if (/^[1-3]$/.test(button.id)) {
        const entry = getEquationMenuEntryByHotkey(equationMenuEntries, button.id);
        if (entry) {
          openEquationScreen(entry.target);
        }
        return;
      }

      if (button.command === 'history') {
        toggleHistoryPanel();
        return;
      }

      if (button.command === 'clear') {
        clearCurrentMode();
        return;
      }

      if (button.command === 'cursor-left') {
        moveCurrentEquationMenuSelection(-1);
        return;
      }

      if (button.command === 'cursor-right') {
        moveCurrentEquationMenuSelection(1);
        return;
      }

      if (button.command === 'evaluate') {
        openSelectedEquationMenuEntry();
        return;
      }
    }

    if (button.latex) {
      insertLatex(button.latex);
      return;
    }

    if (button.command === 'history') toggleHistoryPanel();
    if (button.command === 'clear') clearCurrentMode();
    if (button.command === 'delete') activeFieldRef.current?.executeCommand('deleteBackward');
    if (button.command === 'cursor-left') activeFieldRef.current?.executeCommand('moveToPreviousChar');
    if (button.command === 'cursor-right') activeFieldRef.current?.executeCommand('moveToNextChar');
    if (button.command === 'cycle-angle') {
      patchSettings({
        angleUnit: cycleAngleUnit(settings.angleUnit),
      });
    }
    if (button.command === 'open-menu') openLauncher();
    if (button.command === 'evaluate') executePrimaryAction();
  }

  function setMatrixCell(which: 'A' | 'B', row: number, column: number, value: number) {
    const setter = which === 'A' ? setMatrixA : setMatrixB;
    setter((currentMatrix) =>
      currentMatrix.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setVectorCell(which: 'A' | 'B', index: number, value: number) {
    const setter = which === 'A' ? setVectorA : setVectorB;
    setter((currentVector) =>
      currentVector.map((cell, cellIndex) =>
        cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
      ),
    );
  }

  function loadMatrixNotationPreset(preset: MatrixNotationPreset) {
    setMatrixNotationLatex(buildMatrixNotationLatex(preset, matrixA, matrixB));
    setClipboardNotice('Matrix notation loaded');
    setTimeout(() => {
      matrixNotationFieldRef.current?.focus();
    }, 0);
  }

  function loadVectorNotationPreset(preset: VectorNotationPreset) {
    setVectorNotationLatex(buildVectorNotationLatex(preset, vectorA, vectorB));
    setClipboardNotice('Vector notation loaded');
    setTimeout(() => {
      vectorNotationFieldRef.current?.focus();
    }, 0);
  }

  function setSystemCell(size: 2 | 3, row: number, column: number, value: number) {
    const setter = size === 2 ? setSystem2 : setSystem3;
    setter((currentSystem) =>
      currentSystem.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function applyStatisticsRequest(request: StatisticsRequest) {
    if (request.kind === 'dataset') {
      setStatsDataset({ values: request.values });
      setStatisticsWorkingSource('dataset');
      setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      return;
    }

    if (request.kind === 'descriptive' || request.kind === 'frequency' || request.kind === 'meanInference') {
      const nextSource = request.source;
      setStatisticsWorkingSource(nextSource);
      if (nextSource === 'dataset') {
        setStatsDataset({ values: request.values });
        setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      } else {
        setFrequencyTable({ rows: request.rows });
        setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
      }

      if (request.kind === 'meanInference') {
        setMeanInferenceState({
          mode: request.mode,
          level: request.level,
          mu0: request.mu0 ?? '',
        });
      }
      return;
    }

    if (request.kind === 'binomial') {
      setBinomialState({
        n: request.n,
        p: request.p,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'normal') {
      setNormalState({
        mean: request.mean,
        standardDeviation: request.standardDeviation,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'poisson') {
      setPoissonState({
        lambda: request.lambda,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'regression') {
      setRegressionState({ points: request.points });
      return;
    }

    setCorrelationState({ points: request.points });
  }

  function replayHistoryEntry(entry: HistoryEntry) {
    setLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      surface: 'app',
    }));
    setMode(entry.mode);
    if (entry.mode === 'calculate') {
      if (entry.calculateScreen && entry.calculateScreen !== 'standard' && entry.calculateScreen !== 'calculusHome') {
        openCalculateScreen(entry.calculateScreen);
        applyCalculateSeed(entry.calculateScreen, entry.calculateSeed);
      } else {
        openCalculateScreen('standard');
        setCalculateLatex(entry.inputLatex);
      }
    }
    if (entry.mode === 'equation') {
      const replayTarget = inferEquationReplayTarget(entry);
      setEquationLatex(replayTarget.equationLatex);
      openEquationScreen(replayTarget.screen);
      if (entry.numericInterval && replayTarget.screen === 'symbolic') {
        setEquationNumericSolvePanel({
          enabled: true,
          start: entry.numericInterval.start,
          end: entry.numericInterval.end,
          subdivisions: entry.numericInterval.subdivisions,
        });
      }

      if (
        replayTarget.screen === 'quadratic' ||
        replayTarget.screen === 'cubic' ||
        replayTarget.screen === 'quartic'
      ) {
        if (replayTarget.screen === 'quadratic') {
          setQuadraticCoefficients([...replayTarget.coefficients]);
        } else if (replayTarget.screen === 'cubic') {
          setCubicCoefficients([...replayTarget.coefficients]);
        } else {
          setQuarticCoefficients([...replayTarget.coefficients]);
        }
      }
    }

    if (entry.mode === 'advancedCalculus') {
      if (entry.advancedCalcScreen) {
        openAdvancedCalcScreen(entry.advancedCalcScreen);
        applyAdvancedCalcSeed(entry.advancedCalcScreen, entry.advancedCalcSeed);
      } else if (entry.inputLatex.startsWith('\\int_{-\\infty}') || entry.inputLatex.includes('\\infty')) {
        openAdvancedCalcScreen('improperIntegral');
      } else if (entry.inputLatex.startsWith('\\int_')) {
        openAdvancedCalcScreen('definiteIntegral');
      } else if (entry.inputLatex.startsWith('\\int')) {
        openAdvancedCalcScreen('indefiniteIntegral');
      } else if (entry.inputLatex.startsWith('\\lim_{x\\to \\infty}') || entry.inputLatex.startsWith('\\lim_{x\\to -\\infty}')) {
        openAdvancedCalcScreen('infiniteLimit');
      } else if (entry.inputLatex.startsWith('\\lim_')) {
        openAdvancedCalcScreen('finiteLimit');
      } else if (entry.inputLatex.startsWith('\\text{Maclaurin}')) {
        openAdvancedCalcScreen('maclaurin');
      } else if (entry.inputLatex.startsWith('\\text{Taylor}')) {
        openAdvancedCalcScreen('taylor');
      } else if (entry.inputLatex.includes("y''")) {
        openAdvancedCalcScreen('odeSecondOrder');
      } else if (entry.inputLatex.includes("y'=") && entry.inputLatex.includes('h=')) {
        openAdvancedCalcScreen('odeNumericIvp');
      } else if (entry.inputLatex.includes('\\frac{dy}{dx}') || entry.inputLatex.includes("y'=")) {
        openAdvancedCalcScreen('odeFirstOrder');
      } else {
        openAdvancedCalcScreen('home');
      }
    }

    if (entry.mode === 'trigonometry') {
      const parsed = parseTrigDraft(entry.inputLatex, {
        screenHint: entry.trigScreen,
        identityTargetForm: trigIdentityState.targetForm,
      });
      if (parsed.ok) {
        const request = parsed.request;
        const replayScreen = entry.trigScreen
          ? trigRequestToScreen(request, entry.trigScreen)
          : trigRequestToScreen(request);
        openTrigScreen(replayScreen);
        if (request.kind === 'function') {
          const expressionLatex = request.expressionLatex;
          if (replayScreen === 'specialAngles') {
            setSpecialAnglesExpression(expressionLatex);
          } else {
            setTrigFunctionState((currentState) => ({ ...currentState, expressionLatex }));
          }
        } else if (request.kind === 'identitySimplify') {
          const { expressionLatex } = request;
          setTrigIdentityState((currentState) => ({
            ...currentState,
            expressionLatex,
            targetForm: 'simplified',
          }));
        } else if (request.kind === 'identityConvert') {
          const { expressionLatex, targetForm } = request;
          setTrigIdentityState((currentState) => ({
            ...currentState,
            expressionLatex,
            targetForm,
          }));
        } else if (request.kind === 'equationSolve') {
          const { equationLatex } = request;
          setTrigEquationState((currentState) => ({
            ...currentState,
            equationLatex,
            angleUnit: settings.angleUnit,
          }));
        } else if (request.kind === 'rightTriangle') {
          setRightTriangleState({
            knownSideA: request.knownSideA ?? '',
            knownSideB: request.knownSideB ?? '',
            knownSideC: request.knownSideC ?? '',
            knownAngleA: request.knownAngleA ?? '',
            knownAngleB: request.knownAngleB ?? '',
          });
        } else if (request.kind === 'sineRule') {
          setSineRuleState({
            sideA: request.sideA ?? '',
            sideB: request.sideB ?? '',
            sideC: request.sideC ?? '',
            angleA: request.angleA ?? '',
            angleB: request.angleB ?? '',
            angleC: request.angleC ?? '',
          });
        } else if (request.kind === 'cosineRule') {
          setCosineRuleState({
            sideA: request.sideA ?? '',
            sideB: request.sideB ?? '',
            sideC: request.sideC ?? '',
            angleA: request.angleA ?? '',
            angleB: request.angleB ?? '',
            angleC: request.angleC ?? '',
          });
        } else if (request.kind === 'angleConvert') {
          setAngleConvertState({
            value: request.valueLatex,
            from: request.from,
            to: request.to,
          });
        }

        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.trigScreen) {
        openTrigScreen(entry.trigScreen);
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else {
        openTrigScreen('home');
      }
    }

    if (entry.mode === 'statistics') {
      const parsed = parseStatisticsDraft(entry.inputLatex, {
        screenHint: entry.statisticsScreen,
        workingSourceHint: statisticsWorkingSource,
      });
      if (parsed.ok) {
        const replayScreen = entry.statisticsScreen
          ? statisticsRequestToScreen(parsed.request, entry.statisticsScreen)
          : statisticsRequestToScreen(parsed.request);
        openStatisticsScreen(replayScreen);
        applyStatisticsRequest(parsed.request);
        const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
        if (nextSource) {
          setStatisticsWorkingSource(nextSource);
        }
        setStatisticsDraftState({
          rawLatex: entry.inputLatex,
          style: statisticsDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.statisticsScreen) {
        openStatisticsScreen(entry.statisticsScreen);
        setStatisticsDraftState({
          rawLatex: entry.inputLatex,
          style: statisticsDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else {
        openStatisticsScreen('home');
      }
    }

    if (entry.mode === 'geometry') {
      const parsed = parseGeometryDraft(entry.inputLatex, {
        screenHint: entry.geometryScreen,
      });
      if (parsed.ok) {
        const replayScreen = geometryRequestToScreen(parsed.request);
        openGeometryScreen(replayScreen);
        setGeometryDraftState({
          rawLatex: entry.inputLatex,
          style: geometryDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (entry.geometryScreen) {
        openGeometryScreen(entry.geometryScreen);
      } else {
        openGeometryScreen('home');
      }
    }

    setDisplayOutcome({
      kind: 'success',
      title: 'History',
      exactLatex: entry.resultLatex,
      approxText: entry.approxText,
      warnings: [],
    });
    closeHistoryPanel();
  }

  const handleWindowKeydown = useEffectEvent((event: KeyboardEvent) => {
    const plainFormTarget = isPlainFormTarget(event.target);

    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'g') {
      openGuideHome();
      event.preventDefault();
      return;
    }

    if (event.ctrlKey && !event.shiftKey && event.key === ',') {
      toggleSettingsPanel();
      event.preventDefault();
      return;
    }

    if (isLauncherOpen) {
      if (!plainFormTarget && event.key.startsWith('F')) {
        const action = activeSoftMenu.find((item) => item.hotkey === event.key);
        if (action) {
          handleSoftAction(action.id);
          event.preventDefault();
          return;
        }
      }

      if (!plainFormTarget && event.key === 'Escape') {
        goBackInLauncher();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'Enter') {
        openSelectedLauncherEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && /^\d$/.test(event.key)) {
        if (launcherState.level === 'root') {
          const category = getLauncherCategoryByHotkey(launcherCategories, event.key);
          if (category) {
            openLauncherCategoryById(category.id, activeLauncherLeafId);
            event.preventDefault();
          }
        } else if (activeLauncherCategory) {
          const entry = getLauncherAppByHotkey(activeLauncherCategory, event.key);
          if (entry) {
            launchLauncherApp(entry);
            event.preventDefault();
          }
        }
        return;
      }

      if (!plainFormTarget && event.key === 'F5') {
        goBackInLauncher();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'F6') {
        closeLauncher();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) {
        moveCurrentLauncherSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && (event.key === 'ArrowDown' || event.key === 'ArrowRight')) {
        moveCurrentLauncherSelection(1);
        event.preventDefault();
        return;
      }

      return;
    }

    if (event.key === 'Escape') {
      if (settingsOpen) {
        closeSettingsPanel();
        return;
      }

      if (historyOpen) {
        closeHistoryPanel();
        return;
      }

      if (currentMode === 'guide') {
        const parentRoute = getGuideParentRoute(guideRoute);
        if (parentRoute) {
          openGuideRoute(parentRoute);
        } else {
          openLauncher();
        }
      } else if (currentMode === 'equation' && isEquationMenuScreen(equationScreen)) {
        const parentScreen = getEquationParentScreen(equationScreen);
        if (parentScreen) {
          openEquationScreen(parentScreen);
        }
      } else if (
        currentMode === 'equation' &&
        !isAnyFormTarget(event.target) &&
        equationScreen === 'symbolic'
      ) {
        openEquationScreen('home');
      } else if (currentMode === 'equation' && isPolynomialEquationScreen(equationScreen)) {
        openEquationScreen('polynomialMenu');
      } else if (currentMode === 'equation' && isSimultaneousEquationScreen(equationScreen)) {
        openEquationScreen('simultaneousMenu');
      } else if (currentMode === 'calculate' && calculateScreen !== 'standard') {
        const parentScreen = getCalculateParentScreen(calculateScreen);
        if (parentScreen) {
          openCalculateScreen(parentScreen);
        }
      } else if (currentMode === 'statistics') {
        const parentScreen = getStatisticsParentScreen(statisticsScreen);
        if (parentScreen) {
          openStatisticsScreen(parentScreen);
        } else {
          openLauncher();
        }
      } else if (currentMode === 'trigonometry') {
        const parentScreen = getTrigParentScreen(trigScreen);
        if (parentScreen) {
          openTrigScreen(parentScreen);
        } else {
          openLauncher();
        }
      } else if (currentMode === 'geometry') {
        const parentScreen = getGeometryParentScreen(geometryScreen);
        if (parentScreen) {
          openGeometryScreen(parentScreen);
        } else {
          openLauncher();
        }
      } else if (currentMode === 'advancedCalculus') {
        const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
        if (parentScreen) {
          openAdvancedCalcScreen(parentScreen);
        } else {
          openLauncher();
        }
      }
      return;
    }

    if (!plainFormTarget && showModeTabs && event.ctrlKey) {
      if (event.shiftKey && event.key === '1') {
        openStatisticsScreen('home');
        setMode('statistics');
        event.preventDefault();
        return;
      }

      if (event.shiftKey && event.key === '2') {
        openGeometryScreen('home');
        setMode('geometry');
        event.preventDefault();
        return;
      }

      const modeShortcutMap: Partial<Record<string, ModeId>> = {
        1: 'calculate',
        2: 'equation',
        3: 'matrix',
        4: 'vector',
        5: 'table',
        6: 'guide',
        8: 'advancedCalculus',
        9: 'trigonometry',
      };
      const targetMode = modeShortcutMap[event.key];
      if (targetMode) {
        if (targetMode === 'guide') {
          setGuideRoute({ screen: 'home' });
        }
        if (targetMode === 'advancedCalculus') {
          openAdvancedCalcScreen('home');
        }
        if (targetMode === 'trigonometry') {
          openTrigScreen('home');
        }
        if (targetMode === 'statistics') {
          openStatisticsScreen('home');
        }
        if (targetMode === 'geometry') {
          openGeometryScreen('home');
        }
        setMode(targetMode);
        event.preventDefault();
        return;
      }
    }

    if (currentMode === 'advancedCalculus' && isAdvancedCalcMenuOpen) {
      if (!plainFormTarget && event.key === 'Enter') {
        openSelectedAdvancedCalcMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowUp') {
        moveCurrentAdvancedCalcMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowDown') {
        moveCurrentAdvancedCalcMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && /^\d$/.test(event.key)) {
        const entry = getAdvancedCalcMenuEntryByHotkey(advancedCalcScreen, event.key);
        if (entry) {
          openAdvancedCalcScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (currentMode === 'trigonometry' && isTrigMenuOpen) {
      if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'Enter') {
        openSelectedTrigMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'ArrowUp') {
        moveCurrentTrigMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isTrigDraftFocused(event.target) && event.key === 'ArrowDown') {
        moveCurrentTrigMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isTrigDraftFocused(event.target) && /^[1-6]$/.test(event.key)) {
        const entry = getTrigMenuEntryByHotkey(trigScreen, event.key);
        if (entry) {
          openTrigScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (currentMode === 'statistics' && isStatisticsMenuOpen) {
      if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'Enter') {
        openSelectedStatisticsMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'ArrowUp') {
        moveCurrentStatisticsMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && event.key === 'ArrowDown') {
        moveCurrentStatisticsMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && !isStatisticsDraftFocused(event.target) && /^\d$/.test(event.key)) {
        const entry = getStatisticsMenuEntryByHotkey(statisticsScreen, event.key);
        if (entry) {
          openStatisticsScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (currentMode === 'geometry' && isGeometryMenuOpen && !isGeometryDraftFocused(event.target)) {
      if (!plainFormTarget && event.key === 'Enter') {
        openSelectedGeometryMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowUp') {
        moveCurrentGeometryMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowDown') {
        moveCurrentGeometryMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && /^\d$/.test(event.key)) {
        const entry = getGeometryMenuEntryByHotkey(geometryScreen, event.key);
        if (entry) {
          openGeometryScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (
      currentMode === 'geometry'
      && !isGeometryMenuOpen
      && event.key === 'Enter'
    ) {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (
      currentMode === 'trigonometry'
      && !isTrigMenuOpen
      && event.key === 'Enter'
    ) {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (
      currentMode === 'statistics'
      && !isStatisticsMenuOpen
      && event.key === 'Enter'
    ) {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (
      currentMode === 'advancedCalculus'
      && !isAdvancedCalcMenuOpen
      && event.key === 'Enter'
    ) {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (currentMode === 'guide') {
      if (!plainFormTarget && guideRoute.screen !== 'article' && event.key === 'Enter') {
        openSelectedGuideEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && guideRoute.screen === 'article' && event.key === 'Enter') {
        launchGuideExample(selectedGuideExample);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowUp') {
        moveCurrentGuideSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowDown') {
        moveCurrentGuideSelection(1);
        event.preventDefault();
        return;
      }

      if (
        !plainFormTarget
        && (guideRoute.screen === 'home' || guideRoute.screen === 'domain' || guideRoute.screen === 'modeGuide')
        && /^\d$/.test(event.key)
      ) {
        const matchedEntry = guideListEntries.find((entry) => entry.hotkey === event.key);
        if (matchedEntry) {
          openGuideRoute(matchedEntry.route);
          event.preventDefault();
        }
        return;
      }
    }
    if (!plainFormTarget && event.key.startsWith('F')) {
      const action = activeSoftMenu.find((item) => item.hotkey === event.key);
      if (action) {
        handleSoftAction(action.id);
        event.preventDefault();
        return;
      }
    }

    if (currentMode === 'calculate' && isCalculateMenuOpen) {
      if (!plainFormTarget && event.key === 'Enter') {
        openSelectedCalculateMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowUp') {
        moveCurrentCalculateMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowDown') {
        moveCurrentCalculateMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && /^[1-4]$/.test(event.key)) {
        const entry = getCalculateMenuEntryByHotkey(event.key);
        if (entry) {
          openCalculateScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (
      currentMode === 'calculate'
      && isCalculateToolOpen
      && event.key === 'Enter'
    ) {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (currentMode === 'equation' && isEquationMenuScreen(equationScreen)) {
      if (!plainFormTarget && event.key === 'Enter') {
        openSelectedEquationMenuEntry();
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowUp') {
        moveCurrentEquationMenuSelection(-1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && event.key === 'ArrowDown') {
        moveCurrentEquationMenuSelection(1);
        event.preventDefault();
        return;
      }

      if (!plainFormTarget && /^[1-3]$/.test(event.key)) {
        const entry = getEquationMenuEntryByHotkey(equationMenuEntries, event.key);
        if (entry) {
          openEquationScreen(entry.target);
          event.preventDefault();
        }
        return;
      }
    }

    if (!plainFormTarget && event.key === 'Enter') {
      executePrimaryAction();
      event.preventDefault();
      return;
    }

    if (isAnyFormTarget(event.target)) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      insertLatex(event.key);
      event.preventDefault();
      return;
    }

    const map: Record<string, string> = {
      '+': '+',
      '-': '-',
      '*': '\\times',
      '/': '\\div',
      '^': '^{#0}',
      '=': '=',
      '(': '(',
      ')': ')',
      '.': '.',
      ',': ',',
      x: 'x',
    };
    if (map[event.key]) {
      insertLatex(map[event.key]);
      event.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeydown);
    return () => window.removeEventListener('keydown', handleWindowKeydown);
  }, []);

  const activePolynomialView = isPolynomialEquationScreen(equationScreen) ? equationScreen : null;
  const activePolynomialMeta = activePolynomialView ? POLYNOMIAL_VIEW_META[activePolynomialView] : null;
  const activePolynomialCoefficients =
    activePolynomialView === 'quadratic'
      ? quadraticCoefficients
      : activePolynomialView === 'cubic'
        ? cubicCoefficients
        : activePolynomialView === 'quartic'
          ? quarticCoefficients
          : null;
  const equationResultBadges =
    currentMode === 'equation' && equationRouteMeta && !isEquationMenuOpen
      ? [
          ...(equationRouteMeta.badge ? [equationRouteMeta.badge] : []),
          ...(displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'numeric-fallback'
            ? ['Numeric roots']
            : []),
          ]
      : [];
  const advancedCalcProvenanceBadge =
    currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
      ? getAdvancedCalcProvenanceBadge(displayOutcome.resultOrigin as AdvancedCalcResultOrigin | undefined)
      : undefined;
  const advancedCalcResultBadges =
    currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && displayOutcome?.kind === 'success'
      ? ['Advanced Calc']
      : [];
  const calculusStrategyBadge =
    displayOutcome?.kind === 'success'
      ? getCalculusStrategyBadge(displayOutcome.calculusStrategy)
      : undefined;
  const calculusDerivativeStrategyBadges =
    displayOutcome?.kind === 'success'
      ? getCalculusDerivativeStrategyBadges(displayOutcome.calculusDerivativeStrategies)
      : [];
  const calculateResolvedInputLatex =
    displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.resolvedInputLatex
      : undefined;
  const calculateOutcomeLatex =
    currentMode === 'calculate'
      ? calculateResolvedInputLatex ?? activeExpressionLatex()
      : '';
  const isCalculateCalculusOutcome =
    currentMode === 'calculate'
    && displayOutcome?.kind === 'success'
    && (
      calculateScreen !== 'standard'
      || displayOutcome.calculusStrategy !== undefined
      || displayOutcome.calculusDerivativeStrategies !== undefined
      || calculateOutcomeLatex.includes('\\int')
      || calculateOutcomeLatex.includes('\\lim')
      || calculateOutcomeLatex.includes('\\frac{d}')
      || calculateOutcomeLatex.includes('\\frac{\\mathrm{d}}')
    );
  const calculateCalculusProvenanceBadge =
    isCalculateCalculusOutcome && displayOutcome?.kind === 'success'
      ? getCalculusProvenanceLabel(displayOutcome.resultOrigin)
      : undefined;
  const calculateResultBadges =
    isCalculateCalculusOutcome
      ? [
          'Calculus',
          ...(calculateCalculusProvenanceBadge ? [calculateCalculusProvenanceBadge] : []),
        ]
      : [];
  const trigonometryResultBadges =
    currentMode === 'trigonometry' && !isTrigMenuOpen
      ? [
          'Trigonometry',
          ...(
            displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'exact-special-angle'
              ? ['Exact special angle']
              : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'triangle-solver'
                ? ['Triangle solver']
                : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'numeric'
                  ? ['Numeric']
                  : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'symbolic'
                    ? ['Symbolic']
                    : []
          ),
        ]
      : [];
  const geometryResultBadges =
    currentMode === 'geometry' && !isGeometryMenuOpen
      ? [
          'Geometry',
          ...(
            displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'geometry-coordinate'
              ? ['Coordinate']
              : displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'geometry-formula'
                ? ['Formula']
                : []
          ),
        ]
      : [];
  const displayResultBadges = [
    ...calculateResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Calculus' ? 'equation-badge' : 'equation-origin-badge',
    })),
    ...advancedCalcResultBadges.map((badge) => ({
      label: badge,
      className: 'equation-badge',
    })),
    ...trigonometryResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Exact special angle' || badge === 'Triangle solver' || badge === 'Numeric'
        ? 'equation-origin-badge'
        : 'equation-badge',
    })),
    ...geometryResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Coordinate' || badge === 'Formula'
        ? 'equation-origin-badge'
        : 'equation-badge',
    })),
    ...equationResultBadges.map((badge) => ({
      label: badge,
      className: badge === 'Numeric roots' ? 'equation-origin-badge' : 'equation-badge',
    })),
    ...(advancedCalcProvenanceBadge
      ? [{
          label: advancedCalcProvenanceBadge.label,
          className: `advanced-calc-provenance-badge is-${advancedCalcProvenanceBadge.variant}`,
        }]
      : []),
    ...(calculusStrategyBadge
      ? [{
          label: calculusStrategyBadge.label,
          className: 'equation-badge',
        }]
      : []),
    ...calculusDerivativeStrategyBadges.map((badge) => ({
      label: badge.label,
      className: 'equation-badge',
    })),
    ...(((displayOutcome && 'transformBadges' in displayOutcome ? displayOutcome.transformBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: 'equation-badge',
    }))),
    ...(((displayOutcome && 'solveBadges' in displayOutcome ? displayOutcome.solveBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: 'equation-origin-badge',
    }))),
    ...(((displayOutcome && 'plannerBadges' in displayOutcome ? displayOutcome.plannerBadges : undefined) ?? []).map((badge) => ({
      label: badge,
      className: badge === 'Hard Stop' ? 'equation-origin-badge' : 'equation-badge',
    }))),
  ];
  const shouldShowCalculateAlgebraTray =
    currentMode === 'calculate'
    && calculateScreen === 'standard'
    && calculateAlgebraTrayOpen;
  const shouldShowEquationAlgebraTray =
    currentMode === 'equation'
    && equationScreen === 'symbolic'
    && equationAlgebraTrayOpen;
  const activeAlgebraTransforms = shouldShowCalculateAlgebraTray
    ? calculateAlgebraTransforms
    : shouldShowEquationAlgebraTray
      ? equationAlgebraTransforms
      : [];
  const calculateGuideArticleId = calculateRouteMeta?.guideArticleId;
  const calculateAdvancedGuideArticleId =
    calculateScreen === 'integral'
      ? 'advanced-integrals'
      : calculateScreen === 'limit'
        ? 'advanced-limits'
        : null;
  const advancedCalcCoreGuideArticleId =
    advancedCalcScreen === 'indefiniteIntegral'
      || advancedCalcScreen === 'definiteIntegral'
      || advancedCalcScreen === 'improperIntegral'
      || advancedCalcScreen === 'finiteLimit'
      || advancedCalcScreen === 'infiniteLimit'
      ? 'calculus-integrals-limits'
      : null;
  const calculateKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('calculate'));
  const advancedCalcKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('advancedCalculus'));
  const trigonometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('trigonometry'));
  const statisticsKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('statistics'));
  const geometryKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('geometry'));
  const equationKeyboardLayouts = buildVirtualKeyboardLayouts(
    createKeyboardContext('equation', equationScreen),
  );
  const matrixKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('matrix'));
  const tableKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('table'));
  const vectorKeyboardLayouts = buildVirtualKeyboardLayouts(createKeyboardContext('vector'));

  const copyCalculateWorkbenchExpression = () =>
    void copyText(calculateWorkbenchExpression.latex, 'Expression copied');
  const copyAdvancedCalcWorkbenchExpression = () =>
    void copyText(advancedCalcWorkbenchExpression, 'Expression copied');
  const copyStatisticsWorkbenchExpression = () =>
    void copyText(statisticsDraftLatex || statisticsWorkbenchExpression, 'Statistics request copied');
  const copyGeometryWorkbenchExpression = () =>
    void copyText(geometryWorkbenchExpression, 'Geometry request copied');

  const statisticsDatasetText = datasetTextFromValues(statsDataset.values);
  const statisticsRegressionText = pointsTextFromState(regressionState);
  const statisticsCorrelationText = pointsTextFromState(correlationState);
  const statisticsFilledFrequencyRowCount = frequencyTable.rows.filter(
    (row) => row.value.trim() && row.frequency.trim(),
  ).length;
  const statisticsSourceSyncSummary =
    statisticsSourceSyncState.datasetStale
      ? 'Dataset is stale relative to the manual frequency table.'
      : statisticsSourceSyncState.frequencyTableStale
        ? 'Frequency table is stale relative to the dataset.'
        : 'Dataset and frequency table are in sync.';

  function updateStatisticsDataset(text: string) {
    const values = text
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    setStatsDataset({ values });
    setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
  }

  function updateStatisticsFrequencyRow(
    index: number,
    key: 'value' | 'frequency',
    value: string,
  ) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function addStatisticsFrequencyRow() {
    setFrequencyTable((currentTable) => ({
      rows: [...currentTable.rows, { value: '', frequency: '' }],
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function removeStatisticsFrequencyRow(index: number) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.length <= 1
        ? [{ value: '', frequency: '' }]
        : currentTable.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function updateRegressionPointDraft(
    kind: 'regression' | 'correlation',
    index: number,
    key: 'x' | 'y',
    value: string,
  ) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              [key]: value,
            }
          : point,
      ),
    }));
  }

  function addRegressionPoint(kind: 'regression' | 'correlation') {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: [...currentState.points, { x: '', y: '' }],
    }));
  }

  function removeRegressionPoint(kind: 'regression' | 'correlation', index: number) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.length <= 1
        ? [{ x: '', y: '' }]
        : currentState.points.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  function switchStatisticsSource(source: StatisticsWorkingSource) {
    setStatisticsWorkingSource(source);
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      !isStatisticsMenuScreen(statisticsScreen)
      && (statisticsScreen === 'descriptive' || statisticsScreen === 'frequency' || statisticsScreen === 'meanInference')
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(statisticsScreen, statisticsStateSnapshot, source),
        'guided',
        true,
      );
    }
  }

  function importDatasetIntoFrequencyTable() {
    const nextTable = collapseDatasetToFrequencyTable(statsDataset);
    setFrequencyTable(nextTable);
    setStatisticsWorkingSource('frequencyTable');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'frequency'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            frequencyTable: nextTable,
          },
          'frequencyTable',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Frequency table built from dataset');
  }

  function expandStatisticsTableToDataset() {
    const nextDataset = expandFrequencyTableToDataset(frequencyTable);
    setStatsDataset(nextDataset);
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'dataEntry'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'frequency'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            dataset: nextDataset,
          },
          'dataset',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Dataset expanded from frequency table');
  }

  function renderStatisticsWorkspace() {
    if (!statisticsRouteMeta) {
      return null;
    }

    return (
      <section className={`mode-panel ${isStatisticsMenuOpen ? 'statistics-menu-panel' : 'statistics-panel'}`}>
        <div className="equation-panel-header statistics-panel-header">
          <div className="equation-panel-copy">
            <div className="equation-breadcrumbs">
              {statisticsRouteMeta.breadcrumb.map((segment) => (
                <span key={`${statisticsScreen}-${segment}`} className="equation-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{statisticsRouteMeta.label}</strong>
              <span className="equation-badge">Statistics</span>
            </div>
            <p className="equation-hint statistics-panel-subtitle">{statisticsRouteMeta.description}</p>
            <div className="guide-related-links">
              <button className="guide-chip" onClick={() => openStatisticsGuideForScreen()}>
                Guide: This tool
              </button>
              <button className="guide-chip" onClick={() => openGuideMode('statistics')}>
                Guide: Statistics
              </button>
            </div>
          </div>
        </div>

        {isStatisticsMenuOpen ? (
          <>
            <div
              ref={statisticsMenuPanelRef}
              className="launcher-list equation-menu-list statistics-menu-list"
              tabIndex={-1}
            >
              {statisticsMenuEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className={`launcher-entry equation-menu-entry statistics-menu-entry ${index === currentStatisticsMenuIndex ? 'is-selected' : ''}`}
                  onClick={() => openStatisticsScreen(entry.target)}
                  onMouseEnter={() =>
                    setCurrentStatisticsMenuIndex(
                      statisticsScreen as 'home' | 'probabilityHome' | 'inferenceHome',
                      index,
                    )
                  }
                >
                  <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                  <span className="launcher-entry-content">
                    <strong>{entry.label}</strong>
                    <small>{entry.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="equation-menu-help statistics-menu-footer">
              <span>{statisticsMenuFooterText}</span>
            </div>
          </>
        ) : statisticsScreen === 'dataEntry' || statisticsScreen === 'descriptive' || statisticsScreen === 'frequency' || statisticsScreen === 'meanInference' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>
                  {statisticsScreen === 'dataEntry'
                    ? 'Dataset'
                    : statisticsScreen === 'descriptive'
                      ? 'Descriptive Source'
                      : statisticsScreen === 'frequency'
                        ? 'Frequency Source'
                        : 'Inference Source'}
                </strong>
                <span className="equation-badge">
                  {statisticsScreen !== 'dataEntry' && statisticsWorkingSource === 'frequencyTable'
                    ? `${statisticsFilledFrequencyRowCount} rows`
                    : `${statsDataset.values.length} values`}
                </span>
              </div>
              {statisticsScreen !== 'dataEntry' ? (
                <div className="guide-chip-row">
                  <button
                    className={`guide-chip ${statisticsWorkingSource === 'dataset' ? 'is-active' : ''}`}
                    onClick={() => switchStatisticsSource('dataset')}
                  >
                    Use Dataset
                  </button>
                  <button
                    className={`guide-chip ${statisticsWorkingSource === 'frequencyTable' ? 'is-active' : ''}`}
                    onClick={() => switchStatisticsSource('frequencyTable')}
                  >
                    Use Table
                  </button>
                </div>
              ) : null}
              {statisticsScreen !== 'dataEntry' ? (
                <p className="equation-hint">{statisticsSourceSyncSummary}</p>
              ) : null}
              {statisticsScreen === 'meanInference' ? (
                <>
                  <div className="guide-chip-row">
                    <button
                      className={`guide-chip ${meanInferenceState.mode === 'ci' ? 'is-active' : ''}`}
                      onClick={() => setMeanInferenceState((currentState) => ({ ...currentState, mode: 'ci' }))}
                    >
                      Confidence Interval
                    </button>
                    <button
                      className={`guide-chip ${meanInferenceState.mode === 'test' ? 'is-active' : ''}`}
                      onClick={() => setMeanInferenceState((currentState) => ({ ...currentState, mode: 'test' }))}
                    >
                      Two-Sided Test
                    </button>
                  </div>
                  <div className="statistics-input-grid">
                    <label>
                      <span>Level</span>
                      <SignedNumberDraftInput
                        ref={statisticsMeanInferenceLevelRef}
                        value={meanInferenceState.level}
                        onValueChange={(value) => setMeanInferenceState((currentState) => ({ ...currentState, level: value }))}
                        className="statistics-cell-input"
                      />
                    </label>
                    {meanInferenceState.mode === 'test' ? (
                      <label>
                        <span>mu0</span>
                        <SignedNumberDraftInput
                          value={meanInferenceState.mu0}
                          onValueChange={(value) => setMeanInferenceState((currentState) => ({ ...currentState, mu0: value }))}
                          className="statistics-cell-input"
                        />
                      </label>
                    ) : null}
                  </div>
                </>
              ) : null}
              <label className="statistics-text-block">
                <span>{statisticsScreen === 'meanInference' ? 'Dataset values' : 'Values'}</span>
                <textarea
                  ref={statisticsDatasetRef}
                  className="statistics-textarea"
                  value={statisticsDatasetText}
                  onChange={(event) => updateStatisticsDataset(event.target.value)}
                  placeholder="12, 15, 15, 18, 20"
                />
              </label>
              <div className="guide-chip-row">
                <button className="guide-chip" onClick={importDatasetIntoFrequencyTable}>
                  Build Table from Dataset
                </button>
                <button className="guide-chip" onClick={expandStatisticsTableToDataset}>
                  Expand Table -&gt; Dataset
                </button>
                <button
                  className="guide-chip"
                  onClick={() => loadStatisticsDraft(buildStatisticsDraftForScreen(statisticsScreen), 'guided', true)}
                >
                  Use in Statistics
                </button>
              </div>
              <p className="equation-hint">
                The top Statistics editor is the executable request surface. These dataset and table controls seed it when you press EXE/F1 or Use in Statistics.
              </p>
            </div>
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Frequency Table</strong>
                <span className="equation-badge">{statisticsFilledFrequencyRowCount} rows</span>
              </div>
              <div className="statistics-table-labels" aria-hidden="true">
                <span>Value</span>
                <span>Freq</span>
                <span>Action</span>
              </div>
              <div className="statistics-edit-table">
                {frequencyTable.rows.map((row, index) => (
                  <div key={`statistics-frequency-${index}`} className="statistics-edit-row">
                    <SignedNumberDraftInput
                      ref={index === 0 ? statisticsFrequencyValueRef : undefined}
                      className="statistics-cell-input"
                      value={row.value}
                      onValueChange={(value) => updateStatisticsFrequencyRow(index, 'value', value)}
                    />
                    <SignedNumberDraftInput
                      className="statistics-cell-input"
                      value={row.frequency}
                      onValueChange={(value) => updateStatisticsFrequencyRow(index, 'frequency', value)}
                    />
                    <button onClick={() => removeStatisticsFrequencyRow(index)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="display-card-actions">
                <button onClick={addStatisticsFrequencyRow}>Add Row</button>
                <button onClick={copyStatisticsWorkbenchExpression}>Copy Expr</button>
              </div>
              {statisticsScreen === 'dataEntry' ? (
                <div className="statistics-summary-card">
                  <strong>Current Dataset</strong>
                  <p>{statisticsDatasetText || 'No dataset values entered yet.'}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : statisticsScreen === 'binomial' || statisticsScreen === 'normal' || statisticsScreen === 'poisson' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>{statisticsRouteMeta.label}</strong>
                <span className="equation-badge">Probability</span>
              </div>
              {statisticsScreen === 'binomial' ? (
                <div className="statistics-input-grid">
                  <label><span>n</span><SignedNumberDraftInput ref={statisticsBinomialNRef} value={binomialState.n} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, n: value }))} className="statistics-cell-input" /></label>
                  <label><span>p</span><SignedNumberDraftInput value={binomialState.p} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, p: value }))} className="statistics-cell-input" /></label>
                  <label><span>x</span><SignedNumberDraftInput value={binomialState.x} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
                </div>
              ) : statisticsScreen === 'normal' ? (
                <div className="statistics-input-grid">
                  <label><span>Mean</span><SignedNumberDraftInput ref={statisticsNormalMeanRef} value={normalState.mean} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, mean: value }))} className="statistics-cell-input" /></label>
                  <label><span>SD</span><SignedNumberDraftInput value={normalState.standardDeviation} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, standardDeviation: value }))} className="statistics-cell-input" /></label>
                  <label><span>x</span><SignedNumberDraftInput value={normalState.x} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
                </div>
              ) : (
                <div className="statistics-input-grid">
                  <label><span>Lambda</span><SignedNumberDraftInput ref={statisticsPoissonLambdaRef} value={poissonState.lambda} onValueChange={(value) => setPoissonState((currentState) => ({ ...currentState, lambda: value }))} className="statistics-cell-input" /></label>
                  <label><span>x</span><SignedNumberDraftInput value={poissonState.x} onValueChange={(value) => setPoissonState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
                </div>
              )}
              <div className="guide-chip-row">
                {(statisticsScreen === 'normal'
                  ? ['pdf', 'cdf']
                  : ['pmf', 'cdf']
                ).map((mode) => (
                  <button
                    key={`${statisticsScreen}-${mode}`}
                    className={`guide-chip ${(statisticsScreen === 'binomial'
                      ? binomialState.mode === mode
                      : statisticsScreen === 'normal'
                        ? normalState.mode === mode
                        : poissonState.mode === mode) ? 'is-active' : ''}`}
                    onClick={() => {
                      if (statisticsScreen === 'binomial') {
                        setBinomialState((currentState) => ({ ...currentState, mode: mode as 'pmf' | 'cdf' }));
                      } else if (statisticsScreen === 'normal') {
                        setNormalState((currentState) => ({ ...currentState, mode: mode as 'pdf' | 'cdf' }));
                      } else {
                        setPoissonState((currentState) => ({ ...currentState, mode: mode as 'pmf' | 'cdf' }));
                      }
                    }}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="display-card-actions">
                <button onClick={() => loadStatisticsDraft(buildStatisticsDraftForScreen(statisticsScreen), 'guided', true)}>Use in Statistics</button>
                <button onClick={copyStatisticsWorkbenchExpression}>Copy Expr</button>
              </div>
            </div>
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Guided Request</strong>
                <span className="equation-subtitle">Structured draft</span>
              </div>
              <MathStatic className="polynomial-preview-math" latex={statisticsWorkbenchExpression} />
              <p className="equation-hint">
                Use the top Statistics editor for direct edits, or keep working in the guided probability form.
              </p>
            </div>
          </div>
        ) : statisticsScreen === 'regression' || statisticsScreen === 'correlation' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>{statisticsRouteMeta.label}</strong>
                <span className="equation-badge">Point set</span>
              </div>
              <div className="statistics-table-labels" aria-hidden="true">
                <span>x</span>
                <span>y</span>
                <span>Action</span>
              </div>
              <div className="statistics-edit-table">
                {(statisticsScreen === 'regression' ? regressionState.points : correlationState.points).map((point, index) => (
                  <div key={`${statisticsScreen}-point-${index}`} className="statistics-edit-row">
                    <SignedNumberDraftInput
                      ref={index === 0
                        ? (statisticsScreen === 'regression' ? statisticsRegressionXRef : statisticsCorrelationXRef)
                        : undefined}
                      className="statistics-cell-input"
                      value={point.x}
                      onValueChange={(value) => updateRegressionPointDraft(statisticsScreen, index, 'x', value)}
                    />
                    <SignedNumberDraftInput
                      className="statistics-cell-input"
                      value={point.y}
                      onValueChange={(value) => updateRegressionPointDraft(statisticsScreen, index, 'y', value)}
                    />
                    <button onClick={() => removeRegressionPoint(statisticsScreen, index)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="display-card-actions">
                <button onClick={() => addRegressionPoint(statisticsScreen)}>Add Point</button>
                <button onClick={() => loadStatisticsDraft(buildStatisticsDraftForScreen(statisticsScreen), 'guided', true)}>Use in Statistics</button>
                <button onClick={copyStatisticsWorkbenchExpression}>Copy Expr</button>
              </div>
            </div>
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Guided Request</strong>
                <span className="equation-subtitle">Structured draft</span>
              </div>
              <MathStatic className="polynomial-preview-math" latex={statisticsWorkbenchExpression} />
              <div className="statistics-summary-card">
                <strong>{statisticsScreen === 'regression' ? 'Regression points' : 'Correlation points'}</strong>
                <p>{statisticsScreen === 'regression' ? statisticsRegressionText : statisticsCorrelationText}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{statisticsRouteMeta.label}</strong>
              <span className="equation-badge">Statistics</span>
            </div>
            <p className="equation-hint">
              Use the top Statistics editor for the active request, or return to a guided tool from the menu.
            </p>
          </div>
        )}
      </section>
    );
  }

  function renderTrigonometryPreviewCard(
    title: string,
    subtitle: string,
    emptyTitle: string,
    emptyDescription: string,
  ) {
    return (
      <GeneratedPreviewCard
        title={title}
        subtitle={subtitle}
        latex={trigWorkbenchExpression}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onToEditor={() => {
          loadTrigDraft(buildTrigDraftForScreen(trigScreen), 'guided', true);
          setClipboardNotice('Trigonometry request loaded');
        }}
        toEditorLabel="Use in Trigonometry"
        onCopyExpr={() => void copyText(trigWorkbenchExpression, 'Trigonometry request copied')}
      />
    );
  }

  function renderTrigonometryWorkspace() {
    if (!trigRouteMeta) {
      return null;
    }

    return (
      <section className={`mode-panel ${isTrigMenuOpen ? 'trig-menu-panel' : 'trig-panel'}`}>
        <div className="equation-panel-header trig-panel-header">
          <div className="equation-panel-copy">
            <div className="equation-breadcrumbs">
              {trigRouteMeta.breadcrumb.map((segment) => (
                <span key={`${trigScreen}-${segment}`} className="equation-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{trigRouteMeta.label}</strong>
              <span className="equation-badge">Trigonometry</span>
            </div>
            <p className="equation-hint trig-panel-subtitle">{trigRouteMeta.description}</p>
            <div className="guide-related-links">
              {trigRouteMeta.guideArticleId ? (
                <button className="guide-chip" onClick={() => openGuideArticle(trigRouteMeta.guideArticleId!)}>
                  Guide: This tool
                </button>
              ) : null}
              <button className="guide-chip" onClick={() => openGuideMode('trigonometry')}>Guide: Trigonometry</button>
            </div>
          </div>
        </div>

        {isTrigMenuOpen ? (
          <>
            <div
              ref={trigMenuPanelRef}
              className="launcher-list equation-menu-list trig-menu-list"
              tabIndex={-1}
            >
              {trigMenuEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className={`launcher-entry equation-menu-entry trig-menu-entry ${index === currentTrigMenuIndex ? 'is-selected' : ''}`}
                  onClick={() => openTrigScreen(entry.target)}
                  onMouseEnter={() =>
                    setCurrentTrigMenuIndex(
                      trigScreen as 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
                      index,
                    )
                  }
                >
                  <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                  <span className="launcher-entry-content">
                    <strong>{entry.label}</strong>
                    <small>{entry.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="equation-menu-help trig-menu-footer">
              <span>{trigMenuFooterText}</span>
            </div>
          </>
        ) : trigScreen === 'functions' ? (
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Function Presets</strong>
              <span className="equation-badge">{settings.angleUnit.toUpperCase()}</span>
            </div>
            <div className="quick-template-grid trig-preset-grid">
              {[
                '\\sin\\left(30\\right)',
                '\\cos\\left(\\frac{\\pi}{3}\\right)',
                '\\arcsin\\left(\\frac{1}{2}\\right)',
                '\\tan\\left(45\\right)',
              ].map((expressionLatex) => (
                <button
                  key={expressionLatex}
                  onClick={() => {
                    setTrigFunctionState((currentState) => ({ ...currentState, expressionLatex }));
                    loadTrigDraft(expressionLatex, 'guided', true);
                  }}
                >
                  {expressionLatex === '\\sin\\left(30\\right)'
                    ? 'sin(30)'
                    : expressionLatex === '\\cos\\left(\\frac{\\pi}{3}\\right)'
                      ? 'cos(pi/3)'
                      : expressionLatex === '\\arcsin\\left(\\frac{1}{2}\\right)'
                        ? 'asin(1/2)'
                        : 'tan(45)'}
                </button>
              ))}
            </div>
            <p className="equation-hint">Use the top editor for the active trig expression. These presets load directly into the shared Trigonometry draft.</p>
          </div>
        ) : trigScreen === 'identitySimplify' || trigScreen === 'identityConvert' ? (
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{trigScreen === 'identitySimplify' ? 'Identity Presets' : 'Identity Convert'}</strong>
              <span className="equation-badge">Bounded symbolic</span>
            </div>
            <div className="quick-template-grid trig-preset-grid">
              {trigScreen === 'identitySimplify' ? (
                <>
                  <button
                    onClick={() => {
                      const expressionLatex = '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)';
                      setTrigIdentityState((currentState) => ({ ...currentState, expressionLatex }));
                      loadTrigDraft(expressionLatex, 'guided', true);
                    }}
                  >
                    sin^2+cos^2
                  </button>
                  <button
                    onClick={() => {
                      const expressionLatex = '\\frac{\\sin\\left(x\\right)}{\\cos\\left(x\\right)}';
                      setTrigIdentityState((currentState) => ({ ...currentState, expressionLatex }));
                      loadTrigDraft(expressionLatex, 'guided', true);
                    }}
                  >
                    sin/cos
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const expressionLatex = '\\sin\\left(A\\right)\\sin\\left(B\\right)';
                      setTrigIdentityState((currentState) => ({
                        ...currentState,
                        expressionLatex,
                        targetForm: 'productToSum',
                      }));
                      loadTrigDraft(expressionLatex, 'guided', true);
                    }}
                  >
                    Product-&gt;Sum
                  </button>
                  <button
                    onClick={() => {
                      const expressionLatex = '\\sin\\left(A\\right)+\\sin\\left(B\\right)';
                      setTrigIdentityState((currentState) => ({
                        ...currentState,
                        expressionLatex,
                        targetForm: 'sumToProduct',
                      }));
                      loadTrigDraft(expressionLatex, 'guided', true);
                    }}
                  >
                    Sum-&gt;Product
                  </button>
                </>
              )}
            </div>
            {trigScreen === 'identityConvert' ? (
              <div className="guide-chip-row">
                {(Object.entries(TRIG_TARGET_FORM_LABELS) as Array<[TrigIdentityState['targetForm'], string]>).map(([targetForm, label]) => (
                  <button
                    key={targetForm}
                    className={`guide-chip ${trigIdentityState.targetForm === targetForm ? 'is-active' : ''}`}
                    onClick={() =>
                      setTrigIdentityState((currentState) => ({ ...currentState, targetForm }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="equation-hint">
              Use the top editor for the active identity draft. The target-form chips stay active here without moving you into Calculate.
            </p>
          </div>
        ) : trigScreen === 'equationSolve' ? (
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Equation Presets</strong>
              <span className="equation-badge">{settings.angleUnit.toUpperCase()}</span>
            </div>
            <div className="quick-template-grid trig-preset-grid">
              {[
                '\\sin\\left(x\\right)=\\frac{1}{2}',
                '\\cos\\left(x\\right)=0',
                '\\tan\\left(x\\right)=1',
                '\\sin\\left(2x\\right)=0',
              ].map((equationLatex) => (
                <button
                  key={equationLatex}
                  onClick={() => {
                    setTrigEquationState((currentState) => ({ ...currentState, equationLatex }));
                    loadTrigDraft(equationLatex, 'guided', true);
                  }}
                >
                  {equationLatex === '\\sin\\left(x\\right)=\\frac{1}{2}'
                    ? 'sin(x)=1/2'
                    : equationLatex === '\\cos\\left(x\\right)=0'
                      ? 'cos(x)=0'
                      : equationLatex === '\\tan\\left(x\\right)=1'
                        ? 'tan(x)=1'
                        : 'sin(2x)=0'}
                </button>
              ))}
            </div>
            <p className="equation-hint">Use the top editor for the active trig equation. The solver remains bounded to the supported textbook forms.</p>
          </div>
        ) : trigScreen === 'rightTriangle' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Right Triangle</strong>
                <span className="equation-badge">Enter exactly two values</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Side a</span>
                  <SignedNumberDraftInput
                    ref={rightTriangleSideARef}
                    value={rightTriangleState.knownSideA}
                    onValueChange={(knownSideA) =>
                      setRightTriangleState((currentState) => ({ ...currentState, knownSideA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Side b</span>
                  <SignedNumberDraftInput
                    value={rightTriangleState.knownSideB}
                    onValueChange={(knownSideB) =>
                      setRightTriangleState((currentState) => ({ ...currentState, knownSideB }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Hypotenuse c</span>
                  <SignedNumberDraftInput
                    value={rightTriangleState.knownSideC}
                    onValueChange={(knownSideC) =>
                      setRightTriangleState((currentState) => ({ ...currentState, knownSideC }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle A</span>
                  <SignedNumberDraftInput
                    value={rightTriangleState.knownAngleA}
                    onValueChange={(knownAngleA) =>
                      setRightTriangleState((currentState) => ({ ...currentState, knownAngleA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle B</span>
                  <SignedNumberDraftInput
                    value={rightTriangleState.knownAngleB}
                    onValueChange={(knownAngleB) =>
                      setRightTriangleState((currentState) => ({ ...currentState, knownAngleB }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderTrigonometryPreviewCard(
              'Triangle Request',
              'c is the hypotenuse and C is fixed at 90 degrees',
              'Two values needed',
              'Enter exactly two known values, with at least one side.',
            )}
          </div>
        ) : trigScreen === 'sineRule' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Sine Rule</strong>
                <span className="equation-badge">Side-angle solver</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Side a</span>
                  <SignedNumberDraftInput
                    ref={sineRuleSideARef}
                    value={sineRuleState.sideA}
                    onValueChange={(sideA) =>
                      setSineRuleState((currentState) => ({ ...currentState, sideA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Side b</span>
                  <SignedNumberDraftInput
                    value={sineRuleState.sideB}
                    onValueChange={(sideB) =>
                      setSineRuleState((currentState) => ({ ...currentState, sideB }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Side c</span>
                  <SignedNumberDraftInput
                    value={sineRuleState.sideC}
                    onValueChange={(sideC) =>
                      setSineRuleState((currentState) => ({ ...currentState, sideC }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle A</span>
                  <SignedNumberDraftInput
                    value={sineRuleState.angleA}
                    onValueChange={(angleA) =>
                      setSineRuleState((currentState) => ({ ...currentState, angleA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle B</span>
                  <SignedNumberDraftInput
                    value={sineRuleState.angleB}
                    onValueChange={(angleB) =>
                      setSineRuleState((currentState) => ({ ...currentState, angleB }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle C</span>
                  <SignedNumberDraftInput
                    value={sineRuleState.angleC}
                    onValueChange={(angleC) =>
                      setSineRuleState((currentState) => ({ ...currentState, angleC }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderTrigonometryPreviewCard(
              'Sine-Rule Request',
              'Start with a matching side-angle pair',
              'Triangle data needed',
              'Enter a matching side-angle pair and enough extra data to define the triangle.',
            )}
          </div>
        ) : trigScreen === 'cosineRule' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Cosine Rule</strong>
                <span className="equation-badge">SSS or SAS</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Side a</span>
                  <SignedNumberDraftInput
                    ref={cosineRuleSideARef}
                    value={cosineRuleState.sideA}
                    onValueChange={(sideA) =>
                      setCosineRuleState((currentState) => ({ ...currentState, sideA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Side b</span>
                  <SignedNumberDraftInput
                    value={cosineRuleState.sideB}
                    onValueChange={(sideB) =>
                      setCosineRuleState((currentState) => ({ ...currentState, sideB }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Side c</span>
                  <SignedNumberDraftInput
                    value={cosineRuleState.sideC}
                    onValueChange={(sideC) =>
                      setCosineRuleState((currentState) => ({ ...currentState, sideC }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle A</span>
                  <SignedNumberDraftInput
                    value={cosineRuleState.angleA}
                    onValueChange={(angleA) =>
                      setCosineRuleState((currentState) => ({ ...currentState, angleA }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle B</span>
                  <SignedNumberDraftInput
                    value={cosineRuleState.angleB}
                    onValueChange={(angleB) =>
                      setCosineRuleState((currentState) => ({ ...currentState, angleB }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle C</span>
                  <SignedNumberDraftInput
                    value={cosineRuleState.angleC}
                    onValueChange={(angleC) =>
                      setCosineRuleState((currentState) => ({ ...currentState, angleC }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderTrigonometryPreviewCard(
              'Cosine-Rule Request',
              'Use three sides or two sides and the included angle',
              'Triangle data needed',
              'Enter either SSS or SAS data before evaluating.',
            )}
          </div>
        ) : trigScreen === 'angleConvert' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Angle Convert</strong>
                <span className="equation-badge">deg / rad / grad</span>
              </div>
              <label className="range-field">
                <span>Value</span>
                <SignedNumberDraftInput
                  ref={angleConvertValueRef}
                  value={angleConvertState.value}
                  onValueChange={(value) =>
                    setAngleConvertState((currentState) => ({ ...currentState, value }))
                  }
                />
              </label>
              <div className="guide-chip-row">
                {(['deg', 'rad', 'grad'] as const).map((unit) => (
                  <button
                    key={`from-${unit}`}
                    className={`guide-chip ${angleConvertState.from === unit ? 'is-active' : ''}`}
                    onClick={() =>
                      setAngleConvertState((currentState) => ({ ...currentState, from: unit }))
                    }
                  >
                    From {unit.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="guide-chip-row">
                {(['deg', 'rad', 'grad'] as const).map((unit) => (
                  <button
                    key={`to-${unit}`}
                    className={`guide-chip ${angleConvertState.to === unit ? 'is-active' : ''}`}
                    onClick={() =>
                      setAngleConvertState((currentState) => ({ ...currentState, to: unit }))
                    }
                  >
                    To {unit.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="display-card-actions">
                <button
                  onClick={() =>
                    setAngleConvertState((currentState) => ({
                      ...currentState,
                      from: currentState.to,
                      to: currentState.from,
                    }))
                  }
                >
                  Swap Units
                </button>
              </div>
            </div>
            {renderTrigonometryPreviewCard(
              'Conversion Request',
              'Exact pi output appears when a supported special angle is recognized',
              'Value needed',
              'Enter a numeric value, then choose the source and target units.',
            )}
          </div>
        ) : trigScreen === 'specialAngles' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Special-Angle Reference</strong>
                <span className="equation-badge">{settings.angleUnit.toUpperCase()}</span>
              </div>
              <p className="equation-hint">Use the top editor for curated exact-value checks such as sin(30), cos(pi/3), and tan(45).</p>
            </div>
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Reference Table</strong>
                <span className="equation-badge">Exact values</span>
              </div>
              <div className="trig-reference-grid">
                {SPECIAL_ANGLE_REFERENCE.map((row) => (
                  <div key={row.degrees} className="guide-example trig-reference-card">
                    <MathStatic
                      className="polynomial-preview-math"
                      latex={`\\theta=${row.degrees}^{\\circ},\\ ${row.radiansLatex}`}
                    />
                    <MathStatic
                      className="polynomial-preview-math"
                      latex={`\\sin\\theta=${row.sinLatex},\\ \\cos\\theta=${row.cosLatex},\\ \\tan\\theta=${row.tanLatex}`}
                    />
                    <div className="display-card-actions">
                      {(['sin', 'cos', 'tan'] as const).map((fn) => {
                        const expressionLatex = `\\${fn}\\left(${settings.angleUnit === 'rad' ? row.radiansLatex : row.degrees}\\right)`;
                        return (
                          <button
                            key={`${row.degrees}-${fn}`}
                            onClick={() => {
                              setSpecialAnglesExpression(expressionLatex);
                              loadTrigDraft(expressionLatex, 'guided', true);
                              setClipboardNotice('Special-angle example loaded');
                            }}
                          >
                            Load {fn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderGeometryPreviewCard(
    title: string,
    subtitle: string,
    emptyTitle: string,
    emptyDescription: string,
  ) {
    return (
      <GeneratedPreviewCard
        title={title}
        subtitle={subtitle}
        latex={geometryWorkbenchExpression}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onToEditor={() => {
          loadGeometryDraft(geometryWorkbenchExpression, 'guided', true);
          setClipboardNotice('Geometry request loaded');
        }}
        toEditorLabel="Use in Geometry"
        onCopyExpr={copyGeometryWorkbenchExpression}
      />
    );
  }

  function renderGeometryWorkspace() {
    if (!geometryRouteMeta) {
      return null;
    }

    return (
      <section className={`mode-panel ${isGeometryMenuOpen ? 'geometry-menu-panel' : 'geometry-panel'}`}>
        <div className="equation-panel-header geometry-panel-header">
          <div className="equation-panel-copy">
            <div className="equation-breadcrumbs">
              {geometryRouteMeta.breadcrumb.map((segment) => (
                <span key={`${geometryScreen}-${segment}`} className="equation-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{geometryRouteMeta.label}</strong>
              <span className="equation-badge">Geometry</span>
            </div>
            <p className="equation-hint geometry-panel-subtitle">{geometryRouteMeta.description}</p>
            <div className="guide-related-links">
              {geometryRouteMeta.guideArticleId ? (
                <button className="guide-chip" onClick={() => openGuideArticle(geometryRouteMeta.guideArticleId!)}>
                  Guide: This tool
                </button>
              ) : null}
              <button className="guide-chip" onClick={() => openGuideMode('geometry')}>Guide: Geometry</button>
            </div>
            {!isGeometryMenuOpen && geometrySolveMissingTemplates(geometryScreen).length > 0 ? (
              <div className="guide-chip-row">
                {geometrySolveMissingTemplates(geometryScreen).map((template) => (
                  <button
                    key={`${geometryScreen}-${template.label}`}
                    className="guide-chip"
                    onClick={() => loadGeometrySolveMissingTemplate(template.latex)}
                  >
                    Solve Missing: {template.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {isGeometryMenuOpen ? (
          <>
            <div
              ref={geometryMenuPanelRef}
              className="launcher-list equation-menu-list geometry-menu-list"
              tabIndex={-1}
            >
              {geometryMenuEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className={`launcher-entry equation-menu-entry geometry-menu-entry ${index === currentGeometryMenuIndex ? 'is-selected' : ''}`}
                  onClick={() => openGeometryScreen(entry.target)}
                  onMouseEnter={() => setCurrentGeometryMenuIndex(geometryScreen as 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome', index)}
                >
                  <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                  <span className="launcher-entry-content">
                    <strong>{entry.label}</strong>
                    <small>{entry.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="equation-menu-help geometry-menu-footer">
              <span>{geometryMenuFooterText}</span>
            </div>
          </>
        ) : geometryScreen === 'square' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Square</strong>
                <span className="equation-badge">One side</span>
              </div>
              <label className="range-field">
                <span>Side s</span>
                <SignedNumberDraftInput
                  ref={squareSideRef}
                  value={squareState.side}
                  onValueChange={(side) =>
                    setSquareState((currentState) => ({ ...currentState, side }))
                  }
                />
              </label>
            </div>
            {renderGeometryPreviewCard(
              'Square Summary',
              'Area, perimeter, and diagonal from one side',
              'Side needed',
              'Enter a positive side length before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'rectangle' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Rectangle</strong>
                <span className="equation-badge">Width and height</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Width</span>
                  <SignedNumberDraftInput
                    ref={rectangleWidthRef}
                    value={rectangleState.width}
                    onValueChange={(width) =>
                      setRectangleState((currentState) => ({ ...currentState, width }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Height</span>
                  <SignedNumberDraftInput
                    value={rectangleState.height}
                    onValueChange={(height) =>
                      setRectangleState((currentState) => ({ ...currentState, height }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Rectangle Summary',
              'Area, perimeter, and diagonal from width and height',
              'Dimensions needed',
              'Enter positive width and height values before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'triangleArea' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Triangle Area</strong>
                <span className="equation-badge">Base and height</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Base</span>
                  <SignedNumberDraftInput
                    ref={triangleAreaBaseRef}
                    value={triangleAreaState.base}
                    onValueChange={(base) =>
                      setTriangleAreaState((currentState) => ({ ...currentState, base }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Height</span>
                  <SignedNumberDraftInput
                    value={triangleAreaState.height}
                    onValueChange={(height) =>
                      setTriangleAreaState((currentState) => ({ ...currentState, height }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Triangle Summary',
              'Direct area formula',
              'Measurements needed',
              'Enter positive base and height values before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'triangleHeron' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Heron</strong>
                <span className="equation-badge">Three sides</span>
              </div>
              <div className="polynomial-grid" data-columns={3}>
                <label className="range-field">
                  <span>a</span>
                  <SignedNumberDraftInput
                    ref={triangleHeronARef}
                    value={triangleHeronState.a}
                    onValueChange={(a) =>
                      setTriangleHeronState((currentState) => ({ ...currentState, a }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>b</span>
                  <SignedNumberDraftInput
                    value={triangleHeronState.b}
                    onValueChange={(b) =>
                      setTriangleHeronState((currentState) => ({ ...currentState, b }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>c</span>
                  <SignedNumberDraftInput
                    value={triangleHeronState.c}
                    onValueChange={(c) =>
                      setTriangleHeronState((currentState) => ({ ...currentState, c }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Heron Summary',
              'Area from three sides',
              'Sides needed',
              'Enter three positive side lengths before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'circle' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Circle</strong>
                <span className="equation-badge">Radius</span>
              </div>
              <label className="range-field">
                <span>Radius r</span>
                <SignedNumberDraftInput
                  ref={circleRadiusRef}
                  value={circleState.radius}
                  onValueChange={(radius) =>
                    setCircleState((currentState) => ({ ...currentState, radius }))
                  }
                />
              </label>
            </div>
            {renderGeometryPreviewCard(
              'Circle Summary',
              'Diameter, circumference, and area from radius',
              'Radius needed',
              'Enter a positive radius before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'arcSector' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Arc and Sector</strong>
                <span className="equation-badge">Radius and angle</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Radius r</span>
                  <SignedNumberDraftInput
                    ref={arcSectorRadiusRef}
                    value={arcSectorState.radius}
                    onValueChange={(radius) =>
                      setArcSectorState((currentState) => ({ ...currentState, radius }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Angle</span>
                  <SignedNumberDraftInput
                    value={arcSectorState.angle}
                    onValueChange={(angle) =>
                      setArcSectorState((currentState) => ({ ...currentState, angle }))
                    }
                  />
                </label>
              </div>
              <div className="guide-chip-row">
                {(['deg', 'rad', 'grad'] as const).map((unit) => (
                  <button
                    key={`geometry-angle-${unit}`}
                    className={`guide-chip ${arcSectorState.angleUnit === unit ? 'is-active' : ''}`}
                    onClick={() =>
                      setArcSectorState((currentState) => ({ ...currentState, angleUnit: unit }))
                    }
                  >
                    {unit.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Arc and Sector Summary',
              'Arc length and sector area from radius and central angle',
              'Measurements needed',
              'Enter a positive radius and angle before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'cube' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Cube</strong>
                <span className="equation-badge">One side</span>
              </div>
              <label className="range-field">
                <span>Side s</span>
                <SignedNumberDraftInput
                  ref={cubeSideRef}
                  value={cubeState.side}
                  onValueChange={(side) =>
                    setCubeState((currentState) => ({ ...currentState, side }))
                  }
                />
              </label>
            </div>
            {renderGeometryPreviewCard(
              'Cube Summary',
              'Volume, surface area, and space diagonal from one side',
              'Side needed',
              'Enter a positive side length before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'cuboid' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Cuboid</strong>
                <span className="equation-badge">Length, width, and height</span>
              </div>
              <div className="polynomial-grid" data-columns={3}>
                <label className="range-field">
                  <span>Length</span>
                  <SignedNumberDraftInput
                    ref={cuboidLengthRef}
                    value={cuboidState.length}
                    onValueChange={(length) =>
                      setCuboidState((currentState) => ({ ...currentState, length }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Width</span>
                  <SignedNumberDraftInput
                    value={cuboidState.width}
                    onValueChange={(width) =>
                      setCuboidState((currentState) => ({ ...currentState, width }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Height</span>
                  <SignedNumberDraftInput
                    value={cuboidState.height}
                    onValueChange={(height) =>
                      setCuboidState((currentState) => ({ ...currentState, height }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Cuboid Summary',
              'Volume, surface area, and space diagonal from three dimensions',
              'Dimensions needed',
              'Enter positive length, width, and height values before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'cylinder' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Cylinder</strong>
                <span className="equation-badge">Radius and height</span>
              </div>
              <div className="polynomial-grid" data-columns={2}>
                <label className="range-field">
                  <span>Radius r</span>
                  <SignedNumberDraftInput
                    ref={cylinderRadiusRef}
                    value={cylinderState.radius}
                    onValueChange={(radius) =>
                      setCylinderState((currentState) => ({ ...currentState, radius }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Height h</span>
                  <SignedNumberDraftInput
                    value={cylinderState.height}
                    onValueChange={(height) =>
                      setCylinderState((currentState) => ({ ...currentState, height }))
                    }
                  />
                </label>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Cylinder Summary',
              'Volume plus curved and total surface area',
              'Measurements needed',
              'Enter a positive radius and height before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'cone' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Cone</strong>
                <span className="equation-badge">Radius with height/slant</span>
              </div>
              <div className="polynomial-grid" data-columns={3}>
                <label className="range-field">
                  <span>Radius r</span>
                  <SignedNumberDraftInput
                    ref={coneRadiusRef}
                    value={coneState.radius}
                    onValueChange={(radius) =>
                      setConeState((currentState) => ({ ...currentState, radius }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Height h</span>
                  <SignedNumberDraftInput
                    value={coneState.height}
                    onValueChange={(height) =>
                      setConeState((currentState) => ({ ...currentState, height }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Slant l</span>
                  <SignedNumberDraftInput
                    value={coneState.slantHeight}
                    onValueChange={(slantHeight) =>
                      setConeState((currentState) => ({ ...currentState, slantHeight }))
                    }
                  />
                </label>
              </div>
              <p className="equation-hint geometry-note">
                Enter radius with either height or slant height. If you enter both,
                they must satisfy l^2 = r^2 + h^2.
              </p>
            </div>
            {renderGeometryPreviewCard(
              'Cone Summary',
              'Volume and total surface area from a valid cone setup',
              'Measurements needed',
              'Enter a positive radius and at least one valid height/slant value before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'sphere' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Sphere</strong>
                <span className="equation-badge">Radius</span>
              </div>
              <label className="range-field">
                <span>Radius r</span>
                <SignedNumberDraftInput
                  ref={sphereRadiusRef}
                  value={sphereState.radius}
                  onValueChange={(radius) =>
                    setSphereState((currentState) => ({ ...currentState, radius }))
                  }
                />
              </label>
            </div>
            {renderGeometryPreviewCard(
              'Sphere Summary',
              'Volume and surface area from radius',
              'Radius needed',
              'Enter a positive radius before evaluating.',
            )}
          </div>
        ) : geometryScreen === 'distance' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Distance</strong>
                <span className="equation-badge">Two points</span>
              </div>
              <div className="geometry-point-grid">
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P1</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      ref={distanceP1XRef}
                      value={distanceState.p1.x}
                      onValueChange={(x) =>
                        setDistanceState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={distanceState.p1.y}
                      onValueChange={(y) =>
                        setDistanceState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, y },
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P2</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      value={distanceState.p2.x}
                      onValueChange={(x) =>
                        setDistanceState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={distanceState.p2.y}
                      onValueChange={(y) =>
                        setDistanceState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, y },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Distance Request',
              'Distance formula between two points',
              'Point pair needed',
              'Enter both points before evaluating the distance.',
            )}
          </div>
        ) : geometryScreen === 'midpoint' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Midpoint</strong>
                <span className="equation-badge">Two points</span>
              </div>
              <div className="geometry-point-grid">
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P1</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      ref={midpointP1XRef}
                      value={midpointState.p1.x}
                      onValueChange={(x) =>
                        setMidpointState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={midpointState.p1.y}
                      onValueChange={(y) =>
                        setMidpointState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, y },
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P2</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      value={midpointState.p2.x}
                      onValueChange={(x) =>
                        setMidpointState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={midpointState.p2.y}
                      onValueChange={(y) =>
                        setMidpointState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, y },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Midpoint Request',
              'Midpoint formula between two points',
              'Point pair needed',
              'Enter both points before evaluating the midpoint.',
            )}
          </div>
        ) : geometryScreen === 'slope' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Slope</strong>
                <span className="equation-badge">Two points</span>
              </div>
              <div className="geometry-point-grid">
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P1</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      ref={slopeP1XRef}
                      value={slopeState.p1.x}
                      onValueChange={(x) =>
                        setSlopeState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={slopeState.p1.y}
                      onValueChange={(y) =>
                        setSlopeState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, y },
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P2</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      value={slopeState.p2.x}
                      onValueChange={(x) =>
                        setSlopeState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={slopeState.p2.y}
                      onValueChange={(y) =>
                        setSlopeState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, y },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Slope Request',
              'Slope from two points, with undefined handled for vertical lines',
              'Point pair needed',
              'Enter both points before evaluating the slope.',
            )}
          </div>
        ) : geometryScreen === 'lineEquation' ? (
          <div className="grid-two">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>Line Equation</strong>
                <span className="equation-badge">Two distinct points</span>
              </div>
              <div className="geometry-point-grid">
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P1</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      ref={lineEquationP1XRef}
                      value={lineEquationState.p1.x}
                      onValueChange={(x) =>
                        setLineEquationState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={lineEquationState.p1.y}
                      onValueChange={(y) =>
                        setLineEquationState((currentState) => ({
                          ...currentState,
                          p1: { ...currentState.p1, y },
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="geometry-point-card">
                  <div className="card-title-row">
                    <strong>P2</strong>
                    <span className="equation-badge">x, y</span>
                  </div>
                  <label className="range-field">
                    <span>x</span>
                    <SignedNumberDraftInput
                      value={lineEquationState.p2.x}
                      onValueChange={(x) =>
                        setLineEquationState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, x },
                        }))
                      }
                    />
                  </label>
                  <label className="range-field">
                    <span>y</span>
                    <SignedNumberDraftInput
                      value={lineEquationState.p2.y}
                      onValueChange={(y) =>
                        setLineEquationState((currentState) => ({
                          ...currentState,
                          p2: { ...currentState.p2, y },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="guide-chip-row">
                {(Object.entries(GEOMETRY_LINE_FORM_LABELS) as Array<[LineEquationState['form'], string]>).map(([form, label]) => (
                  <button
                    key={form}
                    className={`guide-chip ${lineEquationState.form === form ? 'is-active' : ''}`}
                    onClick={() =>
                      setLineEquationState((currentState) => ({ ...currentState, form }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {renderGeometryPreviewCard(
              'Line Request',
              'Slope-intercept, point-slope, or standard form from two points',
              'Point pair needed',
              'Enter two distinct points and choose the target form before evaluating.',
            )}
          </div>
        ) : null}
      </section>
    );
  }

  function renderActiveSideSurface(presentation: SideSurfacePresentation) {
    if (sideSurface === 'settings') {
      return (
        <SettingsPanel
          presentation={presentation}
          settings={settings}
          onClose={closeSettingsPanel}
          onPatch={patchSettings}
        />
      );
    }

    if (sideSurface === 'history') {
      return (
        <HistoryPanel
          presentation={presentation}
          history={history}
          modeLabels={MODE_LABELS}
          onClear={() => {
            setHistory([]);
            void clearHistoryEntries();
          }}
          onClose={closeHistoryPanel}
          onReplay={replayHistoryEntry}
        />
      );
    }

    return null;
  }

  return (
    <MathNotationProvider
      notationMode={settings.mathNotationDisplay}
      displayPrefs={symbolicDisplayPrefs}
    >
      <div className="app-shell">
      <div
        className="app-stage"
        data-testid="app-stage"
        data-side-surface={
          sideSurface === 'none' ? undefined : sideSurface
        }
        data-side-surface-presentation={
          sideSurface === 'none' ? 'none' : sideSurfacePresentation
        }
        ref={appStageRef}
      >
      <div
        className={`calculator-shell${settings.highContrast ? ' is-high-contrast' : ''}`}
        data-testid="calculator-shell"
        ref={calculatorShellRef}
        style={calculatorShellStyle}
      >
        <header className="mode-strip">
          {showModeTabs ? (
            <div className="mode-tabs">
              {(['calculate', 'equation', 'matrix', 'vector', 'table', 'guide', 'advancedCalculus', 'trigonometry', 'statistics', 'geometry'] as ModeId[]).map((mode) => (
                <button
                  key={mode}
                  className={mode === currentMode ? 'is-active' : ''}
                  onClick={() => {
                    if (mode === 'guide') {
                      setGuideRoute({ screen: 'home' });
                    }
                    if (mode === 'advancedCalculus') {
                      openAdvancedCalcScreen('home');
                    }
                    if (mode === 'trigonometry') {
                      openTrigScreen('home');
                    }
                    if (mode === 'statistics') {
                      openStatisticsScreen('home');
                    }
                    if (mode === 'geometry') {
                      openGeometryScreen('home');
                    }
                    setMode(mode);
                  }}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          ) : (
            <div className="mode-strip-spacer" />
          )}
          <div className="mode-strip-utility">
            <button
              className={currentMode === 'guide' ? 'is-active' : ''}
              aria-pressed={currentMode === 'guide'}
              data-testid="guide-toggle"
              title="Guide (Ctrl+G)"
              onClick={openGuideHome}
            >
              Guide
            </button>
            <button
              className={settingsOpen ? 'is-active' : ''}
              aria-pressed={settingsOpen}
              data-testid="settings-toggle"
              title="Settings (Ctrl+,)"
              onClick={toggleSettingsPanel}
            >
              Settings
            </button>
          </div>
          <div className="status-pills">
            <button
              data-testid="quick-setting-angle-unit"
              onClick={() => patchSettings({ angleUnit: cycleAngleUnit(settings.angleUnit) })}
            >
              {settings.angleUnit.toUpperCase()}
            </button>
            <button
              data-testid="quick-setting-output-style"
              onClick={() =>
                patchSettings({
                  outputStyle:
                    settings.outputStyle === 'both'
                      ? 'exact'
                      : settings.outputStyle === 'exact'
                        ? 'decimal'
                        : 'both',
                })
              }
            >
              {settings.outputStyle.toUpperCase()}
            </button>
            <button
              className={settings.autoSwitchToEquation ? 'is-active' : ''}
              aria-pressed={settings.autoSwitchToEquation}
              data-testid="quick-setting-auto-equation"
              onClick={() =>
                patchSettings({
                  autoSwitchToEquation: !settings.autoSwitchToEquation,
                })
              }
            >
              {settings.autoSwitchToEquation ? 'Auto Eq On' : 'Auto Eq Off'}
            </button>
            <button
              data-testid="history-toggle"
              onClick={toggleHistoryPanel}
              disabled={isLauncherOpen || currentMode === 'guide'}
            >
              {historyOpen ? 'Hide Hist' : 'Show Hist'}
            </button>
            <span>{runtimeLabel}</span>
          </div>
        </header>

        <section className="display-panel">
          <div className="display-header">
            <span>{displayHeaderLabel}</span>
            <span data-testid="display-status">
              {clipboardNotice ?? (isPending ? 'Computing...' : hydrated ? 'Ready' : 'Loading...')}
            </span>
          </div>
          <div className="display-editor">
            {!isLauncherOpen && currentMode === 'calculate' && calculateScreen !== 'standard' && calculateRouteMeta ? (
              <div className="equation-route">
                <div className="equation-breadcrumbs">
                  {calculateRouteMeta.breadcrumb.map((segment) => (
                    <span key={`calculate-${calculateScreen}-${segment}`} className="equation-breadcrumb">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="equation-route-copy">
                  <strong>{calculateRouteMeta.label}</strong>
                  <span className="equation-badge">Calculus</span>
                </div>
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'equation' && equationRouteMeta ? (
              <div className="equation-route">
                <div className="equation-breadcrumbs">
                  {equationRouteMeta.breadcrumb.map((segment) => (
                    <span key={segment} className="equation-breadcrumb">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="equation-route-copy">
                  <strong>{equationRouteMeta.label}</strong>
                  {equationRouteMeta.badge ? (
                    <span className="equation-badge">{equationRouteMeta.badge}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'advancedCalculus' && advancedCalcRouteMeta ? (
              <div className="equation-route">
                <div className="equation-breadcrumbs">
                  {advancedCalcRouteMeta.breadcrumb.map((segment) => (
                    <span key={`advanced-${advancedCalcScreen}-${segment}`} className="equation-breadcrumb">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="equation-route-copy">
                  <strong>{advancedCalcRouteMeta.label}</strong>
                  <span className="equation-badge">Advanced Calc</span>
                </div>
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'statistics' && statisticsRouteMeta ? (
              <div className="equation-route">
                <div className="equation-breadcrumbs">
                  {statisticsRouteMeta.breadcrumb.map((segment) => (
                    <span key={`statistics-${statisticsScreen}-${segment}`} className="equation-breadcrumb">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="equation-route-copy">
                  <strong>{statisticsRouteMeta.label}</strong>
                  <span className="equation-badge">Statistics</span>
                </div>
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'guide' && guideRouteMeta ? (
              <div className="guide-display">
                <div className="guide-breadcrumbs">
                  {guideRouteMeta.breadcrumb.map((segment) => (
                    <span key={`${guideRoute.screen}-${segment}`} className="guide-breadcrumb">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="guide-display-copy">
                  <strong>
                    {guideRoute.screen === 'article'
                      ? (guideArticle?.title ?? guideRouteMeta.title)
                      : guideRoute.screen === 'modeGuide' && guideModeRef
                        ? guideModeRef.title
                        : (selectedGuideListEntry?.title ?? guideRouteMeta.title)}
                  </strong>
                </div>
                <p className="guide-display-summary">
                  {guideRoute.screen === 'article'
                    ? (guideArticle?.summary ?? guideRouteMeta.description)
                    : guideRoute.screen === 'modeGuide' && guideModeRef
                      ? guideModeRef.summary
                      : (selectedGuideListEntry?.description ?? guideRouteMeta.description)}
                </p>
              </div>
            ) : null}
            {isLauncherOpen ? (
              <div className="launcher-display">
                <span className="launcher-display-index">
                  {launcherState.level === 'root'
                    ? selectedLauncherCategory?.hotkey ?? ''
                    : selectedLauncherApp?.hotkey ?? ''}
                </span>
                <div className="launcher-display-copy">
                  <strong className="launcher-display-label">
                    {launcherState.level === 'root'
                      ? (selectedLauncherCategory?.label ?? 'Menu')
                      : (selectedLauncherApp?.label ?? 'Menu')}
                  </strong>
                  <small className="launcher-display-breadcrumb">
                    {launcherState.level === 'root'
                      ? 'Menu'
                      : `Menu > ${activeLauncherCategory?.label ?? ''}`}
                  </small>
                </div>
              </div>
            ) : null}
            {isEquationMenuOpen ? (
              <div className="launcher-display equation-display-choice">
                <span className="launcher-display-index">{selectedEquationMenuEntry?.hotkey ?? ''}</span>
                <strong className="launcher-display-label">{selectedEquationMenuEntry?.label ?? 'Equation'}</strong>
              </div>
            ) : null}
            {isAdvancedCalcMenuOpen ? (
              <div className="launcher-display equation-display-choice">
                <span className="launcher-display-index">{selectedAdvancedCalcMenuEntry?.hotkey ?? ''}</span>
                <strong className="launcher-display-label">{selectedAdvancedCalcMenuEntry?.label ?? 'Advanced Calc'}</strong>
              </div>
            ) : null}
            {isTrigMenuOpen ? (
              <div className="launcher-display equation-display-choice">
                <span className="launcher-display-index">{selectedTrigMenuEntry?.hotkey ?? ''}</span>
                <strong className="launcher-display-label">{selectedTrigMenuEntry?.label ?? 'Trigonometry'}</strong>
              </div>
            ) : null}
            {isStatisticsMenuOpen ? (
              <div className="launcher-display equation-display-choice">
                <span className="launcher-display-index">{selectedStatisticsMenuEntry?.hotkey ?? ''}</span>
                <strong className="launcher-display-label">{selectedStatisticsMenuEntry?.label ?? 'Statistics'}</strong>
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'statistics' ? (
              <div className="statistics-display-shell">
                <div className="statistics-display-status">
                  <span className="equation-badge statistics-core-badge">Statistics core</span>
                  <small>
                    Statistics requests stay in Statistics.
                  </small>
                </div>
                <MathEditor
                  ref={statisticsDraftFieldRef}
                  dataTestId="main-editor"
                  className="main-mathfield statistics-main-mathfield"
                  value={statisticsDraftLatex}
                  modeId="statistics"
                  screenHint={statisticsScreen}
                  onChange={(latex) => updateStatisticsDraft(latex, 'manual', true)}
                  keyboardLayouts={statisticsKeyboardLayouts}
                  onFocus={(field) => {
                    activeFieldRef.current = field;
                  }}
                  readOnly={false}
                  placeholder="\\text{Type dataset(...), descriptive(...), binomial(...), regression(...), or use a guided Statistics tool}"
                />
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'trigonometry' ? (
              <div className="trig-display-shell">
                <div className="trig-display-status">
                  <span className="equation-badge trig-core-badge">Trigonometry core</span>
                  <small>
                    Trig requests stay in Trigonometry.
                  </small>
                </div>
                <MathEditor
                  ref={trigDraftFieldRef}
                  dataTestId="main-editor"
                  className="main-mathfield trig-main-mathfield"
                  value={trigDraftLatex}
                  modeId="trigonometry"
                  screenHint={trigScreen}
                  onChange={(latex) => updateTrigDraft(latex, 'manual', true)}
                  keyboardLayouts={trigonometryKeyboardLayouts}
                  onFocus={(field) => {
                    activeFieldRef.current = field;
                  }}
                  readOnly={false}
                  placeholder="\\text{Type sin(30), identityConvert(...), rightTriangle(...), or use a guided trig tool}"
                />
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'geometry' ? (
              <div className="geometry-display-shell">
                <div className="geometry-display-status">
                  <span className="equation-badge geometry-core-badge">Geometry core</span>
                  <small>
                    Structured requests stay in Geometry.
                  </small>
                </div>
                <MathEditor
                  ref={geometryDraftFieldRef}
                  dataTestId="main-editor"
                  className="main-mathfield geometry-main-mathfield"
                  value={geometryDraftLatex}
                  modeId="geometry"
                  screenHint={geometryScreen}
                  onChange={(latex) => updateGeometryDraft(latex, 'manual', true)}
                  keyboardLayouts={geometryKeyboardLayouts}
                  onFocus={(field) => {
                    activeFieldRef.current = field;
                  }}
                  readOnly={false}
                  placeholder="\\text{Type square(side=4) or use a guided Geometry tool}"
                />
              </div>
            ) : null}
            {!isLauncherOpen && currentMode === 'calculate' ? (
              <MathEditor
                ref={mainFieldRef}
                dataTestId="main-editor"
                className="main-mathfield"
                value={calculateLatex}
                modeId="calculate"
                screenHint={calculateScreen}
                onChange={setCalculateLatex}
                keyboardLayouts={calculateKeyboardLayouts}
                onFocus={(field) => {
                  activeFieldRef.current = field;
                }}
                placeholder="\\text{Enter an expression}"
              />
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && currentMode === 'equation' && equationScreen === 'symbolic' ? (
              <MathEditor
                ref={mainFieldRef}
                dataTestId="main-editor"
                className="main-mathfield"
                value={equationLatex}
                modeId="equation"
                screenHint={equationScreen}
                onChange={setEquationLatex}
                keyboardLayouts={equationKeyboardLayouts}
                onFocus={(field) => {
                  activeFieldRef.current = field;
                }}
                placeholder="\\text{Enter an equation in }x"
              />
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && (currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table' || currentMode === 'advancedCalculus' || currentMode === 'statistics' || (currentMode === 'equation' && equationScreen !== 'symbolic')) ? (
              <div className="display-standby">
                <MathStatic className="standby-math" latex={displayMathLatex ?? deferredDisplayLatex} emptyLabel="Structured results stay here." />
              </div>
            ) : null}
          </div>
          <div className="display-preview">
            {isLauncherOpen ? (
              <div className="launcher-preview-copy">
                {launcherState.level === 'root'
                  ? selectedLauncherCategory?.description ?? ''
                  : selectedLauncherApp?.description ?? ''}
              </div>
            ) : isEquationMenuOpen ? (
              <div className="equation-preview-copy">
                <strong>{equationRouteMeta?.shortLabel ?? selectedEquationMenuEntry?.label ?? ''}</strong>
                <span>{selectedEquationMenuEntry?.description ?? ''}</span>
                <small>{equationRouteMeta?.helpText}</small>
              </div>
            ) : isAdvancedCalcMenuOpen ? (
              <div className="equation-preview-copy">
                <strong>{advancedCalcRouteMeta?.label ?? selectedAdvancedCalcMenuEntry?.label ?? ''}</strong>
                <span>{selectedAdvancedCalcMenuEntry?.description ?? advancedCalcRouteMeta?.description ?? ''}</span>
                <small>{advancedCalcRouteMeta?.helpText}</small>
              </div>
            ) : isTrigMenuOpen ? (
              <div className="equation-preview-copy">
                <strong>{trigRouteMeta?.label ?? selectedTrigMenuEntry?.label ?? ''}</strong>
                <span>{selectedTrigMenuEntry?.description ?? trigRouteMeta?.description ?? ''}</span>
                <small>{trigRouteMeta?.helpText}</small>
              </div>
            ) : isStatisticsMenuOpen ? (
              <div className="equation-preview-copy">
                <strong>{statisticsRouteMeta?.label ?? selectedStatisticsMenuEntry?.label ?? ''}</strong>
                <span>{selectedStatisticsMenuEntry?.description ?? statisticsRouteMeta?.description ?? ''}</span>
                <small>{statisticsRouteMeta?.helpText}</small>
              </div>
            ) : isGeometryMenuOpen ? (
              <div className="equation-preview-copy">
                <strong>{geometryRouteMeta?.label ?? selectedGeometryMenuEntry?.label ?? ''}</strong>
                <span>{selectedGeometryMenuEntry?.description ?? geometryRouteMeta?.description ?? ''}</span>
                <small>{geometryRouteMeta?.helpText}</small>
              </div>
            ) : currentMode === 'guide' && guideRouteMeta ? (
              <div className="guide-preview-copy">
                {(guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup') ? (
                  <label className="guide-search-row">
                    <span>Search</span>
                    <input
                      ref={guideSearchInputRef}
                      className="guide-search-input"
                      value={guideSearchQuery}
                      onChange={(event) => setGuideQuery(event.target.value)}
                      placeholder={guideRoute.screen === 'symbolLookup' ? 'sum, sigma, integral...' : 'Search topics, symbols, modes...'}
                    />
                  </label>
                ) : null}
                {guideRoute.screen === 'article' ? (
                  <>
                    <strong>{selectedGuideExample?.title ?? 'Worked examples'}</strong>
                    <span>{selectedGuideExample?.explanation ?? 'Read the article and use Open in Tool to load an example.'}</span>
                  </>
                ) : guideRoute.screen === 'modeGuide' && guideModeRef ? (
                  <>
                    <strong>{guideModeRef.title}</strong>
                    <span>{guideModeRef.summary}</span>
                  </>
                ) : (
                  <>
                    <strong>{selectedGuideListEntry?.title ?? guideRouteMeta.title}</strong>
                    <span>{selectedGuideListEntry?.description ?? guideRouteMeta.description}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="display-card-content">
                <div className="display-card-actions">
                  <button onClick={() => void copyText(activeExpressionLatex(), 'Expression copied')}>
                    Copy Expr
                  </button>
                  {currentMode === 'geometry' || currentMode === 'trigonometry' ? (
                    <>
                      <button onClick={editActiveExpression}>
                        Focus Editor
                      </button>
                      <button onClick={() => void pasteIntoEditor()}>
                        Paste
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={editActiveExpression}>
                        Edit Expr
                      </button>
                      <button onClick={() => void pasteIntoEditor()}>
                        Paste
                      </button>
                    </>
                  )}
                </div>
                <MathStatic className="preview-math" latex={deferredDisplayLatex} emptyLabel="Textbook preview" />
              </div>
            )}
          </div>
          <div className="display-result" data-testid="display-outcome-root">
            <div className="result-title-row">
              <div className="result-title">
                {isLauncherOpen
                  ? launcherState.level === 'root'
                    ? 'Menu'
                    : `Menu > ${activeLauncherCategory?.label ?? ''}`
                  : currentMode === 'guide' && guideRouteMeta
                    ? guideRouteMeta.title
                  : currentMode === 'statistics' && statisticsRouteMeta
                    ? statisticsRouteMeta.label
                  : currentMode === 'advancedCalculus' && advancedCalcRouteMeta
                    ? advancedCalcRouteMeta.label
                  : currentMode === 'trigonometry' && trigRouteMeta
                    ? displayOutcome?.title ?? trigRouteMeta.label
                  : currentMode === 'geometry' && geometryRouteMeta
                    ? displayOutcome?.title ?? geometryRouteMeta.label
                  : currentMode === 'calculate' && calculateScreen !== 'standard' && calculateRouteMeta
                    ? calculateRouteMeta.label
                  : currentMode === 'equation' && equationResultTitle
                    ? equationResultTitle
                    : displayOutcome?.title ?? 'Result'}
              </div>
              {displayResultBadges.length > 0 ? (
                <div className="result-badges">
                  {displayResultBadges.map((badge) => (
                    <span key={badge.label} className={badge.className}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {isLauncherOpen ? (
              <div className="result-approx">
                {launcherState.level === 'root'
                  ? 'Use EXE/F1 or keys 1-5 to open a category.'
                  : 'Use EXE/F1 or the shown digit hotkeys to open an app.'}
              </div>
            ) : currentMode === 'guide' && guideRouteMeta ? (
              <>
                {guideRoute.screen === 'article' && selectedGuideExample ? (
                  <>
                    <div className="result-approx">{selectedGuideExample.expected}</div>
                    <div className="display-card-actions">
                      <button onClick={() => launchGuideExample(selectedGuideExample)}>
                        Open in Tool
                      </button>
                      <button onClick={() => void copyText(copyableGuideExampleLatex(selectedGuideExample), 'Example copied')}>
                        Copy Expr
                      </button>
                    </div>
                  </>
                ) : guideRoute.screen === 'modeGuide' && guideModeRef ? (
                  <div className="warning-stack">
                    {guideModeRef.bestFor.map((item) => (
                      <div key={item} className="result-approx">{item}</div>
                    ))}
                  </div>
                ) : (
                  <div className="result-approx">{guideRouteMeta.description}</div>
                )}
              </>
            ) : isEquationMenuOpen ? (
              <div className="result-approx">{equationMenuFooterText}</div>
            ) : isAdvancedCalcMenuOpen ? (
              <div className="result-approx">{advancedCalcMenuFooterText}</div>
            ) : isTrigMenuOpen ? (
              <div className="result-approx">{trigMenuFooterText}</div>
            ) : isStatisticsMenuOpen ? (
              <div className="result-approx">{statisticsMenuFooterText}</div>
            ) : isGeometryMenuOpen && !displayOutcome ? (
              <div className="result-approx">{geometryMenuFooterText}</div>
            ) : null}
            {isEquationWorkScreen && !displayOutcome ? (
              <div className="result-approx">{equationRouteMeta?.helpText}</div>
            ) : null}
            {currentMode === 'calculate' && calculateScreen !== 'standard' && !displayOutcome ? (
              <div className="result-approx">{calculateRouteMeta?.helpText}</div>
            ) : null}
            {currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && !displayOutcome ? (
              <div className="result-approx">{advancedCalcRouteMeta?.helpText}</div>
            ) : null}
            {currentMode === 'trigonometry' && !isTrigMenuOpen && !displayOutcome ? (
              <div className="result-approx">{trigRouteMeta?.helpText}</div>
            ) : null}
            {currentMode === 'statistics' && !isStatisticsMenuOpen && !displayOutcome ? (
              <div className="result-approx">{statisticsRouteMeta?.helpText}</div>
            ) : null}
            {currentMode === 'geometry' && !isGeometryMenuOpen && !displayOutcome ? (
              <div className="result-approx">{geometryRouteMeta?.helpText}</div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.resolvedInputLatex
            && displayOutcome.resolvedInputLatex.trim() !== activeExpressionLatex().trim() ? (
              <>
                <div className="result-approx">Resolved form</div>
                <MathStatic
                  className="preview-math resolved-preview-math"
                  latex={displayOutcome.resolvedInputLatex}
                />
              </>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.transformSummaryText ? (
                <div className="result-summary-block">
                  <div className="result-summary-label">Transform</div>
                  <NotationText
                    className="result-approx result-summary-text"
                    text={displayOutcome.transformSummaryText}
                  />
                  {displayOutcome.transformSummaryLatex ? (
                    <MathStatic
                      className="preview-math result-summary-math"
                      displayPrefs={symbolicDisplayPrefs}
                      latex={displayOutcome.transformSummaryLatex}
                      block={false}
                    />
                  ) : null}
                </div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (shouldShowCalculateAlgebraTray || shouldShowEquationAlgebraTray) ? (
              <div className="result-summary-block algebra-transform-tray" data-testid="algebra-transform-tray">
                <div className="result-summary-label">Algebra</div>
                {activeAlgebraTransforms.length > 0 ? (
                  <div className="algebra-transform-grid" data-testid="algebra-transform-actions">
                    {activeAlgebraTransforms.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="workspace-action-button"
                        data-testid={`algebra-transform-${action}`}
                        onClick={() =>
                          currentMode === 'calculate'
                            ? runCalculateAlgebraTransformAction(action)
                            : runEquationAlgebraTransformAction(action)}
                      >
                        {getAlgebraTransformLabel(action)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <NotationText
                    className="result-detail-line result-summary-text"
                    data-testid="algebra-transform-empty"
                    text="No explicit algebra transform is available for this input yet."
                  />
                )}
              </div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.solveSummaryText ? (
              <div className="result-summary-block" data-testid="display-outcome-solve-summary">
                <div className="result-summary-label">Solve note</div>
                <NotationText
                  className="result-approx result-summary-text"
                  text={displayOutcome.solveSummaryText}
                />
              </div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.numericMethod ? (
              <NotationText
                className="result-approx"
                text={`Numeric method: ${displayOutcome.numericMethod}`}
              />
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') ? (
              <div className="display-card-actions" data-testid="display-outcome-actions">
                <button
                  data-testid="display-outcome-action-copy-result"
                  onClick={() => void copyText(activeResultCopyText(), 'Result copied')}
                >
                  Copy Result
                </button>
                {currentMode === 'calculate' && calculateScreen === 'standard' ? (
                  <button
                    data-testid="display-outcome-action-run-numeric"
                    onClick={() => runCalculateAction('evaluate')}
                  >
                    Run Numeric
                  </button>
                ) : null}
                {displayOutcome.actions && displayOutcome.actions.length > 0
                  ? displayOutcome.actions.map((action) => (
                    <button
                      key={`${action.kind}-${'target' in action ? action.target : action.mode}-${action.latex}`}
                      data-testid={
                        action.kind === 'send'
                          ? `display-outcome-action-send-${action.target}`
                          : `display-outcome-action-load-${action.mode}`
                      }
                      onClick={() => triggerDisplayOutcomeAction(action)}
                    >
                      {action.kind === 'send'
                        ? action.target === 'equation'
                          ? 'Send to Equation'
                          : 'Send to Calc'
                        : action.mode === 'geometry'
                          ? 'Use in Geometry'
                          : action.mode === 'statistics'
                            ? 'Use in Statistics'
                            : 'Use in Trigonometry'}
                    </button>
                  ))
                  : currentMode === 'trigonometry'
                    ? null
                    : activeResultEditorLatex()
                      ? (
                        <button
                          data-testid="display-outcome-action-to-editor"
                          onClick={() => loadLatexIntoEditor(activeResultEditorLatex())}
                        >
                          To Editor
                        </button>
                      )
                      : null}
              </div>
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && displayOutcome?.kind === 'success' ? (
              <div data-testid="display-outcome-success">
                {displayOutcome.exactLatex ? (
                  <div data-testid="display-outcome-exact">
                    <MathStatic
                      className="result-math"
                      latex={displayOutcome.exactLatex}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ) : null}
                {displayOutcome.exactSupplementLatex?.map((line, index) => (
                  <div key={line} data-testid={`display-outcome-supplement-${index}`}>
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={line}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ))}
                {settings.outputStyle !== 'exact' && displayOutcome.approxText ? (
                  <NotationText
                    className="result-approx"
                    data-testid="display-outcome-approx"
                    text={displayOutcome.approxText}
                  />
                ) : null}
              </div>
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && displayOutcome?.kind === 'prompt' ? (
              <div className="result-prompt">
                <div className="result-prompt-message">{displayOutcome.message}</div>
                <button className="prompt-action" onClick={openPromptTarget}>Open Equation</button>
              </div>
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && displayOutcome?.kind === 'error' ? (
              <div data-testid="display-outcome-error">
                <NotationText
                  className="result-error"
                  data-testid="display-outcome-error-text"
                  text={displayOutcome.error}
                />
                {displayOutcome.exactLatex ? (
                  <div data-testid="display-outcome-exact">
                    <MathStatic
                      className="result-math"
                      latex={displayOutcome.exactLatex}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ) : null}
                {displayOutcome.exactSupplementLatex?.map((line, index) => (
                  <div key={line} data-testid={`display-outcome-supplement-${index}`}>
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={line}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ))}
                {settings.outputStyle !== 'exact' && displayOutcome.approxText ? (
                  <NotationText
                    className="result-approx"
                    data-testid="display-outcome-approx"
                    text={displayOutcome.approxText}
                  />
                ) : null}
              </div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.periodicFamily ? (
              <div className="result-detail-sections" data-testid="display-outcome-periodic-family">
                {displayOutcome.periodicFamily.representatives?.length ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-representatives">
                    <div className="result-summary-label">Representative Branches</div>
                    <div className="result-detail-lines">
                      {displayOutcome.periodicFamily.representatives.map((representative, index) => (
                        <div key={`${representative.label}-${index}`} className="result-detail-line">
                          <NotationText className="result-approx" text={representative.label} />
                          {representative.exactLatex ? (
                            <MathStatic
                              className="result-math result-math-supplement"
                              latex={representative.exactLatex}
                              displayPrefs={symbolicDisplayPrefs}
                            />
                          ) : null}
                          {representative.approxText ? (
                            <NotationText
                              className="result-detail-line result-summary-text"
                              text={representative.approxText}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.principalRangeLatex ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-principal-range">
                    <div className="result-summary-label">Principal Range</div>
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={displayOutcome.periodicFamily.principalRangeLatex}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.piecewiseBranches?.length ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-piecewise">
                    <div className="result-summary-label">Piecewise Exact Branches</div>
                    <div className="result-detail-lines">
                      {displayOutcome.periodicFamily.piecewiseBranches.map((branch, index) => (
                        <div key={`${branch.conditionLatex}-${branch.resultLatex}-${index}`} className="result-detail-line">
                          <MathStatic
                            className="result-math result-math-supplement"
                            latex={`\\text{if } ${branch.conditionLatex}`}
                            displayPrefs={symbolicDisplayPrefs}
                          />
                          <MathStatic
                            className="result-math result-math-supplement"
                            latex={branch.resultLatex}
                            displayPrefs={symbolicDisplayPrefs}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.discoveredFamilies?.length ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-discovered-families">
                    <div className="result-summary-label">Discovered Families</div>
                    <div className="result-detail-lines">
                      {displayOutcome.periodicFamily.discoveredFamilies.map((familyLatex, index) => (
                        <MathStatic
                          key={`${familyLatex}-${index}`}
                          className="result-math result-math-supplement"
                          latex={familyLatex}
                          displayPrefs={symbolicDisplayPrefs}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.reducedCarrierLatex ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-reduced-carrier">
                    <div className="result-summary-label">Reduced Carrier</div>
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={`\\text{Reduced carrier: } ${displayOutcome.periodicFamily.reducedCarrierLatex}`}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.structuredStopReason ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-stop-reason">
                    <div className="result-summary-label">Exact Closure Boundary</div>
                    <NotationText
                      className="result-detail-line result-summary-text"
                      text={getPeriodicStopReasonText(displayOutcome.periodicFamily.structuredStopReason)}
                    />
                  </div>
                ) : null}
                {displayOutcome.periodicFamily.suggestedIntervals?.length ? (
                  <div className="result-summary-block" data-testid="display-outcome-periodic-intervals">
                    <div className="result-summary-label">Suggested Intervals</div>
                    <div className="result-detail-lines">
                      {displayOutcome.periodicFamily.suggestedIntervals.map((suggestion) => (
                        <NotationText
                          key={`${suggestion.label}-${suggestion.start}-${suggestion.end}`}
                          className="result-detail-line result-summary-text"
                          text={`${suggestion.label}: [${suggestion.start}, ${suggestion.end}]`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!isLauncherOpen
            && !isEquationMenuOpen
            && !isAdvancedCalcMenuOpen
            && !isTrigMenuOpen
            && !isStatisticsMenuOpen
            && (!isGeometryMenuOpen || currentMode === 'geometry')
            && currentMode !== 'guide'
            && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
            && displayOutcome.detailSections?.length ? (
              <div className="result-detail-sections" data-testid="display-outcome-detail-sections">
                {displayOutcome.detailSections.map((section, sectionIndex) => (
                  <div key={section.title} className="result-summary-block" data-testid={`display-outcome-detail-section-${sectionIndex}`}>
                    <div className="result-summary-label">{section.title}</div>
                    <div className="result-detail-lines">
                      {section.lines.map((line, lineIndex) => (
                        <NotationText
                          key={`${section.title}-${line}`}
                          className="result-detail-line result-summary-text"
                          data-testid={`display-outcome-detail-line-${sectionIndex}-${lineIndex}`}
                          text={line}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && currentMode !== 'guide' && displayOutcome?.warnings.length ? (
              <div className="warning-stack">
                {displayOutcome.warnings.map((warning) => (
                  <NotationText key={warning} className="result-warning" text={warning} />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <nav className="soft-menu">
          {activeSoftMenu.map((action) => (
            <button key={action.id} data-testid={`soft-action-${action.id}`} onClick={() => handleSoftAction(action.id)}>
              <span>{action.hotkey}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </nav>

        <main className="workspace">
          <div className="mode-workspace">
            {isLauncherOpen ? (
              <section className="mode-panel launcher-panel">
                <div className="launcher-list">
                  {(launcherState.level === 'root'
                    ? launcherCategories
                    : (activeLauncherCategory?.entries ?? [])
                  ).map((entry, index) => (
                    <button
                      key={entry.id}
                      className={`launcher-entry ${
                        launcherState.level === 'root'
                          ? index === launcherState.rootSelectedIndex ? 'is-selected' : ''
                          : index === launcherState.categorySelectedIndex ? 'is-selected' : ''
                      }`}
                      onClick={() =>
                        launcherState.level === 'root'
                          ? openLauncherCategoryById(entry.id as LauncherCategory['id'], activeLauncherLeafId)
                          : launchLauncherApp(entry as LauncherAppEntry)
                      }
                      onMouseEnter={() =>
                        setLauncherState((currentLauncherState) => ({
                          ...currentLauncherState,
                          ...(launcherState.level === 'root'
                            ? { rootSelectedIndex: index }
                            : { categorySelectedIndex: index }),
                        }))
                      }
                    >
                      <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                      <span className="launcher-entry-content">
                        <strong>{entry.label}</strong>
                        <small>{entry.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'calculate' ? (
              calculateScreen === 'standard' ? (
                <section className="mode-panel">
                  <h2>Natural Textbook Input</h2>
                  <p>Use the keypad, physical keyboard, or the curated `Core`, `Algebra`, `Relations`, `Letters`, `Greek`, `Discrete`, `Combinatorics`, `Calculus`, and `Functions` keyboard pages for symbolic entry.</p>
                  <p className="equation-hint">Active CAS milestone: {ACTIVE_MILESTONE_TITLE}</p>
                  <div className="guide-related-links">
                    <button className="guide-chip" onClick={() => openCalculateScreen('calculusHome')}>Calculus Page</button>
                    <button className="guide-chip" onClick={() => openGuideArticle('basics-keyboard')}>Guide: Basics</button>
                    <button className="guide-chip" onClick={() => openGuideArticle('algebra-manipulation')}>Guide: Algebra</button>
                    <button className="guide-chip" onClick={() => openGuideArticle('discrete-operators')}>Guide: Discrete</button>
                    <button className="guide-chip" onClick={() => openGuideArticle('calculus-derivatives')}>Guide: Calculus</button>
                    <button className="guide-chip" onClick={() => openGuideMode('calculate')}>When to use Calculate</button>
                  </div>
                </section>
              ) : (
                <section className={`mode-panel ${isCalculateMenuOpen ? 'core-calculus-menu-panel' : 'core-calculus-panel'}`}>
                  {calculateRouteMeta ? (
                    <div className="equation-panel-header">
                      <div className="equation-panel-copy">
                        <div className="equation-breadcrumbs">
                          {calculateRouteMeta.breadcrumb.map((segment) => (
                            <span key={`${calculateScreen}-${segment}`} className="equation-breadcrumb">
                              {segment}
                            </span>
                          ))}
                        </div>
                        <div className="card-title-row">
                          <strong>{calculateRouteMeta.label}</strong>
                          <span className="equation-badge">Core Calculus</span>
                        </div>
                        <p className="equation-hint">{calculateRouteMeta.description}</p>
                        <div className="guide-related-links">
                          {calculateGuideArticleId ? (
                            <button className="guide-chip" onClick={() => openGuideArticle(calculateGuideArticleId)}>
                              Guide: This tool
                            </button>
                          ) : null}
                          {calculateAdvancedGuideArticleId ? (
                            <button className="guide-chip" onClick={() => openGuideArticle(calculateAdvancedGuideArticleId)}>
                              Guide: Advanced version
                            </button>
                          ) : null}
                          <button className="guide-chip" onClick={() => openGuideMode('calculate')}>When to use Calculate</button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {isCalculateMenuOpen ? (
                    <>
                      <div
                        ref={calculateMenuPanelRef}
                        className="launcher-list equation-menu-list core-calculus-menu-list"
                        tabIndex={-1}
                      >
                        {calculateMenuEntries.map((entry, index) => (
                          <button
                            key={entry.id}
                            className={`launcher-entry equation-menu-entry core-calculus-menu-entry ${index === calculateMenuSelection ? 'is-selected' : ''}`}
                            onClick={() => openCalculateScreen(entry.target)}
                            onMouseEnter={() => setCalculateMenuSelection(index)}
                          >
                            <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                            <span className="launcher-entry-content">
                              <strong>{entry.label}</strong>
                              <small>{entry.description}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="equation-menu-help core-calculus-menu-footer">
                        <span>{calculateMenuFooterText}</span>
                      </div>
                    </>
                  ) : calculateScreen === 'derivative' ? (
                    <div className="grid-two">
                      <div className="editor-card">
                        <div className="card-title-row">
                          <strong>Derivative Body</strong>
                          <span className="equation-badge">Symbolic</span>
                        </div>
                        <MathEditor
                          ref={derivativeFieldRef}
                          className="secondary-mathfield"
                          value={derivativeWorkbench.bodyLatex}
                          modeId="calculate"
                          screenHint={calculateScreen}
                          onChange={(bodyLatex) =>
                            setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex }))
                          }
                          keyboardLayouts={calculateKeyboardLayouts}
                          onFocus={(field) => {
                            activeFieldRef.current = field;
                          }}
                          placeholder="x^3+2x"
                        />
                      </div>
                      <GeneratedPreviewCard
                        title={calculateRouteMeta?.previewTitle ?? 'Generated Expression'}
                        subtitle={calculateRouteMeta?.previewSubtitle ?? 'Derivative in x'}
                        latex={calculateWorkbenchExpression.latex}
                        emptyTitle={calculateRouteMeta?.emptyStateTitle ?? 'Derivative body needed'}
                        emptyDescription={calculateRouteMeta?.emptyStateDescription ?? 'Enter an expression in x to generate the derivative form.'}
                        onToEditor={() => loadLatexIntoEditor(calculateWorkbenchExpression.latex)}
                        onCopyExpr={copyCalculateWorkbenchExpression}
                      />
                    </div>
                  ) : calculateScreen === 'derivativePoint' ? (
                    <div className="grid-two">
                      <div className="editor-card">
                        <div className="card-title-row">
                          <strong>Derivative at Point</strong>
                          <span className="equation-badge">Numeric point</span>
                        </div>
                        <MathEditor
                          ref={derivativePointFieldRef}
                          className="secondary-mathfield"
                          value={derivativePointWorkbench.bodyLatex}
                          modeId="calculate"
                          screenHint={calculateScreen}
                          onChange={(bodyLatex) =>
                            setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex }))
                          }
                          keyboardLayouts={calculateKeyboardLayouts}
                          onFocus={(field) => {
                            activeFieldRef.current = field;
                          }}
                          placeholder="x^2"
                        />
                        <label className="range-field">
                          <span>Point x =</span>
                          <SignedNumberDraftInput
                            ref={derivativePointValueRef}
                            value={derivativePointWorkbench.point}
                            onValueChange={(point) =>
                              setDerivativePointWorkbench((currentState) => ({
                                ...currentState,
                                point,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <GeneratedPreviewCard
                        title={calculateRouteMeta?.previewTitle ?? 'Generated Expression'}
                        subtitle={calculateRouteMeta?.previewSubtitle ?? 'Derivative at a numeric point'}
                        latex={calculateWorkbenchExpression.latex}
                        emptyTitle={calculateRouteMeta?.emptyStateTitle ?? 'Body and point needed'}
                        emptyDescription={calculateRouteMeta?.emptyStateDescription ?? 'Enter an expression and point value to build the derivative-at-point form.'}
                        onToEditor={() => loadLatexIntoEditor(calculateWorkbenchExpression.latex)}
                        onCopyExpr={copyCalculateWorkbenchExpression}
                      />
                    </div>
                  ) : calculateScreen === 'integral' ? (
                    <div className="grid-two">
                      <div className="editor-card">
                        <div className="card-title-row">
                          <strong>Integral Workbench</strong>
                          <span className="equation-badge">
                            {integralWorkbench.kind === 'indefinite' ? 'Symbolic' : 'Definite'}
                          </span>
                        </div>
                        <div className="guide-chip-row">
                          <button
                            className={`guide-chip ${integralWorkbench.kind === 'indefinite' ? 'is-active' : ''}`}
                            onClick={() =>
                              setIntegralWorkbench((currentState) => ({ ...currentState, kind: 'indefinite' }))
                            }
                          >
                            Indefinite
                          </button>
                          <button
                            className={`guide-chip ${integralWorkbench.kind === 'definite' ? 'is-active' : ''}`}
                            onClick={() =>
                              setIntegralWorkbench((currentState) => ({ ...currentState, kind: 'definite' }))
                            }
                          >
                            Definite
                          </button>
                        </div>
                        <MathEditor
                          ref={integralFieldRef}
                          className="secondary-mathfield"
                          value={integralWorkbench.bodyLatex}
                          modeId="calculate"
                          screenHint={calculateScreen}
                          onChange={(bodyLatex) =>
                            setIntegralWorkbench((currentState) => ({ ...currentState, bodyLatex }))
                          }
                          keyboardLayouts={calculateKeyboardLayouts}
                          onFocus={(field) => {
                            activeFieldRef.current = field;
                          }}
                          placeholder="x^2"
                        />
                        {integralWorkbench.kind === 'definite' ? (
                          <div className="range-row">
                            <label className="range-field">
                              <span>Lower</span>
                              <SignedNumberDraftInput
                                ref={integralLowerRef}
                                value={integralWorkbench.lower}
                                onValueChange={(lower) =>
                                  setIntegralWorkbench((currentState) => ({
                                    ...currentState,
                                    lower,
                                  }))
                                }
                              />
                            </label>
                            <label className="range-field">
                              <span>Upper</span>
                              <SignedNumberDraftInput
                                value={integralWorkbench.upper}
                                onValueChange={(upper) =>
                                  setIntegralWorkbench((currentState) => ({
                                    ...currentState,
                                    upper,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <GeneratedPreviewCard
                        title={calculateRouteMeta?.previewTitle ?? 'Generated Expression'}
                        subtitle={calculateRouteMeta?.previewSubtitle ?? (integralWorkbench.kind === 'indefinite' ? 'Antiderivative in x' : 'Symbolic first, numeric fallback if needed')}
                        latex={calculateWorkbenchExpression.latex}
                        emptyTitle={calculateRouteMeta?.emptyStateTitle ?? 'Integrand needed'}
                        emptyDescription={calculateRouteMeta?.emptyStateDescription ?? 'Enter an integrand and any required bounds to build the integral form.'}
                        onToEditor={() => loadLatexIntoEditor(calculateWorkbenchExpression.latex)}
                        onCopyExpr={copyCalculateWorkbenchExpression}
                      />
                    </div>
                  ) : calculateScreen === 'limit' ? (
                    <div className="grid-two">
                      <div className="editor-card">
                        <div className="card-title-row">
                          <strong>Limit Workbench</strong>
                          <span className="equation-badge">
                            {limitWorkbench.targetKind === 'finite'
                              ? limitWorkbench.direction === 'two-sided'
                                ? 'Two-sided'
                                : `${limitWorkbench.direction}-hand`
                              : limitWorkbench.targetKind === 'posInfinity'
                                ? 'x -> +∞'
                                : 'x -> -∞'}
                          </span>
                        </div>
                        <div className="guide-chip-row">
                          {(['finite', 'posInfinity', 'negInfinity'] as const).map((targetKind) => (
                            <button
                              key={targetKind}
                              className={`guide-chip ${limitWorkbench.targetKind === targetKind ? 'is-active' : ''}`}
                              onClick={() =>
                                setLimitWorkbench((currentState) => ({
                                  ...currentState,
                                  targetKind,
                                }))
                              }
                            >
                              {targetKind === 'finite' ? 'Finite' : targetKind === 'posInfinity' ? '+\u221e' : '-\u221e'}
                            </button>
                          ))}
                        </div>
                        <div className="guide-chip-row">
                          {limitWorkbench.targetKind === 'finite'
                            ? (['two-sided', 'left', 'right'] as const).map((direction) => (
                              <button
                                key={direction}
                                className={`guide-chip ${limitWorkbench.direction === direction ? 'is-active' : ''}`}
                                onClick={() =>
                                  setLimitWorkbench((currentState) => ({ ...currentState, direction }))
                                }
                              >
                                {direction === 'two-sided' ? 'Two-Sided' : direction === 'left' ? 'Left' : 'Right'}
                              </button>
                            ))
                            : (
                              <button
                                className="guide-chip is-active"
                                onClick={() =>
                                  setLimitWorkbench((currentState) => ({
                                    ...currentState,
                                    targetKind: cycleLimitTargetKind(currentState.targetKind),
                                  }))
                                }
                              >
                                Infinite target
                              </button>
                            )}
                        </div>
                        <MathEditor
                          ref={limitFieldRef}
                          className="secondary-mathfield"
                          value={limitWorkbench.bodyLatex}
                          modeId="calculate"
                          screenHint={calculateScreen}
                          onChange={(bodyLatex) =>
                            setLimitWorkbench((currentState) => ({ ...currentState, bodyLatex }))
                          }
                          keyboardLayouts={calculateKeyboardLayouts}
                          onFocus={(field) => {
                            activeFieldRef.current = field;
                          }}
                          placeholder="\\frac{\\sin(x)}{x}"
                        />
                        {limitWorkbench.targetKind === 'finite' ? (
                          <label className="range-field">
                            <span>Target</span>
                            <SignedNumberDraftInput
                              ref={limitTargetRef}
                              value={limitWorkbench.target}
                              onValueChange={(target) =>
                                setLimitWorkbench((currentState) => ({
                                  ...currentState,
                                  target,
                                }))
                              }
                            />
                          </label>
                        ) : (
                          <div className="editor-card calculus-target-summary">
                            <strong>Target</strong>
                            <p>{limitWorkbench.targetKind === 'posInfinity' ? 'x -> +\u221e' : 'x -> -\u221e'}</p>
                          </div>
                        )}
                      </div>
                      <GeneratedPreviewCard
                        title={calculateRouteMeta?.previewTitle ?? 'Generated Expression'}
                        subtitle={calculateRouteMeta?.previewSubtitle ?? (limitWorkbench.targetKind === 'finite'
                          ? 'Finite target'
                          : limitWorkbench.targetKind === 'posInfinity'
                            ? 'Positive infinity target'
                            : 'Negative infinity target')}
                        latex={calculateWorkbenchExpression.latex}
                        emptyTitle={calculateRouteMeta?.emptyStateTitle ?? 'Body and target needed'}
                        emptyDescription={calculateRouteMeta?.emptyStateDescription ?? 'Enter the body and target information to build the limit form.'}
                        onToEditor={() => loadLatexIntoEditor(calculateWorkbenchExpression.latex)}
                        onCopyExpr={copyCalculateWorkbenchExpression}
                      />
                    </div>
                  ) : null}
                </section>
              )
            ) : null}

            {!isLauncherOpen && currentMode === 'advancedCalculus' ? (
              <section className={`mode-panel ${isAdvancedCalcMenuOpen ? 'advanced-calc-menu-panel' : 'advanced-calc-panel'}`}>
                {advancedCalcRouteMeta ? (
                  <div className="equation-panel-header advanced-calc-header">
                    <div className="equation-panel-copy">
                      <div className="equation-breadcrumbs">
                        {advancedCalcRouteMeta.breadcrumb.map((segment) => (
                          <span key={`${advancedCalcScreen}-${segment}`} className="equation-breadcrumb">
                            {segment}
                          </span>
                        ))}
                      </div>
                      <div className="card-title-row">
                        <strong>{advancedCalcRouteMeta.label}</strong>
                        <span className="equation-badge">Advanced Calc</span>
                      </div>
                      <p className="equation-hint advanced-calc-subtitle">{advancedCalcRouteMeta.description}</p>
                      <div className="guide-related-links">
                        {advancedCalcRouteMeta.guideArticleId ? (
                          <button className="guide-chip" onClick={() => openGuideArticle(advancedCalcRouteMeta.guideArticleId!)}>
                            Guide: This tool
                          </button>
                        ) : null}
                        <button className="guide-chip" onClick={() => openGuideMode('advancedCalculus')}>Guide: Advanced Calc</button>
                        {advancedCalcCoreGuideArticleId ? (
                          <button className="guide-chip" onClick={() => openGuideArticle(advancedCalcCoreGuideArticleId)}>
                            Guide: Core Calculus
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isAdvancedCalcMenuOpen ? (
                  <>
                    <div
                      ref={advancedMenuPanelRef}
                      className="launcher-list equation-menu-list advanced-calc-menu-list"
                      tabIndex={-1}
                    >
                      {advancedCalcMenuEntries.map((entry, index) => (
                        <button
                          key={entry.id}
                          className={`launcher-entry equation-menu-entry advanced-calc-menu-entry ${index === currentAdvancedCalcMenuIndex ? 'is-selected' : ''}`}
                          onClick={() => openAdvancedCalcScreen(entry.target)}
                          onMouseEnter={() => setCurrentAdvancedCalcMenuIndex(advancedCalcScreen as 'home' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome', index)}
                        >
                          <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                          <span className="launcher-entry-content">
                            <strong>{entry.label}</strong>
                            <small>{entry.description}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="equation-menu-help advanced-calc-menu-footer">
                      <span>{advancedCalcMenuFooterText}</span>
                    </div>
                  </>
                ) : advancedCalcScreen === 'indefiniteIntegral' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Integrand</strong>
                        <span className="equation-badge">Symbolic-only</span>
                      </div>
                      <MathEditor
                        ref={advancedIndefiniteFieldRef}
                        className="secondary-mathfield"
                        value={advancedIndefiniteIntegral.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) => setAdvancedIndefiniteIntegral({ bodyLatex })}
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\frac{1}{1+x^2}"
                      />
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Integral'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Stronger symbolic antiderivative rules in x'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Integrand needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter an integrand to generate the antiderivative form.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'definiteIntegral' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Finite Bounds</strong>
                        <span className="equation-badge">Symbolic first</span>
                      </div>
                      <MathEditor
                        ref={advancedDefiniteFieldRef}
                        className="secondary-mathfield"
                        value={advancedDefiniteIntegral.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\sin(x^2)"
                      />
                      <div className="range-row">
                        <label className="range-field">
                          <span>Lower</span>
                          <SignedNumberDraftInput
                            ref={advancedDefiniteLowerRef}
                            value={advancedDefiniteIntegral.lower}
                            onValueChange={(lower) =>
                              setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, lower }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>Upper</span>
                          <SignedNumberDraftInput
                            value={advancedDefiniteIntegral.upper}
                            onValueChange={(upper) =>
                              setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, upper }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Integral'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Finite bounds with numeric fallback when allowed'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Integrand and bounds needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter an integrand and finite bounds to build the definite integral.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'improperIntegral' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Improper Bounds</strong>
                        <span className="equation-badge">Convergent cases</span>
                      </div>
                      <MathEditor
                        ref={advancedImproperFieldRef}
                        className="secondary-mathfield"
                        value={advancedImproperIntegral.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setAdvancedImproperIntegral((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\frac{1}{1+x^2}"
                      />
                      <div className="guide-chip-row">
                        {(['finite', 'negInfinity'] as const).map((kind) => (
                          <button
                            key={kind}
                            className={`guide-chip ${advancedImproperIntegral.lowerKind === kind ? 'is-active' : ''}`}
                            onClick={() =>
                              setAdvancedImproperIntegral((currentState) => ({ ...currentState, lowerKind: kind }))
                            }
                          >
                            {kind === 'finite' ? 'Finite lower' : '-∞ lower'}
                          </button>
                        ))}
                      </div>
                      {advancedImproperIntegral.lowerKind === 'finite' ? (
                        <label className="range-field">
                          <span>Lower</span>
                          <SignedNumberDraftInput
                            ref={advancedImproperLowerRef}
                            value={advancedImproperIntegral.lower}
                            onValueChange={(lower) =>
                              setAdvancedImproperIntegral((currentState) => ({ ...currentState, lower }))
                            }
                          />
                        </label>
                      ) : null}
                      <div className="guide-chip-row">
                        {(['finite', 'posInfinity'] as const).map((kind) => (
                          <button
                            key={kind}
                            className={`guide-chip ${advancedImproperIntegral.upperKind === kind ? 'is-active' : ''}`}
                            onClick={() =>
                              setAdvancedImproperIntegral((currentState) => ({ ...currentState, upperKind: kind }))
                            }
                          >
                            {kind === 'finite' ? 'Finite upper' : '+∞ upper'}
                          </button>
                        ))}
                      </div>
                      {advancedImproperIntegral.upperKind === 'finite' ? (
                        <label className="range-field">
                          <span>Upper</span>
                          <SignedNumberDraftInput
                            value={advancedImproperIntegral.upper}
                            onValueChange={(upper) =>
                              setAdvancedImproperIntegral((currentState) => ({ ...currentState, upper }))
                            }
                          />
                        </label>
                      ) : null}
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Integral'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Infinite-bound workflows with controlled divergence errors'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Integrand or bounds missing'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter an integrand and choose the finite or infinite bounds to build the improper integral.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'finiteLimit' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Finite Limit</strong>
                        <span className="equation-badge">
                          {advancedFiniteLimit.direction === 'two-sided' ? 'Two-sided' : `${advancedFiniteLimit.direction}-hand`}
                        </span>
                      </div>
                      <div className="guide-chip-row">
                        {(['two-sided', 'left', 'right'] as const).map((direction) => (
                          <button
                            key={direction}
                            className={`guide-chip ${advancedFiniteLimit.direction === direction ? 'is-active' : ''}`}
                            onClick={() =>
                              setAdvancedFiniteLimit((currentState) => ({ ...currentState, direction }))
                            }
                          >
                            {direction === 'two-sided' ? 'Two-Sided' : direction === 'left' ? 'Left' : 'Right'}
                          </button>
                        ))}
                      </div>
                      <MathEditor
                        ref={advancedFiniteLimitFieldRef}
                        className="secondary-mathfield"
                        value={advancedFiniteLimit.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setAdvancedFiniteLimit((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\frac{\\sin(x)}{x}"
                      />
                      <label className="range-field">
                        <span>Target</span>
                        <SignedNumberDraftInput
                          ref={advancedFiniteLimitTargetRef}
                          value={advancedFiniteLimit.target}
                          onValueChange={(target) =>
                            setAdvancedFiniteLimit((currentState) => ({ ...currentState, target }))
                          }
                        />
                      </label>
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Limit'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Finite target with left, right, or two-sided analysis'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Body and target needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter the body and target value to build the finite-limit expression.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'infiniteLimit' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Infinite Target</strong>
                        <span className="equation-badge">{advancedInfiniteLimit.targetKind === 'posInfinity' ? 'x -> +\u221e' : 'x -> -\u221e'}</span>
                      </div>
                      <div className="guide-chip-row">
                        {(['posInfinity', 'negInfinity'] as const).map((targetKind) => (
                          <button
                            key={targetKind}
                            className={`guide-chip ${advancedInfiniteLimit.targetKind === targetKind ? 'is-active' : ''}`}
                            onClick={() =>
                              setAdvancedInfiniteLimit((currentState) => ({ ...currentState, targetKind }))
                            }
                          >
                            {targetKind === 'posInfinity' ? '+∞' : '-∞'}
                          </button>
                        ))}
                      </div>
                      <MathEditor
                        ref={advancedInfiniteLimitFieldRef}
                        className="secondary-mathfield"
                        value={advancedInfiniteLimit.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setAdvancedInfiniteLimit((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\frac{3x^2+1}{2x^2-5}"
                      />
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Infinite Limit'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'End behavior as x approaches infinity'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Body needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter the body to build the infinite-target limit expression.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'maclaurin' || advancedCalcScreen === 'taylor' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>{advancedCalcScreen === 'maclaurin' ? 'Maclaurin' : 'Taylor'} Input</strong>
                        <span className="equation-badge">Order 1-8</span>
                      </div>
                      <MathEditor
                        ref={advancedCalcScreen === 'maclaurin' ? maclaurinFieldRef : taylorFieldRef}
                        className="secondary-mathfield"
                        value={advancedCalcScreen === 'maclaurin' ? maclaurinState.bodyLatex : taylorState.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) => {
                          if (advancedCalcScreen === 'maclaurin') {
                            setMaclaurinState((currentState) => ({ ...currentState, bodyLatex }));
                          } else {
                            setTaylorState((currentState) => ({ ...currentState, bodyLatex }));
                          }
                        }}
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder={advancedCalcScreen === 'maclaurin' ? '\\sin(x)' : 'x^3+2x'}
                      />
                      {advancedCalcScreen === 'taylor' ? (
                        <label className="range-field">
                          <span>Center</span>
                          <SignedNumberDraftInput
                            ref={taylorCenterRef}
                            value={taylorState.center}
                            onValueChange={(center) =>
                              setTaylorState((currentState) => ({ ...currentState, center }))
                            }
                          />
                        </label>
                      ) : null}
                      <div className="guide-chip-row">
                        {Array.from({ length: 8 }, (_, index) => index + 1).map((order) => (
                          <button
                            key={order}
                            className={`guide-chip ${(advancedCalcScreen === 'maclaurin' ? maclaurinState.order : taylorState.order) === order ? 'is-active' : ''}`}
                            onClick={() => {
                              if (advancedCalcScreen === 'maclaurin') {
                                setMaclaurinState((currentState) => ({ ...currentState, order }));
                              } else {
                                setTaylorState((currentState) => ({ ...currentState, order }));
                              }
                            }}
                          >
                            {order}
                          </button>
                        ))}
                      </div>
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Series'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? (advancedCalcScreen === 'maclaurin' ? 'Centered at 0' : 'Centered at a numeric value')}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? (advancedCalcScreen === 'maclaurin' ? 'Body and order needed' : 'Body, center, and order needed')}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? (advancedCalcScreen === 'maclaurin'
                        ? 'Enter a body and choose an order to build the Maclaurin series form.'
                        : 'Enter a body, center, and order to build the Taylor series form.')}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'partialDerivative' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Partial Derivative</strong>
                        <span className="equation-badge">First order</span>
                      </div>
                      <div className="guide-chip-row">
                        {(['x', 'y', 'z'] as const).map((variable) => (
                          <button
                            key={variable}
                            className={`guide-chip ${partialDerivativeState.variable === variable ? 'is-active' : ''}`}
                            onClick={() =>
                              setPartialDerivativeState((currentState) => ({ ...currentState, variable }))
                            }
                          >
                            {`∂/∂${variable}`}
                          </button>
                        ))}
                      </div>
                      <MathEditor
                        ref={partialDerivativeFieldRef}
                        className="secondary-mathfield"
                        value={partialDerivativeState.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setPartialDerivativeState((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="x^2y+y^3"
                      />
                      <p className="equation-hint">Choose x, y, or z. The other variables are treated as constants.</p>
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Partial Derivative'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Treat other variables as constants'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Expression needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter a multivariable expression to build the first-order partial derivative.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'odeFirstOrder' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>First-Order ODE</strong>
                        <span className="equation-badge">{firstOrderOdeState.classification}</span>
                      </div>
                      <div className="guide-chip-row">
                        {(['separable', 'linear', 'exact'] as const).map((classification) => (
                          <button
                            key={classification}
                            className={`guide-chip ${firstOrderOdeState.classification === classification ? 'is-active' : ''}`}
                            onClick={() =>
                              setFirstOrderOdeState((currentState) => ({ ...currentState, classification }))
                            }
                          >
                            {classification}
                          </button>
                        ))}
                      </div>
                      <MathEditor
                        ref={firstOrderOdeLhsFieldRef}
                        className="secondary-mathfield"
                        value={firstOrderOdeState.lhsLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(lhsLatex) =>
                          setFirstOrderOdeState((currentState) => ({ ...currentState, lhsLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="\\frac{dy}{dx}"
                      />
                      <MathEditor
                        ref={firstOrderOdeRhsFieldRef}
                        className="secondary-mathfield"
                        value={firstOrderOdeState.rhsLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(rhsLatex) =>
                          setFirstOrderOdeState((currentState) => ({ ...currentState, rhsLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="xy"
                      />
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated First-Order ODE'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Guided symbolic class selection'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Equation pieces needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter the left-hand side and right-hand side to build the first-order ODE.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'odeSecondOrder' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Second-Order ODE</strong>
                        <span className="equation-badge">Constant coefficients</span>
                      </div>
                      <div className="polynomial-grid" data-columns="3">
                        <label className="range-field">
                          <span>a₂</span>
                          <SignedNumberDraftInput
                            ref={secondOrderA2Ref}
                            value={secondOrderOdeState.a2}
                            onValueChange={(a2) =>
                              setSecondOrderOdeState((currentState) => ({ ...currentState, a2 }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>a₁</span>
                          <SignedNumberDraftInput
                            value={secondOrderOdeState.a1}
                            onValueChange={(a1) =>
                              setSecondOrderOdeState((currentState) => ({ ...currentState, a1 }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>a₀</span>
                          <SignedNumberDraftInput
                            value={secondOrderOdeState.a0}
                            onValueChange={(a0) =>
                              setSecondOrderOdeState((currentState) => ({ ...currentState, a0 }))
                            }
                          />
                        </label>
                      </div>
                      <MathEditor
                        ref={secondOrderOdeForcingFieldRef}
                        className="secondary-mathfield"
                        value={secondOrderOdeState.forcingLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(forcingLatex) =>
                          setSecondOrderOdeState((currentState) => ({ ...currentState, forcingLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="0"
                      />
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Second-Order ODE'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Constant-coefficient forms'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'Coefficients and forcing needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? 'Enter the coefficients and forcing term to build the second-order ODE.'}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : advancedCalcScreen === 'odeNumericIvp' ? (
                  <div className="grid-two">
                    <div className="editor-card">
                      <div className="card-title-row">
                        <strong>Numeric IVP</strong>
                        <span className="equation-badge">{numericIvpState.method.toUpperCase()}</span>
                      </div>
                      <div className="guide-chip-row">
                        {(['rk4', 'rk45'] as const).map((method) => (
                          <button
                            key={method}
                            className={`guide-chip ${numericIvpState.method === method ? 'is-active' : ''}`}
                            onClick={() =>
                              setNumericIvpState((currentState) => ({ ...currentState, method }))
                            }
                          >
                            {method.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <MathEditor
                        ref={numericIvpFieldRef}
                        className="secondary-mathfield"
                        value={numericIvpState.bodyLatex}
                        modeId="advancedCalculus"
                        screenHint={advancedCalcScreen}
                        onChange={(bodyLatex) =>
                          setNumericIvpState((currentState) => ({ ...currentState, bodyLatex }))
                        }
                        keyboardLayouts={advancedCalcKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="x+y"
                      />
                      <div className="polynomial-grid" data-columns="4">
                        <label className="range-field">
                          <span>x₀</span>
                          <SignedNumberDraftInput
                            ref={numericIvpX0Ref}
                            value={numericIvpState.x0}
                            onValueChange={(x0) =>
                              setNumericIvpState((currentState) => ({ ...currentState, x0 }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>y₀</span>
                          <SignedNumberDraftInput
                            value={numericIvpState.y0}
                            onValueChange={(y0) =>
                              setNumericIvpState((currentState) => ({ ...currentState, y0 }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>x end</span>
                          <SignedNumberDraftInput
                            value={numericIvpState.xEnd}
                            onValueChange={(xEnd) =>
                              setNumericIvpState((currentState) => ({ ...currentState, xEnd }))
                            }
                          />
                        </label>
                        <label className="range-field">
                          <span>Step</span>
                          <SignedNumberDraftInput
                            value={numericIvpState.step}
                            onValueChange={(step) =>
                              setNumericIvpState((currentState) => ({ ...currentState, step }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <GeneratedPreviewCard
                      title={advancedCalcRouteMeta?.previewTitle ?? 'Generated Numeric IVP'}
                      subtitle={advancedCalcRouteMeta?.previewSubtitle ?? 'Numeric initial-value solving'}
                      latex={advancedCalcWorkbenchExpression}
                      emptyTitle={advancedCalcRouteMeta?.emptyStateTitle ?? 'IVP data needed'}
                      emptyDescription={advancedCalcRouteMeta?.emptyStateDescription ?? "Enter y' = f(x,y), initial values, and a step size to build the IVP."}
                      onToEditor={() => loadLatexIntoEditor(advancedCalcWorkbenchExpression)}
                      onCopyExpr={copyAdvancedCalcWorkbenchExpression}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'trigonometry' ? renderTrigonometryWorkspace() : null}

            {!isLauncherOpen && currentMode === 'statistics' ? renderStatisticsWorkspace() : null}

            {!isLauncherOpen && currentMode === 'geometry' ? renderGeometryWorkspace() : null}

            {!isLauncherOpen && currentMode === 'guide' ? (
              <section className={`mode-panel ${guideRoute.screen === 'article' || (guideRoute.screen === 'modeGuide' && guideRoute.modeId) ? 'guide-article-panel' : 'guide-menu-panel'}`}>
                {guideRouteMeta ? (
                  <div className="equation-panel-header guide-panel-header">
                    <div className="equation-panel-copy">
                      <div className="guide-breadcrumbs">
                        {guideRouteMeta.breadcrumb.map((segment) => (
                          <span key={`${guideRoute.screen}-workspace-${segment}`} className="guide-breadcrumb">
                            {segment}
                          </span>
                        ))}
                      </div>
                      <div className="card-title-row">
                        <strong>{guideRouteMeta.title}</strong>
                      </div>
                      <p className="equation-hint">{guideRouteMeta.description}</p>
                    </div>
                  </div>
                ) : null}

                {(guideRoute.screen === 'home'
                  || guideRoute.screen === 'domain'
                  || guideRoute.screen === 'symbolLookup'
                  || guideRoute.screen === 'search'
                  || (guideRoute.screen === 'modeGuide' && !guideRoute.modeId)) ? (
                    <>
                      {(guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup') ? (
                        <label className="guide-search-row guide-search-row-panel">
                          <span>{guideRoute.screen === 'symbolLookup' ? 'Filter symbols' : 'Search guide'}</span>
                          <input
                            ref={guideRouteMeta?.focusTarget === 'search' ? guideSearchInputRef : undefined}
                            className="guide-search-input"
                            value={guideSearchQuery}
                            onChange={(event) => setGuideQuery(event.target.value)}
                            placeholder={guideRoute.screen === 'symbolLookup' ? 'sum, sigma, nCr, integral...' : 'Search domains, symbols, modes...'}
                          />
                        </label>
                      ) : null}
                      <div
                        ref={guideMenuPanelRef}
                        className="guide-list"
                        tabIndex={-1}
                      >
                        {guideListEntries.length === 0 ? (
                          <div className="guide-empty">No active guide entries match this view yet.</div>
                        ) : guideListEntries.map((entry, index) => (
                          <button
                            key={entry.id}
                            className={`guide-entry ${index === currentGuideSelectionIndex ? 'is-selected' : ''}`}
                            onClick={() => openGuideRoute(entry.route)}
                            onMouseEnter={() => setCurrentGuideSelectionIndex(index)}
                          >
                            <span className="launcher-entry-hotkey">{entry.hotkey ?? `${index + 1}`}</span>
                            <span className="launcher-entry-content">
                              <strong>{entry.title}</strong>
                              <small>{entry.description}</small>
                            </span>
                            {'resultKind' in entry && entry.resultKind ? (
                              <span className="guide-result-kind">{entry.resultKind}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <div className="guide-menu-help">
                        <span>
                          {guideRoute.screen === 'home'
                            ? `1-${activeGuideHomeEntries.length}: Open | EXE/F1: Select | F5: MENU | F6: Exit`
                            : 'Arrow keys or ◂/▸ move | EXE/F1 opens | F5/Esc back | F6 exit'}
                        </span>
                      </div>
                    </>
                  ) : null}

                {guideRoute.screen === 'article' && guideArticle ? (
                  <div className="guide-article">
                    <section className="editor-card guide-section guide-teaching-panel">
                      <h3 className="guide-section-title">What It Is</h3>
                      <ul className="guide-bullets">
                        {guideArticle.whatItIs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    {guideArticle.whatItMeans?.length ? (
                      <section className="editor-card guide-section guide-meaning-panel">
                        <h3 className="guide-section-title">What It Means</h3>
                        <ul className="guide-bullets">
                          {guideArticle.whatItMeans.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                    <section className="editor-card guide-section guide-teaching-panel">
                      <h3 className="guide-section-title">How To Use It</h3>
                      <ul className="guide-bullets">
                        {guideArticle.howToUse.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">Concepts</h3>
                      <ul className="guide-bullets">
                        {guideArticle.concepts.map((concept) => (
                          <li key={concept}>{concept}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">Where To Find It</h3>
                      <ul className="guide-bullets">
                        {guideArticle.whereToFindIt.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">Best Modes</h3>
                      <div className="guide-chip-row">
                        {guideArticle.bestModes.map((mode) => (
                          <button
                            key={mode}
                            className="guide-chip"
                            onClick={() => openGuideRoute({ screen: 'modeGuide', modeId: mode })}
                          >
                            {MODE_LABELS[mode]}
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">Worked Examples</h3>
                      <div className="guide-example-list">
                        {guideArticle.examples.map((example, index) => (
                          <article
                            key={example.id}
                            className={`guide-example ${index === currentGuideSelectionIndex ? 'is-selected' : ''}`}
                            onMouseEnter={() => setCurrentGuideSelectionIndex(index)}
                          >
                            <div className="card-title-row">
                              <strong>{example.title}</strong>
                              {index === currentGuideSelectionIndex ? (
                                <span className="guide-result-kind">Selected</span>
                              ) : null}
                            </div>
                            <p>{example.explanation}</p>
                            <ol className="guide-steps">
                              {example.steps.map((step) => (
                                <li key={step} className="guide-step">{step}</li>
                              ))}
                            </ol>
                            <p className="guide-expected">Expected: {example.expected}</p>
                            <div className="display-card-actions">
                              <button onClick={() => launchGuideExample(example)}>Open in Tool</button>
                              <button onClick={() => void copyText(copyableGuideExampleLatex(example), 'Example copied')}>Copy Expr</button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">Common Mistakes</h3>
                      <ul className="guide-bullets">
                        {guideArticle.pitfalls.map((pitfall) => (
                          <li key={pitfall}>{pitfall}</li>
                        ))}
                      </ul>
                    </section>
                    {guideArticle.exactVsNumeric?.length ? (
                      <section className="editor-card guide-section">
                        <h3 className="guide-section-title">Exact vs Numeric</h3>
                        <ul className="guide-bullets">
                          {guideArticle.exactVsNumeric.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                    {guideArticle.relatedArticleIds?.length ? (
                      <section className="editor-card guide-section">
                        <h3 className="guide-section-title">Related Topics</h3>
                        <div className="guide-related-links">
                          {guideArticle.relatedArticleIds.map((articleId) => {
                            const relatedArticle = getGuideArticle(articleId);
                            if (!relatedArticle) {
                              return null;
                            }

                            return (
                              <button
                                key={articleId}
                                className="guide-chip"
                                onClick={() => openGuideRoute({ screen: 'article', articleId })}
                              >
                                {relatedArticle.title}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : null}

                {guideRoute.screen === 'modeGuide' && guideModeRef ? (
                  <div className="guide-article">
                    <section className="editor-card guide-section guide-mode-card">
                      <h3 className="guide-section-title">{guideModeRef.title}</h3>
                      <p>{guideModeRef.summary}</p>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">When To Use It</h3>
                      <ul className="guide-bullets">
                        {guideModeRef.bestFor.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="editor-card guide-section">
                      <h3 className="guide-section-title">When Not To Use It</h3>
                      <ul className="guide-bullets">
                        {guideModeRef.avoidFor.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    {guideModeRef.articleIds.length > 0 ? (
                      <section className="editor-card guide-section">
                        <strong>Related topics</strong>
                        <div className="guide-related-links">
                          {guideModeRef.articleIds.map((articleId) => {
                            const article = getGuideArticle(articleId);
                            if (!article) {
                              return null;
                            }

                            return (
                              <button
                                key={articleId}
                                className="guide-chip"
                                onClick={() => openGuideRoute({ screen: 'article', articleId })}
                              >
                                {article.title}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'equation' ? (
              <section className={`mode-panel ${isEquationMenuOpen ? 'equation-menu-panel' : 'equation-work-panel'}`}>
                {equationRouteMeta ? (
                  <div className="equation-panel-header">
                    <div className="equation-panel-copy">
                      <div className="equation-breadcrumbs">
                        {equationRouteMeta.breadcrumb.map((segment) => (
                          <span key={`${equationScreen}-${segment}`} className="equation-breadcrumb">
                            {segment}
                          </span>
                        ))}
                      </div>
                      <div className="card-title-row">
                        <strong>{equationRouteMeta.label}</strong>
                        {equationRouteMeta.badge ? (
                          <span className="equation-badge">{equationRouteMeta.badge}</span>
                        ) : null}
                      </div>
                      <p className="equation-hint">{equationRouteMeta.description}</p>
                      <div className="guide-related-links">
                        <button className="guide-chip" onClick={() => openGuideArticle('algebra-equations')}>Guide: Equation Solving</button>
                        <button className="guide-chip" onClick={() => openGuideMode('equation')}>When to use Equation</button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {isEquationMenuOpen ? (
                  <>
                    <div
                      ref={equationMenuPanelRef}
                      className="launcher-list equation-menu-list"
                      tabIndex={-1}
                    >
                    {equationMenuEntries.map((entry, index) => (
                      <button
                        key={entry.id}
                        className={`launcher-entry equation-menu-entry ${index === currentEquationMenuIndex ? 'is-selected' : ''}`}
                        onClick={() => openEquationScreen(entry.target)}
                        onMouseEnter={() => {
                          if (currentEquationMenuScreen) {
                            setCurrentEquationMenuIndex(currentEquationMenuScreen, index);
                          }
                        }}
                      >
                        <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                        <span className="launcher-entry-content">
                          <strong>{entry.label}</strong>
                          <small>{entry.description}</small>
                        </span>
                      </button>
                    ))}
                    </div>
                    <div className="equation-menu-help">
                      <span>{equationMenuFooterText}</span>
                    </div>
                  </>
                ) : isSimultaneousEquationScreen(equationScreen) ? (
                  <>
                    <div className="editor-card equation-branch-card">
                      <div className="card-title-row">
                        <strong>{equationRouteMeta?.label}</strong>
                        {equationRouteMeta?.badge ? (
                          <span className="equation-badge">{equationRouteMeta.badge}</span>
                        ) : null}
                      </div>
                      <p className="equation-hint">{equationRouteMeta?.helpText}</p>
                    </div>
                    <div className="system-grid" data-columns={equationScreen === 'linear2' ? 3 : 4}>
                      {(equationScreen === 'linear2' ? system2 : system3).map((row, rowIndex) =>
                        row.map((value, columnIndex) => (
                          <label key={`${equationScreen}-${rowIndex}-${columnIndex}`}>
                            <span>{columnIndex < (equationScreen === 'linear2' ? 2 : 3) ? ['x', 'y', 'z'][columnIndex] : '='}</span>
                            <SignedNumberInput
                              ref={(node) => {
                                if (rowIndex === 0 && columnIndex === 0) {
                                  systemInputRefs.current[equationScreen] = node;
                                }
                              }}
                              value={value}
                              onValueChange={(nextValue) =>
                                setSystemCell(
                                  equationScreen === 'linear2' ? 2 : 3,
                                  rowIndex,
                                  columnIndex,
                                  nextValue,
                                )
                              }
                            />
                          </label>
                        )),
                      )}
                    </div>
                  </>
                ) : activePolynomialView && activePolynomialMeta && activePolynomialCoefficients ? (
                  <>
                    <div className="editor-card equation-branch-card">
                      <div className="card-title-row">
                        <strong>{equationRouteMeta?.label}</strong>
                        {equationRouteMeta?.badge ? (
                          <span className="equation-badge">{equationRouteMeta.badge}</span>
                        ) : null}
                      </div>
                      <p className="equation-hint">{equationRouteMeta?.helpText}</p>
                    </div>
                    <div className="polynomial-panel">
                      <div className="editor-card">
                        <div className="card-title-row">
                          <strong>{activePolynomialMeta.title}</strong>
                          <span className="equation-subtitle">Solve in x</span>
                        </div>
                        <MathStatic
                          className="polynomial-template-math"
                          latex={polynomialTemplateLatex(activePolynomialView)}
                        />
                        <p className="equation-hint">
                          Enter coefficients for {activePolynomialMeta.coefficientLabels.join(', ')}. The leading coefficient must stay non-zero.
                        </p>
                        <div className="polynomial-grid" data-columns={activePolynomialMeta.coefficientLabels.length}>
                          {activePolynomialMeta.coefficientLabels.map((label, index) => (
                            <label key={`${equationScreen}-${label}`}>
                              <span>{label}</span>
                              <SignedNumberInput
                                ref={(node) => {
                                  if (index === 0) {
                                    polynomialInputRefs.current[activePolynomialView] = node;
                                  }
                                }}
                                value={activePolynomialCoefficients[index]}
                                onValueChange={(nextValue) =>
                                  setPolynomialCoefficient(activePolynomialView, index, nextValue)
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="editor-card">
                        <strong>Generated Equation</strong>
                        <MathStatic
                          className="polynomial-preview-math"
                          latex={buildPolynomialEquationLatex(activePolynomialView, activePolynomialCoefficients)}
                          emptyLabel="Generated equation"
                        />
                        <p className="equation-hint">
                          Press EXE or F1 to solve and return exact roots first.
                        </p>
                      </div>
                    </div>
                  </>
                ) : equationScreen === 'symbolic' ? (
                  <div className="editor-card equation-branch-card">
                    <div className="card-title-row">
                      <strong>{equationRouteMeta?.label}</strong>
                      {equationRouteMeta?.badge ? (
                        <span className="equation-badge">{equationRouteMeta.badge}</span>
                      ) : null}
                    </div>
                    <p className="equation-hint">{equationRouteMeta?.helpText}</p>
                    <p className="equation-hint">
                      Enter a symbolic equation in the main display, for example `x^2-5x+6=0`.
                    </p>
                    {shouldAllowEquationNumericSolve() ? (
                      <div className="workspace-action-row">
                        {!shouldShowEquationNumericSolvePanel() ? (
                          <button
                            type="button"
                            className="workspace-action-button"
                            onClick={() => setEquationNumericSolvePanel((currentPanel) => ({
                              ...currentPanel,
                              enabled: true,
                            }))}
                          >
                            Numeric Solve
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="workspace-action-button"
                            onClick={() => setEquationNumericSolvePanel((currentPanel) => ({
                              ...currentPanel,
                              enabled: false,
                            }))}
                          >
                            Hide Numeric Solve
                          </button>
                        )}
                      </div>
                    ) : null}
                    {shouldShowEquationNumericSolvePanel() ? (
                      <div className="equation-numeric-panel">
                        <div className="card-title-row">
                          <strong>Numeric Interval Solve</strong>
                          <span className="equation-origin-badge">Bracket-first</span>
                        </div>
                        <p className="equation-hint">
                          Use this only when exact symbolic solving stops short. Roots are searched on a real interval and validated back against the original equation.
                        </p>
                        <div className="grid-three">
                          <label className="field-group">
                            <span>Start</span>
                            <SignedNumberInput
                              value={Number(equationNumericSolvePanel.start)}
                              onValueChange={(nextValue) =>
                                setEquationNumericSolvePanel((currentPanel) => ({
                                  ...currentPanel,
                                  start: `${nextValue}`,
                                }))}
                            />
                          </label>
                          <label className="field-group">
                            <span>End</span>
                            <SignedNumberInput
                              value={Number(equationNumericSolvePanel.end)}
                              onValueChange={(nextValue) =>
                                setEquationNumericSolvePanel((currentPanel) => ({
                                  ...currentPanel,
                                  end: `${nextValue}`,
                                }))}
                            />
                          </label>
                          <label className="field-group">
                            <span>Subdivisions</span>
                            <input
                              type="number"
                              min={8}
                              step={1}
                              value={equationNumericSolvePanel.subdivisions}
                              onChange={(event) =>
                                setEquationNumericSolvePanel((currentPanel) => ({
                                  ...currentPanel,
                                  subdivisions: Number(event.target.value) || 0,
                                }))}
                            />
                          </label>
                        </div>
                        <div className="workspace-action-row">
                          <button
                            type="button"
                            className="workspace-action-button workspace-action-button--primary"
                            onClick={runEquationNumericSolveAction}
                          >
                            Run Numeric Solve
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p>Choose an equation tool from the Equation menu.</p>
                )}
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'matrix' ? (
              <section className="mode-panel">
                <div className="linear-algebra-panel-header">
                  <div className="linear-algebra-panel-copy">
                    <strong>Matrix Workspace</strong>
                    <p>
                      Run matrix operations with the numeric grids below. Use the notation pad for
                      structured templates, copying, and drafting expressions.
                    </p>
                  </div>
                  <div className="linear-algebra-badge-row">
                    <span className="equation-badge">Operational mode</span>
                    <span className="equation-origin-badge">MatrixVec keyboard</span>
                  </div>
                </div>
                <div className="guide-related-links">
                  <button className="guide-chip" onClick={() => openGuideMode('matrix')}>Guide: Matrix mode</button>
                  <button className="guide-chip" onClick={() => openGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
                </div>
                <div className="grid-two">
                  <div className="editor-card">
                    <strong>Matrix A</strong>
                    <div className="matrix-grid" data-columns={2}>
                      {matrixA.map((row, rowIndex) =>
                        row.map((value, columnIndex) => (
                          <SignedNumberInput key={`a-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => setMatrixCell('A', rowIndex, columnIndex, nextValue)} />
                        )),
                      )}
                    </div>
                  </div>
                  <div className="editor-card">
                    <strong>Matrix B</strong>
                    <div className="matrix-grid" data-columns={2}>
                      {matrixB.map((row, rowIndex) =>
                        row.map((value, columnIndex) => (
                          <SignedNumberInput key={`b-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => setMatrixCell('B', rowIndex, columnIndex, nextValue)} />
                        )),
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid-two linear-algebra-info-grid">
                  <div className="editor-card linear-algebra-info-card">
                    <div className="card-title-row">
                      <strong>Runs Here</strong>
                      <span className="equation-badge">Executable</span>
                    </div>
                    <ul className="guide-bullets">
                      <li>Add, subtract, multiply, transpose, determinant, and inverse.</li>
                      <li>Matrix A and Matrix B stay numeric and directly feed the soft-key operations.</li>
                    </ul>
                  </div>
                  <div className="editor-card linear-algebra-info-card">
                    <div className="card-title-row">
                      <strong>Notation Pad</strong>
                      <span className="equation-origin-badge">Template-only</span>
                    </div>
                    <ul className="guide-bullets">
                      <li>Use it to draft matrix notation, copy expressions, and reuse the current A/B values.</li>
                      <li>It does not turn Calculate into a full free-form symbolic matrix CAS.</li>
                    </ul>
                  </div>
                </div>
                <div className="editor-card notation-pad-card">
                  <div className="card-title-row">
                    <strong>Matrix Notation Pad</strong>
                    <span className="equation-badge">Template-only</span>
                  </div>
                  <div className="quick-template-grid">
                    <button onClick={() => loadMatrixNotationPreset('matrixA')}>Use A</button>
                    <button onClick={() => loadMatrixNotationPreset('matrixB')}>Use B</button>
                    <button onClick={() => loadMatrixNotationPreset('add')}>A+B</button>
                    <button onClick={() => loadMatrixNotationPreset('multiply')}>AB</button>
                    <button onClick={() => loadMatrixNotationPreset('detA')}>det(A)</button>
                    <button onClick={() => loadMatrixNotationPreset('transposeA')}>Aᵀ</button>
                    <button onClick={() => loadMatrixNotationPreset('inverseA')}>A⁻¹</button>
                    <button onClick={() => void copyText(matrixNotationLatex, 'Matrix notation copied')}>Copy Pad</button>
                  </div>
                  <MathEditor
                    ref={matrixNotationFieldRef}
                    className="secondary-mathfield"
                    value={matrixNotationLatex}
                    onChange={setMatrixNotationLatex}
                    modeId="matrix"
                    screenHint="matrix"
                    keyboardLayouts={matrixKeyboardLayouts}
                    onFocus={(field) => {
                      activeFieldRef.current = field;
                    }}
                    placeholder="Use MatrixVec templates here"
                  />
                  <div className="notation-pad-footer">
                    <p className="equation-hint">Use Matrix mode for operations. The notation pad is for structured template entry and copying, not full free-form matrix CAS.</p>
                    <button className="guide-chip" onClick={() => setMatrixNotationLatex('')}>Clear Pad</button>
                  </div>
                </div>
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'vector' ? (
              <section className="mode-panel">
                <div className="linear-algebra-panel-header">
                  <div className="linear-algebra-panel-copy">
                    <strong>Vector Workspace</strong>
                    <p>
                      Run vector operations with the numeric inputs below. Use the notation pad for
                      structured vector forms, operator drafting, and copying.
                    </p>
                  </div>
                  <div className="linear-algebra-badge-row">
                    <span className="equation-badge">Operational mode</span>
                    <span className="equation-origin-badge">MatrixVec keyboard</span>
                  </div>
                </div>
                <div className="guide-related-links">
                  <button className="guide-chip" onClick={() => openGuideMode('vector')}>Guide: Vector mode</button>
                  <button className="guide-chip" onClick={() => openGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
                </div>
                <div className="grid-two">
                  <div className="editor-card">
                    <strong>Vector A</strong>
                    <div className="vector-grid">
                      {vectorA.map((value, index) => (
                        <SignedNumberInput key={`va-${index}`} value={value} onValueChange={(nextValue) => setVectorCell('A', index, nextValue)} />
                      ))}
                    </div>
                  </div>
                  <div className="editor-card">
                    <strong>Vector B</strong>
                    <div className="vector-grid">
                      {vectorB.map((value, index) => (
                        <SignedNumberInput key={`vb-${index}`} value={value} onValueChange={(nextValue) => setVectorCell('B', index, nextValue)} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid-two linear-algebra-info-grid">
                  <div className="editor-card linear-algebra-info-card">
                    <div className="card-title-row">
                      <strong>Runs Here</strong>
                      <span className="equation-badge">Executable</span>
                    </div>
                    <ul className="guide-bullets">
                      <li>Dot, cross, norm, angle, addition, and subtraction run directly in Vector mode.</li>
                      <li>Vector A and Vector B remain numeric inputs for the dedicated operations.</li>
                    </ul>
                  </div>
                  <div className="editor-card linear-algebra-info-card">
                    <div className="card-title-row">
                      <strong>Notation Pad</strong>
                      <span className="equation-origin-badge">Template-only</span>
                    </div>
                    <ul className="guide-bullets">
                      <li>Draft vector notation, copy operator forms, and reuse the current A/B vectors.</li>
                      <li>Free-form symbolic vector algebra is still out of scope for this milestone.</li>
                    </ul>
                  </div>
                </div>
                <div className="editor-card notation-pad-card">
                  <div className="card-title-row">
                    <strong>Vector Notation Pad</strong>
                    <span className="equation-badge">Template-only</span>
                  </div>
                  <div className="quick-template-grid">
                    <button onClick={() => loadVectorNotationPreset('vectorA')}>Use A</button>
                    <button onClick={() => loadVectorNotationPreset('vectorB')}>Use B</button>
                    <button onClick={() => loadVectorNotationPreset('add')}>A+B</button>
                    <button onClick={() => loadVectorNotationPreset('dot')}>A·B</button>
                    <button onClick={() => loadVectorNotationPreset('cross')}>A×B</button>
                    <button onClick={() => loadVectorNotationPreset('normA')}>‖A‖</button>
                    <button onClick={() => loadVectorNotationPreset('normB')}>‖B‖</button>
                    <button onClick={() => void copyText(vectorNotationLatex, 'Vector notation copied')}>Copy Pad</button>
                  </div>
                  <MathEditor
                    ref={vectorNotationFieldRef}
                    className="secondary-mathfield"
                    value={vectorNotationLatex}
                    onChange={setVectorNotationLatex}
                    modeId="vector"
                    screenHint="vector"
                    keyboardLayouts={vectorKeyboardLayouts}
                    onFocus={(field) => {
                      activeFieldRef.current = field;
                    }}
                    placeholder="Use MatrixVec templates here"
                  />
                  <div className="notation-pad-footer">
                    <p className="equation-hint">Use Vector mode for dot, cross, norms, and angle. The notation pad is for structured template entry and reuse.</p>
                    <button className="guide-chip" onClick={() => setVectorNotationLatex('')}>Clear Pad</button>
                  </div>
                </div>
              </section>
            ) : null}

            {!isLauncherOpen && currentMode === 'table' ? (
              <section className="mode-panel">
                <div className="guide-related-links">
                  <button className="guide-chip" onClick={() => openGuideMode('table')}>Guide: Table mode</button>
                  <button className="guide-chip" onClick={() => openGuideArticle('calculus-integrals-limits')}>Guide: Calculus examples</button>
                </div>
                <div className="grid-two">
                  <div className="editor-card">
                    <strong>f(x)</strong>
                    <MathEditor
                      className="secondary-mathfield"
                      dataTestId="table-primary-editor"
                      value={tablePrimaryLatex}
                      onChange={setTablePrimaryLatex}
                      modeId="table"
                      screenHint="table"
                      keyboardLayouts={tableKeyboardLayouts}
                      onFocus={(field) => {
                        activeFieldRef.current = field;
                      }}
                      placeholder="x^2"
                    />
                  </div>
                  <div className="editor-card">
                    <strong>g(x)</strong>
                    {tableSecondaryEnabled ? (
                      <MathEditor
                        className="secondary-mathfield"
                        dataTestId="table-secondary-editor"
                        value={tableSecondaryLatex}
                        onChange={setTableSecondaryLatex}
                        modeId="table"
                        screenHint="table"
                        keyboardLayouts={tableKeyboardLayouts}
                        onFocus={(field) => {
                          activeFieldRef.current = field;
                        }}
                        placeholder="x+1"
                      />
                    ) : (
                      <p>Enable the second function with `F2`.</p>
                    )}
                  </div>
                </div>
                <div className="range-row">
                  <label><span>Start</span><SignedNumberInput value={tableStart} onValueChange={setTableStart} /></label>
                  <label><span>End</span><SignedNumberInput value={tableEnd} onValueChange={setTableEnd} /></label>
                  <label><span>Step</span><SignedNumberInput value={tableStep} onValueChange={setTableStep} /></label>
                </div>
                {tableResponse && !tableResponse.error ? (
                  <div className="table-preview" data-testid="table-preview">
                    <div className="table-header-row">
                      {tableResponse.headers.map((header) => (
                        <MathStatic key={header} className="table-header-math" latex={header} />
                      ))}
                    </div>
                    {tableResponse.rows.map((row, index) => (
                      <div
                        key={`${row.x}-${index}`}
                        className="table-data-row"
                        data-testid={`table-row-${index}`}
                      >
                        <span>{row.x}</span>
                        <span>{row.primary}</span>
                        {tableResponse.headers.length === 3 ? <span>{row.secondary}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

        </main>

        <section className="keypad-panel">
          {KEYPAD_ROWS.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="keypad-row">
              {row.map((button) => (
                <button key={button.id} data-testid={`keypad-${button.id}`} className={`keypad-key ${button.variant}`} onClick={() => handleKeypad(button)}>
                  <span>{button.label}</span>
                </button>
              ))}
            </div>
          ))}
        </section>
      </div>

        {sideSurfaceOutboardOpen ? (
          <div
            className={`side-surface-host side-surface-host--${sideSurfaceSide}`}
            data-testid="side-surface-host"
            data-side-surface={sideSurface}
            data-side-surface-presentation="outboard"
            data-side-surface-side={sideSurfaceSide}
            style={sideSurfaceHostStyle}
          >
            {renderActiveSideSurface('outboard')}
          </div>
        ) : null}
      </div>

      {sideSurfaceOverlayOpen ? (
        <>
          <button
            type="button"
            className="side-surface-overlay-backdrop"
            data-testid="side-surface-overlay-backdrop"
            aria-label="Close side panel"
            onClick={closeSideSurface}
          />
          {renderActiveSideSurface('overlay')}
        </>
      ) : null}
      </div>
    </MathNotationProvider>
  );
}
