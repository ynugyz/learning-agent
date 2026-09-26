/** Alignment v0.1 — DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This is a draft knowledge-compilation contract.
 */

import type { ReviewStatus, SchemaVersion } from './common';

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

export interface AlignmentCandidate {
  readonly alignmentId: string;
  readonly lessonItemRefs: readonly string[];
  /** Required for every relation other than NEW; at least one of the two target lists must be present. */
  readonly existingKnowledgeRefs?: readonly string[];
  readonly existingNoteRefs?: readonly string[];
  readonly relation: AlignmentRelation;
  readonly rationale: string;
  readonly confidence: AlignmentConfidence;
  readonly scopeNote?: string;
  readonly suggestedLinks?: readonly string[];
}

export interface Alignment {
  readonly contractVersion: 'alignment/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly alignmentId: string;
  readonly lessonModelRef: string;
  readonly candidates: readonly AlignmentCandidate[];
  readonly openQuestions?: readonly string[];
}
