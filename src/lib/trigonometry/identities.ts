import { ComputeEngine } from '@cortex-js/compute-engine';
import type { TrigIdentityState } from '../../types/calculator';
import type { TrigEvaluation } from './angles';
import {
  matchTrigCall,
  matchTrigSquare,
  normalizeTrigAst,
  sameTrigArgument,
  unwrapNegate,
} from './normalize';

const ce = new ComputeEngine();

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function wrapArgument(argument: string) {
  return `\\left(${argument}\\right)`;
}

function addTerms(node: unknown) {
  return Array.isArray(node) && node[0] === 'Add' ? node.slice(1) : [node];
}

function multiplyTerms(node: unknown) {
  return Array.isArray(node) && node[0] === 'Multiply' ? node.slice(1) : [node];
}

function numericFactor(node: unknown) {
  return typeof node === 'number' ? node : undefined;
}

function isOne(node: unknown) {
  return node === 1;
}

function isTwo(node: unknown) {
  return node === 2;
}

function matchHalfAngleArgument(node: unknown) {
  if (!Array.isArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return null;
  }

  const [, left, right] = node;
  if (left === 2) {
    return right;
  }
  if (right === 2) {
    return left;
  }
  return null;
}

function simplifyIdentity(expressionLatex: string) {
  const normalized = normalizeTrigAst(ce.parse(expressionLatex).json);
  const terms = addTerms(normalized);
  if (terms.length === 2) {
    const firstSquare = matchTrigSquare(terms[0]);
    const secondSquare = matchTrigSquare(terms[1]);
    if (
      ((firstSquare?.kind === 'sin' && secondSquare?.kind === 'cos')
        || (firstSquare?.kind === 'cos' && secondSquare?.kind === 'sin'))
      && sameTrigArgument(firstSquare, secondSquare)
    ) {
      return '1';
    }
  }

  if (terms.length === 2) {
    const oneTerm = terms.find((term) => isOne(term));
    const otherTerm = terms.find((term) => !isOne(term));
    if (oneTerm && otherTerm) {
      const { negative, value } = unwrapNegate(otherTerm);
      if (negative) {
        const square = matchTrigSquare(value);
        if (square?.kind === 'sin') {
          return `\\cos^2${wrapArgument(square.argumentLatex)}`;
        }
        if (square?.kind === 'cos') {
          return `\\sin^2${wrapArgument(square.argumentLatex)}`;
        }
      }
    }
  }

  if (Array.isArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3) {
    const numerator = matchTrigCall(normalized[1]);
    const denominator = matchTrigCall(normalized[2]);
    if (
      numerator?.kind === 'sin'
      && denominator?.kind === 'cos'
      && sameTrigArgument(numerator, denominator)
    ) {
      return `\\tan${wrapArgument(numerator.argumentLatex)}`;
    }
  }

  return undefined;
}

function convertProductToSum(expressionLatex: string) {
  const normalized = normalizeTrigAst(ce.parse(expressionLatex).json);
  const factors = multiplyTerms(normalized);
  if (factors.length !== 2) {
    return undefined;
  }

  const left = matchTrigCall(factors[0]);
  const right = matchTrigCall(factors[1]);
  if (!left || !right) {
    return undefined;
  }

  if (left.kind === 'sin' && right.kind === 'sin') {
    return `\\frac{1}{2}\\left(\\cos${wrapArgument(`${left.argumentLatex}-${right.argumentLatex}`)}-\\cos${wrapArgument(`${left.argumentLatex}+${right.argumentLatex}`)}\\right)`;
  }

  if (left.kind === 'cos' && right.kind === 'cos') {
    return `\\frac{1}{2}\\left(\\cos${wrapArgument(`${left.argumentLatex}-${right.argumentLatex}`)}+\\cos${wrapArgument(`${left.argumentLatex}+${right.argumentLatex}`)}\\right)`;
  }

  if (left.kind === 'sin' && right.kind === 'cos') {
    return `\\frac{1}{2}\\left(\\sin${wrapArgument(`${left.argumentLatex}+${right.argumentLatex}`)}+\\sin${wrapArgument(`${left.argumentLatex}-${right.argumentLatex}`)}\\right)`;
  }

  if (left.kind === 'cos' && right.kind === 'sin') {
    return `\\frac{1}{2}\\left(\\sin${wrapArgument(`${right.argumentLatex}+${left.argumentLatex}`)}+\\sin${wrapArgument(`${right.argumentLatex}-${left.argumentLatex}`)}\\right)`;
  }

  return undefined;
}

