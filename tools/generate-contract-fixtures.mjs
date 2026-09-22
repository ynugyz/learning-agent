/**
 * One-shot fixture generator for M1A-V contract tests.
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This script is run once, on purpose, and then kept for review: it is the
 * auditable record of EXACTLY what each invalid fixture changes relative to the
 * valid one. Hand-editing JSON fixtures hides that difference; deriving them
 * here keeps each violation one named mutation, which is why the invalid
 * fixtures can be regenerated and diffed.
 *
 * Usage:  node tools/generate-contract-fixtures.mjs
 *
 * It writes only under `tests/contracts/**` and never touches schemas or specs.
 *
 * @packageDocumentation
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = join(repoRoot, 'tests', 'contracts');

/** Deep clone via JSON so each fixture starts from a pristine valid document. */
const clone = (value) => JSON.parse(JSON.stringify(value));

const readFixture = (contract, file) =>
  JSON.parse(readFileSync(join(fixturesRoot, contract, file), 'utf8'));

/**
 * Each mutation receives a fresh copy of the valid document and must return the
 * mutated document. A mutation that throws means the expected shape changed and
 * the fixture needs rethinking — which is a useful failure, so it is not caught.
 */
const contracts = [
  {
    name: 'semantic-card',
    schema: 'schemas/semantic-card.v0.1.schema.json',
    mutations: {
      // CH-01: presence checks must not accept empty content.
      'empty-knowledge-id': (doc) => {
        doc.knowledgeId = '';
        return doc;
      },
      // CH-01: whitespace must not satisfy "non-empty".
      'whitespace-knowledge-id': (doc) => {
        doc.knowledgeId = '   ';
        return doc;
      },
      // CH-01: an anchor must carry a non-empty value.
      'empty-anchor-value': (doc) => {
        doc.humanNoteRef.anchor.value = '';
        return doc;
      },
      // CH-01: an evidence reference must identify somewhere.
      'empty-evidence-ref': (doc) => {
        doc.claims[0].evidenceRefs = [{ sourceUnitId: '', locator: '' }];
        doc.claims[0].epistemicState = 'uncertain';
        delete doc.claims[0].basis;
        return doc;
      },
      // CH-02: there is no field that may carry claim prose.
      'claim-prose-escape': (doc) => {
        doc.claims[0].note = 'The prior encodes belief before data is observed.';
        return doc;
      },
      // CH-02: the navigation summary is length-capped.
      'summary-over-budget': (doc) => {
        doc.semanticCore.summary = 'x'.repeat(281);
        return doc;
      },
      // CH-03 / SC-13: a machine generation may not verify its own claim.
      'self-verified-claim': (doc) => {
        doc.claims[1].epistemicState = 'verified';
        doc.claims[1].basis = 'machine-inferred';
        return doc;
      },
      // SC-17: a relation without provenance must be flagged for review.
      'unflagged-bare-relation': (doc) => {
        delete doc.relations[0].provenance;
        delete doc.relations[0].reviewFlag;
        return doc;
      },
      // CH-03: `ok` integrity must carry the data that proves it.
      'integrity-ok-without-proof': (doc) => {
        doc.integrity = { state: 'ok', checkedAt: '2026-09-22T00:00:00+08:00' };
        return doc;
      },
      // CH-03: an unknown state must say why.
      'integrity-unknown-without-reason': (doc) => {
        doc.integrity = { state: 'unknown', checkedAt: '2026-09-22T00:00:00+08:00' };
        return doc;
      },
      // A1: card state is a maintenance state, and the vocabulary is closed.
      'knowledge-truth-card-state': (doc) => {
        doc.maintenanceState = 'verified';
        return doc;
      },
      // A2 (M1A-V): every unresolved item carries a stable identity.
      'unresolved-without-id': (doc) => {
        delete doc.unresolved[0].unresolvedId;
        return doc;
      },
      // A1 (M1A-V): the old truth-ish name must not validate.
      'legacy-cardstate-name': (doc) => {
        doc.cardState = doc.maintenanceState;
        delete doc.maintenanceState;
        return doc;
      },
    },
  },
  {
    name: 'source-map',
    schema: 'schemas/source-map.v0.1.schema.json',
    mutations: {
      'empty-unit-id': (doc) => {
        doc.units[0].unitId = '';
        return doc;
      },
      'opaque-locator-without-value': (doc) => {
        doc.units[0].locator = { kind: 'opaque', value: '' };
        return doc;
      },
      // SM-6: preservation priority is an inference, never a source property.
      'preservation-not-marked-inference': (doc) => {
        delete doc.units[0].preservation.isInference;
        return doc;
      },
      // SM-16: a machine may never assert source verification.
      'source-verified-status': (doc) => {
        doc.units[0].epistemicStatus = 'verified';
        return doc;
      },
      // SM-5: observations must be decidable from the package alone.
      'knowledge-network-observation': (doc) => {
        doc.units[0].observations = [
          { observation: 'may-duplicate-existing-knowledge', advisory: true },
        ];
        return doc;
      },
      // SM-5: observations carry no authority.
      'observation-without-advisory': (doc) => {
        doc.units[0].observations = [{ observation: 'has-formula' }];
        return doc;
      },
      // SM-17: coverage may not claim absolute completeness.
      'coverage-claims-complete': (doc) => {
        doc.coverage = { assessment: 'complete' };
        return doc;
      },
      // SM-18: a conflict needs at least two non-empty unit references.
      'conflict-with-one-unit': (doc) => {
        doc.conflicts[0].unitRefs = ['su-lecture03-0011'];
        return doc;
      },
      // SM-18: whitespace is not an identified unit.
      'conflict-with-empty-unit': (doc) => {
        doc.conflicts[0].unitRefs = ['su-lecture03-0011', '  '];
        return doc;
      },
      // SM-20: the map must never record a final knowledge destination.
      'disposition-write-back': (doc) => {
        doc.units[0].disposition = { state: 'processed', knowledgeRefs: ['kc-01J8ZQ4T7K9M2P5R8V3W6Y0B'] };
        return doc;
      },
      // SM-3: a unit must resolve to a declared source.
      'unit-without-source-id': (doc) => {
        delete doc.units[0].sourceId;
        return doc;
      },
      // SM-26: the summary is a pointer, not a transcript.
      'unit-summary-over-budget': (doc) => {
        doc.units[0].summary = 'y'.repeat(281);
        return doc;
      },
    },
  },
  {
    name: 'agent-runtime',
    schema: 'schemas/agent-runtime.v0.1.schema.json',
    mutations: {
      // CH-03: `available` must carry the value it claims.
      'resolved-available-without-value': (doc) => {
        doc.invocationResult.result.model.resolved = { availability: 'available' };
        return doc;
      },
      // CH-03: `unavailable` must say why.
      'resolved-unavailable-without-reason': (doc) => {
        doc.invocationResult.result.model.resolved = { availability: 'unavailable' };
        return doc;
      },
      // CH-04 / RT-13: a definitive resolution needs the resolved value.
      'matched-without-resolved-value': (doc) => {
        doc.invocationResult.result.model.resolved = { availability: 'unavailable', reason: 'nope' };
        doc.invocationResult.result.model.resolution = 'matched';
        return doc;
      },
      // RT-25: an unversioned schema reference is not reproducible.
      'output-schema-without-version': (doc) => {
        doc.taskRequest.outputSchemaRef = { id: 'source-map/0.1' };
        return doc;
      },
      // RT-11: no host-specific path may enter the contract.
      'output-schema-absolute-path': (doc) => {
        doc.taskRequest.outputSchemaRef.path = 'C:\\Users\\someone\\schemas\\source-map.json';
        return doc;
      },
      // RT-12: a prompt reference must be versioned.
      'prompt-without-version': (doc) => {
        delete doc.taskRequest.promptRef.version;
        return doc;
      },
      // RT-8: a failure must be classified, not left empty.
      'failure-without-error': (doc) => {
        doc.invocationResult = { ok: false };
        return doc;
      },
      // RT-14: streaming is reserved and pinned unavailable.
      'streaming-claimed-supported': (doc) => {
        doc.runtimeMetadata.capabilities.streaming = true;
        return doc;
      },
      // RT-11: there is no field for a host install path.
      'implementation-note-host-path': (doc) => {
        doc.runtimeMetadata.implementationNote = 'D:\\Enviroment\\nodejs\\node_modules\\@deepseek-ai\\dsh';
        return doc;
      },
      // RT-19: provider cost is not part of core runtime usage.
      'usage-with-cost': (doc) => {
        doc.invocationResult.result.usage.cost = { amount: 0.42, currency: 'USD' };
        return doc;
      },
      // RT-20: not every task names a schema, but a structured one does.
      'missing-task-request-fields': (doc) => {
        delete doc.taskRequest.input;
        return doc;
      },
    },
  },
  {
    name: 'run-manifest',
    schema: 'schemas/run-manifest.v0.1.schema.json',
    mutations: {
      // CH-04 / RM-11: a resolution is only computable with both sides.
      'resolution-without-requested': (doc) => {
        delete doc.runtime.requested;
        return doc;
      },
      // CH-03: `present` must carry the data it claims.
      'runtime-present-without-resolved': (doc) => {
        delete doc.runtime.resolved;
        return doc;
      },
      // RM-12: absent must be `unavailable` plus a reason, not a bare object.
      'runtime-unavailable-without-reason': (doc) => {
        doc.runtime = { availability: 'unavailable' };
        return doc;
      },
      // RM-13: a non-repository run must say so, not fabricate a clean tree.
      'git-present-without-commit': (doc) => {
        delete doc.git.commit;
        return doc;
      },
      // RM-13: every state needs a justification.
      'git-present-without-dirty': (doc) => {
        delete doc.git.dirty;
        return doc;
      },
      // RM-16: schemaVersion is required.
      'missing-schema-version': (doc) => {
        delete doc.schemaVersion;
        return doc;
      },
      // RM-12: a core field may not be silently missing.
      'missing-case-id': (doc) => {
        delete doc.caseId;
        return doc;
      },
      // RM-12: a case reference needs a value or a reason.
      'case-id-present-without-value': (doc) => {
        doc.caseId = { availability: 'present' };
        return doc;
      },
      // RM-12: resolved model availability requires proof.
      'model-resolved-available-without-value': (doc) => {
        doc.model.resolved = { availability: 'available' };
        return doc;
      },
      // RM-20: the version bundle is present even when empty.
      'missing-versions': (doc) => {
        delete doc.versions;
        return doc;
      },
      // RM-5 / RM-21: no credential and no host path may be recorded.
      //
      // The violation under test is that `notes` is a capped free-text field and
      // therefore not a place to dump bulk content. The fixture deliberately
      // does NOT contain anything credential-shaped: repository secret scanning
      // would flag it, and weakening the scanner to accommodate a test would be
      // a worse trade than making the fixture use a plain placeholder.
      'credential-in-notes': (doc) => {
        doc.notes = `bulk pasted content must not live here ${'k'.repeat(600)}`;
        return doc;
      },
      'host-path-in-repo-ref': (doc) => {
        doc.git.worktreeRef = 'C:\\Users\\someone\\vault';
        return doc;
      },
    },
  },
];

