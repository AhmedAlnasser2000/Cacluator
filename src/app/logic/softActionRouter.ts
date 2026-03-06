import type { CalculateAction, MatrixOperation, ModeId, VectorOperation } from '../../types/calculator';

type SoftActionRouterDeps = {
  actionId: string;
  isLauncherOpen: boolean;
  currentMode: ModeId;
  toggleHistoryOpen: () => void;
  clearCurrentMode: () => void;
  openSelectedLauncherEntry: () => void;
  closeLauncher: () => void;
  openSelectedGuideEntry: () => void;
  openGuideSearch: () => void;
  openGuideSymbols: () => void;
  openGuideModes: () => void;
  copyGuideExample: () => void;
  loadGuideExample: () => void;
  goBackInGuide: () => void;
  exitGuide: () => void;
  openSelectedAdvancedCalcMenuEntry: () => void;
  openAdvancedGuideForScreen: () => void;
  goBackInAdvancedCalc: () => void;
  runAdvancedCalcAction: () => void;
  loadAdvancedCalcToEditor: () => void;
  openAdvancedCalcParentOrHome: () => void;
  isGeometryMenuOpen: boolean;
  isGeometryDraftFocused: () => boolean;
  openSelectedGeometryMenuEntry: () => void;
  runGeometryAction: () => void;
  openGeometryGuideForScreen: () => void;
  goBackInGeometry: () => void;
  openGeometryParentOrHome: () => void;
  isStatisticsMenuOpen: boolean;
  isStatisticsDraftFocused: () => boolean;
  openSelectedStatisticsMenuEntry: () => void;
  runStatisticsAction: () => void;
  openStatisticsGuideForScreen: () => void;
  goBackInStatistics: () => void;
  openStatisticsParentOrHome: () => void;
  isTrigMenuOpen: boolean;
  isTrigDraftFocused: () => boolean;
  openSelectedTrigMenuEntry: () => void;
  runTrigAction: () => void;
  openTrigGuideForScreen: () => void;
  goBackInTrigonometry: () => void;
  sendTrigToCalc: () => void;
  sendTrigToEquation: () => void;
  useTrigGuidedDraft: () => void;
  openTrigParentOrHome: () => void;
  calculateScreen: string;
  runCalculateAction: (action: CalculateAction) => void;
  openSelectedCalculateMenuEntry: () => void;
  openCalculateStandard: () => void;
  runCalculateWorkbenchAction: () => void;
  loadCalculateWorkbenchToEditor: () => void;
  openCalculateCalculusMenu: () => void;
  toggleIntegralKind: () => void;
  cycleLimitDirection: () => void;
  openSelectedEquationMenuEntry: () => void;
  goBackInEquation: () => void;
  openEquationHome: () => void;
  openEquationPolynomialMenu: () => void;
  openEquationSimultaneousMenu: () => void;
  runEquationAction: () => void;
  runMatrixAction: (operation: MatrixOperation) => void;
  runVectorAction: (operation: VectorOperation) => void;
  toggleTableSecondary: () => void;
  runTableAction: () => void;
};

