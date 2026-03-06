import type { Dispatch, RefObject, SetStateAction } from 'react';
import { MathStatic } from '../../components/MathStatic';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import { GeneratedPreviewCard } from '../components/GeneratedPreviewCard';
import { SPECIAL_ANGLE_REFERENCE } from '../../lib/trigonometry/angles';
import type {
  AngleConvertState,
  AngleUnit,
  CosineRuleState,
  RightTriangleState,
  SineRuleState,
  TrigEquationState,
  TrigFunctionState,
  TrigIdentityState,
  TrigScreen,
} from '../../types/calculator';

type TrigRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
};

type TrigMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: TrigScreen;
};

type TrigonometryWorkspaceProps = {
  routeMeta: TrigRouteMetaLike | null;
  screen: TrigScreen;
  isMenuOpen: boolean;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: TrigMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  settingsAngleUnit: AngleUnit;
  onOpenScreen: (screen: TrigScreen) => void;
  onHoverMenuIndex: (
    screen: 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome',
    index: number,
  ) => void;
  onOpenToolGuide: () => void;
  onOpenModeGuide: () => void;
  workbenchExpression: string;
  onUseInTrigonometry: () => void;
  onCopyExpression: () => void;
  trigFunctionState: TrigFunctionState;
  setTrigFunctionState: Dispatch<SetStateAction<TrigFunctionState>>;
  trigIdentityState: TrigIdentityState;
  setTrigIdentityState: Dispatch<SetStateAction<TrigIdentityState>>;
  trigEquationState: TrigEquationState;
  setTrigEquationState: Dispatch<SetStateAction<TrigEquationState>>;
  rightTriangleState: RightTriangleState;
  setRightTriangleState: Dispatch<SetStateAction<RightTriangleState>>;
  sineRuleState: SineRuleState;
  setSineRuleState: Dispatch<SetStateAction<SineRuleState>>;
  cosineRuleState: CosineRuleState;
  setCosineRuleState: Dispatch<SetStateAction<CosineRuleState>>;
  angleConvertState: AngleConvertState;
  setAngleConvertState: Dispatch<SetStateAction<AngleConvertState>>;
  trigTargetFormLabels: Array<[TrigIdentityState['targetForm'], string]>;
  onLoadDraft: (latex: string) => void;
  onLoadSpecialAngleExample: (latex: string) => void;
  rightTriangleSideARef: RefObject<HTMLInputElement | null>;
  sineRuleSideARef: RefObject<HTMLInputElement | null>;
  cosineRuleSideARef: RefObject<HTMLInputElement | null>;
  angleConvertValueRef: RefObject<HTMLInputElement | null>;
};

function TrigPreviewCard({
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  workbenchExpression,
  onUseInTrigonometry,
  onCopyExpression,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  workbenchExpression: string;
  onUseInTrigonometry: () => void;
  onCopyExpression: () => void;
}) {
  return (
    <GeneratedPreviewCard
      title={title}
      subtitle={subtitle}
      latex={workbenchExpression}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onToEditor={onUseInTrigonometry}
      toEditorLabel="Use in Trigonometry"
      onCopyExpr={onCopyExpression}
    />
  );
}

