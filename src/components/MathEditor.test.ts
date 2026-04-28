import { describe, expect, it } from 'vitest';
import { buildInlineShortcutOverrides } from './math-editor-shortcuts';

describe('MathEditor inline shortcuts', () => {
  it('keeps the typed integral shortcut as an indefinite-integral template', () => {
    const shortcuts = buildInlineShortcutOverrides({ foo: 'bar' });

    expect(shortcuts.foo).toBe('bar');
    expect(shortcuts.int).toBe('\\int #?\\,dx');
  });

  it('keeps function shortcuts as lightweight commands', () => {
    const shortcuts = buildInlineShortcutOverrides(undefined);

    expect(shortcuts.sin).toBe('\\sin');
    expect(shortcuts.ln).toBe('\\ln');
    expect(shortcuts.sqrt).toBe('\\sqrt{#?}');
  });
});
