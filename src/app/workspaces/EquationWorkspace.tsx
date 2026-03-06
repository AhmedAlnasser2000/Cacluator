import type { MutableRefObject, RefObject } from 'react';
import { MathStatic } from '../../components/MathStatic';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import type {
  EquationRouteMeta,
  EquationScreen,
  PolynomialEquationView,
} from '../../types/calculator';

type EquationMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: EquationScreen;
};

type PolynomialMetaLike = {
  title: string;
  coefficientLabels: string[];
};

type EquationWorkspaceProps = {
  routeMeta: EquationRouteMeta | null;
  screen: EquationScreen;
  isMenuOpen: boolean;
  currentMenuScreen: 'home' | 'polynomialMenu' | 'simultaneousMenu' | null;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: EquationMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  onOpenScreen: (screen: EquationScreen) => void;
  onHoverMenuIndex: (screen: 'home' | 'polynomialMenu' | 'simultaneousMenu', index: number) => void;
  system2: number[][];
  system3: number[][];
  systemInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  onSetSystemCell: (size: 2 | 3, row: number, column: number, value: number) => void;
  activePolynomialView: PolynomialEquationView | null;
  activePolynomialMeta: PolynomialMetaLike | null;
  activePolynomialCoefficients: number[] | null;
  polynomialInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  onSetPolynomialCoefficient: (view: PolynomialEquationView, index: number, value: number) => void;
  polynomialTemplateLatex: (view: PolynomialEquationView) => string;
  buildPolynomialEquationLatex: (view: PolynomialEquationView, coefficients: number[]) => string;
  shouldAllowNumericSolve: boolean;
  shouldShowNumericSolvePanel: boolean;
  equationNumericSolvePanel: {
    enabled: boolean;
    start: string;
    end: string;
    subdivisions: number;
  };
  onSetNumericSolvePanelEnabled: (enabled: boolean) => void;
  onUpdateNumericStart: (value: number) => void;
  onUpdateNumericEnd: (value: number) => void;
  onUpdateNumericSubdivisions: (value: number) => void;
  onRunEquationNumericSolve: () => void;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: () => void;
};

export function EquationWorkspace({
  routeMeta,
  screen,
  isMenuOpen,
  currentMenuScreen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  onOpenScreen,
  onHoverMenuIndex,
  system2,
  system3,
  systemInputRefs,
  onSetSystemCell,
  activePolynomialView,
  activePolynomialMeta,
  activePolynomialCoefficients,
  polynomialInputRefs,
  onSetPolynomialCoefficient,
  polynomialTemplateLatex,
  buildPolynomialEquationLatex,
  shouldAllowNumericSolve,
  shouldShowNumericSolvePanel,
  equationNumericSolvePanel,
  onSetNumericSolvePanelEnabled,
  onUpdateNumericStart,
  onUpdateNumericEnd,
  onUpdateNumericSubdivisions,
  onRunEquationNumericSolve,
  onOpenGuideArticle,
  onOpenGuideMode,
}: EquationWorkspaceProps) {
  return (
    <section className={`mode-panel ${isMenuOpen ? 'equation-menu-panel' : 'equation-work-panel'}`}>
      {routeMeta ? (
        <div className="equation-panel-header">
          <div className="equation-panel-copy">
            <div className="equation-breadcrumbs">
              {routeMeta.breadcrumb.map((segment) => (
                <span key={`${screen}-${segment}`} className="equation-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{routeMeta.label}</strong>
              {routeMeta.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta.description}</p>
            <div className="guide-related-links">
              <button className="guide-chip" onClick={() => onOpenGuideArticle('algebra-equations')}>Guide: Equation Solving</button>
              <button className="guide-chip" onClick={onOpenGuideMode}>When to use Equation</button>
            </div>
          </div>
        </div>
      ) : null}
      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => {
                  if (currentMenuScreen) {
                    onHoverMenuIndex(currentMenuScreen, index);
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
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'linear2' || screen === 'linear3' ? (
        <>
          <div className="editor-card equation-branch-card">
            <div className="card-title-row">
              <strong>{routeMeta?.label}</strong>
              {routeMeta?.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta?.helpText}</p>
          </div>
          <div className="system-grid" data-columns={screen === 'linear2' ? 3 : 4}>
            {(screen === 'linear2' ? system2 : system3).map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <label key={`${screen}-${rowIndex}-${columnIndex}`}>
                  <span>{columnIndex < (screen === 'linear2' ? 2 : 3) ? ['x', 'y', 'z'][columnIndex] : '='}</span>
                  <SignedNumberInput
                    ref={(node) => {
                      if (rowIndex === 0 && columnIndex === 0) {
                        systemInputRefs.current[screen] = node;
                      }
                    }}
                    value={value}
                    onValueChange={(nextValue) =>
                      onSetSystemCell(
                        screen === 'linear2' ? 2 : 3,
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
              <strong>{routeMeta?.label}</strong>
              {routeMeta?.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta?.helpText}</p>
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
                  <label key={`${screen}-${label}`}>
                    <span>{label}</span>
                    <SignedNumberInput
                      ref={(node) => {
                        if (index === 0) {
                          polynomialInputRefs.current[activePolynomialView] = node;
                        }
                      }}
                      value={activePolynomialCoefficients[index]}
                      onValueChange={(nextValue) =>
                        onSetPolynomialCoefficient(activePolynomialView, index, nextValue)
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
      ) : screen === 'symbolic' ? (
        <div className="editor-card equation-branch-card">
          <div className="card-title-row">
            <strong>{routeMeta?.label}</strong>
            {routeMeta?.badge ? (
              <span className="equation-badge">{routeMeta.badge}</span>
            ) : null}
          </div>
          <p className="equation-hint">{routeMeta?.helpText}</p>
          <p className="equation-hint">
            Enter a symbolic equation in the main display, for example `x^2-5x+6=0`.
          </p>
          {shouldAllowNumericSolve ? (
            <div className="workspace-action-row">
              {!shouldShowNumericSolvePanel ? (
                <button
                  type="button"
                  className="workspace-action-button"
                  onClick={() => onSetNumericSolvePanelEnabled(true)}
                >
                  Numeric Solve
                </button>
              ) : (
                <button
                  type="button"
                  className="workspace-action-button"
                  onClick={() => onSetNumericSolvePanelEnabled(false)}
                >
                  Hide Numeric Solve
                </button>
              )}
            </div>
          ) : null}
          {shouldShowNumericSolvePanel ? (
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
                    onValueChange={onUpdateNumericStart}
                  />
                </label>
                <label className="field-group">
                  <span>End</span>
                  <SignedNumberInput
                    value={Number(equationNumericSolvePanel.end)}
                    onValueChange={onUpdateNumericEnd}
                  />
                </label>
                <label className="field-group">
                  <span>Subdivisions</span>
                  <input
                    type="number"
                    min={8}
                    step={1}
                    value={equationNumericSolvePanel.subdivisions}
                    onChange={(event) => onUpdateNumericSubdivisions(Number(event.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="workspace-action-row">
                <button
                  type="button"
                  className="workspace-action-button workspace-action-button--primary"
                  onClick={onRunEquationNumericSolve}
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
  );
}
