import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../math-engine';
import { formatApproxNumber, solutionsToLatex } from '../../format';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { detectRealRangeImpossibility } from '../range-impossibility';
import { validateCandidateRoots } from '../candidate-validation';
import { recognizeBoundedPolynomialEquationAst, solveBoundedPolynomialEquationAst } from '../../polynomial-factor-solve';
import type {
  CandidateValidationResult,
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { getEquationExecutionBudget } from '../../kernel/runtime-profile';
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
import { compositionSolve } from '../composition-stage';

const ce = new ComputeEngine();
const NUMERIC_MATCH_TOLERANCE = 1e-6;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const CONDITION_PREFIX = '\\text{Conditions: } ';

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

function isNumericConstantNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return node === 'Pi' || node === 'ExponentialE';
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericConstantNode(child));
}

function containsSolveVariable(node: unknown, variable = 'x'): boolean {
  if (typeof node === 'string') {
    return node === variable;
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).some((child) => containsSolveVariable(child, variable));
}

function isDirectTrigExpression(node: unknown) {
  return isMathJsonArray(node)
    && typeof node[0] === 'string'
    && DIRECT_TRIG_OPERATORS.has(node[0])
    && node.length >= 2;
}

function shouldSkipDirectSymbolicSolve(equationLatex: string) {
  try {
    const parsed = ce.parse(equationLatex).json;
    if (!isMathJsonArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
      return false;
    }

    const [, left, right] = parsed;
    return (
      (isDirectTrigExpression(left) && containsSolveVariable(right) && !isNumericConstantNode(right))
      || (isDirectTrigExpression(right) && containsSolveVariable(left) && !isNumericConstantNode(left))
    );
  } catch {
    return false;
  }
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
  const supplements: string[] = [];
  const seenConditionFragments = new Set<string>();

  const addConditionFragments = (line: string) => {
    const fragments = line.slice(CONDITION_PREFIX.length).split(',\\;').map((entry) => entry.trim()).filter(Boolean);
    for (const fragment of fragments) {
      seenConditionFragments.add(fragment);
    }
  };

  for (const line of [...left, ...right]) {
    if (line.startsWith(CONDITION_PREFIX)) {
      addConditionFragments(line);
      continue;
    }

    if (!supplements.includes(line)) {
      supplements.push(line);
    }
  }

  if (seenConditionFragments.size > 0) {
    supplements.push(`${CONDITION_PREFIX}${[...seenConditionFragments].join(',\\;')}`);
  }

  return supplements;
}

function formatAcceptedApproximations(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const parts = values.map((value) => formatApproxNumber(value));
  return parts.length === 1 ? `x ~= ${parts[0]}` : `x ~= ${parts.join(', ')}`;
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function candidateRejectionMessage(
  constraints: SolveDomainConstraint[] = [],
  rejected: CandidateValidationResult[] = [],
) {
  const rejectedReasons = rejected.flatMap((entry) =>
    entry.kind === 'rejected' ? [entry.reason.toLowerCase()] : []);

  if (rejectedReasons.some((reason) => reason.includes('denominator zero'))) {
    return 'No valid real symbolic solution remains after applying denominator exclusions.';
  }

  if (rejectedReasons.some((reason) => reason.includes('undefined or non-real substitution'))) {
    return 'No valid real symbolic solution remains because the accepted candidate makes the original equation undefined in the real domain.';
  }

  if (
    rejectedReasons.some((reason) =>
      reason.includes('non-positive')
      || reason.includes('even root negative')
      || reason.includes('outside the permitted interval')
      || reason.includes('must stay positive'))
  ) {
    return 'No valid real symbolic solution remains after applying preserved domain conditions.';
  }

  if (constraints.some((constraint) => constraint.kind === 'nonzero')) {
    return 'No valid real symbolic solution remains after applying denominator exclusions.';
  }

  if (constraints.length > 0) {
    return 'No valid real symbolic solution remains after applying preserved domain conditions.';
  }

  return 'No valid real symbolic solution remains after candidate checking.';
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
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    return errorOutcome(
      'Solve',
      candidateRejectionMessage(request.domainConstraints, validation.rejected),
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

  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    approxText: formatAcceptedApproximations(acceptedValues),
    warnings: symbolic.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: [],
    solveBadges: ['Candidate Checked'],
    candidateValues: acceptedValues,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
  };
}

function runBoundedPolynomialSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  try {
    const parsed = ce.parse(request.resolvedLatex).json;
    const recognized = recognizeBoundedPolynomialEquationAst(parsed, 'x');
    if (!recognized) {
      return null;
    }

    const solved = solveBoundedPolynomialEquationAst(parsed, 'x');
    if (!solved) {
      return errorOutcome(
        'Solve',
        UNSUPPORTED_FAMILY_ERROR,
      );
    }

    return {
      kind: 'success',
      title: 'Solve',
      exactLatex: solved.exactLatex,
      approxText: solved.approxText,
      warnings: [],
      resultOrigin: 'symbolic',
      plannerBadges: [],
      solveBadges: [],
      candidateValues: solved.approxSolutions,
    };
  } catch {
    return null;
  }
}

