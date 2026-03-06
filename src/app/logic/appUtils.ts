import type {
  AngleUnit,
  EquationScreen,
  GuideSoftAction,
  PolynomialEquationView,
} from '../../types/calculator';

export function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function cycleAngleUnit(angleUnit: AngleUnit): AngleUnit {
  return angleUnit === 'deg' ? 'rad' : angleUnit === 'rad' ? 'grad' : 'deg';
}

export function isAnyFormTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element?.closest('input, select, button, textarea, math-field');
}

export function isPlainFormTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element?.closest('input, select, button, textarea');
}

export function emptySystem(size: 2 | 3) {
  return Array.from({ length: size }, () => Array.from({ length: size + 1 }, () => 0));
}

export function polynomialTemplateLatex(view: PolynomialEquationView) {
  switch (view) {
    case 'quadratic':
      return 'ax^2+bx+c=0';
    case 'cubic':
      return 'ax^3+bx^2+cx+d=0';
    case 'quartic':
      return 'ax^4+bx^3+cx^2+dx+e=0';
  }
}

export function defaultEquationNumericSolvePanelState() {
  return {
    enabled: false,
    start: '-10',
    end: '10',
    subdivisions: 256,
  };
}

export function menuIndexForEquationScreen(screen: EquationScreen) {
  if (screen === 'symbolic') {
    return { menu: 'home' as const, index: 0 };
  }

  if (screen === 'polynomialMenu') {
    return { menu: 'home' as const, index: 1 };
  }

  if (screen === 'simultaneousMenu') {
    return { menu: 'home' as const, index: 2 };
  }

  if (screen === 'quadratic') {
    return { menu: 'polynomialMenu' as const, index: 0 };
  }

  if (screen === 'cubic') {
    return { menu: 'polynomialMenu' as const, index: 1 };
  }

  if (screen === 'quartic') {
    return { menu: 'polynomialMenu' as const, index: 2 };
  }

  if (screen === 'linear2') {
    return { menu: 'simultaneousMenu' as const, index: 0 };
  }

  if (screen === 'linear3') {
    return { menu: 'simultaneousMenu' as const, index: 1 };
  }

  return null;
}

export function guideSoftActionLabel(action: GuideSoftAction) {
  const labels: Record<GuideSoftAction, { label: string; hotkey: string }> = {
    open: { label: 'Open', hotkey: 'F1' },
    search: { label: 'Search', hotkey: 'F2' },
    symbols: { label: 'Symbols', hotkey: 'F3' },
    modes: { label: 'Modes', hotkey: 'F4' },
    copy: { label: 'Copy Expr', hotkey: 'F3' },
    load: { label: 'Load Example', hotkey: 'F1' },
    back: { label: 'Back', hotkey: 'F5' },
    exit: { label: 'Exit', hotkey: 'F6' },
  };

  return labels[action];
}
