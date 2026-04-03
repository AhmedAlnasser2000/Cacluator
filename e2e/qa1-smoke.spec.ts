import { expect, test } from '@playwright/test';
import {
  getMathFieldLatex,
  openEquationSymbolic,
  openGeometrySlope,
  openSettingsPanel,
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

test('Settings smoke uses the outboard inspector on wide layouts and keeps shell width stable', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.waitForTimeout(650);

  const shell = page.getByTestId('calculator-shell');
  const shellWidthBefore = (await shell.boundingBox())?.width;

  await openSettingsPanel(page);
  await expect(page.getByTestId('settings-panel')).toHaveAttribute(
    'data-settings-presentation',
    'outboard',
  );
  await expect(page.getByTestId('side-surface-host')).toHaveAttribute(
    'data-side-surface-presentation',
    'outboard',
  );

  const shellWidthAfterOpen = (await shell.boundingBox())?.width;
  expect(shellWidthBefore).toBeTruthy();
  expect(shellWidthAfterOpen).toBe(shellWidthBefore);

  await page.getByTestId('settings-ui-scale-130').click();
  await page.getByTestId('settings-high-contrast').check();

  const shellClass = await shell.getAttribute('class');
  expect(shellClass).toContain('is-high-contrast');
  await expect(shell).toHaveAttribute('style', /--ui-scale: 1.3/);
});

test('Settings smoke uses an overlay sheet on narrow layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await expect(page.getByTestId('settings-panel')).toHaveAttribute('data-settings-presentation', 'overlay');
  await expect(page.getByTestId('side-surface-overlay-backdrop')).toBeVisible();
});

test('Settings smoke keeps quick toggles in sync and stays mutually exclusive with history', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-rad').click();
  await expect(page.getByTestId('quick-setting-angle-unit')).toHaveText('RAD');

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-panel')).toBeVisible();
  await expect(page.getByTestId('history-panel')).toHaveAttribute('data-history-presentation', 'outboard');
  await expect(page.getByTestId('settings-panel')).toHaveCount(0);
});

test('PRL1 smoke applies symbolic display preferences to rendered results while leaving editor load on raw exact latex', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-powers').click();

  await setMathFieldLatex(page, '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();

  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('\\sqrt[3]{\\sqrt{x}}');
});

test('PRL1 smoke keeps plain sqrt as a root in auto mode', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-auto').click();

  await setMathFieldLatex(page, '\\sqrt{x}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\sqrt{x}"]')).toBeVisible();
});
