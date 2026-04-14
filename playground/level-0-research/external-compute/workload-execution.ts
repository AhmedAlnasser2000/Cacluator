import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type ExternalComputeArtifactManifest,
  type ExternalComputeRemoteExecutionMetadata,
  type ExternalComputeJobSpec,
  type ExternalComputeRunnerProfile,
} from './contracts';
import {
  EXTERNAL_COMPUTE_WORKLOAD_REGISTRY,
  type ExternalComputeWorkloadRegistration,
} from './workloads';

export type ExternalComputeWorkloadExecutionResult = {
  manifest: ExternalComputeArtifactManifest;
  manifestPath: string;
  summaryPath: string;
};

type ExecuteRegisteredWorkloadOptions = {
  jobDirectory: string;
  workloadRegistry?: Map<string, ExternalComputeWorkloadRegistration>;
  remoteExecution?: ExternalComputeRemoteExecutionMetadata;
};

async function writeJsonFile(filePath: string, payload: unknown) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function executeRegisteredWorkloadToDirectory(
  jobSpec: ExternalComputeJobSpec,
  runnerProfile: ExternalComputeRunnerProfile,
  options: ExecuteRegisteredWorkloadOptions,
): Promise<ExternalComputeWorkloadExecutionResult> {
  const workloadRegistry = options.workloadRegistry ?? EXTERNAL_COMPUTE_WORKLOAD_REGISTRY;
  const workload = workloadRegistry.get(jobSpec.workloadId);
  if (!workload) {
    throw new Error(`Unknown external-compute workload id: ${jobSpec.workloadId}`);
  }

  await mkdir(options.jobDirectory, { recursive: true });

  const summaryPath = path.join(options.jobDirectory, 'summary.json');
  const manifestPath = path.join(options.jobDirectory, 'artifact-manifest.json');
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  const workloadResult = await workload.executeLocal(jobSpec.input);
  const finishedAt = new Date().toISOString();
  const manifest: ExternalComputeArtifactManifest = {
    jobId: jobSpec.jobId,
    workloadId: jobSpec.workloadId,
    runnerKind: runnerProfile.runnerKind,
    profileId: runnerProfile.profileId,
    status: 'completed',
    startedAt,
    finishedAt,
    durationMs: Date.now() - startedAtMs,
    summaryPath,
    outputPaths: [summaryPath],
    note: workloadResult.note,
    remoteExecution: options.remoteExecution,
  };

  await writeJsonFile(summaryPath, {
    jobId: jobSpec.jobId,
    workloadId: jobSpec.workloadId,
    runnerKind: runnerProfile.runnerKind,
    status: manifest.status,
    note: workloadResult.note ?? null,
    summary: workloadResult.summary,
  });
  await writeJsonFile(manifestPath, manifest);

  return { manifest, manifestPath, summaryPath };
}
