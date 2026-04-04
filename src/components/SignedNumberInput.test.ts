import { describe, expect, it } from 'vitest';
import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../lib/signed-number';

describe('signed number input helpers', () => {
  it('parses direct positive and negative numbers', () => {
    expect(parseSignedNumberInput('12')).toBe(12);
    expect(parseSignedNumberInput('-12.5')).toBe(-12.5);
    expect(parseSignedNumberInput('+0.75')).toBe(0.75);
  });

  it('parses scientific notation for large and small values', () => {
    expect(parseSignedNumberInput('3e19')).toBe(3e19);
    expect(parseSignedNumberInput('3.4e19')).toBe(3.4e19);
    expect(parseSignedNumberInput('-5E-2')).toBe(-5e-2);
  });

  it('allows intermediate typing without committing invalid partial values', () => {
    expect(parseSignedNumberInput('-')).toBeNull();
    expect(parseSignedNumberInput('+')).toBeNull();
    expect(parseSignedNumberInput('-.')).toBeNull();
    expect(parseSignedNumberInput('')).toBeNull();
    expect(parseSignedNumberInput('3e')).toBeNull();
    expect(parseSignedNumberInput('3e+')).toBeNull();
  });

  it('normalizes negative zero on formatting and parsing', () => {
    expect(formatSignedNumberInput(-0)).toBe('0');
    expect(parseSignedNumberInput('-0')).toBe(0);
  });
});
