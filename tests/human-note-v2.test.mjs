import assert from 'node:assert/strict';
import {
  auditExpansionLevels,
  auditHumanNote,
  detectBaselineCopy,
  detectMachineMetadataLeakage,
  detectRelationProseExpansion,
  validateCoverageLedger,
  validatePriorKnowledgeRecall,
  validateSourceBoundary
} from '../src/human-note-v2/audits.ts';
import {
  auditBlockStructure,
  auditBlockFragmentation,
  auditContentBoundaries,
  auditNoteBoundaries,
  auditScanability
} from '../src/human-note-v2/structure-audits.ts';
import { renderV22Example, selectV22Warnings, validateV22Enrichment } from '../src/human-note-v2/composer-v2-1.ts';

const basePlan = {
  orderedSections: [{ sectionId: 'self-test' }],
  coverageLedger: [{ moduleRef: 'm1', disposition: 'MAIN_NOTE', sectionId: 'main', accountedAs: 'x' }]
};

// REVIEW content must not disappear from a ledger merely because it is uncertain.
assert.deepEqual(validateCoverageLedger(basePlan, ['m1']), []);
assert.deepEqual(validateCoverageLedger({ ...basePlan, coverageLedger: [] }, ['m1']), ['unaccounted module: m1']);

// Generic machine metadata leakage check.
const leaked = auditHumanNote('内容。lm-rc001-m03。', basePlan);
assert.equal(leaked.machineMetadataLeakage.length > 0, true);
assert.equal(detectMachineMetadataLeakage('内容。teacher_advice_related。').length > 0, true);

// Question audit allows a self-test question but does not allow question headings.
const selfTest = auditHumanNote('# Note\n\n## 自测\n\n能否复述主线？', basePlan);
assert.equal(selfTest.questionHeadingCount, 0);
assert.equal(selfTest.rhetoricalQuestionCount, 1);

// Low-information expansion phrases are surfaced for review.
const cliche = auditHumanNote('结论。进一步来说，这个结论很重要。', basePlan);
assert.deepEqual(cliche.expansionClicheHits, ['进一步来说']);
assert.equal(detectRelationProseExpansion('A 为 B 奠定基础，进一步引出 C。').length, 2);

// High expansion levels cannot silently collapse to zero/one sentence, while a
// MENTION item cannot become a long essay.
assert.deepEqual(auditExpansionLevels([
  { sectionId: 'anchor', expansionLevel: 'ANCHOR', sentenceCount: 1 },
  { sectionId: 'mention', expansionLevel: 'MENTION', sentenceCount: 3 }
]), ['under-expanded:anchor', 'over-expanded:mention']);

// Source boundary and prior-context checks surface unsupported additions and
// missing first-chapter recall instead of letting them disappear silently.
assert.deepEqual(validateSourceBoundary(['su-ok', 'su-external'], new Set(['su-ok'])), ['unsupported-source:su-external']);
assert.deepEqual(validatePriorKnowledgeRecall(['三大流派回顾'], ['三大流派']), []);
assert.deepEqual(validatePriorKnowledgeRecall([], ['三大流派']), ['missing-prior-context:三大流派']);

// Copying an old note wholesale is a structural failure even if every sentence
// is individually valid.
assert.equal(detectBaselineCopy('新标题\n\n旧内容', '旧内容'), true);

const block = (id, overrides = {}) => ({
  blockId: id,
  title: id,
  sectionId: 'main',
  moduleRefs: [id],
  sourceRefs: [`su-${id}`],
  blockRole: 'CONCEPT',
  recallTarget: id,
  recallTargets: [id],
  contentRoles: ['CONCEPT'],
  coreStatements: ['一个陈述。'],
  supportingDetails: [],
  exampleRefs: [],
  warningRefs: [],
  expansionLevel: 'EXPLAINED',
  displayMode: 'PARAGRAPH',
  mustSeparateFrom: [],
  mergeRationale: '同一支点。',
  flowOrder: 1,
  ...overrides
});
const section = [{ sectionId: 'main', title: '主段' }];
const order = new Map([['route', 1], ['advice', 2], ['logic', 3], ['predicate', 4], ['graph', 5], ['probability', 6], ['behavior', 7], ['example', 8]]);

