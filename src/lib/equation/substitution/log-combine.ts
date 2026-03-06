import type {
  LinearLogCombineParseResult,
  LogCall,
  LogCallMatch,
  LogCombineCarrier,
  LogCombineCarrierMatch,
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
import { termKey } from '../../symbolic-engine/patterns';

function isValidLogBase(base: number) {
  return base > 0 && Math.abs(base - 1) > EPSILON;
}

function canonicalBaseLatex(base: number, fallbackLatex: string) {
  const rounded = Math.round(base);
  if (Math.abs(base - rounded) < EPSILON) {
    return `${rounded}`;
  }

  return fallbackLatex;
}

function logCallToNaturalTermLatex(call: LogCall) {
  const inner = `\\ln\\left(${call.innerLatex}\\right)`;
  if (Math.abs(call.baseNumeric - Math.E) < EPSILON) {
    return inner;
  }

  return `\\frac{${inner}}{\\ln\\left(${canonicalBaseLatex(call.baseNumeric, call.baseLatex)}\\right)}`;
}

function sameLogBase(left: LogCall, right: LogCall) {
  if (Math.abs(left.baseNumeric - right.baseNumeric) < EPSILON) {
    return true;
  }

  return termKey(normalizeAst(left.baseNode)) === termKey(normalizeAst(right.baseNode));
}

function sameBaseTargetLatex(base: LogCall, isolatedValueLatex: string) {
  if (Math.abs(base.baseNumeric - Math.E) < EPSILON) {
    return `e^{${isolatedValueLatex}}`;
  }

  const baseLatex = canonicalBaseLatex(base.baseNumeric, base.baseLatex);
  return `${baseLatex}^{${isolatedValueLatex}}`;
}

function matchLogCall(node: unknown): LogCallMatch {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Ln') {
    return {
      kind: 'matched',
      call: {
        kind: 'ln',
        inner: normalized[1],
        innerLatex: boxLatex(normalized[1]),
        baseNode: Math.E,
        baseLatex: 'e',
        baseNumeric: Math.E,
        carrierLatex: boxLatex(normalized),
      },
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3)) {
    const inner = normalized[1];
    if (normalized.length === 2) {
      return {
        kind: 'matched',
        call: {
          kind: 'log',
          inner,
          innerLatex: boxLatex(inner),
          baseNode: 10,
          baseLatex: '10',
          baseNumeric: 10,
          carrierLatex: boxLatex(normalized),
        },
      };
    }

    const baseNode = normalized[2];
    const baseNumeric = numericFromNode(baseNode);
    if (baseNumeric === undefined || !Number.isFinite(baseNumeric)) {
      return {
        kind: 'blocked',
        error: 'Only constant numeric log bases are supported in this milestone.',
      };
    }

    if (!isValidLogBase(baseNumeric)) {
      return {
        kind: 'blocked',
        error: 'Log base must be a positive real number not equal to 1.',
      };
    }

    return {
      kind: 'matched',
      call: {
        kind: 'log',
        inner,
        innerLatex: boxLatex(inner),
        baseNode,
        baseLatex: boxLatex(baseNode),
        baseNumeric,
        carrierLatex: boxLatex(normalized),
      },
    };
  }

  return { kind: 'none' };
}

function matchLogCombineCarrier(node: unknown): LogCombineCarrierMatch {
  const normalized = normalizeAst(node);
  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return { kind: 'none' };
  }

  const leftMatch = matchLogCall(terms[0]);
  if (leftMatch.kind === 'blocked') {
    return leftMatch;
  }
  const rightMatch = matchLogCall(terms[1]);
  if (rightMatch.kind === 'blocked') {
    return rightMatch;
  }

  if (leftMatch.kind !== 'matched' || rightMatch.kind !== 'matched') {
    return { kind: 'none' };
  }

  return {
    kind: 'carrier',
    carrier: {
      family: sameLogBase(leftMatch.call, rightMatch.call) ? 'same-base' : 'mixed-base',
      left: leftMatch.call,
      right: rightMatch.call,
      carrierLatex: boxLatex(normalized),
    },
  };
}

