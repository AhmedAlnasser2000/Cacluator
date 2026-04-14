import { mkdir, readFile } from 'node:fs/promises';
import {
  parseExternalComputeJobSpec,
  parseExternalComputeRunnerProfile,
} from './contracts';
import { executeRegisteredWorkloadToDirectory } from './workload-execution';

type RemoteEntrypointEnv = {
  PGL_REMOTE_JOB_SPEC_PATH?: string;
  PGL_REMOTE_RUNNER_PROFILE_PATH?: string;
  PGL_REMOTE_JOB_DIRECTORY?: string;
};

function getRequiredEnv(env: RemoteEntrypointEnv, name: keyof RemoteEntrypointEnv): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required remote entrypoint env: ${name}`);
  }
  return value;
}

async function readJson(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as unknown;
}

export async function executeRemoteExternalComputeJobEntrypoint(
  env: RemoteEntrypointEnv = process.env,
) {
  const jobSpecPath = getRequiredEnv(env, 'PGL_REMOTE_JOB_SPEC_PATH');
  const runnerProfilePath = getRequiredEnv(env, 'PGL_REMOTE_RUNNER_PROFILE_PATH');
  const jobDirectory = getRequiredEnv(env, 'PGL_REMOTE_JOB_DIRECTORY');

  const jobSpec = parseExternalComputeJobSpec(await readJson(jobSpecPath));
  const runnerProfile = parseExternalComputeRunnerProfile(await readJson(runnerProfilePath));

  if (jobSpec.runnerKind !== 'ssh' || runnerProfile.runnerKind !== 'ssh') {
    throw new Error('Remote external-compute entrypoint only supports ssh runner inputs.');
  }

  await mkdir(jobDirectory, { recursive: true });

  return executeRegisteredWorkloadToDirectory(jobSpec, runnerProfile, {
    jobDirectory,
  });
}
