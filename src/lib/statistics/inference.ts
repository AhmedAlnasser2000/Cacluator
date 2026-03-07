const LANCZOS_COEFFICIENTS = [
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
];

const LOG_SQRT_TWO_PI = 0.9189385332046727;
const BETA_EPSILON = 1e-12;
const INVERSE_MAX_ITERATIONS = 80;

export type MeanInferenceSummary = {
  count: number;
  mean: number;
  sampleVariance: number | null;
  sampleStandardDeviation: number | null;
};

export type MeanConfidenceIntervalResult = {
  criticalValue: number;
  standardError: number;
  marginOfError: number;
  lowerBound: number;
  upperBound: number;
};

export type MeanHypothesisTestResult = {
  alpha: number;
  criticalValue: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  rejectNull: boolean;
};

export function parseInferenceLevel(levelDraft: string) {
  const level = Number(levelDraft.trim());
  if (!Number.isFinite(level) || level <= 0 || level >= 1) {
    return null;
  }
  return level;
}

function logGamma(value: number): number {
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const shifted = value - 1;
  let sum = 0.9999999999998099;
  for (let index = 0; index < LANCZOS_COEFFICIENTS.length; index += 1) {
    sum += LANCZOS_COEFFICIENTS[index] / (shifted + index + 1);
  }

  const t = shifted + LANCZOS_COEFFICIENTS.length - 0.5;
  return LOG_SQRT_TWO_PI + ((shifted + 0.5) * Math.log(t)) - t + Math.log(sum);
}

function logBeta(a: number, b: number) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function continuedFractionBeta(a: number, b: number, x: number) {
  let c = 1;
  let d = 1 - (((a + b) * x) / (a + 1));
  if (Math.abs(d) < BETA_EPSILON) {
    d = BETA_EPSILON;
  }
  d = 1 / d;
  let fraction = d;

  for (let iteration = 1; iteration <= 200; iteration += 1) {
    const evenStep = iteration * 2;
    let numerator = (iteration * (b - iteration) * x) / (((a + evenStep) - 1) * (a + evenStep));
    d = 1 + (numerator * d);
    if (Math.abs(d) < BETA_EPSILON) {
      d = BETA_EPSILON;
    }
    c = 1 + (numerator / c);
    if (Math.abs(c) < BETA_EPSILON) {
      c = BETA_EPSILON;
    }
    d = 1 / d;
    fraction *= d * c;

    numerator = -(((a + iteration) * (a + b + iteration) * x) / ((a + evenStep) * (a + evenStep + 1)));
    d = 1 + (numerator * d);
    if (Math.abs(d) < BETA_EPSILON) {
      d = BETA_EPSILON;
    }
    c = 1 + (numerator / c);
    if (Math.abs(c) < BETA_EPSILON) {
      c = BETA_EPSILON;
    }
    d = 1 / d;
    const delta = d * c;
    fraction *= delta;

    if (Math.abs(delta - 1) < 1e-10) {
      break;
    }
  }

  return fraction;
}

function regularizedIncompleteBeta(x: number, a: number, b: number) {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }

  const front = Math.exp((a * Math.log(x)) + (b * Math.log(1 - x)) - logBeta(a, b)) / a;
  if (x < (a + 1) / (a + b + 2)) {
    return front * continuedFractionBeta(a, b, x);
  }

  return 1 - (Math.exp((b * Math.log(1 - x)) + (a * Math.log(x)) - logBeta(b, a)) / b) * continuedFractionBeta(b, a, 1 - x);
}

export function studentTCdf(value: number, degreesOfFreedom: number) {
  if (!Number.isFinite(value) || !Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) {
    return Number.NaN;
  }

  if (value === 0) {
    return 0.5;
  }

  const x = degreesOfFreedom / (degreesOfFreedom + (value * value));
  const beta = regularizedIncompleteBeta(x, degreesOfFreedom / 2, 0.5);
  return value > 0 ? 1 - (0.5 * beta) : 0.5 * beta;
}

export function inverseStudentTCdf(probability: number, degreesOfFreedom: number): number {
  if (
    !Number.isFinite(probability)
    || probability <= 0
    || probability >= 1
    || !Number.isFinite(degreesOfFreedom)
    || degreesOfFreedom <= 0
  ) {
    return Number.NaN;
  }

  if (probability === 0.5) {
    return 0;
  }

  if (probability < 0.5) {
    return -inverseStudentTCdf(1 - probability, degreesOfFreedom);
  }

  let low = 0;
  let high = 1;
  while (studentTCdf(high, degreesOfFreedom) < probability && high < 1_000_000) {
    high *= 2;
  }

  for (let iteration = 0; iteration < INVERSE_MAX_ITERATIONS; iteration += 1) {
    const midpoint = (low + high) / 2;
    const value = studentTCdf(midpoint, degreesOfFreedom);
    if (Math.abs(value - probability) < 1e-12) {
      return midpoint;
    }
    if (value < probability) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

export function computeMeanConfidenceInterval(
  summary: MeanInferenceSummary,
  level: number,
): MeanConfidenceIntervalResult | null {
  if (summary.count < 2 || summary.sampleStandardDeviation === null) {
    return null;
  }

  const alpha = 1 - level;
  const criticalValue = inverseStudentTCdf(1 - (alpha / 2), summary.count - 1);
  const standardError = summary.sampleStandardDeviation / Math.sqrt(summary.count);
  const marginOfError = criticalValue * standardError;

  return {
    criticalValue,
    standardError,
    marginOfError,
    lowerBound: summary.mean - marginOfError,
    upperBound: summary.mean + marginOfError,
  };
}

export function computeMeanHypothesisTest(
  summary: MeanInferenceSummary,
  level: number,
  mu0: number,
): MeanHypothesisTestResult | null {
  if (summary.count < 2 || summary.sampleStandardDeviation === null) {
    return null;
  }

  const alpha = 1 - level;
  const criticalValue = inverseStudentTCdf(1 - (alpha / 2), summary.count - 1);
  const standardError = summary.sampleStandardDeviation / Math.sqrt(summary.count);

  if (standardError === 0) {
    const difference = summary.mean - mu0;
    return {
      alpha,
      criticalValue,
      standardError,
      tStatistic: difference === 0 ? 0 : Number.POSITIVE_INFINITY,
      pValue: difference === 0 ? 1 : 0,
      rejectNull: difference !== 0,
    };
  }

  const tStatistic = (summary.mean - mu0) / standardError;
  const pValue = Math.max(0, Math.min(1, 2 * (1 - studentTCdf(Math.abs(tStatistic), summary.count - 1))));

  return {
    alpha,
    criticalValue,
    standardError,
    tStatistic,
    pValue,
    rejectNull: pValue < alpha,
  };
}
