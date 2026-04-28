import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import AppMain from '../AppMain';

export type AppUser = ReturnType<typeof userEvent.setup>;

export async function renderAppMain() {
  const user = userEvent.setup();
  const utils = render(<AppMain />);
  await screen.findByTestId('main-editor');
  return {
    user,
    ...utils,
  };
}

export function setMathFieldLatex(testId: string, latex: string) {
  const field = screen.getByTestId(testId) as HTMLElement & { setValue: (value: string) => void };
  field.focus();
  fireEvent.focus(field);
  field.setValue(latex);
  fireEvent.input(field, { bubbles: true });
}

export function setVisibleSecondaryMathFieldLatex(latex: string, index = 0) {
  const fields = Array.from(
    document.querySelectorAll('math-field.secondary-mathfield'),
  ) as Array<HTMLElement & { setValue: (value: string) => void }>;
  const field = fields[index];
  if (!field) {
    throw new Error(`Missing visible secondary math-field at index ${index}`);
  }
  field.focus();
  fireEvent.focus(field);
  field.setValue(latex);
  fireEvent.input(field, { bubbles: true });
}

export async function openLauncherApp(user: AppUser, categoryLabel: string, appLabel: string) {
  await user.click(screen.getByTestId('keypad-menu'));
  await user.click(await screen.findByRole('button', { name: new RegExp(categoryLabel, 'i') }));
  await user.click(await screen.findByRole('button', { name: new RegExp(appLabel, 'i') }));
}

export async function openEquationSymbolic(user: AppUser) {
  await openLauncherApp(user, 'Core', 'Equation');
  await user.click(await screen.findByRole('button', { name: /symbolic/i }));
  await screen.findByTestId('main-editor');
}

export async function openTable(user: AppUser) {
  await openLauncherApp(user, 'Core', 'Table');
  await screen.findByTestId('table-primary-editor');
}

export async function openTrigEquationSolve(user: AppUser) {
  await openLauncherApp(user, 'Shape Math', 'Trigonometry');
  await user.click(await screen.findByRole('button', { name: /equations/i }));
  await user.click(await screen.findByRole('button', { name: /solve trig equation/i }));
  await screen.findByTestId('main-editor');
}

export async function openGeometrySlope(user: AppUser) {
  await openLauncherApp(user, 'Shape Math', 'Geometry');
  await user.click(screen.getByTestId('keypad-5'));
  await user.click(screen.getByTestId('keypad-3'));
  await screen.findByTestId('main-editor');
}

export async function openStatisticsRegression(user: AppUser) {
  await openLauncherApp(user, 'Data', 'Statistics');
  await user.click(screen.getByTestId('keypad-6'));
  await screen.findByTestId('main-editor');
}

export function expectMathStaticLatex(container: HTMLElement, latex: string | RegExp) {
  expect(within(container).getByLabelText(latex)).toBeInTheDocument();
}
