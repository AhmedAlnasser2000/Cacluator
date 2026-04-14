import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type ExternalComputeArtifactManifest,
  type ExternalComputeFailureClass,
  type ExternalComputeJobSpec,
  type ExternalComputePreflightSummary,
  type ExternalComputeProvenance,
  type ExternalComputeRunnerProfile,
  type ExternalComputeStepName,
  type ExternalComputeStepResult,
} from './contracts';
import {
  compareSymbolicSearchParity,
  type ExternalComputeParityReport,
} from './parity';
import { executeRegisteredWorkloadToDirectory } from './workload-execution';
import {
  EXTERNAL_COMPUTE_WORKLOAD_REGISTRY,
  type ExternalComputeWorkloadRegistration,
} from './workloads';

export const DEFAULT_EXTERNAL_COMPUTE_ARTIFACT_ROOT = '.task_tmp/pgl4-external-compute';
export const DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT = '.task_tmp/pgl5-external-compute';
export const REMOTE_SSH_ENTRYPOINT_TEST =
  'playground/level-0-research/external-compute/remote-ssh-entrypoint.lab.test.ts';

const MAX_COMMAND_OUTPUT_BYTES = 10 * 1024 * 1024;
const REMOTE_PREFLIGHT_TAG = '__PGL_PREFLIGHT__';

export type ExternalComputeExecutionResult = {
  manifest: ExternalComputeArtifactManifest;
  manifestPath: string;
  summaryPath: string;
};

type ExecuteExternalComputeJobOptions = {
  artifactRoot?: string;
  workloadRegistry?: Map<string, ExternalComputeWorkloadRegistration>;
  commandRunner?: CommandRunner;
  signal?: AbortSignal;
};

type CommandRunner = (
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  stdout: string;
  stderr: string;
}>;

type CommandExecutionError = Error & {
  stdout?: string;
  stderr?: string;
  code?: string | number | null;
  signalName?: string | null;
  timedOut?: boolean;
  cancelled?: boolean;
};

type ExternalComputeStepOutcome<T> = {
  value: T;
  attempts: number;
};

type ExternalComputeStepExecutionOptions = {
  step: ExternalComputeStepName;
  stepResults: ExternalComputeStepResult[];
  timeoutMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
};

type ExternalComputeSshContext = {
  baseManifest: Omit<
    ExternalComputeArtifactManifest,
    'status' | 'finishedAt' | 'durationMs'
  >;
  manifestPath: string;
  summaryPath: string;
  parityReportPath: string;
};

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function resolveArtifactRoot(
  runnerProfile: ExternalComputeRunnerProfile,
  artifactRoot?: string,
): string {
  if (artifactRoot) {
    return path.resolve(process.cwd(), artifactRoot);
  }

  if (runnerProfile.runnerKind === 'local' && runnerProfile.local?.artifactRoot) {
    return path.resolve(process.cwd(), runnerProfile.local.artifactRoot);
  }

  return path.resolve(
    process.cwd(),
    runnerProfile.runnerKind === 'ssh'
      ? DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT
      : DEFAULT_EXTERNAL_COMPUTE_ARTIFACT_ROOT,
  );
}

