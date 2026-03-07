import type {
  CoreDraftStyle,
  StatisticsParseOptions,
  StatisticsParseResult,
  StatisticsRequest,
  StatisticsScreen,
} from '../../types/calculator';
import {
  normalizeStatisticsKey,
  normalizeStatisticsSource,
  parseAssignments,
  parseDatasetValuesSource,
  parseFrequencyRowsSource,
  parsePointsSource,
  splitTopLevel,
} from './shared';

function kindFromFunctionName(name: string): StatisticsRequest['kind'] | null {
  switch (name.toLowerCase().replaceAll(' ', '')) {
    case 'dataset':
      return 'dataset';
    case 'descriptive':
      return 'descriptive';
    case 'frequency':
      return 'frequency';
    case 'meaninference':
      return 'meanInference';
    case 'binomial':
      return 'binomial';
    case 'normal':
      return 'normal';
    case 'poisson':
      return 'poisson';
    case 'regression':
      return 'regression';
    case 'correlation':
      return 'correlation';
    default:
      return null;
  }
}

function valueFor(map: Map<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = map.get(normalizeStatisticsKey(key));
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseDistributionMode<TMode extends string>(value: string | undefined, allowed: readonly TMode[]) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase() as TMode;
  return allowed.includes(normalized) ? normalized : null;
}

function parseStructured(source: string): StatisticsParseResult | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)\((.*)\)$/.exec(source);
  if (!match) {
    return null;
  }

  const [, functionName, argumentSource] = match;
  const kind = kindFromFunctionName(functionName);
  if (kind === null) {
    return {
      ok: false,
      error: 'Use a supported Statistics request such as dataset(...), descriptive(...), frequency(...), meanInference(...), binomial(...), normal(...), poisson(...), regression(...), or correlation(...).',
    };
  }

  const assignments = parseAssignments(argumentSource);
  if (!assignments) {
    return {
      ok: false,
      error: 'Structured Statistics requests need key=value arguments.',
    };
  }

  if (kind === 'dataset') {
    const values = valueFor(assignments, 'values');
    return values
      ? { ok: true, request: { kind, values: parseDatasetValuesSource(values) }, style: 'structured' }
      : { ok: false, error: 'dataset(...) needs values={...}.' };
  }

  if (kind === 'descriptive' || kind === 'frequency') {
    const values = valueFor(assignments, 'values');
    const freq = valueFor(assignments, 'freq', 'frequencytable');
    if (values) {
      return {
        ok: true,
        request: {
          kind,
          source: 'dataset',
          values: parseDatasetValuesSource(values),
        },
        style: 'structured',
      };
    }

    if (freq) {
      const rows = parseFrequencyRowsSource(freq);
      if (rows === null) {
        return {
          ok: false,
          error: `${kind}(freq={...}) needs value:frequency rows such as {1:2, 2:3}.`,
        };
      }

      return {
        ok: true,
        request: {
          kind,
          source: 'frequencyTable',
          rows,
        },
        style: 'structured',
      };
    }

    return {
      ok: false,
      error: `${kind}(...) needs values={...} or freq={value:frequency,...}.`,
    };
  }

  if (kind === 'meanInference') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['ci', 'test'] as const);
    const level = valueFor(assignments, 'level', 'confidence', 'confidencelevel', 'significancelevel');
    const mu0 = valueFor(assignments, 'mu0', 'nullmean', 'nullmu');
    const values = valueFor(assignments, 'values');
    const freq = valueFor(assignments, 'freq', 'frequencytable');

    if (!mode || !level) {
      return {
        ok: false,
        error: 'meanInference(...) needs mode=ci|test and level=0.95 style input.',
      };
    }

    if (mode === 'test' && !mu0) {
      return {
        ok: false,
        error: 'meanInference(..., mode=test, ...) also needs mu0=....',
      };
    }

    if (values) {
      return {
        ok: true,
        request: {
          kind,
          source: 'dataset',
          values: parseDatasetValuesSource(values),
          mode,
          level,
          mu0,
        },
        style: 'structured',
      };
    }

    if (freq) {
      const rows = parseFrequencyRowsSource(freq);
      if (rows === null) {
        return {
          ok: false,
          error: 'meanInference(freq={...}) needs value:frequency rows such as {1:2, 2:3}.',
        };
      }

      return {
        ok: true,
        request: {
          kind,
          source: 'frequencyTable',
          rows,
          mode,
          level,
          mu0,
        },
        style: 'structured',
      };
    }

    return {
      ok: false,
      error: 'meanInference(...) needs values={...} or freq={value:frequency,...}.',
    };
  }

  if (kind === 'binomial') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
    const n = valueFor(assignments, 'n');
    const p = valueFor(assignments, 'p');
    const x = valueFor(assignments, 'x');
    return n && p && x && mode
      ? { ok: true, request: { kind, n, p, x, mode }, style: 'structured' }
      : { ok: false, error: 'binomial(...) needs n=..., p=..., x=..., and mode=pmf|cdf.' };
  }

  if (kind === 'normal') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pdf', 'cdf'] as const);
    const mean = valueFor(assignments, 'mean', 'mu');
    const standardDeviation = valueFor(assignments, 'sd', 'sigma', 'standarddeviation');
    const x = valueFor(assignments, 'x');
    return mean && standardDeviation && x && mode
      ? { ok: true, request: { kind, mean, standardDeviation, x, mode }, style: 'structured' }
      : { ok: false, error: 'normal(...) needs mean=..., sd=..., x=..., and mode=pdf|cdf.' };
  }

  if (kind === 'poisson') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
    const lambda = valueFor(assignments, 'lambda');
    const x = valueFor(assignments, 'x');
    return lambda && x && mode
      ? { ok: true, request: { kind, lambda, x, mode }, style: 'structured' }
      : { ok: false, error: 'poisson(...) needs lambda=..., x=..., and mode=pmf|cdf.' };
  }

  if (kind === 'regression' || kind === 'correlation') {
    const pointsSource = valueFor(assignments, 'points');
    if (!pointsSource) {
      return {
        ok: false,
        error: `${kind}(...) needs points={(x1,y1),(x2,y2),...}.`,
      };
    }

    const points = parsePointsSource(pointsSource);
    if (points === null) {
      return {
        ok: false,
        error: `${kind}(points={...}) needs coordinate pairs such as {(1,2),(2,4)}.`,
      };
    }

    return {
      ok: true,
      request: { kind, points },
      style: 'structured',
    };
  }

  return null;
}

