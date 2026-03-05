import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AngleUnit,
  SolveDomainConstraint,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../types/calculator';
import {
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import {
  matchAffineVariableArgument,
  matchScaledVariableArgument,
  matchTrigCall,
} from '../trigonometry/normalize';
import {
  exponentialDomainError,
  trigCarrierDomainError,
} from './domain-guards';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

export type SubstitutionSolveResult =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | {
      kind: 'branches';
      equations: string[];
      solveBadges: SolveBadge[];
      solveSummaryText: string;
      domainConstraints?: SolveDomainConstraint[];
      diagnostics?: SubstitutionSolveDiagnostics;
    };

type TrigCarrier = {
  kind: 'sin' | 'cos' | 'tan';
  argument: unknown;
  argumentLatex: string;
};

type ExpCarrier = {
  kind: 'exp' | 'power';
  baseNode: unknown;
  baseLatex: string;
};

function sameNode(left: unknown, right: unknown) {
  return termKey(normalizeAst(left)) === termKey(normalizeAst(right));
}

function unwrapNegate(node: unknown): { sign: number; value: unknown } {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return { sign: -1, value: node[1] };
  }
  return { sign: 1, value: node };
}

function numericFromNode(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).N?.();
    const json = numeric?.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (json && typeof json === 'object' && 'num' in json) {
      const value = Number((json as { num: string }).num);
      return Number.isFinite(value) ? value : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatBranchValue(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const denominatorMax = 64;
  for (let denominator = 1; denominator <= denominatorMax; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      if (denominator === 1) {
        return `${numerator}`;
      }
      return `\\frac{${numerator}}{${denominator}}`;
    }
  }

  return `${value}`;
}

function toInlineSummaryMath(latex: string) {
  return latex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{([^{}]+)\}/g, '($1)')
    .replace(/\\/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function solveLinearOrQuadratic(coefficients: number[]) {
  const [quadratic = 0, linear = 0, constant = 0] = coefficients;
  if (Math.abs(quadratic) < EPSILON) {
    if (Math.abs(linear) < EPSILON) {
      return [];
    }
    return [-constant / linear];
  }

  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < -EPSILON) {
    return [];
  }

  if (Math.abs(discriminant) < EPSILON) {
    return [-linear / (2 * quadratic)];
  }

  const root = Math.sqrt(Math.max(discriminant, 0));
  return [
    (-linear + root) / (2 * quadratic),
    (-linear - root) / (2 * quadratic),
  ];
}

function extractTermCore(node: unknown) {
  const normalized = normalizeAst(node);
  const { sign, value } = unwrapNegate(normalized);
  const factors = flattenMultiply(value);
  let coefficient = sign;
  const symbolic: unknown[] = [];

  for (const factor of factors) {
    const numeric = numericFromNode(factor);
    if (numeric !== undefined) {
      coefficient *= numeric;
    } else {
      symbolic.push(factor);
    }
  }

  if (symbolic.length === 0) {
    return { coefficient, symbolic: null as unknown | null };
  }

  if (symbolic.length !== 1) {
    return null;
  }

  return { coefficient, symbolic: symbolic[0] };
}

function matchSupportedTrigCarrier(node: unknown): TrigCarrier | null {
  const trig = matchTrigCall(normalizeAst(node));
  const affine = trig ? matchAffineVariableArgument(trig.argument, { maxCoefficient: 6 }) : null;
  if (!trig || !affine) {
    return null;
  }

  return {
    kind: trig.kind,
    argument: trig.argument,
    argumentLatex: affine.argumentLatex,
  };
}

function trigCarrierEquation(kind: 'sin' | 'cos' | 'tan', argumentLatex: string, value: number) {
  const fn = kind === 'sin' ? '\\sin' : kind === 'cos' ? '\\cos' : '\\tan';
  return `${fn}\\left(${argumentLatex}\\right)=${formatBranchValue(value)}`;
}

function parseTrigPolynomialTerm(node: unknown) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier: null as TrigCarrier | null,
    };
  }

  const directCarrier = matchSupportedTrigCarrier(core.symbolic);
  if (directCarrier) {
    return {
      coefficient: core.coefficient,
      degree: 1 as const,
      carrier: directCarrier,
    };
  }

  const normalized = normalizeAst(core.symbolic);
  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isFiniteNumber(normalized[2])
    && normalized[2] === 2
  ) {
    const squaredCarrier = matchSupportedTrigCarrier(normalized[1]);
    if (squaredCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 2 as const,
        carrier: squaredCarrier,
      };
    }
  }

  return null;
}

function matchTrigPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  const coefficients = new Map<number, number>();
  let carrier: TrigCarrier | null = null;

  for (const term of terms) {
    const parsed = parseTrigPolynomialTerm(term);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0) {
      if (!carrier) {
        carrier = parsed.carrier;
      } else if (!parsed.carrier || carrier.kind !== parsed.carrier.kind || !sameNode(carrier.argument, parsed.carrier.argument)) {
        return { kind: 'none' };
      }
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);

  if (roots.length === 0) {
    if ((carrier.kind === 'sin' || carrier.kind === 'cos') && degree === 2) {
      return {
        kind: 'blocked',
        error: 'No real solutions were found for the substituted trig carrier.',
      };
    }

    return { kind: 'none' };
  }

  const validRoots = roots.filter((root, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index);

  const equations: string[] = [];
  for (const root of validRoots) {
    if (carrier.kind === 'sin' || carrier.kind === 'cos') {
      const error = trigCarrierDomainError(carrier.kind, formatBranchValue(root));
      if (error) {
        continue;
      }
    }
    equations.push(trigCarrierEquation(carrier.kind, carrier.argumentLatex, root));
  }

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: carrier.kind === 'sin' || carrier.kind === 'cos'
        ? 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.'
        : 'No real solutions were found for the substituted trig carrier.',
    };
  }

  const carrierLabel = carrier.kind === 'sin'
    ? `\\sin\\left(${carrier.argumentLatex}\\right)`
    : carrier.kind === 'cos'
      ? `\\cos\\left(${carrier.argumentLatex}\\right)`
      : `\\tan\\left(${carrier.argumentLatex}\\right)`;

  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;

  return {
    kind: 'branches',
    equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
    diagnostics: {
      family: 'trig-polynomial',
      carrierKind: carrier.kind,
      polynomialDegree: degree as 1 | 2,
      branchCount: equations.length,
      filteredBranchCount: Math.max(0, validRoots.length - equations.length),
    },
  };
}

function matchSupportedExponentialCarrier(node: unknown): ExpCarrier | null {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (sameNode(normalized[1], 'x')) {
      return { kind: 'exp', baseNode: 'ExponentialE', baseLatex: 'e' };
    }
    return null;
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const [, base, exponent] = normalized;
  if (!sameNode(exponent, 'x')) {
    return null;
  }

  if (base === 'ExponentialE') {
    return { kind: 'exp', baseNode: base, baseLatex: 'e' };
  }

  const numericBase = numericFromNode(base);
  if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
    return { kind: 'power', baseNode: base, baseLatex: boxLatex(base) };
  }

  return null;
}

function expTermDegree(symbolic: unknown, carrier: ExpCarrier): number | null {
  const normalized = normalizeAst(symbolic);

  if (carrier.kind === 'exp' && isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (sameNode(normalized[1], 'x')) {
      return 1;
    }

    const scaledExp = matchScaledVariableArgument(normalized[1]);
    if (scaledExp && Number.isInteger(scaledExp.coefficient) && scaledExp.coefficient > 0 && scaledExp.coefficient <= 2) {
      return scaledExp.coefficient;
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const [, base, exponent] = normalized;
    if (sameNode(base, carrier.baseNode)) {
      if (sameNode(exponent, 'x')) {
        return 1;
      }

      const scaled = matchScaledVariableArgument(exponent);
      if (scaled) {
        return scaled.coefficient <= 2 ? scaled.coefficient : null;
      }
    }

    if (sameNode(base, ['Power', carrier.baseNode, 'x']) && isFiniteNumber(exponent) && Number.isInteger(exponent) && exponent > 0 && exponent <= 2) {
      return exponent;
    }

    if (
      isNodeArray(base)
      && base[0] === 'Power'
      && base.length === 3
      && sameNode(base[1], carrier.baseNode)
      && sameNode(base[2], 'x')
      && isFiniteNumber(exponent)
      && Number.isInteger(exponent)
      && exponent > 0
      && exponent <= 2
    ) {
      return exponent;
    }
  }

  return null;
}

function parseExpPolynomialTerm(node: unknown, carrier: ExpCarrier | null) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier,
    };
  }

  if (!carrier) {
    const directCarrier = matchSupportedExponentialCarrier(core.symbolic);
    if (directCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 1 as const,
        carrier: directCarrier,
      };
    }

    const normalized = normalizeAst(core.symbolic);
    if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
      const scaled = matchScaledVariableArgument(normalized[1]);
      if (scaled && Number.isInteger(scaled.coefficient) && scaled.coefficient > 0 && scaled.coefficient <= 2) {
        return {
          coefficient: core.coefficient,
          degree: scaled.coefficient as 1 | 2,
          carrier: { kind: 'exp' as const, baseNode: 'ExponentialE', baseLatex: 'e' },
        };
      }
    }

    if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
      const [, base, exponent] = normalized;
      const scaled = matchScaledVariableArgument(exponent);
      if (scaled && Number.isInteger(scaled.coefficient) && scaled.coefficient > 0 && scaled.coefficient <= 2) {
        if (base === 'ExponentialE') {
          return {
            coefficient: core.coefficient,
            degree: scaled.coefficient as 1 | 2,
            carrier: { kind: 'exp' as const, baseNode: base, baseLatex: 'e' },
          };
        }

        const numericBase = numericFromNode(base);
        if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
          return {
            coefficient: core.coefficient,
            degree: scaled.coefficient as 1 | 2,
            carrier: { kind: 'power' as const, baseNode: base, baseLatex: boxLatex(base) },
          };
        }
      }
    }
  }

  if (carrier) {
    const degree = expTermDegree(core.symbolic, carrier);
    if (degree && degree <= 2) {
      return {
        coefficient: core.coefficient,
        degree: degree as 1 | 2,
        carrier,
      };
    }
  }

  return null;
}

