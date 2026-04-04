import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../types/calculator';
import { parseSupportedRatio } from '../trigonometry/angles';
import { evaluateRealNumericExpression } from '../real-numeric-eval';

const ce = new ComputeEngine();
const RESIDUAL_TOLERANCE = 1e-8;

type BoxedLike = {
  latex: string;
  json: unknown;
  N?: () => BoxedLike;
  evaluate: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

export function equationToZeroFormLatex(equationLatex: string) {
  const parsed = ce.parse(equationLatex) as BoxedLike;
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return equationLatex;
  }

  return boxLatex(['Add', json[1], ['Negate', json[2]]]);
}

export function readNumericNode(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : null;
  }

  if (typeof node === 'string') {
    if (node === 'NaN' || node === 'ComplexInfinity' || node === 'PositiveInfinity' || node === 'NegativeInfinity') {
      return null;
    }

    const value = Number(node);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

export function evaluateLatexAt(latex: string, value: number) {
  const expr = ce.parse(latex) as BoxedLike;
  const substituted = expr.subs({ x: value });
  const evaluated = substituted.evaluate();
  const numeric = evaluated.N?.() ?? evaluated;
  let numericValue = readNumericNode(numeric.json);
  if (numericValue === null) {
    const fallback = evaluateRealNumericExpression(substituted.json, substituted.latex);
    if (fallback.kind === 'success') {
      numericValue = fallback.value;
    }
  }
  return {
    latex: numeric.latex,
    json: numeric.json,
    value: numericValue,
  };
}

function checkConstraint(constraint: SolveDomainConstraint, value: number): string | null {
  switch (constraint.kind) {
    case 'interval':
      if (constraint.min !== undefined) {
        if (constraint.minInclusive ? value < constraint.min : value <= constraint.min) {
          return 'outside the permitted interval';
        }
      }
      if (constraint.max !== undefined) {
        if (constraint.maxInclusive ? value > constraint.max : value >= constraint.max) {
          return 'outside the permitted interval';
        }
      }
      return null;
    case 'nonzero': {
      const numeric = evaluateLatexAt(constraint.expressionLatex, value).value;
      return numeric === null || Math.abs(numeric) < RESIDUAL_TOLERANCE ? 'would make a denominator zero' : null;
    }
    case 'positive': {
      const numeric = evaluateLatexAt(constraint.expressionLatex, value).value;
      return numeric === null || numeric <= 0 ? 'would make a logarithm or constrained expression non-positive' : null;
    }
    case 'nonnegative': {
      const numeric = evaluateLatexAt(constraint.expressionLatex, value).value;
      return numeric === null || numeric < 0 ? 'would make an even root negative' : null;
    }
    case 'carrier-range':
      return value < constraint.min - RESIDUAL_TOLERANCE || value > constraint.max + RESIDUAL_TOLERANCE
        ? 'lies outside the real range of the trig carrier'
        : null;
    case 'carrier-square-range':
      return value < constraint.min - RESIDUAL_TOLERANCE || value > constraint.max + RESIDUAL_TOLERANCE
        ? 'lies outside the real range of the trig square carrier'
        : null;
    case 'exp-positive':
      return value <= 0 ? 'must stay positive for an exponential carrier' : null;
  }
}

export function checkCandidateAgainstConstraints(
  value: number,
  constraints: SolveDomainConstraint[] = [],
): string | null {
  for (const constraint of constraints) {
    const violation = checkConstraint(constraint, value);
    if (violation) {
      return violation;
    }
  }

  return null;
}

export function trigCarrierDomainError(_kind: 'sin' | 'cos', valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric < -1 || numeric > 1) {
    return 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.';
  }

  return null;
}

export function trigSquareDomainError(valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric < 0 || numeric > 1) {
    return 'No real solutions because sin^2(theta) and cos^2(theta) stay between 0 and 1.';
  }

  return null;
}

export function exponentialDomainError(valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric <= 0) {
    return 'No real solutions because exponential expressions are always positive.';
  }

  return null;
}

export function validateResidual(
  zeroFormLatex: string,
  candidate: number,
  constraints: SolveDomainConstraint[] = [],
): CandidateValidationResult {
  const constraintViolation = checkCandidateAgainstConstraints(candidate, constraints);
  if (constraintViolation) {
    return {
      kind: 'rejected',
      value: candidate,
      reason: constraintViolation,
    };
  }

  const evaluated = evaluateLatexAt(zeroFormLatex, candidate);
  if (evaluated.value === null) {
    return {
      kind: 'rejected',
      value: candidate,
      reason: 'produces an undefined or non-real substitution',
    };
  }

  const residual = Math.abs(evaluated.value);
  if (residual > RESIDUAL_TOLERANCE) {
    return {
      kind: 'rejected',
      value: candidate,
      reason: 'does not satisfy the original equation after substitution',
    };
  }

  return {
    kind: 'accepted',
    value: candidate,
    residual,
  };
}
