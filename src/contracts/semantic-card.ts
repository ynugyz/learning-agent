/**
 * SemanticCard v0.1 (REV1) — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/semantic-card.v0.1.schema.json` and
 * `specs/semantic-card-v0.1.md`. Revised under human adjudication during
 * M1A REV1; see `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`.
 *
 * A SemanticCard is a machine-readable semantic INDEX: not a summary, not a copy
 * of the human note, never an independent source of truth.
 *
 * REV1 changes that matter to a reader of this file:
 *  - the card has NO truth-valued state; `maintenanceState` is a MAINTENANCE
 *    state (renamed from `cardState` in M1A-V so it cannot be misread as a
 *    knowledge-truth roll-up);
 *  - `claims[].note` is GONE — no field may carry note prose;
 *  - every present identifier/anchor/fingerprint value is non-empty;
 *  - a machine inference may never be `verified`.
 *
 * @packageDocumentation
 */

import type { Fingerprint, ReviewStatus, SchemaVersion } from './common';

/**
 * MAINTENANCE state of an index. Not a truth value (SC-5, SC-8).
 *
 * Whether the knowledge is true is a property of individual claims; whether the
 * card can be relied on as an index is a property of the card. The name is
 * deliberately `maintenanceState` rather than a word like `state` or
 * `cardState`, so it cannot be misread as a knowledge-truth roll-up.
 */
export type MaintenanceState = 'stable' | 'needs_review' | 'conflicted' | 'stale';

/**
 * Epistemic state of a CLAIM or RELATION.
 *
 * Prefix-scoped deliberately: it is never a card-level property. One word, one
 * meaning, no card-wide blessing.
 */
export type EpistemicState =
  | 'asserted'
  | 'inferred'
  | 'uncertain'
  | 'disputed'
  | 'verified'
  | 'deprecated'
  | 'unspecified';

/**
 * Who assigned an epistemic state (SC-14).
 *
 * `human-verified` is the NARROW verification primitive (SC-28): the only basis
 * that can justify `epistemicState: 'verified'`, and it still requires at least
 * one evidence reference (claims) or provenance entry (relations). A machine
 * may never emit it, and ordinary evidence is **not** verification.
 */
export type EpistemicBasis =
  | 'source-explicit'
  | 'machine-inferred'
  | 'human-assigned'
  | 'human-verified'
  | 'derived';

/**
 * A note anchor (SC-11).
 *
 * `block-id` is preferred because it survives section renaming; `heading-path`
 * is the fallback for notes without block ids. Line numbers are never admitted,
 * because they are not stable across edits.
 *
 * Not shared: only SemanticCard anchors into a human note, so this stays here
 * rather than in `common.ts`.
 */
export interface Anchor {
  readonly kind: 'block-id' | 'heading-path';
  readonly value: string;
}

/**
 * Reference to evidence. Must identify something: at least one of
 * `sourceUnitId` / `locator`, non-empty (SC-20).
 */
export interface EvidenceRef {
  /** Preferred: a stable Source Unit id from a SourceMap ledger. */
  readonly sourceUnitId?: string;
  readonly locator?: string;
  /** Human-readable explanation, capped. Never authoritative content. */
  readonly note?: string;
}

/** Bounded machine-readable core (SC-9). */
export interface SemanticCore {
  /**
   * Navigation and matching description, ≤ 280 chars.
   *
   * The cap exists so this field cannot silently become a note summary. The
   * exact budget is provisional (spec ambiguity A1).
   */
  readonly summary: string;
  /** What this card deliberately does NOT cover, ≤ 280 chars. */
  readonly scopeNote?: string;
}

/** Where the card's source of truth lives (SC-10). */
export interface HumanNoteRef {
  readonly path: string;
  readonly anchor?: Anchor;
}

/** Anchor-level index entry (SC-12). */
export interface SectionIndexEntry {
  readonly anchor: Anchor;
  readonly heading?: string;
  /** One-line pointer, ≤ 280 chars. Not a content copy. */
  readonly gist?: string;
  readonly covers?: readonly string[];
}

/**
 * Claim-level index entry (SC-4, SC-13).
 *
 * There is deliberately NO free-text field: a claim's content lives in the note
 * and the card points at it. `anchor` is required — a claim can never be
 * recorded without a location.
 *
 * Verification (SC-28): `epistemicState: 'verified'` requires
 * `basis: 'human-verified'` **and** at least one `evidenceRefs` entry. A machine
 * inference (`basis: 'machine-inferred'`) can never be `verified`, and evidence
 * on its own is not verification.
 */
export interface ClaimRef {
  readonly anchor: Anchor;
  readonly epistemicState: EpistemicState;
  readonly basis?: EpistemicBasis;
  readonly evidenceRefs?: readonly EvidenceRef[];
}

