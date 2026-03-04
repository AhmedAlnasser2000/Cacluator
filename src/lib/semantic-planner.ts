import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  differentiateLatex,
  simplifyNode,
} from './symbolic-engine/differentiation';
import {
  boxLatex,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from './symbolic-engine/patterns';
import { normalizeNode } from './symbolic-engine/normalize';
import { parsePartialDerivativeLatex, resolvePartialDerivative } from './symbolic-engine/partials';
import { canonicalizeMathInput } from './input-canonicalization';
import type {
  PlannerContext,
  PlannerOutcome,
  PlannerStep,
} from '../types/calculator';

const ce = new ComputeEngine();
const DERIVATIVE_PREFIXES = [
  '\\frac{d}{dx}',
  '\\frac{d}{dy}',
  '\\frac{d}{dz}',
];
const PARTIAL_PREFIXES = [
  '\\frac{\\partial}{\\partial x}',
  '\\frac{\\partial}{\\partial y}',
  '\\frac{\\partial}{\\partial z}',
];

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]);
}

function stripOuterGrouping(source: string) {
  const trimmed = source.trim();
  if (
    (trimmed.startsWith('(') && trimmed.endsWith(')'))
    || (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  if (trimmed.startsWith('\\left(') && trimmed.endsWith('\\right)')) {
    return trimmed.slice('\\left('.length, -'\\right)'.length).trim();
  }

  return trimmed;
}

function matchingCloseFor(open: string) {
  if (open === '(') {
    return ')';
  }
  if (open === '{') {
    return '}';
  }
  if (open === '[') {
    return ']';
  }
  return '';
}

function collectCommand(source: string, start: number) {
  let index = start + 1;
  while (index < source.length && /[A-Za-z]/.test(source[index])) {
    index += 1;
  }
  return {
    value: source.slice(start, index),
    nextIndex: index,
  };
}

function collectBalancedSegment(source: string, start: number) {
  const open = source[start];
  const close = matchingCloseFor(open);
  if (!close) {
    return null;
  }

  let depth = 0;
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      if (command.value === '\\left' || command.value === '\\right') {
        index = command.nextIndex;
        continue;
      }
      index = command.nextIndex;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          body: source.slice(start + 1, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return null;
}

function collectDerivativeBody(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  if (index >= source.length) {
    return null;
  }

  if (source.startsWith('\\left(', index)) {
    const balanced = collectBalancedSegment(source, index + '\\left'.length);
    if (!balanced) {
      return null;
    }
    return {
      body: stripOuterGrouping(
        source
          .slice(index, balanced.nextIndex)
          .replaceAll('\\left', '')
          .replaceAll('\\right', ''),
      ),
      nextIndex: balanced.nextIndex,
    };
  }

  if (source[index] === '(' || source[index] === '{' || source[index] === '[') {
    const balanced = collectBalancedSegment(source, index);
    if (!balanced) {
      return null;
    }
    return {
      body: stripOuterGrouping(source.slice(index, balanced.nextIndex)),
      nextIndex: balanced.nextIndex,
    };
  }

  let depth = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      index = command.nextIndex;
      continue;
    }
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (depth === 0 && (char === '+' || char === ',' || char === '=')) {
      break;
    }

    if (depth === 0 && char === '-' && index > start) {
      break;
    }

    index += 1;
  }

  const body = source.slice(start, index).trim();
  return body
    ? {
        body,
        nextIndex: index,
      }
    : null;
}

function replaceDifferentialSegments(source: string, steps: PlannerStep[]) {
  let current = source;
  let changed = true;

  while (changed) {
    changed = false;
    let rebuilt = '';
    let index = 0;

    while (index < current.length) {
      const derivativePrefix = DERIVATIVE_PREFIXES.find((prefix) => current.startsWith(prefix, index));
      const partialPrefix = PARTIAL_PREFIXES.find((prefix) => current.startsWith(prefix, index));
      if (!derivativePrefix && !partialPrefix) {
        rebuilt += current[index];
        index += 1;
        continue;
      }

      const prefix = derivativePrefix ?? partialPrefix!;
      const variable = prefix[prefix.length - 2];
      const body = collectDerivativeBody(current, index + prefix.length);
      if (!body) {
        return {
          ok: false as const,
          error: `This ${derivativePrefix ? 'derivative' : 'partial derivative'} could not be reduced safely before execution.`,
        };
      }

      const before = current.slice(index, body.nextIndex);
      try {
        const after = derivativePrefix
          ? differentiateLatex(body.body, variable)
          : (() => {
              const partialRequest = parsePartialDerivativeLatex(`${prefix}${body.body}`);
              if (!partialRequest) {
                throw new Error('unsupported-partial');
              }
              const resolved = resolvePartialDerivative(partialRequest);
              if (resolved.kind === 'error') {
                throw new Error(resolved.error);
              }
              return resolved.exactLatex;
            })();

        steps.push({
          kind: derivativePrefix ? 'reduce-derivative' : 'reduce-partial',
          before,
          after,
        });
        rebuilt += after;
        index = body.nextIndex;
        changed = true;
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error && error.message
            ? error.message
            : `This ${derivativePrefix ? 'derivative' : 'partial derivative'} is outside the supported symbolic rules.`,
        };
      }
    }

    current = rebuilt;
  }

  return {
    ok: true as const,
    latex: current,
  };
}

