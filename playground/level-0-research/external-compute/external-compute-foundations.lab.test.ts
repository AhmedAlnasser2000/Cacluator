import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseExternalComputeArtifactManifest,
  parseExternalComputeJobSpec,
  parseExternalComputeRunnerProfile,
} from './contracts';
import {
  DEFAULT_EXTERNAL_COMPUTE_ARTIFACT_ROOT,
  DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT,
  executeExternalComputeJob,
} from './run-job';
import { createExternalComputeWorkloadRegistry } from './workloads';

async function readJsonFile(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as unknown;
}

function createSampleSymbolicSearchSummary() {
  return {
    corpusSize: 1,
    baselineParityMismatches: [],
    orderings: {
      'recursive-first': {
        summary: {
          classificationCounts: {
            same_effective_outcome: 1,
            exact_improvement: 0,
            exact_regression: 0,
            preference_regression: 0,
            honesty_regression: 0,
            trace_only_difference: 0,
          },
          cleanerBoundedPathWins: 0,
          exactImprovements: [],
          regressions: [],
        },
        comparisons: [{
          caseId: 'sample-case',
          baselineWinningStage: 'composition',
          alternateWinningStage: 'composition',
          baselineAttemptCount: 3,
          alternateAttemptCount: 3,
          classification: 'same_effective_outcome',
        }],
      },
      'trig-rewrite-first': {
        summary: {
          classificationCounts: {
            same_effective_outcome: 1,
            exact_improvement: 0,
            exact_regression: 0,
            preference_regression: 0,
            honesty_regression: 0,
            trace_only_difference: 0,
          },
          cleanerBoundedPathWins: 0,
          exactImprovements: [],
          regressions: [],
        },
        comparisons: [{
          caseId: 'sample-case',
          baselineWinningStage: 'composition',
          alternateWinningStage: 'composition',
          baselineAttemptCount: 3,
          alternateAttemptCount: 3,
          classification: 'same_effective_outcome',
        }],
      },
    },
  };
}

function createMockWorkloadRegistry(summary = createSampleSymbolicSearchSummary()) {
  return createExternalComputeWorkloadRegistry([
    {
      workloadId: 'sym-search-planner-ordering',
      title: 'Symbolic Search Planner Ordering and Heuristic Ranking',
      laneTopic: 'symbolic-search',
      executeLocal: () => ({
        summary,
        note: 'Executed through a mock symbolic-search workload for external-compute lab coverage.',
      }),
    },
  ]);
}

function createSshRunnerProfile(overrides: Partial<{
  remoteProjectPath: string;
  reliability: Partial<{
    preflightTimeoutSeconds: number;
    uploadTimeoutSeconds: number;
    remoteRunTimeoutSeconds: number;
    pullbackTimeoutSeconds: number;
    uploadRetries: number;
    pullbackRetries: number;
  }>;
}> = {}) {
  return parseExternalComputeRunnerProfile({
    profileId: 'ssh-vm-pilot-template',
    runnerKind: 'ssh',
    description: 'User-owned VM SSH profile for PGL5+.',
    budgets: {
      maxRuntimeSeconds: 1800,
      maxOutputBytes: 1048576,
    },
    ssh: {
      hostAlias: 'calcwiz-box',
      remoteWorkspaceRoot: '/home/ahmed/calcwiz-playground',
      remoteProjectPath: overrides.remoteProjectPath ?? '/home/ahmed/calcwiz-playground/Calculator',
      remoteShell: 'bash',
    },
    reliability: {
      preflightTimeoutSeconds: 5,
      uploadTimeoutSeconds: 5,
      remoteRunTimeoutSeconds: 5,
      pullbackTimeoutSeconds: 5,
      uploadRetries: 1,
      pullbackRetries: 1,
      ...overrides.reliability,
    },
  });
}

function createSshJobSpec(jobId: string) {
  return parseExternalComputeJobSpec({
    jobId,
    workloadId: 'sym-search-planner-ordering',
    runnerKind: 'ssh',
    profileId: 'ssh-vm-pilot-template',
    input: {},
  });
}

function createTimeoutError(message: string) {
  return Object.assign(new Error(message), { timedOut: true });
}