// Chapter boundaries: a two-chapter lesson collapsed into one session note fails.
assert.ok(auditNoteBoundaries([{ chapterId: 'chapter-1', chapterTitle: '一章', moduleRefs: ['route'], chapterBoundaryEvidence: [], plannedAction: 'CREATE_CHAPTER_NOTE', grain: 'SESSION' }], ['route', 'logic'], 2).some(error => error === 'NOTE_BOUNDARY_COLLAPSE'));
assert.ok(auditNoteBoundaries([{ chapterId: 'chapter-1', chapterTitle: '一章', moduleRefs: ['route'], chapterBoundaryEvidence: [{ sourceUnitRef: 'su-boundary', kind: 'teacher-explicit' }], plannedAction: 'CREATE_CHAPTER_NOTE', grain: 'CHAPTER' }, { chapterId: 'chapter-2', chapterTitle: '二章', moduleRefs: ['logic'], chapterBoundaryEvidence: [{ sourceUnitRef: 'su-boundary', kind: 'teacher-explicit' }], plannedAction: 'CREATE_CHAPTER_NOTE', grain: 'CHAPTER' }], ['route', 'logic'], 2).length === 0);

// Independent route/advice targets cannot collapse into one presentation block.
const collapsedRoute = block('route', { recallTargets: ['route', 'hybrid', 'advice'], contentRoles: ['CONCEPT', 'ADVICE'], moduleRefs: ['route', 'advice'], sourceRefs: ['su-route', 'su-advice'] });
const routeAudit = auditBlockStructure([collapsedRoute], section, order);
assert.equal(routeAudit.status, 'FAIL');
assert.ok(routeAudit.blockCollapseCandidates.includes('route'));
assert.ok(routeAudit.multiRoleBlocks.includes('route'));

// Propositional and predicate logic, or graph and probability graph, cannot share a recall block.
assert.ok(auditBlockStructure([block('logic', { recallTargets: ['命题逻辑', '谓词逻辑'], moduleRefs: ['logic', 'predicate'] })], section, order).errors.some(error => error.startsWith('BLOCK_COLLAPSE')));
assert.ok(auditBlockStructure([block('graph', { recallTargets: ['知识图谱', '概率图'], moduleRefs: ['graph', 'probability'] })], section, order).errors.some(error => error.startsWith('BLOCK_COLLAPSE')));

// A concept example belongs in the concept block; splitting it into another block is fragmentation.
assert.ok(auditBlockStructure([block('behavior', { recallTarget: '行为主义' }), block('example', { recallTarget: '行为主义', moduleRefs: ['example'], flowOrder: 2 })], section, new Map([['behavior', 1], ['example', 2]])).errors.some(error => error.startsWith('DISCOURSE_FRAGMENTATION')));
// Definition / role / example title walls are surfaced as repeated recall targets.
assert.ok(auditBlockStructure([block('a', { recallTarget: '同一概念' }), block('b', { recallTarget: '同一概念', flowOrder: 2 }), block('c', { recallTarget: '同一概念', flowOrder: 3 })], section, new Map([['a', 1], ['b', 1], ['c', 1]])).errors.filter(error => error.startsWith('DISCOURSE_FRAGMENTATION')).length >= 2);

// Lecture flow cannot be reordered by presentation planning.
assert.ok(auditBlockStructure([block('route', { flowOrder: 2 }), block('logic', { flowOrder: 1 })], section, order).errors.some(error => error.startsWith('LECTURE_FLOW_ORDER')));

// Existing Vault context cannot suppress a new delta or a REVIEW module.
assert.ok(auditContentBoundaries([block('route')], ['route', 'new-delta', 'review'], new Set(['su-route']), ['new-delta'], ['review']).some(error => error === 'VAULT_SUPPRESSED_DELTA:new-delta'));
assert.ok(auditContentBoundaries([block('route')], ['route'], new Set(['su-route']), [], ['review']).some(error => error === 'REVIEW_OMITTED:review'));

