import { describe, expect, it } from 'vitest'
import { runExpressionAction } from './math-engine'

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
    expect(evaluated.approxText).not.toContain('x ~=')
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

  it('respects degree mode for direct numeric trig in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
  })

  it('canonicalizes typed trig tokens before Calculate evaluation', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: 'sin(90)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
  })

  it('keeps explicit radian trig unchanged even when the global mode is degrees', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    )

    expect(result.error).toBeUndefined()
    expect(result.exactLatex).toBe('1')
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
