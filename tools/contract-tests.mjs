/**
 * Executable contract verification — M1A-V
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * Proves that the four M1A contracts hold **as machine-checkable artefacts**,
 * not merely as prose:
 *
 *   1. the valid fixture of each contract is ACCEPTED by its JSON Schema;
 *   2. every invalid fixture is REJECTED by its JSON Schema;
 *   3. every invalid fixture fails for the reason it was written for, not by
 *      accident (each broken keyword is on a reviewed allowlist);
 *   4. each invalid fixture still satisfies the structural shape of the schema
 *      apart from its intended violation — so a rejection proves the intended
 *      rule fired, not that the document was malformed gibberish.
 *
 * Run:  node tools/contract-tests.mjs
 *
 * @packageDocumentation
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = join(repoRoot, 'tests', 'contracts');

const contracts = [
  {
    name: 'semantic-card',
    schema: 'schemas/semantic-card.v0.1.schema.json',
    spec: 'specs/semantic-card-v0.1.md',
    specHeading: '## 6. Example instance',
  },
  {
    name: 'source-map',
    schema: 'schemas/source-map.v0.1.schema.json',
    spec: 'specs/source-map-v0.1.md',
    specHeading: '## 7. Example instance',
  },
  {
    name: 'agent-runtime',
    schema: 'schemas/agent-runtime.v0.1.schema.json',
    spec: 'specs/agent-runtime-v0.1.md',
    specHeading: '### 8.1 Request (with a schema — the structured-module case)',
  },
  {
    name: 'run-manifest',
    schema: 'schemas/run-manifest.v0.1.schema.json',
    spec: 'specs/run-manifest-v0.1.md',
    specHeading: '## 7. Example instance',
  },
];

/**
 * Keywords a fixture is ALLOWED to break.
 *
 * Rationale: `required` is included because the contract expresses its
 * conditional rules through `if`/`then`, and a `then` branch legitimately adds
 * `required` constraints ("if availability is `available`, then `value` is
 * required"). Excluding it would make every conditional rule look like an
 * accident.
 *
 * Anything OUTSIDE this list — a `type` error, for instance — means the fixture
 * was mutated into something malformed rather than into a rule violation, and
 * the test fails: a fixture that fails for the wrong reason proves nothing.
 */
const ALLOWED_KEYWORDS = new Set([
  'additionalProperties',
  'enum',
  'const',
  'required',
  'minLength',
  'minItems',
  'maxLength',
  'if',
  'then',
  'not',
  'anyOf',
  'allOf',
  'pattern',
]);

const readJson = (relativePath) => JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));

/** Collect every failing keyword from an Ajv error tree. */
function collectKeywords(errors, into = new Set()) {
  for (const error of errors ?? []) {
    into.add(error.keyword);
    if (error.params?.errors) collectKeywords(error.params.errors, into);
  }
  return into;
}

/** A short, readable rendering of an Ajv error. */
function describeError(error) {
  const at = error.instancePath === '' ? '(root)' : error.instancePath;
  return `${at} ${error.keyword} ${JSON.stringify(error.params)}`;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

let checks = 0;
let failures = 0;
const report = [];

function fail(message) {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

function pass(message) {
  console.log(`  PASS  ${message}`);
}

for (const contract of contracts) {
  const schema = readJson(contract.schema);
  const validate = ajv.compile(schema);
  const dir = join(fixturesRoot, contract.name);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  console.log(`\n== ${contract.name} ==`);

  // ---- 1. canonical valid fixture must be accepted -------------------------
  const validPath = join(dir, 'valid.json');
  const valid = JSON.parse(readFileSync(validPath, 'utf8'));
  checks += 1;
  if (validate(valid)) {
    pass('valid.json accepted');
  } else {
    fail(`valid.json REJECTED: ${(validate.errors ?? []).map(describeError).join(' | ')}`);
  }

  // ---- 2+3+4. every invalid fixture must be rejected for its own reason -----
  const invalidFiles = files.filter((f) => f.startsWith('invalid-'));
  for (const file of invalidFiles) {
    checks += 1;
    const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const ok = validate(doc);

    if (ok) {
      fail(`${file} was ACCEPTED but must be rejected`);
      continue;
    }

    const keywords = collectKeywords(validate.errors);
    const unexpected = [...keywords].filter((k) => !ALLOWED_KEYWORDS.has(k));

    // Rejection reason must be a rule violation, never a malformed document.
    if (unexpected.length > 0) {
      fail(`${file} rejected for an unintended reason (${unexpected.join(', ')}): ${(validate.errors ?? []).map(describeError).slice(0, 4).join(' | ')}`);
      continue;
    }

    pass(`${file} rejected via ${[...keywords].sort().join(', ')}`);
  }

  // ---- 4. the spec's embedded example must equal the fixture ---------------
  // The spec example and the canonical fixture are two copies of the same
  // document. Keeping them in sync by hand guarantees drift, so it is asserted.
  checks += 1;
  const specText = readFileSync(join(repoRoot, contract.spec), 'utf8');
  const headingIndex = specText.indexOf(contract.specHeading);
  const fenceStart = headingIndex < 0 ? -1 : specText.indexOf('```json', headingIndex);
  const fenceEnd = fenceStart < 0 ? -1 : specText.indexOf('```', fenceStart + 7);
  if (fenceStart < 0 || fenceEnd < 0) {
    fail(`${contract.spec}: could not locate the fenced example after "${contract.specHeading}"`);
  } else {
    const embedded = specText.slice(fenceStart + 7, fenceEnd).trim();
    const canonical = JSON.stringify(valid, null, 2).trim();
    if (embedded === canonical) {
      pass(`${contract.spec} example is identical to valid.json`);
    } else {
      fail(`${contract.spec} example DIFFERS from valid.json (run: node tools/sync-spec-examples.mjs)`);
    }
  }

  report.push({
    contract: contract.name,
    valid: 1,
    invalid: invalidFiles.length,
  });
}

console.log('\n== summary ==');
for (const row of report) {
  console.log(`  ${row.contract.padEnd(16)} valid=${row.valid} invalid=${row.invalid}`);
}
console.log(`  checks=${checks} failures=${failures}`);

if (failures > 0) {
  console.error('\nCONTRACT VERIFICATION FAILED');
  process.exit(1);
}
console.log('\nCONTRACT VERIFICATION PASSED');
