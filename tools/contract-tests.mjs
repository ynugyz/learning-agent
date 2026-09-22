/**
 * Executable contract verification — M1A-V2
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * Proves that the four M1A contracts hold **as machine-checkable artefacts**:
 *
 *   1. the canonical valid fixture of each contract is ACCEPTED;
 *   2. every invalid fixture is REJECTED;
 *   3. the rejection matches an **explicitly declared expectation** — a specific
 *      JSON Schema keyword and an instance path prefix — rather than merely
 *      "some keyword on an allowlist";
 *   4. each spec's embedded example is byte-identical to its fixture.
 *
 * Point 3 is the M1A-V2 change. Under M1A-V a wrong-but-allowlisted keyword
 * (e.g. `required` firing for an unrelated reason) would still have passed. Now
 * the fixture must fail for the rule it was written for.
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
const expectationsPath = join(fixturesRoot, 'expectations.json');

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

const expectations = JSON.parse(readFileSync(expectationsPath, 'utf8'));

const readJson = (relativePath) => JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));

/** Collect every failing keyword from an Ajv error tree. */
function collectKeywords(errors, into = new Set()) {
  for (const error of errors ?? []) {
    into.add(error.keyword);
    if (error.params?.errors) collectKeywords(error.params.errors, into);
  }
  return into;
}

const describeError = (error) =>
  `${error.instancePath === '' ? '(root)' : error.instancePath} ${error.keyword} ${JSON.stringify(error.params)}`;

/**
 * Instance paths Ajv may blame for a failure.
 *
 * A conditional (`if`/`then`) rule is reported against the object that owns the
 * conditional, not the leaf that violated the `then` branch — so a prefix match
 * is used for conditional rules, while ordinary keyword failures still require
 * the exact path.
 */
function instancePaths(errors, into = []) {
  for (const error of errors ?? []) {
    into.push(error.instancePath);
    if (error.params?.errors) instancePaths(error.params.errors, into);
  }
  return into;
}

const CONDITIONAL_KEYWORDS = new Set(['if', 'then', 'anyOf', 'allOf', 'not']);

const ajv = new Ajv2020({
  allErrors: true,
  // M1A-V2: strict mode is ON. `strictRequired` stays off because schemas use
  // `if`/`then` to add conditional `required` constraints, which strictRequired
  // rejects as "required property not defined in properties" in some shapes.
  // Every other strict check is active, and each relaxation is listed in
  // docs/reviews/M1A_FINAL_AUDIT_FIXES.md.
  strict: true,
  strictRequired: false,
  strictSchema: true,
  strictTypes: true,
  allowUnionTypes: true,
});

let checks = 0;
let failures = 0;
const report = [];

const fail = (message) => {
  failures += 1;
  console.error(`  FAIL  ${message}`);
};
const pass = (message) => console.log(`  PASS  ${message}`);

for (const contract of contracts) {
  const schema = readJson(contract.schema);
  const validate = ajv.compile(schema);
  const dir = join(fixturesRoot, contract.name);

  console.log(`\n== ${contract.name} ==`);

  // ---- 1. canonical valid fixture must be accepted -------------------------
  const valid = readJson(`tests/contracts/${contract.name}/valid.json`);
  checks += 1;
  if (validate(valid)) pass('valid.json accepted');
  else fail(`valid.json REJECTED: ${(validate.errors ?? []).map(describeError).join(' | ')}`);

  // ---- 2+3. every invalid fixture must be rejected for its declared reason --
  const declared = expectations[contract.name] ?? {};
  for (const [label, expectation] of Object.entries(declared)) {
    checks += 1;
    const file = `invalid-${label}.json`;
    let doc;
    try {
      doc = readJson(`tests/contracts/${contract.name}/${file}`);
    } catch (error) {
      fail(`${file} could not be read: ${error.message}`);
      continue;
    }

    if (validate(doc)) {
      fail(`${file} was ACCEPTED but must be rejected (expected ${expectation.keyword} at ${expectation.instancePath || '(root)'})`);
      continue;
    }

    const errors = validate.errors ?? [];
    const keywords = collectKeywords(errors);
    const paths = instancePaths(errors);

    if (!keywords.has(expectation.keyword)) {
      fail(`${file} rejected, but NOT via the expected keyword "${expectation.keyword}" (saw: ${[...keywords].sort().join(', ')}): ${errors.map(describeError).slice(0, 3).join(' | ')}`);
      continue;
    }

    if (expectation.instancePath !== undefined) {
      const wanted = expectation.instancePath;
      const matched = CONDITIONAL_KEYWORDS.has(expectation.keyword)
        ? paths.some((p) => p === wanted || p.startsWith(wanted === '' ? '' : `${wanted}/`))
        : paths.includes(wanted);
      if (!matched) {
        fail(`${file} rejected via ${expectation.keyword}, but at an unexpected path (want ${wanted === '' ? '(root)' : wanted}, saw: ${[...new Set(paths)].join(', ')})`);
        continue;
      }
    }

    pass(`${file} rejected via ${expectation.keyword} at ${expectation.instancePath === '' ? '(root)' : expectation.instancePath}`);
  }

  // ---- 4. the spec's embedded example must equal the fixture ---------------
  checks += 1;
  const specText = readFileSync(join(repoRoot, contract.spec), 'utf8');
  const headingIndex = specText.indexOf(contract.specHeading);
  const fenceStart = headingIndex < 0 ? -1 : specText.indexOf('```json', headingIndex);
  const fenceEnd = fenceStart < 0 ? -1 : specText.indexOf('```', fenceStart + 7);
  if (fenceStart < 0 || fenceEnd < 0) {
    fail(`${contract.spec}: could not locate the fenced example after "${contract.specHeading}"`);
  } else {
    const embedded = specText.slice(fenceStart + 7, fenceEnd).trim();
    if (embedded === JSON.stringify(valid, null, 2).trim()) {
      pass(`${contract.spec} example is identical to valid.json`);
    } else {
      fail(`${contract.spec} example DIFFERS from valid.json (run: node tools/sync-spec-examples.mjs)`);
    }
  }

  report.push({ contract: contract.name, valid: 1, invalid: Object.keys(declared).length });
}

// ---- 5. every fixture on disk must be declared in expectations -------------
// A fixture nobody declares is a fixture nobody asserts, which is worse than
// no fixture at all: it looks like coverage.
checks += 1;
const undeclared = [];
for (const contract of contracts) {
  const declared = expectations[contract.name] ?? {};
  const dir = join(fixturesRoot, contract.name);
  for (const file of readdirSync(dir)) {
    if (!file.startsWith('invalid-') || !file.endsWith('.json')) continue;
    const label = file.slice('invalid-'.length, -'.json'.length);
    if (!(label in declared)) undeclared.push(`${contract.name}/${file}`);
  }
}
if (undeclared.length === 0) pass('every invalid fixture has a declared expectation');
else fail(`fixtures without expectations: ${undeclared.join(', ')}`);

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
