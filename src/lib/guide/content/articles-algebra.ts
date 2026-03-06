import { GUIDE_ARTICLES } from './selectors';

const ALGEBRA_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'algebra');

export { ALGEBRA_GUIDE_ARTICLES };
