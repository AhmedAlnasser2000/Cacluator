import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../math-engine';
import { solutionsToLatex } from '../../format';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
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
import { algebraTransformSolve } from './algebra-stage';
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

function hasNonFiniteRawSolutions(symbolic: ReturnType<typeof runExpressionAction>) {
  if (symbolic.rawSolutionLatex?.some((solution) => solution.includes('\\infty') || solution.includes('\\tilde\\infty'))) {
    return true;
  }

  return Boolean(symbolic.rawSolutions?.some((solution) => {
    if (!solution || typeof solution !== 'object') {
      return false;
    }
    const value = (solution as { _value?: unknown })._value;
    return value === Infinity || value === -Infinity;
  }));
}

function attachAlgebraMetadata(
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

function prepareAlgebraSolveRequest(request: GuardedSolveRequest): GuardedSolveRequest {
  const parsed = ce.parse(request.resolvedLatex);
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return request;
  }

  const leftRadical = normalizeExactRadicalNode(json[1], 'equation');
  const rightRadical = normalizeExactRadicalNode(json[2], 'equation');

  const leftRadicalNode = leftRadical?.normalizedNode ?? json[1];
  const rightRadicalNode = rightRadical?.normalizedNode ?? json[2];

  const leftNormalization = normalizeExactRationalNode(leftRadicalNode, 'simplify');
  const rightNormalization = normalizeExactRationalNode(rightRadicalNode, 'simplify');

  const leftNode = leftNormalization?.normalizedNode ?? leftRadicalNode;
  const rightNode = rightNormalization?.normalizedNode ?? rightRadicalNode;
  const leftLatex = leftNormalization?.normalizedLatex
    ?? leftRadical?.normalizedLatex
    ?? ce.box(json[1] as Parameters<typeof ce.box>[0]).latex;
  const rightLatex = rightNormalization?.normalizedLatex
    ?? rightRadical?.normalizedLatex
    ?? ce.box(json[2] as Parameters<typeof ce.box>[0]).latex;

  const domainConstraints = mergeDomainConstraints(
    request.domainConstraints,
    mergeDomainConstraints(
      mergeDomainConstraints(
        leftRadical?.conditionConstraints,
        rightRadical?.conditionConstraints,
      ),
      mergeDomainConstraints(
        leftNormalization?.exclusionConstraints,
        rightNormalization?.exclusionConstraints,
      ),
    ),
  );
  const exactSupplementLatex = mergeSupplementLatex(
    request.exactSupplementLatex,
    mergeSupplementLatex(
      mergeSupplementLatex(
        leftRadical?.exactSupplementLatex,
        rightRadical?.exactSupplementLatex,
      ),
      mergeSupplementLatex(
        leftNormalization?.exactSupplementLatex,
        rightNormalization?.exactSupplementLatex,
      ),
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
      ['Candidate Checked'],
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
    ['Candidate Checked'],
    undefined,
    validation.rejected.length > 0 ? validation.rejected.length : undefined,
  );
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
): DisplayOutcome {
  const preparedRequest = prepareAlgebraSolveRequest(request);
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachAlgebraMetadata(errorOutcome(
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

  const rangeImpossibility = detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  const algebraTransformed = algebraTransformSolve(
    preparedRequest,
    depth,
    trail,
    MAX_RECURSION_DEPTH,
    runGuardedEquationSolve,
  );
  if (algebraTransformed?.kind === 'success') {
    return attachAlgebraMetadata(algebraTransformed, request.resolvedLatex, preparedRequest);
  }
  if (rangeImpossibility.kind === 'impossible') {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      rangeImpossibility.error,
      symbolic.warnings,
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    ), request.resolvedLatex, preparedRequest);
  }
  if (!symbolic.error && symbolic.exactLatex && !hasNonFiniteRawSolutions(symbolic)) {
    const validated = validateDirectSymbolicOutcome(preparedRequest, symbolic);
    return attachAlgebraMetadata(validated ?? successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    ), request.resolvedLatex, preparedRequest);
  }
  if (algebraTransformed?.kind === 'error') {
    return attachAlgebraMetadata(algebraTransformed, request.resolvedLatex, preparedRequest);
  }

  const directTrig = directTrigSolve(preparedRequest);
  if (directTrig) {
    return attachAlgebraMetadata(directTrig, request.resolvedLatex, preparedRequest);
  }

  const rewriteTrig = rewriteTrigSolve(preparedRequest);
  if (rewriteTrig?.kind === 'success') {
    return attachAlgebraMetadata(rewriteTrig, request.resolvedLatex, preparedRequest);
  }
  if (rewriteTrig?.kind === 'error') {
    return attachAlgebraMetadata(rewriteTrig, request.resolvedLatex, preparedRequest);
  }

  const substituted = substitutionSolve(
    preparedRequest,
    depth,
    trail,
    MAX_RECURSION_DEPTH,
    runGuardedEquationSolve,
  );
  if (substituted?.kind === 'success') {
    return attachAlgebraMetadata(substituted, request.resolvedLatex, preparedRequest);
  }
  if (substituted?.kind === 'error') {
    return attachAlgebraMetadata(substituted, request.resolvedLatex, preparedRequest);
  }

  const numeric = numericIntervalSolve(preparedRequest);
  if (numeric) {
    return attachAlgebraMetadata(numeric, request.resolvedLatex, preparedRequest);
  }

  return attachAlgebraMetadata(errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  ), request.resolvedLatex, preparedRequest);
}

export { runGuardedEquationSolve };
