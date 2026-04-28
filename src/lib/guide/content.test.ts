import { describe, expect, it } from 'vitest'
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities'
import {
  getActiveGuideArticles,
  getGuideArticle,
  getGuideHomeEntries,
  getGuideModeRef,
} from './content'

describe('guide content', () => {
  it('exposes the active home entries including Guide utilities', () => {
    const entries = getGuideHomeEntries(ACTIVE_CAPABILITIES)

    expect(entries.map((entry) => entry.title)).toEqual([
      'Basics',
      'Algebra',
      'Discrete',
      'Calculus',
      'Linear Algebra',
      'Advanced Calculus',
      'Trigonometry',
      'Geometry',
      'Symbol Lookup',
      'Mode Guide',
    ])
  })

  it('keeps only active guide articles visible', () => {
    const articleIds = getActiveGuideArticles(ACTIVE_CAPABILITIES).map((article) => article.id)

    expect(articleIds).toContain('algebra-manipulation')
    expect(articleIds).toContain('discrete-operators')
    expect(articleIds).toContain('calculus-integrals-limits')
    expect(articleIds).toContain('linear-algebra-matrix-vector')
    expect(articleIds).toContain('advanced-integrals')
    expect(articleIds).toContain('trig-functions')
    expect(articleIds).toContain('geometry-coordinate')
  })

  it('describes the current calculator modes', () => {
    expect(getGuideModeRef('equation')?.title).toBe('Equation')
    expect(getGuideModeRef('table')?.bestFor[0]).toContain('Function tables')
    expect(getGuideModeRef('advancedCalculus')?.title).toBe('Advanced Calc')
    expect(getGuideModeRef('trigonometry')?.title).toBe('Trigonometry')
    expect(getGuideModeRef('statistics')?.title).toBe('Statistics')
    expect(getGuideModeRef('geometry')?.title).toBe('Geometry')
  })

  it('adds teaching-first sections to rewritten guide articles', () => {
    const advancedIntegrals = getGuideArticle('advanced-integrals')
    const advancedPartials = getGuideArticle('advanced-partials')
    const basicsKeyboard = getGuideArticle('basics-keyboard')
    const advancedSeries = getGuideArticle('advanced-series')
    const calculusDerivatives = getGuideArticle('calculus-derivatives')
    const algebraManipulation = getGuideArticle('algebra-manipulation')

    expect(advancedIntegrals?.whatItIs.length).toBeGreaterThan(0)
    expect(advancedIntegrals?.whatItMeans?.length).toBeGreaterThan(0)
    expect(advancedPartials?.whatItIs.length).toBeGreaterThan(0)
    expect(advancedPartials?.whatItMeans?.join(' ')).toContain('other variables')
    expect(advancedSeries?.whatItMeans?.length).toBeGreaterThan(0)
    expect(basicsKeyboard?.whatItMeans).toBeUndefined()
    expect(advancedIntegrals?.examples[0]?.steps.length).toBeGreaterThan(0)
    expect(advancedPartials?.examples[0]?.steps.length).toBeGreaterThan(0)
    expect(calculusDerivatives?.whatItMeans?.join(' ')).toContain('product rule')
    expect(algebraManipulation?.whatItMeans?.join(' ')).toContain('BIDMAS')
  })

  it('routes calculus examples into the calculate workbench', () => {
    const derivativeArticle = getGuideArticle('calculus-derivatives')
    const integralArticle = getGuideArticle('calculus-integrals-limits')
    const functionPowerExample = derivativeArticle?.examples.find((example) => example.id === 'calc-derivative-function-power')
    const exactDefiniteExample = integralArticle?.examples.find((example) => example.id === 'calc-integral-definite-exact')
    const unsafeDefiniteExample = integralArticle?.examples.find((example) => example.id === 'calc-integral-definite-unsafe')
    const limitExample = integralArticle?.examples.find((example) => example.id === 'calc-limit')
    const directionalLimitExample = integralArticle?.examples.find((example) => example.id === 'calc-limit-directional-pole')

    expect(derivativeArticle?.examples[0]?.launch.kind).toBe('load-expression')
    if (derivativeArticle?.examples[0]?.launch.kind !== 'load-expression') {
      throw new Error('Expected calculus derivative example to load into a tool')
    }
    expect(derivativeArticle.examples[0].launch.calculateScreen).toBe('derivative')
    expect(functionPowerExample?.launch.kind).toBe('load-expression')
    if (functionPowerExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected function-power derivative example to load into a tool')
    }
    expect(functionPowerExample.launch.calculateSeed?.bodyLatex).toContain('\\sin^2')

    expect(exactDefiniteExample?.launch.kind).toBe('load-expression')
    if (exactDefiniteExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected exact definite-integral example to load into a tool')
    }
    expect(exactDefiniteExample.launch.calculateSeed?.kind).toBe('definite')
    expect(unsafeDefiniteExample?.expected).toContain('controlled real-domain')

    expect(limitExample?.launch.kind).toBe('load-expression')
    if (limitExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected calculus limit example to load into a tool')
    }
    expect(limitExample.launch.calculateScreen).toBe('limit')
    expect(limitExample.launch.calculateSeed?.targetKind).toBe('finite')
    expect(directionalLimitExample?.launch.kind).toBe('load-expression')
    if (directionalLimitExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected directional limit example to load into a tool')
    }
    expect(directionalLimitExample.launch.calculateSeed?.direction).toBe('right')
  })

  it('keeps advanced calculus mode guidance active', () => {
    const modeRef = getGuideModeRef('advancedCalculus')

    expect(modeRef).toBeDefined()
    expect(modeRef?.summary).toContain('single-variable calculus')
    expect(modeRef?.articleIds).toContain('advanced-partials')
    expect(getGuideArticle('advanced-integrals')?.summary).toContain('shared integral backend')
    expect(getGuideArticle('advanced-limits')?.summary).toContain('shared finite/infinite limit backend')
    expect(getGuideArticle('advanced-series')?.examples[0]?.launch.advancedCalcScreen).toBe('maclaurin')
    expect(getGuideArticle('advanced-partials')?.examples[0]?.launch.advancedCalcScreen).toBe('partialDerivative')
  })

  it('exposes trig guide examples that target the new mode', () => {
    const trigFunctions = getGuideArticle('trig-functions')
    const trigTriangles = getGuideArticle('trig-triangles')
    const trigEquations = getGuideArticle('trig-equations')
    const algebraEquations = getGuideArticle('algebra-equations')

    expect(trigFunctions?.examples[0]?.launch.targetMode).toBe('trigonometry')
    expect(trigFunctions?.examples[0]?.launch.trigScreen).toBe('functions')
    expect(trigTriangles?.examples[0]?.launch.kind).toBe('open-tool')
    expect(trigEquations?.summary).toContain('selected exact rewrite')
    expect(trigEquations?.summary).toContain('affine-argument')
    expect(trigEquations?.concepts.join(' ')).toContain('range guards')
    expect(trigEquations?.concepts.join(' ')).toContain('exp/log')
    expect(trigEquations?.pitfalls.join(' ')).toContain('log-combine sums are included')
    expect(algebraEquations?.concepts.join(' ')).toContain('exact range checks')
    expect(algebraEquations?.concepts.join(' ')).toContain('2log(x)-1=0')
    expect(algebraEquations?.concepts.join(' ')).toContain('ln(x)+ln(x+1)=2')
    expect(trigEquations?.examples[2]?.launch.trigScreen).toBe('equationSolve')
  })

  it('exposes geometry guide examples that target Geometry mode', () => {
    const geometryCoordinate = getGuideArticle('geometry-coordinate')
    const geometryTriangles = getGuideArticle('geometry-triangles')
    const geometrySolids = getGuideArticle('geometry-solids-3d')

    expect(geometryCoordinate?.examples[0]?.launch.targetMode).toBe('geometry')
    expect(geometryCoordinate?.examples[0]?.launch.geometryScreen).toBe('distance')
    expect(geometryTriangles?.examples[1]?.launch.geometryScreen).toBe('triangleHeron')
    expect(geometryTriangles?.concepts.join(' ')).toContain('top editor')
    expect(geometryTriangles?.concepts.join(' ')).toContain('solve-missing')
    expect(geometrySolids?.concepts.join(' ')).toContain('top editor')
    expect(geometryCoordinate?.concepts.join(' ')).toContain('one unknown coordinate')
  })

  it('keeps statistics guidance aligned with the shared statistics core', () => {
    const descriptive = getGuideArticle('statistics-descriptive')
    const inference = getGuideArticle('statistics-inference')
    const probability = getGuideArticle('statistics-probability')
    const regression = getGuideArticle('statistics-regression')

    expect(descriptive?.concepts.join(' ')).toContain('top Statistics editor')
    expect(inference?.summary).toContain('one-sample mean')
    expect(inference?.examples[0]?.launch.statisticsScreen).toBe('meanInference')
    expect(probability?.summary).toContain('bounded binomial')
    expect(probability?.examples[0]?.launch.statisticsScreen).toBe('binomial')
    expect(regression?.summary).toContain('linear regression')
    expect(regression?.summary).toContain('quality summaries')
    expect(regression?.concepts.join(' ')).toContain('SSE')
    expect(regression?.pitfalls.join(' ')).toContain('causation')
    expect(regression?.examples[0]?.launch.statisticsScreen).toBe('regression')
    expect(getGuideModeRef('statistics')?.articleIds).toContain('statistics-inference')
  })
})
