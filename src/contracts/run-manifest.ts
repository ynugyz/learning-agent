/**
 * RunManifest v0.1 — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/run-manifest.v0.1.schema.json` and
 * `specs/run-manifest-v0.1.md`. Has NOT passed human review.
 *
 * A reproducibility record, not a log and not a result: it answers "is
 * comparing this run with another valid?" without re-running anything. It
 * contains no secrets and no conclusions.
 *
 * @packageDocumentation
 */

import type { ReviewStatus } from './semantic-card';
import type { Usage } from './agent-runtime';

/** One input consumed by a run. `ref` must not be a production Vault path. */
export interface ManifestSourceRef {
  readonly kind: 'source-map' | 'semantic-card' | 'evidence' | 'prompt' | 'schema' | 'other';
  readonly ref: string;
  /** TODO(RM-A1): the digest algorithm is unspecified, so digests are not comparable. */
  readonly digest?: string;
}

/**
 * Repository state.
 *
 * A commit hash alone misleads whenever the tree was modified, so dirty state
 * is first-class rather than inferred (RM-3).
 */
export interface ManifestGitState {
  /** Full commit SHA, or the literal `'unknown'` when run outside a repository. */
  readonly commit: string;
  readonly branch?: string;
  readonly dirty: boolean;
  /** TODO(RM-A2): required-in-spirit when `dirty` is true, but not schema-enforced. */
  readonly dirtyPaths?: readonly string[];
  readonly repoRef?: string;
}

/** Runtime identity, requested versus resolved. */
export interface ManifestRuntime {
  readonly kind: string;
  /** Version actually resolved at run time (DECISIONS.md D-0003). */
  readonly version: string;
  readonly resolution: 'matched' | 'substituted' | 'unknown';
}

/**
 * Model identity.
 *
 * TODO(RM-A4): `resolved` nests an availability enum while `requested` is a
 * bare string. The asymmetry is deliberate (absence must be visible) but reads
 * inconsistently.
 */
export interface ManifestModel {
  readonly requested?: string;
  readonly resolved?: {
    readonly value?: string;
    readonly availability: 'reported' | 'unavailable' | 'unknown';
  };
  readonly provider?: string;
}

/** Reasoning configuration actually applied. */
export interface ManifestReasoning {
  readonly requested?: string;
  readonly applied?: string;
  readonly notes?: string;
}

/**
 * The version bundle that makes the run reproducible.
 *
 * Always present, though the maps may be empty: an empty object asserts "none
 * were used", whereas omission is ambiguous (RM-7).
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
  readonly digest?: string;
}

/**
 * Environment reference.
 *
 * TODO(RM-A6): `environmentRef` is a pointer, not data. If the referenced
 * document changes, old manifests silently point at a different environment.
 */
export interface ManifestPlatform {
  readonly os?: string;
  readonly node?: string;
  readonly shell?: string;
  readonly environmentRef?: string;
}

/**
 * A field deliberately withheld.
 *
 * Exists because omitting a secret-bearing field is otherwise
 * indistinguishable from having nothing to omit. It records THAT something was
 * withheld, never the value (RM-5).
 *
 * TODO(RM-A3): entirely voluntary, so absence remains untrustworthy.
 */
export interface ManifestOmission {
  readonly field: string;
  readonly reason: 'secret' | 'unavailable' | 'not-applicable' | 'policy';
}

/**
 * Which benchmark case a run belongs to.
 *
 * Distinguishes an exploratory run (`not-applicable`) from one whose case
 * reference was lost (`unknown`) (RM-12).
 */
export interface ManifestCaseId {
  readonly value?: string;
  readonly availability: 'present' | 'not-applicable' | 'unknown';
}

/**
 * Reproducibility record for one experiment run.
 *
 * `finishedAt` is optional so a crashed or still-running experiment can still
 * emit a valid manifest (RM-18).
 *
 * TODO(RM-A5 / Q1): whether manifests are committed, and where, is undecided.
 */
export interface RunManifest {
  readonly contractVersion: 'run-manifest/0.1';
  readonly status: ReviewStatus;
  readonly runId: string;
  readonly caseId?: ManifestCaseId;
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
  /** Absent usage must not be read as zero; `availability` carries that distinction. */
  readonly usage?: Usage;
  readonly durationMs?: number;
  readonly omissions?: readonly ManifestOmission[];
  /** Free-form and non-secret. Must not contain conclusions, scores or interpretations. */
  readonly notes?: string;
}
