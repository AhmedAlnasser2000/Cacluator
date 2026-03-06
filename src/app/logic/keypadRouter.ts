import type { KeypadButton } from '../../lib/menu';
import type { ModeId } from '../../types/calculator';

type KeypadRouterDeps = {
  button: KeypadButton;
  isLauncherOpen: boolean;
  currentMode: ModeId;
  isCalculateMenuOpen: boolean;
  isAdvancedCalcMenuOpen: boolean;
  isGeometryMenuOpen: boolean;
  isStatisticsMenuOpen: boolean;
  isTrigMenuOpen: boolean;
  isEquationMenuOpen: boolean;
  isGeometryDraftFocused: () => boolean;
  isStatisticsDraftFocused: () => boolean;
  handleLauncherDigit: (digit: string) => void;
  goBackInLauncher: () => void;
  moveCurrentLauncherSelection: (delta: number) => void;
  openSelectedLauncherEntry: () => void;
  openGuideDigitEntry: (digit: string) => void;
  openGuideSearch: () => void;
  goBackInGuide: () => void;
  moveCurrentGuideSelection: (delta: number) => void;
  executePrimaryAction: () => void;
  openCalculateMenuDigitEntry: (digit: string) => void;
  toggleHistoryOpen: () => void;
  openCalculateStandard: () => void;
  moveCurrentCalculateMenuSelection: (delta: number) => void;
  openSelectedCalculateMenuEntry: () => void;
  openAdvancedCalcMenuDigitEntry: (digit: string) => void;
  goBackInAdvancedCalc: () => void;
  moveCurrentAdvancedCalcMenuSelection: (delta: number) => void;
  openSelectedAdvancedCalcMenuEntry: () => void;
  openGeometryMenuDigitEntry: (digit: string) => void;
  goBackInGeometry: () => void;
  moveCurrentGeometryMenuSelection: (delta: number) => void;
  openSelectedGeometryMenuEntry: () => void;
  openStatisticsMenuDigitEntry: (digit: string) => void;
  goBackInStatistics: () => void;
  moveCurrentStatisticsMenuSelection: (delta: number) => void;
  openSelectedStatisticsMenuEntry: () => void;
  openTrigMenuDigitEntry: (digit: string) => void;
  goBackInTrigonometry: () => void;
  moveCurrentTrigMenuSelection: (delta: number) => void;
  openSelectedTrigMenuEntry: () => void;
  openEquationMenuDigitEntry: (digit: string) => void;
  clearCurrentMode: () => void;
  moveCurrentEquationMenuSelection: (delta: number) => void;
  openSelectedEquationMenuEntry: () => void;
  insertLatex: (latex: string) => void;
  deleteBackward: () => void;
  moveToPreviousChar: () => void;
  moveToNextChar: () => void;
  cycleAngleUnit: () => void;
  openLauncher: () => void;
};

export function handleKeypadWithDeps(deps: KeypadRouterDeps) {
  if (deps.isLauncherOpen) {
    if (/^\d$/.test(deps.button.id)) {
      deps.handleLauncherDigit(deps.button.id);
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInLauncher();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentLauncherSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentLauncherSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedLauncherEntry();
      return;
    }

    return;
  }

  if (deps.currentMode === 'guide') {
    if (/^\d$/.test(deps.button.id)) {
      deps.openGuideDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.openGuideSearch();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInGuide();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentGuideSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentGuideSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.executePrimaryAction();
      return;
    }
  }

  if (deps.currentMode === 'calculate' && deps.isCalculateMenuOpen) {
    if (/^[1-4]$/.test(deps.button.id)) {
      deps.openCalculateMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.toggleHistoryOpen();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.openCalculateStandard();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentCalculateMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentCalculateMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedCalculateMenuEntry();
      return;
    }
  }

  if (deps.currentMode === 'advancedCalculus' && deps.isAdvancedCalcMenuOpen) {
    if (/^\d$/.test(deps.button.id)) {
      deps.openAdvancedCalcMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.toggleHistoryOpen();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInAdvancedCalc();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentAdvancedCalcMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentAdvancedCalcMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedAdvancedCalcMenuEntry();
      return;
    }
  }

  if (deps.currentMode === 'geometry' && deps.isGeometryMenuOpen && !deps.isGeometryDraftFocused()) {
    if (/^\d$/.test(deps.button.id)) {
      deps.openGeometryMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.toggleHistoryOpen();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInGeometry();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentGeometryMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentGeometryMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedGeometryMenuEntry();
      return;
    }
  }

  if (deps.currentMode === 'statistics' && deps.isStatisticsMenuOpen && !deps.isStatisticsDraftFocused()) {
    if (/^\d$/.test(deps.button.id)) {
      deps.openStatisticsMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInStatistics();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentStatisticsMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentStatisticsMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedStatisticsMenuEntry();
      return;
    }
  }

  if (deps.currentMode === 'trigonometry' && deps.isTrigMenuOpen) {
    if (/^\d$/.test(deps.button.id)) {
      deps.openTrigMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.toggleHistoryOpen();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.goBackInTrigonometry();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentTrigMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentTrigMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedTrigMenuEntry();
      return;
    }
  }

  if (deps.currentMode === 'equation' && deps.isEquationMenuOpen) {
    if (/^[1-3]$/.test(deps.button.id)) {
      deps.openEquationMenuDigitEntry(deps.button.id);
      return;
    }

    if (deps.button.command === 'history') {
      deps.toggleHistoryOpen();
      return;
    }

    if (deps.button.command === 'clear') {
      deps.clearCurrentMode();
      return;
    }

    if (deps.button.command === 'cursor-left') {
      deps.moveCurrentEquationMenuSelection(-1);
      return;
    }

    if (deps.button.command === 'cursor-right') {
      deps.moveCurrentEquationMenuSelection(1);
      return;
    }

    if (deps.button.command === 'evaluate') {
      deps.openSelectedEquationMenuEntry();
      return;
    }
  }

  if (deps.button.latex) {
    deps.insertLatex(deps.button.latex);
    return;
  }

  if (deps.button.command === 'history') deps.toggleHistoryOpen();
  if (deps.button.command === 'clear') deps.clearCurrentMode();
  if (deps.button.command === 'delete') deps.deleteBackward();
  if (deps.button.command === 'cursor-left') deps.moveToPreviousChar();
  if (deps.button.command === 'cursor-right') deps.moveToNextChar();
  if (deps.button.command === 'cycle-angle') deps.cycleAngleUnit();
  if (deps.button.command === 'open-menu') deps.openLauncher();
  if (deps.button.command === 'evaluate') deps.executePrimaryAction();
}
