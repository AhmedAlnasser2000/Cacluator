import { describe, expect, it, vi } from 'vitest';
import { executePrimaryActionWithDeps } from './primaryActionRouter';

function createDeps(): Parameters<typeof executePrimaryActionWithDeps>[0] {
  return {
    isLauncherOpen: false,
    currentMode: 'calculate',
    guideRouteScreen: 'home' as const,
    isAdvancedCalcMenuOpen: false,
    isGeometryMenuOpen: false,
    isStatisticsMenuOpen: false,
    isTrigMenuOpen: false,
    isCalculateMenuOpen: false,
    isCalculateToolOpen: false,
    equationScreen: 'symbolic' as const,
    isGeometryDraftFocused: vi.fn().mockReturnValue(false),
    isStatisticsDraftFocused: vi.fn().mockReturnValue(false),
    isTrigDraftFocused: vi.fn().mockReturnValue(false),
    openSelectedLauncherEntry: vi.fn(),
    launchGuideExample: vi.fn(),
    openSelectedGuideEntry: vi.fn(),
    openSelectedAdvancedCalcMenuEntry: vi.fn(),
    runAdvancedCalcAction: vi.fn(),
    openSelectedGeometryMenuEntry: vi.fn(),
    runGeometryAction: vi.fn(),
    openSelectedStatisticsMenuEntry: vi.fn(),
    runStatisticsAction: vi.fn(),
    openSelectedTrigMenuEntry: vi.fn(),
    runTrigAction: vi.fn(),
    openSelectedCalculateMenuEntry: vi.fn(),
    runCalculateWorkbenchAction: vi.fn(),
    runCalculateActionEvaluate: vi.fn(),
    openSelectedEquationMenuEntry: vi.fn(),
    runEquationAction: vi.fn(),
    runTableAction: vi.fn(),
  };
}

describe('primaryActionRouter', () => {
  it('runs calculate evaluate in standard calculate mode', () => {
    const deps = createDeps();
    executePrimaryActionWithDeps(deps);
    expect(deps.runCalculateActionEvaluate).toHaveBeenCalledTimes(1);
  });

  it('opens trig menu entry when trigonometry menu is open and draft is not focused', () => {
    const deps = createDeps();
    deps.currentMode = 'trigonometry';
    deps.isTrigMenuOpen = true;
    deps.isTrigDraftFocused = vi.fn().mockReturnValue(false);

    executePrimaryActionWithDeps(deps);

    expect(deps.openSelectedTrigMenuEntry).toHaveBeenCalledTimes(1);
    expect(deps.runTrigAction).not.toHaveBeenCalled();
  });

  it('runs table action in table mode', () => {
    const deps = createDeps();
    deps.currentMode = 'table';
    executePrimaryActionWithDeps(deps);
    expect(deps.runTableAction).toHaveBeenCalledTimes(1);
  });
});
