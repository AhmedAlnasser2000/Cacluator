import { expect, test } from '@playwright/test';
import {
  getMathFieldLatex,
  openEquationSymbolic,
  openGeometrySlope,
  openSettingsPanel,
  openStatisticsRegression,
  openTable,
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

test('PRL2 Calculate smoke evaluates broadened real-domain powers, roots, and logs', async ({ page }) => {
  await setMathFieldLatex(page, '\\left(-8\\right)^{\\frac{2}{3}}+\\log_{4}\\left(16\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="6"]')).toBeVisible();
});

test('PRL2 Calculate smoke rejects out-of-real-domain numeric cases cleanly', async ({ page }) => {
  await setMathFieldLatex(page, '\\sqrt{-4}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText(/non-negative radicands/i)).toBeVisible();
});

test('PRL2 Calculate smoke keeps simplify from leaking raw NaN on invalid logs', async ({ page }) => {
  await setMathFieldLatex(page, '\\log\\left(-8\\right)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText(/positive arguments/i)).toBeVisible();
  await expect(page.getByText(/^NaN$/)).toHaveCount(0);
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

test('PRL2 Table smoke shows undefined rows and a warning for real-domain exits', async ({ page }) => {
  await openTable(page);
  await setMathFieldLatex(page, '\\sqrt{x}', 'table-primary-editor');
  await page.getByTestId('soft-action-build').click();

  await expect(page.getByTestId('table-preview')).toBeVisible();
  await expect(page.getByTestId('table-row-1')).toContainText('undefined');
  await expect(page.getByText(/outside the real domain/i)).toBeVisible();
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

test('PRL1 smoke applies symbolic display preferences to rendered results while leaving editor load on canonical raw exact latex', async ({ page }) => {
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
  await expect.poll(() => getMathFieldLatex(page)).toBe('x^{\\frac{1}{6}}');
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

test('PRL3 smoke canonicalizes bounded same-base log sums with condition lines', async ({ page }) => {
  await setMathFieldLatex(page, '\\ln(x)+\\ln(x+1)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\ln\\\\left(x\\\\left(x+1\\\\right)\\\\right)"]'),
  ).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('PRL3 smoke compacts repeated factors when same-base logs combine', async ({ page }) => {
  await setMathFieldLatex(page, '\\ln(4x)+\\ln(x^3)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\ln\\\\left(4x^{4}\\\\right)"]'),
  ).toBeVisible();
});

test('PRL3 smoke exposes Calculate rewrite transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\sqrt[3]{\\sqrt{x}}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-rewriteAsPower').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();
});

test('PRL3 smoke exposes Calculate rewrite-as-root transforms', async ({ page }) => {
  await setMathFieldLatex(page, 'x^{\\frac{1}{6}}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-rewriteAsRoot').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();
  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('\\sqrt[6]{x}');
});

test('PRL3 smoke exposes Calculate change-base transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\log_{4}(x)');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-changeBase').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\frac{\\\\ln\\\\left(x\\\\right)}{\\\\ln\\\\left(4\\\\right)}"]'),
  ).toBeVisible();
});

test('PRL3 smoke lets Equation solve preprocessed fractional-power notation through existing carriers', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, 'x^{\\frac{1}{2}}=3');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x=9"]')).toBeVisible();
});

test('PRL4 smoke solves same-base logarithmic equalities with condition lines', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\ln(x+1)=\\ln(2x-3)');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-badges .equation-origin-badge', { hasText: 'Same-Base Equality' })).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x=4"]')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText(/2x.?3/);
});

test('PRL4 smoke solves bounded mixed-base log equations exactly', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\log_{2}(x)+\\log_{4}(x)=3');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-badges .equation-origin-badge', { hasText: 'Log Base Normalize' })).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x=4"]')).toBeVisible();
});

test('PRL4 smoke keeps recognized unresolved mixed-base families on explicit numeric guidance', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\log_{2}(x)+\\log_{3}(x)=2');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText(/recognized mixed-base log family/i)).toBeVisible();
});

test('PRL4 smoke solves bounded rational-power equations with power-lift provenance', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, 'x^{\\frac{3}{2}}=8');
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.locator('.result-badges .equation-origin-badge', { hasText: 'Power Lift' })).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x=4"]')).toBeVisible();
});
