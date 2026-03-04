import { ComputeEngine } from '@cortex-js/compute-engine';
import { isNodeArray } from '../symbolic-engine/patterns';
import { normalizeTrigAst, matchScaledVariableArgument, matchTrigCall, type TrigFunctionKind } from './normalize';

const ce = new ComputeEngine();

export type BoundedTrigEquationMatch = {
  kind: TrigFunctionKind;
  coefficient: number;
  rhsLatex: string;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function matchSide(node: unknown) {
  const trig = matchTrigCall(node);
  if (!trig) {
    return null;
  }

  const argument = matchScaledVariableArgument(trig.argument);
  if (!argument) {
    return null;
  }

  return {
    kind: trig.kind,
    coefficient: argument.coefficient,
  };
}

export function matchBoundedTrigEquation(equationLatex: string): BoundedTrigEquationMatch | null {
  const parsed = normalizeTrigAst(ce.parse(equationLatex).json);
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const [, left, right] = parsed;
  const leftMatch = matchSide(left);
  if (leftMatch) {
    return {
      ...leftMatch,
      rhsLatex: boxLatex(right),
    };
  }

  const rightMatch = matchSide(right);
  if (rightMatch) {
    return {
      ...rightMatch,
      rhsLatex: boxLatex(left),
    };
  }

  return null;
}

