import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../math-engine';
import { solutionsToLatex } from '../../format';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { detectRealRangeImpossibility } from '../range-impossibility';
import { validateCandidateRoots } from '../candidate-validation';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
  successOutcome,
} from './outcome';
import { equationStateKey } from './state-key';
import { directTrigSolve } from './direct-trig-stage';
import { rewriteTrigSolve } from './rewrite-trig-stage';
import { substitutionSolve } from './substitution-stage';
import { numericIntervalSolve } from './numeric-stage';

const MAX_RECURSION_DEPTH = 4;
const ce = new ComputeEngine();
const NUMERIC_MATCH_TOLERANCE = 1e-6;

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return node === 0
    || (
      isMathJsonArray(node)
      && node[0] === 'Rational'
      && node.length === 3
      && node[1] === 0
    );
}

function mergeDomainConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

function mergeSupplementLatex(left: string[] = [], right: string[] = []) {
  return [...new Set([...left, ...right])];
}

function formatAcceptedApproximations(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const parts = values.map((value) => value.toFixed(6).replace(/0+$/, '').replace(/\.$/, ''));
  return parts.length === 1 ? `x ~= ${parts[0]}` : `x ~= ${parts.join(', ')}`;
}

function attachRationalMetadata(
  outcome: DisplayOutcome,
  originalResolvedLatex: string,
  request: GuardedSolveRequest,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const exactSupplementLatex = mergeSupplementLatex(
    outcome.exactSupplementLatex,
    request.exactSupplementLatex,
  );

  return {
    ...outcome,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    resolvedInputLatex:
      outcome.resolvedInputLatex
      ?? (request.resolvedLatex !== originalResolvedLatex ? request.resolvedLatex : undefined),
  };
}

function prepareRationalSolveRequest(request: GuardedSolveRequest): GuardedSolveRequest {
  const parsed = ce.parse(request.resolvedLatex);
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return request;
  }

  const leftNormalization = normalizeExactRationalNode(json[1], 'simplify');
  const rightNormalization = normalizeExactRationalNode(json[2], 'simplify');

  const leftNode = leftNormalization?.normalizedNode ?? json[1];
  const rightNode = rightNormalization?.normalizedNode ?? json[2];
  const leftLatex = leftNormalization?.normalizedLatex ?? ce.box(json[1] as Parameters<typeof ce.box>[0]).latex;
  const rightLatex = rightNormalization?.normalizedLatex ?? ce.box(json[2] as Parameters<typeof ce.box>[0]).latex;

  const domainConstraints = mergeDomainConstraints(
    request.domainConstraints,
    mergeDomainConstraints(
      leftNormalization?.exclusionConstraints,
      rightNormalization?.exclusionConstraints,
    ),
  );
  const exactSupplementLatex = mergeSupplementLatex(
    request.exactSupplementLatex,
    mergeSupplementLatex(
      leftNormalization?.exactSupplementLatex,
      rightNormalization?.exactSupplementLatex,
    ),
  );

  let resolvedLatex = ce.box(['Equal', leftNode, rightNode] as Parameters<typeof ce.box>[0]).latex;

  if (leftNormalization?.denominatorNode && isZeroNode(rightNode)) {
    resolvedLatex = `${leftNormalization.numeratorLatex}=0`;
  } else if (rightNormalization?.denominatorNode && isZeroNode(leftNode)) {
    resolvedLatex = `${rightNormalization.numeratorLatex}=0`;
  } else if (leftLatex !== ce.box(json[1] as Parameters<typeof ce.box>[0]).latex || rightLatex !== ce.box(json[2] as Parameters<typeof ce.box>[0]).latex) {
    resolvedLatex = `${leftLatex}=${rightLatex}`;
  }

  return {
    ...request,
    resolvedLatex,
    validationLatex: request.validationLatex ?? request.resolvedLatex,
    domainConstraints,
    exactSupplementLatex,
  };
}

