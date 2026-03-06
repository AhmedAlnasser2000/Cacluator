import { GUIDE_ARTICLES } from './selectors';

const BASIC_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'basics');

export { BASIC_GUIDE_ARTICLES };