/** Closed relation vocabulary. Extend only with human review. */
export type RelationType =
  | 'prerequisite'
  | 'part-of'
  | 'expands'
  | 'refines'
  | 'corrects'
  | 'example-of'
  | 'counterexample-of'
  | 'conflicts-with'
  | 'contrasts-with'
  | 'applies-to'
  | 'derived-from'
  | 'related';

/** Typed reference to a relation target (SC-15). */
export interface RelationTarget {
  readonly knowledgeId?: string;
  readonly sourceUnitId?: string;
  readonly externalRef?: string;
}

/**
 * A typed knowledge relation (SC-6, SC-17, SC-28).
 *
 * An edge is an inference about a claim; it carries its own state and basis.
 * When `provenance` is absent, `reviewFlag` is required: a bare inferred edge is
 * a contract violation.
 *
 * `target` is **required**: an edge to nowhere is not an edge. Verification
 * follows the same rule as claims — `'verified'` requires
 * `basis: 'human-verified'` plus at least one `provenance` entry.
 */
export interface KnowledgeRelation {
  readonly type: RelationType;
  readonly target: RelationTarget;
  readonly provenance?: readonly EvidenceRef[];
  readonly epistemicState: EpistemicState;
  readonly basis?: EpistemicBasis;
  readonly reviewFlag?: 'NEEDS_REVIEW' | 'CONFLICT' | 'LOW_CONFIDENCE';
}

/** Pedagogical function of a learning asset (SC-18). */
export type LearningAssetKind =
  | 'definition'
  | 'example'
  | 'worked-example'
  | 'problem-solving-tip'
  | 'common-mistake'
  | 'boundary-condition'
  | 'counterexample'
  | 'mnemonic'
  | 'derivation'
  | 'exercise'
  | 'open-question';

/** Where a learning asset can be found. At least one reference is required (SC-20). */
export interface LearningAssetRef {
  readonly anchor?: Anchor;
  readonly sourceUnitId?: string;
  readonly path?: string;
}

/** Index entry for a learning asset (SC-18). */
export interface LearningAsset {
  readonly kind: LearningAssetKind;
  readonly ref: LearningAssetRef;
  /** Retrieval label only, ≤ 160 chars. Not the asset's content. */
  readonly summary?: string;
}

/**
 * CURRENT OPEN unresolved item (SC-24, SC-27).
 *
 * Closed history is deliberately NOT stored here: it belongs to change/run
 * history, so the card does not accumulate an ever-growing resolved-conflict log.
 * `unresolvedId` exists so a downstream artifact (a ChangePlan, a review note, a
 * later run) can reference, discuss or close this specific item without
 * quoting its text. It is opaque and must not be re-derived from the
 * description, which is editable.
 */
export interface UnresolvedItem {
  readonly unresolvedId: string;
  readonly kind: 'conflict' | 'ambiguity' | 'missing-evidence' | 'open-question';
  readonly description: string;
  readonly blocking?: boolean;
  readonly candidateResolutions?: readonly string[];
}

/**
 * Synchronisation bookkeeping (SC-19, SC-21).
 *
 * `checkedAt` is always present. `checkedAgainst` is required when the state is
 * `ok`, and `unavailableReason` is required when it is `unknown`: a state may
 * not be asserted without the data that justifies it.
 */
export interface SemanticCardIntegrity {
  readonly state: 'ok' | 'stale' | 'broken' | 'unknown' | 'NEEDS_REVIEW';
  readonly checkedAt: string;
  readonly checkedAgainst?: {
    readonly humanNoteFingerprint?: Fingerprint;
    readonly cardFingerprint?: Fingerprint;
  };
  readonly unavailableReason?: string;
}

/**
 * Machine-readable semantic index entry for ONE knowledge concept (SC-23).
 *
 * Not a note summary. Not a source of truth. Not the storage layout — where
 * cards live in a real Vault is undecided (DECISIONS.md D-0010, NEEDS_REVIEW).
 */
export interface SemanticCard {
  readonly contractVersion: 'semantic-card/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;

  /**
   * Stable OPAQUE identity (SC-3).
   *
   * Must not encode or derive from a note title, path, heading text or
   * location, and must not change when those change. The concrete format
   * (UUID / ULID / other) is deliberately not frozen at v0.1.
   */
  readonly knowledgeId: string;

  /** Human-readable label with NO identity function. May change freely. */
  readonly label?: string;

  /** Maintenance state. Never a truth value (SC-5). */
  readonly maintenanceState: MaintenanceState;

  readonly semanticCore: SemanticCore;
  readonly humanNoteRef: HumanNoteRef;
  readonly humanNoteFingerprint?: Fingerprint;
  readonly cardFingerprint?: Fingerprint;

  /** May be empty, which honestly states that no sections are identifiable. */
  readonly sectionIndex: readonly SectionIndexEntry[];
  readonly claims?: readonly ClaimRef[];
  readonly relations?: readonly KnowledgeRelation[];
  readonly learningAssets?: readonly LearningAsset[];
  readonly unresolved?: readonly UnresolvedItem[];
  readonly integrity: SemanticCardIntegrity;
}
