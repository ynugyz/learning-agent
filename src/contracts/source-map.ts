/**
 * SourceMap v0.1 — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/source-map.v0.1.schema.json` and `specs/source-map-v0.1.md`.
 * Rederived during M1A from design principles, not extended from the archived
 * M0 draft. Has NOT passed human review.
 *
 * A SourceMap is a structure-and-coverage paper for a source package: what is
 * actually present, where, how trustworthy, and what is missing. It does NOT
 * summarise the lesson and does NOT decide final knowledge destinations.
 *
 * @packageDocumentation
 */

import type { ReviewStatus } from './semantic-card';

/** Evidence category present in a source package. Extend only with review. */
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

/** Observed quality of a source. */
export interface SourceQuality {
  readonly rating: 'clean' | 'noisy' | 'partial' | 'unreadable' | 'unknown';
  readonly issues?: readonly SourceQualityIssue[];
  readonly note?: string;
}

/** One evidence item in the package. */
export interface SourceEntry {
  readonly sourceId: string;
  readonly kind: SourceKind;
  /** Must not point at a production Vault during experiments (AGENTS.md 3.1). */
  readonly location: string;
  readonly quality?: SourceQuality;
}

/**
 * What kind of content a source unit is.
 *
 * `analogy`, `opinion`, `problem-solving-tip`, `common-mistake` and
 * `exam-pointer` are first-class on purpose (SM-4): they are the material a
 * summariser drops, and folding them into a generic "text" type would make
 * losing them undetectable.
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
 * Why a unit matters for later processing.
 *
 * Required even for `droppable` content: a recorded decision to drop something
 * is auditable, whereas a unit that was never listed is an invisible omission.
 */
export type RetentionClass =
  | 'core'
  | 'supporting'
  | 'pedagogical-aid'
  | 'assessment-relevant'
  | 'context-only'
  | 'droppable';

/** How the SOURCE presents a unit. Never a statement of machine belief (SM-19). */
export type SourceEpistemicStatus =
  | 'asserted'
  | 'inferred'
  | 'uncertain'
  | 'disputed'
  | 'verified'
  | 'opinion'
  | 'analogy'
  | 'heuristic'
  | 'unspecified';

/** Where inside a source a unit lives. */
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
  /** At least one of `value` / `start` is required; an opaque locator with no value is untraceable. */
  readonly value?: string;
}

/** Mapping confidence for a unit. */
export interface UnitConfidence {
  readonly level: 'low' | 'medium' | 'high';
  readonly basis?: 'machine-inferred' | 'human-assigned' | 'derived';
}

/**
 * Advisory processing hint.
 *
 * A hint is cheap, early and carries NO authority: a later module is entitled
 * to contradict it. `advisory` is pinned `true` so a hint can never read as a
 * decision.
 */
export interface ProcessingHint {
  readonly hint:
    | 'has-formula'
    | 'has-notational-risk'
    | 'asr-suspect'
    | 'may-duplicate-existing-knowledge'
    | 'likely-correction-to-existing'
    | 'needs-cross-source-check'
    | 'probably-not-knowledge'
    | 'needs-human-review';
  readonly rationale?: string;
  readonly advisory: true;
}

/**
 * Handoff slot filled in by LATER stages.
 *
 * This is the seam that satisfies "every significant unit must be traceable to
 * its outcome" without making the SourceMap decide the final knowledge
 * destination (SM-6, SM-16).
 */
export interface UnitDisposition {
  readonly state: 'unprocessed' | 'processed' | 'deferred' | 'dropped';
  readonly handledBy?: string;
  readonly knowledgeRefs?: readonly string[];
  /** Expected when `state` is `dropped`. Design rule, not schema-enforced (ambiguity A5). */
  readonly reason?: string;
}

/** One entry in the Source Unit Ledger. */
export interface SourceUnit {
  /**
   * Stable, package-local id minted from the source package ALONE.
   *
   * Must not be derived from, or contain, a LessonModel id, a `knowledgeId`, or
   * an alignment decision (SM-3). The reference direction is one-way:
   * SemanticCard -> SourceMap, never the reverse (SM-22).
   */
  readonly unitId: string;
  /** Must resolve to an entry in `sources[]`. */
  readonly sourceId: string;
  readonly locator: Locator;
  readonly contentType: ContentType;
  readonly retentionClass: RetentionClass;
  readonly epistemicStatus: SourceEpistemicStatus;
  /** Bounded, pointer-grade description. Never a transcript substitute (SM-26). */
  readonly summary?: string;
  readonly keyTerms?: readonly string[];
  readonly confidence?: UnitConfidence;
  readonly processingHints?: readonly ProcessingHint[];
  readonly disposition: UnitDisposition;
}

/** A known gap in the source package. A gap is a recorded fact, not an assumption. */
export interface MissingItem {
  readonly description: string;
  readonly expectedFrom?: string;
  readonly impact?: 'low' | 'medium' | 'high' | 'unknown';
}

/** Declared coverage of the package. */
export interface Coverage {
  readonly basis: 'complete' | 'partial' | 'unknown';
  readonly note?: string;
}

/** Disagreement observed between sources. Needs at least two units to be meaningful. */
export interface SourceConflict {
  readonly conflictId: string;
  readonly kind: 'contradiction' | 'disagreement' | 'terminology-mismatch' | 'scope-mismatch';
  /** At least two unit ids. A one-sided "conflict" is a category error. */
  readonly unitRefs: readonly string[];
  readonly description: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'unknown';
  /**
   * TODO(SM-A6): recording a human resolution here may be Layer D (alignment)
   * work leaking into Layer B. Flagged for review.
   */
  readonly resolution?: {
    readonly status: 'unresolved' | 'human-resolved' | 'accepted-as-open';
    readonly note?: string;
  };
}

/**
 * Structure-and-coverage paper for ONE source package.
 *
 * SM-1: answers "what is actually present, where, how trustworthy, what is
 * missing" — never "what does this lesson teach".
 *
 * TODO(SM-A2 / Q1): unit segmentation granularity (sentence, bullet, passage)
 * is undecided, so two implementations will produce incomparable ledgers.
 */
export interface SourceMap {
  readonly contractVersion: 'source-map/0.1';
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
