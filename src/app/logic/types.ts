import type { ModeId } from '../../types/calculator';

export type AppCommand =
  | { kind: 'run-primary-action' }
  | { kind: 'run-soft-action'; actionId: string }
  | { kind: 'clear-current-mode' }
  | { kind: 'open-history' }
  | { kind: 'close-history' }
  | { kind: 'set-mode'; mode: ModeId };

export type SoftActionContext = {
  currentMode: ModeId;
  isLauncherOpen: boolean;
  actionId: string;
};

export type ModeActionContext = {
  currentMode: ModeId;
  isLauncherOpen: boolean;
};