function compactRepeatedFactors(node: unknown, steps: PlannerStep[]): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const rewrittenChildren = children.map((child) => compactRepeatedFactors(child, steps));

  if (head !== 'Multiply') {
    return [head, ...rewrittenChildren];
  }

  const flatChildren = rewrittenChildren.flatMap((child) => flattenMultiply(child));
  const groups = new Map<string, { node: unknown; count: number }>();
  const order: string[] = [];

  for (const child of flatChildren) {
    if (typeof child === 'number') {
      const numericKey = `number:${child}`;
      const current = groups.get(numericKey);
      if (current) {
        current.count += 1;
      } else {
        groups.set(numericKey, { node: child, count: 1 });
        order.push(numericKey);
      }
      continue;
    }

    const key = termKey(normalizeNode(child).ast);
    const current = groups.get(key);
    if (current) {
      current.count += 1;
    } else {
      groups.set(key, { node: child, count: 1 });
      order.push(key);
    }
  }

  const compacted = order.map((key) => {
    const entry = groups.get(key)!;
    if (entry.count > 1 && typeof entry.node !== 'number') {
      const before = flatChildren
        .filter((child) => termKey(normalizeNode(child).ast) === key)
        .map((child) => boxLatex(child))
        .join('\\cdot ');
      const after = boxLatex(['Power', entry.node, entry.count]);
      steps.push({
        kind: 'compact-identical-product',
        before,
        after,
      });
      return ['Power', entry.node, entry.count];
    }
    return entry.node;
  });

  if (compacted.length === 0) {
    return 1;
  }
  if (compacted.length === 1) {
    return compacted[0];
  }
  return ['Multiply', ...compacted];
}

function reduceNumericOperators(node: unknown, steps: PlannerStep[]): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const rewrittenChildren = children.map((child) => reduceNumericOperators(child, steps));

  if (
    (head === 'Add' || head === 'Multiply' || head === 'Divide' || head === 'Power' || head === 'Negate')
    && rewrittenChildren.every((child) => isFiniteNumber(child))
  ) {
    const beforeNode = [head, ...rewrittenChildren];
    const evaluated = box(beforeNode).evaluate().json;
    if (isFiniteNumber(evaluated)) {
      steps.push({
        kind: 'reduce-numeric-operator',
        before: boxLatex(beforeNode),
        after: boxLatex(evaluated),
      });
      return evaluated;
    }
  }

  return [head, ...rewrittenChildren];
}

