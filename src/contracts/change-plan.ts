/** ChangePlan v0.1 — DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This is a draft knowledge-compilation contract.
 */

import type { ReviewStatus, SchemaVersion } from './common';

export type ChangeOperationKind =
  | 'create'
  | 'expand'
  | 'link'
  | 'add_relation'
  | 'add_source'
  | 'annotate_scope'
  | 'merge_candidate'
  | 'preserve_both'
  | 'no_change';

export type ChangeOperationStatus = 'proposed' | 'accepted' | 'rejected' | 'applied';

export interface ChangeOperation {
  readonly operationId: string;
  readonly kind: ChangeOperationKind;
  readonly targetRefs: readonly string[];
  readonly alignmentRefs?: readonly string[];
  readonly lessonItemRefs?: readonly string[];
  readonly sourceUnitRefs?: readonly string[];
  /** Required for expand, merge_candidate and preserve_both operations. */
  readonly preserveContentRefs?: readonly string[];
  readonly rationale: string;
  readonly proposedText?: string;
  readonly suggestedLinks?: readonly string[];
  readonly risks?: readonly string[];
  readonly status: ChangeOperationStatus;
}

export interface ChangePlan {
  readonly contractVersion: 'change-plan/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly planId: string;
  readonly lessonModelRef: string;
  readonly alignmentRef: string;
  readonly candidateOnly: true;
  readonly operations: readonly ChangeOperation[];
}