let written = 0;
let failures = 0;

for (const contract of contracts) {
  const valid = readFixture(contract.name, 'valid.json');
  const outDir = join(fixturesRoot, contract.name);
  mkdirSync(outDir, { recursive: true });

  // Normalise the canonical valid fixture to the same 2-space JSON layout that
  // the spec examples use, so `tools/sync-spec-examples.mjs` produces a byte
  // identical block. Without this the two copies differ only in formatting,
  // which makes "are the spec and the fixture the same?" unanswerable by diff.
  writeFileSync(
    join(outDir, 'valid.json'),
    `${JSON.stringify(valid, null, 2)}\n`,
    'utf8',
  );

  for (const [label, mutate] of Object.entries(contract.mutations)) {
    const doc = clone(valid);
    const mutated = mutate(doc);
    if (mutated === undefined) {
      console.error(`FAIL  ${contract.name}/${label}: mutation returned undefined`);
      failures++;
      continue;
    }
    const target = join(outDir, `invalid-${label}.json`);
    writeFileSync(target, `${JSON.stringify(mutated, null, 2)}\n`, 'utf8');
    written++;
  }
  console.log(`OK    ${contract.name}: 1 canonical + ${Object.keys(contract.mutations).length} invalid fixture(s)`);
}

console.log(`\nwrote ${written} invalid fixture(s), ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
