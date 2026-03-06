import { GUIDE_ARTICLES } from './selectors';

const DISCRETE_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'discrete');

export { DISCRETE_GUIDE_ARTICLES };