function parseDatasetShorthand(source: string): StatisticsParseResult {
  return {
    ok: true,
    request: {
      kind: 'dataset',
      values: parseDatasetValuesSource(source),
    },
    style: 'shorthand',
  };
}

function parseDataSourceShorthand(
  kind: 'descriptive' | 'frequency',
  source: string,
): StatisticsParseResult {
  const hasTableSyntax = source.includes(':');
  if (hasTableSyntax) {
    const rows = parseFrequencyRowsSource(source);
    if (rows === null) {
      return {
        ok: false,
        error: 'Use value:frequency rows such as 1:2, 2:3 for the frequency-table source.',
      };
    }

    return {
      ok: true,
      request: { kind, source: 'frequencyTable', rows },
      style: 'shorthand',
    };
  }

  const values = parseDatasetValuesSource(source);
  return {
    ok: true,
    request: { kind, source: 'dataset', values },
    style: 'shorthand',
  };
}

function parseDistributionShorthand(
  kind: 'binomial' | 'normal' | 'poisson',
  source: string,
): StatisticsParseResult {
  const assignments = parseAssignments(source);
  if (!assignments) {
    return {
      ok: false,
      error: `Use key=value shorthand or a structured ${kind} request for this tool.`,
    };
  }

  if (kind === 'binomial') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
    const n = valueFor(assignments, 'n');
    const p = valueFor(assignments, 'p');
    const x = valueFor(assignments, 'x');
    return n && p && x && mode
      ? { ok: true, request: { kind, n, p, x, mode }, style: 'shorthand' }
      : { ok: false, error: 'Use n=..., p=..., x=..., mode=pmf|cdf for Binomial.' };
  }

  if (kind === 'normal') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pdf', 'cdf'] as const);
    const mean = valueFor(assignments, 'mean', 'mu');
    const standardDeviation = valueFor(assignments, 'sd', 'sigma', 'standarddeviation');
    const x = valueFor(assignments, 'x');
    return mean && standardDeviation && x && mode
      ? { ok: true, request: { kind, mean, standardDeviation, x, mode }, style: 'shorthand' }
      : { ok: false, error: 'Use mean=..., sd=..., x=..., mode=pdf|cdf for Normal.' };
  }

  const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
  const lambda = valueFor(assignments, 'lambda');
  const x = valueFor(assignments, 'x');
  return lambda && x && mode
    ? { ok: true, request: { kind, lambda, x, mode }, style: 'shorthand' }
    : { ok: false, error: 'Use lambda=..., x=..., mode=pmf|cdf for Poisson.' };
}

