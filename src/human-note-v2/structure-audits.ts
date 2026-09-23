import type { HumanNoteBlockPlan, HumanNoteBlockAudit } from './types';

export interface ChapterBoundaryCandidate {
  readonly chapterId: string;
  readonly chapterTitle: string;
  readonly moduleRefs: readonly string[];
  readonly chapterBoundaryEvidence: readonly { readonly sourceUnitRef: string; readonly kind: string }[];
  readonly plannedAction: string;
  readonly grain: string;
}

export function auditNoteBoundaries(chapters: readonly ChapterBoundaryCandidate[], teachingRefs: readonly string[],
  explicitChapterCount: number): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  if (explicitChapterCount > 1 && chapters.length < explicitChapterCount) errors.push('NOTE_BOUNDARY_COLLAPSE');
  for (const chapter of chapters) {
    if (chapter.grain !== 'CHAPTER') errors.push(`NON_CHAPTER_GRAIN:${chapter.chapterId}`);
    if (!chapter.chapterBoundaryEvidence.length) errors.push(`BOUNDARY_EVIDENCE_MISSING:${chapter.chapterId}`);
    if (chapter.plannedAction === 'SESSION_INDEX_ONLY' && chapter.moduleRefs.length) errors.push(`SESSION_NOTE_SUBSTITUTION:${chapter.chapterId}`);
    for (const ref of chapter.moduleRefs) {
      if (seen.has(ref)) errors.push(`DUPLICATE_CHAPTER_MODULE:${ref}`);
      seen.add(ref);
    }
  }
  for (const ref of teachingRefs) if (!seen.has(ref)) errors.push(`MISSING_CHAPTER_MODULE:${ref}`);
  for (const ref of seen) if (!teachingRefs.includes(ref)) errors.push(`UNKNOWN_CHAPTER_MODULE:${ref}`);
  return errors;
}

export interface AuditableBlock extends HumanNoteBlockPlan {
  readonly recallTargets: readonly string[];
  readonly contentRoles: readonly string[];
}

export function auditBlockStructure(blocks: readonly AuditableBlock[], sections: readonly { sectionId: string; title: string }[],
  readingOrder: ReadonlyMap<string, number>): HumanNoteBlockAudit & { readonly errors: readonly string[] } {
  const errors: string[] = [];
  const blockCollapseCandidates: string[] = [];
  const multiRoleBlocks: string[] = [];
  const oversizedBlocks: string[] = [];
  const singleSentenceTinyBlocks: string[] = [];
  const modulesPerBlock: Record<string, number> = {};
  const blocksPerMajorSection: Record<string, number> = Object.fromEntries(sections.map(section => [section.sectionId, 0]));
  const targetOwners = new Map<string, string>();
  const blockIds = new Set(blocks.map(block => block.blockId));
  let previousReadingOrder = -Infinity;
  let previousFlowOrder = -Infinity;
  for (const block of blocks) {
    modulesPerBlock[block.blockId] = block.moduleRefs.length;
    if (!(block.sectionId in blocksPerMajorSection)) errors.push(`UNKNOWN_SECTION:${block.blockId}`);
    else blocksPerMajorSection[block.sectionId] = (blocksPerMajorSection[block.sectionId] ?? 0) + 1;
    if (!block.moduleRefs.length || !block.sourceRefs.length) errors.push(`EVIDENCE_MISSING:${block.blockId}`);
    if (!block.recallTarget || !block.recallTargets.length) errors.push(`RECALL_TARGET_MISSING:${block.blockId}`);
    if (block.recallTargets.length > 1) blockCollapseCandidates.push(block.blockId);
    if (block.contentRoles.length > 1 && !(block.contentRoles.length === 2 && block.contentRoles.includes('EXAMPLE'))) {
      multiRoleBlocks.push(block.blockId);
    }
    if (block.contentRoles.includes('ADVICE') && block.blockRole !== 'ADVICE') errors.push(`ADVICE_IN_CONCEPT:${block.blockId}`);
    if (block.contentRoles.includes('WARNING') && block.blockRole !== 'WARNING') errors.push(`WARNING_IN_CONCEPT:${block.blockId}`);
    const sentenceCount = block.coreStatements.length + block.supportingDetails.length;
    if (block.coreStatements.length !== 1 || block.supportingDetails.length > 2 || block.exampleRefs.length > 1 || sentenceCount > 3) {
      oversizedBlocks.push(block.blockId);
    }
    if (sentenceCount === 1 && block.expansionLevel === 'ANCHOR' && block.blockRole !== 'ROADMAP' && block.exampleRefs.length === 0) singleSentenceTinyBlocks.push(block.blockId);
    const existing = targetOwners.get(block.recallTarget);
    if (existing && block.blockRole !== 'WARNING' && block.blockRole !== 'SELF_TEST') {
      errors.push(`DISCOURSE_FRAGMENTATION:${existing}+${block.blockId}`);
    } else if (!existing) targetOwners.set(block.recallTarget, block.blockId);
    const firstOrder = Math.min(...block.moduleRefs.map(ref => readingOrder.get(ref) ?? Infinity));
    if (!Number.isFinite(firstOrder)) errors.push(`UNKNOWN_MODULE:${block.blockId}`);
    if (firstOrder < previousReadingOrder || block.flowOrder <= previousFlowOrder) errors.push(`LECTURE_FLOW_ORDER:${block.blockId}`);
    previousReadingOrder = firstOrder;
    previousFlowOrder = block.flowOrder;
    for (const separated of block.mustSeparateFrom) if (!blockIds.has(separated)) errors.push(`UNKNOWN_SEPARATION:${block.blockId}:${separated}`);
    if (block.moduleRefs.length > 1 && !block.mergeRationale) errors.push(`MERGE_RATIONALE_MISSING:${block.blockId}`);
  }
  for (const [sectionId, count] of Object.entries(blocksPerMajorSection)) if (count === 0) errors.push(`EMPTY_SECTION:${sectionId}`);
  errors.push(...blockCollapseCandidates.map(id => `BLOCK_COLLAPSE:${id}`));
  errors.push(...multiRoleBlocks.map(id => `ROLE_COLLAPSE:${id}`));
  errors.push(...oversizedBlocks.map(id => `BLOCK_BUDGET:${id}`));
  errors.push(...singleSentenceTinyBlocks.map(id => `TINY_ANCHOR:${id}`));
  return { blockCount: blocks.length, blocksPerMajorSection, modulesPerBlock, multiRoleBlocks,
    blockCollapseCandidates, oversizedBlocks, singleSentenceTinyBlocks, status: errors.length ? 'FAIL' : 'PASS', errors };
}

