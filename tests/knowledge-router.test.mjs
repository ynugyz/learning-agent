import assert from 'node:assert/strict';
import { routeSourceMap, mergeJevRouterAnswers, validateRouterDecisionSet } from '../src/knowledge-router/index.ts';
import { auditHumanNote } from '../src/quality/index.ts';
import { applySectionPatch, boundedLocalRepair } from '../src/quality/patch.ts';

const sourceMap = {
  sourcePackageId: 'router-fixture',
  units: [
    { unitId: 'definition', contentType: 'definition', epistemicStatus: 'source-explicit', preservation: { priority: 'high', isInference: true }, summary: '定义', keyTerms: ['定义'], confidence: { level: 'high' } },
    { unitId: 'example', contentType: 'example', epistemicStatus: 'analogy', preservation: { priority: 'high', isInference: true }, summary: '例子', keyTerms: ['例子'], confidence: { level: 'high' } },
    { unitId: 'uncertain-formula', contentType: 'formula', epistemicStatus: 'uncertain', preservation: { priority: 'high', isInference: true }, summary: '公式缺失', keyTerms: ['公式'], confidence: { level: 'low' }, observations: [{ observation: 'has-notational-risk', advisory: true }] },
    { unitId: 'admin', contentType: 'administrative', epistemicStatus: 'source-explicit', preservation: { priority: 'low', isInference: true }, summary: '下课', confidence: { level: 'high' } },
  ],
};

const shadow = routeSourceMap(sourceMap, 'shadow');
assert.equal(shadow.decisions.length, sourceMap.units.length);
assert.equal(shadow.counts.compile, 1);
assert.equal(shadow.counts.support, 1);
assert.equal(shadow.counts.review, 1);
assert.equal(shadow.counts['retain-only'], 1);
assert.ok(shadow.selectedForLessonModel.includes('uncertain-formula'));
assert.ok(shadow.retainedOnly.includes('admin'));
assert.deepEqual(validateRouterDecisionSet(shadow, sourceMap), []);
assert.ok(validateRouterDecisionSet({ ...shadow, decisions: shadow.decisions.slice(0, 3) }, sourceMap).some(error => error.startsWith('missing decision')));

const merged = mergeJevRouterAnswers(shadow, { admin: { route: 'retain-only', confidence: 0.9 }, 'uncertain-formula': { route: 'retain-only', confidence: 0.9 } });
assert.equal(merged.decisions.find(item => item.unitId === 'uncertain-formula')?.route, 'review', 'uncertain material must not be dropped by Jev route');

const note = '# 知识页\n\n## 定义\n\n定义内容。\n\n## 机制\n\n机制内容。\n';
const patch = applySectionPatch(note, { targetHeading: '机制', replacement: '机制内容补充。\n\n- 一个有用例子。' });
assert.equal(patch.applied, true);
assert.match(patch.note, /机制内容补充/);
assert.match(patch.note, /## 定义[\s\S]*定义内容/u);
assert.equal(applySectionPatch(note, { targetHeading: '机制', replacement: 'contractVersion: bad' }).applied, false);
let repairCalls = 0;
const repair = await boundedLocalRepair(note, auditHumanNote(note, sourceMap), async () => repairCalls++ === 0 ? ({ targetHeading: '机制', replacement: '机制内容。\n\n局部补充。' }) : null, 2, async currentNote => auditHumanNote(currentNote, sourceMap));
assert.equal(repair.rounds, 1);
assert.equal(repair.deferred, true);

const quality = auditHumanNote('# 知识页\n\n## 定义\n\n课堂上老师说：定义。', sourceMap, undefined, `${note}\n## 已有边界章节\n\n原有内容必须完整保留并且不能被静默删除。`);
assert.equal(quality.status, 'FAIL');
assert.ok(quality.issues.some(item => item.code === 'CLASSROOM_NARRATION'));
assert.ok(quality.issues.some(item => item.code === 'BASELINE_CONTENT_DROPPED'));
console.log('knowledge router and quality gate checks passed');