export function handleSoftActionWithDeps(deps: SoftActionRouterDeps) {
  if (deps.isLauncherOpen) {
    if (deps.actionId === 'open') {
      deps.openSelectedLauncherEntry();
    } else if (deps.actionId === 'cancel') {
      deps.closeLauncher();
    }
    return;
  }

  if (deps.actionId === 'history') {
    deps.toggleHistoryOpen();
    return;
  }

  if (deps.actionId === 'clear') {
    deps.clearCurrentMode();
    return;
  }

  if (deps.currentMode === 'guide') {
    if (deps.actionId === 'open') {
      deps.openSelectedGuideEntry();
      return;
    }

    if (deps.actionId === 'search') {
      deps.openGuideSearch();
      return;
    }

    if (deps.actionId === 'symbols') {
      deps.openGuideSymbols();
      return;
    }

    if (deps.actionId === 'modes') {
      deps.openGuideModes();
      return;
    }

    if (deps.actionId === 'copy') {
      deps.copyGuideExample();
      return;
    }

    if (deps.actionId === 'load') {
      deps.loadGuideExample();
      return;
    }

    if (deps.actionId === 'back') {
      deps.goBackInGuide();
      return;
    }

    if (deps.actionId === 'exit') {
      deps.exitGuide();
    }
    return;
  }

  if (deps.currentMode === 'advancedCalculus') {
    if (deps.actionId === 'open') {
      deps.openSelectedAdvancedCalcMenuEntry();
      return;
    }

    if (deps.actionId === 'guide') {
      deps.openAdvancedGuideForScreen();
      return;
    }

    if (deps.actionId === 'back' || deps.actionId === 'exit') {
      deps.goBackInAdvancedCalc();
      return;
    }

    if (deps.actionId === 'evaluate') {
      deps.runAdvancedCalcAction();
      return;
    }

    if (deps.actionId === 'toEditor') {
      deps.loadAdvancedCalcToEditor();
      return;
    }

    if (deps.actionId === 'menu') {
      deps.openAdvancedCalcParentOrHome();
      return;
    }

    return;
  }

  if (deps.currentMode === 'geometry') {
    if (deps.actionId === 'open') {
      if (deps.isGeometryMenuOpen && !deps.isGeometryDraftFocused()) {
        deps.openSelectedGeometryMenuEntry();
      } else {
        deps.runGeometryAction();
      }
      return;
    }

    if (deps.actionId === 'guide') {
      deps.openGeometryGuideForScreen();
      return;
    }

    if (deps.actionId === 'back' || deps.actionId === 'exit') {
      deps.goBackInGeometry();
      return;
    }

    if (deps.actionId === 'evaluate') {
      deps.runGeometryAction();
      return;
    }

    if (deps.actionId === 'menu') {
      deps.openGeometryParentOrHome();
      return;
    }

    return;
  }

  if (deps.currentMode === 'statistics') {
    if (deps.actionId === 'open') {
      if (deps.isStatisticsMenuOpen && !deps.isStatisticsDraftFocused()) {
        deps.openSelectedStatisticsMenuEntry();
      } else {
        deps.runStatisticsAction();
      }
      return;
    }

    if (deps.actionId === 'guide') {
      deps.openStatisticsGuideForScreen();
      return;
    }

    if (deps.actionId === 'back' || deps.actionId === 'exit') {
      deps.goBackInStatistics();
      return;
    }

    if (deps.actionId === 'evaluate') {
      deps.runStatisticsAction();
      return;
    }

    if (deps.actionId === 'menu') {
      deps.openStatisticsParentOrHome();
      return;
    }

    return;
  }

  if (deps.currentMode === 'trigonometry') {
    if (deps.actionId === 'open') {
      if (deps.isTrigMenuOpen && !deps.isTrigDraftFocused()) {
        deps.openSelectedTrigMenuEntry();
      } else {
        deps.runTrigAction();
      }
      return;
    }

    if (deps.actionId === 'guide') {
      deps.openTrigGuideForScreen();
      return;
    }

    if (deps.actionId === 'back' || deps.actionId === 'exit') {
      deps.goBackInTrigonometry();
      return;
    }

    if (deps.actionId === 'evaluate') {
      deps.runTrigAction();
      return;
    }

    if (deps.actionId === 'sendToCalc') {
      deps.sendTrigToCalc();
      return;
    }

    if (deps.actionId === 'sendToEquation') {
      deps.sendTrigToEquation();
      return;
    }

    if (deps.actionId === 'useInTrig') {
      deps.useTrigGuidedDraft();
      return;
    }

    if (deps.actionId === 'menu') {
      deps.openTrigParentOrHome();
      return;
    }

    return;
  }

  if (deps.currentMode === 'calculate') {
    if (deps.calculateScreen === 'standard') {
      deps.runCalculateAction(deps.actionId === 'numeric' ? 'evaluate' : (deps.actionId as CalculateAction));
      return;
    }

    if (deps.calculateScreen === 'calculusHome') {
      if (deps.actionId === 'open') {
        deps.openSelectedCalculateMenuEntry();
        return;
      }

      if (deps.actionId === 'standard' || deps.actionId === 'back') {
        deps.openCalculateStandard();
        return;
      }

      return;
    }

    if (deps.actionId === 'evaluate') {
      deps.runCalculateWorkbenchAction();
      return;
    }

    if (deps.actionId === 'toEditor') {
      deps.loadCalculateWorkbenchToEditor();
      return;
    }

    if (deps.actionId === 'calculusMenu') {
      deps.openCalculateCalculusMenu();
      return;
    }

    if (deps.actionId === 'toggleIntegralKind') {
      deps.toggleIntegralKind();
      return;
    }

    if (deps.actionId === 'cycleLimitDirection') {
      deps.cycleLimitDirection();
      return;
    }

    return;
  }

  if (deps.currentMode === 'equation') {
    if (deps.actionId === 'open') {
      deps.openSelectedEquationMenuEntry();
      return;
    }

    if (deps.actionId === 'back') {
      deps.goBackInEquation();
      return;
    }

    if (deps.actionId === 'menu') {
      deps.openEquationHome();
      return;
    }

    if (deps.actionId === 'polynomialMenu') {
      deps.openEquationPolynomialMenu();
      return;
    }

    if (deps.actionId === 'simultaneousMenu') {
      deps.openEquationSimultaneousMenu();
      return;
    }

    deps.runEquationAction();
    return;
  }

  if (deps.currentMode === 'matrix') {
    deps.runMatrixAction(deps.actionId as MatrixOperation);
    return;
  }

  if (deps.currentMode === 'vector') {
    deps.runVectorAction(deps.actionId as VectorOperation);
    return;
  }

  if (deps.actionId === 'toggleSecondary') {
    deps.toggleTableSecondary();
    return;
  }

  deps.runTableAction();
}

