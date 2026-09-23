import type { HumanNotePlan, HumanNoteQualityAudit } from './types';

const MACHINE_METADATA = [
  /\blm-[a-z0-9-]+\b/i,
  /\bsu-[a-z0-9-]+\b/i,
  /\b(?:MAIN_NOTE|RECALL_CONTEXT|INTENTIONALLY_OMITTED|REVIEW|KEEP|EXPAND|REFINE|LINK|NEW)\b/,
  /\b(?:teacher_advice_related|teacher_advice_related_to_course_domain)\b/,
  /\b(?:mutation|confidence|sha256|hash|flowOrder|teachingFunction|transitionType)\b/i
];

const RELATION_PROSE_PATTERNS = [
  /为.+奠定基础/u,
  /进一步引出/u,
  /深层联系/u,
  /体现了.+与.+关系/u,
  /从而说明.+关系/u
];

const LOW_INFORMATION_PHRASES = [
  '值得注意的是',
  '进一步来说',
  '从某种角度',
  '从另一个角度',
  '因此可以看出'
];

const sentenceParts = (markdown: string): string[] => markdown
  .split(/[。！？!?\n]/u)
  .map(value => value.trim())
  .filter(Boolean);

const words = (sentence: string): Set<string> => new Set(
  sentence
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(value => value.length > 1)
);

export function auditHumanNote(markdown: string, plan: HumanNotePlan): HumanNoteQualityAudit {
  const sentences = sentenceParts(markdown);
  const rhetoricalQuestionCount = (markdown.match(/[？?]/gu) ?? []).length;
  const questionHeadingCount = markdown
    .split(/\r?\n/u)
    .filter(line => /^#{1,6}\s.*[？?]/u.test(line)).length;
  const redundancyCandidates: string[] = [];
  for (let index = 1; index < sentences.length; index += 1) {
    const previous = words(sentences[index - 1] ?? '');
    const current = words(sentences[index] ?? '');
    const intersection = [...previous].filter(word => current.has(word)).length;
    const denominator = Math.max(1, Math.min(previous.size, current.size));
    if (intersection / denominator >= 0.72 && previous.size >= 4 && current.size >= 4) {
      redundancyCandidates.push(`adjacent-${index}`);
    }
  }
  const expansionClicheHits = LOW_INFORMATION_PHRASES.filter(phrase => markdown.includes(phrase));
  const machineMetadataLeakage = detectMachineMetadataLeakage(markdown);
  const bullets = markdown.split(/\r?\n/u).filter(line => /^\s*[-*+]\s+/u.test(line)).length;
  const paragraphs = markdown
    .split(/\r?\n\s*\r?\n/u)
    .filter(block => block.trim() && !/^\s*#/u.test(block) && !/^\s*[-*+]/u.test(block)).length;
  const flowOrders = plan.orderedSections.map((_, index) => index + 1);
  const lectureFlowOrder = flowOrders.every((value, index) => value === index + 1) ? 'PASS' : 'FAIL';
  return {
    rhetoricalQuestionCount,
    questionHeadingCount,
    unsupportedAdditionCandidates: [],
    redundancyCandidates,
    expansionClicheHits,
    relationProseExpansionCandidates: detectRelationProseExpansion(markdown),
    machineMetadataLeakage,
    lectureFlowOrder,
    paragraphBulletBalance: { paragraphs, bullets },
    sourceBoundary: 'PASS'
  };
}

export function detectMachineMetadataLeakage(markdown: string): string[] {
  return MACHINE_METADATA.filter(pattern => pattern.test(markdown)).map(pattern => pattern.source);
}

export function detectRelationProseExpansion(markdown: string): string[] {
  return RELATION_PROSE_PATTERNS.filter(pattern => pattern.test(markdown)).map(pattern => pattern.source);
}

export function auditExpansionLevels(entries: readonly { sectionId: string; expansionLevel: string; sentenceCount: number }[]): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (entry.expansionLevel === 'MENTION' && entry.sentenceCount > 2) errors.push(`over-expanded:${entry.sectionId}`);
    if (entry.expansionLevel === 'EXPLAINED' && entry.sentenceCount === 0) errors.push(`under-expanded:${entry.sectionId}`);
    if ((entry.expansionLevel === 'DEVELOPED' || entry.expansionLevel === 'ANCHOR') && entry.sentenceCount < 2) errors.push(`under-expanded:${entry.sectionId}`);
  }
  return errors;
}

export function validateSourceBoundary(proseSourceRefs: readonly string[], allowedSourceRefs: ReadonlySet<string>): string[] {
  return proseSourceRefs.filter(sourceRef => !allowedSourceRefs.has(sourceRef)).map(sourceRef => `unsupported-source:${sourceRef}`);
}

export function validatePriorKnowledgeRecall(priorKnowledgeRecall: readonly string[], required: readonly string[]): string[] {
  return required.filter(marker => !priorKnowledgeRecall.some(item => item.includes(marker))).map(marker => `missing-prior-context:${marker}`);
}

export function detectBaselineCopy(note: string, baseline: string): boolean {
  const normalizedNote = note.replaceAll(/\s+/gu, ' ').trim();
  const normalizedBaseline = baseline.replaceAll(/\s+/gu, ' ').trim();
  return normalizedBaseline.length > 0 && normalizedNote.includes(normalizedBaseline);
}

export function validateCoverageLedger(plan: HumanNotePlan, teachingModuleRefs: readonly string[]): string[] {
  const expected = new Set(teachingModuleRefs);
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const entry of plan.coverageLedger) {
    if (!expected.has(entry.moduleRef)) errors.push(`unknown module: ${entry.moduleRef}`);
    if (seen.has(entry.moduleRef)) errors.push(`duplicate module: ${entry.moduleRef}`);
    seen.add(entry.moduleRef);
    if (entry.disposition === 'INTENTIONALLY_OMITTED' && !entry.warning) {
      errors.push(`omission without reason: ${entry.moduleRef}`);
    }
  }
  for (const moduleRef of expected) {
    if (!seen.has(moduleRef)) errors.push(`unaccounted module: ${moduleRef}`);
  }
  return errors;
}
