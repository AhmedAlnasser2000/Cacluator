import { MathStatic } from './MathStatic';
import { normalizeSymbolicDisplayLatex } from '../lib/symbolic-display';
import type { AngleUnit, OutputStyle, Settings, SettingsPatch } from '../types/calculator';

type SettingsPanelPresentation = 'outboard' | 'overlay';

type SettingsPanelProps = {
  presentation: SettingsPanelPresentation;
  settings: Settings;
  onClose: () => void;
  onPatch: (patch: SettingsPatch) => void;
};

const SCALE_OPTIONS: Array<Settings['uiScale']> = [100, 115, 130, 145];
const ANGLE_OPTIONS: AngleUnit[] = ['deg', 'rad', 'grad'];
const OUTPUT_OPTIONS: OutputStyle[] = ['exact', 'decimal', 'both'];
const SYMBOLIC_DISPLAY_OPTIONS: Array<Settings['symbolicDisplayMode']> = ['roots', 'powers', 'auto'];

function symbolicPreviewLatex(settings: Settings) {
  return normalizeSymbolicDisplayLatex('\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}', settings)
    ?? '\\sqrt[3]{\\sqrt{x}}';
}

function symbolicPreviewSummary(settings: Settings) {
  if (settings.symbolicDisplayMode === 'powers') {
    return 'Previewing the power-preferred exact form.';
  }

  if (settings.symbolicDisplayMode === 'auto') {
    return 'Previewing the default power-leaning exact form while keeping plain roots readable.';
  }

  if (settings.flattenNestedRootsWhenSafe) {
    return 'Previewing a flattened radical form when it is safe.';
  }

  return 'Previewing a nested-radical form without flattening.';
}

export function SettingsPanel({
  presentation,
  settings,
  onClose,
  onPatch,
}: SettingsPanelProps) {
  return (
    <aside
      className={`settings-panel settings-panel--${presentation}`}
      data-testid="settings-panel"
      data-settings-presentation={presentation}
    >
      <div className="settings-panel-header">
        <div>
          <strong>Settings</strong>
          <p>Live app preferences and symbolic display defaults.</p>
        </div>
        <button
          type="button"
          className="settings-panel-close"
          data-testid="settings-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="settings-panel-body">
        <section className="settings-section">
          <div className="settings-section-title">Display</div>
          <div className="settings-field">
            <span>UI Scale</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`ui-scale-${option}`}
                  type="button"
                  data-testid={`settings-ui-scale-${option}`}
                  className={settings.uiScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ uiScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Math Size</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`math-scale-${option}`}
                  type="button"
                  data-testid={`settings-math-scale-${option}`}
                  className={settings.mathScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ mathScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Result Size</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`result-scale-${option}`}
                  type="button"
                  data-testid={`settings-result-scale-${option}`}
                  className={settings.resultScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ resultScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>High Contrast</span>
            <input
              type="checkbox"
              data-testid="settings-high-contrast"
              checked={settings.highContrast}
              onChange={(event) => onPatch({ highContrast: event.currentTarget.checked })}
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">Symbolic Display</div>
          <div className="settings-field">
            <span>Power / Root Style</span>
            <div className="settings-chip-row">
              {SYMBOLIC_DISPLAY_OPTIONS.map((option) => (
                <button
                  key={`symbolic-${option}`}
                  type="button"
                  data-testid={`settings-symbolic-mode-${option}`}
                  className={settings.symbolicDisplayMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ symbolicDisplayMode: option })}
                >
                  {option === 'roots'
                    ? 'Prefer Roots'
                    : option === 'powers'
                      ? 'Prefer Powers'
                      : 'Auto'}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>Flatten Nested Roots When Safe</span>
            <input
              type="checkbox"
              data-testid="settings-flatten-nested-roots"
              checked={settings.flattenNestedRootsWhenSafe}
              onChange={(event) =>
                onPatch({ flattenNestedRootsWhenSafe: event.currentTarget.checked })
              }
            />
          </label>
          <div className="settings-preview-card">
            <div className="settings-preview-label">Preview Input</div>
            <MathStatic className="preview-math" latex="\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}" />
            <div className="settings-preview-label">Preview Output</div>
            <div data-testid="settings-symbolic-preview-result">
              <MathStatic className="result-math" latex={symbolicPreviewLatex(settings)} />
            </div>
            <p data-testid="settings-symbolic-preview-note">{symbolicPreviewSummary(settings)}</p>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">General</div>
          <div className="settings-field">
            <span>Angle Unit</span>
            <div className="settings-chip-row">
              {ANGLE_OPTIONS.map((option) => (
                <button
                  key={`angle-${option}`}
                  type="button"
                  data-testid={`settings-angle-unit-${option}`}
                  className={settings.angleUnit === option ? 'is-active' : ''}
                  onClick={() => onPatch({ angleUnit: option })}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Output Style</span>
            <div className="settings-chip-row">
              {OUTPUT_OPTIONS.map((option) => (
                <button
                  key={`output-${option}`}
                  type="button"
                  data-testid={`settings-output-style-${option}`}
                  className={settings.outputStyle === option ? 'is-active' : ''}
                  onClick={() => onPatch({ outputStyle: option })}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>Auto Switch to Equation</span>
            <input
              type="checkbox"
              data-testid="settings-auto-switch-equation"
              checked={settings.autoSwitchToEquation}
              onChange={(event) =>
                onPatch({ autoSwitchToEquation: event.currentTarget.checked })
              }
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">History</div>
          <label className="settings-toggle-row">
            <span>History Enabled</span>
            <input
              type="checkbox"
              data-testid="settings-history-enabled"
              checked={settings.historyEnabled}
              onChange={(event) => onPatch({ historyEnabled: event.currentTarget.checked })}
            />
          </label>
          <p className="settings-help-text">
            Controls whether new history entries are recorded. The top-row history button still
            only opens or closes the history panel.
          </p>
        </section>
      </div>
    </aside>
  );
}
