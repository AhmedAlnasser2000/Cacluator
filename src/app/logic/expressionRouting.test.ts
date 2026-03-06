import { describe, expect, it, vi } from 'vitest';
import {
  activeExpressionLatexFromContext,
  editActiveExpressionWithDeps,
  pasteIntoEditorWithDeps,
} from './expressionRouting';

describe('expressionRouting', () => {
  it('returns active trig draft latex in trigonometry mode', () => {
    const latex = activeExpressionLatexFromContext({
      isLauncherOpen: false,
      isEquationMenuOpen: false,
      isTrigMenuOpen: false,
      isStatisticsMenuOpen: false,
      currentMode: 'trigonometry',
      calculateScreen: 'standard',
      calculateLatex: '',
      calculateWorkbenchExpressionLatex: '',
      equationInputLatex: '',
      isAdvancedCalcMenuOpen: false,
      advancedCalcWorkbenchExpression: '',
      trigDraftLatex: '\\sin\\left(x\\right)',
      statisticsDraftLatex: '',
      geometryDraftLatex: '',
      tablePrimaryLatex: '',
    });

    expect(latex).toBe('\\sin\\left(x\\right)');
  });

  it('focuses trig editor instead of sending to calculate', () => {
    const focusTrigEditor = vi.fn();
    const focusStatisticsEditor = vi.fn();
    const focusGeometryEditor = vi.fn();
    const setClipboardNotice = vi.fn();
    const loadLatexIntoEditor = vi.fn();

    editActiveExpressionWithDeps({
      currentMode: 'trigonometry',
      focusTrigEditor,
      focusStatisticsEditor,
      focusGeometryEditor,
      setClipboardNotice,
      loadLatexIntoEditor,
      getActiveExpressionLatex: () => '\\cos\\left(x\\right)',
    });

    expect(focusTrigEditor).toHaveBeenCalledTimes(1);
    expect(setClipboardNotice).toHaveBeenCalledWith('Trigonometry editor focused');
    expect(loadLatexIntoEditor).not.toHaveBeenCalled();
  });

  it('pastes into active editor when a focused field exists', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('\\sin\\left(30\\right)'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'calculate',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
    });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith('\\sin\\left(30\\right)');
    expect(setClipboardNotice).toHaveBeenCalledWith('Pasted into editor');
  });
});

