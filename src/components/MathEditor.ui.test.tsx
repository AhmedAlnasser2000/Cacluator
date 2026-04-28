import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MathEditor } from './MathEditor';

describe('MathEditor typing behavior', () => {
  it('reports raw typed latex without rewriting the field on every input stroke', () => {
    const handleChange = vi.fn();
    render(
      <MathEditor
        value=""
        onChange={handleChange}
        dataTestId="math-editor"
        modeId="calculate"
        screenHint="standard"
      />,
    );

    const field = screen.getByTestId('math-editor') as HTMLElement & {
      getValue: () => string;
      setValue: (value: string) => void;
    };

    field.setValue('sin(');
    fireEvent.input(field);

    expect(handleChange).toHaveBeenLastCalledWith('sin(');
    expect(field.getValue()).toBe('sin(');
  });
});
