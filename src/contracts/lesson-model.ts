/**
 * LessonModel v0.1 — DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This is a draft knowledge-compilation contract.
 *
 * This is deliberately smaller than the historical Human Note v2 prototype.
 * It models lesson meaning and teaching flow without freezing page roles,
 * presentation blocks or a DLI ledger.
 */

import type { ReviewStatus, SchemaVersion } from './common';

export type LessonItemKind =
  | 'concept'
  | 'claim'
  | 'mechanism'
  | 'example'
  | 'comparison'
  | 'method'
  | 'boundary'
  | 'formula'
  | 'teacher-explanation'
  | 'question'
  | 'other';

export type LessonEpistemicContext =
  | 'classroom'
  | 'course-simplification'
  | 'canonical-supplement'
  | 'teacher-opinion'
  | 'analogy'
  | 'inference'
  | 'uncertain';

export type LessonRelationType =
  | 'part-of'
  | 'requires'
  | 'causes'
  | 'enables'
  | 'contrasts-with'
  | 'example-of'
  | 'qualifies'
  | 'supports'
  | 'uncertain';

export interface LessonItem {
  readonly itemId: string;
  readonly kind: LessonItemKind;
  readonly title: string;
  readonly statement: string;
  readonly sourceUnitRefs: readonly string[];
  readonly context?: LessonEpistemicContext;
  readonly scope?: string;
  readonly uncertainty?: readonly string[];
}

export interface LessonRelation {
  readonly relationId: string;
  readonly fromItemId: string;
  readonly toItemId: string;
  readonly type: LessonRelationType;
  readonly sourceUnitRefs?: readonly string[];
  readonly rationale?: string;
}

export interface TeachingFlowEntry {
  readonly order: number;
  readonly itemRefs: readonly string[];
  readonly sourceUnitRefs: readonly string[];
  readonly teachingPurpose?: string;
}

export interface LessonModel {
  readonly contractVersion: 'lesson-model/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly lessonModelId: string;
  readonly sourceMapRef: string;
  readonly contentIdentity: string;
  readonly items: readonly LessonItem[];
  readonly relations?: readonly LessonRelation[];
  readonly teachingFlow?: readonly TeachingFlowEntry[];
  readonly uncertainties?: readonly string[];
  readonly visualGaps?: readonly string[];
}