function splitTopLevelEquation(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      index = command.nextIndex - 1;
      continue;
    }
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
      continue;
    }
    if (char === '=' && depth === 0) {
      return {
        left: source.slice(0, index).trim(),
        right: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

function reduceEquationSide(latex: string, steps: PlannerStep[]) {
  const derivativeReduced = replaceDifferentialSegments(latex, steps);
  if (!derivativeReduced.ok) {
    return derivativeReduced;
  }

  const parsed = ce.parse(derivativeReduced.latex);
  if (JSON.stringify(parsed.json).includes('"Integrate"')) {
    return {
      ok: false as const,
      error: 'This equation contains an indefinite integral that is not safe to reduce automatically before solve.',
    };
  }

  const compacted = compactRepeatedFactors(parsed.json, steps);
  const numericReduced = reduceNumericOperators(compacted, steps);
  const simplified = simplifyNode(numericReduced);
  return {
    ok: true as const,
    node: simplified,
  };
}

function attachCanonicalizationSteps(canonicalLatex: string, steps: PlannerStep[], originalLatex: string) {
  if (canonicalLatex !== originalLatex) {
    steps.unshift({
      kind: 'canonicalize-token',
      before: originalLatex,
      after: canonicalLatex,
    });
  }
}

function plannerBadgesFromSteps(
  originalLatex: string,
  canonicalLatex: string,
  steps: PlannerStep[],
) {
  return [
    ...(canonicalLatex !== originalLatex.trim() ? ['Canonicalized' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-derivative') ? ['Reduced Derivative' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-partial') ? ['Reduced Partial' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-numeric-operator') ? ['Reduced Numeric Operator' as const] : []),
    ...(steps.some((step) => step.kind === 'compact-identical-product') ? ['Compacted Repeated Factors' as const] : []),
  ];
}

export function planMathExecution(
  latex: string,
  context: PlannerContext,
): PlannerOutcome {
  const canonicalized = canonicalizeMathInput(latex, {
    mode: context.mode,
    screenHint: context.screenHint,
  });

  if (!canonicalized.ok) {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: latex,
      badges: ['Hard Stop'],
      steps: [{
        kind: 'unsupported-node',
        nodeKind: 'canonicalization',
        message: canonicalized.error,
      }],
      error: canonicalized.error,
    };
  }

  const steps: PlannerStep[] = [];
  attachCanonicalizationSteps(canonicalized.canonicalLatex, steps, canonicalized.originalLatex.trim());

  if (context.intent === 'equation-solve') {
    const split = splitTopLevelEquation(canonicalized.canonicalLatex);
    if (!split) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'relation',
            message: 'Enter an equation containing x.',
          },
        ],
        error: 'Enter an equation containing x.',
      };
    }

    if (!split.left || !split.right) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'relation',
            message: 'Enter an equation containing x.',
          },
        ],
        error: 'Enter an equation containing x.',
      };
    }

    const left = reduceEquationSide(split.left, steps);
    if (!left.ok) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'left-side',
            message: left.error,
          },
        ],
        error: left.error,
      };
    }

    const right = reduceEquationSide(split.right, steps);
    if (!right.ok) {
      return {
        kind: 'blocked',
        originalLatex: latex,
        canonicalLatex: canonicalized.canonicalLatex,
        badges: ['Hard Stop'],
        steps: [
          ...steps,
          {
            kind: 'unsupported-node',
            nodeKind: 'right-side',
            message: right.error,
          },
        ],
        error: right.error,
      };
    }

    const resolvedLatex = box(['Equal', left.node, right.node]).latex;
    if (resolvedLatex !== canonicalized.canonicalLatex) {
      steps.push({
        kind: 'normalize-equation',
        before: canonicalized.canonicalLatex,
        after: resolvedLatex,
      });
    }

    return {
      kind: 'ready',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      resolvedLatex,
      badges: plannerBadgesFromSteps(latex, canonicalized.canonicalLatex, steps),
      steps,
    };
  }

  const derivativeReduced = replaceDifferentialSegments(canonicalized.canonicalLatex, steps);
  if (!derivativeReduced.ok) {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      badges: ['Hard Stop'],
      steps: [
        ...steps,
        {
          kind: 'unsupported-node',
          nodeKind: 'differential',
          message: derivativeReduced.error,
        },
      ],
      error: derivativeReduced.error,
    };
  }

  try {
    const parsed = ce.parse(derivativeReduced.latex);
    const compacted = compactRepeatedFactors(parsed.json, steps);
    const numericReduced = reduceNumericOperators(compacted, steps);
    const resolvedLatex = box(simplifyNode(numericReduced)).latex;

    return {
      kind: 'ready',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      resolvedLatex,
      badges: plannerBadgesFromSteps(latex, canonicalized.canonicalLatex, steps),
      steps,
    };
  } catch {
    return {
      kind: 'blocked',
      originalLatex: latex,
      canonicalLatex: canonicalized.canonicalLatex,
      badges: ['Hard Stop'],
      steps: [
        ...steps,
        {
          kind: 'unsupported-node',
          nodeKind: 'parse',
          message: 'Expression could not be parsed or evaluated.',
        },
      ],
      error: 'Expression could not be parsed or evaluated.',
    };
  }
}
