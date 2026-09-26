#!/usr/bin/env node

/**
 * Cross-artifact checks for the draft SourceMap -> LessonModel -> Alignment ->
 * ChangePlan handoff. This is deliberately deterministic and does not render
 * or modify Human notes.
 */

import fs from 'node:fs';
import path from 'node:path';

const [sourceMapPath, lessonModelPath, alignmentPath, changePlanPath] = process.argv.slice(2);
if (![sourceMapPath, lessonModelPath, alignmentPath, changePlanPath].every(Boolean)) {
  console.error('usage: node tools/validate-knowledge-compilation.mjs <source-map.json> <lesson-model.json> <alignment.json> <change-plan.json>');
  process.exit(2);
}

const read = file => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const sourceMap = read(sourceMapPath);
const lessonModel = read(lessonModelPath);
const alignment = read(alignmentPath);
const changePlan = read(changePlanPath);
const errors = [];
const unique = (values, label) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label}: duplicate ${value}`);
    seen.add(value);
  }
  return seen;
};

const sourceIds = unique((sourceMap.sources ?? []).map(source => source.sourceId), 'sources');
const unitIds = unique((sourceMap.units ?? []).map(unit => unit.unitId), 'source units');
for (const unit of sourceMap.units ?? []) {
  if (!sourceIds.has(unit.sourceId)) errors.push(`source unit ${unit.unitId}: unknown source ${unit.sourceId}`);
}

const itemIds = unique((lessonModel.items ?? []).map(item => item.itemId), 'lesson items');
for (const item of lessonModel.items ?? []) {
  for (const ref of item.sourceUnitRefs ?? []) if (!unitIds.has(ref)) errors.push(`lesson item ${item.itemId}: unknown source unit ${ref}`);
}
for (const relation of lessonModel.relations ?? []) {
  if (!itemIds.has(relation.fromItemId)) errors.push(`lesson relation ${relation.relationId}: unknown from item ${relation.fromItemId}`);
  if (!itemIds.has(relation.toItemId)) errors.push(`lesson relation ${relation.relationId}: unknown to item ${relation.toItemId}`);
  for (const ref of relation.sourceUnitRefs ?? []) if (!unitIds.has(ref)) errors.push(`lesson relation ${relation.relationId}: unknown source unit ${ref}`);
}
for (const flow of lessonModel.teachingFlow ?? []) {
  for (const ref of flow.itemRefs ?? []) if (!itemIds.has(ref)) errors.push(`teaching flow ${flow.order}: unknown item ${ref}`);
  for (const ref of flow.sourceUnitRefs ?? []) if (!unitIds.has(ref)) errors.push(`teaching flow ${flow.order}: unknown source unit ${ref}`);
}

const alignmentIds = unique((alignment.candidates ?? []).map(candidate => candidate.alignmentId), 'alignment candidates');
if (alignment.lessonModelRef !== lessonModel.lessonModelId) errors.push('alignment: lessonModelRef does not match lesson model');
for (const candidate of alignment.candidates ?? []) {
  for (const ref of candidate.lessonItemRefs ?? []) if (!itemIds.has(ref)) errors.push(`alignment ${candidate.alignmentId}: unknown lesson item ${ref}`);
  const needsExistingTarget = candidate.relation !== 'NEW';
  if (needsExistingTarget && !(candidate.existingKnowledgeRefs ?? []).length && !(candidate.existingNoteRefs ?? []).length) {
    errors.push(`alignment ${candidate.alignmentId}: ${candidate.relation} must identify an existing knowledge or note target`);
  }
}

if (changePlan.lessonModelRef !== lessonModel.lessonModelId) errors.push('change plan: lessonModelRef does not match lesson model');
if (changePlan.alignmentRef !== alignment.alignmentId) errors.push('change plan: alignmentRef does not match alignment');
if (changePlan.candidateOnly !== true) errors.push('change plan: candidateOnly must be true');
for (const operation of changePlan.operations ?? []) {
  for (const ref of operation.alignmentRefs ?? []) if (!alignmentIds.has(ref)) errors.push(`operation ${operation.operationId}: unknown alignment ${ref}`);
  for (const ref of operation.lessonItemRefs ?? []) if (!itemIds.has(ref)) errors.push(`operation ${operation.operationId}: unknown lesson item ${ref}`);
  for (const ref of operation.sourceUnitRefs ?? []) if (!unitIds.has(ref)) errors.push(`operation ${operation.operationId}: unknown source unit ${ref}`);
  if ((operation.kind === 'expand' || operation.kind === 'merge_candidate' || operation.kind === 'preserve_both') && !(operation.preserveContentRefs ?? []).length) {
    errors.push(`operation ${operation.operationId}: ${operation.kind} must name preserved content`);
  }
  if (operation.kind === 'merge_candidate' && (operation.targetRefs ?? []).length < 2) {
    errors.push(`operation ${operation.operationId}: merge_candidate needs at least two targets`);
  }
}

const report = {
  status: errors.length ? 'FAIL' : 'PASS',
  sourceMap: sourceMap.sourcePackageId,
  lessonModel: lessonModel.lessonModelId,
  alignment: alignment.alignmentId,
  changePlan: changePlan.planId,
  counts: {
    sources: sourceIds.size,
    sourceUnits: unitIds.size,
    lessonItems: itemIds.size,
    alignmentCandidates: alignmentIds.size,
    changeOperations: (changePlan.operations ?? []).length
  },
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
