/** Alignment v0.2 — DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This is a draft knowledge-compilation contract.
 */

import type { ReviewStatus } from './common';

export type AlignmentRelation =
  | 'NEW'
  | 'EXPAND'
  | 'REFINE'
  | 'CORRECT'
  | 'EXAMPLE'
  | 'RELATION'
  | 'CONFLICT'
  | 'NO_CHANGE';

export type AlignmentConfidence = 'low' | 'medium' | 'high' | 'unknown';

/** Whether the relation is settled enough for ChangePlan consumption. */
export type AlignmentResolutionState = 'resolved' | 'deferred';

export interface AlignmentCandidate {
  readonly alignmentId: string;
  readonly lessonItemRefs: readonly string[];
  /** Required for every relation other than NEW; at least one of the two target lists must be present. */
  readonly existingKnowledgeRefs?: readonly string[];
  readonly existingNoteRefs?: readonly string[];
  readonly relation: AlignmentRelation;
  readonly resolutionState: AlignmentResolutionState;
  readonly rationale: string;
  readonly confidence: AlignmentConfidence;
  readonly scopeNote?: string;
  readonly suggestedLinks?: readonly string[];
}

export interface Alignment {
  readonly contractVersion: 'alignment/0.2';
  readonly schemaVersion: '0.2';
  readonly status: ReviewStatus;
  readonly alignmentId: string;
  readonly lessonModelRef: string;
  readonly candidates: readonly AlignmentCandidate[];
  readonly openQuestions?: readonly string[];
}
