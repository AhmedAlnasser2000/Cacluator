/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ModeId } from '../../types/calculator';

type ClearCurrentModeDeps = {
  isLauncherOpen: boolean;
  closeLauncher: () => void;
  currentMode: ModeId;
  goBackInGuide: () => void;
  isStatisticsMenuOpen: boolean;
  goBackInStatistics: () => void;
  statisticsScreen: string;
  setStatsDataset: (value: any) => void;
  setFrequencyTable: (value: any) => void;
  setStatisticsWorkingSource: (value: 'dataset' | 'frequencyTable') => void;
  setStatisticsDraftState: (value: any) => void;
  statisticsDraftStateForScreen: (screen: any, rawLatex: string, source: any) => any;
  defaultStatisticsDraftForScreen: (screen: any, source?: any) => string;
  DEFAULT_STATS_DATASET: any;
  DEFAULT_FREQUENCY_TABLE: any;
  DEFAULT_BINOMIAL_STATE: any;
  DEFAULT_NORMAL_STATE: any;
  DEFAULT_POISSON_STATE: any;
  DEFAULT_REGRESSION_STATE: any;
  DEFAULT_CORRELATION_STATE: any;
  setBinomialState: (value: any) => void;
  setNormalState: (value: any) => void;
  setPoissonState: (value: any) => void;
  setRegressionState: (value: any) => void;
  setCorrelationState: (value: any) => void;
  isGeometryMenuOpen: boolean;
  goBackInGeometry: () => void;
  geometryScreen: string;
  setSquareState: (value: any) => void;
  setRectangleState: (value: any) => void;
  setTriangleAreaState: (value: any) => void;
  setTriangleHeronState: (value: any) => void;
  setCircleState: (value: any) => void;
  setArcSectorState: (value: any) => void;
  setCubeState: (value: any) => void;
  setCuboidState: (value: any) => void;
  setCylinderState: (value: any) => void;
  setConeState: (value: any) => void;
  setSphereState: (value: any) => void;
  setDistanceState: (value: any) => void;
  setMidpointState: (value: any) => void;
  setSlopeState: (value: any) => void;
  setLineEquationState: (value: any) => void;
  setGeometryDraftState: (value: any) => void;
  geometryDraftStateForScreen: (screen: any, rawLatex: string, source: any) => any;
  defaultGeometryDraftForScreen: (screen: any) => string;
  DEFAULT_SQUARE_STATE: any;
  DEFAULT_RECTANGLE_STATE: any;
  DEFAULT_TRIANGLE_AREA_STATE: any;
  DEFAULT_TRIANGLE_HERON_STATE: any;
  DEFAULT_CIRCLE_STATE: any;
  DEFAULT_ARC_SECTOR_STATE: any;
  DEFAULT_CUBE_STATE: any;
  DEFAULT_CUBOID_STATE: any;
  DEFAULT_CYLINDER_STATE: any;
  DEFAULT_CONE_STATE: any;
  DEFAULT_SPHERE_STATE: any;
  DEFAULT_DISTANCE_STATE: any;
  DEFAULT_MIDPOINT_STATE: any;
  DEFAULT_SLOPE_STATE: any;
  DEFAULT_LINE_EQUATION_STATE: any;
  isTrigMenuOpen: boolean;
  goBackInTrigonometry: () => void;
  trigScreen: string;
  setTrigFunctionState: (value: any) => void;
  setTrigIdentityState: (value: any) => void;
  setTrigEquationState: (value: any) => void;
  setRightTriangleState: (value: any) => void;
  setSineRuleState: (value: any) => void;
  setCosineRuleState: (value: any) => void;
  setAngleConvertState: (value: any) => void;
  setSpecialAnglesExpression: (value: string) => void;
  setTrigDraftState: (value: any) => void;
  trigDraftStateForScreen: (screen: any, rawLatex: string, source: any) => any;
  defaultTrigDraftForScreen: (screen: any) => string;
  DEFAULT_TRIG_FUNCTION_STATE: any;
  DEFAULT_TRIG_IDENTITY_STATE: any;
  DEFAULT_TRIG_EQUATION_STATE: any;
  DEFAULT_RIGHT_TRIANGLE_STATE: any;
  DEFAULT_SINE_RULE_STATE: any;
  DEFAULT_COSINE_RULE_STATE: any;
  DEFAULT_ANGLE_CONVERT_STATE: any;
  isAdvancedCalcMenuOpen: boolean;
  goBackInAdvancedCalc: () => void;
  advancedCalcScreen: string;
  setAdvancedIndefiniteIntegral: (value: any) => void;
  setAdvancedDefiniteIntegral: (value: any) => void;
  setAdvancedImproperIntegral: (value: any) => void;
  setAdvancedFiniteLimit: (value: any) => void;
  setAdvancedInfiniteLimit: (value: any) => void;
  setMaclaurinState: (value: any) => void;
  setTaylorState: (value: any) => void;
  setPartialDerivativeState: (value: any) => void;
  setFirstOrderOdeState: (value: any) => void;
  setSecondOrderOdeState: (value: any) => void;
  setNumericIvpState: (value: any) => void;
  DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE: any;
  DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE: any;
  DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE: any;
  DEFAULT_ADVANCED_FINITE_LIMIT_STATE: any;
  DEFAULT_ADVANCED_INFINITE_LIMIT_STATE: any;
  DEFAULT_MACLAURIN_STATE: any;
  DEFAULT_TAYLOR_STATE: any;
  DEFAULT_PARTIAL_DERIVATIVE_STATE: any;
  DEFAULT_FIRST_ORDER_ODE_STATE: any;
  DEFAULT_SECOND_ORDER_ODE_STATE: any;
  DEFAULT_NUMERIC_IVP_STATE: any;
  calculateScreen: string;
  openCalculateScreen: (screen: any) => void;
  setCalculateLatex: (value: string) => void;
  setDerivativeWorkbench: (value: any) => void;
  setDerivativePointWorkbench: (value: any) => void;
  setIntegralWorkbench: (value: any) => void;
  setLimitWorkbench: (value: any) => void;
  DEFAULT_DERIVATIVE_WORKBENCH: any;
  DEFAULT_DERIVATIVE_POINT_WORKBENCH: any;
  DEFAULT_INTEGRAL_WORKBENCH: any;
  DEFAULT_LIMIT_WORKBENCH: any;
  equationScreen: string;
  isEquationMenuScreen: (screen: string) => boolean;
  goBackInEquation: () => void;
  setEquationLatex: (value: string) => void;
  setQuadraticCoefficients: (value: number[]) => void;
  setCubicCoefficients: (value: number[]) => void;
  setQuarticCoefficients: (value: number[]) => void;
  setSystem2: (value: number[][]) => void;
  setSystem3: (value: number[][]) => void;
  DEFAULT_POLYNOMIAL_COEFFICIENTS: any;
  emptySystem: (size: 2 | 3) => number[][];
  setTablePrimaryLatex: (value: string) => void;
  setTableSecondaryLatex: (value: string) => void;
  setTableResponse: (value: any) => void;
  setDisplayOutcome: (value: any) => void;
};

