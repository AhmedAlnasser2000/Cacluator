import type { Dispatch, RefObject, SetStateAction } from 'react';
import { MathStatic } from '../../components/MathStatic';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import type {
  BinomialState,
  CorrelationState,
  FrequencyTable,
  NormalState,
  PoissonState,
  RegressionState,
  StatisticsScreen,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';

type StatisticsRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
};

type StatisticsMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: StatisticsScreen;
};

type StatisticsWorkspaceProps = {
  routeMeta: StatisticsRouteMetaLike | null;
  screen: StatisticsScreen;
  isMenuOpen: boolean;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: StatisticsMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  onOpenScreen: (screen: StatisticsScreen) => void;
  onHoverMenuIndex: (screen: 'home' | 'probabilityHome', index: number) => void;
  onOpenToolGuide: () => void;
  onOpenModeGuide: () => void;
  dataset: StatsDataset;
  datasetText: string;
  datasetRef: RefObject<HTMLTextAreaElement | null>;
  onUpdateDataset: (text: string) => void;
  workingSource: StatisticsWorkingSource;
  onSwitchSource: (source: StatisticsWorkingSource) => void;
  onImportDatasetIntoFrequencyTable: () => void;
  onExpandTableToDataset: () => void;
  onUseInStatistics: () => void;
  workbenchExpression: string;
  onCopyWorkbenchExpression: () => void;
  frequencyTable: FrequencyTable;
  frequencyValueRef: RefObject<HTMLInputElement | null>;
  onUpdateFrequencyRow: (index: number, field: 'value' | 'frequency', value: string) => void;
  onRemoveFrequencyRow: (index: number) => void;
  onAddFrequencyRow: () => void;
  binomialState: BinomialState;
  setBinomialState: Dispatch<SetStateAction<BinomialState>>;
  normalState: NormalState;
  setNormalState: Dispatch<SetStateAction<NormalState>>;
  poissonState: PoissonState;
  setPoissonState: Dispatch<SetStateAction<PoissonState>>;
  statisticsBinomialNRef: RefObject<HTMLInputElement | null>;
  statisticsNormalMeanRef: RefObject<HTMLInputElement | null>;
  statisticsPoissonLambdaRef: RefObject<HTMLInputElement | null>;
  regressionState: RegressionState;
  correlationState: CorrelationState;
  statisticsRegressionXRef: RefObject<HTMLInputElement | null>;
  statisticsCorrelationXRef: RefObject<HTMLInputElement | null>;
  onUpdateRegressionPointDraft: (
    screen: 'regression' | 'correlation',
    index: number,
    field: 'x' | 'y',
    value: string,
  ) => void;
  onRemoveRegressionPoint: (screen: 'regression' | 'correlation', index: number) => void;
  onAddRegressionPoint: (screen: 'regression' | 'correlation') => void;
  statisticsRegressionText: string;
  statisticsCorrelationText: string;
};

