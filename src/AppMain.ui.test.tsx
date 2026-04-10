import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expectMathStaticLatex,
  openLauncherApp,
  openEquationSymbolic,
  openGeometrySlope,
  openTable,
  openStatisticsRegression,
  openTrigEquationSolve,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  fireEvent(window, new Event('resize'));
}

describe('AppMain UI automation flows', () => {
  beforeEach(() => {
    setViewportWidth(1366);
    vi.clearAllMocks();
  });

  it('opens the settings panel from the top bar and toggles it with Ctrl+,', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));

    const shell = screen.getByTestId('calculator-shell');
    const settingsPanel = await screen.findByTestId('settings-panel');
    expect(settingsPanel).toHaveAttribute('data-settings-presentation', 'outboard');
    expect(screen.getByTestId('side-surface-host')).toHaveAttribute(
      'data-side-surface-presentation',
      'outboard',
    );
    expect(shell.contains(settingsPanel)).toBe(false);

    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId('settings-panel')).toBeInTheDocument());
  });

  it('renders the settings surface as an overlay on narrow layouts', async () => {
    setViewportWidth(1024);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));

    expect(await screen.findByTestId('settings-panel')).toHaveAttribute(
      'data-settings-presentation',
      'overlay',
    );
    expect(screen.getByTestId('side-surface-overlay-backdrop')).toBeInTheDocument();
  });

  it('keeps settings and history mutually exclusive', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    await user.click(screen.getByTestId('history-toggle'));
    const shell = screen.getByTestId('calculator-shell');
    const historyPanel = await screen.findByTestId('history-panel');
    expect(historyPanel).toHaveAttribute('data-history-presentation', 'outboard');
    expect(shell.contains(historyPanel)).toBe(false);
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    expect(screen.queryByTestId('history-panel')).not.toBeInTheDocument();
  });

  it('applies display settings live and keeps quick toggles in sync', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    await user.click(screen.getByTestId('settings-ui-scale-130'));
    await user.click(screen.getByTestId('settings-math-scale-115'));
    await user.click(screen.getByTestId('settings-result-scale-145'));
    await user.click(screen.getByTestId('settings-high-contrast'));
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-output-style-exact'));
    await user.click(screen.getByTestId('settings-auto-switch-equation'));

    const shell = screen.getByTestId('calculator-shell') as HTMLElement;
    expect(shell.style.getPropertyValue('--ui-scale')).toBe('1.3');
    expect(shell.style.getPropertyValue('--math-scale')).toBe('1.15');
    expect(shell.style.getPropertyValue('--result-scale')).toBe('1.45');
    expect(shell.className).toContain('is-high-contrast');
    expect(screen.getByTestId('quick-setting-angle-unit')).toHaveTextContent('RAD');
    expect(screen.getByTestId('quick-setting-output-style')).toHaveTextContent('EXACT');
    expect(screen.getByTestId('quick-setting-auto-equation')).toHaveTextContent('Auto Eq On');
  });

  it('re-evaluates direct trig numeric input according to the selected angle unit', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sin\\left(\\frac{\\pi}{2}\\right)');
    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('1');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.0274121');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.0246715');
  });

  it('re-evaluates plain numeric direct trig input according to the selected angle unit', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sin\\left(90\\right)');
    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('1');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.893997');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.987688');
  });

  it('respects the selected angle unit when running Equation numeric interval solve', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x\\right)=\\frac{1}{2}');
    await user.click(screen.getByRole('button', { name: 'Numeric Solve' }));

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '20');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '40');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '256');
    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('x ≈ 30');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.clear(startInput);
    await user.type(startInput, '0');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '1');
    fireEvent.blur(endInput);
    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('x ≈ 0.523599');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.clear(startInput);
    await user.type(startInput, '30');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '40');
    fireEvent.blur(endInput);
    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('x ≈ 33.3333');
  }, 10000);

  it('lets Equation numeric interval solve continue past unresolved composition guidance when a valid interval is provided', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByRole('button', { name: 'Numeric Solve' }));

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '1');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '2');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');
    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('x ≈ 1.19328');
    expect(screen.getAllByText(/Bracket-first bisection \+ local-minimum recovery/i).length).toBeGreaterThan(0);
  });

  it('shows unit-aware branch guidance when Equation numeric interval solve misses a trig-composition branch', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByRole('button', { name: 'Numeric Solve' }));

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '0');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '10');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');
    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent('ln(x+1) stays about in');
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent('45 deg + 180 deg * k');
  }, 10000);

  it('accepts scientific notation in Equation numeric interval inputs', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByRole('button', { name: 'Numeric Solve' }));

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '3e19');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '4e19');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');

    await user.click(screen.getByRole('button', { name: 'Run Numeric Solve' }));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(
      screen.getByText(
        /Numeric solve on \[30000000000000000000, 40000000000000000000\] with 512 subdivisions/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('3493427');
  }, 10000);

  it('updates the symbolic-display preview live from settings controls', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    expectMathStaticLatex(screen.getByTestId('settings-symbolic-preview-result'), 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));
    expectMathStaticLatex(screen.getByTestId('settings-symbolic-preview-result'), 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('settings-symbolic-mode-roots'));
    await user.click(screen.getByTestId('settings-flatten-nested-roots'));
    expectMathStaticLatex(
      screen.getByTestId('settings-symbolic-preview-result'),
      '\\sqrt[3]{\\sqrt{x}}',
    );
  });

  it('applies numeric-output settings live to preview and approximate equation output', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    const digitsInput = screen.getByTestId('settings-approx-digits-input');
    await user.clear(digitsInput);
    await user.type(digitsInput, '3');
    fireEvent.blur(digitsInput);
    await user.click(screen.getByTestId('settings-notation-mode-scientific'));
    await user.click(screen.getByTestId('settings-scientific-style-e'));

    expect(screen.getByTestId('settings-numeric-preview-result')).toHaveTextContent('1.235e6');
    await user.click(screen.getByTestId('settings-toggle'));

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\log(x^2+9x-5)=\\log(8x+\\ln 4)');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.queryByTestId('display-outcome-exact')).not.toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('x ≈ 2.076');
    expect(screen.getByTestId('display-outcome-supplement-0')).toHaveTextContent('ln(4)>0');
  });

  it('applies symbolic-display settings live to rendered exact results while keeping canonical raw exact latex for copy/editor flows', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));

    setMathFieldLatex('main-editor', '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenCalledWith('x^(1/6)');

    await user.click(screen.getByTestId('display-outcome-action-to-editor'));
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^{\\frac{1}{6}}');
  });

  it('switches read-only math notation live while keeping editor loads on canonical latex', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));
    await user.click(screen.getByTestId('settings-math-notation-plainText'));

    setMathFieldLatex('main-editor', '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x^(1/6)');
    expect(screen.getByTestId('display-outcome-exact').firstElementChild).toHaveAttribute(
      'data-notation-mode',
      'plainText',
    );

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('x^(1/6)');

    await user.click(screen.getByTestId('settings-math-notation-latex'));

    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x^{\\frac{1}{6}}');
    expect(screen.getByTestId('display-outcome-exact').firstElementChild).toHaveAttribute(
      'data-notation-mode',
      'latex',
    );

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('x^{\\frac{1}{6}}');

    await user.click(screen.getByTestId('display-outcome-action-to-editor'));
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^{\\frac{1}{6}}');
  });

  it('keeps plain familiar roots as roots in auto mode', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-auto'));

    setMathFieldLatex('main-editor', '\\sqrt{x}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\sqrt{x}');
  });

  it('renders Calculate exact results and exclusion supplements', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{3}+\\frac{1}{6x}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{2x+1}{6x}');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
    expect(screen.queryByTestId('display-outcome-approx')).not.toBeInTheDocument();
  });

  it('renders square-power denominators as x^2 instead of repeated x factors', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{6x^2}+4');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{24x^2+1}{6x^{2}}');
    expect(screen.queryByTestId('display-outcome-approx')).not.toBeInTheDocument();
  });

  it('evaluates broadened numeric power/root/log cases in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\left(-8\\right)^{\\frac{2}{3}}+\\log_{4}\\left(16\\right)');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '6');
  });

  it('shows controlled real-domain errors for invalid numeric power/root/log cases', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt{-4}');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByText(/non-negative radicands/i)).toBeInTheDocument();
  });

  it('does not show raw NaN when simplify hits an invalid numeric logarithm', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\log\\left(-8\\right)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByText(/positive arguments/i)).toBeInTheDocument();
    expect(screen.queryByText(/^NaN$/)).not.toBeInTheDocument();
  });

  it('shows the Calculate algebra tray and runs explicit transforms', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{x^2-1}{x^2-x}');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-cancelFactors'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText(/Canceled supported common factors/i)).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{x+1}{x}');
    expect(screen.getByTestId('algebra-transform-cancelFactors')).toBeInTheDocument();
  });

  it('canonicalizes bounded same-base log sums under simplify with visible condition lines', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\ln(x)+\\ln(x+1)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\ln\\left(x\\left(x+1\\right)\\right)',
    );
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x>0/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\+1>0/);
  });

  it('compacts repeated factors when simplify combines same-base log arguments', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\ln(4x)+\\ln(x^3)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\ln\\left(4x^{4}\\right)',
    );
  });

  it('shows the new PRL3 Rewrite as Power transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt[3]{\\sqrt{x}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-rewriteAsPower'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ge0/);
    expect(screen.getByTestId('algebra-transform-rewriteAsPower')).toBeInTheDocument();
  });

  it('shows the new PRL3 Rewrite as Root transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-rewriteAsRoot'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');
    expect(
      screen.getByTestId('display-outcome-exact').querySelector('[data-raw-latex="\\\\sqrt[6]{x}"]'),
    ).not.toBeNull();
    expect(screen.getByTestId('algebra-transform-rewriteAsRoot')).toBeInTheDocument();
  });

  it('shows the new PRL3 change-base transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\log_{4}(x)');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-changeBase'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}',
    );
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x>0/);
    expect(screen.getByTestId('algebra-transform-changeBase')).toBeInTheDocument();
  });

  it('shows widened bounded conjugate transforms in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{2+\\sqrt{x}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-conjugate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(
      screen
        .getByTestId('display-outcome-exact')
        .querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex'),
    ).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    const affineSupplements = Array.from(
      document.querySelectorAll('[data-testid^="display-outcome-supplement-"] [data-raw-latex]'),
    )
      .map((node) => node.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(affineSupplements).toContain('\\sqrt{x}+2\\ne0');
    expect(affineSupplements).toContain('x\\ge0');
  });

  it('shows selected three-term rationalize transforms in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-rationalize'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(
      screen
        .getByTestId('display-outcome-exact')
        .querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex'),
    ).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
    expect(screen.getByTestId('algebra-transform-rationalize')).toBeInTheDocument();
  });

  it('renders transform summary math separately from plain text', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{3}+\\frac{1}{6x^2}');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-combineFractions'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Combined fractions over LCD')).toBeInTheDocument();
    expect(screen.getByLabelText('6x^{2}')).toBeInTheDocument();
  });

  it('renders Equation conditions and suppresses send action on solved cases', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.queryByTestId('display-outcome-action-send-equation')).not.toBeInTheDocument();
    const supplementLatex = Array.from(
      document.querySelectorAll('[data-testid^="display-outcome-supplement-"] [data-raw-latex]'),
    )
      .map((node) => node.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(supplementLatex).toContain('x\\ge0');
    expect(supplementLatex).toContain('x\\ne0');
  });

  it('shows the Equation algebra tray and keeps transforms separate from solve', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{x}+\\frac{1}{x+1}=1');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-useLCD'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText(/Cleared the equation/i)).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /=0/);
    expect(screen.getByTestId('algebra-transform-useLCD')).toBeInTheDocument();
  });

  it('preprocesses fractional-power notation into existing Equation solve families without broadening solve scope', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{1}{2}}=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=9');
  });

  it('solves PRL4 same-base equality families with visible provenance and conditions', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /2x-3>0/);
    expect(screen.getByText('Same-Base Equality')).toBeInTheDocument();
  });

  it('uses preserved-domain wording when a same-base log equality reduces to an invalid real candidate', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln(4x+2)=\\ln(5x+6)');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/undefined in the real domain/i);
  });

  it('solves PRL4 bounded mixed-base log families exactly in Equation mode', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expect(screen.getByText('Log Base Normalize')).toBeInTheDocument();
  });

  it('solves PRL4 bounded rational-power families with power-lift provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{3}{2}}=8');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
  });

  it('solves COMP1 non-periodic outer inversions through the guarded Equation backend', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(x^2+1\\right)=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt/);
  });

  it('solves COMP2 two-step non-periodic chains with nested-recursion provenance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{\\log_{3}\\left((x+1)^2\\right)}=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByText('Candidate Checked')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/8/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/10/);
  });

  it('hands COMP2 inversions into the bounded trig solver when the downstream branch set is finite', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(\\sin\\left(x\\right)\\right)=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=2\\pi k+\\frac{\\pi}{2}');
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/k = 0/);
  });

  it('hands COMP2 inversions into bounded PRL/algebra families without fabricating exact output', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{\\left(x+1\\right)^{\\frac{2}{3}}}=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Root Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/26/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/28/);
  });

  it('proves impossible COMP1 trig compositions from the bounded inner image', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(x\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByText('Range Guard')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/inner image/i);
  });

  it('renders finite COMP3 trig composition branches as symbolic periodic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/arccos/);
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
  });

  it('renders COMP4 nonlinear-in-k families as symbolic periodic branches with parameter constraints', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^2\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-periodic-family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
    expect(screen.getByText(/Parameter constraints/i)).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
  });

  it(
    'renders COMP10 quadratic periodic carriers as symbolic parameterized branches',
    async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^2+x\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
      expect(screen.getByText(/Parameter constraints/i)).toBeInTheDocument();
      expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
    },
    15000,
  );

  it('returns reduced-carrier exact periodic families for broader mixed polynomial carriers after COMP11', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^3+x\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /x\^3\+x/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-periodic-family'), /x\^3\+x/);
  });

  it('renders COMP3 tan-log composition families symbolically with interval guidance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/exp/);
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/1\.19328/);
  });

  it('formats periodic composition families in degree mode with unit-native numeric branches', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(\\sin\\left(x\\right)\\right)=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k\+90/);
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/x=90/);
  });

  it('solves COMP4 bounded outer inverse-trig handoff through one supported follow-on step', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\ln\\left(x+1\\right)\\right)=45');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/e/);
  });

  it('renders COMP5 deeper periodic reductions through inverse-trig carriers as symbolic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/π/);
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/k = 0/);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toBeInTheDocument();
  });

  it('renders COMP5 inverse-trig follow-on in degree mode with unit-aware periodic branches', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k\+60/);
  });

  it('keeps COMP7 deep nested periodic carriers on structured multi-parameter guidance when exact closure would overreach', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/second independent periodic parameter/i);
    expect(screen.getByTestId('display-outcome-periodic-family')).toHaveTextContent(/tan\(x\)/i);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toHaveTextContent(/cos/i);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toHaveTextContent(/tan/i);
  });

  it('renders COMP6 reciprocal trig rewrites as symbolic periodic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\csc\\left(2x+30\\right)=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Reciprocal Rewrite')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/180k/);
    expect(screen.getByTestId('display-outcome-periodic-structured-stop')).toHaveTextContent(/Reduced carrier/i);
  });

  it('renders COMP6 reciprocal trig range failures with rewrite provenance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sec\\left(\\sin\\left(x\\right)\\right)=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByText('Range Guard')).toBeInTheDocument();
    expect(screen.getByText('Reciprocal Rewrite')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/inner image/i);
  });

  it('renders COMP6 principal-range reductions with principal-range and piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\tan\\left(\\cos\\left(x\\right)\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-principal-range')).toHaveTextContent(/90/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arctan/);
  });

  it('renders COMP8 affine sawtooth closures with exact families and piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(2x+10\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
    expect(screen.getByTestId('display-outcome-periodic-principal-range')).toHaveTextContent(/90/);
  });

  it('renders COMP9 mixed-carrier sawtooth closures beyond affine carriers', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
  });

  it('renders COMP10 quadratic sawtooth carriers as exact families with piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^2+x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
    expect(screen.getByText(/Parameter constraints/i)).toBeInTheDocument();
  });

  it('renders COMP10 shifted-power sawtooth carriers exactly', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\tan\\left((2x+1)^2+3\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/180k\+27/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arctan/);
  });

  it('returns reduced-carrier exact sawtooth families for broader polynomial carriers after COMP11', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^3+x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /x\^3\+x/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
  });

  it('returns reduced-carrier exact periodic families for shifted radical carriers after COMP12A', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\sqrt{x+1}-2\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt\{x\+1\}-2/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-periodic-family'), /\\sqrt\{x\+1\}-2/);
  });

  it('returns reduced-carrier exact sawtooth families for abs-backed carriers after COMP12A', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(\\left|x-1\\right|\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\vert x-1\\vert/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
  });

  it('shows the new PRL3 Equation transforms without auto-solving the rewritten equation', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{1}{2}}=3');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(screen.getByTestId('algebra-transform-rewriteAsRoot'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\sqrt{x}=3');
    expect(screen.queryByText(/^x=9$/)).not.toBeInTheDocument();
    expect(screen.getByTestId('algebra-transform-rewriteAsRoot')).toBeInTheDocument();
  });

  it('renders Equation LCD-cleared rational solves with exclusions and provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{x}+\\frac{1}{x+1}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt\{5\}/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
    expect(screen.getByText('LCD Clear')).toBeInTheDocument();
  });

  it('renders POLY2 guided quartic exact roots through the bounded factor-first path', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Core', 'Equation');
    await user.click(await screen.findByRole('button', { name: /polynomial/i }));
    await user.click(await screen.findByRole('button', { name: /quartic/i }));

    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /x\\in\\left\\\{.*2.*1.*1.*2.*\\right\\\}/);
  });

  it('renders POLY2 bounded cubic factorization through Calculate > Factor', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^3-6x^2+11x-6');
    await user.click(screen.getByTestId('soft-action-factor'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /(x-1|x\^2-5x\+6)/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/x/);
  });

  it('renders POLY-RAD1 algebraic biquadratic factors through Calculate > Factor', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^4-5x^2+3');
    await user.click(screen.getByTestId('soft-action-factor'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt\{13\}/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/x²|x\^2|x/);
  });

  it('renders bounded conjugate solves with conditions and provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=1');
    const supplements = screen
      .getAllByTestId(/display-outcome-supplement-/)
      .map((node) => node.querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+1\\ne0');
    expect(screen.getByText('Conjugate Transform')).toBeInTheDocument();
  });

  it('renders POLY-RAD5 selected three-term reciprocal solves only when the bounded sink closes cleanly', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=0');
    expect(screen.getByText('LCD Clear')).toBeInTheDocument();
  }, 15000);

  it('renders RAD2 sequential radical solves with exact follow-on provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{x+1}=\\sqrt{2x-1}+1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    const exactMath = screen.getByTestId('display-outcome-exact').querySelector('[data-raw-latex]');
    const rawLatex = exactMath?.getAttribute('data-raw-latex') ?? '';
    expect(rawLatex).toContain('x=');
    expect(rawLatex).toContain('\\sqrt');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /2x-1\\ge0/);
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
  });

  it('renders POLY-RAD1 radical equations that hand off into algebraic biquadratic exact roots', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{x^4-5x^2+4}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt\{13\}/);
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
  });

  it('renders POLY-RAD1 direct radical simplification wins without switching simplify into factor mode', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt{x^4-10x^2+25}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\vert x\^2-5\\vert/);
  });

  it('shows Trigonometry handoff only for numeric-eligible unresolved cases', async () => {
    const { user } = await renderAppMain();

    await openTrigEquationSolve(user);
    setMathFieldLatex('main-editor', '\\cos\\left(x\\right)=x');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-action-send-equation')).toBeInTheDocument();
  });

  it('shows Geometry handoff actions only when the core returns an eligible unresolved case', async () => {
    const { user } = await renderAppMain();

    await openGeometrySlope(user);
    setMathFieldLatex('main-editor', 'slope(p1=(?,2), p2=(4,2), slope=0)');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-action-send-equation')).toBeInTheDocument();
  });

  it('renders Statistics quality sections in the shared result card', async () => {
    const { user } = await renderAppMain();

    await openStatisticsRegression(user);
    setMathFieldLatex('main-editor', 'regression(points={(1,2),(2,4),(3,6)})');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-detail-sections')).toBeInTheDocument());
    expect(screen.getByText('Quality Summary')).toBeInTheDocument();
    expect(screen.getByText(/SSE/i)).toBeInTheDocument();
  });

  it('shows undefined table rows plus a warning when sampled rows leave the real domain', async () => {
    const { user } = await renderAppMain();

    await openTable(user);
    setMathFieldLatex('table-primary-editor', '\\sqrt{x}');
    await user.click(screen.getByTestId('soft-action-build'));

    await waitFor(() => expect(screen.getByTestId('table-preview')).toBeInTheDocument());
    expect(screen.getByTestId('table-row-1')).toHaveTextContent('undefined');
    expect(screen.getByText(/outside the real domain/i)).toBeInTheDocument();
  });
});
