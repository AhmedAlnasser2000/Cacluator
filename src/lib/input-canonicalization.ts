import type {
  CanonicalizationChange,
  CanonicalizationContext,
  CanonicalizationResult,
} from '../types/calculator';

const FUNCTION_COMMANDS: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  ln: '\\ln',
  log: '\\log',
  abs: '\\operatorname{abs}',
};

const RESERVED_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'ln',
  'log',
  'sqrt',
  'abs',
]);

const DERIVATIVE_PATTERN = /(^|[^\\A-Za-z])d\s*\/\s*d([xyz])\b/g;
const DISPLAY_DERIVATIVE_PATTERN = /\\frac\{\\mathrm\{d\}\}\{\\mathrm\{d\}([xyz])\}/g;

function isIdentifierStart(char: string) {
  return /[A-Za-z]/.test(char);
}

function isIdentifierChar(char: string) {
  return /[A-Za-z]/.test(char);
}

function isBoundaryChar(char: string | undefined) {
  return char === undefined || /[\s,+\-*/^=()[\]{}]/.test(char);
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
          fullText: source.slice(start, index + 1),
          body: source.slice(start + 1, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return null;
}

function collectSimpleArgument(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  if (index >= source.length) {
    return null;
  }

  if (source[index] === '\\') {
    const command = collectCommand(source, index);
    if (
      command.value === '\\pi'
      || command.value === '\\infty'
      || RESERVED_FUNCTIONS.has(command.value.slice(1))
      || command.value.startsWith('\\operatorname')
    ) {
      index = command.nextIndex;
      if (source[index] === '{' || source[index] === '(' || source[index] === '[') {
        const balanced = collectBalancedSegment(source, index);
        if (balanced) {
          return {
            value: source.slice(start, balanced.nextIndex),
            body: source.slice(start, balanced.nextIndex).trim(),
            nextIndex: balanced.nextIndex,
          };
        }
      }
      return {
        value: source.slice(start, index),
        body: source.slice(start, index).trim(),
        nextIndex: index,
      };
    }
  }

  if (source[index] === '(' || source[index] === '{' || source[index] === '[') {
    const balanced = collectBalancedSegment(source, index);
    if (!balanced) {
      return null;
    }
    return {
      value: source.slice(start, balanced.nextIndex),
      body: source.slice(start, balanced.nextIndex).trim(),
      nextIndex: balanced.nextIndex,
    };
  }

  while (index < source.length && !isBoundaryChar(source[index])) {
    index += 1;
  }

  if (index === start) {
    return null;
  }

  return {
    value: source.slice(start, index),
    body: source.slice(start, index).trim(),
    nextIndex: index,
  };
}

function normalizeDerivativeDisplay(source: string) {
  return source.replace(DISPLAY_DERIVATIVE_PATTERN, (_match, variable: string) => `\\frac{d}{d${variable}}`);
}

function normalizeDerivativeTokens(source: string, changes: CanonicalizationChange[]) {
  return source.replace(DERIVATIVE_PATTERN, (match, prefix: string, variable: string) => {
    const after = `${prefix}\\frac{d}{d${variable}}`;
    changes.push({
      kind: 'derivative-token',
      before: match,
      after,
    });
    return after;
  });
}

function canonicalCommandFor(name: string) {
  return FUNCTION_COMMANDS[name] ?? '';
}

function canonicalizeSegment(
  source: string,
  changes: CanonicalizationChange[],
): string {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '\\') {
      const command = collectCommand(source, index);
      result += command.value;
      index = command.nextIndex;
      continue;
    }

    if (!isIdentifierStart(char)) {
      result += char;
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < source.length && isIdentifierChar(source[nextIndex])) {
      nextIndex += 1;
    }
    const token = source.slice(index, nextIndex);
    const tokenLower = token.toLowerCase();
    const previous = index > 0 ? source[index - 1] : undefined;
    const next = source[nextIndex];

    if (tokenLower === 'pi' && isBoundaryChar(previous) && isBoundaryChar(next)) {
      changes.push({
        kind: 'constant-token',
        before: token,
        after: '\\pi',
      });
      result += '\\pi';
      index = nextIndex;
      continue;
    }

    if (!RESERVED_FUNCTIONS.has(tokenLower) || !isBoundaryChar(previous)) {
      result += token;
      index = nextIndex;
      continue;
    }

    let scanIndex = nextIndex;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    const nextChar = source[scanIndex];
    if (nextChar === '(') {
      const balanced = collectBalancedSegment(source, scanIndex);
      if (!balanced) {
        const canonical =
          tokenLower === 'sqrt'
            ? '\\sqrt('
            : tokenLower === 'abs'
              ? `${canonicalCommandFor(tokenLower)}(`
              : `${canonicalCommandFor(tokenLower)}(`;

        changes.push({
          kind: 'function-token',
          before: source.slice(index, scanIndex + 1),
          after: canonical,
        });

        result += canonical;
        index = scanIndex + 1;
        continue;
      }

      const canonicalBody = canonicalizeSegment(balanced.body, changes);
      const canonical =
        tokenLower === 'sqrt'
          ? `\\sqrt{${canonicalBody}}`
          : tokenLower === 'abs'
            ? `${canonicalCommandFor(tokenLower)}(${canonicalBody})`
            : `${canonicalCommandFor(tokenLower)}(${canonicalBody})`;

      changes.push({
        kind: 'function-token',
        before: source.slice(index, balanced.nextIndex),
        after: canonical,
      });

      result += canonical;
      index = balanced.nextIndex;
      continue;
    }

    if (scanIndex > nextIndex) {
      const simpleArgument = collectSimpleArgument(source, nextIndex);
      if (simpleArgument) {
        const canonicalArg = canonicalizeSegment(simpleArgument.body, changes);
        const canonical =
          tokenLower === 'sqrt'
            ? `\\sqrt{${canonicalArg}}`
            : tokenLower === 'abs'
              ? `${canonicalCommandFor(tokenLower)}(${canonicalArg})`
              : `${canonicalCommandFor(tokenLower)}(${canonicalArg})`;

        changes.push({
          kind: 'function-token',
          before: source.slice(index, simpleArgument.nextIndex),
          after: canonical,
        });

        result += canonical;
        index = simpleArgument.nextIndex;
        continue;
      }
    }

    result += token;
    index = nextIndex;
  }

  return result;
}

export function canonicalizeMathInput(
  latex: string,
  context: CanonicalizationContext,
): CanonicalizationResult {
  void context;
  const originalLatex = latex;
  const trimmed = latex.trim();
  if (!trimmed) {
    return {
      ok: true,
      originalLatex,
      canonicalLatex: trimmed,
      changes: [],
    };
  }

  const changes: CanonicalizationChange[] = [];
  const derivativeDisplayNormalized = normalizeDerivativeDisplay(trimmed);
  const derivativeNormalized = normalizeDerivativeTokens(derivativeDisplayNormalized, changes);
  const canonicalLatex = canonicalizeSegment(derivativeNormalized, changes);

  return {
    ok: true,
    originalLatex,
    canonicalLatex,
    changes,
  };
}
