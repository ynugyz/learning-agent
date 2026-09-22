/**
 * SourceMap v0.1 (REV1) — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/source-map.v0.1.schema.json` and
 * `specs/source-map-v0.1.md`. Revised under human adjudication during M1A REV1;
 * see `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`.
 *
 * A SourceMap is a structure-and-coverage paper for ONE ingestion source
 * package. It describes rather than interprets, never summarises the lesson,
 * never records a final knowledge destination, and is never written back.
 *
 * REV1 changes that matter to a reader of this file:
 *  - `disposition` / `knowledgeRefs` are GONE (SM-20);
 *  - `retentionClass` became `preservation` (fidelity priority, SM-6);
 *  - `processingHints` became package-local `observations` (SM-5);
 *  - `epistemicStatus` has no `verified` value (SM-16);
 *  - `coverage` can no longer claim completeness (SM-17).
 *
 * @packageDocumentation
 */

import type { ReviewStatus, SchemaVersion } from './common';

/** Evidence category present in a source package. */
export type SourceKind =
  | 'transcript'
  | 'slide'
  | 'textbook'
  | 'student-note'
  | 'board-image'
  | 'handout'
  | 'audio'
  | 'video'
  | 'other';

/** Observed quality problem in a source. */
export type SourceQualityIssue =
  | 'asr-noise'
  | 'missing-audio'
  | 'missing-pages'
  | 'illegible'
  | 'out-of-order'
  | 'duplicate'
  | 'language-mixed'
  | 'unknown';

/** Observed quality of a source (SM-13). */
export interface SourceQuality {
  readonly rating: 'clean' | 'noisy' | 'partial' | 'unreadable' | 'unknown';
  readonly issues?: readonly SourceQualityIssue[];
  readonly note?: string;
}

/** One evidence item in the package (SM-9). */
export interface SourceEntry {
  readonly sourceId: string;
  readonly kind: SourceKind;
  /** Must not point at a production Vault during experiments (SM-7). */
  readonly location: string;
  readonly quality?: SourceQuality;
}

/**
 * What kind of content a source unit is (SM-10).
 *
 * `analogy`, `opinion`, `problem-solving-tip`, `common-mistake` and
 * `exam-pointer` are first-class on purpose: they are the material a summariser
 * drops, so folding them into a generic "text" type would make losing them
 * undetectable.
 */
export type ContentType =
  | 'definition'
  | 'claim'
  | 'explanation'
  | 'derivation'
  | 'worked-example'
  | 'example'
  | 'analogy'
  | 'opinion'
  | 'problem-solving-tip'
  | 'common-mistake'
  | 'boundary-condition'
  | 'exam-pointer'
  | 'administrative'
  | 'exercise'
  | 'formula'
  | 'procedure'
  | 'data-point'
  | 'narration'
  | 'unknown';

/**
 * Fidelity priority (SM-6, SM-11).
 *
 * Answers only "how much would be lost if this were dropped or compressed?".
 * It is NOT a knowledge-importance ranking, it is an inference rather than a
 * source property, and it may be `unknown`.
 */
export interface Preservation {
  readonly priority: 'must-preserve' | 'high' | 'normal' | 'low' | 'expendable' | 'unknown';
  readonly rationale?: string;
  /** Pinned `true` so priority can never be recorded as a source property. */
  readonly isInference: true;
}

/**
 * How the SOURCE presents a unit (SM-16).
 *
 * Deliberately a different vocabulary from SemanticCard's claim
 * `epistemicState`, and deliberately without a `verified` value: a machine may
 * never assert that a source verified something.
 */
export type SourceEpistemicStatus =
  | 'source-explicit'
  | 'inferred'
  | 'uncertain'
  | 'conflict'
  | 'opinion'
  | 'analogy'
  | 'heuristic'
  | 'unspecified';

/** Where inside a source a unit lives (SM-24). */
export interface Locator {
  readonly kind:
    | 'timestamp-range'
    | 'page-range'
    | 'slide'
    | 'section'
    | 'line-range'
    | 'span'
    | 'opaque';
  readonly start?: string;
  readonly end?: string;
  /** At least one of `value` / `start`, non-empty; otherwise the unit is untraceable. */
  readonly value?: string;
}

/** Mapping confidence for a unit (SM-12). */
export interface UnitConfidence {
  readonly level: 'low' | 'medium' | 'high';
  readonly basis?: 'machine-inferred' | 'human-assigned' | 'derived';
}

/**
 * A package-local observation (SM-5).
 *
 * Every value must be decidable from the source package alone. The vocabulary
 * deliberately excludes anything requiring the existing knowledge network, such
 * as "may duplicate existing knowledge". Advisory only, never a decision.
 */
export interface UnitObservation {
  readonly observation:
    | 'has-formula'
    | 'has-notational-risk'
    | 'asr-suspect'
    | 'terminology-unstable'
    | 'compression-loses-meaning'
    | 'needs-cross-source-check'
    | 'needs-human-review';
  readonly rationale?: string;
  readonly advisory: true;
}

/**
 * One entry in the Source Unit Ledger (SM-3, SM-4).
 *
 * `unitId` is stable and package-derived: never from a LessonModel id, a
 * `knowledgeId`, or an alignment decision. Note there is NO disposition field —
 * where a unit's knowledge ended up is recorded by downstream artifacts.
 */
export interface SourceUnit {
  readonly unitId: string;
  /** Must resolve to an entry in `sources[]`. */
  readonly sourceId: string;
  readonly locator: Locator;
  readonly contentType: ContentType;
  readonly preservation: Preservation;
  readonly epistemicStatus: SourceEpistemicStatus;
  /** Bounded, pointer-grade description, ≤ 280 chars. Never a transcript (SM-26). */
  readonly summary?: string;
  readonly keyTerms?: readonly string[];
  readonly confidence?: UnitConfidence;
  readonly observations?: readonly UnitObservation[];
}

/** A known gap in the source package (SM-14). */
export interface MissingItem {
  readonly description: string;
  readonly expectedFrom?: string;
  readonly impact?: 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Declared coverage (SM-17).
 *
 * There is deliberately no absolute "complete" value. The strongest available
 * claim is that no gap was found, which is an assessment rather than a proof.
 */
export interface Coverage {
  readonly assessment: 'not_assessed' | 'assessed_no_known_gap' | 'known_gaps';
  readonly note?: string;
}

/** Disagreement observed between sources (SM-18). */
export interface SourceConflict {
  readonly conflictId: string;
  readonly kind: 'contradiction' | 'disagreement' | 'terminology-mismatch' | 'scope-mismatch';
  /** At least two non-empty unit ids. A one-sided "conflict" is a category error. */
  readonly unitRefs: readonly string[];
  readonly description: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'unknown';
  readonly resolution?: {
    readonly status: 'unresolved' | 'human-resolved' | 'accepted-as-open';
    readonly note?: string;
  };
}

/**
 * Structure-and-coverage paper for ONE ingestion source package (SM-19).
 *
 * Out of scope by design: lesson meaning, and every unit's final knowledge
 * destination (SM-20).
 */
export interface SourceMap {
  readonly contractVersion: 'source-map/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly sourcePackageId: string;
  readonly sources: readonly SourceEntry[];
  readonly missingOrUnavailable?: readonly MissingItem[];
  readonly coverage?: Coverage;
  /** The Source Unit Ledger. May be empty only when the package is genuinely empty or unreadable. */
  readonly units: readonly SourceUnit[];
  readonly conflicts?: readonly SourceConflict[];
  /** Mapping-session notes. Never a place for lesson content. */
  readonly notes?: string;
}
