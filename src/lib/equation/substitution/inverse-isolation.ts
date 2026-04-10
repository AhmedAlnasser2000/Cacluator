import {
  exponentialDomainError,
} from '../domain-guards';
import { createBranchSet } from '../../algebra/branch-core';
import type {
  InverseCarrier,
  SubstitutionSolveResult,
} from './types';
import {
  EPSILON,
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  normalizeAst,
  numericFromNode,
  toInlineSummaryMath,
  unwrapNegate,
  formatBranchValue,
} from './shared';

function matchInverseCarrier(node: unknown): InverseCarrier | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Exp') {
    return {
      kind: 'exp',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Ln') {
    return {
      kind: 'ln',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Log') {
    return {
      kind: 'log',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
      baseLatex: '10',
      baseNumeric: 10,
    };
  }

  if (isNodeArray(normalized) && normalized.length === 3 && normalized[0] === 'Log') {
    const baseNumeric = numericFromNode(normalized[2]);
    if (baseNumeric !== undefined && baseNumeric > 0 && Math.abs(baseNumeric - 1) > EPSILON) {
      return {
        kind: 'log',
        inner: normalized[1],
        innerLatex: boxLatex(normalized[1]),
        carrierLatex: boxLatex(normalized),
        baseLatex: boxLatex(normalized[2]),
        baseNumeric,
      };
    }
  }

  if (isNodeArray(normalized) && normalized.length === 3 && normalized[0] === 'Power') {
    const [, base, exponent] = normalized;
    if (base === 'ExponentialE') {
      return {
        kind: 'exp',
        inner: exponent,
        innerLatex: boxLatex(exponent),
        carrierLatex: boxLatex(normalized),
      };
    }

    const numericBase = numericFromNode(base);
    if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
      return {
        kind: 'power',
        inner: exponent,
        innerLatex: boxLatex(exponent),
        carrierLatex: boxLatex(normalized),
        baseLatex: boxLatex(base),
      };
    }
  }

  return null;
}

function parseLinearCarrier(node: unknown): { carrier: InverseCarrier; coefficient: number; constant: number } | null {
  const normalized = normalizeAst(node);
  const directCarrier = matchInverseCarrier(normalized);
  if (directCarrier) {
    return { carrier: directCarrier, coefficient: 1, constant: 0 };
  }

  const { sign, value } = unwrapNegate(normalized);
  const directNegatedCarrier = matchInverseCarrier(value);
  if (sign === -1 && directNegatedCarrier) {
    return { carrier: directNegatedCarrier, coefficient: -1, constant: 0 };
  }

  if (isNodeArray(value) && value[0] === 'Multiply') {
    const factors = flattenMultiply(value);
    const numericFactors: number[] = [];
    let carrier: InverseCarrier | null = null;
    for (const factor of factors) {
      const numeric = numericFromNode(factor);
      if (numeric !== undefined) {
        numericFactors.push(numeric);
        continue;
      }
      const candidate = matchInverseCarrier(factor);
      if (!candidate || carrier) {
        return null;
      }
      carrier = candidate;
    }
    if (carrier && numericFactors.length > 0) {
      return {
        carrier,
        coefficient: sign * numericFactors.reduce((product, numeric) => product * numeric, 1),
        constant: 0,
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    const terms = flattenAdd(normalized);
    if (terms.length !== 2) {
      return null;
    }

    const first = parseLinearCarrier(terms[0]);
    const second = parseLinearCarrier(terms[1]);
    const firstNumeric = numericFromNode(terms[0]);
    const secondNumeric = numericFromNode(terms[1]);

    if (first && secondNumeric !== undefined) {
      return { ...first, constant: secondNumeric };
    }

    if (second && firstNumeric !== undefined) {
      return { ...second, constant: firstNumeric };
    }
  }

  return null;
}

function inverseEquation(carrier: InverseCarrier, isolatedValueLatex: string): { nextEquationLatex: string; error?: string } {
  if (carrier.kind === 'ln') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=e^{${isolatedValueLatex}}`,
    };
  }

  if (carrier.kind === 'log') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=${carrier.baseLatex}^{${isolatedValueLatex}}`,
    };
  }

  const positivityError = exponentialDomainError(isolatedValueLatex);
  if (positivityError) {
    return { nextEquationLatex: '', error: positivityError };
  }

  if (carrier.kind === 'exp') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=\\ln\\left(${isolatedValueLatex}\\right)`,
    };
  }

  return {
    nextEquationLatex: `${carrier.innerLatex}=\\frac{\\ln\\left(${isolatedValueLatex}\\right)}{\\ln\\left(${carrier.baseLatex}\\right)}`,
  };
}

function matchInverseIsolation(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = equationAst;
  const leftLinear = parseLinearCarrier(left);
  const rightLinear = parseLinearCarrier(right);
  const leftConstant = numericFromNode(right);
  const rightConstant = numericFromNode(left);

  let linearCarrier = leftLinear;
  let constant = leftConstant;
  if (!linearCarrier || constant === undefined) {
    linearCarrier = rightLinear;
    constant = rightConstant;
  }

  if (!linearCarrier || constant === undefined || Math.abs(linearCarrier.coefficient) < EPSILON) {
    return { kind: 'none' };
  }

  const isolatedValue = (constant - linearCarrier.constant) / linearCarrier.coefficient;
  const isolatedValueLatex = formatBranchValue(isolatedValue);
  const next = inverseEquation(linearCarrier.carrier, isolatedValueLatex);
  if (next.error) {
    return { kind: 'blocked', error: next.error };
  }
  const branchSet = createBranchSet({
    equations: [next.nextEquationLatex],
    constraints: linearCarrier.carrier.kind === 'ln' || linearCarrier.carrier.kind === 'log'
      ? [{ kind: 'positive', expressionLatex: linearCarrier.carrier.innerLatex }]
      : undefined,
    provenance: 'substitution-inverse-isolation',
  });

  return {
    kind: 'branches',
    equations: branchSet.equations,
    solveBadges: ['Inverse Isolation', 'Candidate Checked'],
    solveSummaryText: `Inverted ${toInlineSummaryMath(linearCarrier.carrier.carrierLatex)} into ${toInlineSummaryMath(next.nextEquationLatex)}`,
    domainConstraints: branchSet.constraints,
    diagnostics: {
      family: 'inverse-isolation',
      carrierKind: linearCarrier.carrier.kind,
      branchCount: branchSet.equations.length,
      filteredBranchCount: 0,
    },
  };
}

export { matchInverseIsolation };
