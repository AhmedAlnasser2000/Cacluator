import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  assertNoStableSourceMirrorRefs,
  assertNoTrackedMirrorPayloads,
  readSourceMirrorRegistry,
  validateSourceMirrors,
} from './source-mirrors-core.mjs';

function makeRoot() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-source-mirrors-'));
  mkdirSync(path.join(rootDir, 'playground/sources/metadata'), { recursive: true });
  mkdirSync(path.join(rootDir, 'playground/sources/mirrors'), { recursive: true });
  mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  writeFileSync(path.join(rootDir, 'playground/sources/mirrors/.gitkeep'), '');
  return rootDir;
}

function writeMetadata(rootDir, id, overrides = {}) {
  const data = {
    mirror_id: id,
    title: 'Sample CAS',
    upstream_url: 'https://example.test/sample',
    license: 'Sample License',
    status: 'planned',
    intended_value: 'Context lessons.',
    allowed_use: 'Context only.',
    forbidden_use: 'No dependency.',
    contamination_risk: 'Risk note.',
    local_mirror_path: `playground/sources/mirrors/${id}/`,
    capture_commit: 'TBD',
    capture_date: 'TBD',
    downstream_notes: 'No downstream notes yet.',
    ...overrides,
  };

  writeFileSync(
    path.join(rootDir, `playground/sources/metadata/${id}.yaml`),
    Object.entries(data).map(([key, value]) => `${key}: "${value}"`).join('\n'),
  );
}

function writeIndex(rootDir, id = 'sample') {
  writeFileSync(
    path.join(rootDir, 'playground/sources/INDEX.md'),
    [
      '# Playground Source Mirror Index',
      '',
      '| mirror_id | title | status | metadata | local mirror path | primary Calcwiz value |',
      '| --- | --- | --- | --- | --- | --- |',
      `| \`${id}\` | Sample CAS | \`planned\` | [metadata](./metadata/${id}.yaml) | \`playground/sources/mirrors/${id}/\` | Context lessons. |`,
      '',
    ].join('\n'),
  );
}

describe('source mirror registry validation', () => {
  it('accepts a complete source mirror registry without clone payloads', () => {
    const rootDir = makeRoot();
    writeMetadata(rootDir, 'sample');
    writeIndex(rootDir);

    const registry = validateSourceMirrors({
      rootDir,
      trackedMirrorFiles: ['playground/sources/mirrors/.gitkeep'],
    });

    assert.equal(registry.length, 1);
    assert.equal(registry[0].mirrorId, 'sample');
  });

  it('rejects missing required metadata fields', () => {
    const rootDir = makeRoot();
    writeMetadata(rootDir, 'sample', { forbidden_use: '' });

    assert.throws(
      () => readSourceMirrorRegistry({ rootDir }),
      /missing required field "forbidden_use"/,
    );
  });

  it('rejects mirror paths outside the registered mirror containment path', () => {
    const rootDir = makeRoot();
    writeMetadata(rootDir, 'sample', { local_mirror_path: 'playground/sources/mirrors/other/' });

    assert.throws(
      () => readSourceMirrorRegistry({ rootDir }),
      /local_mirror_path must be "playground\/sources\/mirrors\/sample\/"/,
    );
  });

  it('rejects duplicate mirror ids', () => {
    const rootDir = makeRoot();
    writeMetadata(rootDir, 'sample');
    writeFileSync(
      path.join(rootDir, 'playground/sources/metadata/other.yaml'),
      [
        'mirror_id: "sample"',
        'title: "Other"',
        'upstream_url: "https://example.test/other"',
        'license: "Sample License"',
        'status: "planned"',
        'intended_value: "Context lessons."',
        'allowed_use: "Context only."',
        'forbidden_use: "No dependency."',
        'contamination_risk: "Risk note."',
        'local_mirror_path: "playground/sources/mirrors/sample/"',
        'capture_commit: "TBD"',
        'capture_date: "TBD"',
        'downstream_notes: "No downstream notes yet."',
      ].join('\n'),
    );

    assert.throws(
      () => readSourceMirrorRegistry({ rootDir }),
      /mirror_id must match file name "other"/,
    );
  });

  it('rejects tracked mirror payloads beyond the placeholder', () => {
    assert.throws(
      () => assertNoTrackedMirrorPayloads([
        'playground/sources/mirrors/.gitkeep',
        'playground/sources/mirrors/fricas/README.md',
      ]),
      /Source mirror payloads must not be tracked/,
    );
  });

  it('rejects stable src references to playground sources', () => {
    const rootDir = makeRoot();
    writeFileSync(
      path.join(rootDir, 'src/bad.ts'),
      "export const path = 'playground/sources/mirrors/fricas';\n",
    );

    assert.throws(
      () => assertNoStableSourceMirrorRefs({ rootDir }),
      /Stable src files must not reference playground\/sources/,
    );
  });
});
