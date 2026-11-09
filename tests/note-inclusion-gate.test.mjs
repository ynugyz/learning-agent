import assert from 'node:assert/strict';
import { TypeSafeClient } from '../src/decision/typesafe.ts';
import { buildNoteGateQuestions, mergeJevNoteGateAnswers, routeNoteCandidates, validateNoteGateDecisionSet } from '../src/knowledge-router/note-gate.ts';

const candidates = [
  { candidateId: 'expand-definition', operationKind: 'expand', targetRefs: ['note.md'], lessonItemRefs: ['lm-1'], sourceUnitRefs: ['sm-1'], rationale: '已有页面部分覆盖，补充定义。', proposedText: '定义补充。', existingCoverage: 'partial' },
  { candidateId: 'deferred-formula', operationKind: 'expand', targetRefs: ['note.md'], lessonItemRefs: ['lm-2'], sourceUnitRefs: ['sm-2'], rationale: '暂缓：公式缺失，证据不足。', proposedText: '公式待补。', existingCoverage: 'partial' },
  { candidateId: 'covered', operationKind: 'no_change', targetRefs: ['note.md'], lessonItemRefs: ['lm-3'], sourceUnitRefs: ['sm-3'], rationale: '已有知识已经覆盖。', existingCoverage: 'covered' },
];

const base = routeNoteCandidates(candidates);
assert.equal(base.counts.include, 1);
assert.equal(base.counts.defer, 1);
assert.equal(base.counts['skip-duplicate'], 1);
assert.deepEqual(validateNoteGateDecisionSet(base, candidates), []);
const questions = buildNoteGateQuestions(candidates);
assert.equal(questions['expand-definition:route'].type, 'choice');
assert.equal(questions['expand-definition:evidenceSufficiency'].type, 'score');

const client = new TypeSafeClient({ apiKey: 'test-key', fetchImpl: async (_url, init) => {
  const body = JSON.parse(init.body);
  const answers = {};
  for (const item of body.state) {
    answers[`${item.candidateId}:route`] = { type: 'choice', choice: item.candidateId === 'expand-definition' ? 'include' : 'include', confidence: 0.95 };
    answers[`${item.candidateId}:role`] = { type: 'choice', choice: 'concept', confidence: 0.9 };
    answers[`${item.candidateId}:learningValue`] = { type: 'score', score: 2, confidence: 0.9 };
    answers[`${item.candidateId}:evidenceSufficiency`] = { type: 'score', score: item.candidateId === 'deferred-formula' ? 0 : 2, confidence: 0.9 };
    answers[`${item.candidateId}:redundancy`] = { type: 'score', score: item.candidateId === 'covered' ? 2 : 0, confidence: 0.9 };
    answers[`${item.candidateId}:reviewUtility`] = { type: 'score', score: 2, confidence: 0.9 };
  }
  return { ok: true, status: 200, async json() { return { model: 'jev-test', answers }; }, async text() { return ''; } };
} });
const merged = mergeJevNoteGateAnswers(base, await client.systemOne([], questions));
assert.equal(merged.decisions.find(item => item.candidateId === 'deferred-formula')?.route, 'defer');
assert.equal(merged.decisions.find(item => item.candidateId === 'covered')?.route, 'skip-duplicate');
assert.deepEqual(validateNoteGateDecisionSet(merged, candidates), []);
console.log('note inclusion gate checks passed');
