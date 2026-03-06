import {
  flattenAdd,
  termKey,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  matchAffineVariableArgument,
  matchTrigCall,
} from '../normalize';
import {
  EPSILON,
  isNodeArray,
  isZeroNode,
  numericFromNode,
  scaledConstantLatex,
} from './shared';
import type {
  SignedTrigTermMatch,
  TrigRewriteMatchResult,
  TwoTermTrigFamilyMatch,
} from './types';

function matchSignedSinCosTerm(node: unknown): SignedTrigTermMatch | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner = matchSignedSinCosTerm(normalized[1]);
    return inner ? { ...inner, sign: (inner.sign * -1) as 1 | -1 } : null;
  }

  const trig = matchTrigCall(normalized);
  if (!trig || (trig.kind !== 'sin' && trig.kind !== 'cos')) {
    return null;
  }

  const affine = matchAffineVariableArgument(trig.argument, { maxCoefficient: 6 });
  if (!affine) {
    return null;
  }

  return {
    sign: 1,
    trig: {
      kind: trig.kind,
      argument: trig.argument,
      argumentLatex: affine.argumentLatex,
    },
  };
}

function matchTwoTermSinCosFamily(node: unknown): TwoTermTrigFamilyMatch | null {
  const terms = flattenAdd(normalizeAst(node));
  if (terms.length !== 2) {
    return null;
  }

  const first = matchSignedSinCosTerm(terms[0]);
  const second = matchSignedSinCosTerm(terms[1]);
  if (!first || !second || first.trig.kind !== second.trig.kind) {
    return null;
  }

  return {
    kind: first.trig.kind,
    firstArgument: first.trig.argument,
    secondArgument: second.trig.argument,
    firstArgumentLatex: first.trig.argumentLatex,
    secondArgumentLatex: second.trig.argumentLatex,
    firstSign: first.sign,
    secondSign: second.sign,
  };
}

function halfSumArgument(nodeA: unknown, nodeB: unknown) {
  return normalizeAst(['Multiply', 0.5, ['Add', nodeA, nodeB]]);
}

function halfDifferenceArgument(nodeA: unknown, nodeB: unknown) {
  return normalizeAst(['Multiply', 0.5, ['Add', nodeA, ['Negate', nodeB]]]);
}

function matchTrigSumProductRewrite(expressionNode: unknown, rhsNode: unknown): TrigRewriteMatchResult {
  const family = matchTwoTermSinCosFamily(expressionNode);
  if (!family) {
    return { kind: 'none' };
  }

  const firstKey = termKey(normalizeAst(family.firstArgument));
  const secondKey = termKey(normalizeAst(family.secondArgument));
  const sameArgument = firstKey === secondKey;
  const fn = family.kind === 'sin' ? '\\sin' : '\\cos';

  const combinedCoefficient = family.firstSign + family.secondSign;
  if (sameArgument && Math.abs(combinedCoefficient) === 2) {
    const rhsLatex = scaledConstantLatex(rhsNode, 1 / combinedCoefficient);
    return {
      kind: 'candidate',
      candidate: {
        kind: 'single-call',
        rewriteKind: 'sum-product-single',
        solvedLatex: `${fn}\\left(${family.firstArgumentLatex}\\right)=${rhsLatex}`,
        summaryText: 'Normalized a bounded two-term trig sum into a single-call equation before solving.',
      },
    };
  }

  const averageArgument = halfSumArgument(family.firstArgument, family.secondArgument);
  const firstDifferenceArgument = halfDifferenceArgument(family.firstArgument, family.secondArgument);
  const secondDifferenceArgument = halfDifferenceArgument(family.secondArgument, family.firstArgument);
  const average = matchAffineVariableArgument(averageArgument, { maxCoefficient: 6 });
  const difference = matchAffineVariableArgument(firstDifferenceArgument, { maxCoefficient: 6 })
    ?? matchAffineVariableArgument(secondDifferenceArgument, { maxCoefficient: 6 });
  if (!average || !difference) {
    return { kind: 'none' };
  }

  if (isZeroNode(rhsNode)) {
    const normalizedLatex = family.kind === 'sin'
      ? family.firstSign === family.secondSign
        ? `2\\sin\\left(${average.argumentLatex}\\right)\\cos\\left(${difference.argumentLatex}\\right)=0`
        : `2\\cos\\left(${average.argumentLatex}\\right)\\sin\\left(${difference.argumentLatex}\\right)=0`
      : family.firstSign === family.secondSign
        ? `2\\cos\\left(${average.argumentLatex}\\right)\\cos\\left(${difference.argumentLatex}\\right)=0`
        : `-2\\sin\\left(${average.argumentLatex}\\right)\\sin\\left(${difference.argumentLatex}\\right)=0`;

    const [firstBranch, secondBranch] = family.kind === 'sin'
      ? family.firstSign === family.secondSign
        ? [
            `\\sin\\left(${average.argumentLatex}\\right)=0`,
            `\\cos\\left(${difference.argumentLatex}\\right)=0`,
          ]
        : [
            `\\cos\\left(${average.argumentLatex}\\right)=0`,
            `\\sin\\left(${difference.argumentLatex}\\right)=0`,
          ]
      : family.firstSign === family.secondSign
        ? [
            `\\cos\\left(${average.argumentLatex}\\right)=0`,
            `\\cos\\left(${difference.argumentLatex}\\right)=0`,
          ]
        : [
            `\\sin\\left(${average.argumentLatex}\\right)=0`,
            `\\sin\\left(${difference.argumentLatex}\\right)=0`,
          ];

    return {
      kind: 'candidate',
      candidate: {
        kind: 'split-sum-product',
        rewriteKind: 'sum-product-split',
        branchLatex: [firstBranch, secondBranch],
        normalizedLatex,
        summaryText: 'Normalized a bounded two-term trig sum/difference to product form and split the zero-product branches before solving.',
      },
    };
  }

  const rhsNumeric = numericFromNode(rhsNode);
  if (rhsNumeric !== null && sameArgument && Math.abs(combinedCoefficient) < EPSILON && Math.abs(rhsNumeric) > EPSILON) {
    return {
      kind: 'blocked',
      error: 'No real solutions because the normalized two-term trig side collapses to 0 but the target is non-zero.',
    };
  }

  return {
    kind: 'recognized-unresolved',
    error: 'This recognized trig sum-to-product family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    summaryText: 'Recognized a bounded two-term trig sum/difference and normalized it to sum-to-product form.',
  };
}

export { matchTrigSumProductRewrite };
