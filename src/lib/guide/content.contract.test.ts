import { describe, expect, it } from 'vitest';
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities';
import {
  getActiveGuideArticles,
  getGuideArticle,
  getGuideModeRef,
} from './content';

describe('guide content parity contract', () => {
  it('keeps required core article ids available', () => {
    const requiredArticleIds = [
      'algebra-equations',
      'trig-equations',
      'geometry-solids-3d',
      'statistics-probability',
      'advanced-integrals',
    ] as const;

    requiredArticleIds.forEach((articleId) => {
      expect(getGuideArticle(articleId)).toBeDefined();
    });
  });

  it('keeps active-article capability gating stable for track-critical articles', () => {
    const activeIds = new Set(getActiveGuideArticles(ACTIVE_CAPABILITIES).map((article) => article.id));

    expect(activeIds.has('algebra-equations')).toBe(true);
    expect(activeIds.has('trig-equations')).toBe(true);
    expect(activeIds.has('geometry-solids-3d')).toBe(true);
    // Statistics guide content exists, but capability gating may hide it in some profiles.
  });

  it('keeps mode-ref coverage for active app modes', () => {
    expect(getGuideModeRef('equation')?.title).toBe('Equation');
    expect(getGuideModeRef('trigonometry')?.title).toBe('Trigonometry');
    expect(getGuideModeRef('geometry')?.title).toBe('Geometry');
    expect(getGuideModeRef('statistics')?.title).toBe('Statistics');
    expect(getGuideModeRef('advancedCalculus')?.title).toBe('Advanced Calc');
  });
});
