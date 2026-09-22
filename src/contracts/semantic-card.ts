/**
 * SemanticCard v0.1 — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/semantic-card.v0.1.schema.json` and
 * `specs/semantic-card-v0.1.md`. Rederived during M1A from design principles,
 * not extended from the archived M0 draft. Has NOT passed human review.
 *
 * Milestone M0 itself is still awaiting final human approval.
 *
 * A SemanticCard is a machine-readable semantic INDEX, not a summary and not a
 * copy of the human note. It must never become an independent source of truth:
 * every machine assertion is traceable to a note anchor or to evidence.
 *
 * @packageDocumentation
 */

/** Review state of an artifact instance. `draft` means no human has reviewed it. */
export type ReviewStatus = 'draft' | 'NEEDS_REVIEW' | 'reviewed';

/**
 * Epistemic state of an assertion.
 *
 * One shared vocabulary for card, claim and relation, so the same word never
 * means two things. A machine inference must never silently become `verified`.
 */
export type EpistemicState =
  | 'asserted'
  | 'inferred'
  | 'uncertain'
  | 'disputed'
  | 'verified'
  | 'deprecated'
  | 'unspecified';

/** Who decided an epistemic state, so machine inference is distinguishable from human judgement. */
export type EpistemicBasis =
  | 'source-asserted'
  | 'machine-inferred'
  | 'human-assigned'
  | 'derived';

/** Hash algorithm, deliberately narrowed to one value at v0.1. */
export type FingerprintAlg = 'sha256';

/**
 * Content fingerprint.
 *
 * TODO(SC-A6): what exactly is hashed (raw bytes vs canonical JSON) is
 * unspecified. Do not rely on cross-implementation comparability yet.
 */
export interface Fingerprint {
  readonly alg: FingerprintAlg;
  readonly value: string;
}

/**
 * Reference to evidence supporting an assertion.
 *
 * Must identify something: at least one of `sourceUnitId` or `locator`.
 * Prefer `sourceUnitId` (a SourceMap ledger id) over a free-form locator.
 */
export interface EvidenceRef {
  readonly sourceUnitId?: string;
  readonly locator?: string;
  /** Short human explanation. Never authoritative. */
  readonly note?: string;
}

/** Bounded machine-readable core. Exists for matching and routing, not for reading. */
export interface SemanticCore {
  /**
   * Compact description used to match and route.
   *
   * Design rule SC-7 targets a small budget (proposed <= 280 chars). No limit is
   * encoded here because the right number must come from experiment, not a guess
   * frozen into a validator. See spec open question Q5.
   */
  readonly summary: string;
  /** What this card deliberately does NOT cover, to prevent false matches. */
  readonly scopeNote?: string;
}

/** Where the card's source of truth lives. Never a production Vault path in experiments. */
export interface HumanNoteRef {
  readonly path: string;
  /** Primary stable anchor inside the note. */
  readonly anchor?: string;
  /** Observed note title. A cache, not authority. */
  readonly title?: string;
}

/** Anchor-level index entry of the human note. */
export interface SectionIndexEntry {
  readonly anchor: string;
  readonly heading?: string;
  /** One-line pointer to the section. Not a content copy. */
  readonly gist?: string;
  readonly covers?: readonly string[];
}

/**
 * Claim-level index entry.
 *
 * Deliberately references the claim by anchor instead of restating its text:
 * restating it would create a second copy that can drift (SC-1, SC-2).
 */
export interface ClaimRef {
  /** Preferred: anchor to the claim inside the note. */
  readonly anchor?: string;
  /** Short label only. Not authoritative prose. */
  readonly note?: string;
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

/**
 * Typed reference to a relation target.
 *
 * `sourceUnitId` allows an edge to material that is not yet knowledge, so the
 * map does not force premature knowledge creation.
 */
export interface RelationTarget {
  readonly knowledgeId?: string;
  readonly sourceUnitId?: string;
  readonly externalRef?: string;
}

/**
 * A typed knowledge relation.
 *
 * An edge is an inference and gets its own provenance and epistemic state.
 * Invariant SC-14: a relation without `provenance` must carry `reviewFlag`.
 */
export interface KnowledgeRelation {
  readonly type: RelationType;
  readonly target?: RelationTarget;
  readonly provenance?: readonly EvidenceRef[];
  readonly epistemicState: EpistemicState;
  readonly reviewFlag?: 'NEEDS_REVIEW' | 'CONFLICT' | 'LOW_CONFIDENCE';
}

/**
 * Pedagogical function of a learning asset.
 *
 * `problem-solving-tip` and `common-mistake` are deliberately separate: they are
 * exactly the material that summarisation loses.
 */
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

/** Where a learning asset can be found. */
export interface LearningAssetRef {
  readonly anchor?: string;
  readonly sourceUnitId?: string;
  readonly path?: string;
}

/** Index entry for a learning asset, by pedagogical function. */
export interface LearningAsset {
  readonly kind: LearningAssetKind;
  readonly ref: LearningAssetRef;
  /** Short label. Not the asset's content. */
  readonly summary?: string;
}

/** Open conflict, ambiguity or gap. Exists so a conflict is not silently resolved. */
export interface UnresolvedItem {
  readonly kind: 'conflict' | 'ambiguity' | 'missing-evidence' | 'open-question';
  readonly description: string;
  /** Whether this blocks further knowledge changes until resolved. */
  readonly blocking?: boolean;
  /** Options not yet chosen. */
  readonly candidateResolutions?: readonly string[];
}

/**
 * Synchronisation bookkeeping.
 *
 * Drift needs a fingerprint on BOTH sides: `humanNoteFingerprint` detects note
 * edits, `cardFingerprint` detects machine-layer edits. One hash cannot tell
 * "note changed" from "card changed" (SC-6).
 */
export interface SemanticCardIntegrity {
  readonly state: 'ok' | 'stale' | 'broken' | 'unknown' | 'NEEDS_REVIEW';
  readonly checkedAt?: string;
  readonly checkedAgainst?: {
    readonly humanNoteFingerprint?: string;
    readonly cardFingerprint?: string;
  };
}

/**
 * Machine-readable semantic index entry for ONE knowledge concept.
 *
 * Not a note summary. Not a source of truth. Not the storage layout — where
 * cards live in a real Vault is undecided (DECISIONS.md D-0010, NEEDS_REVIEW).
 */
export interface SemanticCard {
  readonly contractVersion: 'semantic-card/0.1';
  readonly status: ReviewStatus;

  /**
   * Stable join key between the human note and this card.
   *
   * Stability is a durability commitment, not a label: it must survive note
   * rewrites, section reordering, renaming and re-summarising. Reusing an id
   * for a different concept, or minting a new one for the same concept, breaks
   * every external reference (SC-3).
   */
  readonly knowledgeId: string;

  /** Optional at v0.1. Present so synchronisation can become symmetric without a breaking change. */
  readonly cardFingerprint?: Fingerprint;

  readonly semanticCore: SemanticCore;
  readonly humanNoteRef: HumanNoteRef;
  readonly humanNoteFingerprint?: Fingerprint;

  /** May be empty, which honestly states that no sections are identifiable. */
  readonly sectionIndex: readonly SectionIndexEntry[];

  readonly claims?: readonly ClaimRef[];
  readonly relations?: readonly KnowledgeRelation[];

  /** Coarse roll-up only. Per-claim state is authoritative and must not be overridden by this. */
  readonly epistemicState: EpistemicState;

  readonly learningAssets?: readonly LearningAsset[];
  readonly unresolved?: readonly UnresolvedItem[];
  readonly integrity: SemanticCardIntegrity;
}
