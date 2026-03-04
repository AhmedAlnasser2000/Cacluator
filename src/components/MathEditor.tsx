import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type {
  InlineShortcutDefinitions,
  MathfieldElement,
  VirtualKeyboardLayout,
} from 'mathlive';
import { canonicalizeMathInput } from '../lib/input-canonicalization';
import type { ModeId } from '../types/calculator';

type MathEditorProps = {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: (field: MathfieldElement) => void;
  className?: string;
  readOnly?: boolean;
  placeholder?: string;
  keyboardLayouts?: readonly VirtualKeyboardLayout[];
  modeId?: ModeId;
  screenHint?: string;
};

function configureVirtualKeyboard(layouts: readonly VirtualKeyboardLayout[] | undefined) {
  if (typeof window === 'undefined' || !window.mathVirtualKeyboard || !layouts) {
    return;
  }

  window.mathVirtualKeyboard.layouts = layouts;
  window.mathVirtualKeyboard.editToolbar = 'default';
}

function buildInlineShortcutOverrides(
  existing: InlineShortcutDefinitions | undefined,
): InlineShortcutDefinitions {
  return {
    ...(existing ?? {}),
    sin: '\\sin',
    cos: '\\cos',
    tan: '\\tan',
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

export const MathEditor = forwardRef<MathfieldElement, MathEditorProps>(
  function MathEditor(
    {
      value,
      onChange,
      onFocus,
      className,
      readOnly = false,
      placeholder,
      keyboardLayouts,
      modeId,
      screenHint,
    },
    forwardedRef,
  ) {
    const elementRef = useRef<MathfieldElement | null>(null);

    useImperativeHandle(forwardedRef, () => elementRef.current as MathfieldElement, []);

    useEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      field.readOnly = readOnly;
      field.smartFence = true;
      field.inlineShortcuts = buildInlineShortcutOverrides(field.inlineShortcuts);
      field.placeholder = placeholder ?? '';
      field.mathVirtualKeyboardPolicy = 'auto';

      const handleInput = () => {
        const rawLatex = field.getValue('latex');
        const canonicalized = modeId
          ? canonicalizeMathInput(rawLatex, {
              mode: modeId,
              screenHint,
              liveAssist: true,
            })
          : {
              ok: true as const,
              canonicalLatex: rawLatex,
            };
        const nextLatex = canonicalized.ok ? canonicalized.canonicalLatex : rawLatex;
        if (nextLatex !== rawLatex) {
          field.setValue(nextLatex);
        }
        onChange(nextLatex);
      };

      const handleFocus = () => {
        configureVirtualKeyboard(keyboardLayouts);
        onFocus?.(field);
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);

      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
      };
    }, [keyboardLayouts, modeId, onChange, onFocus, placeholder, readOnly, screenHint]);

  useEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      if (field.getValue('latex') !== value) {
        field.setValue(value);
      }
    }, [value]);

    useEffect(() => {
      const field = elementRef.current;
      if (!field || document.activeElement !== field) {
        return;
      }

      configureVirtualKeyboard(keyboardLayouts);
    }, [keyboardLayouts]);

    return (
      <math-field
        className={className}
        ref={(node: MathfieldElement | null) => {
          elementRef.current = node;
        }}
      />
    );
  },
);
