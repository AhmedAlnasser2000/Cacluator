import { describe, expect, it } from 'vitest'
import {
  runDerivativeEngine,
  runFactoringEngine,
  runIntegralEngine,
  runPartialDerivativeEngine,
} from './orchestrator'

describe('symbolic-engine orchestrator', () => {
  it('normalizes and factors through the symbolic engine', () => {
    const result = runFactoringEngine('56u+27xu+27')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.strategy).toBe('symbolic-like-terms')
      expect(result.exactLatex).toContain('u')
    }
  })

  it('uses the bounded polynomial strategy for supported cubic factorization', () => {
    const result = runFactoringEngine('x^3-6x^2+11x-6')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.strategy).toBe('polynomial-factorization')
      expect(result.exactLatex).toContain('x-1')
      expect(result.exactLatex).toContain('x^2-5x+6')
    }
  })

  it('differentiates and integrates through the orchestrator', () => {
    const derivative = runDerivativeEngine('\\ln(3x+1)')
    const integral = runIntegralEngine('xe^x')

    expect(derivative.kind).toBe('success')
    if (derivative.kind === 'success') {
      expect(derivative.exactLatex).toContain('3')
    }

    expect(integral.kind).toBe('success')
  })

  it('handles partial derivatives through the orchestrator', () => {
    const result = runPartialDerivativeEngine({
      variable: 'x',
      bodyLatex: 'x^2y+y^3',
    })

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.exactLatex.replaceAll(' ', '')).toContain('2xy')
    }
  })
})