function StatisticsWorkspace({
  routeMeta,
  screen,
  isMenuOpen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  onOpenScreen,
  onHoverMenuIndex,
  onOpenToolGuide,
  onOpenModeGuide,
  dataset,
  datasetText,
  datasetRef,
  onUpdateDataset,
  workingSource,
  onSwitchSource,
  onImportDatasetIntoFrequencyTable,
  onExpandTableToDataset,
  onUseInStatistics,
  workbenchExpression,
  onCopyWorkbenchExpression,
  frequencyTable,
  frequencyValueRef: statisticsFrequencyValueRef,
  onUpdateFrequencyRow,
  onRemoveFrequencyRow,
  onAddFrequencyRow,
  binomialState,
  setBinomialState,
  normalState,
  setNormalState,
  poissonState,
  setPoissonState,
  statisticsBinomialNRef,
  statisticsNormalMeanRef,
  statisticsPoissonLambdaRef,
  regressionState,
  correlationState,
  statisticsRegressionXRef,
  statisticsCorrelationXRef,
  onUpdateRegressionPointDraft,
  onRemoveRegressionPoint,
  onAddRegressionPoint,
  statisticsRegressionText,
  statisticsCorrelationText,
}: StatisticsWorkspaceProps) {
  if (!routeMeta) {
    return null;
  }

  return (
    <section className={`mode-panel ${isMenuOpen ? 'statistics-menu-panel' : 'statistics-panel'}`}>
      <div className="equation-panel-header statistics-panel-header">
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
            <span className="equation-badge">Statistics</span>
          </div>
          <p className="equation-hint statistics-panel-subtitle">{routeMeta.description}</p>
          <div className="guide-related-links">
            <button className="guide-chip" onClick={onOpenToolGuide}>
              Guide: This tool
            </button>
            <button className="guide-chip" onClick={onOpenModeGuide}>
              Guide: Statistics
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list statistics-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry statistics-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => onHoverMenuIndex(screen as 'home' | 'probabilityHome', index)}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help statistics-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'dataEntry' || screen === 'descriptive' || screen === 'frequency' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{screen === 'dataEntry' ? 'Dataset' : screen === 'descriptive' ? 'Descriptive Source' : 'Frequency Source'}</strong>
              <span className="equation-badge">{dataset.values.length} values</span>
            </div>
            {screen !== 'dataEntry' ? (
              <div className="guide-chip-row">
                <button
                  className={`guide-chip ${workingSource === 'dataset' ? 'is-active' : ''}`}
                  onClick={() => onSwitchSource('dataset')}
                >
                  Use Dataset
                </button>
                <button
                  className={`guide-chip ${workingSource === 'frequencyTable' ? 'is-active' : ''}`}
                  onClick={() => onSwitchSource('frequencyTable')}
                >
                  Use Table
                </button>
              </div>
            ) : null}
            <label className="statistics-text-block">
              <span>Values</span>
              <textarea
                ref={datasetRef}
                className="statistics-textarea"
                value={datasetText}
                onChange={(event) => onUpdateDataset(event.target.value)}
                placeholder="12, 15, 15, 18, 20"
              />
            </label>
            <div className="guide-chip-row">
              <button className="guide-chip" onClick={onImportDatasetIntoFrequencyTable}>
                Build Table from Dataset
              </button>
              <button className="guide-chip" onClick={onExpandTableToDataset}>
                Expand Table -&gt; Dataset
              </button>
              <button className="guide-chip" onClick={onUseInStatistics}>
                Use in Statistics
              </button>
            </div>
            <p className="equation-hint">
              The top Statistics editor is the executable request surface. These dataset and table controls seed it when you press EXE/F1 or Use in Statistics.
            </p>
          </div>
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Frequency Table</strong>
              <span className="equation-badge">
                {frequencyTable.rows.filter((row) => row.value.trim() && row.frequency.trim()).length} rows
              </span>
            </div>
            <div className="statistics-table-labels" aria-hidden="true">
              <span>Value</span>
              <span>Freq</span>
              <span>Action</span>
            </div>
            <div className="statistics-edit-table">
              {frequencyTable.rows.map((row, index) => (
                <div key={`statistics-frequency-${index}`} className="statistics-edit-row">
                  <SignedNumberDraftInput
                    ref={index === 0 ? statisticsFrequencyValueRef : undefined}
                    className="statistics-cell-input"
                    value={row.value}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'value', value)}
                  />
                  <SignedNumberDraftInput
                    className="statistics-cell-input"
                    value={row.frequency}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'frequency', value)}
                  />
                  <button onClick={() => onRemoveFrequencyRow(index)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="display-card-actions">
              <button onClick={onAddFrequencyRow}>Add Row</button>
              <button onClick={onCopyWorkbenchExpression}>Copy Expr</button>
            </div>
            {screen === 'dataEntry' ? (
              <div className="statistics-summary-card">
                <strong>Current Dataset</strong>
                <p>{datasetText || 'No dataset values entered yet.'}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : screen === 'binomial' || screen === 'normal' || screen === 'poisson' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{routeMeta.label}</strong>
              <span className="equation-badge">Probability</span>
            </div>
            {screen === 'binomial' ? (
              <div className="statistics-input-grid">
                <label><span>n</span><SignedNumberDraftInput ref={statisticsBinomialNRef} value={binomialState.n} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, n: value }))} className="statistics-cell-input" /></label>
                <label><span>p</span><SignedNumberDraftInput value={binomialState.p} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, p: value }))} className="statistics-cell-input" /></label>
                <label><span>x</span><SignedNumberDraftInput value={binomialState.x} onValueChange={(value) => setBinomialState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
              </div>
            ) : screen === 'normal' ? (
              <div className="statistics-input-grid">
                <label><span>Mean</span><SignedNumberDraftInput ref={statisticsNormalMeanRef} value={normalState.mean} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, mean: value }))} className="statistics-cell-input" /></label>
                <label><span>SD</span><SignedNumberDraftInput value={normalState.standardDeviation} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, standardDeviation: value }))} className="statistics-cell-input" /></label>
                <label><span>x</span><SignedNumberDraftInput value={normalState.x} onValueChange={(value) => setNormalState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
              </div>
            ) : (
              <div className="statistics-input-grid">
                <label><span>Lambda</span><SignedNumberDraftInput ref={statisticsPoissonLambdaRef} value={poissonState.lambda} onValueChange={(value) => setPoissonState((currentState) => ({ ...currentState, lambda: value }))} className="statistics-cell-input" /></label>
                <label><span>x</span><SignedNumberDraftInput value={poissonState.x} onValueChange={(value) => setPoissonState((currentState) => ({ ...currentState, x: value }))} className="statistics-cell-input" /></label>
              </div>
            )}
            <div className="guide-chip-row">
              {(screen === 'normal' ? ['pdf', 'cdf'] : ['pmf', 'cdf']).map((mode) => (
                <button
                  key={`${screen}-${mode}`}
                  className={`guide-chip ${(screen === 'binomial'
                    ? binomialState.mode === mode
                    : screen === 'normal'
                      ? normalState.mode === mode
                      : poissonState.mode === mode) ? 'is-active' : ''}`}
                  onClick={() => {
                    if (screen === 'binomial') {
                      setBinomialState((currentState) => ({ ...currentState, mode: mode as 'pmf' | 'cdf' }));
                    } else if (screen === 'normal') {
                      setNormalState((currentState) => ({ ...currentState, mode: mode as 'pdf' | 'cdf' }));
                    } else {
                      setPoissonState((currentState) => ({ ...currentState, mode: mode as 'pmf' | 'cdf' }));
                    }
                  }}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="display-card-actions">
              <button onClick={onUseInStatistics}>Use in Statistics</button>
              <button onClick={onCopyWorkbenchExpression}>Copy Expr</button>
            </div>
          </div>
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Guided Request</strong>
              <span className="equation-subtitle">Structured draft</span>
            </div>
            <MathStatic className="polynomial-preview-math" latex={workbenchExpression} />
            <p className="equation-hint">
              Use the top Statistics editor for direct edits, or keep working in the guided probability form.
            </p>
          </div>
        </div>
      ) : screen === 'regression' || screen === 'correlation' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{routeMeta.label}</strong>
              <span className="equation-badge">Point set</span>
            </div>
            <div className="statistics-table-labels" aria-hidden="true">
              <span>x</span>
              <span>y</span>
              <span>Action</span>
            </div>
            <div className="statistics-edit-table">
              {(screen === 'regression' ? regressionState.points : correlationState.points).map((point, index) => (
                <div key={`${screen}-point-${index}`} className="statistics-edit-row">
                  <SignedNumberDraftInput
                    ref={index === 0 ? (screen === 'regression' ? statisticsRegressionXRef : statisticsCorrelationXRef) : undefined}
                    className="statistics-cell-input"
                    value={point.x}
                    onValueChange={(value) => onUpdateRegressionPointDraft(screen, index, 'x', value)}
                  />
                  <SignedNumberDraftInput
                    className="statistics-cell-input"
                    value={point.y}
                    onValueChange={(value) => onUpdateRegressionPointDraft(screen, index, 'y', value)}
                  />
                  <button onClick={() => onRemoveRegressionPoint(screen, index)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="display-card-actions">
              <button onClick={() => onAddRegressionPoint(screen)}>Add Point</button>
              <button onClick={onUseInStatistics}>Use in Statistics</button>
              <button onClick={onCopyWorkbenchExpression}>Copy Expr</button>
            </div>
          </div>
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Guided Request</strong>
              <span className="equation-subtitle">Structured draft</span>
            </div>
            <MathStatic className="polynomial-preview-math" latex={workbenchExpression} />
            <div className="statistics-summary-card">
              <strong>{screen === 'regression' ? 'Regression points' : 'Correlation points'}</strong>
              <p>{screen === 'regression' ? statisticsRegressionText : statisticsCorrelationText}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-card">
          <div className="card-title-row">
            <strong>{routeMeta.label}</strong>
            <span className="equation-badge">Statistics</span>
          </div>
          <p className="equation-hint">
            Use the top Statistics editor for the active request, or return to a guided tool from the menu.
          </p>
        </div>
      )}
    </section>
  );
}

export { StatisticsWorkspace };
