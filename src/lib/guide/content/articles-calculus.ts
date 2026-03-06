import { GUIDE_ARTICLES } from './selectors';

const CALCULUS_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'calculus');

export { CALCULUS_GUIDE_ARTICLES };
