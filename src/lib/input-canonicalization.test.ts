import { describe, expect, it } from 'vitest';
import { canonicalizeMathInput } from './input-canonicalization';

describe('canonicalizeMathInput', () => {
  it('canonicalizes reserved function tokens on open parentheses', () => {
    const result = canonicalizeMathInput('sin(', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\sin(');
  });

  it('canonicalizes typed trig functions to the same function commands used by the keyboard', () => {
    const result = canonicalizeMathInput('cos(x)', {
      mode: 'equation',
      screenHint: 'symbolic',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\cos');
    expect(result.canonicalLatex).toContain('(x)');
  });

  it('canonicalizes pi but leaves bare e alone', () => {
    const piResult = canonicalizeMathInput('pi+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });
    const eResult = canonicalizeMathInput('e+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(piResult.ok && piResult.canonicalLatex).toBe('\\pi+1');
    expect(eResult.ok && eResult.canonicalLatex).toBe('e+1');
  });

  it('does not guess glued tokens such as sinx', () => {
    const result = canonicalizeMathInput('sinx+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('sinx+1');
  });

  it('canonicalizes table editors the same way as calculate and equation', () => {
    const result = canonicalizeMathInput('tan(x)', {
      mode: 'table',
      screenHint: 'table',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\tan');
  });
});