function convertSumToProduct(expressionLatex: string) {
  const normalized = normalizeTrigAst(ce.parse(expressionLatex).json);
  const terms = addTerms(normalized);
  if (terms.length !== 2) {
    return undefined;
  }

  const first = unwrapNegate(terms[0]);
  const second = unwrapNegate(terms[1]);
  const left = matchTrigCall(first.value);
  const right = matchTrigCall(second.value);
  if (!left || !right || first.negative) {
    return undefined;
  }

  if (left.kind === 'sin' && right.kind === 'sin' && !second.negative) {
    return `2\\sin${wrapArgument(`\\frac{${left.argumentLatex}+${right.argumentLatex}}{2}`)}\\cos${wrapArgument(`\\frac{${left.argumentLatex}-${right.argumentLatex}}{2}`)}`;
  }

  if (left.kind === 'sin' && right.kind === 'sin' && second.negative) {
    return `2\\cos${wrapArgument(`\\frac{${left.argumentLatex}+${right.argumentLatex}}{2}`)}\\sin${wrapArgument(`\\frac{${left.argumentLatex}-${right.argumentLatex}}{2}`)}`;
  }

  if (left.kind === 'cos' && right.kind === 'cos' && !second.negative) {
    return `2\\cos${wrapArgument(`\\frac{${left.argumentLatex}+${right.argumentLatex}}{2}`)}\\cos${wrapArgument(`\\frac{${left.argumentLatex}-${right.argumentLatex}}{2}`)}`;
  }

  if (left.kind === 'cos' && right.kind === 'cos' && second.negative) {
    return `-2\\sin${wrapArgument(`\\frac{${left.argumentLatex}+${right.argumentLatex}}{2}`)}\\sin${wrapArgument(`\\frac{${left.argumentLatex}-${right.argumentLatex}}{2}`)}`;
  }

  return undefined;
}

function convertDoubleAngle(expressionLatex: string) {
  const normalized = normalizeTrigAst(ce.parse(expressionLatex).json);
  const factors = multiplyTerms(normalized);
  if (factors.length === 3) {
    const numeric = factors.find((factor) => numericFactor(factor) !== undefined);
    const nonNumeric = factors.filter((factor) => factor !== numeric);
    const left = matchTrigCall(nonNumeric[0]);
    const right = matchTrigCall(nonNumeric[1]);
    if (
      numeric !== undefined
      && isTwo(numeric)
      && left?.kind === 'sin'
      && right?.kind === 'cos'
      && sameTrigArgument(left, right)
    ) {
      return `\\sin${wrapArgument(`2${left.argumentLatex}`)}`;
    }
  }

  const terms = addTerms(normalized);
  if (terms.length === 2) {
    const first = matchTrigSquare(terms[0]);
    const secondTerm = unwrapNegate(terms[1]);
    const second = secondTerm.negative ? matchTrigSquare(secondTerm.value) : null;
    if (
      first?.kind === 'cos'
      && second?.kind === 'sin'
      && sameTrigArgument(first, second)
    ) {
      return `\\cos${wrapArgument(`2${first.argumentLatex}`)}`;
    }
  }

  const call = matchTrigCall(normalized);
  if (call?.kind === 'sin') {
    const halfAngle = matchHalfAngleArgument(call.argument);
    if (halfAngle !== null) {
      const halfLatex = boxLatex(halfAngle);
      return `2\\sin${wrapArgument(halfLatex)}\\cos${wrapArgument(halfLatex)}`;
    }
  }

  return undefined;
}

function convertHalfAngle(expressionLatex: string) {
  const normalized = normalizeTrigAst(ce.parse(expressionLatex).json);
  const square = matchTrigSquare(normalized);
  if (square?.kind === 'sin') {
    return `\\frac{1-\\cos${wrapArgument(`2${square.argumentLatex}`)}}{2}`;
  }
  if (square?.kind === 'cos') {
    return `\\frac{1+\\cos${wrapArgument(`2${square.argumentLatex}`)}}{2}`;
  }

  if (Array.isArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3 && isTwo(normalized[2])) {
    const numeratorTerms = addTerms(normalized[1]);
    if (numeratorTerms.length === 2) {
      const first = numeratorTerms.find((term) => isOne(term));
      const other = numeratorTerms.find((term) => !isOne(term));
      if (first && other) {
        const { negative, value } = unwrapNegate(other);
        const trig = matchTrigCall(value);
        if (trig?.kind === 'cos') {
          const halfAngle = matchHalfAngleArgument(trig.argument);
          if (halfAngle !== null) {
            const halfLatex = boxLatex(halfAngle);
            return negative
              ? `\\sin^2${wrapArgument(halfLatex)}`
              : `\\cos^2${wrapArgument(halfLatex)}`;
          }
        }
      }
    }
  }

  return undefined;
}

export function evaluateTrigIdentity(state: TrigIdentityState): TrigEvaluation {
  const expressionLatex = state.expressionLatex.trim();
  if (!expressionLatex) {
    return {
      error: 'Enter a trig identity expression before converting it.',
      warnings: [],
    };
  }

  const exactLatex =
    state.targetForm === 'simplified'
      ? simplifyIdentity(expressionLatex)
      : state.targetForm === 'productToSum'
        ? convertProductToSum(expressionLatex)
        : state.targetForm === 'sumToProduct'
          ? convertSumToProduct(expressionLatex)
          : state.targetForm === 'doubleAngle'
            ? convertDoubleAngle(expressionLatex)
            : convertHalfAngle(expressionLatex);

  if (!exactLatex) {
    return {
      error: 'This trig identity is outside the supported conversion set for this milestone.',
      warnings: [],
    };
  }

  return {
    exactLatex,
    approxText: undefined,
    warnings: ['Bounded identity conversion applied.'],
    resultOrigin: 'symbolic',
  };
}

