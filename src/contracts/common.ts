/**
 * Shared contract primitives — M1A-V
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * This file exists for exactly one reason: three primitives are reused by more
 * than one contract **with identical semantics**, and leaving them inside
 * `semantic-card.ts` made three sibling contracts import another contract's
 * module (recorded as `CH-15` in `docs/reviews/M1A_CONTRACT_CHALLENGE.md`).
 *
 * ## What may be added here
 *
 * A type belongs in `common.ts` only when **all** of these hold:
 *
 * 1. at least **two** contracts use it;
 * 2. they use it with the **same meaning**, not merely the same shape;
 * 3. it carries no contract-specific field, so it can never become a place
 *    where one contract's needs leak into another's.
 *
 * ## What is deliberately NOT here
 *
 * | Candidate | Why it stays where it is |
 * | --- | --- |
 * | `Anchor` | Used by SemanticCard only. Two contracts using a *similar-looking* object is not shared semantics. |
 * | `EvidenceRef` | SemanticCard only; the SourceMap has no evidence references. |
 * | `SourceUnitId` | A plain `string`. `agent-runtime.ts` mentions `sourceUnitId` with a **different meaning** (a context input hint, not a graph reference), so no shared type is warranted. |
 * | `Usage` | Used by AgentRuntime only. `RunManifest` has its own `ManifestUsage` on purpose (`CH-08`). |
 * | `ReviewStatus`-like card states | `MaintenanceState`, `EpistemicState`, `ContentType` etc. are contract-specific vocabularies. Merging them would be exactly the "universal common type" this file must never become. |
 *
 * Deliberately absent: any type parameterised over a contract, any "generic
 * envelope", any helper that would let one contract's representation leak into
 * another. If a future primitive looks "universally useful", that is a signal
 * to reconsider the design, not to add it here.
 *
 * @packageDocumentation
 */

/**
 * Review state of an artifact instance. Shared by all four contracts with the
 * same meaning: has a human reviewed this instance?
 *
 * `draft` means no human has reviewed it. This is about **review**, never about
 * truth — see `MaintenanceState` in `semantic-card.ts` for the maintenance axis.
 */
export type ReviewStatus = 'draft' | 'NEEDS_REVIEW' | 'reviewed';

/** Instance-format version. Shared by all four contracts. */
export type SchemaVersion = '0.1';

/** Hash algorithm. SHA-256 is the default and the only supported value. */
export type FingerprintAlg = 'sha256';

/**
 * Content fingerprint. Shared by SemanticCard (note-side and card-side hashes)
 * and RunManifest (source-bundle digests) with the same meaning.
 *
 * `alg` is optional and defaults to SHA-256 (`RM-15`). TODO: what exactly is
 * hashed (raw bytes vs canonical JSON) is still unspecified.
 */
export interface Fingerprint {
  readonly alg?: FingerprintAlg;
  readonly value: string;
}
