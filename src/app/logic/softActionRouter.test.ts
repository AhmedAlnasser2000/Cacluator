import { describe, expect, it, vi } from 'vitest';
import { handleSoftActionWithDeps } from './softActionRouter';

function createDeps(): Parameters<typeof handleSoftActionWithDeps>[0] {
  return {
    actionId: 'history',
    isLauncherOpen: false,
    currentMode: 'calculate',
    toggleHistoryOpen: vi.fn(),
    clearCurrentMode: vi.fn(),
    openSelectedLauncherEntry: vi.fn(),
    closeLauncher: vi.fn(),
    openSelectedGuideEntry: vi.fn(),
    openGuideSearch: vi.fn(),
    openGuideSymbols: vi.fn(),
    openGuideModes: vi.fn(),
    copyGuideExample: vi.fn(),
    loadGuideExample: vi.fn(),
    goBackInGuide: vi.fn(),
    exitGuide: vi.fn(),
    openSelectedAdvancedCalcMenuEntry: vi.fn(),
    openAdvancedGuideForScreen: vi.fn(),
    goBackInAdvancedCalc: vi.fn(),
    runAdvancedCalcAction: vi.fn(),
    loadAdvancedCalcToEditor: vi.fn(),
    openAdvancedCalcParentOrHome: vi.fn(),
    isGeometryMenuOpen: false,
    isGeometryDraftFocused: vi.fn().mockReturnValue(false),
    openSelectedGeometryMenuEntry: vi.fn(),
    runGeometryAction: vi.fn(),
    openGeometryGuideForScreen: vi.fn(),
    goBackInGeometry: vi.fn(),
    openGeometryParentOrHome: vi.fn(),
    isStatisticsMenuOpen: false,
    isStatisticsDraftFocused: vi.fn().mockReturnValue(false),
    openSelectedStatisticsMenuEntry: vi.fn(),
    runStatisticsAction: vi.fn(),
    openStatisticsGuideForScreen: vi.fn(),
    goBackInStatistics: vi.fn(),
    openStatisticsParentOrHome: vi.fn(),
    isTrigMenuOpen: false,
    isTrigDraftFocused: vi.fn().mockReturnValue(false),
    openSelectedTrigMenuEntry: vi.fn(),
    runTrigAction: vi.fn(),
    openTrigGuideForScreen: vi.fn(),
    goBackInTrigonometry: vi.fn(),
    sendTrigToCalc: vi.fn(),
    sendTrigToEquation: vi.fn(),
    useTrigGuidedDraft: vi.fn(),
    openTrigParentOrHome: vi.fn(),
    calculateScreen: 'standard',
    runCalculateAction: vi.fn(),
    openSelectedCalculateMenuEntry: vi.fn(),
    openCalculateStandard: vi.fn(),
    runCalculateWorkbenchAction: vi.fn(),
    loadCalculateWorkbenchToEditor: vi.fn(),
    openCalculateCalculusMenu: vi.fn(),
    toggleIntegralKind: vi.fn(),
    cycleLimitDirection: vi.fn(),
    openSelectedEquationMenuEntry: vi.fn(),
    goBackInEquation: vi.fn(),
    openEquationHome: vi.fn(),
    openEquationPolynomialMenu: vi.fn(),
    openEquationSimultaneousMenu: vi.fn(),
    runEquationAction: vi.fn(),
    runMatrixAction: vi.fn(),
    runVectorAction: vi.fn(),
    toggleTableSecondary: vi.fn(),
    runTableAction: vi.fn(),
  };
}

describe('softActionRouter', () => {
  it('toggles history through the shared handler', () => {
    const deps = createDeps();
    deps.actionId = 'history';

    handleSoftActionWithDeps(deps);
    expect(deps.toggleHistoryOpen).toHaveBeenCalledTimes(1);
  });

  it('routes trig sendToEquation action to explicit handoff', () => {
    const deps = createDeps();
    deps.currentMode = 'trigonometry';
    deps.actionId = 'sendToEquation';

    handleSoftActionWithDeps(deps);
    expect(deps.sendTrigToEquation).toHaveBeenCalledTimes(1);
  });

  it('runs matrix operation in matrix mode', () => {
    const deps = createDeps();
    deps.currentMode = 'matrix';
    deps.actionId = 'det';

    handleSoftActionWithDeps(deps);
    expect(deps.runMatrixAction).toHaveBeenCalledWith('det');
  });
});
