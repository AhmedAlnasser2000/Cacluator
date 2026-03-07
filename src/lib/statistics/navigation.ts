import type { StatisticsScreen } from '../../types/calculator';
import type { SoftAction } from '../menu';

type StatisticsMenuEntry = {
  id: string;
  label: string;
  description: string;
  hotkey: string;
  target: StatisticsScreen;
};

export type StatisticsRouteMeta = {
  screen: StatisticsScreen;
  label: string;
  breadcrumb: string[];
  description: string;
  helpText: string;
  guideArticleId?: string;
  focusTarget: 'menu' | 'guidedForm' | 'editor';
  editorMode: 'editable';
};

const HOME_ENTRIES: StatisticsMenuEntry[] = [
  { id: 'dataEntry', label: 'Data Entry', description: 'Paste or edit a dataset of numeric values', hotkey: '1', target: 'dataEntry' },
  { id: 'descriptive', label: 'Descriptive', description: 'Count, mean, median, spread, and summary measures', hotkey: '2', target: 'descriptive' },
  { id: 'frequency', label: 'Frequency', description: 'Work with grouped counts from the dataset or a manual table', hotkey: '3', target: 'frequency' },
  { id: 'probability', label: 'Probability', description: 'Open binomial, normal, and Poisson workflows', hotkey: '4', target: 'probabilityHome' },
  { id: 'inference', label: 'Inference', description: 'Open bounded inferential workflows starting with one-sample mean tools', hotkey: '5', target: 'inferenceHome' },
  { id: 'regression', label: 'Regression', description: 'Linear regression from a point set', hotkey: '6', target: 'regression' },
  { id: 'correlation', label: 'Correlation', description: 'Pearson correlation from a point set', hotkey: '7', target: 'correlation' },
];

const PROBABILITY_ENTRIES: StatisticsMenuEntry[] = [
  { id: 'binomial', label: 'Binomial', description: 'Bounded binomial PMF and CDF workflows', hotkey: '1', target: 'binomial' },
  { id: 'normal', label: 'Normal', description: 'Bounded normal PDF and CDF workflows', hotkey: '2', target: 'normal' },
  { id: 'poisson', label: 'Poisson', description: 'Bounded Poisson PMF and CDF workflows', hotkey: '3', target: 'poisson' },
];

const INFERENCE_ENTRIES: StatisticsMenuEntry[] = [
  { id: 'meanInference', label: 'Mean', description: 'One-sample mean confidence intervals and two-sided t tests', hotkey: '1', target: 'meanInference' },
];

