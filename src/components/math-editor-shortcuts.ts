import type { InlineShortcutDefinitions } from 'mathlive';

export function buildInlineShortcutOverrides(
  existing: InlineShortcutDefinitions | undefined,
): InlineShortcutDefinitions {
  return {
    ...(existing ?? {}),
    sin: '\\sin',
    cos: '\\cos',
    tan: '\\tan',
    int: '\\int #?\\,dx',
    asin: '\\arcsin',
    acos: '\\arccos',
    atan: '\\arctan',
    ln: '\\ln',
    log: '\\log',
    sqrt: '\\sqrt{#?}',
    abs: '\\left|#?\\right|',
    pi: '\\pi',
  };
}