export function clearCurrentModeWithDeps(deps: ClearCurrentModeDeps) {
  if (deps.isLauncherOpen) {
    deps.closeLauncher();
    return;
  }

  if (deps.currentMode === 'guide') {
    deps.goBackInGuide();
  } else if (deps.currentMode === 'statistics') {
    if (deps.isStatisticsMenuOpen) {
      deps.goBackInStatistics();
    } else if (deps.statisticsScreen === 'dataEntry' || deps.statisticsScreen === 'descriptive') {
      deps.setStatsDataset(deps.DEFAULT_STATS_DATASET);
      deps.setFrequencyTable(deps.DEFAULT_FREQUENCY_TABLE);
      deps.setStatisticsWorkingSource('dataset');
      deps.setStatisticsDraftState(
        deps.statisticsDraftStateForScreen(
          deps.statisticsScreen,
          deps.defaultStatisticsDraftForScreen(deps.statisticsScreen, 'dataset'),
          'guided',
        ),
      );
    } else if (deps.statisticsScreen === 'frequency') {
      deps.setStatsDataset(deps.DEFAULT_STATS_DATASET);
      deps.setFrequencyTable(deps.DEFAULT_FREQUENCY_TABLE);
      deps.setStatisticsWorkingSource('frequencyTable');
      deps.setStatisticsDraftState(
        deps.statisticsDraftStateForScreen('frequency', deps.defaultStatisticsDraftForScreen('frequency', 'frequencyTable'), 'guided'),
      );
    } else if (deps.statisticsScreen === 'binomial') {
      deps.setBinomialState(deps.DEFAULT_BINOMIAL_STATE);
      deps.setStatisticsDraftState(deps.statisticsDraftStateForScreen('binomial', deps.defaultStatisticsDraftForScreen('binomial'), 'guided'));
    } else if (deps.statisticsScreen === 'normal') {
      deps.setNormalState(deps.DEFAULT_NORMAL_STATE);
      deps.setStatisticsDraftState(deps.statisticsDraftStateForScreen('normal', deps.defaultStatisticsDraftForScreen('normal'), 'guided'));
    } else if (deps.statisticsScreen === 'poisson') {
      deps.setPoissonState(deps.DEFAULT_POISSON_STATE);
      deps.setStatisticsDraftState(deps.statisticsDraftStateForScreen('poisson', deps.defaultStatisticsDraftForScreen('poisson'), 'guided'));
    } else if (deps.statisticsScreen === 'regression') {
      deps.setRegressionState(deps.DEFAULT_REGRESSION_STATE);
      deps.setStatisticsDraftState(deps.statisticsDraftStateForScreen('regression', deps.defaultStatisticsDraftForScreen('regression'), 'guided'));
    } else if (deps.statisticsScreen === 'correlation') {
      deps.setCorrelationState(deps.DEFAULT_CORRELATION_STATE);
      deps.setStatisticsDraftState(deps.statisticsDraftStateForScreen('correlation', deps.defaultStatisticsDraftForScreen('correlation'), 'guided'));
    }
  } else if (deps.currentMode === 'geometry') {
    if (deps.isGeometryMenuOpen) {
      deps.goBackInGeometry();
    } else if (deps.geometryScreen === 'square') {
      deps.setSquareState(deps.DEFAULT_SQUARE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('square', deps.defaultGeometryDraftForScreen('square'), 'guided'));
    } else if (deps.geometryScreen === 'rectangle') {
      deps.setRectangleState(deps.DEFAULT_RECTANGLE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('rectangle', deps.defaultGeometryDraftForScreen('rectangle'), 'guided'));
    } else if (deps.geometryScreen === 'triangleArea') {
      deps.setTriangleAreaState(deps.DEFAULT_TRIANGLE_AREA_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('triangleArea', deps.defaultGeometryDraftForScreen('triangleArea'), 'guided'));
    } else if (deps.geometryScreen === 'triangleHeron') {
      deps.setTriangleHeronState(deps.DEFAULT_TRIANGLE_HERON_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('triangleHeron', deps.defaultGeometryDraftForScreen('triangleHeron'), 'guided'));
    } else if (deps.geometryScreen === 'circle') {
      deps.setCircleState(deps.DEFAULT_CIRCLE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('circle', deps.defaultGeometryDraftForScreen('circle'), 'guided'));
    } else if (deps.geometryScreen === 'arcSector') {
      deps.setArcSectorState(deps.DEFAULT_ARC_SECTOR_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('arcSector', deps.defaultGeometryDraftForScreen('arcSector'), 'guided'));
    } else if (deps.geometryScreen === 'cube') {
      deps.setCubeState(deps.DEFAULT_CUBE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('cube', deps.defaultGeometryDraftForScreen('cube'), 'guided'));
    } else if (deps.geometryScreen === 'cuboid') {
      deps.setCuboidState(deps.DEFAULT_CUBOID_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('cuboid', deps.defaultGeometryDraftForScreen('cuboid'), 'guided'));
    } else if (deps.geometryScreen === 'cylinder') {
      deps.setCylinderState(deps.DEFAULT_CYLINDER_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('cylinder', deps.defaultGeometryDraftForScreen('cylinder'), 'guided'));
    } else if (deps.geometryScreen === 'cone') {
      deps.setConeState(deps.DEFAULT_CONE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('cone', deps.defaultGeometryDraftForScreen('cone'), 'guided'));
    } else if (deps.geometryScreen === 'sphere') {
      deps.setSphereState(deps.DEFAULT_SPHERE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('sphere', deps.defaultGeometryDraftForScreen('sphere'), 'guided'));
    } else if (deps.geometryScreen === 'distance') {
      deps.setDistanceState(deps.DEFAULT_DISTANCE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('distance', deps.defaultGeometryDraftForScreen('distance'), 'guided'));
    } else if (deps.geometryScreen === 'midpoint') {
      deps.setMidpointState(deps.DEFAULT_MIDPOINT_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('midpoint', deps.defaultGeometryDraftForScreen('midpoint'), 'guided'));
    } else if (deps.geometryScreen === 'slope') {
      deps.setSlopeState(deps.DEFAULT_SLOPE_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('slope', deps.defaultGeometryDraftForScreen('slope'), 'guided'));
    } else if (deps.geometryScreen === 'lineEquation') {
      deps.setLineEquationState(deps.DEFAULT_LINE_EQUATION_STATE);
      deps.setGeometryDraftState(deps.geometryDraftStateForScreen('lineEquation', deps.defaultGeometryDraftForScreen('lineEquation'), 'guided'));
    }
  } else if (deps.currentMode === 'trigonometry') {
    if (deps.isTrigMenuOpen) {
      deps.goBackInTrigonometry();
    } else if (deps.trigScreen === 'functions') {
      deps.setTrigFunctionState(deps.DEFAULT_TRIG_FUNCTION_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen('functions', deps.defaultTrigDraftForScreen('functions'), 'guided'));
    } else if (deps.trigScreen === 'identitySimplify' || deps.trigScreen === 'identityConvert') {
      deps.setTrigIdentityState(deps.DEFAULT_TRIG_IDENTITY_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen(deps.trigScreen, deps.defaultTrigDraftForScreen(deps.trigScreen), 'guided'));
    } else if (deps.trigScreen === 'equationSolve') {
      deps.setTrigEquationState((currentState: any) => ({ ...deps.DEFAULT_TRIG_EQUATION_STATE, angleUnit: currentState.angleUnit }));
      deps.setTrigDraftState(deps.trigDraftStateForScreen('equationSolve', deps.defaultTrigDraftForScreen('equationSolve'), 'guided'));
    } else if (deps.trigScreen === 'rightTriangle') {
      deps.setRightTriangleState(deps.DEFAULT_RIGHT_TRIANGLE_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen('rightTriangle', deps.defaultTrigDraftForScreen('rightTriangle'), 'guided'));
    } else if (deps.trigScreen === 'sineRule') {
      deps.setSineRuleState(deps.DEFAULT_SINE_RULE_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen('sineRule', deps.defaultTrigDraftForScreen('sineRule'), 'guided'));
    } else if (deps.trigScreen === 'cosineRule') {
      deps.setCosineRuleState(deps.DEFAULT_COSINE_RULE_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen('cosineRule', deps.defaultTrigDraftForScreen('cosineRule'), 'guided'));
    } else if (deps.trigScreen === 'angleConvert') {
      deps.setAngleConvertState(deps.DEFAULT_ANGLE_CONVERT_STATE);
      deps.setTrigDraftState(deps.trigDraftStateForScreen('angleConvert', deps.defaultTrigDraftForScreen('angleConvert'), 'guided'));
    } else if (deps.trigScreen === 'specialAngles') {
      deps.setSpecialAnglesExpression('\\cos\\left(\\frac{\\pi}{3}\\right)');
      deps.setTrigDraftState(deps.trigDraftStateForScreen('specialAngles', deps.defaultTrigDraftForScreen('specialAngles'), 'guided'));
    }
  } else if (deps.currentMode === 'advancedCalculus') {
    if (deps.isAdvancedCalcMenuOpen) {
      deps.goBackInAdvancedCalc();
    } else if (deps.advancedCalcScreen === 'indefiniteIntegral') {
      deps.setAdvancedIndefiniteIntegral(deps.DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
    } else if (deps.advancedCalcScreen === 'definiteIntegral') {
      deps.setAdvancedDefiniteIntegral(deps.DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
    } else if (deps.advancedCalcScreen === 'improperIntegral') {
      deps.setAdvancedImproperIntegral(deps.DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
    } else if (deps.advancedCalcScreen === 'finiteLimit') {
      deps.setAdvancedFiniteLimit(deps.DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
    } else if (deps.advancedCalcScreen === 'infiniteLimit') {
      deps.setAdvancedInfiniteLimit(deps.DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
    } else if (deps.advancedCalcScreen === 'maclaurin') {
      deps.setMaclaurinState(deps.DEFAULT_MACLAURIN_STATE);
    } else if (deps.advancedCalcScreen === 'taylor') {
      deps.setTaylorState(deps.DEFAULT_TAYLOR_STATE);
    } else if (deps.advancedCalcScreen === 'partialDerivative') {
      deps.setPartialDerivativeState(deps.DEFAULT_PARTIAL_DERIVATIVE_STATE);
    } else if (deps.advancedCalcScreen === 'odeFirstOrder') {
      deps.setFirstOrderOdeState(deps.DEFAULT_FIRST_ORDER_ODE_STATE);
    } else if (deps.advancedCalcScreen === 'odeSecondOrder') {
      deps.setSecondOrderOdeState(deps.DEFAULT_SECOND_ORDER_ODE_STATE);
    } else if (deps.advancedCalcScreen === 'odeNumericIvp') {
      deps.setNumericIvpState(deps.DEFAULT_NUMERIC_IVP_STATE);
    }
  } else if (deps.currentMode === 'calculate') {
    if (deps.calculateScreen === 'standard') {
      deps.setCalculateLatex('');
    } else if (deps.calculateScreen === 'calculusHome') {
      deps.openCalculateScreen('standard');
    } else if (deps.calculateScreen === 'derivative') {
      deps.setDerivativeWorkbench(deps.DEFAULT_DERIVATIVE_WORKBENCH);
    } else if (deps.calculateScreen === 'derivativePoint') {
      deps.setDerivativePointWorkbench(deps.DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    } else if (deps.calculateScreen === 'integral') {
      deps.setIntegralWorkbench((currentState: any) => ({ ...deps.DEFAULT_INTEGRAL_WORKBENCH, kind: currentState.kind }));
    } else if (deps.calculateScreen === 'limit') {
      deps.setLimitWorkbench((currentState: any) => ({ ...deps.DEFAULT_LIMIT_WORKBENCH, direction: currentState.direction, targetKind: currentState.targetKind }));
    }
  } else if (deps.currentMode === 'equation') {
    if (deps.isEquationMenuScreen(deps.equationScreen)) {
      deps.goBackInEquation();
    } else if (deps.equationScreen === 'symbolic') {
      deps.setEquationLatex('');
    } else if (deps.equationScreen === 'quadratic') {
      deps.setQuadraticCoefficients([...deps.DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
    } else if (deps.equationScreen === 'cubic') {
      deps.setCubicCoefficients([...deps.DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
    } else if (deps.equationScreen === 'quartic') {
      deps.setQuarticCoefficients([...deps.DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
    } else if (deps.equationScreen === 'linear2') {
      deps.setSystem2(deps.emptySystem(2));
    } else {
      deps.setSystem3(deps.emptySystem(3));
    }
  } else if (deps.currentMode === 'table') {
    deps.setTablePrimaryLatex('');
    deps.setTableSecondaryLatex('');
    deps.setTableResponse(null);
  }

  deps.setDisplayOutcome(null);
}