const ROUTE_META: Record<StatisticsScreen, StatisticsRouteMeta> = {
  home: {
    screen: 'home',
    label: 'Statistics',
    breadcrumb: ['Statistics'],
    description: 'Type a Statistics request above or choose a guided statistics workflow below.',
    helpText: 'Use EXE/F1 or keys 1-7 to open a statistics tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'statistics-descriptive',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  dataEntry: {
    screen: 'dataEntry',
    label: 'Data Entry',
    breadcrumb: ['Statistics', 'Data Entry'],
    description: 'Build and edit a reusable dataset for descriptive and frequency workflows.',
    helpText: 'Paste comma-separated or line-separated numeric values, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-descriptive',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  descriptive: {
    screen: 'descriptive',
    label: 'Descriptive',
    breadcrumb: ['Statistics', 'Descriptive'],
    description: 'Compute descriptive summaries from either the dataset or a manual frequency table.',
    helpText: 'Choose the active source, update the guided inputs if needed, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-descriptive',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  frequency: {
    screen: 'frequency',
    label: 'Frequency',
    breadcrumb: ['Statistics', 'Frequency'],
    description: 'Build grouped counts from the dataset or edit a manual frequency table directly.',
    helpText: 'Use the dataset/table actions, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-descriptive',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  probabilityHome: {
    screen: 'probabilityHome',
    label: 'Probability',
    breadcrumb: ['Statistics', 'Probability'],
    description: 'Choose a bounded distribution workflow, or type a structured probability request above.',
    helpText: 'Use EXE/F1 or keys 1-3 to open a probability tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'statistics-probability',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  inferenceHome: {
    screen: 'inferenceHome',
    label: 'Inference',
    breadcrumb: ['Statistics', 'Inference'],
    description: 'Choose a bounded inferential workflow, or type a structured inference request above.',
    helpText: 'Use EXE/F1 or key 1 to open the mean inference tool. Focus the top editor when you want to run a structured draft directly.',
    guideArticleId: 'statistics-inference',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  binomial: {
    screen: 'binomial',
    label: 'Binomial',
    breadcrumb: ['Statistics', 'Probability', 'Binomial'],
    description: 'Evaluate bounded binomial PMF and CDF requests from n, p, and x.',
    helpText: 'Enter n, p, x, and the mode, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-probability',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  normal: {
    screen: 'normal',
    label: 'Normal',
    breadcrumb: ['Statistics', 'Probability', 'Normal'],
    description: 'Evaluate bounded normal PDF and CDF requests from mean, standard deviation, and x.',
    helpText: 'Enter mean, standard deviation, x, and the mode, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-probability',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  poisson: {
    screen: 'poisson',
    label: 'Poisson',
    breadcrumb: ['Statistics', 'Probability', 'Poisson'],
    description: 'Evaluate bounded Poisson PMF and CDF requests from lambda and x.',
    helpText: 'Enter lambda, x, and the mode, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-probability',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  meanInference: {
    screen: 'meanInference',
    label: 'Mean Inference',
    breadcrumb: ['Statistics', 'Inference', 'Mean'],
    description: 'Run a one-sample mean confidence interval or a two-sided t test from the active data source.',
    helpText: 'Choose Dataset or Table as the source, set CI or Test, enter level and mu0 when needed, then press EXE or F1.',
    guideArticleId: 'statistics-inference',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  regression: {
    screen: 'regression',
    label: 'Regression',
    breadcrumb: ['Statistics', 'Regression'],
    description: 'Fit a bounded least-squares line to a point set.',
    helpText: 'Enter at least two points, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-regression',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  correlation: {
    screen: 'correlation',
    label: 'Correlation',
    breadcrumb: ['Statistics', 'Correlation'],
    description: 'Compute Pearson correlation from a point set.',
    helpText: 'Enter at least two points, then press EXE or F1. Use the top editor when you want to edit the Statistics request directly.',
    guideArticleId: 'statistics-regression',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
};

function entriesForScreen(screen: StatisticsScreen) {
  switch (screen) {
    case 'home':
      return HOME_ENTRIES;
    case 'probabilityHome':
      return PROBABILITY_ENTRIES;
    case 'inferenceHome':
      return INFERENCE_ENTRIES;
    default:
      return [];
  }
}

export function isStatisticsMenuScreen(screen: StatisticsScreen) {
  return screen === 'home' || screen === 'probabilityHome' || screen === 'inferenceHome';
}

export function getStatisticsMenuEntries(screen: StatisticsScreen) {
  return entriesForScreen(screen);
}

export function getStatisticsMenuEntryAtIndex(screen: StatisticsScreen, selectedIndex: number) {
  const entries = entriesForScreen(screen);
  if (entries.length === 0) {
    return undefined;
  }

  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getStatisticsMenuEntryByHotkey(screen: StatisticsScreen, hotkey: string) {
  return entriesForScreen(screen).find((entry) => entry.hotkey === hotkey);
}

export function moveStatisticsMenuIndex(screen: StatisticsScreen, currentIndex: number, delta: number) {
  const entries = entriesForScreen(screen);
  return Math.min(Math.max(currentIndex + delta, 0), Math.max(entries.length - 1, 0));
}

export function getStatisticsParentScreen(screen: StatisticsScreen): StatisticsScreen | null {
  switch (screen) {
    case 'home':
      return null;
    case 'probabilityHome':
    case 'inferenceHome':
    case 'dataEntry':
    case 'descriptive':
    case 'frequency':
    case 'regression':
    case 'correlation':
      return 'home';
    case 'binomial':
    case 'normal':
    case 'poisson':
      return 'probabilityHome';
    case 'meanInference':
      return 'inferenceHome';
    default:
      return 'home';
  }
}

export function getStatisticsRouteMeta(screen: StatisticsScreen) {
  return ROUTE_META[screen];
}

export function getStatisticsSoftActions(screen: StatisticsScreen): SoftAction[] {
  if (isStatisticsMenuScreen(screen)) {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ];
  }

  return [
    { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'menu', label: 'Menu', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

export function getStatisticsMenuFooterText(screen: StatisticsScreen) {
  switch (screen) {
    case 'home':
      return '1-7: Open | EXE/F1: Select | F2: Guide | F5/Esc: Back | F6: Exit';
    case 'probabilityHome':
      return '1-3: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'inferenceHome':
      return '1: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    default:
      return '';
  }
}
