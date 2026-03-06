import {
  flattenAdd,
  flattenMultiply,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  matchTrigSquare,
} from '../normalize';
import type { TrigRewriteSolveCandidate } from '../../../types/calculator';
import {
  boxLatex,
  ce,
  doubledArgumentLatex,
  EPSILON,
  isFiniteNumber,
  isNodeArray,
} from './shared';
import type { ScaledSquareMatch } from './types';
import { parseSupportedRatio } from '../angles';

function matchScaledTrigSquare(node: unknown): ScaledSquareMatch | null {
  const normalized = normalizeAst(node);
  const square = matchTrigSquare(normalized);
  if (square && (square.kind === 'sin' || square.kind === 'cos')) {
    return {
      kind: square.kind,
      coefficient: 1,
      argumentLatex: square.argumentLatex,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const negated = matchScaledTrigSquare(normalized[1]);
    return negated ? { ...negated, coefficient: -negated.coefficient } : null;
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Multiply') {
    return null;
  }

  const factors = flattenMultiply(normalized);
  let numericCoefficient = 1;
  let squareFactor: ReturnType<typeof matchTrigSquare> = null;

  for (const factor of factors) {
    if (isFiniteNumber(factor)) {
      numericCoefficient *= factor;
      continue;
    }

    const squareMatch = matchTrigSquare(factor);
    if (!squareMatch || squareFactor) {
      return null;
    }
    squareFactor = squareMatch;
  }

  if (!squareFactor || (squareFactor.kind !== 'sin' && squareFactor.kind !== 'cos')) {
    return null;
  }

  return {
    kind: squareFactor.kind,
    coefficient: numericCoefficient,
    argumentLatex: squareFactor.argumentLatex,
  };
}

function matchDirectCosDoubleAngleRewrite(expressionNode: unknown, rhsNode: unknown): TrigRewriteSolveCandidate | null {
  const normalized = normalizeAst(expressionNode);
  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  const firstSquare = matchScaledTrigSquare(terms[0]);
  const secondSquare = matchScaledTrigSquare(terms[1]);
  const firstConstant = parseSupportedRatio(boxLatex(terms[0]));
  const secondConstant = parseSupportedRatio(boxLatex(terms[1]));

  let argumentLatex: string | null = null;

  if (
    firstSquare
    && secondSquare
    && (
      (
        firstSquare.kind === 'cos'
        && firstSquare.coefficient === 1
        && secondSquare.kind === 'sin'
        && secondSquare.coefficient === -1
      ) || (
        firstSquare.kind === 'sin'
        && firstSquare.coefficient === -1
        && secondSquare.kind === 'cos'
        && secondSquare.coefficient === 1
      )
    )
    && firstSquare.argumentLatex === secondSquare.argumentLatex
  ) {
    argumentLatex = firstSquare.argumentLatex;
  } else if (
    (
      firstConstant !== null
      && Math.abs(firstConstant - 1) < EPSILON
      && secondSquare?.kind === 'sin'
      && secondSquare.coefficient === -2
    ) || (
      secondConstant !== null
      && Math.abs(secondConstant - 1) < EPSILON
      && firstSquare?.kind === 'sin'
      && firstSquare.coefficient === -2
    )
  ) {
    argumentLatex = secondSquare?.kind === 'sin' && secondSquare.coefficient === -2
      ? secondSquare.argumentLatex
      : firstSquare?.argumentLatex ?? null;
  } else if (
    (
      firstSquare?.kind === 'cos'
      && firstSquare.coefficient === 2
      && secondConstant !== null
      && Math.abs(secondConstant + 1) < EPSILON
    ) || (
      secondSquare?.kind === 'cos'
      && secondSquare.coefficient === 2
      && firstConstant !== null
      && Math.abs(firstConstant + 1) < EPSILON
    )
  ) {
    argumentLatex = firstSquare?.kind === 'cos' && firstSquare.coefficient === 2
      ? firstSquare.argumentLatex
      : secondSquare?.argumentLatex ?? null;
  }

  if (!argumentLatex) {
    return null;
  }

  const doubled = doubledArgumentLatex(ce.parse(argumentLatex).json);
  if (!doubled) {
    return null;
  }

  return {
    kind: 'single-call',
    rewriteKind: 'cos-double-angle',
    solvedLatex: `\\cos\\left(${doubled}\\right)=${boxLatex(rhsNode)}`,
    summaryText: 'Rewritten to a bounded double-angle form before solving.',
  };
}

export {
  matchDirectCosDoubleAngleRewrite,
  matchScaledTrigSquare,
};
