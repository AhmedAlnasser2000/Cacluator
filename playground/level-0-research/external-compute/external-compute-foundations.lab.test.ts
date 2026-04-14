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
        note: 'Executed through a mock symbolic-search workload for PGL5 lab coverage.',
      }),
    },
  ]);
}

function createSshRunnerProfile() {
  return parseExternalComputeRunnerProfile({
    profileId: 'ssh-vm-pilot-template',
    runnerKind: 'ssh',
    description: 'User-owned VM SSH profile for PGL5.',
    budgets: {
      maxRuntimeSeconds: 1800,
      maxOutputBytes: 1048576,
    },
    ssh: {
      hostAlias: 'calcwiz-box',
      remoteWorkspaceRoot: '/home/ahmed/calcwiz-playground',
      remoteProjectPath: '/home/ahmed/calcwiz-playground/Calculator',
      remoteShell: 'bash',
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

describe('external compute lab', () => {
  it('parses the checked-in runner profile and job spec templates', async () => {
    const runnerProfileTemplate = await readJsonFile(
      path.resolve(
        process.cwd(),
        'playground/level-0-research/external-compute/profiles/runner-profile.template.json',
      ),
    );
    const jobSpecTemplate = await readJsonFile(
      path.resolve(
        process.cwd(),
        'playground/level-0-research/external-compute/jobs/job-spec.template.json',
      ),
    );

    const parsedRunnerProfile = parseExternalComputeRunnerProfile(runnerProfileTemplate);
    const parsedJobSpec = parseExternalComputeJobSpec(jobSpecTemplate);

    expect(parsedRunnerProfile.runnerKind).toBe('ssh');
    expect(parsedRunnerProfile.ssh.hostAlias).toContain('replace-with-your-ssh-config-alias');
    expect(parsedRunnerProfile.ssh.remoteProjectPath).toContain('/Calculator');
    expect(parsedJobSpec.workloadId).toBe('sym-search-planner-ordering');
    expect(parsedJobSpec.runnerKind).toBe('local');
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

  it('executes one ssh pilot run, pulls back remote artifacts, and writes a parity match report', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-ssh-pilot-match';
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

          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing scp pullback destination.');
            }

            await mkdir(destinationDirectory, { recursive: true });
            await writeFile(
              path.join(destinationDirectory, 'artifact-manifest.json'),
              `${JSON.stringify({
                jobId,
                workloadId: 'sym-search-planner-ordering',
                runnerKind: 'ssh',
                profileId: 'ssh-vm-pilot-template',
                status: 'completed',
                startedAt: '2026-04-14T12:00:00.000Z',
                finishedAt: '2026-04-14T12:00:01.000Z',
                durationMs: 1000,
                summaryPath: '/home/ahmed/calcwiz-playground/Calculator/.task_tmp/pgl5-external-compute/sym-search-planner-ordering-ssh-pilot-match/summary.json',
                outputPaths: ['/home/ahmed/calcwiz-playground/Calculator/.task_tmp/pgl5-external-compute/sym-search-planner-ordering-ssh-pilot-match/summary.json'],
                note: 'Remote ssh pilot completed.',
              }, null, 2)}\n`,
            );
            await writeFile(
              path.join(destinationDirectory, 'summary.json'),
              `${JSON.stringify({
                jobId,
                workloadId: 'sym-search-planner-ordering',
                runnerKind: 'ssh',
                status: 'completed',
                note: 'Remote ssh pilot completed.',
                summary: sampleSummary,
              }, null, 2)}\n`,
            );
          }

          return {
            stdout: '',
            stderr: '',
          };
        },
      },
    );

    const manifest = parseExternalComputeArtifactManifest(await readJsonFile(result.manifestPath));
    const parityReport = await readJsonFile(
      manifest.remoteExecution?.parityReportPath ?? path.join(jobDirectory, 'parity-report.json'),
    );

    expect(manifest.status).toBe('completed');
    expect(manifest.summaryPath).toContain(path.join('pulled-back', 'summary.json'));
    expect(manifest.remoteExecution?.hostAlias).toBe('calcwiz-box');
    expect(manifest.remoteExecution?.remoteProjectPath).toBe('/home/ahmed/calcwiz-playground/Calculator');
    expect(manifest.remoteExecution?.pulledBackOutputPaths).toContain(
      path.join(jobDirectory, 'pulled-back', 'summary.json'),
    );
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

  it('classifies ssh launch failures as remote-failed', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-ssh-launch-failure';
    const jobDirectory = path.join(artifactRoot, jobId);

    await rm(jobDirectory, { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async () => {
          throw new Error('ssh unreachable');
        },
      },
    );

    const manifest = parseExternalComputeArtifactManifest(await readJsonFile(result.manifestPath));
    const parityReport = await readJsonFile(path.join(jobDirectory, 'parity-report.json'));

    expect(manifest.status).toBe('failed');
    expect(manifest.note).toContain('SSH launch failure');
    expect(parityReport).toMatchObject({
      resultClass: 'remote-failed',
      workloadId: 'sym-search-planner-ordering',
    });
  });

  it('classifies remote workload failures as remote-failed', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-remote-failure';
    let sshInvocationCount = 0;

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command) => {
          if (command === 'ssh') {
            sshInvocationCount += 1;
            if (sshInvocationCount === 2) {
              throw new Error('remote entrypoint failed');
            }
          }
          return {
            stdout: '',
            stderr: '',
          };
        },
      },
    );

    const parityReport = await readJsonFile(path.join(artifactRoot, jobId, 'parity-report.json'));

    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.note).toContain('Remote workload failure');
    expect(parityReport).toMatchObject({
      resultClass: 'remote-failed',
      workloadId: 'sym-search-planner-ordering',
    });
  });

  it('classifies pullback failures as pullback-failed', async () => {
    const artifactRoot = path.resolve(process.cwd(), DEFAULT_EXTERNAL_COMPUTE_SSH_ARTIFACT_ROOT);
    const jobId = 'sym-search-planner-ordering-pullback-failure';
    let scpInvocationCount = 0;

    await rm(path.join(artifactRoot, jobId), { recursive: true, force: true });

    const result = await executeExternalComputeJob(
      createSshJobSpec(jobId),
      createSshRunnerProfile(),
      {
        artifactRoot,
        workloadRegistry: createMockWorkloadRegistry(),
        commandRunner: async (command) => {
          if (command === 'scp') {
            scpInvocationCount += 1;
            if (scpInvocationCount === 2) {
              throw new Error('unable to pull artifacts');
            }
          }
          return {
            stdout: '',
            stderr: '',
          };
        },
      },
    );

    const parityReport = await readJsonFile(path.join(artifactRoot, jobId, 'parity-report.json'));

    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.note).toContain('Pullback failure');
    expect(parityReport).toMatchObject({
      resultClass: 'pullback-failed',
      workloadId: 'sym-search-planner-ordering',
    });
  });

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
          if (
            command === 'scp'
            && args.some((value) => value.includes(':') && value.endsWith('/artifact-manifest.json'))
          ) {
            const destinationDirectory = args.at(-1);
            if (!destinationDirectory) {
              throw new Error('Missing scp pullback destination.');
            }

            await mkdir(destinationDirectory, { recursive: true });
            await writeFile(
              path.join(destinationDirectory, 'artifact-manifest.json'),
              `${JSON.stringify({
                jobId,
                workloadId: 'sym-search-planner-ordering',
                runnerKind: 'ssh',
                profileId: 'ssh-vm-pilot-template',
                status: 'completed',
                startedAt: '2026-04-14T12:00:00.000Z',
                finishedAt: '2026-04-14T12:00:01.000Z',
                durationMs: 1000,
                summaryPath: '/home/ahmed/calcwiz-playground/Calculator/.task_tmp/pgl5-external-compute/sym-search-planner-ordering-parity-mismatch/summary.json',
                outputPaths: ['/home/ahmed/calcwiz-playground/Calculator/.task_tmp/pgl5-external-compute/sym-search-planner-ordering-parity-mismatch/summary.json'],
                note: 'Remote ssh pilot completed.',
              }, null, 2)}\n`,
            );
            await writeFile(
              path.join(destinationDirectory, 'summary.json'),
              `${JSON.stringify({
                jobId,
                workloadId: 'sym-search-planner-ordering',
                runnerKind: 'ssh',
                status: 'completed',
                note: 'Remote ssh pilot completed.',
                summary: remoteSummary,
              }, null, 2)}\n`,
            );
          }

          return {
            stdout: '',
            stderr: '',
          };
        },
      },
    );

    const manifest = parseExternalComputeArtifactManifest(await readJsonFile(result.manifestPath));
    const parityReport = await readJsonFile(path.join(artifactRoot, jobId, 'parity-report.json'));

    expect(manifest.status).toBe('failed');
    expect(parityReport).toMatchObject({
      resultClass: 'mismatch',
      workloadId: 'sym-search-planner-ordering',
    });
  });
});
