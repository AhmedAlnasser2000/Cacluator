import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatNumber } from '../../format';
import { exactRatioLatex, parseSupportedRatio } from '../angles';
import {
  isFiniteNumber,
  isNodeArray,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  matchAffineVariableArgument,
} from '../normalize';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function isZeroNode(node: unknown) {
  const value = parseSupportedRatio(boxLatex(node));
  return value !== null && Math.abs(value) < EPSILON;
}

function numericFromNode(node: unknown): number | null {
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
      return Number.isFinite(value) ? value : null;
    }
  } catch {
    return null;
  }

  return null;
}

function approximateFraction(value: number, maxDenominator = 360) {
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      return { numerator, denominator };
    }
  }

  return undefined;
}

function formatExactValueLatex(value: number) {
  const exact = exactRatioLatex(value);
  if (exact) {
    return exact;
  }

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const ratio = approximateFraction(value);
  if (ratio) {
    const sign = ratio.numerator < 0 ? '-' : '';
    const numerator = Math.abs(ratio.numerator);
    const denominator = Math.abs(ratio.denominator);
    if (denominator === 1) {
      return `${ratio.numerator}`;
    }
    return `${sign}\\frac{${numerator}}{${denominator}}`;
  }

  return formatNumber(value);
}

function scaledConstantLatex(node: unknown, factor: number) {
  const value = parseSupportedRatio(boxLatex(node));
  if (value !== null) {
    return formatExactValueLatex(value * factor);
  }

  return boxLatex(normalizeAst(['Multiply', factor, node]));
}

function negateConstantTermLatex(node: unknown) {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : formatExactValueLatex(-value);
}

function doubledArgumentLatex(node: unknown) {
  const affine = matchAffineVariableArgument(node, { maxCoefficient: 6 });
  if (!affine) {
    return null;
  }
  if (affine.coefficient * 2 > 6) {
    return null;
  }

  const doubledNode = normalizeAst(['Multiply', 2, node]);
  return boxLatex(doubledNode);
}

export {
  ce,
  EPSILON,
  boxLatex,
  isFiniteNumber,
  isNodeArray,
  isZeroNode,
  numericFromNode,
  formatExactValueLatex,
  scaledConstantLatex,
  negateConstantTermLatex,
  doubledArgumentLatex,
};
