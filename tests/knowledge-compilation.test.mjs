import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';

const repo = process.cwd();
const fixture = name => path.join(repo, 'tests', 'knowledge-compilation', 'bayes-example', name);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: true });
for (const [artifact, schemaName] of [
  ['source-map', 'source-map.v0.1.schema.json'],
  ['lesson-model', 'lesson-model.v0.1.schema.json'],
  ['alignment', 'alignment.v0.1.schema.json'],
  ['change-plan', 'change-plan.v0.1.schema.json']
]) {
  const schema = readJson(path.join(repo, 'schemas', schemaName));
  const valid = ajv.compile(schema)(readJson(fixture(`${artifact}.json`)));
  assert.equal(valid, true, `${artifact} fixture failed its draft schema`);
}
const result = spawnSync(process.execPath, [
  'tools/validate-knowledge-compilation.mjs',
  fixture('source-map.json'),
  fixture('lesson-model.json'),
  fixture('alignment.json'),
  fixture('change-plan.json')
], { encoding: 'utf8' });

assert.equal(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
assert.equal(report.status, 'PASS');
assert.equal(report.counts.sourceUnits, 2);
assert.equal(report.counts.lessonItems, 2);
assert.equal(report.counts.changeOperations, 2);

const plan = readJson(fixture('change-plan.json'));
assert.equal(plan.candidateOnly, true);
assert.ok(plan.operations.every(operation => operation.status === 'proposed'));
assert.ok(plan.operations.every(operation => (operation.preserveContentRefs ?? []).length > 0));

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-kc-'));
try {
  const invalidPlan = structuredClone(plan);
  invalidPlan.operations[0].kind = 'preserve_both';
  delete invalidPlan.operations[0].preserveContentRefs;
  const invalidPlanPath = path.join(temporaryRoot, 'invalid-plan.json');
  fs.writeFileSync(invalidPlanPath, JSON.stringify(invalidPlan));
  const preservationCheck = spawnSync(process.execPath, [
    'tools/validate-knowledge-compilation.mjs',
    fixture('source-map.json'),
    fixture('lesson-model.json'),
    fixture('alignment.json'),
    invalidPlanPath
  ], { encoding: 'utf8' });
  assert.notEqual(preservationCheck.status, 0, 'preserve_both without preserved content must fail');
  assert.match(preservationCheck.stdout, /preserve_content|preserve_both/);

  const invalidAlignment = readJson(fixture('alignment.json'));
  delete invalidAlignment.candidates[0].existingKnowledgeRefs;
  delete invalidAlignment.candidates[0].existingNoteRefs;
  const invalidAlignmentPath = path.join(temporaryRoot, 'invalid-alignment.json');
  fs.writeFileSync(invalidAlignmentPath, JSON.stringify(invalidAlignment));
  const alignmentCheck = spawnSync(process.execPath, [
    'tools/validate-knowledge-compilation.mjs',
    fixture('source-map.json'),
    fixture('lesson-model.json'),
    invalidAlignmentPath,
    fixture('change-plan.json')
  ], { encoding: 'utf8' });
  assert.notEqual(alignmentCheck.status, 0, 'non-NEW alignment without a target must fail');
  assert.match(alignmentCheck.stdout, /existing knowledge or note target/);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('knowledge-compilation cross-artifact checks passed');
