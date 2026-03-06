import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function sameNode(left: unknown, right: unknown) {
  return termKey(normalizeAst(left)) === termKey(normalizeAst(right));
}

function unwrapNegate(node: unknown): { sign: number; value: unknown } {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return { sign: -1, value: node[1] };
  }
  return { sign: 1, value: node };
}

function numericFromNode(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).N?.();
    const json = numeric?.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (json && typeof json === 'object' && 'num' in json) {
      const value = Number((json as { num: string }).num);
      return Number.isFinite(value) ? value : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatBranchValue(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const denominatorMax = 64;
  for (let denominator = 1; denominator <= denominatorMax; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      if (denominator === 1) {
        return `${numerator}`;
      }
      return `\\frac{${numerator}}{${denominator}}`;
    }
  }

  return `${value}`;
}

function toInlineSummaryMath(latex: string) {
  return latex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{([^{}]+)\}/g, '($1)')
    .replace(/\\/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function solveLinearOrQuadratic(coefficients: number[]) {
  const [quadratic = 0, linear = 0, constant = 0] = coefficients;
  if (Math.abs(quadratic) < EPSILON) {
    if (Math.abs(linear) < EPSILON) {
      return [];
    }
    return [-constant / linear];
  }

  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < -EPSILON) {
    return [];
  }

  if (Math.abs(discriminant) < EPSILON) {
    return [-linear / (2 * quadratic)];
  }

  const root = Math.sqrt(Math.max(discriminant, 0));
  return [
    (-linear + root) / (2 * quadratic),
    (-linear - root) / (2 * quadratic),
  ];
}

function extractTermCore(node: unknown) {
  const normalized = normalizeAst(node);
  const { sign, value } = unwrapNegate(normalized);
  const factors = flattenMultiply(value);
  let coefficient = sign;
  const symbolic: unknown[] = [];

  for (const factor of factors) {
    const numeric = numericFromNode(factor);
    if (numeric !== undefined) {
      coefficient *= numeric;
    } else {
      symbolic.push(factor);
    }
  }

  if (symbolic.length === 0) {
    return { coefficient, symbolic: null as unknown | null };
  }

  if (symbolic.length !== 1) {
    return null;
  }

  return { coefficient, symbolic: symbolic[0] };
}

export {
  ce,
  EPSILON,
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  normalizeAst,
  sameNode,
  unwrapNegate,
  numericFromNode,
  formatBranchValue,
  toInlineSummaryMath,
  solveLinearOrQuadratic,
  extractTermCore,
};
