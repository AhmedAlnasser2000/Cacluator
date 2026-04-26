import { describe, expect, it } from 'vitest';
import { detectRealRangeImpossibility } from './range-impossibility';

describe('detectRealRangeImpossibility', () => {
  it('proves direct trig carrier impossibility', () => {
    const result = detectRealRangeImpossibility('\\sin\\left(x^2\\right)=5');

    expect(result.kind).toBe('impossible');
    if (result.kind !== 'impossible') {
      throw new Error('Expected a range impossibility');
    }
    expect(result.badge).toBe('Range Guard');
    expect(result.error).toContain('between -1 and 1');
  });

  it('proves bounded trig product impossibility', () => {
    const result = detectRealRangeImpossibility('\\sin\\left(x^2\\right)\\cos\\left(x\\right)=5');

    expect(result.kind).toBe('impossible');
    if (result.kind !== 'impossible') {
      throw new Error('Expected a range impossibility');
    }
    expect(result.summaryText).toContain('stays in [-1, 1]');
  });

  it('proves affine and sum-based bounded impossibility', () => {
    const affine = detectRealRangeImpossibility('2\\cos^2\\left(x\\right)-1=3');
    const summed = detectRealRangeImpossibility('\\sin\\left(x\\right)+\\cos\\left(x\\right)=3');
    const shifted = detectRealRangeImpossibility('-2\\cos\\left(x\\right)+4=10');

    expect(affine.kind).toBe('impossible');
    expect(summed.kind).toBe('impossible');
    expect(shifted.kind).toBe('impossible');
  });

  it('proves positive exponential impossibility', () => {
    const result = detectRealRangeImpossibility('e^x=-1');

    expect(result.kind).toBe('impossible');
    if (result.kind !== 'impossible') {
      throw new Error('Expected a range impossibility');
    }
    expect(result.error).toContain('always positive');
  });

  it('proves principal root and absolute-value nonnegative impossibility', () => {
    const root = detectRealRangeImpossibility('\\sqrt{x}=-1');
    const absolute = detectRealRangeImpossibility('\\left|x\\right|=-2');

    expect(root.kind).toBe('impossible');
    expect(root.kind === 'impossible' ? root.error : '').toContain('square roots are always nonnegative');
    expect(absolute.kind).toBe('impossible');
    expect(absolute.kind === 'impossible' ? absolute.error : '').toContain('absolute values are always nonnegative');
  });

  it('does not mark supported or still-unknown equations as impossible', () => {
    expect(detectRealRangeImpossibility('\\sin\\left(x\\right)=\\frac{1}{2}').kind).toBe('none');
    expect(detectRealRangeImpossibility('\\sin\\left(x\\right)+\\cos\\left(x\\right)=1').kind).toBe('none');
    expect(detectRealRangeImpossibility('\\cos\\left(x\\right)=x').kind).toBe('none');
  });
});
