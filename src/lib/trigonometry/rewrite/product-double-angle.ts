import {
  flattenMultiply,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  matchTrigCall,
  sameTrigArgument,
} from '../normalize';
import type { TrigRewriteSolveCandidate } from '../../../types/calculator';
import {
  boxLatex,
  doubledArgumentLatex,
  isFiniteNumber,
  scaledConstantLatex,
} from './shared';
import type { ProductTemplateMatch } from './types';

function matchProductTemplate(node: unknown): ProductTemplateMatch | null {
  const normalized = normalizeAst(node);
  const factors = flattenMultiply(normalized);
  let numericCoefficient = 1;
  let sinCall: ReturnType<typeof matchTrigCall> = null;
  let cosCall: ReturnType<typeof matchTrigCall> = null;

  for (const factor of factors) {
    if (isFiniteNumber(factor)) {
      numericCoefficient *= factor;
      continue;
    }

    const trig = matchTrigCall(factor);
    if (!trig) {
      return null;
    }

    if (trig.kind === 'sin') {
      if (sinCall) {
        return null;
      }
      sinCall = trig;
      continue;
    }

    if (trig.kind === 'cos') {
      if (cosCall) {
        return null;
      }
      cosCall = trig;
      continue;
    }

    return null;
  }

  if (!sinCall || !cosCall || !sameTrigArgument(sinCall, cosCall)) {
    return null;
  }

  if (numericCoefficient !== 1 && numericCoefficient !== 2) {
    return null;
  }

  const doubled = doubledArgumentLatex(sinCall.argument);
  if (!doubled) {
    return null;
  }

  return {
    coefficient: numericCoefficient as 1 | 2,
    doubledArgumentLatex: doubled,
  };
}

function matchDirectProductRewrite(expressionNode: unknown, rhsNode: unknown): TrigRewriteSolveCandidate | null {
  const product = matchProductTemplate(expressionNode);
  if (!product) {
    return null;
  }

  const rhsLatex = product.coefficient === 1
    ? scaledConstantLatex(rhsNode, 2)
    : boxLatex(rhsNode);

  return {
    kind: 'single-call',
    rewriteKind: 'product-double-angle',
    solvedLatex: `\\sin\\left(${product.doubledArgumentLatex}\\right)=${rhsLatex}`,
    summaryText: 'Rewritten to a bounded double-angle form before solving.',
  };
}

export { matchDirectProductRewrite };
