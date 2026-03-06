/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { MathEditor } from '../../components/MathEditor';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import { GeneratedPreviewCard } from '../components/GeneratedPreviewCard';
import { cycleLimitTargetKind } from '../../lib/calculus-workbench';
import type {
  CalculateScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  IntegralWorkbenchState,
  LimitWorkbenchState,
} from '../../types/calculator';

type CalculateRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
  previewTitle?: string;
  previewSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
};

type CalculateMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: CalculateScreen;
};

type CalculateWorkspaceProps = {
  screen: CalculateScreen;
  isMenuOpen: boolean;
  routeMeta: CalculateRouteMetaLike | null;
  guideArticleId: string | null;
  advancedGuideArticleId: string | null;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: CalculateMenuEntryLike[];
  menuSelection: number;
  menuFooterText: string;
  onOpenScreen: (screen: CalculateScreen) => void;
  onSetMenuSelection: (index: number) => void;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: () => void;
  onLoadWorkbenchToEditor: () => void;
  onCopyWorkbenchExpression: () => void;
  onRegisterActiveField: (field: any) => void;
  keyboardLayouts: any[];
  workbenchLatex: string;
  derivativeFieldRef: RefObject<any>;
  derivativeWorkbench: DerivativeWorkbenchState;
  setDerivativeWorkbench: Dispatch<SetStateAction<DerivativeWorkbenchState>>;
  derivativePointFieldRef: RefObject<any>;
  derivativePointValueRef: RefObject<HTMLInputElement | null>;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  setDerivativePointWorkbench: Dispatch<SetStateAction<DerivativePointWorkbenchState>>;
  integralFieldRef: RefObject<any>;
  integralLowerRef: RefObject<HTMLInputElement | null>;
  integralWorkbench: IntegralWorkbenchState;
  setIntegralWorkbench: Dispatch<SetStateAction<IntegralWorkbenchState>>;
  limitFieldRef: RefObject<any>;
  limitTargetRef: RefObject<HTMLInputElement | null>;
  limitWorkbench: LimitWorkbenchState;
  setLimitWorkbench: Dispatch<SetStateAction<LimitWorkbenchState>>;
  activeMilestoneTitle: string;
};

