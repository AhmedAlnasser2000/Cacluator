/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MutableRefObject, RefObject } from 'react';
import type { EquationScreen, ModeId } from '../../types/calculator';

type RouteMetaLike = {
  focusTarget?: string;
};

type FocusCurrentSurfaceDeps = {
  currentMode: ModeId;
  calculateScreen: string;
  advancedCalcScreen: string;
  trigScreen: string;
  geometryScreen: string;
  statisticsScreen: string;
  equationScreen: EquationScreen;
  statisticsWorkingSource: 'dataset' | 'frequencyTable';
  calculateRouteMeta: RouteMetaLike | null;
  advancedCalcRouteMeta: RouteMetaLike | null;
  trigRouteMeta: RouteMetaLike | null;
  geometryRouteMeta: RouteMetaLike | null;
  statisticsRouteMeta: RouteMetaLike | null;
  guideRouteMeta: RouteMetaLike | null;
  equationRouteMeta: RouteMetaLike | null;
  activeFieldRef: MutableRefObject<any>;
  mainFieldRef: RefObject<any>;
  calculateMenuPanelRef: RefObject<HTMLDivElement | null>;
  derivativeFieldRef: RefObject<any>;
  derivativePointFieldRef: RefObject<any>;
  derivativePointValueRef: RefObject<HTMLInputElement | null>;
  integralFieldRef: RefObject<any>;
  integralLowerRef: RefObject<HTMLInputElement | null>;
  limitFieldRef: RefObject<any>;
  limitTargetRef: RefObject<HTMLInputElement | null>;
  advancedMenuPanelRef: RefObject<HTMLDivElement | null>;
  advancedIndefiniteFieldRef: RefObject<any>;
  advancedDefiniteFieldRef: RefObject<any>;
  advancedImproperFieldRef: RefObject<any>;
  advancedFiniteLimitFieldRef: RefObject<any>;
  advancedInfiniteLimitFieldRef: RefObject<any>;
  maclaurinFieldRef: RefObject<any>;
  taylorFieldRef: RefObject<any>;
  partialDerivativeFieldRef: RefObject<any>;
  firstOrderOdeLhsFieldRef: RefObject<any>;
  secondOrderA2Ref: RefObject<HTMLInputElement | null>;
  numericIvpFieldRef: RefObject<any>;
  trigMenuPanelRef: RefObject<HTMLDivElement | null>;
  rightTriangleSideARef: RefObject<HTMLInputElement | null>;
  sineRuleSideARef: RefObject<HTMLInputElement | null>;
  cosineRuleSideARef: RefObject<HTMLInputElement | null>;
  angleConvertValueRef: RefObject<HTMLInputElement | null>;
  geometryMenuPanelRef: RefObject<HTMLDivElement | null>;
  squareSideRef: RefObject<HTMLInputElement | null>;
  rectangleWidthRef: RefObject<HTMLInputElement | null>;
  triangleAreaBaseRef: RefObject<HTMLInputElement | null>;
  triangleHeronARef: RefObject<HTMLInputElement | null>;
  circleRadiusRef: RefObject<HTMLInputElement | null>;
  arcSectorRadiusRef: RefObject<HTMLInputElement | null>;
  cubeSideRef: RefObject<HTMLInputElement | null>;
  cuboidLengthRef: RefObject<HTMLInputElement | null>;
  cylinderRadiusRef: RefObject<HTMLInputElement | null>;
  coneRadiusRef: RefObject<HTMLInputElement | null>;
  sphereRadiusRef: RefObject<HTMLInputElement | null>;
  distanceP1XRef: RefObject<HTMLInputElement | null>;
  midpointP1XRef: RefObject<HTMLInputElement | null>;
  slopeP1XRef: RefObject<HTMLInputElement | null>;
  lineEquationP1XRef: RefObject<HTMLInputElement | null>;
  statisticsMenuPanelRef: RefObject<HTMLDivElement | null>;
  statisticsBinomialNRef: RefObject<HTMLInputElement | null>;
  statisticsNormalMeanRef: RefObject<HTMLInputElement | null>;
  statisticsPoissonLambdaRef: RefObject<HTMLInputElement | null>;
  statisticsRegressionXRef: RefObject<HTMLInputElement | null>;
  statisticsCorrelationXRef: RefObject<HTMLInputElement | null>;
  statisticsFrequencyValueRef: RefObject<HTMLInputElement | null>;
  statisticsDatasetRef: RefObject<HTMLTextAreaElement | null>;
  guideMenuPanelRef: RefObject<HTMLDivElement | null>;
  guideSearchInputRef: RefObject<HTMLInputElement | null>;
  equationMenuPanelRef: RefObject<HTMLDivElement | null>;
  polynomialInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  systemInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  focusTrigEditor: () => void;
  focusGeometryEditor: () => void;
  focusStatisticsEditor: () => void;
  isPolynomialEquationScreen: (screen: EquationScreen) => boolean;
  isSimultaneousEquationScreen: (screen: EquationScreen) => boolean;
};

