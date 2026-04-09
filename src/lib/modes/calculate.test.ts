import { describe, expect, it } from 'vitest'
import { runCalculateAlgebraTransform, runCalculateMode } from './calculate'

describe('runCalculateMode', () => {
  it('returns a prompt instead of solving equations', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '5x+6=3',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('prompt')
    if (result.kind !== 'prompt') {
      throw new Error('Expected a prompt outcome')
    }
    expect(result.message).toBe('Use Equation mode to solve this expression.')
    expect(result.targetMode).toBe('equation')
    expect(result.carryLatex).toBe('5x+6=3')
  })

  it('keeps factorization inside calculate mode', () => {
    const result = runCalculateMode({
      action: 'factor',
      latex: 'x^2+2x+1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toContain('x+1')
  })

  it('returns a controlled error for algebra relation operators', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: 'x\\le2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('error')
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome')
    }
    expect(result.error).toContain('Inequalities')
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    })
  })

  it('runs explicit algebra transforms without changing the broad simplify action', () => {
    const result = runCalculateAlgebraTransform({
      action: 'combineFractions',
      latex: '\\frac{1}{3}+\\frac{1}{6x}',
      angleUnit: 'deg',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}')
    expect(result.transformBadges).toEqual(['Combine Fractions'])
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0')
  })

  it('runs PRL3 symbolic algebra transforms explicitly in Calculate', () => {
    const asPower = runCalculateAlgebraTransform({
      action: 'rewriteAsPower',
      latex: '\\sqrt[3]{\\sqrt{x}}',
      angleUnit: 'deg',
    })
    const asRoot = runCalculateAlgebraTransform({
      action: 'rewriteAsRoot',
      latex: 'x^{1/6}',
      angleUnit: 'deg',
    })
    const changedBase = runCalculateAlgebraTransform({
      action: 'changeBase',
      latex: '\\log_{4}(x)',
      angleUnit: 'deg',
    })

    expect(asPower.kind).toBe('success')
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{6}}')
    expect(asPower.transformBadges).toEqual(['Rewrite as Power'])

    expect(asRoot.kind).toBe('success')
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(asRoot.exactLatex).toBe('\\sqrt[6]{x}')
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root'])

    expect(changedBase.kind).toBe('success')
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}')
    expect(changedBase.transformBadges).toEqual(['Change Base'])
  })

  it('runs widened bounded conjugate and rationalize transforms explicitly in Calculate', () => {
    const affineConjugate = runCalculateAlgebraTransform({
      action: 'conjugate',
      latex: '\\frac{1}{2+\\sqrt{x}}',
      angleUnit: 'deg',
    })
    const threeTermRationalize = runCalculateAlgebraTransform({
      action: 'rationalize',
      latex: '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}',
      angleUnit: 'deg',
    })

    expect(affineConjugate.kind).toBe('success')
    if (affineConjugate.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(affineConjugate.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}')
    expect(affineConjugate.transformBadges).toEqual(['Conjugate'])
    expect(affineConjugate.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ])

    expect(threeTermRationalize.kind).toBe('success')
    if (threeTermRationalize.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(threeTermRationalize.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})')
    expect(threeTermRationalize.transformBadges).toEqual(['Rationalize'])
  })
})