function parseLinearLogCombine(node: unknown): LinearLogCombineParseResult {
  const normalized = normalizeAst(node);
  const directCarrier = matchLogCombineCarrier(normalized);
  if (directCarrier.kind === 'blocked') {
    return directCarrier;
  }
  if (directCarrier.kind === 'carrier') {
    return { kind: 'linear', carrier: directCarrier.carrier, coefficient: 1, constant: 0 };
  }

  const { sign, value } = unwrapNegate(normalized);
  const directNegatedCarrier = matchLogCombineCarrier(value);
  if (directNegatedCarrier.kind === 'blocked') {
    return directNegatedCarrier;
  }
  if (sign === -1 && directNegatedCarrier.kind === 'carrier') {
    return { kind: 'linear', carrier: directNegatedCarrier.carrier, coefficient: -1, constant: 0 };
  }

  if (isNodeArray(value) && value[0] === 'Multiply') {
    const factors = flattenMultiply(value);
    const numericFactors: number[] = [];
    let carrier: LogCombineCarrier | null = null;
    for (const factor of factors) {
      const numeric = numericFromNode(factor);
      if (numeric !== undefined) {
        numericFactors.push(numeric);
        continue;
      }

      const candidate = matchLogCombineCarrier(factor);
      if (candidate.kind === 'blocked') {
        return candidate;
      }
      if (candidate.kind !== 'carrier' || carrier) {
        return { kind: 'none' };
      }
      carrier = candidate.carrier;
    }

    if (carrier && numericFactors.length > 0) {
      return {
        kind: 'linear',
        carrier,
        coefficient: sign * numericFactors.reduce((product, numeric) => product * numeric, 1),
        constant: 0,
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    const terms = flattenAdd(normalized);
    let constant = 0;
    let linear: Extract<LinearLogCombineParseResult, { kind: 'linear' }> | null = null;

    for (const term of terms) {
      const numeric = numericFromNode(term);
      if (numeric !== undefined) {
        constant += numeric;
        continue;
      }

      const parsed = parseLinearLogCombine(term);
      if (parsed.kind === 'blocked') {
        return parsed;
      }
      if (parsed.kind !== 'linear' || linear) {
        return { kind: 'none' };
      }
      linear = parsed;
    }

    if (linear) {
      return {
        kind: 'linear',
        carrier: linear.carrier,
        coefficient: linear.coefficient,
        constant: linear.constant + constant,
      };
    }
  }

  return { kind: 'none' };
}

function matchLogCombineSolve(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = equationAst;
  const leftLinear = parseLinearLogCombine(left);
  if (leftLinear.kind === 'blocked') {
    return { kind: 'blocked', error: leftLinear.error };
  }
  const rightLinear = parseLinearLogCombine(right);
  if (rightLinear.kind === 'blocked') {
    return { kind: 'blocked', error: rightLinear.error };
  }
  const leftConstant = numericFromNode(right);
  const rightConstant = numericFromNode(left);

  let linear = leftLinear.kind === 'linear' ? leftLinear : null;
  let constant = leftConstant;
  if (!linear || constant === undefined) {
    linear = rightLinear.kind === 'linear' ? rightLinear : null;
    constant = rightConstant;
  }

  if (!linear || constant === undefined || Math.abs(linear.coefficient) < EPSILON) {
    return { kind: 'none' };
  }

  const isolatedValue = (constant - linear.constant) / linear.coefficient;
  if (!Number.isFinite(isolatedValue)) {
    return { kind: 'none' };
  }

  const isolatedValueLatex = formatBranchValue(isolatedValue);
  if (linear.carrier.family === 'same-base') {
    const targetLatex = sameBaseTargetLatex(linear.carrier.left, isolatedValueLatex);
    const nextEquationLatex = `\\left(${linear.carrier.left.innerLatex}\\right)\\left(${linear.carrier.right.innerLatex}\\right)=${targetLatex}`;
    const usesExplicitBase = Math.abs(linear.carrier.left.baseNumeric - Math.E) >= EPSILON
      && Math.abs(linear.carrier.left.baseNumeric - 10) >= EPSILON;

    return {
      kind: 'branches',
      equations: [nextEquationLatex],
      solveBadges: usesExplicitBase
        ? ['Symbolic Substitution', 'Log Combine', 'Log Base Normalize', 'Candidate Checked']
        : ['Symbolic Substitution', 'Log Combine', 'Candidate Checked'],
      solveSummaryText: `Combined ${toInlineSummaryMath(linear.carrier.carrierLatex)} into ${toInlineSummaryMath(nextEquationLatex)}`,
      domainConstraints: [
        { kind: 'positive', expressionLatex: linear.carrier.left.innerLatex },
        { kind: 'positive', expressionLatex: linear.carrier.right.innerLatex },
      ],
      diagnostics: {
        family: 'log-same-base',
        carrierKind: linear.carrier.left.kind,
        branchCount: 1,
        filteredBranchCount: 0,
      },
    };
  }

  const normalizedEquationLatex = `${logCallToNaturalTermLatex(linear.carrier.left)}+${logCallToNaturalTermLatex(linear.carrier.right)}=${isolatedValueLatex}`;
  return {
    kind: 'branches',
    equations: [normalizedEquationLatex],
    solveBadges: ['Symbolic Substitution', 'Log Base Normalize', 'Candidate Checked'],
    solveSummaryText: `Normalized mixed-base logs via change-of-base: ${toInlineSummaryMath(normalizedEquationLatex)}`,
    domainConstraints: [
      { kind: 'positive', expressionLatex: linear.carrier.left.innerLatex },
      { kind: 'positive', expressionLatex: linear.carrier.right.innerLatex },
    ],
    diagnostics: {
      family: 'log-mixed-base',
      carrierKind: 'log',
      branchCount: 1,
      filteredBranchCount: 0,
    },
  };
}

export { matchLogCombineSolve };
