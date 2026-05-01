import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_FIELDS = [
  'mirror_id',
  'title',
  'upstream_url',
  'license',
  'status',
  'intended_value',
  'allowed_use',
  'forbidden_use',
  'contamination_risk',
  'local_mirror_path',
  'capture_commit',
  'capture_date',
  'downstream_notes',
];

export const ALLOWED_SOURCE_MIRROR_STATUSES = ['planned', 'active', 'paused', 'retired'];
export const ALLOWED_TRACKED_MIRROR_FILES = ['playground/sources/mirrors/.gitkeep'];

function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseFlatYaml(text, filePath = 'metadata.yaml') {
  const data = {};

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      throw new Error(`${filePath}:${index + 1} is not a supported flat YAML key/value line`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue
      .replace(/^"(.*)"$/, '$1')
      .replace(/^'(.*)'$/, '$1');

    data[key] = value;
  }

  return data;
}

function assertRequiredFields(metadata, metadataPath) {
  for (const field of REQUIRED_FIELDS) {
    if (!metadata[field]) {
      throw new Error(`${metadataPath} is missing required field "${field}"`);
    }
  }
}

function assertUrl(value, metadataPath) {
  if (!/^https?:\/\/\S+$/u.test(value)) {
    throw new Error(`${metadataPath} upstream_url must be an http(s) URL`);
  }
}

function assertMirrorPath(metadata, metadataPath) {
  const expectedPath = `playground/sources/mirrors/${metadata.mirror_id}/`;
  const mirrorPath = normalizeRepoPath(metadata.local_mirror_path);

  if (mirrorPath !== expectedPath) {
    throw new Error(`${metadataPath} local_mirror_path must be "${expectedPath}"`);
  }
}

function assertMetadata(metadata, metadataPath, fileName) {
  assertRequiredFields(metadata, metadataPath);

  if (!ALLOWED_SOURCE_MIRROR_STATUSES.includes(metadata.status)) {
    throw new Error(`${metadataPath} has invalid status "${metadata.status}"`);
  }

  const expectedId = fileName.replace(/\.ya?ml$/u, '');
  if (metadata.mirror_id !== expectedId) {
    throw new Error(`${metadataPath} mirror_id must match file name "${expectedId}"`);
  }

  assertUrl(metadata.upstream_url, metadataPath);
  assertMirrorPath(metadata, metadataPath);
}

export function readSourceMirrorRegistry(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const sourcesDir = options.sourcesDir ?? 'playground/sources';
  const metadataDir = path.join(rootDir, sourcesDir, 'metadata');

  if (!existsSync(metadataDir)) {
    throw new Error(`Missing source mirror metadata directory: ${normalizeRepoPath(path.join(sourcesDir, 'metadata'))}`);
  }

  const files = readdirSync(metadataDir)
    .filter((fileName) => fileName.endsWith('.yaml') || fileName.endsWith('.yml'))
    .sort();

  const seenIds = new Set();
  const mirrors = [];

  for (const fileName of files) {
    const repoPath = normalizeRepoPath(path.join(sourcesDir, 'metadata', fileName));
    const metadata = parseFlatYaml(readFileSync(path.join(rootDir, repoPath), 'utf8'), repoPath);
    assertMetadata(metadata, repoPath, fileName);

    if (seenIds.has(metadata.mirror_id)) {
      throw new Error(`Duplicate source mirror id "${metadata.mirror_id}"`);
    }
    seenIds.add(metadata.mirror_id);

    mirrors.push({
      mirrorId: metadata.mirror_id,
      title: metadata.title,
      upstreamUrl: metadata.upstream_url,
      license: metadata.license,
      status: metadata.status,
      localMirrorPath: normalizeRepoPath(metadata.local_mirror_path),
      metadataPath: repoPath,
      intendedValue: metadata.intended_value,
      allowedUse: metadata.allowed_use,
      forbiddenUse: metadata.forbidden_use,
      contaminationRisk: metadata.contamination_risk,
      captureCommit: metadata.capture_commit,
      captureDate: metadata.capture_date,
      downstreamNotes: metadata.downstream_notes,
    });
  }

  return mirrors;
}

export function assertSourceMirrorIndex(registry, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const indexPath = options.indexPath ?? 'playground/sources/INDEX.md';
  const fullPath = path.join(rootDir, indexPath);

  if (!existsSync(fullPath)) {
    throw new Error(`Missing source mirror index: ${indexPath}`);
  }

  const text = readFileSync(fullPath, 'utf8');
  for (const mirror of registry) {
    for (const requiredText of [
      `\`${mirror.mirrorId}\``,
      `./metadata/${mirror.mirrorId}.yaml`,
      `\`${mirror.localMirrorPath}\``,
    ]) {
      if (!text.includes(requiredText)) {
        throw new Error(`${indexPath} is missing ${requiredText} for ${mirror.mirrorId}`);
      }
    }
  }
}

export function listTrackedMirrorFiles(rootDir = process.cwd()) {
  const output = execFileSync('git', ['ls-files', 'playground/sources/mirrors'], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeRepoPath);
}

export function assertNoTrackedMirrorPayloads(trackedFiles) {
  const unexpected = trackedFiles.filter((filePath) => !ALLOWED_TRACKED_MIRROR_FILES.includes(filePath));

  if (unexpected.length > 0) {
    throw new Error(`Source mirror payloads must not be tracked: ${unexpected.join(', ')}`);
  }
}

function walkFiles(rootDir, predicate, baseDir = rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  for (const dirent of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate, baseDir));
    } else if (predicate(fullPath)) {
      files.push(normalizeRepoPath(path.relative(baseDir, fullPath)));
    }
  }

  return files;
}

export function assertNoStableSourceMirrorRefs(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const srcDir = options.srcDir ?? 'src';
  const fullSrcDir = path.join(rootDir, srcDir);
  const sourceFiles = walkFiles(
    fullSrcDir,
    (filePath) => /\.(?:ts|tsx|js|jsx)$/u.test(filePath),
    rootDir,
  );

  const offenders = [];
  for (const repoPath of sourceFiles) {
    const text = readFileSync(path.join(rootDir, repoPath), 'utf8');
    if (text.includes('playground/sources')) {
      offenders.push(repoPath);
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Stable src files must not reference playground/sources: ${offenders.join(', ')}`);
  }
}

export function validateSourceMirrors(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const registry = readSourceMirrorRegistry({ rootDir });
  assertSourceMirrorIndex(registry, { rootDir });
  assertNoTrackedMirrorPayloads(options.trackedMirrorFiles ?? listTrackedMirrorFiles(rootDir));
  assertNoStableSourceMirrorRefs({ rootDir });
  return registry;
}