function parsePointsShorthand(
  kind: 'regression' | 'correlation',
  source: string,
): StatisticsParseResult {
  const points = parsePointsSource(source);
  if (points === null) {
    return {
      ok: false,
      error: 'Use point shorthand such as (1,2), (2,4), (3,6), or enter a structured request.',
    };
  }

  return {
    ok: true,
    request: { kind, points },
    style: 'shorthand',
  };
}

function parseByScreenHint(source: string, options: StatisticsParseOptions): StatisticsParseResult | null {
  switch (options.screenHint) {
    case 'dataEntry':
      return parseDatasetShorthand(source);
    case 'descriptive':
      return parseDataSourceShorthand('descriptive', source);
    case 'frequency':
      return parseDataSourceShorthand('frequency', source);
    case 'binomial':
      return parseDistributionShorthand('binomial', source);
    case 'normal':
      return parseDistributionShorthand('normal', source);
    case 'poisson':
      return parseDistributionShorthand('poisson', source);
    case 'meanInference':
      return {
        ok: false,
        error: 'Mean inference uses structured requests such as meanInference(values={12,15,18}, mode=ci, level=0.95).',
      };
    case 'regression':
      return parsePointsShorthand('regression', source);
    case 'correlation':
      return parsePointsShorthand('correlation', source);
    default:
      return null;
  }
}

export function statisticsRequestToScreen(
  request: StatisticsRequest,
  fallbackScreen: StatisticsScreen = 'dataEntry',
): StatisticsScreen {
  switch (request.kind) {
    case 'dataset':
      return 'dataEntry';
    case 'descriptive':
      return 'descriptive';
    case 'frequency':
      return 'frequency';
    case 'binomial':
      return 'binomial';
    case 'normal':
      return 'normal';
    case 'poisson':
      return 'poisson';
    case 'meanInference':
      return 'meanInference';
    case 'regression':
      return 'regression';
    case 'correlation':
      return 'correlation';
    default:
      return fallbackScreen;
  }
}

export function statisticsDraftStyle(source: string): CoreDraftStyle {
  const normalized = normalizeStatisticsSource(source);
  return /^[A-Za-z][A-Za-z0-9]*\s*\(/.test(normalized) ? 'structured' : 'shorthand';
}

export function parseStatisticsDraft(
  source: string,
  options: StatisticsParseOptions = {},
): StatisticsParseResult {
  const normalized = normalizeStatisticsSource(source);
  if (!normalized) {
    return {
      ok: false,
      error: 'Enter a Statistics request or use a guided Statistics tool before evaluating.',
    };
  }

  const structured = parseStructured(normalized);
  if (structured) {
    return structured;
  }

  const contextual = parseByScreenHint(normalized, options);
  if (contextual) {
    return contextual;
  }

  if (splitTopLevel(normalized).every((segment) => /^\([^,]+,[^,]+\)$/.test(segment))) {
    return {
      ok: false,
      error: 'Point-list shorthand is only accepted on Regression or Correlation screens unless you use regression(...) or correlation(...).',
    };
  }

  return {
    ok: false,
    error: 'This draft is not recognized in the current Statistics context. Use dataset values, value:frequency rows, distribution key=value input, point lists, or a structured Statistics request.',
  };
}
