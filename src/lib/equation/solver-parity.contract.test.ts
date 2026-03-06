import { describe, expect, it } from 'vitest';
import { runSharedEquationSolve } from './shared-solve';

const baseRequest = {
  originalLatex: '',
  resolvedLatex: '',
  angleUnit: 'deg' as const,
  outputStyle: 'both' as const,
  ansLatex: '0',
};

describe('solver parity contract', () => {
  it('keeps bounded trig direct solve behavior stable', () => {
    const outcome = runSharedEquationSolve({
      ...baseRequest,
      originalLatex: '\\sin\\left(2x\\right)=0',
      resolvedLatex: '\\sin\\left(2x\\right)=0',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected success outcome');
    }
    expect(outcome.plannerBadges).toContain('Trig Solve Backend');
    expect(outcome.exactLatex).toContain('x');
  });

  it('keeps range-guard impossibility behavior stable', () => {
    const outcome = runSharedEquationSolve({
      ...baseRequest,
      originalLatex: '\\sin\\left(x^2\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)=5',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected error outcome');
    }
    expect(outcome.solveBadges).toContain('Range Guard');
    expect(outcome.error).toContain('between -1 and 1');
  });

  it('keeps log-combine bounded solve behavior stable', () => {
    const outcome = runSharedEquationSolve({
      ...baseRequest,
      originalLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
      resolvedLatex: '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected success outcome');
    }
    expect(outcome.solveBadges).toContain('Log Combine');
  });

  it('keeps mixed-base recognized-unresolved behavior stable', () => {
    const outcome = runSharedEquationSolve({
      ...baseRequest,
      originalLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
      resolvedLatex: '\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected error outcome');
    }
    expect(outcome.solveBadges).toContain('Log Base Normalize');
    expect(outcome.error).toContain('recognized mixed-base log family');
  });
});
