import type { CalculateScreen, EquationScreen, ModeId } from '../../types/calculator';

type ActiveExpressionContext = {
  isLauncherOpen: boolean;
  isEquationMenuOpen: boolean;
  isTrigMenuOpen: boolean;
  isStatisticsMenuOpen: boolean;
  currentMode: ModeId;
  calculateScreen: CalculateScreen;
  calculateLatex: string;
  calculateWorkbenchExpressionLatex: string;
  equationInputLatex: string;
  isAdvancedCalcMenuOpen: boolean;
  advancedCalcWorkbenchExpression: string;
  trigDraftLatex: string;
  statisticsDraftLatex: string;
  geometryDraftLatex: string;
  tablePrimaryLatex: string;
};

type EditExpressionDeps = {
  currentMode: ModeId;
  focusTrigEditor: () => void;
  focusStatisticsEditor: () => void;
  focusGeometryEditor: () => void;
  setClipboardNotice: (notice: string) => void;
  loadLatexIntoEditor: (latex: string) => void;
  getActiveExpressionLatex: () => string;
};

type PasteIntoEditorDeps = {
  isLauncherOpen: boolean;
  currentMode: ModeId;
  geometryEditorIsEditable: boolean;
  statisticsEditorIsEditable: boolean;
  trigEditorIsEditable: boolean;
  equationScreen: EquationScreen;
  activeFieldRef: { current: { focus?: () => void; insert: (text: string) => void } | null };
  geometryDraftFieldRef: { current: { insert: (text: string) => void } | null };
  statisticsDraftFieldRef: { current: { insert: (text: string) => void } | null };
  trigDraftFieldRef: { current: { insert: (text: string) => void } | null };
  focusGeometryEditor: () => void;
  focusStatisticsEditor: () => void;
  focusTrigEditor: () => void;
  setClipboardNotice: (notice: string) => void;
  loadLatexIntoEditor: (latex: string) => void;
};

export function activeExpressionLatexFromContext(context: ActiveExpressionContext) {
  if (
    context.isLauncherOpen
    || context.isEquationMenuOpen
    || context.isTrigMenuOpen
    || context.isStatisticsMenuOpen
  ) {
    return '';
  }

  if (context.currentMode === 'calculate') {
    return context.calculateScreen === 'standard'
      ? context.calculateLatex
      : context.calculateWorkbenchExpressionLatex;
  }

  if (context.currentMode === 'equation') {
    return context.equationInputLatex;
  }

  if (context.currentMode === 'advancedCalculus') {
    return context.isAdvancedCalcMenuOpen ? '' : context.advancedCalcWorkbenchExpression;
  }

  if (context.currentMode === 'trigonometry') {
    return context.trigDraftLatex;
  }

  if (context.currentMode === 'statistics') {
    return context.statisticsDraftLatex;
  }

  if (context.currentMode === 'geometry') {
    return context.geometryDraftLatex;
  }

  if (context.currentMode === 'table') {
    return context.tablePrimaryLatex;
  }

  return '';
}

export function editActiveExpressionWithDeps(deps: EditExpressionDeps) {
  if (deps.currentMode === 'trigonometry') {
    deps.focusTrigEditor();
    deps.setClipboardNotice('Trigonometry editor focused');
    return;
  }

  if (deps.currentMode === 'statistics') {
    deps.focusStatisticsEditor();
    deps.setClipboardNotice('Statistics editor focused');
    return;
  }

  if (deps.currentMode === 'geometry') {
    deps.focusGeometryEditor();
    deps.setClipboardNotice('Geometry editor focused');
    return;
  }

  deps.loadLatexIntoEditor(deps.getActiveExpressionLatex());
}

export async function pasteIntoEditorWithDeps(deps: PasteIntoEditorDeps) {
  try {
    if (!navigator.clipboard?.readText) {
      deps.setClipboardNotice('Paste unavailable');
      return;
    }

    const text = await navigator.clipboard.readText();
    if (
      !deps.isLauncherOpen
      && (deps.currentMode === 'calculate'
        || deps.currentMode === 'advancedCalculus'
        || deps.currentMode === 'trigonometry'
        || (deps.currentMode === 'geometry' && deps.geometryEditorIsEditable)
        || deps.currentMode === 'statistics'
        || (deps.currentMode === 'equation' && deps.equationScreen === 'symbolic'))
      && deps.activeFieldRef.current
    ) {
      deps.activeFieldRef.current.focus?.();
      deps.activeFieldRef.current.insert(text);
      deps.setClipboardNotice('Pasted into editor');
      return;
    }

    if (deps.currentMode === 'geometry' && deps.geometryEditorIsEditable) {
      deps.focusGeometryEditor();
      deps.geometryDraftFieldRef.current?.insert(text);
      deps.setClipboardNotice('Pasted into Geometry editor');
      return;
    }

    if (deps.currentMode === 'statistics' && deps.statisticsEditorIsEditable) {
      deps.focusStatisticsEditor();
      deps.statisticsDraftFieldRef.current?.insert(text);
      deps.setClipboardNotice('Pasted into Statistics editor');
      return;
    }

    if (deps.currentMode === 'trigonometry' && deps.trigEditorIsEditable) {
      deps.focusTrigEditor();
      deps.trigDraftFieldRef.current?.insert(text);
      deps.setClipboardNotice('Pasted into Trigonometry editor');
      return;
    }

    deps.loadLatexIntoEditor(text);
  } catch {
    deps.setClipboardNotice('Clipboard blocked');
  }
}

