import type { RefObject } from 'react';
import { MODE_LABELS } from '../../lib/menu';
import { getGuideArticle } from '../../lib/guide/content';
import type { GuideListEntry } from '../../lib/guide/navigation';
import type { GuideArticle, GuideModeRef, GuideRoute, GuideRouteMeta } from '../../types/calculator';

type GuideWorkspaceProps = {
  route: GuideRoute;
  routeMeta: GuideRouteMeta | null;
  listEntries: GuideListEntry[];
  currentSelectionIndex: number;
  homeEntryCount: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  article: GuideArticle | null;
  modeRef: GuideModeRef | null;
  onOpenGuideRoute: (route: GuideRoute) => void;
  onSetCurrentSelectionIndex: (index: number) => void;
  onSetGuideQuery: (query: string) => void;
  onLaunchGuideExample: (example: GuideArticle['examples'][number]) => void;
  onCopyGuideExample: (example: GuideArticle['examples'][number]) => void;
};

export function GuideWorkspace({
  route,
  routeMeta,
  listEntries,
  currentSelectionIndex,
  homeEntryCount,
  searchInputRef,
  menuPanelRef,
  searchQuery,
  article,
  modeRef,
  onOpenGuideRoute,
  onSetCurrentSelectionIndex,
  onSetGuideQuery,
  onLaunchGuideExample,
  onCopyGuideExample,
}: GuideWorkspaceProps) {
  return (
    <section className={`mode-panel ${route.screen === 'article' || (route.screen === 'modeGuide' && route.modeId) ? 'guide-article-panel' : 'guide-menu-panel'}`}>
      {routeMeta ? (
        <div className="equation-panel-header guide-panel-header">
          <div className="equation-panel-copy">
            <div className="guide-breadcrumbs">
              {routeMeta.breadcrumb.map((segment) => (
                <span key={`${route.screen}-workspace-${segment}`} className="guide-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{routeMeta.title}</strong>
            </div>
            <p className="equation-hint">{routeMeta.description}</p>
          </div>
        </div>
      ) : null}

      {(route.screen === 'home'
        || route.screen === 'domain'
        || route.screen === 'symbolLookup'
        || route.screen === 'search'
        || (route.screen === 'modeGuide' && !route.modeId)) ? (
          <>
            {(route.screen === 'search' || route.screen === 'symbolLookup') ? (
              <label className="guide-search-row guide-search-row-panel">
                <span>{route.screen === 'symbolLookup' ? 'Filter symbols' : 'Search guide'}</span>
                <input
                  ref={routeMeta?.focusTarget === 'search' ? searchInputRef : undefined}
                  className="guide-search-input"
                  value={searchQuery}
                  onChange={(event) => onSetGuideQuery(event.target.value)}
                  placeholder={route.screen === 'symbolLookup' ? 'sum, sigma, nCr, integral...' : 'Search domains, symbols, modes...'}
                />
              </label>
            ) : null}
            <div
              ref={menuPanelRef}
              className="guide-list"
              tabIndex={-1}
            >
              {listEntries.length === 0 ? (
                <div className="guide-empty">No active guide entries match this view yet.</div>
              ) : listEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className={`guide-entry ${index === currentSelectionIndex ? 'is-selected' : ''}`}
                  onClick={() => onOpenGuideRoute(entry.route)}
                  onMouseEnter={() => onSetCurrentSelectionIndex(index)}
                >
                  <span className="launcher-entry-hotkey">{entry.hotkey ?? `${index + 1}`}</span>
                  <span className="launcher-entry-content">
                    <strong>{entry.title}</strong>
                    <small>{entry.description}</small>
                  </span>
                  {'resultKind' in entry && entry.resultKind ? (
                    <span className="guide-result-kind">{entry.resultKind}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="guide-menu-help">
              <span>
                {route.screen === 'home'
                  ? `1-${homeEntryCount}: Open | EXE/F1: Select | F5: MENU | F6: Exit`
                  : 'Arrow keys or ◂/▸ move | EXE/F1 opens | F5/Esc back | F6 exit'}
              </span>
            </div>
          </>
        ) : null}

      {route.screen === 'article' && article ? (
        <div className="guide-article">
          <section className="editor-card guide-section guide-teaching-panel">
            <h3 className="guide-section-title">What It Is</h3>
            <ul className="guide-bullets">
              {article.whatItIs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {article.whatItMeans?.length ? (
            <section className="editor-card guide-section guide-meaning-panel">
              <h3 className="guide-section-title">What It Means</h3>
              <ul className="guide-bullets">
                {article.whatItMeans.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="editor-card guide-section guide-teaching-panel">
            <h3 className="guide-section-title">How To Use It</h3>
            <ul className="guide-bullets">
              {article.howToUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Concepts</h3>
            <ul className="guide-bullets">
              {article.concepts.map((concept) => (
                <li key={concept}>{concept}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Where To Find It</h3>
            <ul className="guide-bullets">
              {article.whereToFindIt.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Best Modes</h3>
            <div className="guide-chip-row">
              {article.bestModes.map((mode) => (
                <button
                  key={mode}
                  className="guide-chip"
                  onClick={() => onOpenGuideRoute({ screen: 'modeGuide', modeId: mode })}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Worked Examples</h3>
            <div className="guide-example-list">
              {article.examples.map((example, index) => (
                <article
                  key={example.id}
                  className={`guide-example ${index === currentSelectionIndex ? 'is-selected' : ''}`}
                  onMouseEnter={() => onSetCurrentSelectionIndex(index)}
                >
                  <div className="card-title-row">
                    <strong>{example.title}</strong>
                    {index === currentSelectionIndex ? (
                      <span className="guide-result-kind">Selected</span>
                    ) : null}
                  </div>
                  <p>{example.explanation}</p>
                  <ol className="guide-steps">
                    {example.steps.map((step) => (
                      <li key={step} className="guide-step">{step}</li>
                    ))}
                  </ol>
                  <p className="guide-expected">Expected: {example.expected}</p>
                  <div className="display-card-actions">
                    <button onClick={() => onLaunchGuideExample(example)}>Open in Tool</button>
                    <button onClick={() => onCopyGuideExample(example)}>Copy Expr</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Common Mistakes</h3>
            <ul className="guide-bullets">
              {article.pitfalls.map((pitfall) => (
                <li key={pitfall}>{pitfall}</li>
              ))}
            </ul>
          </section>
          {article.exactVsNumeric?.length ? (
            <section className="editor-card guide-section">
              <h3 className="guide-section-title">Exact vs Numeric</h3>
              <ul className="guide-bullets">
                {article.exactVsNumeric.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {article.relatedArticleIds?.length ? (
            <section className="editor-card guide-section">
              <h3 className="guide-section-title">Related Topics</h3>
              <div className="guide-related-links">
                {article.relatedArticleIds.map((articleId) => {
                  const relatedArticle = getGuideArticle(articleId);
                  if (!relatedArticle) {
                    return null;
                  }

                  return (
                    <button
                      key={articleId}
                      className="guide-chip"
                      onClick={() => onOpenGuideRoute({ screen: 'article', articleId })}
                    >
                      {relatedArticle.title}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {route.screen === 'modeGuide' && modeRef ? (
        <div className="guide-article">
          <section className="editor-card guide-section guide-mode-card">
            <h3 className="guide-section-title">{modeRef.title}</h3>
            <p>{modeRef.summary}</p>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">When To Use It</h3>
            <ul className="guide-bullets">
              {modeRef.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">When Not To Use It</h3>
            <ul className="guide-bullets">
              {modeRef.avoidFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {modeRef.articleIds.length > 0 ? (
            <section className="editor-card guide-section">
              <strong>Related topics</strong>
              <div className="guide-related-links">
                {modeRef.articleIds.map((articleId) => {
                  const relatedArticle = getGuideArticle(articleId);
                  if (!relatedArticle) {
                    return null;
                  }

                  return (
                    <button
                      key={articleId}
                      className="guide-chip"
                      onClick={() => onOpenGuideRoute({ screen: 'article', articleId })}
                    >
                      {relatedArticle.title}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
