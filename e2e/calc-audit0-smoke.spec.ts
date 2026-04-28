import { expect, test } from '@playwright/test';
import {
  getMathFieldLatex,
  getVisibleSecondaryMathFieldLatex,
  openAdvancedCalcTool,
  openCalculusTool,
  setMathFieldLatex,
  setVisibleSecondaryMathFieldLatex,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('CALC-AUDIT0 basic Calculus smoke covers derivative, integral, and limit', async ({ page }) => {
  await openCalculusTool(page, 'Derivative');
  await setVisibleSecondaryMathFieldLatex(page, 'x^3+2x');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Calculus');
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="x"]')).toBeVisible();

  await openCalculusTool(page, 'Integral');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{1}{1+x^2}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="arctan"]')).toBeVisible();

  await openCalculusTool(page, 'Limit');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{\\sin(x)}{x}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText(/1(?:\.0+)?/);
});

test('CALC-COMP1 Calculate editor smoke repairs pasted integral and ln shapes', async ({ page }) => {
  await setMathFieldLatex(page, '\\int_{}^{} 2x ln\\left(x^2+1\\right)\\,dx');

  const editorLatex = await getMathFieldLatex(page);
  expect(editorLatex).toContain('ln');

  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Integral');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).toContainText('U-substitution');
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="ln"]')).toBeVisible();
});

test('CALC-INT1 Calculate editor smoke covers exact definite trust and unsafe stops', async ({ page }) => {
  await setMathFieldLatex(page, '\\int_0^1 2x\\,dx');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Integral');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/1(?:\.0+)?/);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('verified antiderivative');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Interval Safety');

  await setMathFieldLatex(page, '\\int_{-1}^{1}\\frac{1}{x}\\,dx');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-error')).toContainText('outside the real domain');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Interval Safety');
});

test('CALC-DIFF1 Calculate editor smoke covers powered chain derivatives', async ({ page }) => {
  await setMathFieldLatex(page, '\\frac{d}{dx}\\sin^2\\left(\\cos^3\\left(x\\right)\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Derivative');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Calculus');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/Function power|Chain rule/);
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="sin"]')).toBeVisible();
});

test('CALC-DIFF1 guided Calculus derivative smoke covers general powers', async ({ page }) => {
  await openCalculusTool(page, 'Derivative');
  await setVisibleSecondaryMathFieldLatex(page, '\\cos^{2x}\\left(x\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Derivative');
  await expect(page.getByTestId('display-outcome-root')).toContainText('General power');
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="ln"]')).toBeVisible();
});

test('CALC-LIM2 directional finite-limit smoke covers typed one-sided targets', async ({ page }) => {
  await setMathFieldLatex(page, '\\lim_{x\\to 0^+}\\frac{1}{x}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Limit');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="infty"]')).toBeVisible();

  await openAdvancedCalcTool(page, 'Limits', 'Finite Target');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{1}{x}');
  await page.locator('.range-field input:visible').fill('0^-');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="infty"]')).toBeVisible();
});

test('CALC-LIM3 local limit behavior smoke covers details', async ({ page }) => {
  await setMathFieldLatex(page, '\\lim_{x\\to 0^-}\\frac{3x}{x+x^2}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-title')).toContainText('Limit');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/3(?:\.0+)?/);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('rational normalizer');

  await openAdvancedCalcTool(page, 'Limits', 'Finite Target');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{\\ln(1+x)\\sin(x)}{x^2}');
  await page.locator('.range-field input:visible').fill('0');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/1(?:\.0+)?/);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('local orders');
});

test('CALC-POLISH1 history replay preserves guided calculus context', async ({ page }) => {
  await openCalculusTool(page, 'Integral');
  await setVisibleSecondaryMathFieldLatex(page, '2x');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Calculus');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');

  await page.getByTestId('history-toggle').click();
  await page.getByTestId('history-entry').first().click();

  await expect(page.getByText('Integral').first()).toBeVisible();
  await expect.poll(() => getVisibleSecondaryMathFieldLatex(page)).toBe('2x');
  await page.getByTestId('history-toggle').click();

  await openAdvancedCalcTool(page, 'Series', 'Maclaurin');
  await setVisibleSecondaryMathFieldLatex(page, '\\sin(x)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Advanced Calc');

  await page.getByTestId('history-toggle').click();
  await page.getByTestId('history-entry').first().click();

  await expect(page.getByText('Maclaurin Input')).toBeVisible();
  await expect.poll(() => getVisibleSecondaryMathFieldLatex(page)).toBe('\\sin(x)');
});

test('CALC-AUDIT0 Advanced Calc smoke covers integrals and limits', async ({ page }) => {
  await openAdvancedCalcTool(page, 'Integrals', 'Indefinite');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{1}{1+x^2}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="arctan"]')).toBeVisible();

  await setVisibleSecondaryMathFieldLatex(page, '\\cos(3x+2)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).toContainText('U-substitution');

  await openAdvancedCalcTool(page, 'Limits', 'Finite Target');
  await setVisibleSecondaryMathFieldLatex(page, '\\frac{1-\\cos(x)}{x^2}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText(/0\.5|\\frac\{1\}\{2\}/);

  await setVisibleSecondaryMathFieldLatex(page, '\\frac{\\ln(1+x)}{x}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rule-based symbolic');
  await expect(page.getByTestId('display-outcome-root')).not.toContainText('Numeric fallback');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/1(?:\.0+)?/);
});

test('CALC-AUDIT0 Advanced Calc smoke covers series and partials', async ({ page }) => {
  await openAdvancedCalcTool(page, 'Series', 'Maclaurin');
  await setVisibleSecondaryMathFieldLatex(page, '\\sin(x)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="x"]')).toBeVisible();

  await openAdvancedCalcTool(page, 'Partials', 'First Order');
  await setVisibleSecondaryMathFieldLatex(page, 'x^2y+y^3');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="2xy"]')).toBeVisible();
});

test('CALC-AUDIT0 Advanced Calc smoke covers ODE and numeric IVP', async ({ page }) => {
  await openAdvancedCalcTool(page, 'ODE', 'First Order');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="e"]')).toBeVisible();

  await openAdvancedCalcTool(page, 'ODE', 'Numeric IVP');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText(/Numeric|RK|y\(/i);
});