export function focusCurrentSurface(deps: FocusCurrentSurfaceDeps) {
  if (deps.currentMode === 'calculate') {
    if (deps.calculateRouteMeta?.focusTarget === 'menu') {
      deps.calculateMenuPanelRef.current?.focus();
      return;
    }

    if (deps.calculateRouteMeta?.focusTarget === 'body') {
      const targetField =
        deps.calculateScreen === 'derivative'
          ? deps.derivativeFieldRef.current
          : deps.calculateScreen === 'derivativePoint'
            ? deps.derivativePointFieldRef.current
            : deps.calculateScreen === 'integral'
              ? deps.integralFieldRef.current
              : deps.calculateScreen === 'limit'
                ? deps.limitFieldRef.current
                : null;
      targetField?.focus?.();
      deps.activeFieldRef.current = targetField;
      return;
    }

    if (deps.calculateRouteMeta?.focusTarget === 'point') {
      deps.derivativePointValueRef.current?.focus();
      return;
    }

    if (deps.calculateRouteMeta?.focusTarget === 'bounds') {
      deps.integralLowerRef.current?.focus();
      return;
    }

    if (deps.calculateRouteMeta?.focusTarget === 'target') {
      deps.limitTargetRef.current?.focus();
      return;
    }

    deps.mainFieldRef.current?.focus?.();
    deps.activeFieldRef.current = deps.mainFieldRef.current;
    return;
  }

  if (deps.currentMode === 'advancedCalculus' && deps.advancedCalcRouteMeta) {
    if (deps.advancedCalcRouteMeta.focusTarget === 'menu') {
      deps.advancedMenuPanelRef.current?.focus();
      return;
    }

    if (deps.advancedCalcScreen === 'indefiniteIntegral') {
      deps.advancedIndefiniteFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.advancedIndefiniteFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'definiteIntegral') {
      deps.advancedDefiniteFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.advancedDefiniteFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'improperIntegral') {
      deps.advancedImproperFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.advancedImproperFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'finiteLimit') {
      deps.advancedFiniteLimitFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.advancedFiniteLimitFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'infiniteLimit') {
      deps.advancedInfiniteLimitFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.advancedInfiniteLimitFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'maclaurin') {
      deps.maclaurinFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.maclaurinFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'taylor') {
      deps.taylorFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.taylorFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'partialDerivative') {
      deps.partialDerivativeFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.partialDerivativeFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'odeFirstOrder') {
      deps.firstOrderOdeLhsFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.firstOrderOdeLhsFieldRef.current;
      return;
    }

    if (deps.advancedCalcScreen === 'odeSecondOrder') {
      deps.secondOrderA2Ref.current?.focus();
      return;
    }

    if (deps.advancedCalcScreen === 'odeNumericIvp') {
      deps.numericIvpFieldRef.current?.focus?.();
      deps.activeFieldRef.current = deps.numericIvpFieldRef.current;
      return;
    }
  }

  if (deps.currentMode === 'trigonometry' && deps.trigRouteMeta) {
    if (deps.trigRouteMeta.focusTarget === 'menu') {
      deps.trigMenuPanelRef.current?.focus();
      return;
    }

    if (deps.trigRouteMeta.focusTarget === 'editor') {
      deps.focusTrigEditor();
      return;
    }

    if (deps.trigScreen === 'rightTriangle') {
      deps.rightTriangleSideARef.current?.focus();
      return;
    }

    if (deps.trigScreen === 'sineRule') {
      deps.sineRuleSideARef.current?.focus();
      return;
    }

    if (deps.trigScreen === 'cosineRule') {
      deps.cosineRuleSideARef.current?.focus();
      return;
    }

    if (deps.trigScreen === 'angleConvert') {
      deps.angleConvertValueRef.current?.focus();
      return;
    }
  }

  if (deps.currentMode === 'geometry' && deps.geometryRouteMeta) {
    if (deps.geometryRouteMeta.focusTarget === 'menu') {
      deps.geometryMenuPanelRef.current?.focus();
      return;
    }

    if (deps.geometryRouteMeta.focusTarget === 'editor') {
      deps.focusGeometryEditor();
      return;
    }

    const geometryRef =
      deps.geometryScreen === 'square'
        ? deps.squareSideRef
        : deps.geometryScreen === 'rectangle'
          ? deps.rectangleWidthRef
          : deps.geometryScreen === 'triangleArea'
            ? deps.triangleAreaBaseRef
            : deps.geometryScreen === 'triangleHeron'
              ? deps.triangleHeronARef
              : deps.geometryScreen === 'circle'
                ? deps.circleRadiusRef
                : deps.geometryScreen === 'arcSector'
                  ? deps.arcSectorRadiusRef
                  : deps.geometryScreen === 'cube'
                    ? deps.cubeSideRef
                    : deps.geometryScreen === 'cuboid'
                      ? deps.cuboidLengthRef
                      : deps.geometryScreen === 'cylinder'
                        ? deps.cylinderRadiusRef
                        : deps.geometryScreen === 'cone'
                          ? deps.coneRadiusRef
                          : deps.geometryScreen === 'sphere'
                            ? deps.sphereRadiusRef
                            : deps.geometryScreen === 'distance'
                              ? deps.distanceP1XRef
                              : deps.geometryScreen === 'midpoint'
                                ? deps.midpointP1XRef
                                : deps.geometryScreen === 'slope'
                                  ? deps.slopeP1XRef
                                  : deps.geometryScreen === 'lineEquation'
                                    ? deps.lineEquationP1XRef
                                    : null;
    geometryRef?.current?.focus();
    if (geometryRef) {
      return;
    }
  }

  if (deps.currentMode === 'statistics' && deps.statisticsRouteMeta) {
    if (deps.statisticsRouteMeta.focusTarget === 'menu') {
      deps.statisticsMenuPanelRef.current?.focus();
      return;
    }

    if (deps.statisticsRouteMeta.focusTarget === 'editor') {
      deps.focusStatisticsEditor();
      return;
    }

    const statisticsRef =
      deps.statisticsScreen === 'binomial'
        ? deps.statisticsBinomialNRef
        : deps.statisticsScreen === 'normal'
          ? deps.statisticsNormalMeanRef
          : deps.statisticsScreen === 'poisson'
            ? deps.statisticsPoissonLambdaRef
            : deps.statisticsScreen === 'regression'
              ? deps.statisticsRegressionXRef
              : deps.statisticsScreen === 'correlation'
                ? deps.statisticsCorrelationXRef
                : deps.statisticsScreen === 'frequency'
                    || (deps.statisticsScreen === 'descriptive' && deps.statisticsWorkingSource === 'frequencyTable')
                  ? deps.statisticsFrequencyValueRef
                  : null;
    if (statisticsRef) {
      statisticsRef.current?.focus();
      return;
    }

    deps.statisticsDatasetRef.current?.focus();
    return;
  }

  if (deps.currentMode === 'guide' && deps.guideRouteMeta) {
    if (deps.guideRouteMeta.focusTarget === 'menu') {
      deps.guideMenuPanelRef.current?.focus();
      return;
    }

    if (deps.guideRouteMeta.focusTarget === 'search') {
      deps.guideSearchInputRef.current?.focus();
    }
    return;
  }

  if (deps.currentMode !== 'equation' || !deps.equationRouteMeta) {
    return;
  }

  if (deps.equationRouteMeta.focusTarget === 'menu') {
    deps.equationMenuPanelRef.current?.focus();
    return;
  }

  if (deps.equationRouteMeta.focusTarget === 'symbolic') {
    deps.mainFieldRef.current?.focus?.();
    deps.activeFieldRef.current = deps.mainFieldRef.current;
    return;
  }

  if (
    deps.equationRouteMeta.focusTarget === 'polynomial'
    && deps.isPolynomialEquationScreen(deps.equationScreen)
  ) {
    deps.polynomialInputRefs.current[deps.equationScreen]?.focus();
    return;
  }

  if (
    deps.equationRouteMeta.focusTarget === 'simultaneous'
    && deps.isSimultaneousEquationScreen(deps.equationScreen)
  ) {
    deps.systemInputRefs.current[deps.equationScreen]?.focus();
  }
}
