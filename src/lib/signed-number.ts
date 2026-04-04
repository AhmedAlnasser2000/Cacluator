export function formatSignedNumberInput(value: number) {
  return Object.is(value, -0) ? '0' : `${value}`;
}

export function parseSignedNumberInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^[+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Object.is(parsed, -0) ? 0 : parsed;
}
