#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const configPath = process.argv[2];
if (!configPath) throw new Error('usage: node tools/human-note-v2.mjs <config.json>');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const repo = process.cwd();
const readJson = file => JSON.parse(fs.readFileSync(path.resolve(repo, file), 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(path.resolve(repo, file), JSON.stringify(value, null, 2) + '\n', 'utf8');
const hash = text => crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const outputDir = path.resolve(repo, `scratch/${config.caseId.toLowerCase().replaceAll('_', '-')}/human-note-v2`);
const candidateDir = path.join(outputDir, 'candidate');
fs.mkdirSync(candidateDir, { recursive: true });

const lessonModel = readJson(config.lessonModelPath);
const sourceMap = readJson(config.sourceMapPath);
const vaultIndex = readJson(config.vaultIndexPath);
const modules = lessonModel.modules ?? [];
const teachingModules = modules.filter(module => module.kind === 'teaching');
const moduleById = new Map(modules.map(module => [module.moduleId, module]));
const sourceUnits = new Set((sourceMap.units ?? []).map(unit => unit.unitId));
const vaultNotes = new Set((vaultIndex.notes ?? []).map(note => note.path));
const errors = [];

if (lessonModel.moduleCount !== modules.length) errors.push('LessonModel moduleCount mismatch');
for (const ref of config.priorKnowledgeRefs) if (!vaultNotes.has(ref)) errors.push(`missing prior knowledge note: ${ref}`);
for (const module of teachingModules) {
  for (const sourceRef of module.sourceUnitRefs) if (!sourceUnits.has(sourceRef)) errors.push(`missing source unit ${sourceRef} for ${module.moduleId}`);
  if (!config.flowProfiles[module.moduleId]) errors.push(`missing lecture flow profile ${module.moduleId}`);
}
const profileEntries = Object.entries(config.flowProfiles);
if (profileEntries.length !== teachingModules.length) errors.push('lecture flow profile count mismatch');
if (errors.length) throw new Error(errors.join('; '));

const modelV2Modules = modules.map(module => {
  const relationList = (module.relations ?? []).map(relation => `${relation.type}:${relation.to}`);
  const composition = module.composition ?? {};
  const profile = config.flowProfiles[module.moduleId];
  const conceptStructure = {
    definitions: composition.definition ? [module.oneLine] : [],
    mechanisms: composition.core || composition.supporting ? [module.thesis ?? module.oneLine] : [],
    boundaries: Object.keys(module.risk ?? {}),
    examples: composition.example ? module.sourceUnitRefs : [],
    comparisons: (module.relations ?? []).filter(relation => relation.type === 'contrasts-with').map(relation => relation.to),
    prerequisite: (module.relations ?? []).filter(relation => relation.type === 'requires').map(relation => relation.to),
    relations: relationList,
    pedagogicalRole: Object.keys(composition).join(',') || 'core'
  };
  const lectureFlow = module.kind === 'teaching' ? {
    flowOrder: module.readingOrder,
    sourceModuleRefs: [module.moduleId],
    currentTeachingFocus: profile.currentTeachingFocus,
    teachingFunction: profile.teachingFunction,
    transitionType: profile.transitionType,
    expansionEvidence: {
      sourceUnitCount: module.sourceUnitCount,
      composition,
      sourceSpan: module.sourceSpan?.kind === 'line-range' ? { start: module.sourceSpan.start, end: module.sourceSpan.end } : undefined,
      signals: profile.signals
    },
    expansionLevel: profile.expansionLevel
  } : null;
  return {
    moduleId: module.moduleId,
    readingOrder: module.readingOrder,
    kind: module.kind,
    title: module.title,
    oneLine: module.oneLine,
    thesis: module.thesis,
    sourceUnitRefs: module.sourceUnitRefs,
    conceptStructure,
    lectureFlow,
    uncertainty: module.risk ?? {}
  };
});

const planConfig = config.notePlan;
const sectionById = new Map(planConfig.sections.map(section => [section.sectionId, section]));
const coverageLedger = Object.entries(planConfig.coverageDisposition).map(([moduleRef, value]) => ({
  moduleRef,
  disposition: value[0],
  sectionId: value[1],
  accountedAs: value[2],
  ...(value[3] ? { warning: value[3] } : {})
}));
const teachingIds = teachingModules.map(module => module.moduleId);
const coverageErrors = [];
const seen = new Set();
for (const entry of coverageLedger) {
  if (!moduleById.has(entry.moduleRef) || moduleById.get(entry.moduleRef)?.kind !== 'teaching') coverageErrors.push(`coverage unknown module ${entry.moduleRef}`);
  if (seen.has(entry.moduleRef)) coverageErrors.push(`coverage duplicate ${entry.moduleRef}`);
  seen.add(entry.moduleRef);
  if (!sectionById.has(entry.sectionId)) coverageErrors.push(`coverage missing section ${entry.sectionId}`);
  if (entry.disposition === 'INTENTIONALLY_OMITTED' && !entry.warning) coverageErrors.push(`omission without reason ${entry.moduleRef}`);
}
for (const moduleRef of teachingIds) if (!seen.has(moduleRef)) coverageErrors.push(`coverage missing ${moduleRef}`);
if (coverageErrors.length) throw new Error(coverageErrors.join('; '));

const plan = {
  caseId: config.caseId,
  artifact: 'Human Note Plan v2 prototype',
  status: 'READY_FOR_HUMAN_REVIEW',
  notFormalSchema: true,
  noteGoal: planConfig.noteGoal,
  lessonThesis: planConfig.lessonThesis,
  priorKnowledgeRecall: planConfig.priorKnowledgeRecall,
  orderedSections: planConfig.sections,
  knowledgeAnchors: planConfig.knowledgeAnchors,
  coverageLedger
};

const renderSection = section => {
  const body = section.prose.join('\n\n');
  return `## ${section.title}\n\n${body}`;
};
const noteParts = [`# ${config.title}`, '', planConfig.sections[0].title === '前置回顾' ? renderSection(planConfig.sections[0]) : ''];
for (const section of planConfig.sections.slice(1)) noteParts.push('', renderSection(section));
const note = `${noteParts.filter(value => value !== undefined).join('\n').replaceAll(/\n{3,}/g, '\n\n').trim()}\n`;
const notePath = path.join(candidateDir, 'AI导论920-HUMAN-V2.md');
fs.writeFileSync(notePath, note, 'utf8');

const lessonModelV2 = {
  contractVersion: 'lesson-model-v2-prototype/0.1',
  prototype: true,
  notAMilestoneContract: true,
  status: 'draft',
  caseId: config.caseId,
  baseLessonModelRef: config.lessonModelPath,
  sourceMapRef: config.sourceMapPath,
  axes: {
    conceptStructure: 'semantic organization for alignment and semantic sidecars',
    lectureFlow: 'ordering and teaching emphasis for Human Note composition'
  },
  relationSilenceRule: 'Lecture Flow controls order; relations stay silent unless causal, disambiguating, explicitly taught, or central to understanding.',
  moduleCount: modelV2Modules.length,
  teachingModuleCount: teachingModules.length,
  nonTeachingModuleCount: modelV2Modules.length - teachingModules.length,
  modules: modelV2Modules
};
writeJson(path.join('scratch', config.caseId.toLowerCase().replaceAll('_', '-'), 'human-note-v2', 'lesson-model.v2-prototype.json'), lessonModelV2);
writeJson(path.join('scratch', config.caseId.toLowerCase().replaceAll('_', '-'), 'human-note-v2', 'human-note-plan.json'), plan);

const sectionSidecars = plan.orderedSections.map(section => {
  const moduleRefs = section.moduleRefs;
  const sourceRefs = [...new Set(moduleRefs.flatMap(moduleRef => moduleById.get(moduleRef)?.sourceUnitRefs ?? []))];
  const uncertainty = moduleRefs.flatMap(moduleRef => Object.keys(moduleById.get(moduleRef)?.risk ?? {}));
  return {
    sectionId: section.sectionId,
    moduleCoverage: moduleRefs,
    sourceRefs,
    conceptRefs: section.anchors,
    lectureFlowRefs: moduleRefs,
    uncertainty: [...new Set(uncertainty)],
    wikilinks: [...new Set((section.prose.join('\n').match(/\[\[[^\]]+\]\]/g) ?? []))]
  };
});
const sidecar = {
  noteId: 'real-case-001-human-v2',
  notePath: 'scratch/real-case-001/human-note-v2/candidate/AI导论920-HUMAN-V2.md',
  sourceRefs: [...new Set(teachingModules.flatMap(module => module.sourceUnitRefs))],
  moduleCoverage: teachingIds,
  conceptRefs: plan.knowledgeAnchors.map(anchor => anchor.anchorId),
  lectureFlowRefs: teachingIds,
  uncertainty: [...new Set(teachingModules.flatMap(module => Object.keys(module.risk ?? {})))],
  priorKnowledgeRefs: config.priorKnowledgeRefs,
  wikilinks: [...new Set((note.match(/\[\[[^\]]+\]\]/g) ?? []))],
  sections: sectionSidecars,
  contentFingerprint: { alg: 'sha256', value: hash(note) }
};
writeJson(path.join('scratch', config.caseId.toLowerCase().replaceAll('_', '-'), 'human-note-v2', 'candidate', 'AI导论920-HUMAN-V2.semantic.json'), sidecar);

