import type {
  CorrelationState,
  FrequencyRow,
  FrequencyTable,
  RegressionPoint,
  RegressionState,
  StatisticsRequest,
  StatisticsSourceSyncState,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';
import { formatNumber } from '../format';
import { parseSignedNumberInput } from '../signed-number';

export function normalizeStatisticsSource(source: string) {
  return source
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\operatorname\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replaceAll('\\ ', ' ')
    .replace(/\s+/g, ' ');
}

export function splitTopLevel(source: string, delimiter = ',') {
  const segments: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of source) {
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (char === delimiter && depth === 0) {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

export function splitAssignment(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    } else if (char === '=' && depth === 0) {
      return {
        key: source.slice(0, index).trim(),
        value: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

export function splitPair(source: string, delimiter = ':') {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    } else if (char === delimiter && depth === 0) {
      return {
        left: source.slice(0, index).trim(),
        right: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

export function normalizeStatisticsKey(key: string) {
  return key.trim().replaceAll(' ', '').replaceAll('_', '').toLowerCase();
}

export function parseAssignments(source: string) {
  const entries = splitTopLevel(source);
  const assignments = new Map<string, string>();

  for (const entry of entries) {
    const assignment = splitAssignment(entry);
    if (!assignment) {
      return null;
    }
    assignments.set(normalizeStatisticsKey(assignment.key), assignment.value);
  }

  return assignments;
}

export function stripOuterCollection(source: string) {
  const trimmed = source.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('(') && trimmed.endsWith(')'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseDatasetValuesSource(source: string) {
  const body = stripOuterCollection(source);
  if (!body) {
    return [];
  }

  if (body.includes(',')) {
    return splitTopLevel(body).map((segment) => segment.trim()).filter(Boolean);
  }

  return body.split(/\s+/).map((segment) => segment.trim()).filter(Boolean);
}

export function parseFrequencyRowsSource(source: string): FrequencyRow[] | null {
  const body = stripOuterCollection(source);
  if (!body) {
    return [];
  }

  const rows = splitTopLevel(body);
  const parsedRows: FrequencyRow[] = [];

  for (const row of rows) {
    const pair = splitPair(row);
    if (!pair) {
      return null;
    }
    parsedRows.push({
      value: pair.left,
      frequency: pair.right,
    });
  }

  return parsedRows;
}

export function parsePointSource(source: string): RegressionPoint | null {
  const body = stripOuterCollection(source);
  const parts = splitTopLevel(body);
  if (parts.length !== 2) {
    return null;
  }

  return {
    x: parts[0].trim(),
    y: parts[1].trim(),
  };
}

export function parsePointsSource(source: string): RegressionPoint[] | null {
  const trimmed = source.trim();
  const body = trimmed.startsWith('{') && trimmed.endsWith('}')
    ? stripOuterCollection(trimmed)
    : trimmed;
  if (!body) {
    return [];
  }

  const points = splitTopLevel(body);
  const parsedPoints: RegressionPoint[] = [];

  for (const point of points) {
    const parsed = parsePointSource(point);
    if (!parsed) {
      return null;
    }
    parsedPoints.push(parsed);
  }

  return parsedPoints;
}

export function parseNumericDraft(value: string) {
  return parseSignedNumberInput(value);
}

export function parseIntegerDraft(value: string) {
  const parsed = parseSignedNumberInput(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

export function formatStatisticsNumber(value: number) {
  return formatNumber(value);
}

export const DEFAULT_STATISTICS_SOURCE_SYNC_STATE: StatisticsSourceSyncState = {
  datasetStale: false,
  frequencyTableStale: false,
};

export function statisticsSourceSyncFromDatasetEdit(): StatisticsSourceSyncState {
  return {
    datasetStale: false,
    frequencyTableStale: true,
  };
}

export function statisticsSourceSyncFromFrequencyEdit(): StatisticsSourceSyncState {
  return {
    datasetStale: true,
    frequencyTableStale: false,
  };
}

export function clearStatisticsSourceSyncState(): StatisticsSourceSyncState {
  return {
    datasetStale: false,
    frequencyTableStale: false,
  };
}

export function collapseDatasetToFrequencyTable(dataset: StatsDataset): FrequencyTable {
  const counts = new Map<string, number>();

  for (const rawValue of dataset.values) {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = parseSignedNumberInput(trimmed);
    const key = parsed === null ? trimmed : formatStatisticsNumber(parsed);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sortedKeys = [...counts.keys()].sort((left, right) => {
    const leftParsed = parseSignedNumberInput(left);
    const rightParsed = parseSignedNumberInput(right);
    if (leftParsed === null || rightParsed === null) {
      return left.localeCompare(right);
    }
    return leftParsed - rightParsed;
  });

  return {
    rows: sortedKeys.map((value) => ({
      value,
      frequency: `${counts.get(value) ?? 0}`,
    })),
  };
}

export function expandFrequencyTableToDataset(table: FrequencyTable): StatsDataset {
  const values: string[] = [];

  for (const row of table.rows) {
    const value = row.value.trim();
    const frequency = parseIntegerDraft(row.frequency);
    if (!value || frequency === null || frequency <= 0) {
      continue;
    }

    for (let count = 0; count < frequency; count += 1) {
      values.push(value);
    }
  }

  return { values };
}

export function statisticsRequestToWorkingSource(
  request: StatisticsRequest,
  fallback: StatisticsWorkingSource = 'dataset',
): StatisticsWorkingSource | null {
  switch (request.kind) {
    case 'dataset':
      return 'dataset';
    case 'descriptive':
    case 'frequency':
    case 'meanInference':
      return request.source;
    case 'binomial':
    case 'normal':
    case 'poisson':
    case 'regression':
    case 'correlation':
      return fallback;
    default:
      return null;
  }
}

export function datasetTextFromValues(values: string[]) {
  return values.join(', ');
}

export function frequencyTextFromRows(rows: FrequencyRow[]) {
  return rows
    .map((row) => `${row.value.trim()}:${row.frequency.trim()}`)
    .filter((row) => row !== ':')
    .join(', ');
}

export function pointsTextFromState(state: RegressionState | CorrelationState) {
  return state.points
    .map((point) => `(${point.x.trim() || '?'},${point.y.trim() || '?'})`)
    .join(', ');
}