// Scanability requires visible titles for the planned blocks.
assert.equal(auditScanability([block('route')], section, []).status, 'FAIL');

// BLOCK_FRAGMENTATION: a module-per-block wall is not the target, and a
// repeated recall target is a split error even when every block looks valid.
assert.equal(auditBlockFragmentation([
  block('route', { moduleRefs: ['route', 'legacy'], recallTarget: 'symbolic-family' }),
  block('logic', { moduleRefs: ['logic', 'truth', 'proof'], recallTarget: '命题逻辑' }),
  block('predicate', { moduleRefs: ['predicate'], recallTarget: '谓词逻辑' })
]).status, 'PASS');
const fragmented = auditBlockFragmentation([
  block('definition', { recallTarget: '同一概念', expansionLevel: 'MENTION' }),
  block('operation', { recallTarget: '同一概念', flowOrder: 2, expansionLevel: 'MENTION' }),
  block('example', { recallTarget: '同一概念', flowOrder: 3, expansionLevel: 'MENTION' }),
  block('tiny', { recallTarget: 'tiny', flowOrder: 4, expansionLevel: 'MENTION', coreStatements: ['短。'] })
]);
assert.equal(fragmented.status, 'FAIL');
assert.ok(fragmented.sameRecallTargetSplits.length >= 2);
assert.ok(fragmented.tinyBlockCandidates.includes('tiny'));

// v2.2 bounded pedagogical enrichment: a triggered Bayesian-network block may
// receive one canonical definition while remaining on its existing target.
const bayesBlock = block('ch2-bayes-network', { recallTarget: '贝叶斯网络', moduleRefs: ['lm-rc001-m29'] });
assert.deepEqual(validateV22Enrichment({
  targetBlockId: 'ch2-bayes-network',
  recallTarget: '贝叶斯网络',
  enrichmentType: 'CANONICAL_DEFINITION',
  introducesNewRecallTarget: false
}, bayesBlock), []);

// d-separation is a new independent concept and must fail the topic lock.
assert.ok(validateV22Enrichment({
  targetBlockId: 'ch2-bayes-network',
  recallTarget: '贝叶斯网络',
  enrichmentType: 'CANONICAL_DEFINITION',
  introducesNewRecallTarget: true
}, bayesBlock).includes('NEW_RECALL_TARGET:ch2-bayes-network'));

// An enrichment for an untriggered or different target cannot pass the same
// validator, which covers the no-new-knowledge-title case.
assert.ok(validateV22Enrichment({
  targetBlockId: 'ch2-bayes-network',
  recallTarget: 'd-separation',
  enrichmentType: 'CANONICAL_DEFINITION',
  introducesNewRecallTarget: false
}, bayesBlock).some(error => error.startsWith('ENRICHMENT_RECALL_TARGET_MISMATCH')));

// A warning about unused unstable material is suppressed; a warning policy
// does not make every source uncertainty human-visible.
assert.deepEqual(selectV22Warnings('ch2-bayes-network', ['公式需要回看来源']), {
  visible: [],
  suppressed: ['公式需要回看来源']
});

// If an example is already stated naturally, do not emit a second machine-like
// “课堂例子” label.
assert.deepEqual(renderV22Example({ exampleRefs: ['婴儿学步'] }, ['婴儿学步是课堂用来说明行动—反馈—调整的类比。']), {
  text: '',
  duplicateLabel: true
});

// A canonical enrichment that would exceed the block target is rejected by the
// same topic-lock validation before it can reach the candidate note.
assert.ok(validateV22Enrichment({
  targetBlockId: 'ch2-bayes-network',
  recallTarget: '贝叶斯网络',
  enrichmentType: 'MINIMAL_EXPLANATION',
  introducesNewRecallTarget: true
}, bayesBlock).length > 0);

console.log('human-note-v2 tests passed');
