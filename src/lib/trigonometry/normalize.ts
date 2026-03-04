import { ComputeEngine } from '@cortex-js/compute-engine';
import { flattenMultiply, isFiniteNumber, isNodeArray, termKey } from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';

const ce = new ComputeEngine();

export type TrigFunctionKind = 'sin' | 'cos' | 'tan';

export type TrigCallMatch = {
  kind: TrigFunctionKind;
  argument: unknown;
  argumentLatex: string;
};

export type TrigSquareMatch = TrigCallMatch;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function compactRepeatedFactors(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const compactedChildren = children.map((child) => compactRepeatedFactors(child));
  if (head !== 'Multiply') {
    return [head, ...compactedChildren];
  }

  const factors = compactedChildren.flatMap((child) => flattenMultiply(child));
  const numericFactors = factors.filter((factor) => typeof factor === 'number');
  const symbolicFactors = factors.filter((factor) => typeof factor !== 'number');
  const grouped = new Map<string, { node: unknown; exponent: number }>();

  for (const factor of symbolicFactors) {
    const key = termKey(normalizeAst(factor));
    const current = grouped.get(key);
    grouped.set(key, {
      node: normalizeAst(factor),
      exponent: (current?.exponent ?? 0) + 1,
    });
  }

  const rebuiltFactors: unknown[] = [];
  if (numericFactors.length > 0) {
    const product = numericFactors.reduce((current, value) => current * value, 1);
    if (product !== 1 || grouped.size === 0) {
      rebuiltFactors.push(product);
    }
  }

  for (const entry of grouped.values()) {
    rebuiltFactors.push(entry.exponent === 1 ? entry.node : ['Power', entry.node, entry.exponent]);
  }

  if (rebuiltFactors.length === 0) {
    return 1;
  }

  if (rebuiltFactors.length === 1) {
    return rebuiltFactors[0];
  }

  return ['Multiply', ...rebuiltFactors];
}

export function normalizeTrigAst(node: unknown) {
  return normalizeAst(compactRepeatedFactors(node));
}

export function normalizeTrigLatex(latex: string) {
  return boxLatex(normalizeTrigAst(ce.parse(latex).json));
}

export function matchTrigCall(node: unknown): TrigCallMatch | null {
  if (!isNodeArray(node) || node.length !== 2 || typeof node[0] !== 'string') {
    return null;
  }

  const [operator, argument] = node;
  const kind =
    operator === 'Sin'
      ? 'sin'
      : operator === 'Cos'
        ? 'cos'
        : operator === 'Tan'
          ? 'tan'
          : null;
  if (!kind) {
    return null;
  }

  return {
    kind,
    argument,
    argumentLatex: boxLatex(argument),
  };
}

export function matchTrigSquare(node: unknown): TrigSquareMatch | null {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !isFiniteNumber(node[2]) || node[2] !== 2) {
    return null;
  }

  return matchTrigCall(node[1]);
}

export function sameTrigArgument(left: TrigCallMatch | TrigSquareMatch | null, right: TrigCallMatch | TrigSquareMatch | null) {
  if (!left || !right) {
    return false;
  }

  return termKey(normalizeAst(left.argument)) === termKey(normalizeAst(right.argument));
}

export function unwrapNegate(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return { negative: true, value: node[1] };
  }

  return { negative: false, value: node };
}

export function matchScaledVariableArgument(node: unknown) {
  const normalized = normalizeAst(node);
  if (normalized === 'x') {
    return { coefficient: 1, body: 'x', bodyLatex: 'x' };
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Multiply') {
    return null;
  }

  const factors = normalized.slice(1);
  if (factors.length !== 2) {
    return null;
  }

  const numericFactor = factors.find((factor) => isFiniteNumber(factor));
  const symbolicFactor = factors.find((factor) => factor === 'x');
  if (!numericFactor || !symbolicFactor || !Number.isInteger(numericFactor) || numericFactor <= 0) {
    return null;
  }

  return {
    coefficient: numericFactor,
    body: 'x',
    bodyLatex: 'x',
  };
}

