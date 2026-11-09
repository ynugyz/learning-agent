import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {parseNoteReference, preflightNoteReferences} from '../tools/reference-preflight.mjs';

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
  const v02Schema = readJson(path.join(repo, 'schemas', 'alignment.v0.2.schema.json'));
  const v02Alignment = {
    ...readJson(fixture('alignment.json')),
    contractVersion: 'alignment/0.2',
    schemaVersion: '0.2',
    candidates: [
      {
        ...readJson(fixture('alignment.json')).candidates[0],
        relation: 'EXPAND',
        resolutionState: 'resolved'
      },
      {
        ...readJson(fixture('alignment.json')).candidates[1],
        resolutionState: 'resolved'
      },
      {
        alignmentId: 'al-deferred',
        lessonItemRefs: ['li-joint-probability-example'],
        existingNoteRefs: ['notes/概率图模型与贝叶斯网络.md#联合概率'],
        relation: 'NO_CHANGE',
        resolutionState: 'deferred',
        rationale: '完整公式缺失，暂不安全吸收。',
        confidence: 'low'
      },
      {
        alignmentId: 'al-resolved-no-change',
        lessonItemRefs: ['li-probability-causality-boundary'],
        existingNoteRefs: ['notes/因果推理.md#概率边界'],
        relation: 'NO_CHANGE',
        resolutionState: 'resolved',
        rationale: '已有知识已经覆盖本项语义。',
        confidence: 'high'
      }
    ]
  };
  assert.equal(ajv.compile(v02Schema)(v02Alignment), true, 'v0.2 fixture should validate');
  assert.equal(v02Alignment.candidates[0].relation, 'EXPAND');
  assert.equal(v02Alignment.candidates[0].resolutionState, 'resolved');
  assert.equal(v02Alignment.candidates[2].relation, 'NO_CHANGE');
  assert.equal(v02Alignment.candidates[2].resolutionState, 'deferred');
  assert.equal(v02Alignment.candidates[3].resolutionState, 'resolved');

  const invalidV02MissingState = structuredClone(v02Alignment);
  delete invalidV02MissingState.candidates[0].resolutionState;
  assert.equal(ajv.compile(v02Schema)(invalidV02MissingState), false, 'v0.2 resolutionState is required');

  const v02AlignmentPath = path.join(temporaryRoot, 'alignment.v0.2.json');
  fs.writeFileSync(v02AlignmentPath, JSON.stringify(v02Alignment));
  const validV02Check = spawnSync(process.execPath, [
    'tools/validate-knowledge-compilation.mjs',
    fixture('source-map.json'),
    fixture('lesson-model.json'),
    v02AlignmentPath,
    fixture('change-plan.json')
  ], { encoding: 'utf8' });
  assert.equal(validV02Check.status, 0, validV02Check.stderr || validV02Check.stdout);

  const deferredMutationPlan = structuredClone(plan);
  deferredMutationPlan.operations = [{
    operationId: 'op-deferred-mutation',
    kind: 'expand',
    targetRefs: ['notes/概率图模型与贝叶斯网络.md'],
    alignmentRefs: ['al-deferred'],
    lessonItemRefs: ['li-joint-probability-example'],
    preserveContentRefs: ['human-note:existing'],
    rationale: 'must be rejected',
    status: 'proposed'
  }];
  const deferredMutationPath = path.join(temporaryRoot, 'deferred-mutation-plan.json');
  fs.writeFileSync(deferredMutationPath, JSON.stringify(deferredMutationPlan));
  const deferredMutationCheck = spawnSync(process.execPath, [
    'tools/validate-knowledge-compilation.mjs',
    fixture('source-map.json'),
    fixture('lesson-model.json'),
    v02AlignmentPath,
    deferredMutationPath
  ], { encoding: 'utf8' });
  assert.notEqual(deferredMutationCheck.status, 0, 'deferred alignment mutation must fail');
  assert.match(deferredMutationCheck.stdout, /deferred alignment/);

  const resolvedNoChangePlan = structuredClone(plan);
  resolvedNoChangePlan.operations = [{
    operationId: 'op-resolved-no-change-mutation',
    kind: 'expand',
    targetRefs: ['notes/因果推理.md'],
    alignmentRefs: ['al-resolved-no-change'],
    lessonItemRefs: ['li-probability-causality-boundary'],
    preserveContentRefs: ['human-note:existing'],
    rationale: 'must be rejected',
    status: 'proposed'
  }];
  const resolvedNoChangePath = path.join(temporaryRoot, 'resolved-no-change-plan.json');
  fs.writeFileSync(resolvedNoChangePath, JSON.stringify(resolvedNoChangePlan));
  const resolvedNoChangeCheck = spawnSync(process.execPath, [
    'tools/validate-knowledge-compilation.mjs',
    fixture('source-map.json'),
    fixture('lesson-model.json'),
    v02AlignmentPath,
    resolvedNoChangePath
  ], { encoding: 'utf8' });
  assert.notEqual(resolvedNoChangeCheck.status, 0, 'resolved NO_CHANGE mutation must fail');
  assert.match(resolvedNoChangeCheck.stdout, /resolved NO_CHANGE/);

  const vaultRoot = path.join(temporaryRoot, 'vault');
  fs.mkdirSync(vaultRoot);
  fs.writeFileSync(path.join(vaultRoot, 'good.md'), '# Good heading\n\n^block-one\n');
  assert.equal(parseNoteReference('good.md#Good heading').status, 'valid');
  assert.equal(parseNoteReference('../escape.md').status, 'syntax_invalid');
  assert.equal(parseNoteReference('C:\\absolute.md').status, 'syntax_invalid');
  assert.equal(preflightNoteReferences(['missing.md#Missing'], {root: vaultRoot, indexId: 'test-index'}).results[0].status, 'target_missing');
  assert.equal(preflightNoteReferences(['good.md#Missing'], {root: vaultRoot, indexId: 'test-index'}).results[0].status, 'anchor_missing');
  assert.equal(preflightNoteReferences(['good.md#Good heading', 'good.md#^block-one'], {root: vaultRoot, indexId: 'test-index'}).status, 'PASS');
  assert.equal(preflightNoteReferences(['good.md#Good heading'], {root: path.join(temporaryRoot, 'missing-root'), indexId: 'bad-index'}).results[0].status, 'context_invalid');

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
