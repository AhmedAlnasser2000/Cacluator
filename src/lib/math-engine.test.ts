import { describe, expect, it } from 'vitest'
import { listExpressionActionDescriptors, runExpressionAction } from './math-engine'

const request = {
  mode: 'calculate' as const,
  document: { latex: '5x+6=3' },
  angleUnit: 'deg' as const,
  outputStyle: 'both' as const,
  variables: { Ans: '0' },
}

describe('runExpressionAction', () => {
  it('solves only when the action is explicit solve', () => {
    const result = runExpressionAction({ ...request, mode: 'equation' }, 'solve')

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('x=')
    expect(result.exactLatex).toContain('\\frac')
    expect(result.approxText).toContain('x ~=')
  })

  it('does not silently solve an equality when evaluating', () => {
    const evaluated = runExpressionAction({ ...request, mode: 'equation' }, 'evaluate')
    const solved = runExpressionAction({ ...request, mode: 'equation' }, 'solve')

    expect(evaluated.error).toBeUndefined()
    expect(evaluated.exactLatex).not.toBe(solved.exactLatex)
    expect(evaluated.approxText ?? '').not.toContain('x ~=')
  })

  it('keeps solve internal to the expression host while exposing only the four public expression capabilities', () => {
    expect(listExpressionActionDescriptors()).toEqual([
      {
        id: 'evaluate',
        label: 'Evaluate',
        publicCapabilityId: 'expression.evaluate',
        execute: expect.any(Function),
      },
      {
        id: 'simplify',
        label: 'Simplify',
        publicCapabilityId: 'expression.simplify',
        execute: expect.any(Function),
      },
      {
        id: 'factor',
        label: 'Factor',
        publicCapabilityId: 'expression.factor',
        execute: expect.any(Function),
      },
      {
        id: 'expand',
        label: 'Expand',
        publicCapabilityId: 'expression.expand',
        execute: expect.any(Function),
      },
      {
        id: 'solve',
        label: 'Solve',
        execute: expect.any(Function),
      },
    ])
  })

  it('falls back to symbolic common-factor extraction', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'ab+ac' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('a')
    expect(result.exactLatex).toContain('b+c')
  })

  it('factors common symbolic terms such as ax+ay', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'ax+ay' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('a')
    expect(result.exactLatex).toContain('x+y')
  })

  it('factors symbolic difference of squares', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^2-y^2' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('x-y')
    expect(result.exactLatex).toContain('x+y')
  })

  it('factors symbolic like terms before numeric coefficients', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '56u+27xu+27' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    const normalized = result.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '') ?? ''
    expect(normalized).toContain('u(')
    expect(normalized).toContain('27x')
    expect(normalized).toContain('56')
    expect(result.exactLatex).toContain('u')
  })

  it('factors simple perfect-square trinomials', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^2+2x+1' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('x+1')
    expect(result.exactLatex).toContain('x+1')
  })

  it('factors supported cubic polynomials through the bounded exact engine', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^3-6x^2+11x-6' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toBe('(x^2-5x+6)(x-1)')
  })

  it('factors supported biquadratics into exact algebraic quadratic factors', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^4-5x^2+3' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toContain('x^2')
    expect(result.exactLatex).toContain('\\sqrt{13}')
  })

  it('factors bounded mixed polynomial-radical families in Factor mode while preserving domain conditions', () => {
    const squareRootCarrier = runExpressionAction(
      { ...request, document: { latex: 'x-5\\sqrt{x}+6' } },
      'factor',
    )
    const rationalPowerCarrier = runExpressionAction(
      { ...request, document: { latex: 'x^{2/3}-5x^{1/3}+6' } },
      'factor',
    )

    expect(squareRootCarrier.error).toBeUndefined()
    expect(squareRootCarrier.resultOrigin).toBe('symbolic-engine')
    expect(squareRootCarrier.exactLatex).toContain('\\sqrt{x}-2')
    expect(squareRootCarrier.exactLatex).toContain('\\sqrt{x}-3')
    expect(squareRootCarrier.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0'])

    expect(rationalPowerCarrier.error).toBeUndefined()
    expect(rationalPowerCarrier.resultOrigin).toBe('symbolic-engine')
    expect(rationalPowerCarrier.exactLatex).toContain('\\sqrt[3]{x}-2')
    expect(rationalPowerCarrier.exactLatex).toContain('\\sqrt[3]{x}-3')
  })

  it('keeps unsupported mixed radical families unchanged in Factor mode', () => {
    const unrelated = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x}+\\sqrt{x+1}' } },
      'factor',
    )

    expect(unrelated.error).toBeUndefined()
    expect(unrelated.exactLatex).toBe('\\sqrt{x}+\\sqrt{x+1}')
  })

  it('evaluates nCr and nPr exactly through the discrete fallback', () => {
    const combination = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nCr}(5,2)' } },
      'evaluate',
    )
    const permutation = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nPr}(5,2)' } },
      'evaluate',
    )

    expect(combination.error).toBeUndefined()
    expect(combination.exactLatex).toBe('10')
    expect(permutation.error).toBeUndefined()
    expect(permutation.exactLatex).toBe('20')
  })

  it('returns controlled errors for invalid discrete domains', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nCr}(5,-1)' } },
      'evaluate',
    )

    expect(result.error).toContain('non-negative integers')
  })

  it('returns a controlled error for explicit negative factorial input', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '(-1)!' } },
      'evaluate',
    )

    expect(result.error).toContain('Factorial is defined only for non-negative integers')
  })

  it('guards factorial output that exceeds the supported display range', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '4455!' } },
      'evaluate',
    )

    expect(result.error).toContain('too large to display safely')
  })

  it('guards evaluated values that are too small to display safely', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '10^{-200}' } },
      'evaluate',
    )

    expect(result.error).toContain('too small to display safely')
  })

  it('guards evaluated values that are too large to display safely', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '10^{200}' } },
      'evaluate',
    )

    expect(result.error).toContain('too large to display safely')
  })

  it('evaluates symbolic derivatives in Calculus Core', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{d}{dx}x^2' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('2x')
  })

  it('evaluates textbook partial derivatives through the symbolic engine', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex?.replaceAll(' ', '')).toContain('2xy')
  })

  it('simplifies direct bounded abs identities without widening Factor', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\left|x\\right|^2' } },
      'simplify',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toBe('x^2')
  })

  it('respects degree mode for direct numeric trig in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
  })

  it('applies the selected angle unit to plain numeric direct trig input', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    )
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    )
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    )

    expect(degreeResult.error).toBeUndefined()
    expect(degreeResult.exactLatex).toBe('1')

    expect(radianResult.error).toBeUndefined()
    expect(Number(radianResult.approxText)).toBeCloseTo(0.8939966636, 6)

    expect(gradianResult.error).toBeUndefined()
    expect(Number(gradianResult.approxText)).toBeCloseTo(0.9876883406, 6)
  })

  it('canonicalizes typed trig tokens before Calculate evaluation', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: 'sin(90)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
  })

  it('applies the selected angle unit to direct trig even when the numeric argument uses pi', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    )
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    )
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    )

    expect(degreeResult.error).toBeUndefined()
    expect(Number(degreeResult.approxText)).toBeCloseTo(0.02741213359, 6)

    expect(radianResult.error).toBeUndefined()
    expect(radianResult.exactLatex).toBe('1')

    expect(gradianResult.error).toBeUndefined()
    expect(Number(gradianResult.approxText)).toBeCloseTo(0.02467150746, 6)
  })

  it('applies the selected angle unit to inverse trig evaluation in Calculate', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    )
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    )
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    )

    expect(degreeResult.error).toBeUndefined()
    expect(Number(degreeResult.approxText)).toBeCloseTo(45, 6)

    expect(radianResult.error).toBeUndefined()
    expect(Number(radianResult.approxText)).toBeCloseTo(Math.PI / 4, 6)

    expect(gradianResult.error).toBeUndefined()
    expect(Number(gradianResult.approxText)).toBeCloseTo(50, 6)
  })

  it('respects gradian mode for direct numeric trig in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(100\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
  })

  it('keeps symbolic trig symbolic in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(x\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toContain('\\sin')
    expect(result.exactLatex).toContain('x')
  })

  it('uses the real-domain numeric evaluator for broadened power, root, and log cases', () => {
    const power = runExpressionAction(
      { ...request, document: { latex: '2^{\\pi}' } },
      'evaluate',
    )
    const oddRoot = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{-8}' } },
      'evaluate',
    )
    const explicitBaseLog = runExpressionAction(
      { ...request, document: { latex: '\\log_{4}\\left(16\\right)' } },
      'evaluate',
    )

    expect(power.error).toBeUndefined()
    expect(power.resultOrigin).toBe('numeric-fallback')
    expect(Number(power.approxText)).toBeCloseTo(8.8249778, 5)

    expect(oddRoot.error).toBeUndefined()
    expect(oddRoot.resultOrigin).toBe('numeric-fallback')
    expect(oddRoot.exactLatex).toBe('-2')

    expect(explicitBaseLog.error).toBeUndefined()
    expect(explicitBaseLog.resultOrigin).toBe('numeric-fallback')
    expect(explicitBaseLog.exactLatex).toBe('2')
  })

  it('accepts exact odd-denominator rational exponents on negative bases', () => {
    const cubeRootPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{\\frac{1}{3}}' } },
      'evaluate',
    )
    const twoThirdsPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{\\frac{2}{3}}' } },
      'evaluate',
    )

    expect(cubeRootPower.error).toBeUndefined()
    expect(cubeRootPower.exactLatex).toBe('-2')
    expect(twoThirdsPower.error).toBeUndefined()
    expect(twoThirdsPower.exactLatex).toBe('4')
  })

  it('rejects real-domain-invalid numeric power, root, and log cases with controlled errors', () => {
    const decimalPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{0.3333333333333333}' } },
      'evaluate',
    )
    const sqrtNegative = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{-4}' } },
      'evaluate',
    )
    const zeroToZero = runExpressionAction(
      { ...request, document: { latex: '0^0' } },
      'evaluate',
    )
    const zeroToNegative = runExpressionAction(
      { ...request, document: { latex: '0^{-1}' } },
      'evaluate',
    )
    const invalidLogBase = runExpressionAction(
      { ...request, document: { latex: '\\log_{1}\\left(16\\right)' } },
      'evaluate',
    )

    expect(decimalPower.error).toContain('odd denominators')
    expect(sqrtNegative.error).toContain('Square roots require non-negative radicands')
    expect(zeroToZero.error).toContain('0^0')
    expect(zeroToNegative.error).toContain('negative exponent')
    expect(invalidLogBase.error).toContain('positive base that is not 1')
  })

  it('does not leak raw NaN through simplify for invalid numeric log/root expressions', () => {
    const logNegative = runExpressionAction(
      { ...request, document: { latex: '\\log\\left(-8\\right)' } },
      'simplify',
    )
    const sqrtNegative = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{-4}' } },
      'simplify',
    )

    expect(logNegative.error).toContain('Logarithms require positive arguments')
    expect(logNegative.approxText).toBeUndefined()
    expect(sqrtNegative.error).toContain('Square roots require non-negative radicands')
    expect(sqrtNegative.approxText).toBeUndefined()
  })

  it('evaluates derivative-at-point expressions', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\left.\\frac{d}{dx}x^2\\right|_{x=3}' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('6')
  })

  it('uses the symbolic derivative engine for chain-rule derivatives', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{d}{dx}\\sin\\left(x^2\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toContain('2x')
    expect(result.exactLatex).toContain('\\cos')
  })

  it('combines exact bounded rational expressions in simplify mode', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{3}+\\frac{1}{6x}' } },
      'simplify',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}')
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0'])
  })

  it('factors rational numerators and denominators separately without cancellation', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{x^2-1}{x^2-x}' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toBe('\\frac{(x-1)(x+1)}{x(x-1)}')
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0')
    expect(result.exactSupplementLatex?.[0]).toContain('x-1\\ne0')
  })

  it('normalizes supported radicals exactly in simplify mode', () => {
    const sqrtSquare = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2}' } },
      'simplify',
    )
    const oddRoot = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{54x^4}' } },
      'simplify',
    )

    expect(sqrtSquare.error).toBeUndefined()
    expect(sqrtSquare.resultOrigin).toBe('symbolic-engine')
    expect(sqrtSquare.exactLatex).toBe('\\vert x\\vert')

    expect(oddRoot.error).toBeUndefined()
    expect(oddRoot.resultOrigin).toBe('symbolic-engine')
    expect(oddRoot.exactLatex).toBe('3x\\sqrt[3]{2x}')
  })

  it('normalizes perfect-square quadratic radicands and two-radical denominators visibly', () => {
    const perfectSquare = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2+2x+1}' } },
      'simplify',
    )
    const factorSurface = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{9(x+1)^2}' } },
      'factor',
    )
    const rationalized = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x}}' } },
      'simplify',
    )

    expect(perfectSquare.error).toBeUndefined()
    expect(perfectSquare.resultOrigin).toBe('symbolic-engine')
    expect(perfectSquare.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x+1\\vert')

    expect(factorSurface.error).toBeUndefined()
    expect(factorSurface.resultOrigin).toBe('symbolic-engine')
    expect(factorSurface.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('3\\vert x+1\\vert')

    expect(rationalized.error).toBeUndefined()
    expect(rationalized.resultOrigin).toBe('symbolic-engine')
    expect(rationalized.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\sqrt{x+1}-\\sqrt{x}')
    const supplements = rationalized.exactSupplementLatex?.join(' ') ?? ''
    expect(supplements).toContain('x+1\\ge0')
    expect(supplements).toContain('x\\ge0')
  })

  it('denests bounded constant nested square roots without widening simplify into variable denesting', () => {
    const denested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{5+2\\sqrt{6}}' } },
      'simplify',
    )
    const variableNested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x+\\sqrt{x}}' } },
      'simplify',
    )

    expect(denested.error).toBeUndefined()
    expect(denested.resultOrigin).toBe('symbolic-engine')
    expect(denested.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\sqrt{2}+\\sqrt{3}')

    expect(variableNested.error).toBeUndefined()
    expect(variableNested.exactLatex).toBe('\\sqrt{x+\\sqrt{x}}')
  })

  it('normalizes bounded quartic perfect-square radicands without turning simplify into factor', () => {
    const repeatedBiquadratic = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^4-10x^2+25}' } },
      'simplify',
    )
    const repeatedDifference = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^4-2x^2+1}' } },
      'simplify',
    )

    expect(repeatedBiquadratic.error).toBeUndefined()
    expect(repeatedBiquadratic.resultOrigin).toBe('symbolic-engine')
    expect(repeatedBiquadratic.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x^2-5\\vert')

    expect(repeatedDifference.error).toBeUndefined()
    expect(repeatedDifference.resultOrigin).toBe('symbolic-engine')
    expect(repeatedDifference.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x^2-1\\vert')
  })

  it('canonicalizes bounded power-root forms in simplify mode with raw power-leaning output', () => {
    const nested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{\\sqrt{x}}' } },
      'simplify',
    )
    const awkward = runExpressionAction(
      { ...request, document: { latex: '(\\sqrt{x})^{3}' } },
      'simplify',
    )

    expect(nested.error).toBeUndefined()
    expect(nested.exactLatex).toBe('x^{\\frac{1}{6}}')
    expect(nested.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0'])

    expect(awkward.error).toBeUndefined()
    expect(awkward.exactLatex).toBe('x^{\\frac{3}{2}}')
    expect(awkward.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0'])
  })

  it('normalizes bounded same-base log sums without applying unsupported log identities', () => {
    const sameBase = runExpressionAction(
      { ...request, document: { latex: '\\ln(x)+\\ln(x+1)' } },
      'simplify',
    )
    const difference = runExpressionAction(
      { ...request, document: { latex: '\\ln(x)-\\ln(y)' } },
      'simplify',
    )

    expect(sameBase.error).toBeUndefined()
    expect(sameBase.exactLatex).toBe('\\ln\\left(x\\left(x+1\\right)\\right)')
    expect(sameBase.exactSupplementLatex).toEqual(['\\text{Conditions: } x>0,\\;x+1>0'])

    expect(difference.error).toBeUndefined()
    expect(difference.exactLatex).toBe('\\ln\\left(x\\right)-\\ln\\left(y\\right)')
    expect(difference.exactSupplementLatex).toBeUndefined()
  })

  it('rationalizes supported radical denominators in simplify mode', () => {
    const numericBinomial = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{1+\\sqrt{2}}' } },
      'simplify',
    )
    const symbolicBinomial = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{x+\\sqrt{2}}' } },
      'simplify',
    )

    expect(numericBinomial.error).toBeUndefined()
    expect(numericBinomial.exactLatex).toBe('\\sqrt{2}-1')

    expect(symbolicBinomial.error).toBeUndefined()
    expect(symbolicBinomial.exactLatex).toContain('x^2-2')
    expect(symbolicBinomial.exactSupplementLatex).toEqual(['\\text{Exclusions: } x+\\sqrt{2}\\ne0'])
  })

  it('widens simplify rationalization to affine-scaled and selected three-term square-root denominators', () => {
    const affineScaled = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{2+\\sqrt{x}}' } },
      'simplify',
    )
    const threeTerm = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}' } },
      'simplify',
    )

    expect(affineScaled.error).toBeUndefined()
    expect(affineScaled.resultOrigin).toBe('symbolic-engine')
    expect(affineScaled.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}')
    expect(affineScaled.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ])

    expect(threeTerm.error).toBeUndefined()
    expect(threeTerm.resultOrigin).toBe('symbolic-engine')
    expect(threeTerm.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})')
  })

  it('preserves radical cleanup in factor mode without rationalizing denominators', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2}' } },
      'factor',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('symbolic-engine')
    expect(result.exactLatex).toBe('\\vert x\\vert')
  })

  it('expands first and then keeps radicals exact', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '(\\sqrt{2}+1)^2' } },
      'expand',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('3+2\\sqrt{2}')
  })

  it('falls back numerically for supported definite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int_0^1 \\sin(x^2) \\, dx' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.warnings).toContain('Symbolic integral unavailable; showing a numeric definite integral.')
    expect(Number(result.exactLatex)).toBeCloseTo(0.310268, 4)
  })

  it('uses the rule-based antiderivative layer for supported indefinite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int (2x+1)^3 \\, dx' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('rule-based-symbolic')
    expect(result.exactLatex).toContain('2x+1')
  })

  it('uses broader substitution and parts rules for stronger indefinite integrals', () => {
    const substitution = runExpressionAction(
      { ...request, document: { latex: '\\int (3x^2+2x)e^{x^3+x^2} \\, dx' } },
      'evaluate',
    )
    const parts = runExpressionAction(
      { ...request, document: { latex: '\\int x^2\\sin(x) \\, dx' } },
      'evaluate',
    )
    const inverseTrig = runExpressionAction(
      { ...request, document: { latex: '\\int \\frac{1}{\\sqrt{4-x^2}} \\, dx' } },
      'evaluate',
    )

    expect(substitution.error).toBeUndefined()
    expect(['compute-engine', 'rule-based-symbolic']).toContain(substitution.resultOrigin)
    expect(substitution.exactLatex === undefined).toBe(false)
    expect(substitution.exactLatex?.includes('e^{') || substitution.exactLatex?.includes('\\exp')).toBe(true)

    expect(parts.error).toBeUndefined()
    expect(['compute-engine', 'rule-based-symbolic']).toContain(parts.resultOrigin)
    expect(parts.exactLatex).toContain('\\cos')

    expect(inverseTrig.error).toBeUndefined()
    expect(['compute-engine', 'rule-based-symbolic']).toContain(inverseTrig.resultOrigin)
    expect(inverseTrig.exactLatex).toContain('\\arcsin')
  })

  it('fails cleanly for unsupported indefinite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int \\sqrt{1+x^4} \\, dx' } },
      'evaluate',
    )

    expect(result.error).toContain('could not be determined symbolically')
  })

  it('falls back numerically for supported limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{\\sin(x)}{x}' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('heuristic-symbolic')
    expect(result.warnings).toContain("Rule-based limit resolution used capped L'Hopital on a supported ratio form.")
    expect(result.exactLatex).toBe('1')
  })

  it('evaluates left-hand and right-hand limits through calculus options', () => {
    const left = runExpressionAction(
      {
        ...request,
        document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' },
        calculusOptions: { limitDirection: 'left' },
      },
      'evaluate',
    )
    const right = runExpressionAction(
      {
        ...request,
        document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' },
        calculusOptions: { limitDirection: 'right' },
      },
      'evaluate',
    )

    expect(left.error).toBeUndefined()
    expect(left.exactLatex).toBe('-1')
    expect(left.warnings).toContain('Symbolic limit unavailable; showing a numeric left-hand limit approximation.')
    expect(right.error).toBeUndefined()
    expect(right.exactLatex).toBe('1')
    expect(right.warnings).toContain('Symbolic limit unavailable; showing a numeric right-hand limit approximation.')
  })

  it('returns a controlled error for mismatched two-sided limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' } },
      'evaluate',
    )

    expect(result.error).toContain('do not agree')
  })

  it('returns a controlled error for unbounded limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{1}{x}' } },
      'evaluate',
    )

    expect(result.error).toContain('unbounded')
  })

  it('supports common rational limits at positive infinity', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to \\infty} \\left(\\frac{3x^2+1}{2x^2-5}\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.resultOrigin).toBe('rule-based-symbolic')
    expect(result.exactLatex).toBe('1.5')
  })

  it('returns controlled errors for unbounded infinite-target limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to -\\infty} \\left(x^2+x\\right)' } },
      'evaluate',
    )

    expect(result.error).toContain('approaches -∞')
  })
})
