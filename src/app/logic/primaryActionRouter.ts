import type { EquationScreen, ModeId } from '../../types/calculator';

type PrimaryActionDeps = {
  isLauncherOpen: boolean;
  currentMode: ModeId;
  guideRouteScreen:
    | 'home'
    | 'domain'
    | 'search'
    | 'symbolLookup'
    | 'modeGuide'
    | 'article';
  isAdvancedCalcMenuOpen: boolean;
  isGeometryMenuOpen: boolean;
  isStatisticsMenuOpen: boolean;
  isTrigMenuOpen: boolean;
  isCalculateMenuOpen: boolean;
  isCalculateToolOpen: boolean;
  equationScreen: EquationScreen;
  isGeometryDraftFocused: () => boolean;
  isStatisticsDraftFocused: () => boolean;
  isTrigDraftFocused: () => boolean;
  openSelectedLauncherEntry: () => void;
  launchGuideExample: () => void;
  openSelectedGuideEntry: () => void;
  openSelectedAdvancedCalcMenuEntry: () => void;
  runAdvancedCalcAction: () => void;
  openSelectedGeometryMenuEntry: () => void;
  runGeometryAction: () => void;
  openSelectedStatisticsMenuEntry: () => void;
  runStatisticsAction: () => void;
  openSelectedTrigMenuEntry: () => void;
  runTrigAction: () => void;
  openSelectedCalculateMenuEntry: () => void;
  runCalculateWorkbenchAction: () => void;
  runCalculateActionEvaluate: () => void;
  openSelectedEquationMenuEntry: () => void;
  runEquationAction: () => void;
  runTableAction: () => void;
};

export function executePrimaryActionWithDeps(deps: PrimaryActionDeps) {
  if (deps.isLauncherOpen) {
    deps.openSelectedLauncherEntry();
    return;
  }

  if (deps.currentMode === 'guide') {
    if (deps.guideRouteScreen === 'article') {
      deps.launchGuideExample();
    } else {
      deps.openSelectedGuideEntry();
    }
    return;
  }

  if (deps.currentMode === 'advancedCalculus') {
    if (deps.isAdvancedCalcMenuOpen) {
      deps.openSelectedAdvancedCalcMenuEntry();
      return;
    }

    deps.runAdvancedCalcAction();
    return;
  }

  if (deps.currentMode === 'geometry') {
    if (deps.isGeometryMenuOpen && !deps.isGeometryDraftFocused()) {
      deps.openSelectedGeometryMenuEntry();
      return;
    }

    deps.runGeometryAction();
    return;
  }

  if (deps.currentMode === 'statistics') {
    if (deps.isStatisticsMenuOpen && !deps.isStatisticsDraftFocused()) {
      deps.openSelectedStatisticsMenuEntry();
      return;
    }

    deps.runStatisticsAction();
    return;
  }

  if (deps.currentMode === 'trigonometry') {
    if (deps.isTrigMenuOpen && !deps.isTrigDraftFocused()) {
      deps.openSelectedTrigMenuEntry();
      return;
    }

    deps.runTrigAction();
    return;
  }

  if (deps.currentMode === 'calculate') {
    if (deps.isCalculateMenuOpen) {
      deps.openSelectedCalculateMenuEntry();
      return;
    }

    if (deps.isCalculateToolOpen) {
      deps.runCalculateWorkbenchAction();
      return;
    }

    deps.runCalculateActionEvaluate();
    return;
  }

  if (deps.currentMode === 'equation') {
    if (
      deps.equationScreen === 'home'
      || deps.equationScreen === 'polynomialMenu'
      || deps.equationScreen === 'simultaneousMenu'
    ) {
      deps.openSelectedEquationMenuEntry();
      return;
    }

    deps.runEquationAction();
    return;
  }

  if (deps.currentMode === 'table') {
    deps.runTableAction();
  }
}

