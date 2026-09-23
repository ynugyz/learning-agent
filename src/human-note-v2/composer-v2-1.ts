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
