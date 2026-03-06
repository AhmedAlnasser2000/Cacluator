import { GUIDE_ARTICLES } from './selectors';

const ADVANCED_CALCULUS_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'advancedCalculus');

export { ADVANCED_CALCULUS_GUIDE_ARTICLES };
