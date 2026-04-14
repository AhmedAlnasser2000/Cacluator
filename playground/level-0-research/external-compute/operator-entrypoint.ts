import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseExternalComputeJobSpec,
  parseExternalComputeRunnerProfile,
} from './contracts';
import { executeExternalComputeJob } from './run-job';

type OperatorArguments = {
  profilePath: string;
  jobPath: string;
};

function parseOperatorArguments(argv: string[]): OperatorArguments {
  let profilePath = '';
  let jobPath = '';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--profile') {
      profilePath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (argument === '--job') {
      jobPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    throw new Error(`Unknown playground:ssh-vm argument: ${argument}`);
  }

  if (!profilePath) {
    throw new Error('Missing required --profile <path> argument.');
  }
  if (!jobPath) {
    throw new Error('Missing required --job <path> argument.');
  }

  return {
    profilePath: path.resolve(process.cwd(), profilePath),
    jobPath: path.resolve(process.cwd(), jobPath),
  };
}

async function readJsonFile(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as unknown;
}

async function main() {
  const { profilePath, jobPath } = parseOperatorArguments(process.argv.slice(2));
  const [profilePayload, jobPayload] = await Promise.all([
    readJsonFile(profilePath),
    readJsonFile(jobPath),
  ]);

  const runnerProfile = parseExternalComputeRunnerProfile(profilePayload);
  const jobSpec = parseExternalComputeJobSpec(jobPayload);
  if (runnerProfile.runnerKind !== 'ssh') {
    throw new Error('playground:ssh-vm only supports ssh runner profiles.');
  }

  const abortController = new AbortController();
  const handleSigint = () => {
    if (!abortController.signal.aborted) {
      process.stderr.write('Interrupt received, cancelling SSH VM run...\n');
      abortController.abort(new Error('Interrupted by operator.'));
    }
  };

  process.on('SIGINT', handleSigint);
  try {
    const result = await executeExternalComputeJob(jobSpec, runnerProfile, {
      signal: abortController.signal,
    });

    process.stdout.write(`${JSON.stringify({
      manifestPath: result.manifestPath,
      summaryPath: result.summaryPath,
      status: result.manifest.status,
      failureClass: result.manifest.failureClass ?? null,
      note: result.manifest.note,
      parityReportPath: result.manifest.remoteExecution?.parityReportPath ?? null,
      remoteExecution: result.manifest.remoteExecution ?? null,
      stepResults: result.manifest.stepResults,
    }, null, 2)}\n`);

    process.exitCode = result.manifest.status === 'completed' ? 0 : 1;
  } finally {
    process.off('SIGINT', handleSigint);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
