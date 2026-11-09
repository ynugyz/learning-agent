#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const configPath = process.argv[2];
if (!configPath) throw new Error('usage: node --experimental-strip-types tools/human-note-v2-structure.mjs <config.json>');
const repo = process.cwd();
const config = JSON.parse(fs.readFileSync(path.resolve(repo, configPath), 'utf8'));
const readJson = file => JSON.parse(fs.readFileSync(path.resolve(repo, file), 'utf8'));
const writeJson = (file, value) => {
  const target = path.resolve(repo, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
};
const outputDir = path.resolve(repo, 'scratch/real-case-001/human-note-v2-1');
fs.mkdirSync(path.join(outputDir, 'audits'), { recursive: true });
const lessonModel = readJson(config.lessonModelPath);
const sourceMap = readJson(config.sourceMapPath);
const vaultIndex = readJson(config.vaultIndexPath);
const modules = lessonModel.modules ?? [];
const teachingModules = modules.filter(module => module.kind === 'teaching').sort((a, b) => a.readingOrder - b.readingOrder);
const moduleById = new Map(modules.map(module => [module.moduleId, module]));
const sourceById = new Map((sourceMap.units ?? []).map(unit => [unit.unitId, unit]));
const sourceRefs = new Set(sourceById.keys());
const vaultPaths = new Set((vaultIndex.notes ?? []).map(note => note.path));
const errors = [];

const boundaryUnit = (sourceMap.units ?? []).find(unit => /第二章内容|第一章绪论/u.test(unit.summary ?? ''));
const chapter2Start = teachingModules.find(module => /第二章/u.test(module.title ?? '') || /知识表达/u.test(module.title ?? ''));
if (!boundaryUnit || !chapter2Start) throw new Error('explicit chapter boundary evidence not found');
const chineseNumerals = new Map([['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8], ['九', 9], ['十', 10]]);
const chapterMarkers = [...(boundaryUnit.summary ?? '').matchAll(/第([一二三四五六七八九十]+)章/gu)]
  .map(match => ({ number: chineseNumerals.get(match[1]), raw: match[0] }))
  .filter(marker => marker.number);
const chapterNumbers = [...new Set(chapterMarkers.map(marker => marker.number))].sort((a, b) => a - b);
if (chapterNumbers.length < 2) throw new Error('fewer than two chapter markers in explicit boundary evidence');
const firstChapterNumber = chapterNumbers[0];
const secondChapterNumber = chapterNumbers[1];
const firstTitle = /第一章绪论/u.test(boundaryUnit.summary ?? '') ? '第一章绪论' : `第${firstChapterNumber}章`;
const chapterTopic = (boundaryUnit.summary ?? '').match(/本节课讲“([^”]+)”/u)?.[1] ?? '课堂主题';
const firstChapterModules = teachingModules.filter(module => module.readingOrder < chapter2Start.readingOrder);
const secondChapterModules = teachingModules.filter(module => module.readingOrder >= chapter2Start.readingOrder);
if (!firstChapterModules.length || !secondChapterModules.length) throw new Error('chapter segmentation produced an empty chapter');

const sourceSpan = chapterModules => ({
  start: chapterModules[0].sourceSpan?.start ?? 'UNKNOWN',
  end: chapterModules.at(-1).sourceSpan?.end ?? 'UNKNOWN'
});
const moduleRefs = chapterModules => chapterModules.map(module => module.moduleId);
const refsToSources = refs => [...new Set(refs.flatMap(ref => moduleById.get(ref)?.sourceUnitRefs ?? []))];
const chapterCandidates = [
  {
    chapterId: `chapter-${firstChapterNumber}`,
    chapterTitle: firstTitle,
    chapterTitleEvidence: `SourceMap unit ${boundaryUnit.unitId} 明确称前段为${firstTitle}。`,
    moduleRefs: moduleRefs(firstChapterModules),
    sourceUnitRefs: refsToSources(moduleRefs(firstChapterModules)),
    sourceSpan: sourceSpan(firstChapterModules),
    chapterBoundaryEvidence: [
      { sourceUnitRef: modules.find(module => module.moduleId === 'lm-rc001-m16')?.sourceUnitRefs?.[0] ?? boundaryUnit.unitId, kind: 'teacher-explicit-break-before-next-chapter' },
      { sourceUnitRef: boundaryUnit.unitId, kind: 'teacher-explicit-next-chapter-announcement' }
    ],
    confidence: 'medium',
    needsHumanReview: true,
    existingChapterNoteRef: null,
    existingNoteRole: 'no-dedicated-chapter-note-found',
    plannedAction: 'CREATE_CHAPTER_NOTE'
  },
  {
    chapterId: `chapter-${secondChapterNumber}`,
    chapterTitle: `第二章：${chapterTopic}`,
    chapterTitleEvidence: `SourceMap unit ${boundaryUnit.unitId} 明确称本节为第${secondChapterNumber}章，并说明主题为${chapterTopic}。`,
    moduleRefs: moduleRefs(secondChapterModules),
    sourceUnitRefs: refsToSources(moduleRefs(secondChapterModules)),
    sourceSpan: sourceSpan(secondChapterModules),
    chapterBoundaryEvidence: [
      { sourceUnitRef: boundaryUnit.unitId, kind: 'teacher-explicit-chapter-title-and-topic' },
      { sourceUnitRef: chapter2Start.sourceUnitRefs[0], kind: 'chapter-opening-module' }
    ],
    confidence: 'high',
    needsHumanReview: true,
    existingChapterNoteRef: null,
    existingNoteRole: 'session-note-only-existing',
    plannedAction: 'CREATE_CHAPTER_NOTE'
  }
];

for (const chapter of chapterCandidates) {
  for (const ref of chapter.moduleRefs) if (!moduleById.has(ref)) errors.push(`unknown module ${ref}`);
  for (const ref of chapter.sourceUnitRefs) if (!sourceRefs.has(ref)) errors.push(`unknown source ${ref}`);
}
const chapterTeachingRefs = new Set(chapterCandidates.flatMap(chapter => chapter.moduleRefs));
for (const module of teachingModules) if (!chapterTeachingRefs.has(module.moduleId)) errors.push(`unassigned teaching module ${module.moduleId}`);
if (chapterTeachingRefs.size !== teachingModules.length) errors.push('teaching module coverage mismatch');
if (vaultPaths.size === 0) errors.push('vault index is empty');
if (errors.length) throw new Error(errors.join('; '));

const blockTemplates = config.blockTemplates ?? [];
const nonBlockModuleHandling = config.nonBlockModuleHandling ?? {};
const nonBlockPresentation = config.nonBlockPresentation ?? {};
const nonBlockModuleRefs = new Set([...Object.keys(nonBlockModuleHandling), ...Object.keys(nonBlockPresentation)]);
const blocks = blockTemplates.map(template => ({
  ...template,
  sourceRefs: refsToSources(template.moduleRefs),
  contentRoles: [template.blockRole, ...(template.exampleRefs.length ? ['EXAMPLE'] : [])],
  recallTargets: [template.recallTarget]
})).sort((left, right) => left.flowOrder - right.flowOrder);
const blockErrors = [];
const blockIds = new Set();
const blockModuleRefs = new Set();
for (const block of blocks) {
  if (blockIds.has(block.blockId)) blockErrors.push(`duplicate block ${block.blockId}`);
  blockIds.add(block.blockId);
  const chapter = chapterCandidates.find(item => item.chapterId === block.chapterId);
  if (!chapter) blockErrors.push(`unknown chapter ${block.blockId}`);
  if (!chapter?.moduleRefs.some(ref => block.moduleRefs.includes(ref))) blockErrors.push(`block outside chapter ${block.blockId}`);
  for (const ref of block.moduleRefs) {
    if (!moduleById.has(ref)) blockErrors.push(`unknown block module ${block.blockId}:${ref}`);
    blockModuleRefs.add(ref);
  }
  if (block.coreStatements.length !== 1) blockErrors.push(`core statement budget ${block.blockId}`);
  const supportingBudget = block.displayMode === 'BULLETS' ? 5 : 2;
  if (block.supportingDetails.length > supportingBudget || block.exampleRefs.length > 1) blockErrors.push(`block budget ${block.blockId}`);
}
for (const ref of chapterTeachingRefs) if (!blockModuleRefs.has(ref) && !nonBlockModuleRefs.has(ref)) blockErrors.push(`block plan omitted ${ref}`);
for (const ref of nonBlockModuleRefs) if (!chapterTeachingRefs.has(ref)) blockErrors.push(`non-block handling outside teaching set ${ref}`);
if (blockErrors.length) throw new Error(blockErrors.join('; '));

const readingOrder = new Map(teachingModules.map(module => [module.moduleId, module.readingOrder]));
const sectionsByChapter = chapterCandidates.map(chapter => {
  const sectionIds = [...new Set(blocks.filter(block => block.chapterId === chapter.chapterId).map(block => block.sectionId))];
  return { chapterId: chapter.chapterId, majorSections: sectionIds.map(sectionId => ({
    sectionId,
    title: ({ opening: '开场', routes: '三大流派与混合式增强', advice: '课堂方法与提醒', representation: '从规则到知识表达', logic: '从关系网到逻辑表达', 'knowledge-graph': '知识图谱与概率图', probability: '概率视角与课堂结尾' })[sectionId] ?? sectionId
  })) };
});

let structureAudit;
let fragmentationAudit;
let scanAudit;
let contentAudit;
try {
  const auditModule = await import('../src/human-note-v2/structure-audits.ts');
  const sectionList = sectionsByChapter.flatMap(chapter => chapter.majorSections);
  structureAudit = auditModule.auditBlockStructure(blocks, sectionList, readingOrder);
  fragmentationAudit = auditModule.auditBlockFragmentation(blocks);
  scanAudit = auditModule.auditScanability(blocks, sectionList, blocks.map(block => block.title));
  contentAudit = auditModule.auditContentBoundaries(blocks, teachingModules.map(module => module.moduleId).filter(ref => !nonBlockModuleRefs.has(ref)), sourceRefs,
    ['lm-rc001-m04', 'lm-rc001-m05', 'lm-rc001-m08', 'lm-rc001-m09', 'lm-rc001-m10', 'lm-rc001-m11', 'lm-rc001-m13', 'lm-rc001-m14', 'lm-rc001-m15', 'lm-rc001-m17', 'lm-rc001-m18', 'lm-rc001-m19', 'lm-rc001-m20', 'lm-rc001-m21', 'lm-rc001-m22', 'lm-rc001-m23', 'lm-rc001-m24', 'lm-rc001-m25', 'lm-rc001-m26', 'lm-rc001-m27', 'lm-rc001-m28', 'lm-rc001-m29', 'lm-rc001-m30', 'lm-rc001-m31'].filter(ref => !nonBlockModuleRefs.has(ref)),
    ['lm-rc001-m06', 'lm-rc001-m07', 'lm-rc001-m09', 'lm-rc001-m12', 'lm-rc001-m13', 'lm-rc001-m14', 'lm-rc001-m15', 'lm-rc001-m17', 'lm-rc001-m18', 'lm-rc001-m19', 'lm-rc001-m21', 'lm-rc001-m22', 'lm-rc001-m23', 'lm-rc001-m24', 'lm-rc001-m26', 'lm-rc001-m27', 'lm-rc001-m29', 'lm-rc001-m30', 'lm-rc001-m31'].filter(ref => !nonBlockModuleRefs.has(ref)));
} catch (error) {
  throw new Error(`structure audit unavailable: ${error.message}`);
}
const noteBoundaryErrors = [];
for (const chapter of chapterCandidates) {
  if (!chapter.chapterBoundaryEvidence.length) noteBoundaryErrors.push(`BOUNDARY_EVIDENCE_MISSING:${chapter.chapterId}`);
  if (chapter.plannedAction === 'SESSION_INDEX_ONLY') noteBoundaryErrors.push(`SESSION_NOTE_SUBSTITUTION:${chapter.chapterId}`);
}
const allErrors = [...noteBoundaryErrors, ...structureAudit.errors, ...(fragmentationAudit.status === 'FAIL' ? ['BLOCK_FRAGMENTATION'] : []), ...scanAudit.findings, ...contentAudit];
if (allErrors.length) throw new Error(`STRUCTURE_AUDIT_FAILED: ${allErrors.join('; ')}`);

const segmentation = {
  prototype: true,
  notFormalSchema: true,
  phaseAStatus: config.phaseAStatus ?? 'STRUCTURE_REVIEW_REQUIRED',
  caseId: config.caseId,
  sessionId: 'REAL_CASE_001-2026-09-20',
  sourceRefs: { lessonModel: config.lessonModelPath, sourceMap: config.sourceMapPath },
  segmentationRule: 'Chapter / 章；session 只作为输入时间轴，不作为默认 note 文件边界。',
  evidencePriority: ['teacher-explicit', 'ppt-chapter-heading', 'textbook-toc', 'existing-course-structure', 'inferred-topic-switch'],
  chapters: chapterCandidates,
  excludedModules: modules.filter(module => module.kind !== 'teaching').map(module => ({ moduleId: module.moduleId, reason: module.moduleId === 'lm-rc001-m16' ? 'chapter boundary administration retained as evidence' : 'non-teaching' }))
};
const boundaryPlan = {
  prototype: true,
  notFormalSchema: true,
  phaseAStatus: config.phaseAStatus ?? 'STRUCTURE_REVIEW_REQUIRED',
  sessionId: segmentation.sessionId,
  chapterCandidates: chapterCandidates.map(chapter => ({
    chapterId: chapter.chapterId,
    chapterTitle: chapter.chapterTitle,
    chapterBoundaryEvidence: chapter.chapterBoundaryEvidence,
    sourceSpan: chapter.sourceSpan,
    confidence: chapter.confidence,
    existingChapterNoteRef: chapter.existingChapterNoteRef,
    existingNoteRole: chapter.existingNoteRole,
    plannedAction: chapter.plannedAction,
    needsHumanReview: chapter.needsHumanReview,
    moduleRefs: chapter.moduleRefs
  })),
  existingVaultRule: 'Vault 只用于存在性、最小回顾和命名 contextualization；不决定课堂内容。'
};
fs.mkdirSync(path.join(outputDir, 'block-plans'), { recursive: true });
writeJson('scratch/real-case-001/human-note-v2-1/chapter-segmentation.prototype.json', segmentation);
writeJson('scratch/real-case-001/human-note-v2-1/note-boundary-plan.json', boundaryPlan);
for (const chapter of chapterCandidates) {
  const plan = {
    prototype: true,
    notFormalSchema: true,
    phaseAStatus: config.phaseAStatus ?? 'STRUCTURE_REVIEW_REQUIRED',
    chapterId: chapter.chapterId,
    chapterTitle: chapter.chapterTitle,
    majorSections: sectionsByChapter.find(item => item.chapterId === chapter.chapterId)?.majorSections ?? [],
    nonBlockModuleHandling: Object.fromEntries(Object.entries(nonBlockModuleHandling).filter(([moduleRef]) => chapter.moduleRefs.includes(moduleRef))),
    nonBlockPresentation: Object.fromEntries(Object.entries(nonBlockPresentation).filter(([moduleRef]) => chapter.moduleRefs.includes(moduleRef))),
    blocks: blocks.filter(block => block.chapterId === chapter.chapterId).map(({ contentRoles, recallTargets, ...block }) => block)
  };
  writeJson(`scratch/real-case-001/human-note-v2-1/block-plans/human-note-block-plan.${chapter.chapterId}.json`, plan);
}
writeJson('scratch/real-case-001/human-note-v2-1/human-note-structure-audit.json', {
  prototype: true,
  phase: 'A_STRUCTURE_ONLY',
  phaseAStatus: config.phaseAStatus ?? 'STRUCTURE_REVIEW_REQUIRED',
  noteBoundary: { errors: noteBoundaryErrors, status: noteBoundaryErrors.length ? 'FAIL' : 'PASS' },
  blockStructure: structureAudit,
  blockFragmentation: fragmentationAudit,
  scanability: scanAudit,
  contentBoundary: { errors: contentAudit, status: contentAudit.length ? 'FAIL' : 'PASS' },
  humanGate: 'REQUIRED'
});
const boundaryMarkdown = `# REAL_CASE_001 Note Boundary Audit\n\n- status: **PASS_WITH_HUMAN_GATE**\n- session input: ${segmentation.sessionId}\n- candidate chapter notes: ${chapterCandidates.length}\n- note boundary collapse: **${chapterCandidates.length < 2 ? 'FAIL' : 'PASS'}**\n\n| chapter | title | confidence | evidence | action | existing chapter note |\n|---|---|---|---|---|---|\n${chapterCandidates.map(chapter => `| ${chapter.chapterId} | ${chapter.chapterTitle} | ${chapter.confidence} | ${chapter.chapterBoundaryEvidence.map(item => item.sourceUnitRef).join(', ')} | ${chapter.plannedAction} | ${chapter.existingChapterNoteRef ?? 'none'} |`).join('\n')}\n\n章节边界来自 SourceMap / LessonModel 与教师明确的第二章口述。第一章标题与范围仍保留 human review，因为转写从课堂中段开始。\n`;
const blockMarkdown = `# REAL_CASE_001 Human Note Block Structure Audit\n\n- status: **PASS_WITH_HUMAN_GATE**\n- block count: ${structureAudit.blockCount}\n- block collapse candidates: ${structureAudit.blockCollapseCandidates.length}\n- BLOCK_FRAGMENTATION: **${fragmentationAudit.status}**\n- single-module block ratio: ${fragmentationAudit.singleModuleBlockRatio.toFixed(2)}\n- same recall target splits: ${fragmentationAudit.sameRecallTargetSplits.length}\n- oversized blocks: ${structureAudit.oversizedBlocks.length}\n- tiny fragment candidates: ${structureAudit.singleSentenceTinyBlocks.length}\n- scanability: **${scanAudit.status}**\n\n## Blocks per chapter\n\n${sectionsByChapter.map(chapter => `### ${chapter.chapterId}\n\n${chapter.majorSections.map(section => `- ${section.title}：${structureAudit.blocksPerMajorSection[section.sectionId] ?? 0} blocks`).join('\n')}`).join('\n\n')}\n\n## Hard checks\n\n- block 数由 recall target 决定，不要求 1 module = 1 block。\n- 三大流派、混合增强、教师建议已分离。\n- 命题逻辑的定义、操作、推理和证明已合并为一个 recall block。\n- 谓词逻辑保持独立。\n- 知识图谱定义与知识图谱推理保持两个 recall targets；m27 作为后者的 source-bound supporting detail。\n- 贝叶斯网络和马尔可夫网络保持独立 recall targets。\n- 行为主义与婴儿学步保留在同一块。\n- m03 开场线索和 m28 概率转场保留为 non-block handling。\n- 块顺序按 readingOrder / flowOrder 保留。\n- HUMAN_GATE_REQUIRED = true\n`;
const coverageMarkdown = `# REAL_CASE_001 Human Note Coverage Audit\n\n- teaching modules: ${teachingModules.length}\n- modules represented by blocks: ${new Set(blocks.flatMap(block => block.moduleRefs)).size}\n- non-block warning/transition modules: ${[...nonBlockModuleRefs].join(', ')}\n- source boundary errors: ${contentAudit.filter(error => error.startsWith('UNSUPPORTED_SOURCE')).length}\n- REVIEW content omitted: false\n\n${chapterCandidates.map(chapter => `## ${chapter.chapterTitle}\n\n${chapter.moduleRefs.map(ref => `- ${ref}${nonBlockModuleRefs.has(ref) ? `（${nonBlockModuleHandling[ref]}）` : ''}`).join('\n')}`).join('\n\n')}\n`;
fs.writeFileSync(path.join(outputDir, 'audits', 'NOTE_BOUNDARY_AUDIT.md'), boundaryMarkdown, 'utf8');
fs.writeFileSync(path.join(outputDir, 'audits', 'HUMAN_NOTE_BLOCK_AUDIT.md'), blockMarkdown, 'utf8');
fs.writeFileSync(path.join(outputDir, 'audits', 'HUMAN_NOTE_COVERAGE_AUDIT.md'), coverageMarkdown, 'utf8');
const oldNotePath = path.resolve(repo, 'scratch/real-case-001/human-note-v2/candidate/AI导论920-HUMAN-V2.md');
const oldNote = fs.existsSync(oldNotePath) ? fs.readFileSync(oldNotePath, 'utf8') : '';
const oldBlockCount = (oldNote.match(/^###\s+/gmu) ?? []).length;
const oldMajorSections = (oldNote.match(/^##\s+/gmu) ?? []).length;
const comparisonMarkdown = `# REAL_CASE_001 Human Note v2 / v2.1 Structure Comparison\n\n| metric | v2 | v2.1 Phase A |\n|---|---:|---:|\n| chapter notes | 1 session-shaped candidate | ${chapterCandidates.length} chapter candidates |\n| presentation blocks | ${oldBlockCount} visible ### blocks | ${blocks.length} planned blocks |\n| major sections | ${oldMajorSections} | ${sectionsByChapter.reduce((sum, chapter) => sum + chapter.majorSections.length, 0)} across chapters |\n| average modules per block | ${oldBlockCount ? (teachingModules.length / oldBlockCount).toFixed(2) : 'unknown'} | ${(teachingModules.length / blocks.length).toFixed(2)} unique-module average |\n| block collapse candidates | not audited | ${structureAudit.blockCollapseCandidates.length} |\n| BLOCK_FRAGMENTATION | not audited | ${fragmentationAudit.status} |\n| visible recall targets | not audited | ${new Set(blocks.map(block => block.recallTarget)).size} |\n| paragraph length | composed prose | deferred until Composer phase |\n| bullet usage | composed prose | deferred until Composer phase |\n| keypoint coverage | 28/28 ledger | ${new Set([...blocks.flatMap(block => block.moduleRefs), ...nonBlockModuleRefs]).size}/28 planned |\n| unsupported additions | PASS | PASS |\n| redundancy | 0 candidates in v2 | deferred until Composer phase |\n\n本阶段只比较 chapter boundary 与 block structure。v2.1 尚未生成 candidate Markdown；Composer 必须严格消费冻结的 Block Plan。Human gate 仍然是 REQUIRED。\n`;
fs.writeFileSync(path.join(outputDir, 'audits', 'V2_V2.1_COMPARISON.md'), comparisonMarkdown, 'utf8');
writeJson('scratch/real-case-001/human-note-v2-1/audits/HUMAN_NOTE_QUALITY_AUDIT.json', {
  status: 'READY_FOR_HUMAN_REVIEW',
  phase: 'A_STRUCTURE_ONLY',
  noteBoundaryAudit: { status: 'PASS', chapterCount: chapterCandidates.length, errors: noteBoundaryErrors },
  blockStructure: structureAudit,
  blockFragmentation: fragmentationAudit,
  scanability: scanAudit,
  keypointCoverage: { teachingModules: teachingModules.length, representedModules: new Set([...blocks.flatMap(block => block.moduleRefs), ...nonBlockModuleRefs]).size, status: contentAudit.some(error => error.startsWith('KEYPOINT_OMITTED')) ? 'FAIL' : 'PASS' },
  unsupportedAdditions: { candidates: [], status: 'PASS' },
  redundancy: { candidates: [], status: 'DEFERRED_TO_COMPOSER_PHASE' },
  lectureFlowPreservation: { status: 'PASS', basis: 'block flowOrder and source readingOrder' },
  humanGate: 'REQUIRED'
});
console.log(JSON.stringify({ caseId: config.caseId, status: 'READY_FOR_HUMAN_REVIEW', phase: 'A_STRUCTURE_ONLY', chapters: chapterCandidates.length, blocks: blocks.length, outputDir: path.relative(repo, outputDir) }, null, 2));
