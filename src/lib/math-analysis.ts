import { ComputeEngine } from '@cortex-js/compute-engine';
import { canonicalizeMathInput } from './input-canonicalization';
import type { MathAnalysis } from '../types/calculator';

type BoxedAnalysisExpr = {
  json: unknown;
  operator?: string;
};

const ce = new ComputeEngine();
const RELATIONAL_OPERATORS = new Set([
  'NotEqual',
  'Less',
  'Greater',
  'LessEqual',
  'GreaterEqual',
]);

function containsSymbol(node: unknown, symbol: string): boolean {
  if (typeof node === 'string') {
    return node === symbol;
  }

  if (Array.isArray(node)) {
    return node.some((entry) => containsSymbol(entry, symbol));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => containsSymbol(entry, symbol));
  }

  return false;
}

function detectTopLevelRelation(source: string): 'Equal' | 'NotEqual' | 'Less' | 'Greater' | 'LessEqual' | 'GreaterEqual' | undefined {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') {
      let command = '';
      while (index + 1 < source.length && /[A-Za-z]/.test(source[index + 1])) {
        index += 1;
        command += source[index];
      }
      if (depth === 0) {
        if (command === 'ge' || command === 'geq') {
          return 'GreaterEqual';
        }
        if (command === 'le' || command === 'leq') {
          return 'LessEqual';
        }
        if (command === 'ne' || command === 'neq') {
          return 'NotEqual';
        }
      }
      continue;
    }
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
      continue;
    }
    if (depth === 0) {
      if (char === '=' ) {
        return 'Equal';
      }
      if (char === '<') {
        return 'Less';
      }
      if (char === '>') {
        return 'Greater';
      }
    }
  }

  return undefined;
}

export function analyzeLatex(latex: string): MathAnalysis {
  const canonicalized = canonicalizeMathInput(latex, {
    mode: 'calculate',
    screenHint: 'standard',
  });
  const source = (canonicalized.ok ? canonicalized.canonicalLatex : latex).trim();
  if (!source) {
    return {
      kind: 'empty',
      containsSymbolX: false,
    };
  }

  try {
    const expr = ce.parse(source) as BoxedAnalysisExpr;
    const topLevelOperator = expr.operator;
    const fallbackOperator = detectTopLevelRelation(source);
    const relation = topLevelOperator ?? fallbackOperator;
    return {
      kind: relation === 'Equal' ? 'equation' : 'expression',
      containsSymbolX: containsSymbol(expr.json, 'x'),
      topLevelOperator: relation,
    };
  } catch {
    const topLevelOperator = detectTopLevelRelation(source);
    return {
      kind: topLevelOperator === 'Equal' ? 'equation' : topLevelOperator ? 'expression' : 'invalid',
      containsSymbolX: /\bx\b/.test(source),
      topLevelOperator,
    };
  }
}

export function isRelationalOperator(operator?: string) {
  return operator ? RELATIONAL_OPERATORS.has(operator) : false;
}
