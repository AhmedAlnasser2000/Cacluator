import type { AngleUnit } from '../../../types/calculator';
import type { SubstitutionSolveResult } from './types';
import {
  ce,
  isNodeArray,
  normalizeAst,
} from './shared';
import { matchTrigPolynomialSubstitution } from './trig-polynomial';
import { matchExponentialPolynomialSubstitution } from './exp-polynomial';
import { matchSameBaseEquality } from './same-base-equality';
import { matchInverseIsolation } from './inverse-isolation';
import { matchLogCombineSolve } from './log-combine';

function nonZeroSideFromEquation(equationLatex: string) {
  const parsed = ce.parse(equationLatex);
  const json = normalizeAst(parsed.json);
  if (!isNodeArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  return ['Add', json[1], ['Negate', json[2]]] as unknown;
}

function matchSubstitutionSolve(
  equationLatex: string,
  angleUnit: AngleUnit,
): SubstitutionSolveResult {
  void angleUnit;
  const zeroForm = nonZeroSideFromEquation(equationLatex);
  if (!zeroForm) {
    return { kind: 'none' };
  }

  const trig = matchTrigPolynomialSubstitution(zeroForm);
  if (trig.kind !== 'none') {
    return trig;
  }

  const normalizedEquationAst = normalizeAst(ce.parse(equationLatex).json);

  const sameBaseEquality = matchSameBaseEquality(normalizedEquationAst);
  if (sameBaseEquality.kind !== 'none') {
    return sameBaseEquality;
  }

  const inverse = matchInverseIsolation(normalizedEquationAst);
  if (inverse.kind !== 'none') {
    return inverse;
  }

  const logCombine = matchLogCombineSolve(normalizedEquationAst);
  if (logCombine.kind !== 'none') {
    return logCombine;
  }

  const exponential = matchExponentialPolynomialSubstitution(zeroForm);
  if (exponential.kind !== 'none') {
    return exponential;
  }

  return { kind: 'none' };
}

export type { SubstitutionSolveResult } from './types';
export { matchSubstitutionSolve };
