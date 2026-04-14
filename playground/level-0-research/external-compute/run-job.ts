import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  type ExternalComputeArtifactManifest,
  type ExternalComputeJobSpec,
  type ExternalComputeRunnerProfile,
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

const execFile = promisify(execFileCallback);

export const DEFAULT_EXTERNAL_COMPUTE_ARTIFACT_ROOT = '.task_tmp/pgl4-external-compute';
export const DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT = '.task_tmp/pgl5-external-compute';
export const REMOTE_SSH_ENTRYPOINT_TEST =
  'playground/level-0-research/external-compute/remote-ssh-entrypoint.lab.test.ts';

export type ExternalComputeExecutionResult = {
  manifest: ExternalComputeArtifactManifest;
  manifestPath: string;
  summaryPath: string;
};

type ExecuteExternalComputeJobOptions = {
  artifactRoot?: string;
  workloadRegistry?: Map<string, ExternalComputeWorkloadRegistration>;
  commandRunner?: CommandRunner;
};

type CommandRunner = (
  command: string,
  args: string[],
  options?: {
    cwd?: string;
  },
) => Promise<{
  stdout: string;
  stderr: string;
}>;

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

function quotePosix(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function createCommandRunner(): CommandRunner {
  return async (command, args, options = {}) => execFile(command, args, {
    cwd: options.cwd,
    windowsHide: true,
  });
}

function buildRemoteSshCommand(
  runnerProfile: Extract<ExternalComputeRunnerProfile, { runnerKind: 'ssh' }>,
  remoteJobSpecPath: string,
  remoteRunnerProfilePath: string,
  remoteJobDirectory: string,
): string {
  const envPrefix = [
    `PGL_REMOTE_JOB_SPEC_PATH=${quotePosix(remoteJobSpecPath)}`,
    `PGL_REMOTE_RUNNER_PROFILE_PATH=${quotePosix(remoteRunnerProfilePath)}`,
    `PGL_REMOTE_JOB_DIRECTORY=${quotePosix(remoteJobDirectory)}`,
  ].join(' ');

  return [
    `cd ${quotePosix(runnerProfile.ssh.remoteProjectPath)}`,
    `${envPrefix} npm exec vitest run --config vitest.playground.config.ts ${quotePosix(REMOTE_SSH_ENTRYPOINT_TEST)}`,
  ].join(' && ');
}

async function createFailedSshResult(
  manifestPath: string,
  summaryPath: string,
  baseManifest: Omit<ExternalComputeArtifactManifest, 'status' | 'finishedAt' | 'durationMs' | 'note'>,
  note: string,
  parityReport: ExternalComputeParityReport,
): Promise<ExternalComputeExecutionResult> {
  const finishedAt = new Date().toISOString();
  const manifest: ExternalComputeArtifactManifest = {
    ...baseManifest,
    status: 'failed',
    finishedAt,
    durationMs: Math.max(0, Date.now() - Date.parse(baseManifest.startedAt)),
    note,
  };

  await writeJsonFile(summaryPath, {
    jobId: baseManifest.jobId,
    workloadId: baseManifest.workloadId,
    runnerKind: baseManifest.runnerKind,
    status: manifest.status,
    note,
  });
  await writeJsonFile(manifestPath, manifest);
  await writeJsonFile(baseManifest.remoteExecution?.parityReportPath ?? path.join(path.dirname(manifestPath), 'parity-report.json'), parityReport);

  return {
    manifest,
    manifestPath,
    summaryPath,
  };
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
  const baseManifest: Omit<
    ExternalComputeArtifactManifest,
    'status' | 'finishedAt' | 'durationMs' | 'note'
  > = {
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
    remoteExecution: {
      hostAlias: runnerProfile.ssh.hostAlias,
      remoteProjectPath: runnerProfile.ssh.remoteProjectPath,
      remoteJobDirectory,
      pulledBackOutputPaths: [pulledBackSummaryPath, pulledBackManifestPath],
      parityReportPath,
    },
  };

  await mkdir(inputDirectory, { recursive: true });
  await mkdir(pulledBackDirectory, { recursive: true });

  const localJobSpecPath = path.join(inputDirectory, 'job-spec.json');
  const localRunnerProfilePath = path.join(inputDirectory, 'runner-profile.json');
  await writeJsonFile(localJobSpecPath, jobSpec);
  await writeJsonFile(localRunnerProfilePath, runnerProfile);

  try {
    await commandRunner('ssh', [
      runnerProfile.ssh.hostAlias,
      runnerProfile.ssh.remoteShell,
      '-lc',
      `mkdir -p ${quotePosix(remoteInputDirectory)}`,
    ]);
    await commandRunner('scp', [
      localJobSpecPath,
      localRunnerProfilePath,
      `${runnerProfile.ssh.hostAlias}:${remoteInputDirectory}/`,
    ]);
  } catch (error) {
    return createFailedSshResult(
      manifestPath,
      summaryPath,
      baseManifest,
      'SSH launch failure prevented remote job upload or directory preparation.',
      {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        note: `SSH launch failure: ${error instanceof Error ? error.message : String(error)}`,
      },
    );
  }

  try {
    await commandRunner('ssh', [
      runnerProfile.ssh.hostAlias,
      runnerProfile.ssh.remoteShell,
      '-lc',
      buildRemoteSshCommand(
        runnerProfile,
        remoteJobSpecPath,
        remoteRunnerProfilePath,
        remoteJobDirectory,
      ),
    ]);
  } catch (error) {
    return createFailedSshResult(
      manifestPath,
      summaryPath,
      baseManifest,
      'Remote workload failure prevented completion of the SSH pilot run.',
      {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        note: `Remote workload failure: ${error instanceof Error ? error.message : String(error)}`,
      },
    );
  }

  try {
    await commandRunner('scp', [
      `${runnerProfile.ssh.hostAlias}:${remoteManifestPath}`,
      `${runnerProfile.ssh.hostAlias}:${remoteSummaryPath}`,
      pulledBackDirectory,
    ]);
  } catch (error) {
    return createFailedSshResult(
      manifestPath,
      summaryPath,
      baseManifest,
      'Pullback failure prevented remote artifacts from being retrieved locally.',
      {
        resultClass: 'pullback-failed',
        workloadId: jobSpec.workloadId,
        note: `Pullback failure: ${error instanceof Error ? error.message : String(error)}`,
      },
    );
  }

  const pulledBackManifest = readJsonFile(pulledBackManifestPath);
  const pulledBackSummary = readJsonFile(pulledBackSummaryPath);
  const [remoteManifest, remoteSummary] = await Promise.all([
    pulledBackManifest,
    pulledBackSummary,
  ]);
  const parsedRemoteManifest = remoteManifest as ExternalComputeArtifactManifest;

  if (parsedRemoteManifest.status !== 'completed') {
    return createFailedSshResult(
      manifestPath,
      summaryPath,
      baseManifest,
      'Remote workload did not produce a completed artifact manifest.',
      {
        resultClass: 'remote-failed',
        workloadId: jobSpec.workloadId,
        remoteSummaryPath: pulledBackSummaryPath,
        note: 'Pulled-back remote manifest was not completed.',
      },
    );
  }

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
  const parityReport = compareSymbolicSearchParity(
    jobSpec.workloadId,
    remoteSummary as { summary?: unknown },
    localBaselineSummary as { summary?: unknown },
  );
  parityReport.remoteSummaryPath = pulledBackSummaryPath;
  parityReport.localSummaryPath = localBaselineResult.summaryPath;

  await writeJsonFile(parityReportPath, parityReport);

  const finishedAt = new Date().toISOString();
  const manifest: ExternalComputeArtifactManifest = {
    ...baseManifest,
    status: parityReport.resultClass === 'match' ? 'completed' : 'failed',
    finishedAt,
    durationMs: Math.max(0, Date.now() - Date.parse(startedAt)),
    note: parityReport.resultClass === 'match'
      ? 'SSH remote run completed with pulled-back artifacts and a matching local parity report.'
      : 'SSH remote run completed, but the pulled-back summary did not match the local parity baseline.',
  };

  await writeJsonFile(manifestPath, manifest);

  return {
    manifest,
    manifestPath,
    summaryPath,
  };
}
