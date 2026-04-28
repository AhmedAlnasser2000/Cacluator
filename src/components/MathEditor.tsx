import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type {
  MathfieldElement,
  VirtualKeyboardLayout,
} from 'mathlive';
import { canonicalizeMathInput } from '../lib/input-canonicalization';
import type { ModeId } from '../types/calculator';
import { buildInlineShortcutOverrides } from './math-editor-shortcuts';

type MathEditorProps = {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: (field: MathfieldElement) => void;
  className?: string;
  dataTestId?: string;
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

export const MathEditor = forwardRef<MathfieldElement, MathEditorProps>(
  function MathEditor(
    {
      value,
      onChange,
      onFocus,
      className,
      dataTestId,
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
        onChange(rawLatex);
      };

      const handleFocus = () => {
        configureVirtualKeyboard(keyboardLayouts);
        onFocus?.(field);
      };

      const handlePaste = (event: ClipboardEvent) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text || !modeId) {
          return;
        }

        const canonicalized = canonicalizeMathInput(text, {
          mode: modeId,
          screenHint,
          liveAssist: true,
        });
        const nextLatex = canonicalized.ok ? canonicalized.canonicalLatex : text;
        if (nextLatex === text) {
          return;
        }

        event.preventDefault();
        field.insert(nextLatex);
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);
      field.addEventListener('paste', handlePaste);

      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
        field.removeEventListener('paste', handlePaste);
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
        data-testid={dataTestId}
        ref={(node: MathfieldElement | null) => {
          elementRef.current = node;
        }}
      />
    );
  },
);
