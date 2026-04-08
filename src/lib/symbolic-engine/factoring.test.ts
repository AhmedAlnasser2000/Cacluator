import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import { factorAst } from './factoring'

const ce = new ComputeEngine()

function factorLatex(latex: string) {
  const parsed = ce.parse(latex)
  return ce.box(factorAst(parsed.json).node as Parameters<typeof ce.box>[0]).latex
}

describe('symbolic-engine factoring', () => {
  it('prefers symbolic grouping before numeric factoring', () => {
    const factored = factorLatex('56u+27xu+27')

    expect(factored).toContain('u')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')
    expect(normalized).toContain('u(')
    expect(normalized).toContain('27x')
    expect(normalized).toContain('56')
  })

  it('factors symbolic common terms', () => {
    expect(factorLatex('ab+ac')).toContain('b+c')
    expect(factorLatex('3xy+5x')).toContain('3y+5')
  })

  it('falls back to numeric gcd factoring when symbolic grouping is not primary', () => {
    const factored = factorLatex('14x+21')

    expect(factored).toContain('7')
    expect(factored).toContain('2x+3')
  })

  it('keeps integer quadratic factoring working through the shared polynomial core', () => {
    const factored = factorLatex('x^2-5x+6')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')

    expect(normalized).toContain('x-2')
    expect(normalized).toContain('x-3')
  })

  it('adds bounded cubic factorization through the shared polynomial factor engine', () => {
    const factored = factorLatex('x^3-6x^2+11x-6')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')

    expect(normalized).toContain('x-1')
    expect(normalized).toContain('x^2-5x+6')
  })

  it('adds bounded quartic factorization for supported biquadratic and quadratic-pair families', () => {
    const biquadratic = factorLatex('x^4-5x^2+4').replaceAll('\\left', '').replaceAll('\\right', '')
    const quadraticPair = factorLatex('x^4+3x^3-x^2-4x+2').replaceAll('\\left', '').replaceAll('\\right', '')

    expect(biquadratic).toContain('x^2-1')
    expect(biquadratic).toContain('x^2-4')
    expect(quadraticPair).toContain('x^2+x-1')
    expect(quadraticPair).toContain('x^2+2x-2')
  })
})