async function writeRemoteArtifacts(
  destinationDirectory: string,
  jobId: string,
  summary = createSampleSymbolicSearchSummary(),
  manifestStatus: 'completed' | 'failed' = 'completed',
) {
  await mkdir(destinationDirectory, { recursive: true });
  await writeFile(
    path.join(destinationDirectory, 'artifact-manifest.json'),
    `${JSON.stringify({
      jobId,
      workloadId: 'sym-search-planner-ordering',
      runnerKind: 'ssh',
      profileId: 'ssh-vm-pilot-template',
      status: manifestStatus,
      startedAt: '2026-04-14T12:00:00.000Z',
      finishedAt: '2026-04-14T12:00:01.000Z',
      durationMs: 1000,
      summaryPath: `/remote/${jobId}/summary.json`,
      outputPaths: [`/remote/${jobId}/summary.json`],
      note: manifestStatus === 'completed' ? 'Remote ssh pilot completed.' : 'Remote ssh pilot failed.',
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(destinationDirectory, 'summary.json'),
    `${JSON.stringify({
      jobId,
      workloadId: 'sym-search-planner-ordering',
      runnerKind: 'ssh',
      status: manifestStatus,
      note: manifestStatus === 'completed' ? 'Remote ssh pilot completed.' : 'Remote ssh pilot failed.',
      summary,
    }, null, 2)}\n`,
  );
}

describe('external compute lab', () => {
  it('parses the checked-in runner profile and job spec templates', async () => {
    const runnerProfileTemplate = await readJsonFile(
      path.resolve(
        process.cwd(),
        'playground/level-0-research/external-compute/profiles/runner-profile.template.json',
      ),
    );
    const localJobSpecTemplate = await readJsonFile(
      path.resolve(
        process.cwd(),
        'playground/level-0-research/external-compute/jobs/job-spec.template.json',
      ),
    );
    const sshJobSpecTemplate = await readJsonFile(
      path.resolve(
        process.cwd(),
        'playground/level-0-research/external-compute/jobs/job-spec.ssh-vm.template.json',
      ),
    );

    const parsedRunnerProfile = parseExternalComputeRunnerProfile(runnerProfileTemplate);
    const parsedLocalJobSpec = parseExternalComputeJobSpec(localJobSpecTemplate);
    const parsedSshJobSpec = parseExternalComputeJobSpec(sshJobSpecTemplate);

    expect(parsedRunnerProfile.runnerKind).toBe('ssh');
    expect(parsedRunnerProfile.ssh.hostAlias).toContain('replace-with-your-ssh-config-alias');
    expect(parsedRunnerProfile.reliability.remoteRunTimeoutSeconds).toBeGreaterThan(0);
    expect(parsedLocalJobSpec.runnerKind).toBe('local');
    expect(parsedSshJobSpec.runnerKind).toBe('ssh');
    expect(parsedSshJobSpec.workloadId).toBe('sym-search-planner-ordering');
  });

  it('rejects missing remoteProjectPath for ssh profiles', () => {
    expect(() => parseExternalComputeRunnerProfile({
      profileId: 'broken-ssh-template',
      runnerKind: 'ssh',
      description: 'Broken profile.',
      ssh: {
        hostAlias: 'calcwiz-box',
        remoteWorkspaceRoot: '/home/ahmed/calcwiz-playground',
        remoteShell: 'bash',
      },
      reliability: {
        preflightTimeoutSeconds: 5,
        uploadTimeoutSeconds: 5,
        remoteRunTimeoutSeconds: 5,
        pullbackTimeoutSeconds: 5,
        uploadRetries: 1,
        pullbackRetries: 1,
      },
    })).toThrow();
  });

  it('rejects duplicate workload ids', () => {
    expect(() => createExternalComputeWorkloadRegistry([
      {
        workloadId: 'duplicate-workload',
        title: 'A',
        laneTopic: 'test',
        executeLocal: () => ({ summary: { ok: true } }),
      },
      {
        workloadId: 'duplicate-workload',
        title: 'B',
        laneTopic: 'test',
        executeLocal: () => ({ summary: { ok: true } }),
      },
    ])).toThrow('Duplicate external-compute workload id: duplicate-workload');
  });

  it('rejects unknown workload ids during execution', async () => {
    const runnerProfile = parseExternalComputeRunnerProfile({
      profileId: 'local-foundations-template',
      runnerKind: 'local',
      description: 'Local foundations runner for PGL4.',
      budgets: {
        maxRuntimeSeconds: 120,
      },
      local: {},
    });
    const jobSpec = parseExternalComputeJobSpec({
      jobId: 'unknown-workload-proof',
      workloadId: 'missing-workload',
      runnerKind: 'local',
      profileId: 'local-foundations-template',
      input: {},
    });

    await expect(executeExternalComputeJob(jobSpec, runnerProfile)).rejects.toThrow(
      'Unknown external-compute workload id: missing-workload',
    );
  });

  it('executes the registered symbolic-search workload locally and writes structured artifacts', { timeout: 20_000 }, async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-local-proof';
    const jobDirectory = path.join(artifactRoot, jobId);

    await rm(jobDirectory, { recursive: true, force: true });

    const runnerProfile = parseExternalComputeRunnerProfile({
      profileId: 'local-foundations-template',
      runnerKind: 'local',
      description: 'Local foundations runner for PGL4.',
      budgets: {
        maxRuntimeSeconds: 120,
      },
      local: {},
    });
    const jobSpec = parseExternalComputeJobSpec({
      jobId,
      workloadId: 'sym-search-planner-ordering',
      runnerKind: 'local',
      profileId: 'local-foundations-template',
      input: {},
    });

    const result = await executeExternalComputeJob(jobSpec, runnerProfile);
    const manifest = parseExternalComputeArtifactManifest(await readJsonFile(result.manifestPath));
    const summary = await readJsonFile(result.summaryPath);

    expect(manifest.status).toBe('completed');
    expect(manifest.outputPaths).toContain(result.summaryPath);
    expect(summary).toMatchObject({
      jobId,
      workloadId: 'sym-search-planner-ordering',
      runnerKind: 'local',
      status: 'completed',
    });
    await expect(stat(result.manifestPath)).resolves.toBeDefined();
    await expect(stat(result.summaryPath)).resolves.toBeDefined();
  });

  it('executes one ssh hardening run, pulls back remote artifacts, and writes a parity match report', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-ssh-hardening-match';
    const jobDirectory = path.join(artifactRoot, jobId);
    const sampleSummary = createSampleSymbolicSearchSummary();
    const workloadRegistry = createMockWorkloadRegistry(sampleSummary);
    const commandCalls: Array<{ command: string; args: string[] }> = [];

    await rm(jobDirectory, { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry,
        commandRunner: async (command, args) => {
          commandCalls.push({ command, args });

          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }

          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }

          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return {
              stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n',
              stderr: '',
            };
          }

          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing scp pullback destination.');
            }

            await writeRemoteArtifacts(destinationDirectory, jobId, sampleSummary);
          }

          return { stdout: '', stderr: '' };
        },
      },
    );

    const manifest = parseExternalComputeArtifactManifest(await readJsonFile(result.manifestPath));
    const parityReport = await readJsonFile(
      manifest.remoteExecution?.parityReportPath ?? path.join(jobDirectory, 'parity-report.json'),
    );

    expect(manifest.status).toBe('completed');
    expect(manifest.preflight).toMatchObject({
      sshAvailable: true,
      scpAvailable: true,
      batchModeEcho: true,
      remoteProjectPathExists: true,
      remoteEntrypointExists: true,
      remoteVitestConfigExists: true,
    });
    expect(manifest.remoteProvenance).toMatchObject({
      gitCommitHash: 'remote-commit',
      nodeVersion: 'v22.22.2',
      npmVersion: '10.9.7',
    });
    expect(parityReport).toMatchObject({
      resultClass: 'match',
      workloadId: 'sym-search-planner-ordering',
    });
    expect(commandCalls.some((call) => (
      call.command === 'ssh'
      && call.args.join(' ').includes('/home/ahmed/calcwiz-playground/Calculator')
    ))).toBe(true);
    expect(commandCalls.some((call) => (
      call.command === 'scp'
      && call.args.some((value) => value.endsWith('pulled-back'))
    ))).toBe(true);
  });

  it('classifies preflight failures before upload starts', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-preflight-failure';

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command, args) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            throw new Error('batch mode ssh failed');
          }
          return { stdout: '', stderr: '' };
        },
      },
    );

    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.failureClass).toBe('preflight-failed');
    expect(result.manifest.stepResults.at(-1)?.step).toBe('preflight');
  });

  it('retries upload once and succeeds on the second attempt', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-upload-retry';
    let uploadAttempts = 0;

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command, args) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return { stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n', stderr: '' };
          }
          if (
            command === 'scp'
            && args.some((value) => value.endsWith('/input/'))
          ) {
            uploadAttempts += 1;
            if (uploadAttempts === 1) {
              throw new Error('temporary upload failure');
            }
          }
          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing pullback destination.');
            }
            await writeRemoteArtifacts(destinationDirectory, jobId);
          }

          return { stdout: '', stderr: '' };
        },
      },
    );

    const uploadStep = result.manifest.stepResults.find((step) => step.step === 'upload');
    expect(result.manifest.status).toBe('completed');
    expect(uploadStep?.attempts).toBe(2);
    expect(uploadAttempts).toBe(2);
  });

  it('retries pullback once and succeeds on the second attempt', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-pullback-retry';
    let pullbackAttempts = 0;

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command, args) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return { stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n', stderr: '' };
          }
          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            pullbackAttempts += 1;
            if (pullbackAttempts === 1) {
              throw new Error('temporary pullback failure');
            }

            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing pullback destination.');
            }
            await writeRemoteArtifacts(destinationDirectory, jobId);
          }

          return { stdout: '', stderr: '' };
        },
      },
    );

    const pullbackStep = result.manifest.stepResults.find((step) => step.step === 'pullback');
    expect(result.manifest.status).toBe('completed');
    expect(pullbackStep?.attempts).toBe(2);
    expect(pullbackAttempts).toBe(2);
  });

  it('classifies remote timeouts distinctly from other remote failures', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-remote-timeout';

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command, args) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return { stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('mkdir -p')) {
            return { stdout: '', stderr: '' };
          }
          if (command === 'ssh') {
            throw createTimeoutError('remote run timed out');
          }

          return { stdout: '', stderr: '' };
        },
      },
    );

    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.failureClass).toBe('remote-timeout');
  });

  it('marks the run as cancelled when the caller aborts locally', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-cancelled';
    const abortController = new AbortController();

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const resultPromise = executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        signal: abortController.signal,
        commandRunner: async (command, args, options) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return { stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n', stderr: '' };
          }
          if (command === 'scp' && args.some((value) => value.endsWith('/input/'))) {
            await new Promise<void>((resolve, reject) => {
              if (options?.signal?.aborted) {
                reject(Object.assign(new Error('cancelled'), { cancelled: true }));
                return;
              }
              options?.signal?.addEventListener('abort', () => {
                reject(Object.assign(new Error('cancelled'), { cancelled: true }));
              }, { once: true });
            });
          }
          return { stdout: '', stderr: '' };
        },
      },
    );

    setTimeout(() => abortController.abort(new Error('Interrupted by operator.')), 25);
    const result = await resultPromise;

    expect(result.manifest.status).toBe('cancelled');
    expect(result.manifest.failureClass).toBe('cancelled');
    expect(result.manifest.stepResults.some((step) => step.status === 'cancelled')).toBe(true);
  }, 10_000);

  it('classifies parity mismatches after a successful pullback', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-parity-mismatch';
    const remoteSummary = createSampleSymbolicSearchSummary();
    remoteSummary.orderings['recursive-first'].summary.cleanerBoundedPathWins = 2;

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(createSampleSymbolicSearchSummary()),
        commandRunner: async (command, args) => {
          if (command === 'where') {
            return { stdout: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', stderr: '' };
          }
          if (command === 'ssh' && args[0] === '-o') {
            return { stdout: 'ok\n', stderr: '' };
          }
          if (command === 'ssh' && args.join(' ').includes('__PGL_PREFLIGHT__')) {
            return { stdout: '__PGL_PREFLIGHT__:ok\nremote-commit\nv22.22.2\n10.9.7\n', stderr: '' };
          }
          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing pullback destination.');
            }
            await writeRemoteArtifacts(destinationDirectory, jobId, remoteSummary);
          }

          return { stdout: '', stderr: '' };
        },
      },
    );

    const parityReport = await readJsonFile(path.join(artifactRoot, jobId, 'parity-report.json'));

    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.failureClass).toBe('parity-mismatch');
    expect(parityReport).toMatchObject({
      resultClass: 'mismatch',
      workloadId: 'sym-search-planner-ordering',
      firstMismatch: {
        field: 'orderings',
      },
    });
  });
});