function exponentBranchEquation(carrier: ExpCarrier, root: number) {
  const rootLatex = formatBranchValue(root);
  if (carrier.kind === 'exp') {
    return `e^x=${rootLatex}`;
  }

  return `${carrier.baseLatex}^x=${rootLatex}`;
}

function matchExponentialPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  let carrier: ExpCarrier | null = null;
  const coefficients = new Map<number, number>();

  for (const term of terms) {
    const parsed = parseExpPolynomialTerm(term, carrier);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0 && parsed.carrier) {
      carrier = parsed.carrier;
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);
  if (roots.length === 0) {
    return { kind: 'none' };
  }

  const uniqueRoots = roots
    .filter((root, index, list) => list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index);

  const equations = uniqueRoots
    .filter((root) => !exponentialDomainError(formatBranchValue(root)))
    .map((root) => exponentBranchEquation(carrier!, root));

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: 'No real solutions because exponential expressions are always positive.',
    };
  }

  const carrierLabel = carrier.kind === 'exp' ? 'e^x' : `${carrier.baseLatex}^x`;
  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;

  return {
    kind: 'branches',
    equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
    diagnostics: {
      family: 'exp-polynomial',
      carrierKind: carrier.kind,
      polynomialDegree: degree as 1 | 2,
      branchCount: equations.length,
      filteredBranchCount: Math.max(0, uniqueRoots.length - equations.length),
    },
  };
}

type InverseCarrier =
  | { kind: 'ln'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'log'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'exp'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'power'; inner: unknown; innerLatex: string; carrierLatex: string; baseLatex: string };

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
    };
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
      nextEquationLatex: `${carrier.innerLatex}=10^{${isolatedValueLatex}}`,
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

  return {
    kind: 'branches',
    equations: [next.nextEquationLatex],
    solveBadges: ['Inverse Isolation', 'Candidate Checked'],
    solveSummaryText: `Inverted ${toInlineSummaryMath(linearCarrier.carrier.carrierLatex)} into ${toInlineSummaryMath(next.nextEquationLatex)}`,
    domainConstraints: linearCarrier.carrier.kind === 'ln' || linearCarrier.carrier.kind === 'log'
      ? [{ kind: 'positive', expressionLatex: linearCarrier.carrier.innerLatex }]
      : undefined,
    diagnostics: {
      family: 'inverse-isolation',
      carrierKind: linearCarrier.carrier.kind,
      branchCount: 1,
      filteredBranchCount: 0,
    },
  };
}

type LogCallKind = 'ln' | 'log';

type LogCall = {
  kind: LogCallKind;
  inner: unknown;
  innerLatex: string;
  baseNode: unknown;
  baseLatex: string;
  baseNumeric: number;
  carrierLatex: string;
};

type LogCallMatch =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'matched'; call: LogCall };

type LogCombineCarrier = {
  family: 'same-base' | 'mixed-base';
  left: LogCall;
  right: LogCall;
  carrierLatex: string;
};

type LogCombineCarrierMatch =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'carrier'; carrier: LogCombineCarrier };

type LinearLogCombineParseResult =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | { kind: 'linear'; carrier: LogCombineCarrier; coefficient: number; constant: number };

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

function nonZeroSideFromEquation(equationLatex: string) {
  const parsed = ce.parse(equationLatex);
  const json = normalizeAst(parsed.json);
  if (!isNodeArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  return ['Add', json[1], ['Negate', json[2]]] as unknown;
}

export function matchSubstitutionSolve(
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

  const inverse = matchInverseIsolation(normalizeAst(ce.parse(equationLatex).json));
  if (inverse.kind !== 'none') {
    return inverse;
  }

  const logCombine = matchLogCombineSolve(normalizeAst(ce.parse(equationLatex).json));
  if (logCombine.kind !== 'none') {
    return logCombine;
  }

  const exponential = matchExponentialPolynomialSubstitution(zeroForm);
  if (exponential.kind !== 'none') {
    return exponential;
  }

  return { kind: 'none' };
}