async function writeJsonFile(filePath: string, payload: unknown) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonFile(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as unknown;
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function validateRunnerSelection(
  jobSpec: ExternalComputeJobSpec,
  runnerProfile: ExternalComputeRunnerProfile,
) {
  if (jobSpec.profileId !== runnerProfile.profileId) {
    throw new Error(
      `Job ${jobSpec.jobId} expects profile ${jobSpec.profileId}, but received ${runnerProfile.profileId}.`,
    );
  }

  if (jobSpec.runnerKind !== runnerProfile.runnerKind) {
    throw new Error(
      `Job ${jobSpec.jobId} expects runner kind ${jobSpec.runnerKind}, but received ${runnerProfile.runnerKind}.`,
    );
  }
}

function quotePosix(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function createCommandError(
  message: string,
  extra: Partial<CommandExecutionError> = {},
) {
  const error = new Error(message) as CommandExecutionError;
  Object.assign(error, extra);
  return error;
}

function createCommandRunner(): CommandRunner {
  return (command, args, options = {}) => new Promise((resolve, reject) => {
    execFileCallback(
      command,
      args,
      {
        cwd: options.cwd,
        windowsHide: true,
        signal: options.signal,
        maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(createCommandError(
            `Command failed: ${command} ${args.join(' ')}`,
            {
              name: error.name,
              stdout: typeof stdout === 'string' ? stdout : String(stdout),
              stderr: typeof stderr === 'string' ? stderr : String(stderr),
              code: (error as NodeJS.ErrnoException).code ?? null,
              signalName: 'signal' in error ? String((error as { signal?: string }).signal ?? '') : null,
            },
          ));
          return;
        }

        resolve({
          stdout: typeof stdout === 'string' ? stdout : String(stdout),
          stderr: typeof stderr === 'string' ? stderr : String(stderr),
        });
      },
    );
  });
}

function buildRemoteSshCommand(
  runnerProfile: Extract<ExternalComputeRunnerProfile, { runnerKind: 'ssh' }>,
  remoteJobSpecPath: string,
  remoteRunnerProfilePath: string,
  remoteJobDirectory: string,
) {
  const envPrefix = [
    `PGL_REMOTE_JOB_SPEC_PATH=${quotePosix(remoteJobSpecPath)}`,
    `PGL_REMOTE_RUNNER_PROFILE_PATH=${quotePosix(remoteRunnerProfilePath)}`,
    `PGL_REMOTE_JOB_DIRECTORY=${quotePosix(remoteJobDirectory)}`,
  ].join(' ');

  return [
    `cd ${quotePosix(runnerProfile.ssh.remoteProjectPath)}`,
    `${envPrefix} npm exec -- vitest run --config vitest.playground.config.ts ${quotePosix(REMOTE_SSH_ENTRYPOINT_TEST)}`,
  ].join(' && ');
}

function buildRemoteShellInvocation(
  runnerProfile: Extract<ExternalComputeRunnerProfile, { runnerKind: 'ssh' }>,
  command: string,
) {
  return `${runnerProfile.ssh.remoteShell} -lc ${quotePosix(command)}`;
}

function buildRemotePreflightCommand(
  runnerProfile: Extract<ExternalComputeRunnerProfile, { runnerKind: 'ssh' }>,
) {
  const remoteProjectPath = quotePosix(runnerProfile.ssh.remoteProjectPath);
  const remoteEntrypointPath = quotePosix(
    path.posix.join(runnerProfile.ssh.remoteProjectPath, REMOTE_SSH_ENTRYPOINT_TEST),
  );
  const remoteVitestConfigPath = quotePosix(
    path.posix.join(runnerProfile.ssh.remoteProjectPath, 'vitest.playground.config.ts'),
  );

  return [
    `if [ ! -d ${remoteProjectPath} ]; then echo "${REMOTE_PREFLIGHT_TAG}:missing-project"; exit 20; fi`,
    `if [ ! -f ${remoteEntrypointPath} ]; then echo "${REMOTE_PREFLIGHT_TAG}:missing-entrypoint"; exit 21; fi`,
    `if [ ! -f ${remoteVitestConfigPath} ]; then echo "${REMOTE_PREFLIGHT_TAG}:missing-vitest-config"; exit 22; fi`,
    `cd ${remoteProjectPath}`,
    `printf '${REMOTE_PREFLIGHT_TAG}:ok\\n%s\\n%s\\n%s\\n' "$(git rev-parse HEAD)" "$(node -v)" "$(npm -v)"`,
  ].join(' && ');
}

function createEmptyPreflightSummary(): ExternalComputePreflightSummary {
  return {
    sshAvailable: false,
    scpAvailable: false,
    batchModeEcho: false,
    remoteProjectPathExists: false,
    remoteEntrypointExists: false,
    remoteVitestConfigExists: false,
  };
}

function isAbortError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && ('cancelled' in error || 'name' in error)
    && (
      (error as CommandExecutionError).cancelled === true
      || (error as Error).name === 'AbortError'
    ),
  );
}

