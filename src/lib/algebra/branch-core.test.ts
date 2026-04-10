import { describe, expect, it } from 'vitest';
import type { PeriodicFamilyInfo } from '../../types/calculator';
import {
  appendDiscoveredBranchFamilies,
  branchPairToSet,
  branchSetToPair,
  createBranchFamilyMetadata,
  createBranchSet,
  mergeBranchConstraints,
  mergeBranchFamilies,
  mergeBranchFamilyExtras,
} from './branch-core';

describe('branch-core', () => {
  it('keeps branch-equation dedupe and order stable', () => {
    const branchSet = createBranchSet({
      equations: ['x=1', 'x=-1', 'x=1'],
      constraints: [
        { kind: 'nonnegative', expressionLatex: 'x' },
        { kind: 'nonnegative', expressionLatex: 'x' },
      ],
    });

    expect(branchSet.equations).toEqual(['x=1', 'x=-1']);
    expect(branchSet.constraints).toEqual([
      { kind: 'nonnegative', expressionLatex: 'x' },
    ]);
  });

  it('keeps branch-pair adapters stable for two-branch rewrite shapes', () => {
    const branchSet = branchPairToSet([
      '\\sin\\left(x\\right)=\\frac{1}{2}',
      '\\sin\\left(x\\right)=-\\frac{1}{2}',
    ]);

    expect(branchSet.equations).toEqual([
      '\\sin\\left(x\\right)=\\frac{1}{2}',
      '\\sin\\left(x\\right)=-\\frac{1}{2}',
    ]);
    expect(branchSetToPair(branchSet)).toEqual([
      '\\sin\\left(x\\right)=\\frac{1}{2}',
      '\\sin\\left(x\\right)=-\\frac{1}{2}',
    ]);
  });

  it('merges branch constraints without changing their public shape', () => {
    expect(mergeBranchConstraints(
      [{ kind: 'positive', expressionLatex: 'x+1' }],
      [{ kind: 'positive', expressionLatex: 'x+1' }],
      [{ kind: 'nonzero', expressionLatex: 'x' }],
    )).toEqual([
      { kind: 'positive', expressionLatex: 'x+1' },
      { kind: 'nonzero', expressionLatex: 'x' },
    ]);
  });

  it('keeps periodic metadata merge parity stable', () => {
    const left: PeriodicFamilyInfo = {
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k', '\\pi+2\\pi k'],
      discoveredFamilies: ['x=2\\pi k'],
      representatives: [{ label: 'k=0', exactLatex: '0' }],
      suggestedIntervals: [{ label: 'around 0', start: '-1', end: '1' }],
      piecewiseBranches: [{ conditionLatex: 'x\\in[0,\\pi]', resultLatex: '\\arcsin(\\sin(x))=x' }],
      principalRangeLatex: '\\left[-\\frac{\\pi}{2},\\frac{\\pi}{2}\\right]',
      reducedCarrierLatex: 'x',
      structuredStopReason: 'outside-principal-range',
    };
    const right: PeriodicFamilyInfo = {
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['\\pi+2\\pi k', '2\\pi k'],
      discoveredFamilies: ['x=\\pi+2\\pi k'],
      representatives: [{ label: 'k=1', exactLatex: '2\\pi' }],
      suggestedIntervals: [{ label: 'around 0', start: '-1', end: '1' }],
      piecewiseBranches: [{ conditionLatex: 'x\\in[0,\\pi]', resultLatex: '\\arcsin(\\sin(x))=x' }],
      principalRangeLatex: '\\left[-\\frac{\\pi}{2},\\frac{\\pi}{2}\\right]',
      reducedCarrierLatex: 'x',
      structuredStopReason: 'outside-principal-range',
    };

    const merged = mergeBranchFamilies([left, right]);

    expect(merged).toEqual({
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k', '\\pi+2\\pi k'],
      discoveredFamilies: ['x=2\\pi k', 'x=\\pi+2\\pi k'],
      representatives: [
        { label: 'k=0', exactLatex: '0' },
        { label: 'k=1', exactLatex: '2\\pi' },
      ],
      suggestedIntervals: [{ label: 'around 0', start: '-1', end: '1' }],
      piecewiseBranches: [{ conditionLatex: 'x\\in[0,\\pi]', resultLatex: '\\arcsin(\\sin(x))=x' }],
      principalRangeLatex: '\\left[-\\frac{\\pi}{2},\\frac{\\pi}{2}\\right]',
      reducedCarrierLatex: 'x',
      structuredStopReason: 'outside-principal-range',
    });
  });

  it('keeps periodic extras and discovered-family adapters stable', () => {
    const family: PeriodicFamilyInfo = {
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k'],
    };

    const merged = mergeBranchFamilyExtras(family, {
      discoveredFamilies: ['x=2\\pi k', 'x=2\\pi k'],
      piecewiseBranches: [{ conditionLatex: 'x\\in[0,\\pi]', resultLatex: 'f(x)=x' }],
      principalRangeLatex: '\\left[0,\\pi\\right]',
    });
    const appended = merged ? appendDiscoveredBranchFamilies(merged, ['x=\\pi+2\\pi k']) : undefined;

    expect(createBranchFamilyMetadata({
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k', '2\\pi k'],
      discoveredFamilies: ['x=2\\pi k', 'x=2\\pi k'],
    })).toEqual({
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k'],
      discoveredFamilies: ['x=2\\pi k'],
    });

    expect(appended).toEqual({
      carrierLatex: 'x',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['2\\pi k'],
      discoveredFamilies: ['x=2\\pi k', 'x=\\pi+2\\pi k'],
      piecewiseBranches: [{ conditionLatex: 'x\\in[0,\\pi]', resultLatex: 'f(x)=x' }],
      principalRangeLatex: '\\left[0,\\pi\\right]',
    });
  });
});
