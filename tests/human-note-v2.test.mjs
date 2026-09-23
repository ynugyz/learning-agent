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

console.log('human-note-v2 tests passed');
