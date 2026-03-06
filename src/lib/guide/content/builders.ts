import type { GuideArticle, GuideExample } from '../../../types/calculator';

type GuideExampleDraft = Omit<GuideExample, 'steps'> & { steps?: string[] };
type GuideArticleDraft = Omit<GuideArticle, 'whatItIs' | 'howToUse' | 'examples'> & {
  whatItIs?: string[];
  whatItMeans?: string[];
  howToUse?: string[];
  examples: GuideExampleDraft[];
};

function defineGuideExample(example: GuideExampleDraft): GuideExample {
  return {
    steps: example.steps ?? [
      'Open the matching tool from the launcher or Guide example card.',
      'Load the example into the target editor.',
      'Press EXE or F1 when you are ready to run it.',
    ],
    ...example,
  };
}

function defineGuideArticle(article: GuideArticleDraft): GuideArticle {
  return {
    whatItIs: article.whatItIs ?? [article.summary],
    howToUse: article.howToUse ?? [
      'Open the matching tool or guide article for this topic.',
      'Use the worked examples to load a ready-made expression into the right editor.',
      'Press EXE or F1 when the expression is ready.',
    ],
    ...article,
    examples: article.examples.map(defineGuideExample),
  };
}

export type { GuideArticleDraft, GuideExampleDraft };
export { defineGuideArticle, defineGuideExample };