function TrigonometryWorkspace({
  routeMeta,
  screen,
  isMenuOpen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  settingsAngleUnit,
  onOpenScreen,
  onHoverMenuIndex,
  onOpenToolGuide,
  onOpenModeGuide,
  workbenchExpression,
  onUseInTrigonometry,
  onCopyExpression,
  setTrigFunctionState,
  trigIdentityState,
  setTrigIdentityState,
  setTrigEquationState,
  rightTriangleState,
  setRightTriangleState,
  sineRuleState,
  setSineRuleState,
  cosineRuleState,
  setCosineRuleState,
  angleConvertState,
  setAngleConvertState,
  trigTargetFormLabels,
  onLoadDraft,
  onLoadSpecialAngleExample,
  rightTriangleSideARef,
  sineRuleSideARef,
  cosineRuleSideARef,
  angleConvertValueRef,
}: TrigonometryWorkspaceProps) {
  if (!routeMeta) {
    return null;
  }

  return (
    <section className={`mode-panel ${isMenuOpen ? 'trig-menu-panel' : 'trig-panel'}`}>
      <div className="equation-panel-header trig-panel-header">
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
            <span className="equation-badge">Trigonometry</span>
          </div>
          <p className="equation-hint trig-panel-subtitle">{routeMeta.description}</p>
          <div className="guide-related-links">
            <button className="guide-chip" onClick={onOpenToolGuide}>
              Guide: This tool
            </button>
            <button className="guide-chip" onClick={onOpenModeGuide}>Guide: Trigonometry</button>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list trig-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry trig-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => onHoverMenuIndex(screen as 'home' | 'identitiesHome' | 'equationsHome' | 'trianglesHome', index)}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help trig-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'functions' ? (
        <div className="editor-card">
          <div className="card-title-row">
            <strong>Function Presets</strong>
            <span className="equation-badge">{settingsAngleUnit.toUpperCase()}</span>
          </div>
          <div className="quick-template-grid trig-preset-grid">
            {[
              '\\sin\\left(30\\right)',
              '\\cos\\left(\\frac{\\pi}{3}\\right)',
              '\\arcsin\\left(\\frac{1}{2}\\right)',
              '\\tan\\left(45\\right)',
            ].map((expressionLatex) => (
              <button
                key={expressionLatex}
                onClick={() => {
                  setTrigFunctionState((currentState) => ({ ...currentState, expressionLatex }));
                  onLoadDraft(expressionLatex);
                }}
              >
                {expressionLatex === '\\sin\\left(30\\right)'
                  ? 'sin(30)'
                  : expressionLatex === '\\cos\\left(\\frac{\\pi}{3}\\right)'
                    ? 'cos(pi/3)'
                    : expressionLatex === '\\arcsin\\left(\\frac{1}{2}\\right)'
                      ? 'asin(1/2)'
                      : 'tan(45)'}
              </button>
            ))}
          </div>
          <p className="equation-hint">Use the top editor for the active trig expression. These presets load directly into the shared Trigonometry draft.</p>
        </div>
      ) : screen === 'identitySimplify' || screen === 'identityConvert' ? (
        <div className="editor-card">
          <div className="card-title-row">
            <strong>{screen === 'identitySimplify' ? 'Identity Presets' : 'Identity Convert'}</strong>
            <span className="equation-badge">Bounded symbolic</span>
          </div>
          <div className="quick-template-grid trig-preset-grid">
            {screen === 'identitySimplify' ? (
              <>
                <button
                  onClick={() => {
                    const expressionLatex = '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)';
                    setTrigIdentityState((currentState) => ({ ...currentState, expressionLatex }));
                    onLoadDraft(expressionLatex);
                  }}
                >
                  sin^2+cos^2
                </button>
                <button
                  onClick={() => {
                    const expressionLatex = '\\frac{\\sin\\left(x\\right)}{\\cos\\left(x\\right)}';
                    setTrigIdentityState((currentState) => ({ ...currentState, expressionLatex }));
                    onLoadDraft(expressionLatex);
                  }}
                >
                  sin/cos
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const expressionLatex = '\\sin\\left(A\\right)\\sin\\left(B\\right)';
                    setTrigIdentityState((currentState) => ({
                      ...currentState,
                      expressionLatex,
                      targetForm: 'productToSum',
                    }));
                    onLoadDraft(expressionLatex);
                  }}
                >
                  Product-&gt;Sum
                </button>
                <button
                  onClick={() => {
                    const expressionLatex = '\\sin\\left(A\\right)+\\sin\\left(B\\right)';
                    setTrigIdentityState((currentState) => ({
                      ...currentState,
                      expressionLatex,
                      targetForm: 'sumToProduct',
                    }));
                    onLoadDraft(expressionLatex);
                  }}
                >
                  Sum-&gt;Product
                </button>
              </>
            )}
          </div>
          {screen === 'identityConvert' ? (
            <div className="guide-chip-row">
              {trigTargetFormLabels.map(([targetForm, label]) => (
                <button
                  key={targetForm}
                  className={`guide-chip ${trigIdentityState.targetForm === targetForm ? 'is-active' : ''}`}
                  onClick={() => setTrigIdentityState((currentState) => ({ ...currentState, targetForm }))}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <p className="equation-hint">
            Use the top editor for the active identity draft. The target-form chips stay active here without moving you into Calculate.
          </p>
        </div>
      ) : screen === 'equationSolve' ? (
        <div className="editor-card">
          <div className="card-title-row">
            <strong>Equation Presets</strong>
            <span className="equation-badge">{settingsAngleUnit.toUpperCase()}</span>
          </div>
          <div className="quick-template-grid trig-preset-grid">
            {[
              '\\sin\\left(x\\right)=\\frac{1}{2}',
              '\\cos\\left(x\\right)=0',
              '\\tan\\left(x\\right)=1',
              '\\sin\\left(2x\\right)=0',
            ].map((equationLatex) => (
              <button
                key={equationLatex}
                onClick={() => {
                  setTrigEquationState((currentState) => ({ ...currentState, equationLatex }));
                  onLoadDraft(equationLatex);
                }}
              >
                {equationLatex === '\\sin\\left(x\\right)=\\frac{1}{2}'
                  ? 'sin(x)=1/2'
                  : equationLatex === '\\cos\\left(x\\right)=0'
                    ? 'cos(x)=0'
                    : equationLatex === '\\tan\\left(x\\right)=1'
                      ? 'tan(x)=1'
                      : 'sin(2x)=0'}
              </button>
            ))}
          </div>
          <p className="equation-hint">Use the top editor for the active trig equation. The solver remains bounded to the supported textbook forms.</p>
        </div>
      ) : screen === 'rightTriangle' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Right Triangle</strong>
              <span className="equation-badge">Enter exactly two values</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Side a</span>
                <SignedNumberDraftInput
                  ref={rightTriangleSideARef}
                  value={rightTriangleState.knownSideA}
                  onValueChange={(knownSideA) => setRightTriangleState((currentState) => ({ ...currentState, knownSideA }))}
                />
              </label>
              <label className="range-field">
                <span>Side b</span>
                <SignedNumberDraftInput
                  value={rightTriangleState.knownSideB}
                  onValueChange={(knownSideB) => setRightTriangleState((currentState) => ({ ...currentState, knownSideB }))}
                />
              </label>
              <label className="range-field">
                <span>Hypotenuse c</span>
                <SignedNumberDraftInput
                  value={rightTriangleState.knownSideC}
                  onValueChange={(knownSideC) => setRightTriangleState((currentState) => ({ ...currentState, knownSideC }))}
                />
              </label>
              <label className="range-field">
                <span>Angle A</span>
                <SignedNumberDraftInput
                  value={rightTriangleState.knownAngleA}
                  onValueChange={(knownAngleA) => setRightTriangleState((currentState) => ({ ...currentState, knownAngleA }))}
                />
              </label>
              <label className="range-field">
                <span>Angle B</span>
                <SignedNumberDraftInput
                  value={rightTriangleState.knownAngleB}
                  onValueChange={(knownAngleB) => setRightTriangleState((currentState) => ({ ...currentState, knownAngleB }))}
                />
              </label>
            </div>
          </div>
          <TrigPreviewCard
            title="Triangle Request"
            subtitle="c is the hypotenuse and C is fixed at 90 degrees"
            emptyTitle="Two values needed"
            emptyDescription="Enter exactly two known values, with at least one side."
            workbenchExpression={workbenchExpression}
            onUseInTrigonometry={onUseInTrigonometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'sineRule' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Sine Rule</strong>
              <span className="equation-badge">Side-angle solver</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Side a</span>
                <SignedNumberDraftInput
                  ref={sineRuleSideARef}
                  value={sineRuleState.sideA}
                  onValueChange={(sideA) => setSineRuleState((currentState) => ({ ...currentState, sideA }))}
                />
              </label>
              <label className="range-field">
                <span>Side b</span>
                <SignedNumberDraftInput
                  value={sineRuleState.sideB}
                  onValueChange={(sideB) => setSineRuleState((currentState) => ({ ...currentState, sideB }))}
                />
              </label>
              <label className="range-field">
                <span>Side c</span>
                <SignedNumberDraftInput
                  value={sineRuleState.sideC}
                  onValueChange={(sideC) => setSineRuleState((currentState) => ({ ...currentState, sideC }))}
                />
              </label>
              <label className="range-field">
                <span>Angle A</span>
                <SignedNumberDraftInput
                  value={sineRuleState.angleA}
                  onValueChange={(angleA) => setSineRuleState((currentState) => ({ ...currentState, angleA }))}
                />
              </label>
              <label className="range-field">
                <span>Angle B</span>
                <SignedNumberDraftInput
                  value={sineRuleState.angleB}
                  onValueChange={(angleB) => setSineRuleState((currentState) => ({ ...currentState, angleB }))}
                />
              </label>
              <label className="range-field">
                <span>Angle C</span>
                <SignedNumberDraftInput
                  value={sineRuleState.angleC}
                  onValueChange={(angleC) => setSineRuleState((currentState) => ({ ...currentState, angleC }))}
                />
              </label>
            </div>
          </div>
          <TrigPreviewCard
            title="Sine-Rule Request"
            subtitle="Start with a matching side-angle pair"
            emptyTitle="Triangle data needed"
            emptyDescription="Enter a matching side-angle pair and enough extra data to define the triangle."
            workbenchExpression={workbenchExpression}
            onUseInTrigonometry={onUseInTrigonometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'cosineRule' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Cosine Rule</strong>
              <span className="equation-badge">SSS or SAS</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Side a</span>
                <SignedNumberDraftInput
                  ref={cosineRuleSideARef}
                  value={cosineRuleState.sideA}
                  onValueChange={(sideA) => setCosineRuleState((currentState) => ({ ...currentState, sideA }))}
                />
              </label>
              <label className="range-field">
                <span>Side b</span>
                <SignedNumberDraftInput
                  value={cosineRuleState.sideB}
                  onValueChange={(sideB) => setCosineRuleState((currentState) => ({ ...currentState, sideB }))}
                />
              </label>
              <label className="range-field">
                <span>Side c</span>
                <SignedNumberDraftInput
                  value={cosineRuleState.sideC}
                  onValueChange={(sideC) => setCosineRuleState((currentState) => ({ ...currentState, sideC }))}
                />
              </label>
              <label className="range-field">
                <span>Angle A</span>
                <SignedNumberDraftInput
                  value={cosineRuleState.angleA}
                  onValueChange={(angleA) => setCosineRuleState((currentState) => ({ ...currentState, angleA }))}
                />
              </label>
              <label className="range-field">
                <span>Angle B</span>
                <SignedNumberDraftInput
                  value={cosineRuleState.angleB}
                  onValueChange={(angleB) => setCosineRuleState((currentState) => ({ ...currentState, angleB }))}
                />
              </label>
              <label className="range-field">
                <span>Angle C</span>
                <SignedNumberDraftInput
                  value={cosineRuleState.angleC}
                  onValueChange={(angleC) => setCosineRuleState((currentState) => ({ ...currentState, angleC }))}
                />
              </label>
            </div>
          </div>
          <TrigPreviewCard
            title="Cosine-Rule Request"
            subtitle="Use three sides or two sides and the included angle"
            emptyTitle="Triangle data needed"
            emptyDescription="Enter either SSS or SAS data before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInTrigonometry={onUseInTrigonometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'angleConvert' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Angle Convert</strong>
              <span className="equation-badge">deg / rad / grad</span>
            </div>
            <label className="range-field">
              <span>Value</span>
              <SignedNumberDraftInput
                ref={angleConvertValueRef}
                value={angleConvertState.value}
                onValueChange={(value) => setAngleConvertState((currentState) => ({ ...currentState, value }))}
              />
            </label>
            <div className="guide-chip-row">
              {(['deg', 'rad', 'grad'] as const).map((unit) => (
                <button
                  key={`from-${unit}`}
                  className={`guide-chip ${angleConvertState.from === unit ? 'is-active' : ''}`}
                  onClick={() => setAngleConvertState((currentState) => ({ ...currentState, from: unit }))}
                >
                  From {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="guide-chip-row">
              {(['deg', 'rad', 'grad'] as const).map((unit) => (
                <button
                  key={`to-${unit}`}
                  className={`guide-chip ${angleConvertState.to === unit ? 'is-active' : ''}`}
                  onClick={() => setAngleConvertState((currentState) => ({ ...currentState, to: unit }))}
                >
                  To {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="display-card-actions">
              <button
                onClick={() => setAngleConvertState((currentState) => ({
                  ...currentState,
                  from: currentState.to,
                  to: currentState.from,
                }))}
              >
                Swap Units
              </button>
            </div>
          </div>
          <TrigPreviewCard
            title="Conversion Request"
            subtitle="Exact pi output appears when a supported special angle is recognized"
            emptyTitle="Value needed"
            emptyDescription="Enter a numeric value, then choose the source and target units."
            workbenchExpression={workbenchExpression}
            onUseInTrigonometry={onUseInTrigonometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'specialAngles' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Special-Angle Reference</strong>
              <span className="equation-badge">{settingsAngleUnit.toUpperCase()}</span>
            </div>
            <p className="equation-hint">Use the top editor for curated exact-value checks such as sin(30), cos(pi/3), and tan(45).</p>
          </div>
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Reference Table</strong>
              <span className="equation-badge">Exact values</span>
            </div>
            <div className="trig-reference-grid">
              {SPECIAL_ANGLE_REFERENCE.map((row) => (
                <div key={row.degrees} className="guide-example trig-reference-card">
                  <MathStatic
                    className="polynomial-preview-math"
                    latex={`\\theta=${row.degrees}^{\\circ},\\ ${row.radiansLatex}`}
                  />
                  <MathStatic
                    className="polynomial-preview-math"
                    latex={`\\sin\\theta=${row.sinLatex},\\ \\cos\\theta=${row.cosLatex},\\ \\tan\\theta=${row.tanLatex}`}
                  />
                  <div className="display-card-actions">
                    {(['sin', 'cos', 'tan'] as const).map((fn) => {
                      const expressionLatex = `\\${fn}\\left(${settingsAngleUnit === 'rad' ? row.radiansLatex : row.degrees}\\right)`;
                      return (
                        <button
                          key={`${row.degrees}-${fn}`}
                          onClick={() => onLoadSpecialAngleExample(expressionLatex)}
                        >
                          Load {fn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { TrigonometryWorkspace };
