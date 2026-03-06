/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { MathEditor } from '../../components/MathEditor';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import { GeneratedPreviewCard } from '../components/GeneratedPreviewCard';
import type {
  AdvancedCalcScreen,
  AdvancedDefiniteIntegralState,
  AdvancedFiniteLimitState,
  AdvancedImproperIntegralState,
  AdvancedIndefiniteIntegralState,
  AdvancedInfiniteLimitState,
  FirstOrderOdeState,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
} from '../../types/calculator';

type AdvancedCalcRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
  previewTitle?: string;
  previewSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  guideArticleId?: string;
};

type AdvancedCalcMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: AdvancedCalcScreen;
};

type AdvancedCalculusWorkspaceProps = {
  screen: AdvancedCalcScreen;
  isMenuOpen: boolean;
  routeMeta: AdvancedCalcRouteMetaLike | null;
  coreGuideArticleId: string | null;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: AdvancedCalcMenuEntryLike[];
  menuSelection: number;
  menuFooterText: string;
  onOpenScreen: (screen: AdvancedCalcScreen) => void;
  onSetMenuSelection: (screen: 'home' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome', index: number) => void;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: () => void;
  onLoadWorkbenchToEditor: () => void;
  onCopyWorkbenchExpression: () => void;
  onRegisterActiveField: (field: any) => void;
  keyboardLayouts: any[];
  workbenchLatex: string;
  advancedIndefiniteFieldRef: RefObject<any>;
  advancedDefiniteFieldRef: RefObject<any>;
  advancedImproperFieldRef: RefObject<any>;
  advancedFiniteLimitFieldRef: RefObject<any>;
  advancedInfiniteLimitFieldRef: RefObject<any>;
  maclaurinFieldRef: RefObject<any>;
  taylorFieldRef: RefObject<any>;
  partialDerivativeFieldRef: RefObject<any>;
  firstOrderOdeLhsFieldRef: RefObject<any>;
  firstOrderOdeRhsFieldRef: RefObject<any>;
  secondOrderOdeForcingFieldRef: RefObject<any>;
  numericIvpFieldRef: RefObject<any>;
  advancedDefiniteLowerRef: RefObject<HTMLInputElement | null>;
  advancedImproperLowerRef: RefObject<HTMLInputElement | null>;
  advancedFiniteLimitTargetRef: RefObject<HTMLInputElement | null>;
  taylorCenterRef: RefObject<HTMLInputElement | null>;
  secondOrderA2Ref: RefObject<HTMLInputElement | null>;
  numericIvpX0Ref: RefObject<HTMLInputElement | null>;
  advancedIndefiniteIntegral: AdvancedIndefiniteIntegralState;
  setAdvancedIndefiniteIntegral: Dispatch<SetStateAction<AdvancedIndefiniteIntegralState>>;
  advancedDefiniteIntegral: AdvancedDefiniteIntegralState;
  setAdvancedDefiniteIntegral: Dispatch<SetStateAction<AdvancedDefiniteIntegralState>>;
  advancedImproperIntegral: AdvancedImproperIntegralState;
  setAdvancedImproperIntegral: Dispatch<SetStateAction<AdvancedImproperIntegralState>>;
  advancedFiniteLimit: AdvancedFiniteLimitState;
  setAdvancedFiniteLimit: Dispatch<SetStateAction<AdvancedFiniteLimitState>>;
  advancedInfiniteLimit: AdvancedInfiniteLimitState;
  setAdvancedInfiniteLimit: Dispatch<SetStateAction<AdvancedInfiniteLimitState>>;
  maclaurinState: SeriesState;
  setMaclaurinState: Dispatch<SetStateAction<SeriesState>>;
  taylorState: SeriesState;
  setTaylorState: Dispatch<SetStateAction<SeriesState>>;
  partialDerivativeState: PartialDerivativeWorkbenchState;
  setPartialDerivativeState: Dispatch<SetStateAction<PartialDerivativeWorkbenchState>>;
  firstOrderOdeState: FirstOrderOdeState;
  setFirstOrderOdeState: Dispatch<SetStateAction<FirstOrderOdeState>>;
  secondOrderOdeState: SecondOrderOdeState;
  setSecondOrderOdeState: Dispatch<SetStateAction<SecondOrderOdeState>>;
  numericIvpState: NumericIvpState;
  setNumericIvpState: Dispatch<SetStateAction<NumericIvpState>>;
};

export function AdvancedCalculusWorkspace({
  screen,
  isMenuOpen,
  routeMeta,
  coreGuideArticleId,
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
  advancedIndefiniteFieldRef,
  advancedDefiniteFieldRef,
  advancedImproperFieldRef,
  advancedFiniteLimitFieldRef,
  advancedInfiniteLimitFieldRef,
  maclaurinFieldRef,
  taylorFieldRef,
  partialDerivativeFieldRef,
  firstOrderOdeLhsFieldRef,
  firstOrderOdeRhsFieldRef,
  secondOrderOdeForcingFieldRef,
  numericIvpFieldRef,
  advancedDefiniteLowerRef,
  advancedImproperLowerRef,
  advancedFiniteLimitTargetRef,
  taylorCenterRef,
  secondOrderA2Ref,
  numericIvpX0Ref,
  advancedIndefiniteIntegral,
  setAdvancedIndefiniteIntegral,
  advancedDefiniteIntegral,
  setAdvancedDefiniteIntegral,
  advancedImproperIntegral,
  setAdvancedImproperIntegral,
  advancedFiniteLimit,
  setAdvancedFiniteLimit,
  advancedInfiniteLimit,
  setAdvancedInfiniteLimit,
  maclaurinState,
  setMaclaurinState,
  taylorState,
  setTaylorState,
  partialDerivativeState,
  setPartialDerivativeState,
  firstOrderOdeState,
  setFirstOrderOdeState,
  secondOrderOdeState,
  setSecondOrderOdeState,
  numericIvpState,
  setNumericIvpState,
}: AdvancedCalculusWorkspaceProps) {
  return (
    <section className={`mode-panel ${isMenuOpen ? 'advanced-calc-menu-panel' : 'advanced-calc-panel'}`}>
      {routeMeta ? (
        <div className="equation-panel-header advanced-calc-header">
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
              <span className="equation-badge">Advanced Calc</span>
            </div>
            <p className="equation-hint advanced-calc-subtitle">{routeMeta.description}</p>
            <div className="guide-related-links">
              {routeMeta.guideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(routeMeta.guideArticleId!)}>
                  Guide: This tool
                </button>
              ) : null}
              <button className="guide-chip" onClick={onOpenGuideMode}>Guide: Advanced Calc</button>
              {coreGuideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(coreGuideArticleId)}>
                  Guide: Core Calculus
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isMenuOpen ? (
        <>
          <div ref={menuPanelRef} className="launcher-list equation-menu-list advanced-calc-menu-list" tabIndex={-1}>
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry advanced-calc-menu-entry ${index === menuSelection ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() =>
                  onSetMenuSelection(
                    screen as 'home' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome',
                    index,
                  )
                }
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help advanced-calc-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'indefiniteIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Integrand</strong>
              <span className="equation-badge">Symbolic-only</span>
            </div>
            <MathEditor
              ref={advancedIndefiniteFieldRef}
              className="secondary-mathfield"
              value={advancedIndefiniteIntegral.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setAdvancedIndefiniteIntegral({ bodyLatex })}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{1}{1+x^2}"
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? 'Stronger symbolic antiderivative rules in x'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand to generate the antiderivative form.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'definiteIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Finite Bounds</strong>
              <span className="equation-badge">Symbolic first</span>
            </div>
            <MathEditor
              ref={advancedDefiniteFieldRef}
              className="secondary-mathfield"
              value={advancedDefiniteIntegral.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\sin(x^2)"
            />
            <div className="range-row">
              <label className="range-field">
                <span>Lower</span>
                <SignedNumberDraftInput
                  ref={advancedDefiniteLowerRef}
                  value={advancedDefiniteIntegral.lower}
                  onValueChange={(lower) => setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, lower }))}
                />
              </label>
              <label className="range-field">
                <span>Upper</span>
                <SignedNumberDraftInput
                  value={advancedDefiniteIntegral.upper}
                  onValueChange={(upper) => setAdvancedDefiniteIntegral((currentState) => ({ ...currentState, upper }))}
                />
              </label>
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? 'Finite bounds with numeric fallback when allowed'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand and bounds needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand and finite bounds to build the definite integral.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'improperIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Improper Bounds</strong>
              <span className="equation-badge">Convergent cases</span>
            </div>
            <MathEditor
              ref={advancedImproperFieldRef}
              className="secondary-mathfield"
              value={advancedImproperIntegral.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setAdvancedImproperIntegral((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{1}{1+x^2}"
            />
            <div className="guide-chip-row">
              {(['finite', 'negInfinity'] as const).map((kind) => (
                <button
                  key={kind}
                  className={`guide-chip ${advancedImproperIntegral.lowerKind === kind ? 'is-active' : ''}`}
                  onClick={() => setAdvancedImproperIntegral((currentState) => ({ ...currentState, lowerKind: kind }))}
                >
                  {kind === 'finite' ? 'Finite lower' : '-\u221e lower'}
                </button>
              ))}
            </div>
            {advancedImproperIntegral.lowerKind === 'finite' ? (
              <label className="range-field">
                <span>Lower</span>
                <SignedNumberDraftInput
                  ref={advancedImproperLowerRef}
                  value={advancedImproperIntegral.lower}
                  onValueChange={(lower) => setAdvancedImproperIntegral((currentState) => ({ ...currentState, lower }))}
                />
              </label>
            ) : null}
            <div className="guide-chip-row">
              {(['finite', 'posInfinity'] as const).map((kind) => (
                <button
                  key={kind}
                  className={`guide-chip ${advancedImproperIntegral.upperKind === kind ? 'is-active' : ''}`}
                  onClick={() => setAdvancedImproperIntegral((currentState) => ({ ...currentState, upperKind: kind }))}
                >
                  {kind === 'finite' ? 'Finite upper' : '+\u221e upper'}
                </button>
              ))}
            </div>
            {advancedImproperIntegral.upperKind === 'finite' ? (
              <label className="range-field">
                <span>Upper</span>
                <SignedNumberDraftInput
                  value={advancedImproperIntegral.upper}
                  onValueChange={(upper) => setAdvancedImproperIntegral((currentState) => ({ ...currentState, upper }))}
                />
              </label>
            ) : null}
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? 'Infinite-bound workflows with controlled divergence errors'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand or bounds missing'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand and choose the finite or infinite bounds to build the improper integral.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'finiteLimit' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Finite Limit</strong>
              <span className="equation-badge">
                {advancedFiniteLimit.direction === 'two-sided' ? 'Two-sided' : `${advancedFiniteLimit.direction}-hand`}
              </span>
            </div>
            <div className="guide-chip-row">
              {(['two-sided', 'left', 'right'] as const).map((direction) => (
                <button
                  key={direction}
                  className={`guide-chip ${advancedFiniteLimit.direction === direction ? 'is-active' : ''}`}
                  onClick={() => setAdvancedFiniteLimit((currentState) => ({ ...currentState, direction }))}
                >
                  {direction === 'two-sided' ? 'Two-Sided' : direction === 'left' ? 'Left' : 'Right'}
                </button>
              ))}
            </div>
            <MathEditor
              ref={advancedFiniteLimitFieldRef}
              className="secondary-mathfield"
              value={advancedFiniteLimit.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setAdvancedFiniteLimit((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{\\sin(x)}{x}"
            />
            <label className="range-field">
              <span>Target</span>
              <SignedNumberDraftInput
                ref={advancedFiniteLimitTargetRef}
                value={advancedFiniteLimit.target}
                onValueChange={(target) => setAdvancedFiniteLimit((currentState) => ({ ...currentState, target }))}
              />
            </label>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Limit'}
            subtitle={routeMeta?.previewSubtitle ?? 'Finite target with left, right, or two-sided analysis'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body and target needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the body and target value to build the finite-limit expression.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'infiniteLimit' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Infinite Target</strong>
              <span className="equation-badge">
                {advancedInfiniteLimit.targetKind === 'posInfinity' ? 'x -> +\u221e' : 'x -> -\u221e'}
              </span>
            </div>
            <div className="guide-chip-row">
              {(['posInfinity', 'negInfinity'] as const).map((targetKind) => (
                <button
                  key={targetKind}
                  className={`guide-chip ${advancedInfiniteLimit.targetKind === targetKind ? 'is-active' : ''}`}
                  onClick={() => setAdvancedInfiniteLimit((currentState) => ({ ...currentState, targetKind }))}
                >
                  {targetKind === 'posInfinity' ? '+\u221e' : '-\u221e'}
                </button>
              ))}
            </div>
            <MathEditor
              ref={advancedInfiniteLimitFieldRef}
              className="secondary-mathfield"
              value={advancedInfiniteLimit.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setAdvancedInfiniteLimit((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{3x^2+1}{2x^2-5}"
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Infinite Limit'}
            subtitle={routeMeta?.previewSubtitle ?? 'End behavior as x approaches infinity'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the body to build the infinite-target limit expression.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'maclaurin' || screen === 'taylor' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{screen === 'maclaurin' ? 'Maclaurin' : 'Taylor'} Input</strong>
              <span className="equation-badge">Order 1-8</span>
            </div>
            <MathEditor
              ref={screen === 'maclaurin' ? maclaurinFieldRef : taylorFieldRef}
              className="secondary-mathfield"
              value={screen === 'maclaurin' ? maclaurinState.bodyLatex : taylorState.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => {
                if (screen === 'maclaurin') {
                  setMaclaurinState((currentState) => ({ ...currentState, bodyLatex }));
                } else {
                  setTaylorState((currentState) => ({ ...currentState, bodyLatex }));
                }
              }}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder={screen === 'maclaurin' ? '\\sin(x)' : 'x^3+2x'}
            />
            {screen === 'taylor' ? (
              <label className="range-field">
                <span>Center</span>
                <SignedNumberDraftInput
                  ref={taylorCenterRef}
                  value={taylorState.center}
                  onValueChange={(center) => setTaylorState((currentState) => ({ ...currentState, center }))}
                />
              </label>
            ) : null}
            <div className="guide-chip-row">
              {Array.from({ length: 8 }, (_, index) => index + 1).map((order) => (
                <button
                  key={order}
                  className={`guide-chip ${(screen === 'maclaurin' ? maclaurinState.order : taylorState.order) === order ? 'is-active' : ''}`}
                  onClick={() => {
                    if (screen === 'maclaurin') {
                      setMaclaurinState((currentState) => ({ ...currentState, order }));
                    } else {
                      setTaylorState((currentState) => ({ ...currentState, order }));
                    }
                  }}
                >
                  {order}
                </button>
              ))}
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Series'}
            subtitle={routeMeta?.previewSubtitle ?? (screen === 'maclaurin' ? 'Centered at 0' : 'Centered at a numeric value')}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? (screen === 'maclaurin' ? 'Body and order needed' : 'Body, center, and order needed')}
            emptyDescription={routeMeta?.emptyStateDescription ?? (screen === 'maclaurin'
              ? 'Enter a body and choose an order to build the Maclaurin series form.'
              : 'Enter a body, center, and order to build the Taylor series form.')}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'partialDerivative' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Partial Derivative</strong>
              <span className="equation-badge">First order</span>
            </div>
            <div className="guide-chip-row">
              {(['x', 'y', 'z'] as const).map((variable) => (
                <button
                  key={variable}
                  className={`guide-chip ${partialDerivativeState.variable === variable ? 'is-active' : ''}`}
                  onClick={() => setPartialDerivativeState((currentState) => ({ ...currentState, variable }))}
                >
                  {`\u2202/\u2202${variable}`}
                </button>
              ))}
            </div>
            <MathEditor
              ref={partialDerivativeFieldRef}
              className="secondary-mathfield"
              value={partialDerivativeState.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setPartialDerivativeState((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x^2y+y^3"
            />
            <p className="equation-hint">Choose x, y, or z. The other variables are treated as constants.</p>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Partial Derivative'}
            subtitle={routeMeta?.previewSubtitle ?? 'Treat other variables as constants'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Expression needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter a multivariable expression to build the first-order partial derivative.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'odeFirstOrder' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>First-Order ODE</strong>
              <span className="equation-badge">{firstOrderOdeState.classification}</span>
            </div>
            <div className="guide-chip-row">
              {(['separable', 'linear', 'exact'] as const).map((classification) => (
                <button
                  key={classification}
                  className={`guide-chip ${firstOrderOdeState.classification === classification ? 'is-active' : ''}`}
                  onClick={() => setFirstOrderOdeState((currentState) => ({ ...currentState, classification }))}
                >
                  {classification}
                </button>
              ))}
            </div>
            <MathEditor
              ref={firstOrderOdeLhsFieldRef}
              className="secondary-mathfield"
              value={firstOrderOdeState.lhsLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(lhsLatex) => setFirstOrderOdeState((currentState) => ({ ...currentState, lhsLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{dy}{dx}"
            />
            <MathEditor
              ref={firstOrderOdeRhsFieldRef}
              className="secondary-mathfield"
              value={firstOrderOdeState.rhsLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(rhsLatex) => setFirstOrderOdeState((currentState) => ({ ...currentState, rhsLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="xy"
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated First-Order ODE'}
            subtitle={routeMeta?.previewSubtitle ?? 'Guided symbolic class selection'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Equation pieces needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the left-hand side and right-hand side to build the first-order ODE.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'odeSecondOrder' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Second-Order ODE</strong>
              <span className="equation-badge">Constant coefficients</span>
            </div>
            <div className="polynomial-grid" data-columns="3">
              <label className="range-field">
                <span>a\u2082</span>
                <SignedNumberDraftInput
                  ref={secondOrderA2Ref}
                  value={secondOrderOdeState.a2}
                  onValueChange={(a2) => setSecondOrderOdeState((currentState) => ({ ...currentState, a2 }))}
                />
              </label>
              <label className="range-field">
                <span>a\u2081</span>
                <SignedNumberDraftInput
                  value={secondOrderOdeState.a1}
                  onValueChange={(a1) => setSecondOrderOdeState((currentState) => ({ ...currentState, a1 }))}
                />
              </label>
              <label className="range-field">
                <span>a\u2080</span>
                <SignedNumberDraftInput
                  value={secondOrderOdeState.a0}
                  onValueChange={(a0) => setSecondOrderOdeState((currentState) => ({ ...currentState, a0 }))}
                />
              </label>
            </div>
            <MathEditor
              ref={secondOrderOdeForcingFieldRef}
              className="secondary-mathfield"
              value={secondOrderOdeState.forcingLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(forcingLatex) => setSecondOrderOdeState((currentState) => ({ ...currentState, forcingLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="0"
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Second-Order ODE'}
            subtitle={routeMeta?.previewSubtitle ?? 'Constant-coefficient forms'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Coefficients and forcing needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the coefficients and forcing term to build the second-order ODE.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'odeNumericIvp' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Numeric IVP</strong>
              <span className="equation-badge">{numericIvpState.method.toUpperCase()}</span>
            </div>
            <div className="guide-chip-row">
              {(['rk4', 'rk45'] as const).map((method) => (
                <button
                  key={method}
                  className={`guide-chip ${numericIvpState.method === method ? 'is-active' : ''}`}
                  onClick={() => setNumericIvpState((currentState) => ({ ...currentState, method }))}
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
            <MathEditor
              ref={numericIvpFieldRef}
              className="secondary-mathfield"
              value={numericIvpState.bodyLatex}
              modeId="advancedCalculus"
              screenHint={screen}
              onChange={(bodyLatex) => setNumericIvpState((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x+y"
            />
            <div className="polynomial-grid" data-columns="4">
              <label className="range-field">
                <span>x\u2080</span>
                <SignedNumberDraftInput
                  ref={numericIvpX0Ref}
                  value={numericIvpState.x0}
                  onValueChange={(x0) => setNumericIvpState((currentState) => ({ ...currentState, x0 }))}
                />
              </label>
              <label className="range-field">
                <span>y\u2080</span>
                <SignedNumberDraftInput
                  value={numericIvpState.y0}
                  onValueChange={(y0) => setNumericIvpState((currentState) => ({ ...currentState, y0 }))}
                />
              </label>
              <label className="range-field">
                <span>x end</span>
                <SignedNumberDraftInput
                  value={numericIvpState.xEnd}
                  onValueChange={(xEnd) => setNumericIvpState((currentState) => ({ ...currentState, xEnd }))}
                />
              </label>
              <label className="range-field">
                <span>Step</span>
                <SignedNumberDraftInput
                  value={numericIvpState.step}
                  onValueChange={(step) => setNumericIvpState((currentState) => ({ ...currentState, step }))}
                />
              </label>
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Numeric IVP'}
            subtitle={routeMeta?.previewSubtitle ?? 'Numeric initial-value solving'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'IVP data needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? "Enter y' = f(x,y), initial values, and a step size to build the IVP."}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : null}
    </section>
  );
}