function validateDirectSymbolicOutcome(
  request: GuardedSolveRequest,
  symbolic: ReturnType<typeof runExpressionAction>,
): DisplayOutcome | null {
  const needsValidation =
    (request.domainConstraints?.length ?? 0) > 0
    || Boolean(request.validationLatex && request.validationLatex !== request.resolvedLatex);
  if (!needsValidation) {
    return null;
  }

  const numericSolutions = symbolic.numericSolutions;
  const rawSolutionLatex = symbolic.rawSolutionLatex;
  if (
    !symbolic.exactLatex
    || !numericSolutions
    || !rawSolutionLatex
    || numericSolutions.length === 0
    || numericSolutions.some((value) => value === null)
  ) {
    return null;
  }

  const finiteSolutions = numericSolutions.filter((value): value is number => value !== null);
  const validation = validateCandidateRoots(
    request.validationLatex ?? request.resolvedLatex,
    finiteSolutions,
    request.domainConstraints,
    'symbolic-direct',
  );

  if (validation.accepted.length === 0) {
    return errorOutcome(
      'Solve',
      'No valid symbolic solution remains after applying denominator exclusions.',
      symbolic.warnings,
      [],
      [],
      undefined,
      validation.rejected.length,
    );
  }

  const acceptedLatex: string[] = [];
  const acceptedValues: number[] = [];
  for (const acceptedValue of validation.accepted) {
    const matchIndex = finiteSolutions.findIndex((value, index) =>
      Math.abs(value - acceptedValue) <= NUMERIC_MATCH_TOLERANCE
      && !acceptedValues.some((usedValue) => Math.abs(usedValue - value) <= NUMERIC_MATCH_TOLERANCE)
      && !acceptedLatex.includes(rawSolutionLatex[index]));
    if (matchIndex >= 0) {
      acceptedValues.push(finiteSolutions[matchIndex]);
      acceptedLatex.push(rawSolutionLatex[matchIndex]);
    }
  }

  return successOutcome(
    'Solve',
    solutionsToLatex('x', acceptedLatex),
    formatAcceptedApproximations(acceptedValues),
    symbolic.warnings,
    [],
    [],
    undefined,
    validation.rejected.length,
  );
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
): DisplayOutcome {
  const preparedRequest = prepareRationalSolveRequest(request);
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachRationalMetadata(errorOutcome(
      'Solve',
      'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
    ), request.resolvedLatex, preparedRequest);
  }
  trail.add(stateKey);

  const symbolic = runExpressionAction(
    {
      mode: 'equation',
      document: { latex: preparedRequest.resolvedLatex },
      angleUnit: preparedRequest.angleUnit,
      outputStyle: preparedRequest.outputStyle,
      variables: { Ans: preparedRequest.ansLatex },
    },
    'solve',
  );

  if (!symbolic.error && symbolic.exactLatex) {
    const validated = validateDirectSymbolicOutcome(preparedRequest, symbolic);
    return attachRationalMetadata(validated ?? successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    ), request.resolvedLatex, preparedRequest);
  }

  const rangeImpossibility = detectRealRangeImpossibility(preparedRequest.resolvedLatex);
  if (rangeImpossibility.kind === 'impossible') {
    return attachRationalMetadata(errorOutcome(
      'Solve',
      rangeImpossibility.error,
      symbolic.warnings,
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    ), request.resolvedLatex, preparedRequest);
  }

  const directTrig = directTrigSolve(preparedRequest);
  if (directTrig) {
    return attachRationalMetadata(directTrig, request.resolvedLatex, preparedRequest);
  }

  const rewriteTrig = rewriteTrigSolve(preparedRequest);
  if (rewriteTrig?.kind === 'success') {
    return attachRationalMetadata(rewriteTrig, request.resolvedLatex, preparedRequest);
  }
  if (rewriteTrig?.kind === 'error') {
    return attachRationalMetadata(rewriteTrig, request.resolvedLatex, preparedRequest);
  }

  const substituted = substitutionSolve(
    preparedRequest,
    depth,
    trail,
    MAX_RECURSION_DEPTH,
    runGuardedEquationSolve,
  );
  if (substituted?.kind === 'success') {
    return attachRationalMetadata(substituted, request.resolvedLatex, preparedRequest);
  }
  if (substituted?.kind === 'error') {
    return attachRationalMetadata(substituted, request.resolvedLatex, preparedRequest);
  }

  const numeric = numericIntervalSolve(preparedRequest);
  if (numeric) {
    return attachRationalMetadata(numeric, request.resolvedLatex, preparedRequest);
  }

  return attachRationalMetadata(errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  ), request.resolvedLatex, preparedRequest);
}

export { runGuardedEquationSolve };
