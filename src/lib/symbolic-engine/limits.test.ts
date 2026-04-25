import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import { resolveFiniteLimitRule } from './limits'

const ce = new ComputeEngine()

describe('symbolic-engine limits', () => {
  it('resolves removable singularity limits', () => {
    const rational = resolveFiniteLimitRule(ce.parse('\\frac{x^2-1}{x-1}').json, 1, 'x')
    const trig = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(x)}{x}').json, 0, 'x')

    expect(rational.kind).toBe('success')
    if (rational.kind === 'success') {
      expect(rational.value).toBeCloseTo(2, 8)
    }

    expect(trig.kind).toBe('success')
    if (trig.kind === 'success') {
      expect(trig.origin).toBe('rule-based-symbolic')
      expect(trig.value).toBeCloseTo(1, 8)
    }
  })

  it('uses app-owned rules for bounded composed known forms', () => {
    const cases = [
      ['\\frac{\\sin(3x)}{3x}', 1],
      ['\\frac{\\tan(x)}{x}', 1],
      ['\\frac{1-\\cos(x)}{x^2}', 0.5],
      ['\\frac{e^x-1}{x}', 1],
      ['\\frac{\\ln(1+x)}{x}', 1],
      ['\\frac{\\sqrt{1+x}-1}{x}', 0.5],
      ['\\frac{\\sin(x^2)}{x^2}', 1],
      ['\\frac{\\ln(1+x^2)}{x^2}', 1],
    ] as const

    for (const [latex, expected] of cases) {
      const result = resolveFiniteLimitRule(ce.parse(latex).json, 0, 'x')
      expect(result.kind).toBe('success')
      if (result.kind === 'success') {
        expect(result.origin).toBe('rule-based-symbolic')
        expect(result.value).toBeCloseTo(expected, 8)
      }
    }
  })

  it('keeps capped LHopital as fallback outside exact known-form matching', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(3x)}{x}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('heuristic-symbolic')
      expect(result.value).toBeCloseTo(3, 6)
    }
  })

  it('does not apply known-form rules to unsafe compositions', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{\\ln(1+x)}{x^2}').json, 0, 'x')

    if (result.kind === 'success') {
      expect(result.origin).not.toBe('rule-based-symbolic')
    } else {
      expect(result.kind).toBe('unhandled')
    }
  })

  it('promotes former LHopital-only known forms to rule-based symbolic wins', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{1-\\cos(x)}{x^2}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('rule-based-symbolic')
      expect(result.value).toBeCloseTo(0.5, 6)
    }
  })
})
