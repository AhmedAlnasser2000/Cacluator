import { describe, expect, it } from 'vitest';
import { matchSubstitutionSolve } from './substitution-solve';

describe('matchSubstitutionSolve', () => {
  it('matches bounded trig carrier substitution', () => {
    const result = matchSubstitutionSolve('2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveSummaryText).toContain('t = \\sin');
    expect(result.equations).toContain('\\sin\\left(x\\right)=1');
    expect(result.equations).toContain('\\sin\\left(x\\right)=\\frac{1}{2}');
    expect(result.diagnostics?.family).toBe('trig-polynomial');
  });

  it('matches tan-polynomial substitution families', () => {
    const result = matchSubstitutionSolve('2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.equations).toContain('\\tan\\left(3x\\right)=\\frac{1}{2}');
    expect(result.equations).toContain('\\tan\\left(3x\\right)=-1');
  });

  it('matches affine trig-carrier substitution families', () => {
    const result = matchSubstitutionSolve('2\\sin^2\\left(x+30\\right)-3\\sin\\left(x+30\\right)+1=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.equations).toContain('\\sin\\left(x+30\\right)=1');
    expect(result.equations).toContain('\\sin\\left(x+30\\right)=\\frac{1}{2}');
  });

  it('matches bounded exponential carrier substitution', () => {
    const result = matchSubstitutionSolve('e^{2x}-5e^x+6=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveSummaryText).toContain('t = e^x');
    expect(result.equations).toContain('e^x=3');
    expect(result.equations).toContain('e^x=2');
    expect(result.diagnostics?.family).toBe('exp-polynomial');
  });

  it('matches exponential substitution when expression uses exp(...) notation', () => {
    const result = matchSubstitutionSolve('\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveSummaryText).toContain('t = e^x');
    expect(result.equations).toContain('e^x=3');
    expect(result.equations).toContain('e^x=2');
    expect(result.diagnostics?.family).toBe('exp-polynomial');
  });

  it('matches inverse isolation for linear wrappers around exp carriers', () => {
    const result = matchSubstitutionSolve('5e^{x+1}-10=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected inverse-isolation branch');
    }
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.solveSummaryText).toContain('x+1=ln(2)');
    expect(result.equations[0]).toBe('x+1=\\ln\\left(2\\right)');
    expect(result.diagnostics?.family).toBe('inverse-isolation');
  });

  it('matches inverse isolation for logarithmic equations', () => {
    const result = matchSubstitutionSolve('\\ln\\left(2x+1\\right)=3', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected inverse-isolation branch');
    }
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.solveSummaryText).toContain('2x+1=e^(3)');
    expect(result.equations[0]).toBe('2x+1=e^{3}');
    expect(result.diagnostics?.family).toBe('inverse-isolation');
  });

  it('matches bounded log-combine sum families', () => {
    const result = matchSubstitutionSolve('\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=2', 'deg');
    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected log-combine branch');
    }
    expect(result.solveBadges).toContain('Log Combine');
    expect(result.solveSummaryText).toContain('Combined ln(x)+ln(x+1) into (x)(x+1)=e^(2)');
    expect(result.equations[0]).toContain('\\left(x\\right)\\left(x+1\\right)=e^{2}');
    expect(result.diagnostics?.family).toBe('log-same-base');
  });

  it('matches explicit same-base log-combine families', () => {
    const result = matchSubstitutionSolve('\\log_{4}\\left(4x\\right)+\\log_{4}\\left(6x\\right)=5', 'deg');
    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected explicit same-base log-combine branch');
    }
    expect(result.solveBadges).toContain('Log Combine');
    expect(result.solveBadges).toContain('Log Base Normalize');
    expect(result.equations[0]).toContain('=4^{5}');
    expect(result.diagnostics?.family).toBe('log-same-base');
  });

  it('recognizes mixed-base log families and normalizes by change-of-base', () => {
    const result = matchSubstitutionSolve('\\log_{4}\\left(4x\\right)+\\log\\left(6x\\right)=5', 'deg');
    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected mixed-base normalized branch');
    }
    expect(result.solveBadges).toContain('Log Base Normalize');
    expect(result.solveSummaryText).toContain('Normalized mixed-base logs via change-of-base');
    expect(result.diagnostics?.family).toBe('log-mixed-base');
  });

  it('blocks invalid explicit log bases', () => {
    const result = matchSubstitutionSolve('\\log_{1}\\left(x\\right)+\\log_{1}\\left(x+1\\right)=2', 'deg');
    expect(result.kind).toBe('blocked');
    if (result.kind !== 'blocked') {
      throw new Error('Expected blocked invalid-base result');
    }
    expect(result.error).toContain('Log base must be a positive real number not equal to 1');
  });

  it('keeps unsupported logarithmic difference forms out of bounded substitution matching', () => {
    const result = matchSubstitutionSolve('\\ln\\left(x\\right)-\\ln\\left(x+1\\right)=2', 'deg');
    expect(result.kind).toBe('none');
  });
});
