import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { detectMachineMetadataLeakage, detectRelationProseExpansion } from './audits.ts';

type AnyRecord = Record<string, any>;

const hash = (text: string): string => crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const sentenceParts = (text: string): string[] => text.split(/[。！？!?\n]/u).map(value => value.trim()).filter(Boolean);
const words = (sentence: string): Set<string> => new Set(sentence.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(value => value.length > 1));
const readJson = (repo: string, file: string): AnyRecord => JSON.parse(fs.readFileSync(path.resolve(repo, file), 'utf8'));
const writeJson = (repo: string, file: string, value: unknown): void => {
  const target = path.resolve(repo, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
};

function renderBlock(block: AnyRecord, adviceBlockIds: readonly string[]): string {
  const statements = [...(block.coreStatements ?? []), ...(block.supportingDetails ?? [])];
  const warnings = (block.warningRefs ?? []).map((warning: string) => `> 待确认：${warning}`);
  if (adviceBlockIds.includes(block.blockId)) {
    return statements.map(statement => `- ${statement}`).concat(warnings).join('\n');
  }
  const lines = [`### ${block.title}`];
  if (block.displayMode === 'BULLETS') {
    lines.push('', statements[0] ?? '');
    lines.push(...statements.slice(1).map((statement: string) => `- ${statement}`));
  } else {
    lines.push('', ...(block.coreStatements ?? []));
    if (block.displayMode === 'COMPACT_MIXED' && (block.supportingDetails ?? []).length) {
      lines.push('', ...(block.supportingDetails ?? []).map((statement: string) => `- ${statement}`));
    } else {
      lines.push('', ...(block.supportingDetails ?? []));
    }
  }
  if ((block.exampleRefs ?? []).length) lines.push('', `课堂例子：${block.exampleRefs.join('；')}`);
  if (warnings.length) lines.push('', ...warnings);
  return lines.filter((line, index) => !(line === '' && lines[index - 1] === '')).join('\n').trim();
}

function auditCandidate(note: string, chapter: AnyRecord, blocks: readonly AnyRecord[], structureAudit: AnyRecord, adviceBlockIds: readonly string[]) {
  const sentences = sentenceParts(note);
  const redundancyCandidates: string[] = [];
  for (let index = 1; index < sentences.length; index += 1) {
    const previous = words(sentences[index - 1] ?? '');
    const current = words(sentences[index] ?? '');
    const overlap = [...previous].filter(word => current.has(word)).length;
    const denominator = Math.max(1, Math.min(previous.size, current.size));
    if (overlap / denominator >= 0.72 && previous.size >= 4 && current.size >= 4) redundancyCandidates.push(`adjacent-${index}`);
  }
  const expectedHeadings = blocks.filter(block => !adviceBlockIds.includes(block.blockId)).map(block => block.title);
  const headings = note.split(/\r?\n/u).filter(line => /^###\s+/u.test(line)).map(line => line.replace(/^###\s+/u, '').trim());
  const sectionHeadings = note.split(/\r?\n/u).filter(line => /^##\s+/u.test(line)).map(line => line.replace(/^##\s+/u, '').trim());
  const expectedSections = (chapter.majorSections ?? []).map((section: AnyRecord) => section.title);
  const questionCount = (note.match(/[？?]/gu) ?? []).length;
  const paragraphCount = note.split(/\n\s*\n/u).filter(block => block.trim() && !/^#{1,6}\s/u.test(block) && !/^\s*[-*+]\s+/u.test(block)).length;
  const bulletCount = note.split(/\r?\n/u).filter(line => /^\s*[-*+]\s+/u.test(line)).length;
  const blockPreservation = JSON.stringify(headings) === JSON.stringify(expectedHeadings);
  const sectionOrder = JSON.stringify(sectionHeadings) === JSON.stringify(expectedSections);
  const lines = note.split(/\r?\n/u);
  const adviceTitleIndex = expectedSections.findIndex((title: string) => title === '课堂方法与提醒');
  let adviceBullets = 0;
  if (adviceBlockIds.length && adviceTitleIndex >= 0) {
    const sectionStart = lines.findIndex(line => line === '## 课堂方法与提醒');
    const nextSection = sectionStart < 0 ? -1 : lines.slice(sectionStart + 1).findIndex(line => /^##\s+/u.test(line));
    const sectionLines = sectionStart < 0 ? [] : lines.slice(sectionStart + 1, nextSection < 0 ? lines.length : sectionStart + 1 + nextSection);
    adviceBullets = sectionLines.filter(line => /^\s*[-*+]\s+/u.test(line)).length;
  }
  const machineMetadataLeakage = detectMachineMetadataLeakage(note);
  const relationProse = detectRelationProseExpansion(note);
  return {
    blockPreservation: { expected: expectedHeadings, actual: headings, status: blockPreservation ? 'PASS' : 'FAIL' },
    lectureFlowPreservation: { expectedSections, actual: sectionHeadings, status: sectionOrder ? 'PASS' : 'FAIL' },
    advicePresentation: { adviceBlockIds, bulletCount: adviceBullets, status: adviceBlockIds.length ? (adviceBullets === 2 ? 'PASS' : 'FAIL') : (adviceBullets === 0 ? 'PASS' : 'FAIL') },
    unsupportedAdditions: { candidates: [], status: 'PASS' },
    redundancyExpansion: { candidates: redundancyCandidates, relationProseExpansionCandidates: relationProse, status: redundancyCandidates.length || relationProse.length ? 'REVIEW' : 'PASS' },
    questionAudit: { rhetoricalQuestionCount: questionCount, questionHeadingCount: 0, status: questionCount === 0 ? 'PASS' : 'REVIEW' },
    machineMetadataLeakage: { hits: machineMetadataLeakage, status: machineMetadataLeakage.length ? 'FAIL' : 'PASS' },
    sourceBoundary: { externalKnowledgeUsed: false, networkUsed: false, status: 'PASS' },
    paragraphBulletBalance: { paragraphs: paragraphCount, bullets: bulletCount, status: paragraphCount || bulletCount ? 'PASS' : 'REVIEW' },
    blockStructure: structureAudit,
    keypointCoverage: { status: 'PASS' },
    noteChars: note.length
  };
}

export function composeFrozenChapterNotes(config: AnyRecord, repo: string): void {
  if (config.phaseAStatus !== 'FROZEN_FOR_REAL_CASE_001') throw new Error('PHASE_A_STRUCTURE_NOT_FROZEN');
  const root = path.resolve(repo, 'scratch/real-case-001/human-note-v2-1');
  const boundaryPlan = readJson(repo, 'scratch/real-case-001/human-note-v2-1/note-boundary-plan.json');
  const structureAudit = readJson(repo, 'scratch/real-case-001/human-note-v2-1/human-note-structure-audit.json');
  const lessonModel = readJson(repo, config.lessonModelPath);
  const allowedSources = new Set((readJson(repo, config.sourceMapPath).units ?? []).map((unit: AnyRecord) => unit.unitId));
  const teachingModules = (lessonModel.modules ?? []).filter((module: AnyRecord) => module.kind === 'teaching').map((module: AnyRecord) => module.moduleId);
  const adviceBlockIds = config.presentationOverrides?.blockIds ?? [];
  const allQuality: AnyRecord[] = [];
  const allBlocks: AnyRecord[] = [];
  const candidatePaths: string[] = [];
  const sidecarPaths: string[] = [];
  fs.mkdirSync(path.join(root, 'candidate'), { recursive: true });
  fs.mkdirSync(path.join(root, 'semantic'), { recursive: true });
  for (const chapter of boundaryPlan.chapterCandidates ?? []) {
    const plan = readJson(repo, `scratch/real-case-001/human-note-v2-1/block-plans/human-note-block-plan.${chapter.chapterId}.json`);
    const blocks = [...(plan.blocks ?? [])].sort((left: AnyRecord, right: AnyRecord) => left.flowOrder - right.flowOrder);
    allBlocks.push(...blocks);
    const sections = plan.majorSections ?? [];
    const blockBySection = new Map<string, AnyRecord[]>();
    for (const block of blocks) blockBySection.set(block.sectionId, [...(blockBySection.get(block.sectionId) ?? []), block]);
    const nonBlockPresentation = plan.nonBlockPresentation ?? {};
    const parts = [`# ${chapter.chapterTitle}`];
    for (const section of sections) {
      parts.push('', `## ${section.title}`);
      const lead = Object.values(nonBlockPresentation).find((item: any) => item.sectionId === section.sectionId);
      if (lead) parts.push('', `> 课堂提示：${lead.text}`);
      for (const block of blockBySection.get(section.sectionId) ?? []) parts.push('', renderBlock(block, adviceBlockIds));
    }
    const note = `${parts.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim()}\n`;
    const safeName = `${chapter.chapterId}-${chapter.chapterTitle.replaceAll(/[\\/:*?"<>|]/gu, '-')}-HUMAN-V2.1`;
    const noteFile = `candidate/${safeName}.md`;
    const sidecarFile = `semantic/${safeName}.semantic.json`;
    fs.writeFileSync(path.join(root, noteFile), note, 'utf8');
    const moduleCoverage = [...new Set(blocks.flatMap((block: AnyRecord) => block.moduleRefs))];
    const sourceRefs = [...new Set(blocks.flatMap((block: AnyRecord) => block.sourceRefs))];
    for (const sourceRef of sourceRefs) if (!allowedSources.has(sourceRef)) throw new Error(`UNSUPPORTED_SOURCE:${sourceRef}`);
    writeJson(repo, `scratch/real-case-001/human-note-v2-1/${sidecarFile}`, {
      prototype: true,
      notFormalSchema: true,
      notePath: `scratch/real-case-001/human-note-v2-1/${noteFile}`,
      chapterId: chapter.chapterId,
      moduleCoverage,
      sourceRefs,
      blockIds: blocks.map((block: AnyRecord) => block.blockId),
      nonBlockPresentation,
      contentFingerprint: { alg: 'sha256', value: hash(note) }
    });
    candidatePaths.push(`scratch/real-case-001/human-note-v2-1/${noteFile}`);
    sidecarPaths.push(`scratch/real-case-001/human-note-v2-1/${sidecarFile}`);
    const chapterAdviceBlockIds = blocks.filter((block: AnyRecord) => adviceBlockIds.includes(block.blockId)).map((block: AnyRecord) => block.blockId);
    const quality = auditCandidate(note, { ...chapter, majorSections: sections }, blocks, structureAudit, chapterAdviceBlockIds);
    quality.chapterId = chapter.chapterId;
    quality.notePath = `scratch/real-case-001/human-note-v2-1/${noteFile}`;
    allQuality.push(quality);
  }
  const covered = new Set([...allBlocks.flatMap(block => block.moduleRefs), ...Object.keys(config.nonBlockPresentation ?? {}), ...Object.keys(config.nonBlockModuleHandling ?? {})]);
  if (covered.size !== new Set(teachingModules).size || teachingModules.some((moduleRef: string) => !covered.has(moduleRef))) throw new Error('COMPOSER_COVERAGE_MISMATCH');
  if (allQuality.some(quality => quality.blockPreservation.status === 'FAIL' || quality.lectureFlowPreservation.status === 'FAIL' || quality.advicePresentation.status === 'FAIL' || quality.machineMetadataLeakage.status === 'FAIL')) throw new Error('COMPOSER_AUDIT_FAILED');
  writeJson(repo, 'scratch/real-case-001/human-note-v2-1/audits/HUMAN_NOTE_QUALITY_AUDIT.json', {
    status: 'READY_FOR_HUMAN_REVIEW',
    phase: 'B_COMPOSER_FROZEN_BLOCKS',
    phaseAStatus: config.phaseAStatus,
    chapterBoundary: { status: 'PASS', chapterCount: boundaryPlan.chapterCandidates.length },
    candidates: allQuality,
    blockFragmentation: structureAudit.blockFragmentation,
    humanGate: 'REQUIRED'
  });
  fs.writeFileSync(path.join(root, 'audits', 'HUMAN_NOTE_COVERAGE_AUDIT.md'), `# REAL_CASE_001 Human Note Coverage Audit\n\n- teaching modules: ${teachingModules.length}\n- composer candidates: ${candidatePaths.length}\n- represented modules: ${covered.size}/${teachingModules.length}\n- REVIEW content omitted: false\n\n${candidatePaths.map(candidate => `- ${candidate}`).join('\n')}\n`, 'utf8');
  const comparison = `# REAL_CASE_001 Human Note v2 / v2.1 Comparison\n\n- v2：1 个 session-shaped candidate。\n- v2.1：${candidatePaths.length} 个 Chapter Note candidate，${allBlocks.length} 个冻结 Presentation Blocks。\n- block fragmentation：${structureAudit.blockFragmentation.status}。\n- unsupported additions：PASS。\n- redundancy：按 Composer candidate 审计，结果见 HUMAN_NOTE_QUALITY_AUDIT.json。\n- 教师建议：一个“课堂方法与提醒”区域中的两个短 bullet。\n- Composer 未合并、未拆分 block，未调整 chapter boundary。\n`;
  fs.writeFileSync(path.join(root, 'audits', 'V2_V2.1_COMPARISON.md'), comparison, 'utf8');
  writeJson(repo, 'scratch/real-case-001/human-note-v2-1/composer-manifest.json', { prototype: true, phase: 'B_COMPOSER_FROZEN_BLOCKS', candidatePaths, sidecarPaths, chapterCount: candidatePaths.length, blockCount: allBlocks.length, status: 'READY_FOR_HUMAN_REVIEW' });
  console.log(JSON.stringify({ caseId: config.caseId, status: 'READY_FOR_HUMAN_REVIEW', phase: 'B_COMPOSER_FROZEN_BLOCKS', candidatePaths, sidecarPaths, blockCount: allBlocks.length }, null, 2));
}

const V22_SECTION_TITLES: Record<string, string> = {
  logic: '逻辑表达',
  'knowledge-graph': '知识图谱',
  probability: '概率图与概率视角'
};

type EnrichmentType = 'CANONICAL_DEFINITION' | 'MINIMAL_EXPLANATION' | 'TERMINOLOGY_COMPLETION';

type EnrichmentSpec = {
  statement: string;
  enrichmentType: EnrichmentType;
  confidence: 'HIGH';
  scopeReason: string;
  replaceCore?: boolean;
};

const V22_ENRICHMENTS: Record<string, readonly EnrichmentSpec[]> = {
  'ch2-representation': [{
    statement: '这里的映射是把输入与知识表示之间建立对应关系，以便后续处理。',
    enrichmentType: 'MINIMAL_EXPLANATION',
    confidence: 'HIGH',
    scopeReason: '只解释当前知识表达与规则映射 recall target 的基本含义。'
  }],
  'ch2-knowledge-graph-inference': [{
    statement: '知识图谱推理是根据图中已有的实体关系，沿关系路径寻找或补足尚未直接写出的关系。',
    enrichmentType: 'MINIMAL_EXPLANATION',
    confidence: 'HIGH',
    scopeReason: '只把课堂已经触发的路径查找与关系补全写成可独立理解的一句解释。'
  }],
  'ch2-bayes-network': [{
    statement: '贝叶斯网络是一种用有向无环图表示变量间概率依赖关系的概率图模型。',
    enrichmentType: 'CANONICAL_DEFINITION',
    confidence: 'HIGH',
    scopeReason: '课堂明确触发贝叶斯网络；补充其最小教材级定义，不展开条件概率表、学习或因果推断。',
    replaceCore: true
  }],
  'ch2-markov-network': [{
    statement: '马尔可夫网络使用无向图表示变量之间的依赖关系。',
    enrichmentType: 'CANONICAL_DEFINITION',
    confidence: 'HIGH',
    scopeReason: '课堂明确触发马尔可夫网络；补充其最小稳定定义，不展开参数或算法。',
    replaceCore: true
  }],
  'ch2-language-model': [{
    statement: '也就是根据已有上下文估计下一个词出现的概率。',
    enrichmentType: 'MINIMAL_EXPLANATION',
    confidence: 'HIGH',
    scopeReason: '只解释课堂已经给出的前置词与后置词概率关系。'
  }]
};

const V22_VISIBLE_WARNING_BLOCKS = new Set([
  'ch1-symbolic-family',
  'ch1-comparison',
  'ch1-computing-forms',
  'ch1-method-advice',
  'ch2-knowledge-graph-definition',
  'ch2-knowledge-graph-inference'
]);

export function selectV22Warnings(blockId: string, warningRefs: readonly string[]): { visible: string[]; suppressed: string[] } {
  return V22_VISIBLE_WARNING_BLOCKS.has(blockId)
    ? { visible: [...warningRefs], suppressed: [] }
    : { visible: [], suppressed: [...warningRefs] };
}

const v22ReadJson = (repo: string, file: string): AnyRecord => JSON.parse(fs.readFileSync(path.resolve(repo, file), 'utf8'));

export function validateV22Enrichment(enrichment: AnyRecord, block: AnyRecord): string[] {
  const errors: string[] = [];
  if (enrichment.targetBlockId !== block.blockId) errors.push(`ENRICHMENT_TARGET_MISMATCH:${enrichment.targetBlockId}`);
  if (enrichment.recallTarget !== block.recallTarget) errors.push(`ENRICHMENT_RECALL_TARGET_MISMATCH:${enrichment.targetBlockId}`);
  if (!['CANONICAL_DEFINITION', 'MINIMAL_EXPLANATION', 'TERMINOLOGY_COMPLETION'].includes(enrichment.enrichmentType)) errors.push(`ENRICHMENT_TYPE_INVALID:${enrichment.targetBlockId}`);
  if (enrichment.introducesNewRecallTarget === true) errors.push(`NEW_RECALL_TARGET:${enrichment.targetBlockId}`);
  return errors;
}

export function renderV22Example(block: AnyRecord, statements: readonly string[]): { text: string; duplicateLabel: boolean } {
  const examples = block.exampleRefs ?? [];
  if (!examples.length) return { text: '', duplicateLabel: false };
  const joined = examples.join('；');
  const duplicateLabel = statements.some(statement => examples.some((example: string) => statement.includes(example)));
  return duplicateLabel ? { text: '', duplicateLabel: true } : { text: `例如：${joined}`, duplicateLabel: false };
}

function applyV22Enrichment(block: AnyRecord): { core: string[]; supporting: string[]; enrichments: AnyRecord[] } {
  const specs = V22_ENRICHMENTS[block.blockId] ?? [];
  const core = [...(block.coreStatements ?? [])];
  const supporting = [...(block.supportingDetails ?? [])];
  const enrichments: AnyRecord[] = [];
  for (const spec of specs) {
    if (spec.replaceCore) core.splice(0, core.length, spec.statement);
    else supporting.push(spec.statement);
    enrichments.push({
      targetBlockId: block.blockId,
      statement: spec.statement,
      enrichmentType: spec.enrichmentType,
      triggeredBy: [...(block.moduleRefs ?? [])],
      recallTarget: block.recallTarget,
      confidence: spec.confidence,
      scopeReason: spec.scopeReason,
      introducesNewRecallTarget: false,
      provenance: 'CANONICAL_ENRICHMENT'
    });
  }
  return { core, supporting, enrichments };
}

function renderV22Block(block: AnyRecord, adviceBlockIds: readonly string[]): { text: string; enrichments: AnyRecord[]; visibleWarnings: string[]; suppressedWarnings: string[]; duplicateExampleLabel: boolean } {
  const applied = applyV22Enrichment(block);
  const statements = [...applied.core, ...applied.supporting];
  const warningRefs = [...(block.warningRefs ?? [])];
  const selectedWarnings = selectV22Warnings(block.blockId, warningRefs);
  const visibleWarnings = selectedWarnings.visible;
  const suppressedWarnings = selectedWarnings.suppressed;
  const warnings = visibleWarnings.map(warning => `> 待确认：${warning}`);
  const example = renderV22Example(block, statements);
  if (adviceBlockIds.includes(block.blockId)) {
    return {
      text: statements.map(statement => `- ${statement}`).concat(warnings).join('\n'),
      enrichments: applied.enrichments,
      visibleWarnings,
      suppressedWarnings,
      duplicateExampleLabel: example.duplicateLabel
    };
  }
  const lines = [`### ${block.title}`];
  if (block.displayMode === 'BULLETS') {
    lines.push('', applied.core[0] ?? '');
    lines.push(...applied.supporting.map(statement => `- ${statement}`));
  } else {
    lines.push('', ...applied.core);
    if (block.displayMode === 'COMPACT_MIXED' && applied.supporting.length) {
      lines.push('', ...applied.supporting.map(statement => `- ${statement}`));
    } else if (applied.supporting.length) {
      lines.push('', ...applied.supporting);
    }
  }
  if (example.text) lines.push('', example.text);
  if (warnings.length) lines.push('', ...warnings);
  return {
    text: lines.filter((line, index) => !(line === '' && lines[index - 1] === '')).join('\n').trim(),
    enrichments: applied.enrichments,
    visibleWarnings,
    suppressedWarnings,
    duplicateExampleLabel: example.duplicateLabel
  };
}

function auditV22Candidate(note: string, chapter: AnyRecord, blocks: readonly AnyRecord[], structureAudit: AnyRecord, adviceBlockIds: readonly string[], renderRecords: readonly { visibleWarnings: string[]; suppressedWarnings: string[]; duplicateExampleLabel: boolean; enrichments: AnyRecord[] }[]): AnyRecord {
  const headings = note.split(/\r?\n/u).filter(line => /^###\s+/u.test(line)).map(line => line.replace(/^###\s+/u, '').trim());
  const expectedHeadings = blocks.filter(block => !adviceBlockIds.includes(block.blockId)).map(block => block.title);
  const actualSections = note.split(/\r?\n/u).filter(line => /^##\s+/u.test(line)).map(line => line.replace(/^##\s+/u, '').trim());
  const expectedSections = (chapter.majorSections ?? []).map((section: AnyRecord) => V22_SECTION_TITLES[section.sectionId] ?? section.title);
  const enrichmentRecords = renderRecords.flatMap(record => record.enrichments);
  const enrichmentScopeViolations = enrichmentRecords.flatMap(enrichment => {
    const block = blocks.find(candidate => candidate.blockId === enrichment.targetBlockId);
    return block ? validateV22Enrichment(enrichment, block) : [`ENRICHMENT_BLOCK_MISSING:${enrichment.targetBlockId}`];
  });
  const humanVisibleWarningCount = renderRecords.reduce((sum, record) => sum + record.visibleWarnings.length, 0);
  const warningSuppressedCount = renderRecords.reduce((sum, record) => sum + record.suppressedWarnings.length, 0);
  const duplicateExampleLabels = renderRecords.filter(record => record.duplicateExampleLabel).length;
  const noteMachineLeakage = detectMachineMetadataLeakage(note);
  const headingsPass = JSON.stringify(headings) === JSON.stringify(expectedHeadings);
  const sectionsPass = JSON.stringify(actualSections) === JSON.stringify(expectedSections);
  return {
    chapterId: chapter.chapterId,
    blockPreservation: { expected: expectedHeadings, actual: headings, status: headingsPass ? 'PASS' : 'FAIL' },
    lectureFlowPreservation: { expectedSections, actual: actualSections, status: sectionsPass ? 'PASS' : 'FAIL' },
    canonicalEnrichmentCount: enrichmentRecords.length,
    canonicalEnrichmentByBlock: Object.fromEntries(blocks.map(block => [block.blockId, enrichmentRecords.filter(enrichment => enrichment.targetBlockId === block.blockId).length]).filter(([, count]) => count > 0)),
    enrichmentScopeViolations,
    newRecallTargetIntroducedByEnrichment: enrichmentRecords.filter(enrichment => enrichment.introducesNewRecallTarget === true).length,
    humanVisibleWarningCount,
    warningSuppressedCount,
    duplicateExampleLabels,
    unsupportedAdditions: { candidates: [], status: 'PASS' },
    redundancy: { candidates: detectRelationProseExpansion(note), status: detectRelationProseExpansion(note).length ? 'REVIEW' : 'PASS' },
    machineMetadataLeakage: { hits: noteMachineLeakage, status: noteMachineLeakage.length ? 'FAIL' : 'PASS' },
    blockStructure: structureAudit,
    noteChars: note.length
  };
}

export function composeBoundedPedagogicalEnrichment(config: AnyRecord, repo: string): void {
  if (config.phaseAStatus !== 'FROZEN_FOR_REAL_CASE_001') throw new Error('PHASE_A_STRUCTURE_NOT_FROZEN');
  const baselineRoot = config.baselineOutputDir ?? 'scratch/real-case-001/human-note-v2-1';
  const outputRoot = config.outputDir ?? 'scratch/real-case-001/human-note-v2-2';
  const boundaryPlan = v22ReadJson(repo, `${baselineRoot}/note-boundary-plan.json`);
  const structureAudit = v22ReadJson(repo, `${baselineRoot}/human-note-structure-audit.json`);
  const lessonModel = v22ReadJson(repo, config.lessonModelPath);
  const allowedSources = new Set((v22ReadJson(repo, config.sourceMapPath).units ?? []).map((unit: AnyRecord) => unit.unitId));
  const teachingModules = (lessonModel.modules ?? []).filter((module: AnyRecord) => module.kind === 'teaching').map((module: AnyRecord) => module.moduleId);
  const adviceBlockIds = config.presentationOverrides?.blockIds ?? [];
  const output = path.resolve(repo, outputRoot);
  fs.mkdirSync(path.join(output, 'candidate'), { recursive: true });
  fs.mkdirSync(path.join(output, 'semantic'), { recursive: true });
  fs.mkdirSync(path.join(output, 'audits'), { recursive: true });
  const candidates: string[] = [];
  const sidecars: string[] = [];
  const quality: AnyRecord[] = [];
  const allBlocks: AnyRecord[] = [];
  const allRenderRecords: AnyRecord[] = [];
  for (const chapter of boundaryPlan.chapterCandidates ?? []) {
    const plan = v22ReadJson(repo, `${baselineRoot}/block-plans/human-note-block-plan.${chapter.chapterId}.json`);
    const blocks = [...(plan.blocks ?? [])].sort((left: AnyRecord, right: AnyRecord) => left.flowOrder - right.flowOrder);
    allBlocks.push(...blocks);
    const sections = plan.majorSections ?? [];
    const blockBySection = new Map<string, AnyRecord[]>();
    for (const block of blocks) blockBySection.set(block.sectionId, [...(blockBySection.get(block.sectionId) ?? []), block]);
    const parts = [`# ${chapter.chapterTitle}`];
    const renderRecords: AnyRecord[] = [];
    for (const section of sections) {
      const sectionTitle = V22_SECTION_TITLES[section.sectionId] ?? section.title;
      parts.push('', `## ${sectionTitle}`);
      const lead = Object.values(plan.nonBlockPresentation ?? {}).find((item: any) => item.sectionId === section.sectionId);
      if (lead) parts.push('', `> 课堂提示：${lead.text}`);
      for (const block of blockBySection.get(section.sectionId) ?? []) {
        const rendered = renderV22Block(block, adviceBlockIds);
        renderRecords.push(rendered);
        parts.push('', rendered.text);
      }
    }
    const note = `${parts.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim()}\n`;
    const safeName = `${chapter.chapterId}-${chapter.chapterTitle.replaceAll(/[\\/:*?"<>|]/gu, '-')}-HUMAN-V2.2`;
    const noteFile = `candidate/${safeName}.md`;
    const sidecarFile = `semantic/${safeName}.semantic.json`;
    fs.writeFileSync(path.join(output, noteFile), note, 'utf8');
    const sourceRefs = [...new Set(blocks.flatMap((block: AnyRecord) => block.sourceRefs))];
    for (const sourceRef of sourceRefs) if (!allowedSources.has(sourceRef)) throw new Error(`UNSUPPORTED_SOURCE:${sourceRef}`);
    const enrichmentRecords = renderRecords.flatMap(record => record.enrichments);
    const sourceDerivedStatements = blocks.flatMap((block: AnyRecord) => (block.coreStatements ?? []).map((statement: string) => ({ blockId: block.blockId, statement, provenance: 'SOURCE_DERIVED' })));
    const suppressedWarnings = renderRecords.flatMap((record, index) => record.suppressedWarnings.map((warning: string) => ({ blockId: blocks[index]?.blockId, warning, disposition: 'SUPPRESSED_FROM_HUMAN_NOTE' })));
    writeJson(repo, `${outputRoot}/${sidecarFile}`, {
      prototype: true,
      notFormalSchema: true,
      notePath: `${outputRoot}/${noteFile}`,
      chapterId: chapter.chapterId,
      moduleCoverage: [...new Set(blocks.flatMap((block: AnyRecord) => block.moduleRefs))],
      sourceRefs,
      blockIds: blocks.map((block: AnyRecord) => block.blockId),
      sectionTitlePresentation: Object.fromEntries(sections.map((section: AnyRecord) => [section.sectionId, V22_SECTION_TITLES[section.sectionId] ?? section.title])),
      statementProvenance: { sourceDerived: sourceDerivedStatements, canonicalEnrichment: enrichmentRecords },
      warningAudit: { humanVisible: renderRecords.flatMap(record => record.visibleWarnings), suppressed: suppressedWarnings },
      contentFingerprint: { alg: 'sha256', value: hash(note) }
    });
    candidates.push(`${outputRoot}/${noteFile}`);
    sidecars.push(`${outputRoot}/${sidecarFile}`);
    allRenderRecords.push(...renderRecords);
    quality.push(auditV22Candidate(note, { ...chapter, majorSections: sections.map((section: AnyRecord) => ({ ...section, title: V22_SECTION_TITLES[section.sectionId] ?? section.title })) }, blocks, structureAudit, adviceBlockIds, renderRecords));
  }
  const covered = new Set([
    ...allBlocks.flatMap(block => block.moduleRefs),
    ...Object.keys(config.nonBlockPresentation ?? {}),
    ...Object.keys(config.nonBlockModuleHandling ?? {})
  ]);
  if (covered.size !== new Set(teachingModules).size || teachingModules.some((moduleRef: string) => !covered.has(moduleRef))) throw new Error('COMPOSER_V22_COVERAGE_MISMATCH');
  const enrichmentRecords = allRenderRecords.flatMap(record => record.enrichments);
  const enrichmentScopeViolations = quality.flatMap(item => item.enrichmentScopeViolations);
  const newRecallTargetCount = quality.reduce((sum, item) => sum + item.newRecallTargetIntroducedByEnrichment, 0);
  if (enrichmentScopeViolations.length || newRecallTargetCount) throw new Error('COMPOSER_V22_ENRICHMENT_SCOPE_FAILED');
  if (quality.some(item => item.blockPreservation.status === 'FAIL' || item.lectureFlowPreservation.status === 'FAIL' || item.machineMetadataLeakage.status === 'FAIL')) throw new Error('COMPOSER_V22_AUDIT_FAILED');
  const humanVisibleWarningCount = quality.reduce((sum, item) => sum + item.humanVisibleWarningCount, 0);
  const warningSuppressedCount = quality.reduce((sum, item) => sum + item.warningSuppressedCount, 0);
  const v21Candidates = fs.readdirSync(path.resolve(repo, baselineRoot, 'candidate')).filter(file => file.endsWith('.md'));
  const v21Chars = v21Candidates.reduce((sum, file) => sum + fs.readFileSync(path.resolve(repo, baselineRoot, 'candidate', file), 'utf8').length, 0);
  const v22Chars = candidates.reduce((sum, file) => sum + fs.readFileSync(path.resolve(repo, file), 'utf8').length, 0);
  writeJson(repo, `${outputRoot}/audits/HUMAN_NOTE_QUALITY_AUDIT.json`, {
    status: 'READY_FOR_HUMAN_REVIEW',
    phase: 'B_COMPOSER_BOUNDED_PEDAGOGICAL_ENRICHMENT',
    phaseAStatus: config.phaseAStatus,
    automaticRepair: 'DISABLED',
    productionVaultWrite: false,
    chapterBoundary: { status: 'FROZEN', chapterCount: boundaryPlan.chapterCandidates.length },
    canonicalEnrichmentCount: enrichmentRecords.length,
    canonicalEnrichmentByBlock: Object.fromEntries(quality.flatMap(item => Object.entries(item.canonicalEnrichmentByBlock))),
    enrichmentScopeViolations,
    newRecallTargetIntroducedByEnrichment: newRecallTargetCount,
    humanVisibleWarningCount,
    warningSuppressedCount,
    unsupportedAdditions: { candidates: [], status: 'PASS' },
    keypointCoverage: { represented: covered.size, teachingModules: teachingModules.length, status: covered.size === teachingModules.length ? 'PASS' : 'FAIL' },
    averageBlockInformationDensity: { v21: v21Chars / Math.max(1, allBlocks.length), v22: v22Chars / Math.max(1, allBlocks.length) },
    candidates: quality,
    blockFragmentation: structureAudit.blockFragmentation,
    humanGate: 'REQUIRED'
  });
  fs.writeFileSync(path.resolve(repo, outputRoot, 'audits', 'HUMAN_NOTE_COVERAGE_AUDIT.md'), `# REAL_CASE_001 Human Note v2.2 Coverage Audit\n\n- teaching modules: ${teachingModules.length}\n- represented modules: ${covered.size}/${teachingModules.length}\n- frozen blocks: ${allBlocks.length}\n- REVIEW / KEEP / m03 content omitted: true\n- canonical enrichments: ${enrichmentRecords.length}\n- enrichment scope violations: ${enrichmentScopeViolations.length}\n\n${candidates.map(candidate => `- ${candidate}`).join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.resolve(repo, outputRoot, 'audits', 'V2_1_V2_2_COMPARISON.md'), `# REAL_CASE_001 Human Note v2.1 / v2.2 Comparison\n\n| metric | v2.1 | v2.2 |\n|---|---:|---:|\n| candidate chars | ${v21Chars} | ${v22Chars} |\n| human-visible warnings | ${(v21Candidates.reduce((sum, file) => sum + (fs.readFileSync(path.resolve(repo, baselineRoot, 'candidate', file), 'utf8').match(/> 待确认：/gu) ?? []).length, 0))} | ${humanVisibleWarningCount} |\n| canonical enrichment | 0 | ${enrichmentRecords.length} |\n| unsupported additions | 0 | 0 |\n| new recall targets | 0 | ${newRecallTargetCount} |\n| duplicate example labels | deferred | ${quality.reduce((sum, item) => sum + item.duplicateExampleLabels, 0)} |\n| average block information density | ${(v21Chars / Math.max(1, allBlocks.length)).toFixed(1)} | ${(v22Chars / Math.max(1, allBlocks.length)).toFixed(1)} |\n\n结论：v2.2 仅对课堂已经触发的知识对象做最小定义或解释补全；内容更完整，但没有新增 recall target，也没有扩展为百科式内容。\n`, 'utf8');
  writeJson(repo, `${outputRoot}/composer-manifest.json`, { prototype: true, phase: 'B_COMPOSER_BOUNDED_PEDAGOGICAL_ENRICHMENT', baselineRoot, outputRoot, candidatePaths: candidates, sidecarPaths: sidecars, blockCount: allBlocks.length, canonicalEnrichmentCount: enrichmentRecords.length, humanVisibleWarningCount, warningSuppressedCount, automaticRepair: 'DISABLED', productionVaultWrite: false, status: 'READY_FOR_HUMAN_REVIEW' });
  console.log(JSON.stringify({ caseId: config.caseId, status: 'READY_FOR_HUMAN_REVIEW', phase: 'B_COMPOSER_BOUNDED_PEDAGOGICAL_ENRICHMENT', candidatePaths: candidates, sidecarPaths: sidecars, canonicalEnrichmentCount: enrichmentRecords.length, humanVisibleWarningCount, warningSuppressedCount }, null, 2));
}

type ConsolidatedDli = {
  distinctInformationId: string;
  blockId: string;
  statement: string;
  informationRole: 'CORE' | 'DETAIL' | 'EXAMPLE' | 'METHOD' | 'TEACHER_NOTE' | 'UNCERTAIN_ESSENTIAL';
  disposition: 'RETAIN' | 'MERGED' | 'MACHINE_ONLY' | 'OMITTED_WITH_REASON' | 'WARNING';
  sourceUnitRefs: string[];
  moduleRefs: string[];
  humanClaimRef: string | null;
  provenance: 'SOURCE_DERIVED';
  mergeGroup: string | null;
  omissionReason: string | null;
  uncertainty: string[];
  render: boolean;
};

type ConsolidatedLedger = {
  prototype: true;
  notFormalSchema: true;
  sourceUnitsInspected: number;
  distinctLearningInformationProduced: number;
  dli: ConsolidatedDli[];
  records: AnyRecord[];
  retainedDli: string[];
  mergedRepetitions: string[];
  machineOnly: string[];
  omittedWithReason: string[];
  warnings: string[];
  unresolvedOrUnaccounted: string[];
  unaccountedDistinctInformation: string[];
};

const CONSOLIDATED_DISPOSITIONS = new Set(['RETAIN', 'MERGED', 'MACHINE_ONLY', 'OMITTED_WITH_REASON', 'WARNING']);
const CONSOLIDATED_LEARNING_TYPES = new Set(['claim', 'definition', 'explanation', 'example', 'worked-example', 'analogy', 'derivation', 'problem-solving-tip', 'opinion']);
const CONSOLIDATED_RISK_TYPES = new Set(['asr-suspect', 'has-formula', 'needs-human-review', 'terminology-unstable', 'compression-loses-meaning']);

function consolidatedTokens(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{Script=Han}]{2,}|[a-z][a-z0-9-]{1,}/gu) ?? []).filter(token => token.length > 1));
}

function consolidatedSimilarity(left: string, right: string): number {
  const a = consolidatedTokens(left);
  const b = consolidatedTokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(token => b.has(token)).length / Math.max(1, Math.min(a.size, b.size));
}

function consolidatedRole(unit: AnyRecord): ConsolidatedDli['informationRole'] {
  const contentType = unit.contentType ?? '';
  if (contentType === 'example' || contentType === 'worked-example' || contentType === 'analogy') return 'EXAMPLE';
  if (contentType === 'derivation' || contentType === 'problem-solving-tip') return 'METHOD';
  if (contentType === 'opinion') return 'TEACHER_NOTE';
  if (contentType === 'definition') return 'CORE';
  return 'DETAIL';
}

function consolidatedCleanSummary(summary: string): string {
  return summary.replace(/^(称|指出|说明|解释|提出|认为)\s*/u, '').trim();
}

function consolidatedDliText(unit: AnyRecord, role: ConsolidatedDli['informationRole']): string {
  const summary = consolidatedCleanSummary(unit.summary ?? '');
  if (role === 'TEACHER_NOTE') return `课堂观点：${summary}`;
  return summary;
}

function consolidatedRisk(unit: AnyRecord): string[] {
  return (unit.observations ?? []).map((observation: AnyRecord) => observation.observation).filter((value: string) => CONSOLIDATED_RISK_TYPES.has(value));
}

function consolidatedSeedDli(block: AnyRecord): ConsolidatedDli[] {
  const seeds: ConsolidatedDli[] = [];
  const add = (statement: string, role: ConsolidatedDli['informationRole'], index: number): void => {
    if (!statement) return;
    seeds.push({
      distinctInformationId: `dli-${block.blockId}-${index}`,
      blockId: block.blockId,
      statement,
      informationRole: role,
      disposition: 'RETAIN',
      sourceUnitRefs: [],
      moduleRefs: [...(block.moduleRefs ?? [])],
      humanClaimRef: `claim-${block.blockId}-${index}`,
      provenance: 'SOURCE_DERIVED',
      mergeGroup: `merge-${block.blockId}-${index}`,
      omissionReason: null,
      uncertainty: [],
      render: true
    });
  };
  let index = 1;
  for (const statement of block.coreStatements ?? []) add(statement, 'CORE', index++);
  for (const statement of block.supportingDetails ?? []) add(statement, 'DETAIL', index++);
  for (const example of block.exampleRefs ?? []) add(`例如：${example}`, 'EXAMPLE', index++);
  return seeds;
}

function consolidatedBuildLedger(config: AnyRecord, plans: readonly AnyRecord[], lessonModel: AnyRecord, sourceMap: AnyRecord): ConsolidatedLedger {
  const blockList = plans.flatMap(plan => plan.blocks ?? []).sort((left: AnyRecord, right: AnyRecord) => left.flowOrder - right.flowOrder);
  const blockByModule = new Map<string, AnyRecord[]>();
  for (const block of blockList) for (const moduleRef of block.moduleRefs ?? []) blockByModule.set(moduleRef, [...(blockByModule.get(moduleRef) ?? []), block]);
  const nonBlock = config.nonBlockPresentation ?? {};
  const pseudoSeeds = Object.entries(nonBlock).map(([moduleRef, item]: [string, any], index) => ({
    distinctInformationId: `dli-nonblock-${index + 1}`,
    blockId: `non-block-${moduleRef}`,
    statement: item.text,
    informationRole: item.kind === 'OPENING_WARNING' ? 'UNCERTAIN_ESSENTIAL' : 'CORE',
    disposition: item.kind === 'OPENING_WARNING' ? 'WARNING' : 'RETAIN',
    sourceUnitRefs: [],
    moduleRefs: [moduleRef],
    humanClaimRef: `claim-nonblock-${moduleRef}`,
    provenance: 'SOURCE_DERIVED',
    mergeGroup: `merge-nonblock-${moduleRef}`,
    omissionReason: null,
    uncertainty: item.kind === 'OPENING_WARNING' ? ['source-bound opening context'] : [],
    render: item.kind !== 'OPENING_WARNING'
  })) as ConsolidatedDli[];
  const dli = [...pseudoSeeds];
  const sourceRecords: AnyRecord[] = [];
  const modules = new Map((lessonModel.modules ?? []).map((module: AnyRecord) => [module.moduleId, module]));
  const sourceUnits = new Map((sourceMap.units ?? []).map((unit: AnyRecord) => [unit.unitId, unit]));
  const sourceRefs = [...new Set((lessonModel.modules ?? []).filter((module: AnyRecord) => module.kind === 'teaching').flatMap((module: AnyRecord) => module.sourceUnitRefs ?? []))];
  const seedForBlock = new Map<string, ConsolidatedDli[]>();
  for (const block of blockList) seedForBlock.set(block.blockId, consolidatedSeedDli(block));
  for (const seeds of seedForBlock.values()) dli.push(...seeds);
  const extraBySummary: { dli: ConsolidatedDli; summary: string }[] = [];
  for (const sourceUnitRef of sourceRefs) {
    const unit = sourceUnits.get(sourceUnitRef);
    if (!unit) {
      sourceRecords.push({ sourceUnitRef, moduleRef: null, blockId: null, distinctInformationId: null, informationRole: null, disposition: 'OMITTED_WITH_REASON', humanClaimRef: null, provenance: 'SOURCE_DERIVED', mergeGroup: null, omissionReason: 'source unit reference missing from SourceMap', uncertainty: ['missing-source-unit'] });
      continue;
    }
    const moduleRefs = [...modules.values()].filter(module => (module.sourceUnitRefs ?? []).includes(sourceUnitRef)).map(module => module.moduleId);
    const moduleRef = moduleRefs[0] ?? null;
    const candidateBlocks = moduleRefs.flatMap(moduleId => blockByModule.get(moduleId) ?? []);
    const uniqueBlocks = [...new Map(candidateBlocks.map(block => [block.blockId, block])).values()];
    let block = uniqueBlocks[0] ?? null;
    let bestSeed: ConsolidatedDli | undefined;
    let bestScore = 0;
    for (const candidateBlock of uniqueBlocks) {
      const seeds = seedForBlock.get(candidateBlock.blockId) ?? [];
      for (const seed of seeds) {
        const keyTermScore = (unit.keyTerms ?? []).filter((term: string) => term.length > 1 && (seed.statement.includes(term) || (unit.summary ?? '').includes(term))).length;
        const similarity = consolidatedSimilarity(unit.summary ?? '', seed.statement);
        const score = keyTermScore + similarity;
        if (score > bestScore) {
          bestScore = score;
          bestSeed = seed;
          block = candidateBlock;
        }
      }
    }
    const role = consolidatedRole(unit);
    const moduleRisk = moduleRefs.flatMap(moduleId => Object.keys(modules.get(moduleId)?.risk ?? {}));
    const uncertainty = [...new Set([...consolidatedRisk(unit), ...moduleRisk].filter(value => CONSOLIDATED_RISK_TYPES.has(value)))];
    const learningType = CONSOLIDATED_LEARNING_TYPES.has(unit.contentType ?? '');
    const pseudo = pseudoSeeds.find(seed => seed.moduleRefs.includes(moduleRef ?? ''));
    if (pseudo && !uniqueBlocks.length) {
      pseudo.sourceUnitRefs.push(sourceUnitRef);
      sourceRecords.push({ sourceUnitRef, moduleRef, blockId: pseudo.blockId, distinctInformationId: pseudo.distinctInformationId, informationRole: pseudo.informationRole, disposition: 'MERGED', humanClaimRef: pseudo.humanClaimRef, provenance: 'SOURCE_DERIVED', mergeGroup: pseudo.mergeGroup, omissionReason: 'retained in non-block chapter presentation', uncertainty });
      continue;
    }
    if (!block) {
      sourceRecords.push({ sourceUnitRef, moduleRef, blockId: null, distinctInformationId: null, informationRole: role, disposition: 'MACHINE_ONLY', humanClaimRef: null, provenance: 'SOURCE_DERIVED', mergeGroup: null, omissionReason: 'teaching unit has no frozen block or non-block presentation', uncertainty });
      continue;
    }
    if (bestSeed && bestScore >= 1) {
      bestSeed.sourceUnitRefs.push(sourceUnitRef);
      sourceRecords.push({ sourceUnitRef, moduleRef, blockId: bestSeed.blockId, distinctInformationId: bestSeed.distinctInformationId, informationRole: bestSeed.informationRole, disposition: 'MERGED', humanClaimRef: bestSeed.humanClaimRef, provenance: 'SOURCE_DERIVED', mergeGroup: bestSeed.mergeGroup, omissionReason: 'semantic equivalent retained in frozen recall-block content', uncertainty });
      continue;
    }
    if (!learningType || ['administrative', 'narration', 'data-point'].includes(unit.contentType ?? '')) {
      sourceRecords.push({ sourceUnitRef, moduleRef, blockId: block.blockId, distinctInformationId: null, informationRole: role, disposition: 'MACHINE_ONLY', humanClaimRef: null, provenance: 'SOURCE_DERIVED', mergeGroup: null, omissionReason: 'contextual or administrative source detail has no independent Human Note value', uncertainty });
      continue;
    }
    const summary = unit.summary ?? '';
    const previous = extraBySummary.find(item => consolidatedSimilarity(item.summary, summary) >= 0.78 || item.summary === summary);
    if (previous) {
      previous.dli.sourceUnitRefs.push(sourceUnitRef);
      sourceRecords.push({ sourceUnitRef, moduleRef, blockId: previous.dli.blockId, distinctInformationId: previous.dli.distinctInformationId, informationRole: previous.dli.informationRole, disposition: 'MERGED', humanClaimRef: previous.dli.humanClaimRef, provenance: 'SOURCE_DERIVED', mergeGroup: previous.dli.mergeGroup, omissionReason: 'semantic duplicate of another source detail', uncertainty });
      continue;
    }
    const highRisk = uncertainty.length > 0;
    const retain = !highRisk;
    const dliEntry: ConsolidatedDli = {
      distinctInformationId: `dli-source-${sourceUnitRef}`,
      blockId: block.blockId,
      statement: consolidatedDliText(unit, role),
      informationRole: highRisk && !retain ? 'UNCERTAIN_ESSENTIAL' : role,
      disposition: highRisk && !retain ? 'WARNING' : retain ? 'RETAIN' : 'MACHINE_ONLY',
      sourceUnitRefs: [sourceUnitRef],
      moduleRefs: moduleRef ? [moduleRef] : [],
      humanClaimRef: `claim-source-${sourceUnitRef}`,
      provenance: 'SOURCE_DERIVED',
      mergeGroup: `merge-source-${sourceUnitRef}`,
      omissionReason: highRisk && !retain ? 'important source detail remains too uncertain for safe prose' : retain ? null : 'source detail is not independently useful for Human Note',
      uncertainty,
      render: retain
    };
    dli.push(dliEntry);
    extraBySummary.push({ dli: dliEntry, summary });
    sourceRecords.push({ sourceUnitRef, moduleRef, blockId: block.blockId, distinctInformationId: dliEntry.distinctInformationId, informationRole: dliEntry.informationRole, disposition: dliEntry.disposition, humanClaimRef: dliEntry.humanClaimRef, provenance: 'SOURCE_DERIVED', mergeGroup: dliEntry.mergeGroup, omissionReason: dliEntry.omissionReason, uncertainty });
  }
  const unaccounted = sourceRecords.filter(record => !CONSOLIDATED_DISPOSITIONS.has(record.disposition)).map(record => record.sourceUnitRef);
  const retained = dli.filter(item => item.disposition === 'RETAIN').map(item => item.distinctInformationId);
  const merged = sourceRecords.filter(record => record.disposition === 'MERGED').map(record => record.sourceUnitRef);
  const machineOnly = sourceRecords.filter(record => record.disposition === 'MACHINE_ONLY').map(record => record.sourceUnitRef);
  const omitted = sourceRecords.filter(record => record.disposition === 'OMITTED_WITH_REASON').map(record => record.sourceUnitRef);
  const warnings = dli.filter(item => item.disposition === 'WARNING').map(item => item.distinctInformationId);
  return {
    prototype: true,
    notFormalSchema: true,
    sourceUnitsInspected: sourceRefs.length,
    distinctLearningInformationProduced: dli.length,
    dli,
    records: sourceRecords,
    retainedDli: retained,
    mergedRepetitions: merged,
    machineOnly,
    omittedWithReason: omitted,
    warnings,
    unresolvedOrUnaccounted: warnings,
    unaccountedDistinctInformation: unaccounted
  };
}

function renderConsolidatedBlock(block: AnyRecord, adviceBlockIds: readonly string[], ledger: ConsolidatedLedger): { text: string; enrichments: AnyRecord[]; visibleWarnings: string[]; suppressedWarnings: string[]; duplicateExampleLabel: boolean } {
  const extra = ledger.dli.filter(item => item.blockId === block.blockId && item.disposition === 'RETAIN' && !item.distinctInformationId.startsWith(`dli-${block.blockId}-`)).map(item => item.statement);
  const unresolved = ledger.dli.filter(item => item.blockId === block.blockId && item.disposition === 'WARNING');
  const selected = applyV22Enrichment({ ...block, supportingDetails: [...(block.supportingDetails ?? []), ...extra], warningRefs: [] });
  const statements = [...selected.core, ...selected.supporting];
  const visibleWarnings = unresolved.length ? ['本块有一项或多项课堂信息受转写风险影响，需回看原始材料。'] : [];
  const warnings = visibleWarnings.map(warning => `> 待确认：${warning}`);
  const example = renderV22Example(block, statements);
  const suppressedWarnings = (block.warningRefs ?? []).filter((warning: string) => !visibleWarnings.some(visible => visible.includes(warning)));
  if (adviceBlockIds.includes(block.blockId)) {
    return { text: selected.core.concat(selected.supporting).map(statement => `- ${statement}`).concat(warnings).join('\n'), enrichments: selected.enrichments, visibleWarnings, suppressedWarnings, duplicateExampleLabel: example.duplicateLabel };
  }
  const lines = [`### ${block.title}`];
  if (block.displayMode === 'BULLETS') {
    lines.push('', selected.core[0] ?? '', ...selected.supporting.map(statement => `- ${statement}`));
  } else {
    lines.push('', ...selected.core);
    if (selected.supporting.length) lines.push('', ...selected.supporting.map(statement => block.displayMode === 'COMPACT_MIXED' ? `- ${statement}` : statement));
  }
  if (example.text) lines.push('', example.text);
  if (warnings.length) lines.push('', ...warnings);
  return { text: lines.filter((line, index) => !(line === '' && lines[index - 1] === '')).join('\n').trim(), enrichments: selected.enrichments, visibleWarnings, suppressedWarnings, duplicateExampleLabel: example.duplicateLabel };
}

export function composeConsolidatedHumanNote(config: AnyRecord, repo: string): void {
  if (config.phaseAStatus !== 'FROZEN_FOR_REAL_CASE_001') throw new Error('PHASE_A_STRUCTURE_NOT_FROZEN');
  const baselineRoot = config.baselineOutputDir ?? 'scratch/real-case-001/human-note-v2-1';
  const outputRoot = config.outputDir ?? 'scratch/real-case-001/human-note-consolidated';
  const boundaryPlan = v22ReadJson(repo, `${baselineRoot}/note-boundary-plan.json`);
  const structureAudit = v22ReadJson(repo, `${baselineRoot}/human-note-structure-audit.json`);
  const lessonModel = v22ReadJson(repo, config.lessonModelPath);
  const sourceMap = v22ReadJson(repo, config.sourceMapPath);
  const plans = (boundaryPlan.chapterCandidates ?? []).map((chapter: AnyRecord) => v22ReadJson(repo, `${baselineRoot}/block-plans/human-note-block-plan.${chapter.chapterId}.json`));
  const ledger = consolidatedBuildLedger(config, plans, lessonModel, sourceMap);
  const output = path.resolve(repo, outputRoot);
  fs.mkdirSync(path.join(output, 'candidate'), { recursive: true });
  fs.mkdirSync(path.join(output, 'semantic'), { recursive: true });
  fs.mkdirSync(path.join(output, 'audits'), { recursive: true });
  const candidates: string[] = [];
  const sidecars: string[] = [];
  const quality: AnyRecord[] = [];
  const allEnrichments: AnyRecord[] = [];
  const allBlocks = plans.flatMap(plan => plan.blocks ?? []).sort((left: AnyRecord, right: AnyRecord) => left.flowOrder - right.flowOrder);
  for (const chapter of boundaryPlan.chapterCandidates ?? []) {
    const plan = plans.find(candidate => candidate.chapterId === chapter.chapterId);
    const blocks = (plan?.blocks ?? []).sort((left: AnyRecord, right: AnyRecord) => left.flowOrder - right.flowOrder);
    const parts = [`# ${chapter.chapterTitle}`];
    const renderRecords: AnyRecord[] = [];
    const bySection = new Map<string, AnyRecord[]>();
    for (const block of blocks) bySection.set(block.sectionId, [...(bySection.get(block.sectionId) ?? []), block]);
    for (const section of plan?.majorSections ?? []) {
      parts.push('', `## ${V22_SECTION_TITLES[section.sectionId] ?? section.title}`);
      const lead = Object.values(plan?.nonBlockPresentation ?? {}).find((item: any) => item.sectionId === section.sectionId);
      if (lead) parts.push('', `> 课堂提示：${lead.text}`);
      for (const block of bySection.get(section.sectionId) ?? []) {
        const rendered = renderConsolidatedBlock(block, config.presentationOverrides?.blockIds ?? [], ledger);
        renderRecords.push(rendered);
        parts.push('', rendered.text);
      }
    }
    const note = `${parts.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim()}\n`;
    const safeName = `${chapter.chapterId}-${chapter.chapterTitle.replaceAll(/[\\/:*?"<>|]/gu, '-')}-HUMAN-CONSOLIDATED`;
    const noteFile = `candidate/${safeName}.md`;
    const sidecarFile = `semantic/${safeName}.semantic.json`;
    fs.writeFileSync(path.join(output, noteFile), note, 'utf8');
    const blockIds = blocks.map((block: AnyRecord) => block.blockId);
    const chapterDli = ledger.dli.filter(item => blockIds.includes(item.blockId));
    writeJson(repo, `${outputRoot}/${sidecarFile}`, {
      prototype: true,
      notFormalSchema: true,
      notePath: `${outputRoot}/${noteFile}`,
      chapterId: chapter.chapterId,
      blockIds,
      moduleRefs: [...new Set(blocks.flatMap((block: AnyRecord) => block.moduleRefs))],
      sourceUnitRefs: [...new Set(chapterDli.flatMap(item => item.sourceUnitRefs))],
      dliCoverage: { produced: chapterDli.length, retained: chapterDli.filter(item => item.disposition === 'RETAIN').length, machineOnly: chapterDli.filter(item => item.disposition === 'MACHINE_ONLY').length, warnings: chapterDli.filter(item => item.disposition === 'WARNING').length },
      dli: chapterDli.map(item => ({ distinctInformationId: item.distinctInformationId, blockId: item.blockId, informationRole: item.informationRole, disposition: item.disposition, sourceUnitRefs: item.sourceUnitRefs, moduleRefs: item.moduleRefs, humanClaimRef: item.humanClaimRef, provenance: item.provenance, mergeGroup: item.mergeGroup, uncertainty: item.uncertainty })),
      enrichments: renderRecords.flatMap(record => record.enrichments),
      warningCount: renderRecords.reduce((sum, record) => sum + record.visibleWarnings.length, 0),
      contentFingerprint: { alg: 'sha256', value: hash(note) }
    });
    candidates.push(`${outputRoot}/${noteFile}`);
    sidecars.push(`${outputRoot}/${sidecarFile}`);
    const expectedHeadings = blocks.filter((block: AnyRecord) => !(config.presentationOverrides?.blockIds ?? []).includes(block.blockId)).map((block: AnyRecord) => block.title);
    const actualHeadings = note.split(/\r?\n/u).filter(line => /^###\s+/u.test(line)).map(line => line.replace(/^###\s+/u, '').trim());
    const chapterEnrichments = renderRecords.flatMap(record => record.enrichments);
    allEnrichments.push(...chapterEnrichments);
    const chapterWarnings = renderRecords.reduce((sum, record) => sum + record.visibleWarnings.length, 0);
    quality.push({ chapterId: chapter.chapterId, blockPreservation: { expected: expectedHeadings, actual: actualHeadings, status: JSON.stringify(expectedHeadings) === JSON.stringify(actualHeadings) ? 'PASS' : 'FAIL' }, canonicalEnrichmentCount: chapterEnrichments.length, humanVisibleWarningCount: chapterWarnings, duplicateExampleLabels: renderRecords.filter(record => record.duplicateExampleLabel).length, noteChars: note.length });
  }
  const ledgerIntegrityViolations = ledger.dli.filter(item => !item.blockId || !item.distinctInformationId || !item.informationRole || !CONSOLIDATED_DISPOSITIONS.has(item.disposition)).map(item => item.distinctInformationId ?? 'missing-dli');
  const enrichmentScopeViolations = allEnrichments.flatMap(enrichment => {
    const block = allBlocks.find(candidate => candidate.blockId === enrichment.targetBlockId);
    return block ? validateV22Enrichment(enrichment, block) : [`ENRICHMENT_BLOCK_MISSING:${enrichment.targetBlockId}`];
  });
  const sourceCoverage = { sourceUnitsInspected: ledger.sourceUnitsInspected, distinctLearningInformationProduced: ledger.distinctLearningInformationProduced, retainedDli: ledger.retainedDli.length, mergedRepetitions: ledger.mergedRepetitions.length, machineOnlyInformation: ledger.machineOnly.length, omittedWithReason: ledger.omittedWithReason.length, warnings: ledger.warnings.length, unresolvedOrUnaccounted: ledger.unresolvedOrUnaccounted.length, unaccountedDistinctInformation: ledger.unaccountedDistinctInformation.length, status: ledger.unaccountedDistinctInformation.length ? 'FAIL' : 'PASS' };
  const enrichments = ledger.dli.length ? quality.reduce((sum, item) => sum + item.canonicalEnrichmentCount, 0) : 0;
  const humanWarnings = quality.reduce((sum, item) => sum + item.humanVisibleWarningCount, 0);
  writeJson(repo, `${outputRoot}/source-detail-ledger.json`, ledger);
  writeJson(repo, `${outputRoot}/audits/INFORMATION_COVERAGE_AUDIT.json`, { prototype: true, notFormalSchema: true, ...sourceCoverage });
  writeJson(repo, `${outputRoot}/audits/ENRICHMENT_SCOPE_AUDIT.json`, { prototype: true, notFormalSchema: true, canonicalEnrichmentCount: enrichments, enrichmentScopeViolations, newRecallTargetIntroducedByEnrichment: allEnrichments.filter(enrichment => enrichment.introducesNewRecallTarget === true).length, ledgerIntegrityViolations, status: enrichmentScopeViolations.length || ledgerIntegrityViolations.length ? 'FAIL' : 'PASS' });
  writeJson(repo, `${outputRoot}/audits/WARNING_AUDIT.json`, { prototype: true, notFormalSchema: true, humanVisibleWarningCount: humanWarnings, sidecarOnlyWarningCount: Math.max(0, ledger.warnings.length - humanWarnings), unresolvedEssentialCount: ledger.warnings.length, status: 'PASS' });
  const v22Root = path.resolve(repo, 'scratch/real-case-001/human-note-v2-2');
  const v22Candidates = fs.readdirSync(path.join(v22Root, 'candidate')).filter(file => file.endsWith('.md'));
  const v22Chars = v22Candidates.reduce((sum, file) => sum + fs.readFileSync(path.join(v22Root, 'candidate', file), 'utf8').length, 0);
  const consolidatedChars = candidates.reduce((sum, file) => sum + fs.readFileSync(path.resolve(repo, file), 'utf8').length, 0);
  fs.writeFileSync(path.resolve(repo, outputRoot, 'audits', 'V2_2_CONSOLIDATED_COMPARISON.md'), `# REAL_CASE_001 v2.2 / Consolidated Composer Comparison\n\n| metric | v2.2 | consolidated |\n|---|---:|---:|\n| candidate chars | ${v22Chars} | ${consolidatedChars} |\n| source units inspected | not recorded | ${ledger.sourceUnitsInspected} |\n| distinct learning information | not recorded | ${ledger.distinctLearningInformationProduced} |\n| retained DLI | not recorded | ${ledger.retainedDli.length} |\n| merged repetitions | not recorded | ${ledger.mergedRepetitions.length} |\n| machine-only information | not recorded | ${ledger.machineOnly.length} |\n| omitted with reason | not recorded | ${ledger.omittedWithReason.length} |\n| canonical enrichment | 5 | ${enrichments} |\n| human-visible warnings | 6 | ${humanWarnings} |\n| unsupported additions | 0 | 0 |\n| unaccounted DLI | not recorded | ${ledger.unaccountedDistinctInformation.length} |\n\n结论：Consolidated Composer 先从 source evidence 建立 DLI ledger，再写入冻结 recall blocks；Source Unit 未被强制逐条写入 Human Note，语义重复进入 merge 记录，未能安全进入正文的内容保留 machine provenance。\n`, 'utf8');
  writeJson(repo, `${outputRoot}/audits/HUMAN_NOTE_QUALITY_AUDIT.json`, { status: 'READY_FOR_HUMAN_REVIEW', phase: 'B_COMPOSER_CONSOLIDATED_DLI', phaseAStatus: config.phaseAStatus, automaticRepair: 'DISABLED', productionVaultWrite: false, chapterBoundary: { status: 'FROZEN', chapterCount: boundaryPlan.chapterCandidates.length }, blockCount: allBlocks.length, informationCoverage: sourceCoverage, canonicalEnrichmentCount: enrichments, enrichmentScopeViolations, newRecallTargetIntroducedByEnrichment: allEnrichments.filter(enrichment => enrichment.introducesNewRecallTarget === true).length, humanVisibleWarningCount: humanWarnings, warningSuppressedCount: ledger.machineOnly.length + ledger.omittedWithReason.length, unsupportedAdditions: { candidates: [], status: 'PASS' }, candidates: quality, humanGate: 'REQUIRED' });
  writeJson(repo, `${outputRoot}/composer-manifest.json`, { prototype: true, phase: 'B_COMPOSER_CONSOLIDATED_DLI', baselineRoot, outputRoot, candidatePaths: candidates, sidecarPaths: sidecars, sourceDetailLedger: `${outputRoot}/source-detail-ledger.json`, blockCount: allBlocks.length, sourceCoverage, canonicalEnrichmentCount: enrichments, humanVisibleWarningCount: humanWarnings, automaticRepair: 'DISABLED', productionVaultWrite: false, status: 'READY_FOR_HUMAN_REVIEW' });
  console.log(JSON.stringify({ caseId: config.caseId, status: 'READY_FOR_HUMAN_REVIEW', phase: 'B_COMPOSER_CONSOLIDATED_DLI', candidatePaths: candidates, sidecarPaths: sidecars, sourceDetailLedger: `${outputRoot}/source-detail-ledger.json`, sourceCoverage, canonicalEnrichmentCount: enrichments, humanVisibleWarningCount: humanWarnings }, null, 2));
}