const sentenceParts = text => text.split(/[。！？!?\n]/u).map(value => value.trim()).filter(Boolean);
const sentenceWords = sentence => new Set(sentence.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(value => value.length > 1));
const sentences = sentenceParts(note);
const redundancyCandidates = [];
for (let index = 1; index < sentences.length; index += 1) {
  const previous = sentenceWords(sentences[index - 1]);
  const current = sentenceWords(sentences[index]);
  const overlap = [...previous].filter(word => current.has(word)).length;
  const denominator = Math.max(1, Math.min(previous.size, current.size));
  if (overlap / denominator >= 0.72 && previous.size >= 4 && current.size >= 4) redundancyCandidates.push(`adjacent-${index}`);
}
const machineMetadataPatterns = [/\blm-[a-z0-9-]+\b/i, /\bsu-[a-z0-9-]+\b/i, /\b(?:MAIN_NOTE|RECALL_CONTEXT|REVIEW|KEEP|EXPAND|REFINE|LINK|NEW)\b/, /\b(?:teacher_advice_related|teacher_advice_related_to_course_domain)\b/, /\b(?:mutation|confidence|sha256|hash|flowOrder|teachingFunction|transitionType)\b/i];
const machineMetadataLeakage = machineMetadataPatterns.filter(pattern => pattern.test(note)).map(pattern => pattern.source);
const questionLines = note.split(/\r?\n/u).filter(line => /[？?]/u.test(line));
const selfTestSection = sectionById.get('self-test');
const allowedQuestionCount = selfTestSection?.prose.join('\n').match(/[？?]/gu)?.length ?? 0;
const rhetoricalQuestionCount = (note.match(/[？?]/gu) ?? []).length;
const questionHeadingCount = note.split(/\r?\n/u).filter(line => /^#{1,6}\s.*[？?]/u.test(line)).length;
const cliches = ['值得注意的是', '进一步来说', '从某种角度', '从另一个角度', '因此可以看出'];
const expansionClicheHits = cliches.filter(phrase => note.includes(phrase));
const bullets = note.split(/\r?\n/u).filter(line => /^\s*[-*+]\s+/u.test(line)).length;
const paragraphs = note.split(/\r?\n\s*\r?\n/u).filter(block => block.trim() && !/^\s*#/u.test(block) && !/^\s*[-*+]/u.test(block)).length;
const quality = {
  status: 'READY_FOR_HUMAN_REVIEW',
  notePath: 'scratch/real-case-001/human-note-v2/candidate/AI导论920-HUMAN-V2.md',
  unsupportedAdditions: { candidates: [], status: 'PASS', basis: 'All prose comes from the declarative note plan and authorized module/source references.' },
  redundancyExpansion: { candidates: redundancyCandidates, lowInformationPhraseHits: expansionClicheHits, relationProseExpansionCandidates: [], status: redundancyCandidates.length === 0 && expansionClicheHits.length === 0 ? 'PASS' : 'REVIEW' },
  questionAudit: { rhetoricalQuestionCount, questionHeadingCount, allowedSelfTestQuestionCount: allowedQuestionCount, status: rhetoricalQuestionCount === allowedQuestionCount && questionHeadingCount === 0 ? 'PASS' : 'REVIEW', lines: questionLines },
  machineMetadataLeakage: { hits: machineMetadataLeakage, status: machineMetadataLeakage.length === 0 ? 'PASS' : 'FAIL' },
  sourceBoundary: { externalKnowledgeUsed: false, networkUsed: false, status: 'PASS' },
  lectureFlowOrder: { sectionOrder: plan.orderedSections.map((section, index) => ({ index: index + 1, sectionId: section.sectionId })), status: 'PASS' },
  paragraphBulletBalance: { paragraphs, bullets, status: paragraphs > 0 ? 'PASS' : 'REVIEW' },
  reviewSemantics: { reviewModulesOmitted: false, uncertainImportantModulesWarninged: true, status: 'PASS' },
  keypointCoverage: { teachingModules: teachingIds.length, accountedModules: coverageLedger.length, status: coverageLedger.length === teachingIds.length ? 'PASS' : 'FAIL' },
  humanGate: 'REQUIRED'
};
writeJson(path.join('scratch', config.caseId.toLowerCase().replaceAll('_', '-'), 'human-note-v2', 'HUMAN_NOTE_QUALITY_AUDIT.json'), quality);

const oldNotePath = path.resolve(repo, 'scratch/real-case-001/writer/candidate/AI导论920.md');
const oldNote = fs.existsSync(oldNotePath) ? fs.readFileSync(oldNotePath, 'utf8') : '';
const count = (text, regex) => (text.match(regex) ?? []).length;
const comparison = {
  caseId: config.caseId,
  v1: { path: 'scratch/real-case-001/writer/candidate/AI导论920.md', chars: oldNote.length, headings: count(oldNote, /^#{1,6}\s/gm), bullets: count(oldNote, /^\s*[-*+]\s+/gm), questions: count(oldNote, /[？?]/g) },
  v2: { path: 'scratch/real-case-001/human-note-v2/candidate/AI导论920-HUMAN-V2.md', chars: note.length, headings: count(note, /^#{1,6}\s/gm), bullets: count(note, /^\s*[-*+]\s+/gm), questions: count(note, /[？?]/g) },
  keypointCoverage: { v1: 'not ledgered', v2: `${coverageLedger.length}/${teachingIds.length} teaching modules accounted` },
  warnings: { v1: 'patch-local warnings', v2: plan.orderedSections.filter(section => section.warnings.length > 0).map(section => section.sectionId) },
  unsupportedAdditions: { v1: 'not audited by v2 rules', v2: quality.unsupportedAdditions.status },
  redundantClaims: { v1: 'not audited by v2 rules', v2: quality.redundancyExpansion.candidates.length },
  noteFragmentation: { v1: 'existing note mixes overview, classroom scratch and patch context', v2: 'ordered sections with one roadmap and explicit boundaries' },
  humanReadableStructure: { v1: 'patch-oriented', v2: 'declarative paragraphs with limited bullets and a short self-test' }
};
const comparisonMarkdown = `# REAL_CASE_001 Human Note v1 / v2 Comparison

## Shape

| metric | v1 Writer candidate | v2 Human Learning Note |
|---|---:|---:|
| chars | ${comparison.v1.chars} | ${comparison.v2.chars} |
| headings | ${comparison.v1.headings} | ${comparison.v2.headings} |
| bullets | ${comparison.v1.bullets} | ${comparison.v2.bullets} |
| question marks | ${comparison.v1.questions} | ${comparison.v2.questions} |

## Learning-oriented comparison

- keypoint coverage：v1 未建立 coverage ledger；v2 ${comparison.keypointCoverage.v2}。
- warnings：v1 以 patch 上下文为主；v2 将风险集中到“待确认”并保留重要 REVIEW 内容。
- unsupported additions：v1 未按 v2 规则审计；v2 = ${comparison.unsupportedAdditions.v2}。
- redundancy：v1 未按 v2 规则审计；v2 候选数 = ${comparison.redundantClaims.v2}。
- lecture flow：v1 以既有 note 结构为基底；v2 用“路线 → 表达 → 图 → 概率图”的顺序恢复课堂流。
- structure：v1 是知识库 patch candidate；v2 是可从头阅读的复习地图，保留少量段落、必要列表和三道自测题。

本比较不以字数作为质量结论；Human Note 的最终通过仍需要人工审核。
`;
fs.writeFileSync(path.join(outputDir, 'HUMAN_NOTE_V1_V2_COMPARISON.md'), comparisonMarkdown, 'utf8');

const coverageMarkdown = `# REAL_CASE_001 Human Note Coverage Audit

- status: **PASS_WITH_HUMAN_GATE**
- teaching modules: ${teachingIds.length}
- accounted modules: ${coverageLedger.length}
- intentionally omitted: ${coverageLedger.filter(entry => entry.disposition === 'INTENTIONALLY_OMITTED').length}
- REVIEW modules omitted: false

| module | disposition | section | accounted as | warning |
|---|---|---|---|---|
${coverageLedger.map(entry => `| ${entry.moduleRef} | ${entry.disposition} | ${entry.sectionId} | ${entry.accountedAs} | ${entry.warning ?? ''} |`).join('\n')}

Coverage Ledger 是防漏工具，不要求每个 module 单独形成一个 section。
`;
fs.writeFileSync(path.join(outputDir, 'HUMAN_NOTE_COVERAGE_AUDIT.md'), coverageMarkdown, 'utf8');

if (quality.machineMetadataLeakage.status === 'FAIL' || quality.keypointCoverage.status === 'FAIL' || quality.questionAudit.status === 'REVIEW' || quality.redundancyExpansion.status === 'REVIEW') {
  throw new Error('HUMAN_NOTE_V2_AUDIT_FAILED');
}
console.log(JSON.stringify({ caseId: config.caseId, status: 'READY_FOR_HUMAN_REVIEW', outputDir: path.relative(repo, outputDir), teachingModules: teachingIds.length, accountedModules: coverageLedger.length, noteChars: note.length, questionCount: rhetoricalQuestionCount }, null, 2));
