import { describe, expect, it } from 'vitest';
import { executeRemoteExternalComputeJobEntrypoint } from './remote-entrypoint';

const hasRemoteEntrypointEnv = Boolean(
  process.env.PGL_REMOTE_JOB_SPEC_PATH
  && process.env.PGL_REMOTE_RUNNER_PROFILE_PATH
  && process.env.PGL_REMOTE_JOB_DIRECTORY,
);

const describeRemoteEntrypoint = hasRemoteEntrypointEnv ? describe : describe.skip;

describeRemoteEntrypoint('external compute ssh remote entrypoint', () => {
  it('executes the requested remote workload and writes artifacts', async () => {
    const result = await executeRemoteExternalComputeJobEntrypoint();

    expect(result.manifest.status).toBe('completed');
  });
});