export function CalculateWorkspace({
  screen,
  isMenuOpen,
  routeMeta,
  guideArticleId,
  advancedGuideArticleId,
  menuPanelRef,
  menuEntries,
  menuSelection,
  menuFooterText,
  onOpenScreen,
  onSetMenuSelection,
  onOpenGuideArticle,
  onOpenGuideMode,
  onLoadWorkbenchToEditor,
  onCopyWorkbenchExpression,
  onRegisterActiveField,
  keyboardLayouts,
  workbenchLatex,
  derivativeFieldRef,
  derivativeWorkbench,
  setDerivativeWorkbench,
  derivativePointFieldRef,
  derivativePointValueRef,
  derivativePointWorkbench,
  setDerivativePointWorkbench,
  integralFieldRef,
  integralLowerRef,
  integralWorkbench,
  setIntegralWorkbench,
  limitFieldRef,
  limitTargetRef,
  limitWorkbench,
  setLimitWorkbench,
  activeMilestoneTitle,
}: CalculateWorkspaceProps) {
  if (screen === 'standard') {
    return (
      <section className="mode-panel">
        <h2>Natural Textbook Input</h2>
        <p>Use the keypad, physical keyboard, or the curated `Core`, `Algebra`, `Relations`, `Letters`, `Greek`, `Discrete`, `Combinatorics`, `Calculus`, and `Functions` keyboard pages for symbolic entry.</p>
        <p className="equation-hint">Active CAS milestone: {activeMilestoneTitle}</p>
        <div className="guide-related-links">
          <button className="guide-chip" onClick={() => onOpenScreen('calculusHome')}>Calculus Page</button>
          <button className="guide-chip" onClick={() => onOpenGuideArticle('basics-keyboard')}>Guide: Basics</button>
          <button className="guide-chip" onClick={() => onOpenGuideArticle('algebra-manipulation')}>Guide: Algebra</button>
          <button className="guide-chip" onClick={() => onOpenGuideArticle('discrete-operators')}>Guide: Discrete</button>
          <button className="guide-chip" onClick={() => onOpenGuideArticle('calculus-derivatives')}>Guide: Calculus</button>
          <button className="guide-chip" onClick={onOpenGuideMode}>When to use Calculate</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`mode-panel ${isMenuOpen ? 'core-calculus-menu-panel' : 'core-calculus-panel'}`}>
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
              <span className="equation-badge">Core Calculus</span>
            </div>
            <p className="equation-hint">{routeMeta.description}</p>
            <div className="guide-related-links">
              {guideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(guideArticleId)}>
                  Guide: This tool
                </button>
              ) : null}
              {advancedGuideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(advancedGuideArticleId)}>
                  Guide: Advanced version
                </button>
              ) : null}
              <button className="guide-chip" onClick={onOpenGuideMode}>When to use Calculate</button>
            </div>
          </div>
        </div>
      ) : null}
      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list core-calculus-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry core-calculus-menu-entry ${index === menuSelection ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => onSetMenuSelection(index)}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help core-calculus-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'derivative' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Derivative Body</strong>
              <span className="equation-badge">Symbolic</span>
            </div>
            <MathEditor
              ref={derivativeFieldRef}
              className="secondary-mathfield"
              value={derivativeWorkbench.bodyLatex}
              modeId="calculate"
              screenHint={screen}
              onChange={(bodyLatex) =>
                setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex }))
              }
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x^3+2x"
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Expression'}
            subtitle={routeMeta?.previewSubtitle ?? 'Derivative in x'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Derivative body needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an expression in x to generate the derivative form.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'derivativePoint' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Derivative at Point</strong>
              <span className="equation-badge">Numeric point</span>
            </div>
            <MathEditor
              ref={derivativePointFieldRef}
              className="secondary-mathfield"
              value={derivativePointWorkbench.bodyLatex}
              modeId="calculate"
              screenHint={screen}
              onChange={(bodyLatex) =>
                setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex }))
              }
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x^2"
            />
            <label className="range-field">
              <span>Point x =</span>
              <SignedNumberDraftInput
                ref={derivativePointValueRef}
                value={derivativePointWorkbench.point}
                onValueChange={(point) =>
                  setDerivativePointWorkbench((currentState) => ({
                    ...currentState,
                    point,
                  }))
                }
              />
            </label>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Expression'}
            subtitle={routeMeta?.previewSubtitle ?? 'Derivative at a numeric point'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body and point needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an expression and point value to build the derivative-at-point form.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'integral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Integral Workbench</strong>
              <span className="equation-badge">
                {integralWorkbench.kind === 'indefinite' ? 'Symbolic' : 'Definite'}
              </span>
            </div>
            <div className="guide-chip-row">
              <button
                className={`guide-chip ${integralWorkbench.kind === 'indefinite' ? 'is-active' : ''}`}
                onClick={() =>
                  setIntegralWorkbench((currentState) => ({ ...currentState, kind: 'indefinite' }))
                }
              >
                Indefinite
              </button>
              <button
                className={`guide-chip ${integralWorkbench.kind === 'definite' ? 'is-active' : ''}`}
                onClick={() =>
                  setIntegralWorkbench((currentState) => ({ ...currentState, kind: 'definite' }))
                }
              >
                Definite
              </button>
            </div>
            <MathEditor
              ref={integralFieldRef}
              className="secondary-mathfield"
              value={integralWorkbench.bodyLatex}
              modeId="calculate"
              screenHint={screen}
              onChange={(bodyLatex) =>
                setIntegralWorkbench((currentState) => ({ ...currentState, bodyLatex }))
              }
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x^2"
            />
            {integralWorkbench.kind === 'definite' ? (
              <div className="range-row">
                <label className="range-field">
                  <span>Lower</span>
                  <SignedNumberDraftInput
                    ref={integralLowerRef}
                    value={integralWorkbench.lower}
                    onValueChange={(lower) =>
                      setIntegralWorkbench((currentState) => ({
                        ...currentState,
                        lower,
                      }))
                    }
                  />
                </label>
                <label className="range-field">
                  <span>Upper</span>
                  <SignedNumberDraftInput
                    value={integralWorkbench.upper}
                    onValueChange={(upper) =>
                      setIntegralWorkbench((currentState) => ({
                        ...currentState,
                        upper,
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Expression'}
            subtitle={routeMeta?.previewSubtitle ?? (integralWorkbench.kind === 'indefinite' ? 'Antiderivative in x' : 'Symbolic first, numeric fallback if needed')}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand and any required bounds to build the integral form.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'limit' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Limit Workbench</strong>
              <span className="equation-badge">
                {limitWorkbench.targetKind === 'finite'
                  ? limitWorkbench.direction === 'two-sided'
                    ? 'Two-sided'
                    : `${limitWorkbench.direction}-hand`
                  : limitWorkbench.targetKind === 'posInfinity'
                    ? 'x -> +∞'
                    : 'x -> -∞'}
              </span>
            </div>
            <div className="guide-chip-row">
              {(['finite', 'posInfinity', 'negInfinity'] as const).map((targetKind) => (
                <button
                  key={targetKind}
                  className={`guide-chip ${limitWorkbench.targetKind === targetKind ? 'is-active' : ''}`}
                  onClick={() =>
                    setLimitWorkbench((currentState) => ({
                      ...currentState,
                      targetKind,
                    }))
                  }
                >
                  {targetKind === 'finite' ? 'Finite' : targetKind === 'posInfinity' ? '+∞' : '-∞'}
                </button>
              ))}
            </div>
            <div className="guide-chip-row">
              {limitWorkbench.targetKind === 'finite'
                ? (['two-sided', 'left', 'right'] as const).map((direction) => (
                  <button
                    key={direction}
                    className={`guide-chip ${limitWorkbench.direction === direction ? 'is-active' : ''}`}
                    onClick={() =>
                      setLimitWorkbench((currentState) => ({ ...currentState, direction }))
                    }
                  >
                    {direction === 'two-sided' ? 'Two-Sided' : direction === 'left' ? 'Left' : 'Right'}
                  </button>
                ))
                : (
                  <button
                    className="guide-chip is-active"
                    onClick={() =>
                      setLimitWorkbench((currentState) => ({
                        ...currentState,
                        targetKind: cycleLimitTargetKind(currentState.targetKind),
                      }))
                    }
                  >
                    Infinite target
                  </button>
                )}
            </div>
            <MathEditor
              ref={limitFieldRef}
              className="secondary-mathfield"
              value={limitWorkbench.bodyLatex}
              modeId="calculate"
              screenHint={screen}
              onChange={(bodyLatex) =>
                setLimitWorkbench((currentState) => ({ ...currentState, bodyLatex }))
              }
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{\\sin(x)}{x}"
            />
            {limitWorkbench.targetKind === 'finite' ? (
              <label className="range-field">
                <span>Target</span>
                <SignedNumberDraftInput
                  ref={limitTargetRef}
                  value={limitWorkbench.target}
                  onValueChange={(target) =>
                    setLimitWorkbench((currentState) => ({
                      ...currentState,
                      target,
                    }))
                  }
                />
              </label>
            ) : (
              <div className="editor-card calculus-target-summary">
                <strong>Target</strong>
                <p>{limitWorkbench.targetKind === 'posInfinity' ? 'x -> +∞' : 'x -> -∞'}</p>
              </div>
            )}
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Expression'}
            subtitle={routeMeta?.previewSubtitle ?? (limitWorkbench.targetKind === 'finite'
              ? 'Finite target'
              : limitWorkbench.targetKind === 'posInfinity'
                ? 'Positive infinity target'
                : 'Negative infinity target')}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body and target needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the body and target information to build the limit form.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : null}
    </section>
  );
}