export function auditScanability(blocks: readonly AuditableBlock[], sections: readonly { sectionId: string }[],
  visibleTitles: readonly string[]): { status: 'PASS' | 'FAIL'; findings: string[] } {
  const findings: string[] = [];
  const titleSet = new Set(visibleTitles);
  for (const block of blocks) if (!titleSet.has(block.title)) findings.push(`TITLE_NOT_VISIBLE:${block.blockId}`);
  for (const section of sections) {
    const subset = blocks.filter(block => block.sectionId === section.sectionId);
    if (subset.flatMap(block => block.recallTargets).length > 3 && subset.length < 2) findings.push(`UNSCANNABLE_SECTION:${section.sectionId}`);
  }
  let consecutiveLong = 0;
  for (const block of blocks) {
    const long = [...block.coreStatements, ...block.supportingDetails].some(text => text.length > 110);
    consecutiveLong = long ? consecutiveLong + 1 : 0;
    if (consecutiveLong > 3) findings.push(`LONG_PROSE_RUN:${block.blockId}`);
  }
  return { status: findings.length ? 'FAIL' : 'PASS', findings };
}

export interface BlockFragmentationAudit {
  readonly singleModuleBlockRatio: number;
  readonly sameRecallTargetSplits: readonly string[];
  readonly mechanicalSplitCandidates: readonly string[];
  readonly tinyBlockCandidates: readonly string[];
  readonly status: 'PASS' | 'FAIL';
}

export function auditBlockFragmentation(blocks: readonly AuditableBlock[]): BlockFragmentationAudit {
  const sameRecallTargetSplits: string[] = [];
  const mechanicalSplitCandidates: string[] = [];
  const tinyBlockCandidates: string[] = [];
  const targetOwners = new Map<string, string>();
  for (const block of blocks) {
    const previous = targetOwners.get(block.recallTarget);
    if (previous) sameRecallTargetSplits.push(`${previous}+${block.blockId}`);
    else targetOwners.set(block.recallTarget, block.blockId);
    const contentCount = block.coreStatements.length + block.supportingDetails.length + block.exampleRefs.length + block.warningRefs.length;
    if (block.moduleRefs.length === 1 && contentCount <= 1 && block.expansionLevel === 'MENTION' && block.coreStatements.join('').length < 32) {
      tinyBlockCandidates.push(block.blockId);
    }
    if (block.moduleRefs.length === 1 && block.blockRole === 'CONCEPT' && contentCount === 1 && block.exampleRefs.length === 0 && block.warningRefs.length === 0) {
      mechanicalSplitCandidates.push(block.blockId);
    }
  }
  const singleModuleCount = blocks.filter(block => block.moduleRefs.length === 1).length;
  const singleModuleBlockRatio = blocks.length ? singleModuleCount / blocks.length : 0;
  const errors = [
    ...(singleModuleBlockRatio > 0.7 ? ['SINGLE_MODULE_BLOCK_RATIO'] : []),
    ...(sameRecallTargetSplits.length ? ['SAME_RECALL_TARGET_SPLIT'] : []),
    ...(mechanicalSplitCandidates.length > Math.ceil(blocks.length * 0.7) ? ['MECHANICAL_SPLIT_PATTERN'] : []),
    ...(tinyBlockCandidates.length ? ['TINY_BLOCK_WITHOUT_RECALL_VALUE'] : [])
  ];
  return { singleModuleBlockRatio, sameRecallTargetSplits, mechanicalSplitCandidates, tinyBlockCandidates,
    status: errors.length ? 'FAIL' : 'PASS' };
}

export function auditContentBoundaries(blocks: readonly AuditableBlock[], teachingRefs: readonly string[],
  allowedSourceRefs: ReadonlySet<string>, deltaRefs: readonly string[], reviewRefs: readonly string[]): string[] {
  const errors: string[] = [];
  const represented = new Set(blocks.flatMap(block => block.moduleRefs));
  for (const ref of teachingRefs) if (!represented.has(ref)) errors.push(`KEYPOINT_OMITTED:${ref}`);
  for (const ref of deltaRefs) if (!represented.has(ref)) errors.push(`VAULT_SUPPRESSED_DELTA:${ref}`);
  for (const ref of reviewRefs) if (!represented.has(ref)) errors.push(`REVIEW_OMITTED:${ref}`);
  for (const block of blocks) for (const sourceRef of block.sourceRefs) if (!allowedSourceRefs.has(sourceRef)) errors.push(`UNSUPPORTED_SOURCE:${block.blockId}:${sourceRef}`);
  return errors;
}