function isTimedOutError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ((error as CommandExecutionError).timedOut === true) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /timed out|timeout/i.test(message);
}

function formatErrorNote(error: unknown) {
  if (error instanceof Error) {
    const details = [
      error.message.trim(),
      ...(typeof (error as CommandExecutionError).stderr === 'string'
        ? [(error as CommandExecutionError).stderr?.trim() ?? '']
        : []),
      ...(typeof (error as CommandExecutionError).stdout === 'string'
        ? [(error as CommandExecutionError).stdout?.trim() ?? '']
        : []),
    ].filter(Boolean);

    return details.join('\n');
  }

  return String(error);
}

function truncateNote(note: string, maxLength = 600) {
  if (note.length <= maxLength) {
    return note;
  }

  return `${note.slice(0, maxLength - 3)}...`;
}

async function resolveExecutableAvailability(
  commandRunner: CommandRunner,
  commandName: string,
  signal?: AbortSignal,
) {
  const locatorCommand = process.platform === 'win32' ? 'where' : 'which';

  try {
    await commandRunner(locatorCommand, [commandName], { signal });
    return true;
  } catch {
    return false;
  }
}

async function collectLocalProvenance(): Promise<ExternalComputeProvenance> {
  const commandRunner = createCommandRunner();
  let gitCommitHash = 'unknown';
  let npmVersion = 'unknown';

  try {
    const gitResult = await commandRunner('git', ['rev-parse', 'HEAD']);
    gitCommitHash = gitResult.stdout.trim() || gitCommitHash;
  } catch {
    // Keep the fallback `unknown`.
  }

  try {
    const npmResult = await commandRunner('npm', ['-v']);
    npmVersion = npmResult.stdout.trim() || npmVersion;
  } catch {
    // Keep the fallback `unknown`.
  }

  return {
    gitCommitHash,
    nodeVersion: process.version,
    npmVersion,
  };
}

function parseRemotePreflightOutput(stdout: string) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0];

  if (!firstLine?.startsWith(`${REMOTE_PREFLIGHT_TAG}:`)) {
    return {
      status: 'unknown' as const,
    };
  }

  const status = firstLine.slice(`${REMOTE_PREFLIGHT_TAG}:`.length);
  if (status === 'ok' && lines.length >= 4) {
    return {
      status: 'ok' as const,
      provenance: {
        gitCommitHash: lines[1],
        nodeVersion: lines[2],
        npmVersion: lines[3],
      } satisfies ExternalComputeProvenance,
    };
  }

  return {
    status: status as 'missing-project' | 'missing-entrypoint' | 'missing-vitest-config' | 'unknown',
  };
}

function classifyRemoteRunFailure(error: unknown): ExternalComputeFailureClass {
  if (isTimedOutError(error)) {
    return 'remote-timeout';
  }

  const details = formatErrorNote(error);
  if (
    details.includes('Failed Tests')
    || details.includes('No test files found')
    || details.includes('external compute ssh remote entrypoint')
    || details.includes('RUN  v')
    || details.includes(REMOTE_SSH_ENTRYPOINT_TEST)
  ) {
    return 'remote-workload-failed';
  }

  return 'remote-launch-failed';
}

async function ensureFailureSummary(
  summaryPath: string,
  payload: {
    jobId: string;
    workloadId: string;
    runnerKind: ExternalComputeRunnerProfile['runnerKind'];
    status: ExternalComputeArtifactManifest['status'];
    failureClass?: ExternalComputeFailureClass;
    note: string;
  },
) {
  if (await pathExists(summaryPath)) {
    return;
  }

  await writeJsonFile(summaryPath, payload);
}

