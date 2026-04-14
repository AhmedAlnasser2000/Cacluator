import { z } from 'zod';

export const ExternalComputeRunnerKindSchema = z.enum(['local', 'ssh']);

export const ExternalComputeBudgetSchema = z.object({
  maxRuntimeSeconds: z.number().int().positive(),
  maxOutputBytes: z.number().int().positive().optional(),
}).strict();

const LocalRunnerDetailsSchema = z.object({
  workingDirectory: z.string().min(1).optional(),
  artifactRoot: z.string().min(1).optional(),
}).strict();

const SshRunnerDetailsSchema = z.object({
  hostAlias: z.string().min(1),
  remoteWorkspaceRoot: z.string().min(1),
  remoteProjectPath: z.string().min(1),
  remoteShell: z.string().min(1).default('bash'),
}).strict();

export const ExternalComputeSshReliabilitySchema = z.object({
  preflightTimeoutSeconds: z.number().int().positive(),
  uploadTimeoutSeconds: z.number().int().positive(),
  remoteRunTimeoutSeconds: z.number().int().positive(),
  pullbackTimeoutSeconds: z.number().int().positive(),
  uploadRetries: z.number().int().nonnegative(),
  pullbackRetries: z.number().int().nonnegative(),
}).strict();

export const ExternalComputeRunnerProfileSchema = z.discriminatedUnion('runnerKind', [
  z.object({
    profileId: z.string().min(1),
    runnerKind: z.literal('local'),
    description: z.string().min(1),
    budgets: ExternalComputeBudgetSchema.optional(),
    local: LocalRunnerDetailsSchema.optional(),
  }).strict(),
  z.object({
    profileId: z.string().min(1),
    runnerKind: z.literal('ssh'),
    description: z.string().min(1),
    budgets: ExternalComputeBudgetSchema.optional(),
    ssh: SshRunnerDetailsSchema,
    reliability: ExternalComputeSshReliabilitySchema,
  }).strict(),
]);

export const ExternalComputeJobSpecSchema = z.object({
  jobId: z.string().min(1),
  workloadId: z.string().min(1),
  runnerKind: ExternalComputeRunnerKindSchema,
  profileId: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const ExternalComputeRunStatusSchema = z.enum([
  'completed',
  'failed',
  'cancelled',
]);

export const ExternalComputeFailureClassSchema = z.enum([
  'preflight-failed',
  'upload-failed',
  'remote-launch-failed',
  'remote-timeout',
  'remote-workload-failed',
  'pullback-failed',
  'parity-mismatch',
  'cancelled',
]);

export const ExternalComputeStepNameSchema = z.enum([
  'preflight',
  'upload',
  'remote-run',
  'pullback',
  'local-parity',
]);

export const ExternalComputeStepStatusSchema = z.enum([
  'completed',
  'failed',
  'cancelled',
]);

const ExternalComputeStepResultSchema = z.object({
  step: ExternalComputeStepNameSchema,
  status: ExternalComputeStepStatusSchema,
  attempts: z.number().int().positive(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  note: z.string().min(1).optional(),
}).strict();

const ExternalComputePreflightSummarySchema = z.object({
  sshAvailable: z.boolean(),
  scpAvailable: z.boolean(),
  batchModeEcho: z.boolean(),
  remoteProjectPathExists: z.boolean(),
  remoteEntrypointExists: z.boolean(),
  remoteVitestConfigExists: z.boolean(),
}).strict();

const ExternalComputeProvenanceSchema = z.object({
  gitCommitHash: z.string().min(1),
  nodeVersion: z.string().min(1),
  npmVersion: z.string().min(1),
}).strict();

export const ExternalComputeArtifactManifestSchema = z.object({
  jobId: z.string().min(1),
  workloadId: z.string().min(1),
  runnerKind: ExternalComputeRunnerKindSchema,
  profileId: z.string().min(1),
  status: ExternalComputeRunStatusSchema,
  failureClass: ExternalComputeFailureClassSchema.optional(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  summaryPath: z.string().min(1),
  outputPaths: z.array(z.string()),
  note: z.string().min(1).optional(),
  stepResults: z.array(ExternalComputeStepResultSchema).default([]),
  preflight: ExternalComputePreflightSummarySchema.optional(),
  localProvenance: ExternalComputeProvenanceSchema.optional(),
  remoteProvenance: ExternalComputeProvenanceSchema.optional(),
  remoteExecution: z.object({
    hostAlias: z.string().min(1),
    remoteProjectPath: z.string().min(1),
    remoteJobDirectory: z.string().min(1),
    pulledBackOutputPaths: z.array(z.string()),
    parityReportPath: z.string().min(1),
  }).strict().optional(),
}).strict();

export type ExternalComputeRunnerKind = z.infer<typeof ExternalComputeRunnerKindSchema>;
export type ExternalComputeRunnerProfile = z.infer<typeof ExternalComputeRunnerProfileSchema>;
export type ExternalComputeJobSpec = z.infer<typeof ExternalComputeJobSpecSchema>;
export type ExternalComputeRunStatus = z.infer<typeof ExternalComputeRunStatusSchema>;
export type ExternalComputeFailureClass = z.infer<typeof ExternalComputeFailureClassSchema>;
export type ExternalComputeStepName = z.infer<typeof ExternalComputeStepNameSchema>;
export type ExternalComputeStepStatus = z.infer<typeof ExternalComputeStepStatusSchema>;
export type ExternalComputeArtifactManifest = z.infer<typeof ExternalComputeArtifactManifestSchema>;
export type ExternalComputeRemoteExecutionMetadata = NonNullable<
  ExternalComputeArtifactManifest['remoteExecution']
>;
export type ExternalComputeSshReliability = z.infer<typeof ExternalComputeSshReliabilitySchema>;
export type ExternalComputeStepResult = z.infer<typeof ExternalComputeStepResultSchema>;
export type ExternalComputePreflightSummary = z.infer<typeof ExternalComputePreflightSummarySchema>;
export type ExternalComputeProvenance = z.infer<typeof ExternalComputeProvenanceSchema>;

export function parseExternalComputeRunnerProfile(input: unknown): ExternalComputeRunnerProfile {
  return ExternalComputeRunnerProfileSchema.parse(input);
}

export function parseExternalComputeJobSpec(input: unknown): ExternalComputeJobSpec {
  return ExternalComputeJobSpecSchema.parse(input);
}

export function parseExternalComputeArtifactManifest(
  input: unknown,
): ExternalComputeArtifactManifest {
  return ExternalComputeArtifactManifestSchema.parse(input);
}
