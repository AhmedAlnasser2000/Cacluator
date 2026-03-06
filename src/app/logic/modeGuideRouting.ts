import type {
  AdvancedCalcScreen,
  GeometryScreen,
  GuideRoute,
  StatisticsScreen,
  TrigScreen,
} from '../../types/calculator';

export function createModeGuideOpeners(deps: {
  advancedCalcScreen: AdvancedCalcScreen;
  trigScreen: TrigScreen;
  geometryScreen: GeometryScreen;
  statisticsScreen: StatisticsScreen;
  openGuideRoute: (route: GuideRoute) => void;
  openGuideArticle: (articleId: string) => void;
  setMode: (mode: 'guide') => void;
}) {
  function openAdvancedGuideForScreen(screen: AdvancedCalcScreen = deps.advancedCalcScreen) {
    if (screen === 'home') {
      deps.openGuideRoute({ screen: 'domain', domainId: 'advancedCalculus' });
      deps.setMode('guide');
      return;
    }

    if (screen === 'integralsHome' || screen === 'indefiniteIntegral' || screen === 'definiteIntegral' || screen === 'improperIntegral') {
      deps.openGuideArticle('advanced-integrals');
      return;
    }

    if (screen === 'limitsHome' || screen === 'finiteLimit' || screen === 'infiniteLimit') {
      deps.openGuideArticle('advanced-limits');
      return;
    }

    if (screen === 'seriesHome' || screen === 'maclaurin' || screen === 'taylor') {
      deps.openGuideArticle('advanced-series');
      return;
    }

    if (screen === 'partialsHome' || screen === 'partialDerivative') {
      deps.openGuideArticle('advanced-partials');
      return;
    }

    deps.openGuideArticle('advanced-odes');
  }

  function openTrigGuideForScreen(screen: TrigScreen = deps.trigScreen) {
    if (screen === 'home') {
      deps.openGuideRoute({ screen: 'domain', domainId: 'trigonometry' });
      deps.setMode('guide');
      return;
    }

    if (screen === 'functions') {
      deps.openGuideArticle('trig-functions');
      return;
    }

    if (screen === 'identitiesHome' || screen === 'identitySimplify' || screen === 'identityConvert') {
      deps.openGuideArticle('trig-identities');
      return;
    }

    if (screen === 'equationsHome' || screen === 'equationSolve') {
      deps.openGuideArticle('trig-equations');
      return;
    }

    if (screen === 'trianglesHome' || screen === 'rightTriangle' || screen === 'sineRule' || screen === 'cosineRule') {
      deps.openGuideArticle('trig-triangles');
      return;
    }

    deps.openGuideArticle('trig-special-angles');
  }

  function openGeometryGuideForScreen(screen: GeometryScreen = deps.geometryScreen) {
    if (screen === 'home') {
      deps.openGuideRoute({ screen: 'domain', domainId: 'geometry' });
      deps.setMode('guide');
      return;
    }

    if (screen === 'shapes2dHome' || screen === 'square' || screen === 'rectangle') {
      deps.openGuideArticle('geometry-shapes-2d');
      return;
    }

    if (screen === 'shapes3dHome' || screen === 'cube' || screen === 'cuboid' || screen === 'cylinder' || screen === 'cone' || screen === 'sphere') {
      deps.openGuideArticle('geometry-solids-3d');
      return;
    }

    if (screen === 'triangleHome' || screen === 'triangleArea' || screen === 'triangleHeron') {
      deps.openGuideArticle('geometry-triangles');
      return;
    }

    if (screen === 'circleHome' || screen === 'circle' || screen === 'arcSector') {
      deps.openGuideArticle('geometry-circles');
      return;
    }

    deps.openGuideArticle('geometry-coordinate');
  }

  function openStatisticsGuideForScreen(screen: StatisticsScreen = deps.statisticsScreen) {
    if (screen === 'home' || screen === 'probabilityHome') {
      deps.openGuideRoute({ screen: 'modeGuide', modeId: 'statistics' });
      deps.setMode('guide');
      return;
    }

    if (screen === 'dataEntry' || screen === 'descriptive' || screen === 'frequency') {
      deps.openGuideArticle('statistics-descriptive');
      return;
    }

    if (screen === 'binomial' || screen === 'normal' || screen === 'poisson') {
      deps.openGuideArticle('statistics-probability');
      return;
    }

    deps.openGuideArticle('statistics-regression');
  }

  return {
    openAdvancedGuideForScreen,
    openTrigGuideForScreen,
    openGeometryGuideForScreen,
    openStatisticsGuideForScreen,
  };
}
