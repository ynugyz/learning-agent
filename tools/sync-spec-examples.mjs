/**
 * One-shot: sync each spec's canonical example with its authoritative fixture.
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * The fixtures in `tests/contracts/<contract>/valid.json` are the canonical
 * examples and are asserted to validate. The spec documents embed the same JSON
 * so a reader sees exactly what the validator sees. Hand-maintaining two copies
 * guarantees drift, so the spec block is rewritten from the fixture.
 *
 * Usage:  node tools/sync-spec-examples.mjs
 *
 * @packageDocumentation
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * For each contract: the spec file, the fixture, and the exact opening line of
 * the fenced block that must be replaced. Anchoring on the opening line (plus
 * the closing fence) keeps this from touching any other JSON block.
 */
const targets = [
  {
    contract: 'semantic-card',
    spec: 'specs/semantic-card-v0.1.md',
    heading: '## 6. Example instance',
  },
  {
    contract: 'source-map',
    spec: 'specs/source-map-v0.1.md',
    heading: '## 7. Example instance',
  },
  {
    contract: 'agent-runtime',
    spec: 'specs/agent-runtime-v0.1.md',
    heading: '### 8.1 Request (with a schema — the structured-module case)',
  },
  {
    contract: 'run-manifest',
    spec: 'specs/run-manifest-v0.1.md',
    heading: '## 7. Example instance',
  },
];

let failures = 0;

for (const target of targets) {
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, `tests/contracts/${target.contract}/valid.json`), 'utf8'),
  );
  const specPath = join(repoRoot, target.spec);
  const spec = readFileSync(specPath, 'utf8');

  const headingIndex = spec.indexOf(target.heading);
  if (headingIndex < 0) {
    console.error(`FAIL  ${target.spec}: heading not found: ${target.heading}`);
    failures++;
    continue;
  }

  const fenceStart = spec.indexOf('```json', headingIndex);
  if (fenceStart < 0) {
    console.error(`FAIL  ${target.spec}: no json fence after heading`);
    failures++;
    continue;
  }

  const fenceEnd = spec.indexOf('```', fenceStart + '```json'.length);
  if (fenceEnd < 0) {
    console.error(`FAIL  ${target.spec}: unterminated json fence`);
    failures++;
    continue;
  }

  const block = JSON.stringify(fixture, null, 2);
  const updated =
    spec.slice(0, fenceStart + '```json'.length) +
    '\n' +
    block +
    '\n' +
    spec.slice(fenceEnd);

  writeFileSync(specPath, updated, 'utf8');
  console.log(`OK    ${target.spec} <- tests/contracts/${target.contract}/valid.json`);
}

if (failures > 0) {
  console.error(`\n${failures} spec example(s) NOT synced`);
  process.exit(1);
}
console.log('\nall spec examples synced with their fixtures');
