import { describe, expect, it } from 'vitest';
import {
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  getStatisticsSoftActions,
  moveStatisticsMenuIndex,
} from './navigation';

describe('statistics navigation', () => {
  it('returns route metadata and guide links', () => {
    expect(getStatisticsRouteMeta('home').breadcrumb).toEqual(['Statistics']);
    expect(getStatisticsRouteMeta('probabilityHome').guideArticleId).toBe('statistics-probability');
    expect(getStatisticsRouteMeta('inferenceHome').guideArticleId).toBe('statistics-inference');
    expect(getStatisticsRouteMeta('correlation').breadcrumb).toEqual([
      'Statistics',
      'Correlation',
    ]);
    expect(getStatisticsRouteMeta('binomial').editorMode).toBe('editable');
    expect(getStatisticsRouteMeta('frequency').focusTarget).toBe('guidedForm');
    expect(getStatisticsRouteMeta('meanInference').breadcrumb).toEqual([
      'Statistics',
      'Inference',
      'Mean',
    ]);
  });

  it('clamps menu movement within bounds', () => {
    expect(moveStatisticsMenuIndex('home', 0, -1)).toBe(0);
    expect(moveStatisticsMenuIndex('home', 3, 10)).toBe(6);
    expect(moveStatisticsMenuIndex('probabilityHome', 0, 10)).toBe(2);
    expect(moveStatisticsMenuIndex('inferenceHome', 0, 10)).toBe(0);
  });

  it('returns correct parent screens', () => {
    expect(getStatisticsParentScreen('home')).toBeNull();
    expect(getStatisticsParentScreen('dataEntry')).toBe('home');
    expect(getStatisticsParentScreen('binomial')).toBe('probabilityHome');
    expect(getStatisticsParentScreen('meanInference')).toBe('inferenceHome');
  });

  it('uses menu-aware and tool-aware soft actions', () => {
    expect(getStatisticsSoftActions('home').map((action) => action.id)).toEqual([
      'open',
      'guide',
      'back',
      'exit',
    ]);
    expect(getStatisticsSoftActions('descriptive').map((action) => action.id)).toEqual([
      'evaluate',
      'guide',
      'menu',
      'clear',
      'history',
    ]);
  });
});
