import { describe, expect, it } from 'vitest';
import { runGeometryCoreDraft } from './core';

describe('geometry core draft runner', () => {
  it('evaluates structured square drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('square(side=2+3)', 'square');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('A=25');
      expect(outcome.exactLatex).toContain('P=20');
    }
  });

  it('keeps shorthand coordinate drafts working on migrated screens', () => {
    const { outcome } = runGeometryCoreDraft('P_1=(0,0), P_2=(3,4)', 'distance');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('d=5');
    }
  });

  it('offers an explicit send-to-equation action for line equations', () => {
    const { outcome } = runGeometryCoreDraft(
      'lineEquation(p1=(1,2), p2=(3,6), form=standard)',
      'lineEquation',
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.actions).toEqual([
        {
          kind: 'send',
          target: 'equation',
          latex: outcome.exactLatex,
        },
      ]);
    }
  });

  it('evaluates 3D solid drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('cylinder(radius=3, height=8)', 'cylinder');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('V=');
      expect(outcome.exactLatex).toContain('TSA=');
    }
  });

  it('evaluates triangle drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('triangleArea(base=10, height=6)', 'triangleArea');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('A=30');
    }
  });

  it('preserves cone validation in the shared core', () => {
    const { outcome } = runGeometryCoreDraft(
      'cone(radius=3, height=4, slantHeight=6)',
      'cone',
    );
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.error).toContain('must satisfy');
    }
  });

  it('returns a clear numeric error for non-resolved scalar math', () => {
    const { outcome } = runGeometryCoreDraft('circle(radius=2a)', 'circle');
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.error).toContain('finite numeric value');
    }
  });

  it('solves bounded formula solve-missing requests', () => {
    const { outcome } = runGeometryCoreDraft('square(side=?, area=25)', 'square');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('s=5');
      expect(outcome.exactLatex).toContain('A=25');
    }
  });

  it('solves remaining in-scope formula solve-missing families', () => {
    const circle = runGeometryCoreDraft('circle(radius=?, circumference=10*pi)', 'circle').outcome;
    expect(circle.kind).toBe('success');
    if (circle.kind === 'success') {
      expect(circle.exactLatex).toContain('r=5');
    }

    const cube = runGeometryCoreDraft('cube(side=?, volume=64)', 'cube').outcome;
    expect(cube.kind).toBe('success');
    if (cube.kind === 'success') {
      expect(cube.exactLatex).toContain('s=4');
    }

    const sphere = runGeometryCoreDraft('sphere(radius=?, surfaceArea=36*pi)', 'sphere').outcome;
    expect(sphere.kind).toBe('success');
    if (sphere.kind === 'success') {
      expect(sphere.exactLatex).toContain('r=3');
    }

    const triangle = runGeometryCoreDraft('triangleArea(base=?, height=6, area=30)', 'triangleArea').outcome;
    expect(triangle.kind).toBe('success');
    if (triangle.kind === 'success') {
      expect(triangle.exactLatex).toContain('b=10');
    }

    const rectangle = runGeometryCoreDraft('rectangle(width=?, height=5, area=40)', 'rectangle').outcome;
    expect(rectangle.kind).toBe('success');
    if (rectangle.kind === 'success') {
      expect(rectangle.exactLatex).toContain('w=8');
    }

    const cylinder = runGeometryCoreDraft('cylinder(radius=?, height=8, volume=72*pi)', 'cylinder').outcome;
    expect(cylinder.kind).toBe('success');
    if (cylinder.kind === 'success') {
      expect(cylinder.exactLatex).toContain('r=3');
    }
  });

  it('returns both real branches for distance solve-missing cases', () => {
    const { outcome } = runGeometryCoreDraft('distance(p1=(0,0), p2=(3,?), distance=5)', 'distance');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('y_2');
      expect(outcome.warnings.join(' ')).toContain('Two real coordinate branches');
    }
  });

  it('solves midpoint and slope coordinate solve-missing workflows', () => {
    const midpoint = runGeometryCoreDraft('midpoint(p1=(1,2), p2=(?,8), mid=(3,5))', 'midpoint').outcome;
    expect(midpoint.kind).toBe('success');
    if (midpoint.kind === 'success') {
      expect(midpoint.exactLatex).toContain('x_2=5');
    }

    const slope = runGeometryCoreDraft('slope(p1=(1,2), p2=(?,8), slope=2)', 'slope').outcome;
    expect(slope.kind).toBe('success');
    if (slope.kind === 'success') {
      expect(slope.exactLatex).toContain('x_2=4');
    }
  });

  it('offers handoff only for unresolved-but-eligible coordinate solve-missing requests', () => {
    const { outcome } = runGeometryCoreDraft('slope(p1=(?,2), p2=(4,2), slope=0)', 'slope');
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.error).toContain('infinitely many');
      expect(outcome.actions).toEqual([
        {
          kind: 'send',
          target: 'equation',
          latex: '(2-2)/(4-x)=0',
        },
      ]);
    }
  });
});
