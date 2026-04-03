import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function setMathFieldLatex(page: Page, latex: string, testId = 'main-editor') {
  const editor = page.getByTestId(testId);
  await editor.waitFor();
  await editor.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.dispatchEvent(new Event('focus', { bubbles: false, composed: true }));
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}

export async function getMathFieldLatex(page: Page, testId = 'main-editor') {
  const editor = page.getByTestId(testId);
  await editor.waitFor();
  return editor.evaluate((element) => {
    const field = element as HTMLElement & { getValue?: (format?: string) => string };
    return typeof field.getValue === 'function' ? field.getValue('latex') : '';
  });
}

export async function openLauncherApp(page: Page, categoryLabel: string, appLabel: string) {
  await page.getByTestId('keypad-menu').click();
  await page.getByRole('button', { name: new RegExp(categoryLabel, 'i') }).click();
  await page.getByRole('button', { name: new RegExp(appLabel, 'i') }).click();
}

export async function openEquationSymbolic(page: Page) {
  await openLauncherApp(page, 'Core', 'Equation');
  await page.getByRole('button', { name: /symbolic/i }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openTrigEquationSolve(page: Page) {
  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await page.getByRole('button', { name: /equations/i }).click();
  await page.getByRole('button', { name: /solve trig equation/i }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openGeometrySlope(page: Page) {
  await openLauncherApp(page, 'Shape Math', 'Geometry');
  await page.getByTestId('keypad-5').click();
  await page.getByTestId('keypad-3').click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openStatisticsRegression(page: Page) {
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByTestId('keypad-6').click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openSettingsPanel(page: Page) {
  await page.getByTestId('settings-toggle').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
}