async function finalizeSshExecutionResult(
  context: ExternalComputeSshContext,
  result: {
    status: ExternalComputeArtifactManifest['status'];
    failureClass?: ExternalComputeFailureClass;
    note: string;
    parityReport: ExternalComputeParityReport;
  },
) {
  const finishedAt = new Date().toISOString();
  const manifest: ExternalComputeArtifactManifest = {
    ...context.baseManifest,
    status: result.status,
    failureClass: result.failureClass,
    finishedAt,
    durationMs: Math.max(0, Date.now() - Date.parse(context.baseManifest.startedAt)),
    note: result.note,
  };

  if (!result.parityReport.remoteSummaryPath) {
    result.parityReport.remoteSummaryPath = context.summaryPath;
  }
  if (!result.parityReport.comparisonProvenance) {
    result.parityReport.comparisonProvenance = {
      comparedFieldPaths: result.parityReport.comparedFields ?? [],
      remoteSummaryPath: result.parityReport.remoteSummaryPath,
      localSummaryPath: result.parityReport.localSummaryPath,
    };
  } else {
    result.parityReport.comparisonProvenance.remoteSummaryPath
      ??= result.parityReport.remoteSummaryPath;
    result.parityReport.comparisonProvenance.localSummaryPath
      ??= result.parityReport.localSummaryPath;
  }

  await ensureFailureSummary(context.summaryPath, {
    jobId: context.baseManifest.jobId,
    workloadId: context.baseManifest.workloadId,
    runnerKind: context.baseManifest.runnerKind,
    status: result.status,
    failureClass: result.failureClass,
    note: result.note,
  });
  await writeJsonFile(context.parityReportPath, result.parityReport);
  await writeJsonFile(context.manifestPath, manifest);

  return {
    manifest,
    manifestPath: context.manifestPath,
    summaryPath: context.summaryPath,
  } satisfies ExternalComputeExecutionResult;
}

async function executeTrackedStep<T>(
  options: ExternalComputeStepExecutionOptions,
  action: (
    stepSignal: AbortSignal,
    attempt: number,
  ) => Promise<T>,
): Promise<ExternalComputeStepOutcome<T>> {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const maxAttempts = Math.max(1, options.maxAttempts ?? 1);
  const controller = new AbortController();
  let timedOut = false;

  const handleParentAbort = () => {
    controller.abort(
      options.signal?.reason ?? createCommandError('Execution cancelled by operator.', {
        cancelled: true,
      }),
    );
  };
  if (options.signal) {
    if (options.signal.aborted) {
      handleParentAbort();
    } else {
      options.signal.addEventListener('abort', handleParentAbort, { once: true });
    }
  }

  const timeoutId = options.timeoutMs
    ? setTimeout(() => {
      timedOut = true;
      controller.abort(createCommandError(
        `${options.step} step timed out after ${options.timeoutMs}ms.`,
        { timedOut: true },
      ));
    }, options.timeoutMs)
    : undefined;

  let attempts = 0;
  let lastError: unknown;
  try {
    while (attempts < maxAttempts) {
      attempts += 1;

      try {
        const value = await action(controller.signal, attempts);
        options.stepResults.push({
          step: options.step,
          status: 'completed',
          attempts,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Math.max(0, Date.now() - startedAtMs),
          note: attempts > 1 ? `Completed after ${attempts} attempts.` : undefined,
        });
        return { value, attempts };
      } catch (error) {
        lastError = error;

        if (timedOut) {
          const timeoutError = createCommandError(
            `${options.step} step timed out after ${options.timeoutMs}ms.`,
            {
              cause: error,
              timedOut: true,
            },
          );
          options.stepResults.push({
            step: options.step,
            status: 'failed',
            attempts,
            startedAt,
            finishedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - startedAtMs),
            note: timeoutError.message,
          });
          throw timeoutError;
        }

        if (controller.signal.aborted || isAbortError(error)) {
          const cancelledError = createCommandError('Execution cancelled by operator.', {
            cause: error,
            cancelled: true,
          });
          options.stepResults.push({
            step: options.step,
            status: 'cancelled',
            attempts,
            startedAt,
            finishedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - startedAtMs),
            note: cancelledError.message,
          });
          throw cancelledError;
        }

        if (attempts >= maxAttempts) {
          options.stepResults.push({
            step: options.step,
            status: 'failed',
            attempts,
            startedAt,
            finishedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - startedAtMs),
            note: truncateNote(
              attempts > 1
                ? `Failed after ${attempts} attempts. ${formatErrorNote(error)}`
                : formatErrorNote(error),
            ),
          });
          throw error;
        }
      }
    }

    throw lastError ?? new Error(`Step ${options.step} failed.`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (options.signal) {
      options.signal.removeEventListener('abort', handleParentAbort);
    }
  }
}

