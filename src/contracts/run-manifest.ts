/**
 * RunManifest v0.1 (REV1) — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/run-manifest.v0.1.schema.json` and
 * `specs/run-manifest-v0.1.md`. Revised under human adjudication during
 * M1A REV1; see `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`.
 *
 * A reproducibility record: it answers "is comparing this run with another
 * valid?" without re-running anything. It contains no secrets, no host-specific
 * paths and no conclusions.
 *
 * REV1 changes that matter to a reader of this file:
 *  - `runtime` carries BOTH `requested` and `resolved` (RM-11);
 *  - core fields are tagged unions: absent means `unavailable` + `reason` (RM-12);
 *  - `ManifestUsage` is a local definition, NOT the runtime-boundary `Usage`;
 *  - `schemaVersion` is required;
 *  - fingerprinting defaults to SHA-256.
 *
 * @packageDocumentation
 */

import type { ReviewStatus, SchemaVersion, Fingerprint } from './semantic-card';

/** One input consumed by a run. `ref` must not be a production Vault or host path. */
export interface ManifestSourceRef {
  readonly kind: 'source-map' | 'semantic-card' | 'evidence' | 'prompt' | 'schema' | 'other';
  readonly ref: string;
  readonly digest?: Fingerprint;
}

/**
 * Which benchmark case a run belongs to (RM-17).
 *
 * Tagged union: distinguishes an exploratory run (`not-applicable`) from one
 * whose case reference was lost (`unavailable`), and both require a reason.
 */
export type ManifestCaseId =
  | { readonly availability: 'present'; readonly value: string }
  | { readonly availability: 'not-applicable'; readonly reason: string }
  | { readonly availability: 'unavailable'; readonly reason: string };

/**
 * Repository state (RM-4, RM-13).
 *
 * A commit hash alone misleads when the tree was modified, and a run outside a
 * repository says so instead of fabricating a clean tree.
 */
export type ManifestGitState =
  | {
      readonly availability: 'present';
      readonly commit: string;
      readonly dirty: boolean;
      readonly branch?: string;
      /** TODO(RM-A1): required in spirit when `dirty`, not schema-enforced. */
      readonly dirtyPaths?: readonly string[];
      /** Symbolic reference only. Never an absolute local path (RM-21). */
      readonly worktreeRef?: string;
    }
  | { readonly availability: 'unavailable'; readonly reason: string };

/**
 * Requested versus resolved runtime (RM-8, RM-11).
 *
 * `resolution` is only representable when BOTH sides are present, so it is
 * always computable from the manifest's own data — the previous revision could
 * assert `matched` while recording no requested runtime at all.
 */
export type ManifestRuntime =
  | {
      readonly availability: 'present';
      /** The `version` may be omitted when the requested version was itself unspecified. */
      readonly requested: { readonly kind: string; readonly version?: string };
      readonly resolved: { readonly kind: string; readonly version: string };
      readonly resolution?: 'matched' | 'substituted' | 'unknown';
    }
  | { readonly availability: 'unavailable'; readonly reason: string };

/** Requested versus resolved model (RM-9). */
export interface ManifestModel {
  readonly requested?: string;
  /** Tagged union: a value when available, a reason when not (RM-12). */
  readonly resolved:
    | { readonly availability: 'available'; readonly value: string }
    | { readonly availability: 'unavailable'; readonly reason: string };
  readonly provider?: string;
}

/** Reasoning configuration actually applied. */
export interface ManifestReasoning {
  readonly requested?: string;
  readonly applied?: string;
  readonly notes?: string;
}

/**
 * The version bundle that makes the run reproducible (RM-20).
 *
 * Always present, though the maps may be empty: an empty object asserts "none
 * were used", whereas omission is ambiguous.
 */
export interface ManifestVersions {
  readonly prompts: Readonly<Record<string, string>>;
  readonly schemas: Readonly<Record<string, string>>;
  readonly contracts?: Readonly<Record<string, string>>;
}

/** What inputs the run consumed. */
export interface ManifestSourceBundle {
  readonly packageId?: string;
  readonly refs?: readonly ManifestSourceRef[];
  readonly digest?: Fingerprint;
}

/** Environment reference. A pointer only, so no host-specific data enters (RM-21). */
export interface ManifestPlatform {
  readonly environmentRef?: string;
}

/**
 * Manifest-local token usage.
 *
 * Deliberately NOT the runtime-boundary `Usage`: the two contracts are
 * decoupled so either can evolve without breaking the other (CH-08).
 */
export interface ManifestUsage {
  readonly availability: 'reported' | 'partial' | 'unavailable';
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

/**
 * A field deliberately withheld (RM-14).
 *
 * Records THAT something was withheld, never the value. `reason: 'secret'` is
 * the only sanctioned way to reference a withheld credential.
 *
 * TODO(RM-A2): entirely voluntary, so absence remains untrustworthy.
 */
export interface ManifestOmission {
  readonly field: string;
  readonly reason: 'secret' | 'unavailable' | 'not-applicable' | 'policy';
}

/**
 * Reproducibility record for one experiment run (RM-22).
 *
 * Generated under `runs/` and NOT committed by default; retained together with
 * its results only when the run is promoted to a reference benchmark.
 *
 * `finishedAt` is optional so a crashed experiment can still emit a valid
 * manifest (RM-18).
 */
export interface RunManifest {
  readonly contractVersion: 'run-manifest/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly runId: string;
  readonly caseId: ManifestCaseId;
  /** ISO-8601 timestamp with offset. */
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly git: ManifestGitState;
  readonly runtime: ManifestRuntime;
  readonly model: ManifestModel;
  readonly reasoning?: ManifestReasoning;
  readonly versions: ManifestVersions;
  readonly sourceBundle?: ManifestSourceBundle;
  readonly platform?: ManifestPlatform;
  /** Absent usage is never read as zero; `availability` carries that distinction. */
  readonly usage?: ManifestUsage;
  readonly durationMs?: number;
  readonly omissions?: readonly ManifestOmission[];
  /** Free-form and non-secret. Must not contain conclusions, scores or interpretations. */
  readonly notes?: string;
}
