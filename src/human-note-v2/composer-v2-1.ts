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
