import { expect, test } from '@playwright/test';
import {
  openEquationSymbolic,
  openGeometrySlope,
  openStatisticsRegression,
  openTrigEquationSolve,
  setMathFieldLatex,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('Calculate smoke renders exact symbolic result', async ({ page }) => {
  await setMathFieldLatex(page, '\\frac{1}{3}+\\frac{1}{6x}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\frac{2x+1}{6x}"]')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('Calculate smoke exposes the algebra tray for explicit transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\frac{x^2-1}{x^2-x}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-cancelFactors').click();

  await expect(page.getByTestId('algebra-transform-cancelFactors')).toBeVisible();
  await expect(page.getByText(/Canceled supported common factors/i)).toBeVisible();
});

test('Equation smoke renders solved condition line', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\frac{1}{\\sqrt{x}}=1');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
  await expect(page.getByTestId('display-outcome-action-send-equation')).toHaveCount(0);
});

test('Equation smoke exposes transform-only algebra controls', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\frac{1}{x}+\\frac{1}{x+1}=1');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-useLCD').click();

  await expect(page.getByTestId('algebra-transform-useLCD')).toBeVisible();
  await expect(page.getByText(/Cleared the equation/i)).toBeVisible();
});

test('Equation smoke covers LCD-cleared rational solving', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\frac{1}{x}+\\frac{1}{x+1}=1');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByText('LCD Clear')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('Equation smoke covers bounded conjugate solving', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByText('Conjugate Transform')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('Trigonometry smoke covers solved and handoff cases', async ({ page }) => {
  await openTrigEquationSolve(page);
  await setMathFieldLatex(page, '\\sin\\left(x\\right)=\\frac{1}{2}');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();

  await setMathFieldLatex(page, '\\cos\\left(x\\right)=x');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-action-send-equation')).toBeVisible();
});

test('Geometry smoke covers handoff-capable unresolved flow', async ({ page }) => {
  await openGeometrySlope(page);
  await setMathFieldLatex(page, 'slope(p1=(?,2), p2=(4,2), slope=0)');
  await page.getByTestId('soft-action-evaluate').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-action-send-equation')).toBeVisible();
});

test('Statistics smoke renders quality summary metadata', async ({ page }) => {
  await openStatisticsRegression(page);
  await setMathFieldLatex(page, 'regression(points={(1,2),(2,4),(3,6)})');
  await page.getByTestId('soft-action-evaluate').click();

  const detailSections = page.getByTestId('display-outcome-detail-sections');
  await expect(detailSections).toBeVisible();
  await expect(detailSections).toContainText('Quality Summary');
  await expect(detailSections).toContainText('SSE');
});
