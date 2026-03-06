import { GUIDE_ARTICLES } from './selectors';

const GEOMETRY_GUIDE_ARTICLES = GUIDE_ARTICLES.filter((article) => article.domainId === 'geometry');

export { GEOMETRY_GUIDE_ARTICLES };
