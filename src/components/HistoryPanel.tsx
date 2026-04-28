import { MathStatic } from './MathStatic';
import type { HistoryEntry, ModeId } from '../types/calculator';

type HistoryPanelPresentation = 'outboard' | 'overlay';

type HistoryPanelProps = {
  presentation: HistoryPanelPresentation;
  history: HistoryEntry[];
  modeLabels: Record<ModeId, string>;
  onClear: () => void;
  onClose: () => void;
  onReplay: (entry: HistoryEntry) => void;
};

export function HistoryPanel({
  presentation,
  history,
  modeLabels,
  onClear,
  onClose,
  onReplay,
}: HistoryPanelProps) {
  return (
    <aside
      className={`history-panel history-panel--${presentation}`}
      data-testid="history-panel"
      data-history-presentation={presentation}
    >
      <div className="history-header">
        <strong>History</strong>
        <div className="history-actions">
          <button type="button" onClick={onClear}>
            Clear
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">No stored history yet.</div>
        ) : (
          history
            .slice()
            .reverse()
            .map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="history-entry"
                data-testid="history-entry"
                onClick={() => onReplay(entry)}
              >
                <span className="history-meta">{modeLabels[entry.mode]}</span>
                <MathStatic className="history-math" latex={entry.inputLatex} />
                <MathStatic className="history-math result" latex={entry.resultLatex} />
              </button>
            ))
        )}
      </div>
    </aside>
  );
}