export type GuardedEquationStageId =
  | 'numeric-interval'
  | 'bounded-polynomial'
  | 'algebra-transform'
  | 'composition'
  | 'direct-trig'
  | 'rewrite-trig'
  | 'substitution'
  | 'direct-symbolic';

type SymbolicSolveResult = ReturnType<typeof runExpressionAction>;

type GuardedEquationStageContext = {
  preparedRequest: GuardedSolveRequest;
  originalResolvedLatex: string;
  depth: number;
  trail: Set<string>;
  executionBudget: EquationExecutionBudget;
  getSymbolic: () => SymbolicSolveResult;
};

export type GuardedEquationStageDescriptor = {
  id: GuardedEquationStageId;
  label: string;
  execute: (context: GuardedEquationStageContext) => DisplayOutcome | null | undefined;
  canRecurse?: boolean;
};

function runDirectSymbolicStage(
  context: GuardedEquationStageContext,
): DisplayOutcome {
  const { preparedRequest } = context;

  if (shouldSkipDirectSymbolicSolve(preparedRequest.resolvedLatex)) {
    return errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    );
  }

  const symbolic = context.getSymbolic();
  if (!symbolic.error && symbolic.exactLatex && !hasNonFiniteRawSolutions(symbolic)) {
    const validated = validateDirectSymbolicOutcome(preparedRequest, symbolic);
    return validated ?? successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    );
  }

  return errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  );
}

const GUARDED_EQUATION_STAGE_DESCRIPTORS: GuardedEquationStageDescriptor[] = [
  {
    id: 'numeric-interval',
    label: 'Numeric Interval',
    execute: ({ preparedRequest }) => (
      preparedRequest.numericInterval ? numericIntervalSolve(preparedRequest) : null
    ),
  },
  {
    id: 'bounded-polynomial',
    label: 'Bounded Polynomial',
    execute: ({ preparedRequest }) => runBoundedPolynomialSolve(preparedRequest),
  },
  {
    id: 'algebra-transform',
    label: 'Algebra Transform',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget }) => algebraTransformSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    ),
  },
  {
    id: 'composition',
    label: 'Composition',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget }) => compositionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    ),
  },
  {
    id: 'direct-trig',
    label: 'Direct Trig',
    execute: ({ preparedRequest }) => directTrigSolve(preparedRequest),
  },
  {
    id: 'rewrite-trig',
    label: 'Rewrite Trig',
    execute: ({ preparedRequest }) => rewriteTrigSolve(preparedRequest),
  },
  {
    id: 'substitution',
    label: 'Substitution',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget }) => substitutionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    ),
  },
  {
    id: 'direct-symbolic',
    label: 'Direct Symbolic',
    execute: runDirectSymbolicStage,
  },
];

export function listGuardedEquationStageDescriptors(): GuardedEquationStageDescriptor[] {
  return GUARDED_EQUATION_STAGE_DESCRIPTORS;
}

function runGuardedStageSequence(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): DisplayOutcome | null {
  for (const descriptor of descriptors) {
    const outcome = descriptor.execute(context);
    if (outcome) {
      return attachAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
): DisplayOutcome {
  const executionBudget = getEquationExecutionBudget();
  const preparedRequest = prepareAlgebraSolveRequest(request);
  let symbolicCache: ReturnType<typeof runExpressionAction> | null = null;
  const getSymbolic = () => {
    if (symbolicCache) {
      return symbolicCache;
    }

    symbolicCache = runExpressionAction(
      {
        mode: 'equation',
        document: { latex: preparedRequest.resolvedLatex },
        angleUnit: preparedRequest.angleUnit,
        outputStyle: preparedRequest.outputStyle,
        variables: { Ans: preparedRequest.ansLatex },
      },
      'solve',
    );

    return symbolicCache;
  };
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
    ), request.resolvedLatex, preparedRequest);
  }
  trail.add(stateKey);

  const rangeImpossibility = detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  if (rangeImpossibility.kind === 'impossible') {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      rangeImpossibility.error,
      [],
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    ), request.resolvedLatex, preparedRequest);
  }

  const stagedOutcome = runGuardedStageSequence(
    GUARDED_EQUATION_STAGE_DESCRIPTORS,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
    },
  );
  if (stagedOutcome) {
    return stagedOutcome;
  }
  return attachAlgebraMetadata(
    errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    ),
    request.resolvedLatex,
    preparedRequest,
  );
}

export { runGuardedEquationSolve };