function createSshBaselineProfile(
  runnerProfile: Extract<ExternalComputeRunnerProfile, { runnerKind: 'ssh' }>,
): Extract<ExternalComputeRunnerProfile, { runnerKind: 'local' }> {
  return {
    profileId: `${runnerProfile.profileId}-local-baseline`,
    runnerKind: 'local',
    description: `Local parity baseline for ${runnerProfile.profileId}.`,
    budgets: runnerProfile.budgets,
    local: {},
  };
}

function createSshBaselineJobSpec(jobSpec: ExternalComputeJobSpec): ExternalComputeJobSpec {
  return {
    jobId: `${jobSpec.jobId}-local-baseline`,
    workloadId: jobSpec.workloadId,
    runnerKind: 'local',
    profileId: `${jobSpec.profileId}-local-baseline`,
    input: jobSpec.input,
  };
}

export async function executeExternalComputeJob(
  jobSpec: ExternalComputeJobSpec,
  runnerProfile: ExternalComputeRunnerProfile,
  options: ExecuteExternalComputeJobOptions = {},
): Promise<ExternalComputeExecutionResult> {
  validateRunnerSelection(jobSpec, runnerProfile);

  const workloadRegistry = options.workloadRegistry ?? EXTERNAL_COMPUTE_WORKLOAD_REGISTRY;
  if (!workloadRegistry.get(jobSpec.workloadId)) {
    throw new Error(`Unknown external-compute workload id: ${jobSpec.workloadId}`);
  }

  const artifactRoot = resolveArtifactRoot(runnerProfile, options.artifactRoot);
  const jobDirectory = path.join(artifactRoot, sanitizePathSegment(jobSpec.jobId));
  await mkdir(jobDirectory, { recursive: true });

  if (runnerProfile.runnerKind === 'local') {
    return executeRegisteredWorkloadToDirectory(jobSpec, runnerProfile, {
      jobDirectory,
      workloadRegistry,
    });
  }

  const commandRunner = options.commandRunner ?? createCommandRunner();
  const inputDirectory = path.join(jobDirectory, 'input');
  const pulledBackDirectory = path.join(jobDirectory, 'pulled-back');
  const localBaselineDirectory = path.join(jobDirectory, 'local-baseline');
  const parityReportPath = path.join(jobDirectory, 'parity-report.json');
  const manifestPath = path.join(jobDirectory, 'artifact-manifest.json');
  const pulledBackSummaryPath = path.join(pulledBackDirectory, 'summary.json');
  const pulledBackManifestPath = path.join(pulledBackDirectory, 'artifact-manifest.json');
  const remoteJobDirectory = path.posix.join(
    runnerProfile.ssh.remoteProjectPath,
    '.task_tmp',
    'pgl5-external-compute',
    sanitizePathSegment(jobSpec.jobId),
  );
  const remoteInputDirectory = path.posix.join(remoteJobDirectory, 'input');
  const remoteJobSpecPath = path.posix.join(remoteInputDirectory, 'job-spec.json');
  const remoteRunnerProfilePath = path.posix.join(remoteInputDirectory, 'runner-profile.json');
  const remoteSummaryPath = path.posix.join(remoteJobDirectory, 'summary.json');
  const remoteManifestPath = path.posix.join(remoteJobDirectory, 'artifact-manifest.json');
  const summaryPath = pulledBackSummaryPath;
  const startedAt = new Date().toISOString();
  const stepResults: ExternalComputeStepResult[] = [];
  const localProvenance = await collectLocalProvenance();
  let remoteProvenance: ExternalComputeProvenance | undefined;
  const preflightSummary = createEmptyPreflightSummary();

  await mkdir(inputDirectory, { recursive: true });
  await mkdir(pulledBackDirectory, { recursive: true });

  const localJobSpecPath = path.join(inputDirectory, 'job-spec.json');
  const localRunnerProfilePath = path.join(inputDirectory, 'runner-profile.json');
  await writeJsonFile(localJobSpecPath, jobSpec);
  await writeJsonFile(localRunnerProfilePath, runnerProfile);

  const sshContext: ExternalComputeSshContext = {
    baseManifest: {
      jobId: jobSpec.jobId,
      workloadId: jobSpec.workloadId,
      runnerKind: runnerProfile.runnerKind,
      profileId: runnerProfile.profileId,
      startedAt,
      summaryPath,
      outputPaths: [
        pulledBackSummaryPath,
        pulledBackManifestPath,
        path.join(localBaselineDirectory, 'summary.json'),
        path.join(localBaselineDirectory, 'artifact-manifest.json'),
        parityReportPath,
      ],
      note: undefined,
      stepResults,
      preflight: preflightSummary,
      localProvenance,
      remoteProvenance,
      remoteExecution: {
        hostAlias: runnerProfile.ssh.hostAlias,
        remoteProjectPath: runnerProfile.ssh.remoteProjectPath,
        remoteJobDirectory,
        pulledBackOutputPaths: [pulledBackSummaryPath, pulledBackManifestPath],
        parityReportPath,
      },
    },
    manifestPath,
    summaryPath,
    parityReportPath,
  };

  const preflightTimeoutMs = runnerProfile.reliability.preflightTimeoutSeconds * 1000;
  const uploadTimeoutMs = runnerProfile.reliability.uploadTimeoutSeconds * 1000;
  const remoteRunTimeoutMs = runnerProfile.reliability.remoteRunTimeoutSeconds * 1000;
  const pullbackTimeoutMs = runnerProfile.reliability.pullbackTimeoutSeconds * 1000;

  try {
    await executeTrackedStep({
      step: 'preflight',
      stepResults,
      timeoutMs: preflightTimeoutMs,
      signal: options.signal,
    }, async (stepSignal) => {
      preflightSummary.sshAvailable = await resolveExecutableAvailability(
        commandRunner,
        'ssh',
        stepSignal,
      );
      preflightSummary.scpAvailable = await resolveExecutableAvailability(
        commandRunner,
        'scp',
        stepSignal,
      );

      if (!preflightSummary.sshAvailable || !preflightSummary.scpAvailable) {
        const missing = [
          ...(!preflightSummary.sshAvailable ? ['ssh'] : []),
          ...(!preflightSummary.scpAvailable ? ['scp'] : []),
        ];
        throw new Error(`Missing required local command(s): ${missing.join(', ')}`);
      }

      const batchModeResult = await commandRunner('ssh', [
        '-o',
        'BatchMode=yes',
        runnerProfile.ssh.hostAlias,
        'echo ok',
      ], { signal: stepSignal });
      if (!batchModeResult.stdout.includes('ok')) {
        throw new Error(
          `Batch-mode ssh check against ${runnerProfile.ssh.hostAlias} did not return "ok".`,
        );
      }
      preflightSummary.batchModeEcho = true;

      const remotePreflightResult = await commandRunner('ssh', [
        runnerProfile.ssh.hostAlias,
        buildRemoteShellInvocation(
          runnerProfile,
          buildRemotePreflightCommand(runnerProfile),
        ),
      ], { signal: stepSignal });
      const parsedRemotePreflight = parseRemotePreflightOutput(remotePreflightResult.stdout);
      if (parsedRemotePreflight.status !== 'ok') {
        if (parsedRemotePreflight.status === 'missing-project') {
          throw new Error(
            `Remote project path ${runnerProfile.ssh.remoteProjectPath} does not exist on ${runnerProfile.ssh.hostAlias}.`,
          );
        }

        preflightSummary.remoteProjectPathExists = true;
        if (parsedRemotePreflight.status === 'missing-entrypoint') {
          throw new Error(
            `Remote entrypoint ${REMOTE_SSH_ENTRYPOINT_TEST} is missing under ${runnerProfile.ssh.remoteProjectPath}.`,
          );
        }

        preflightSummary.remoteEntrypointExists = true;
        if (parsedRemotePreflight.status === 'missing-vitest-config') {
          throw new Error(
            `Remote vitest.playground.config.ts is missing under ${runnerProfile.ssh.remoteProjectPath}.`,
          );
        }

        throw new Error(
          `Unable to verify the remote project layout under ${runnerProfile.ssh.remoteProjectPath}.`,
        );
      }

      preflightSummary.remoteProjectPathExists = true;
      preflightSummary.remoteEntrypointExists = true;
      preflightSummary.remoteVitestConfigExists = true;
      remoteProvenance = parsedRemotePreflight.provenance;
      sshContext.baseManifest.remoteProvenance = remoteProvenance;
    });
  } catch (error) {
    return finalizeSshExecutionResult(sshContext, {
      status: isAbortError(error) ? 'cancelled' : 'failed',
      failureClass: isAbortError(error) ? 'cancelled' : 'preflight-failed',
      note: isAbortError(error)
        ? 'SSH VM hardening run was cancelled during preflight.'
        : 'Preflight checks failed before any remote upload started.',
      parityReport: {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: `Preflight failure: ${truncateNote(formatErrorNote(error))}`,
      },
    });
  }

  try {
    await executeTrackedStep({
      step: 'upload',
      stepResults,
      timeoutMs: uploadTimeoutMs,
      maxAttempts: runnerProfile.reliability.uploadRetries + 1,
      signal: options.signal,
    }, async (stepSignal) => {
      await commandRunner('ssh', [
        runnerProfile.ssh.hostAlias,
        buildRemoteShellInvocation(
          runnerProfile,
          `mkdir -p ${quotePosix(remoteInputDirectory)}`,
        ),
      ], { signal: stepSignal });
      await commandRunner('scp', [
        localJobSpecPath,
        localRunnerProfilePath,
        `${runnerProfile.ssh.hostAlias}:${remoteInputDirectory}/`,
      ], { signal: stepSignal });
    });
  } catch (error) {
    return finalizeSshExecutionResult(sshContext, {
      status: isAbortError(error) ? 'cancelled' : 'failed',
      failureClass: isAbortError(error) ? 'cancelled' : 'upload-failed',
      note: isAbortError(error)
        ? 'SSH VM hardening run was cancelled during upload.'
        : 'Upload failure prevented the SSH VM hardening run from starting remotely.',
      parityReport: {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: `Upload failure: ${truncateNote(formatErrorNote(error))}`,
      },
    });
  }

  try {
    await executeTrackedStep({
      step: 'remote-run',
      stepResults,
      timeoutMs: remoteRunTimeoutMs,
      signal: options.signal,
    }, async (stepSignal) => {
      await commandRunner('ssh', [
        runnerProfile.ssh.hostAlias,
        buildRemoteShellInvocation(
          runnerProfile,
          buildRemoteSshCommand(
            runnerProfile,
            remoteJobSpecPath,
            remoteRunnerProfilePath,
            remoteJobDirectory,
          ),
        ),
      ], { signal: stepSignal });
    });
  } catch (error) {
    const failureClass = isAbortError(error)
      ? 'cancelled'
      : classifyRemoteRunFailure(error);
    return finalizeSshExecutionResult(sshContext, {
      status: isAbortError(error) ? 'cancelled' : 'failed',
      failureClass,
      note: isAbortError(error)
        ? 'SSH VM hardening run was cancelled during the remote workload step.'
        : failureClass === 'remote-timeout'
          ? 'The remote workload exceeded the configured SSH VM timeout.'
          : failureClass === 'remote-launch-failed'
            ? 'Remote launch failure prevented the SSH VM workload from starting cleanly.'
            : 'Remote workload failure prevented completion of the SSH VM hardening run.',
      parityReport: {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: `${failureClass}: ${truncateNote(formatErrorNote(error))}`,
      },
    });
  }

  try {
    await executeTrackedStep({
      step: 'pullback',
      stepResults,
      timeoutMs: pullbackTimeoutMs,
      maxAttempts: runnerProfile.reliability.pullbackRetries + 1,
      signal: options.signal,
    }, async (stepSignal) => {
      await commandRunner('scp', [
        `${runnerProfile.ssh.hostAlias}:${remoteManifestPath}`,
        `${runnerProfile.ssh.hostAlias}:${remoteSummaryPath}`,
        pulledBackDirectory,
      ], { signal: stepSignal });
    });
  } catch (error) {
    return finalizeSshExecutionResult(sshContext, {
      status: isAbortError(error) ? 'cancelled' : 'failed',
      failureClass: isAbortError(error) ? 'cancelled' : 'pullback-failed',
      note: isAbortError(error)
        ? 'SSH VM hardening run was cancelled during artifact pullback.'
        : 'Pullback failure prevented remote artifacts from being retrieved locally.',
      parityReport: {
        resultClass: 'pullback-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: `Pullback failure: ${truncateNote(formatErrorNote(error))}`,
      },
    });
  }

  const [pulledBackManifest, pulledBackSummary] = await Promise.all([
    readJsonFile(pulledBackManifestPath),
    readJsonFile(pulledBackSummaryPath),
  ]);
  const parsedRemoteManifest = pulledBackManifest as ExternalComputeArtifactManifest;

  if (parsedRemoteManifest.status !== 'completed') {
    return finalizeSshExecutionResult(sshContext, {
      status: 'failed',
      failureClass: 'remote-workload-failed',
      note: 'Remote workload completed transport successfully, but its artifact manifest was not completed.',
      parityReport: {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: 'Pulled-back remote manifest was not completed.',
      },
    });
  }

  let localBaselineSummaryPath = '';
  let parityReport: ExternalComputeParityReport;
  try {
    const parityStep = await executeTrackedStep({
      step: 'local-parity',
      stepResults,
      signal: options.signal,
    }, async () => {
      const baselineProfile = createSshBaselineProfile(runnerProfile);
      const baselineJobSpec = createSshBaselineJobSpec(jobSpec);
      const localBaselineResult = await executeRegisteredWorkloadToDirectory(
        baselineJobSpec,
        baselineProfile,
        {
          jobDirectory: localBaselineDirectory,
          workloadRegistry,
        },
      );
      const localBaselineSummary = await readJsonFile(localBaselineResult.summaryPath);
      const report = compareSymbolicSearchParity(
        jobSpec.workloadId,
        pulledBackSummary as { summary?: unknown },
        localBaselineSummary as { summary?: unknown },
      );
      report.remoteSummaryPath = pulledBackSummaryPath;
      report.localSummaryPath = localBaselineResult.summaryPath;
      report.comparisonProvenance = {
        comparedFieldPaths: report.comparedFields ?? [],
        remoteSummaryPath: pulledBackSummaryPath,
        localSummaryPath: localBaselineResult.summaryPath,
      };

      return {
        localBaselineSummaryPath: localBaselineResult.summaryPath,
        parityReport: report,
      };
    });

    localBaselineSummaryPath = parityStep.value.localBaselineSummaryPath;
    parityReport = parityStep.value.parityReport;
  } catch (error) {
    return finalizeSshExecutionResult(sshContext, {
      status: isAbortError(error) ? 'cancelled' : 'failed',
      failureClass: isAbortError(error) ? 'cancelled' : 'parity-mismatch',
      note: isAbortError(error)
        ? 'SSH VM hardening run was cancelled during local parity validation.'
        : 'Local parity validation did not finish cleanly after the remote run completed.',
      parityReport: {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        localSummaryPath: localBaselineSummaryPath || undefined,
        note: `Local parity failure: ${truncateNote(formatErrorNote(error))}`,
      },
    });
  }

  if (parityReport.resultClass !== 'match') {
    return finalizeSshExecutionResult(sshContext, {
      status: 'failed',
      failureClass: 'parity-mismatch',
      note: 'SSH remote run completed, but the pulled-back summary did not match the local parity baseline.',
      parityReport,
    });
  }

  return finalizeSshExecutionResult(sshContext, {
    status: 'completed',
    note: 'SSH remote run completed with pulled-back artifacts and a matching local parity report.',
    parityReport,
  });
}
