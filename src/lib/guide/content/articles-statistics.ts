import { GUIDE_ARTICLES } from './selectors';

const STATISTICS_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'statistics');

export { STATISTICS_GUIDE_ARTICLES };
