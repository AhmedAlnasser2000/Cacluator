import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  expectMathStaticLatex,
  openEquationSymbolic,
  openGeometrySlope,
  openStatisticsRegression,
  openTrigEquationSolve,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

describe('AppMain UI automation flows', () => {
  it('renders Calculate exact results and exclusion supplements', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{3}+\\frac{1}{6x}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{2x+1}{6x}');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
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

  it('renders Equation conditions and suppresses send action on solved cases', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expect(screen.queryByTestId('display-outcome-action-send-equation')).not.toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ge0/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
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

  it('renders bounded conjugate solves with conditions and provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=1');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ge0/);
    expect(screen.getByText('Conjugate Transform')).toBeInTheDocument();
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
});
