/**
 * AgentRuntime Boundary v0.1 (REV1) — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/agent-runtime.v0.1.schema.json` and
 * `specs/agent-runtime-v0.1.md`. Revised under human adjudication during
 * M1A REV1; see `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`.
 * Interfaces ONLY: there is no DSH adapter in this milestone.
 *
 * Core modules (`src/core`, `src/pipeline`, `src/modules`) may depend on THIS
 * file and on nothing in `src/runtime/dsh`. No type here may reference a DSH
 * type, name, version, session or host path, and none may carry a credential.
 *
 * REV1 changes that matter to a reader of this file:
 *  - one `TaskRequest` is one LOGICAL task, not one model API call;
 *  - `outputSchemaRef` is optional at the boundary;
 *  - `Usage` carries no cost;
 *  - `RuntimeMetadata.implementationNote` is GONE;
 *  - resolved-model availability is a tagged union carrying value or reason.
 *
 * @packageDocumentation
 */

import type { ReviewStatus, SchemaVersion } from './semantic-card';

/**
 * Declared capabilities, checked BEFORE relying on an optional capability.
 *
 * Declared rather than probed, so the pipeline never contains
 * `if (runtimeKind === 'dsh')` branches (RT-6).
 */
export interface RuntimeCapabilities {
  readonly structuredTask: true;
  readonly modelSelection: boolean;
  readonly reasoningControl: boolean;
  readonly usageReporting: boolean;
  /** Whether the adapter performs transport-safe retry on the caller's behalf (RT-4). */
  readonly transportRetry: boolean;
  /** Reserved and pinned `false` at v0.1 (RT-14). */
  readonly streaming: false;
  /** Reserved and pinned `false` at v0.1 (RT-15). */
  readonly cancellation: false;
}

/**
 * Declared runtime identity (RT-5).
 *
 * Deliberately has **no** free-text note field: an implementation note invited
 * host install paths into a portable contract, so it was removed at REV1
 * (RT-11). Where a runtime is installed is recorded in `docs/ENVIRONMENT.md`.
 */
export interface RuntimeMetadata {
  readonly runtimeKind: string;
  /** The version actually resolved, not one read from documentation. */
  readonly runtimeVersion: string;
  readonly capabilities: RuntimeCapabilities;
}

/** A prompt asset identified by id AND version (RT-12). */
export interface PromptRef {
  readonly id: string;
  readonly version: string;
  readonly path?: string;
}

/** One context item handed to the model. Context is passed in, never discovered (RT-10). */
export interface TaskInput {
  readonly role: 'system' | 'context' | 'instruction' | 'example';
  readonly content: string;
  readonly ref?: {
    readonly sourceId?: string;
    readonly sourceUnitId?: string;
    readonly locator?: string;
  };
}

/**
 * The schema the CALLER will validate against (RT-7).
 *
 * Optional at the boundary (RT-20): not every task is schema-shaped. A
 * structured module may require it in its own signature.
 */
export interface OutputSchemaRef {
  readonly id: string;
  readonly path?: string;
}

/** Requested model. May not be what actually runs; see `ModelIdentity`. */
export interface ModelRequest {
  readonly requested?: string;
}

/** Requested reasoning configuration (RT-17). */
export interface ReasoningRequest {
  readonly effort?: 'minimal' | 'low' | 'medium' | 'high' | 'unspecified';
  readonly notes?: string;
}

/** Caller-imposed bounds. Advisory: a runtime may not be able to enforce them (RT-24). */
export interface TaskLimits {
  readonly maxOutputTokens?: number;
}

/**
 * One LOGICAL runtime task (RT-3, RT-23).
 *
 * The runtime may satisfy it with any number of model calls, or with none. The
 * core decides what runs, with which prompt version, against which schema; the
 * runtime executes. Credentials may not appear anywhere in this object (RT-22).
 */
export interface TaskRequest {
  readonly taskId: string;
  readonly promptRef: PromptRef;
  /** Inline prompt text for tests and probes. Does not replace `promptRef`. */
  readonly promptText?: string;
  readonly input: readonly TaskInput[];
  /** Optional at the boundary (RT-20). */
  readonly outputSchemaRef?: OutputSchemaRef;
  readonly model?: ModelRequest;
  readonly reasoning?: ReasoningRequest;
  readonly limits?: TaskLimits;
  /** Free-form caller tags. NEVER secrets (RT-9, RT-22). */
  readonly metadata?: Readonly<Record<string, string>>;
}

/**
 * Raw model output, deliberately UNVALIDATED (RT-7).
 *
 * A runtime that silently repairs or rejects malformed output becomes an
 * undebuggable black box and hides the most valuable failure signal.
 */
export interface RuntimeOutput {
  readonly raw: string;
  readonly format: 'json' | 'text' | 'unknown';
  /** Set when the text could not be parsed. Not itself a runtime failure. */
  readonly parseError?: string;
}

/**
 * Resolved-model availability as a tagged union (RT-18).
 *
 * A status may not be asserted without the data that proves it: `available`
 * requires the value, `unavailable` requires the reason.
 */
export type ResolvedModel =
  | { readonly availability: 'available'; readonly value: string }
  | { readonly availability: 'unavailable'; readonly reason: string };

/**
 * Requested versus resolved model (RT-13).
 *
 * `resolution` makes silent substitution visible — the most common invisible
 * cause of an invalid experiment comparison. A definitive resolution requires a
 * resolved value to have been available.
 */
export interface ModelIdentity {
  readonly requested?: string;
  readonly resolved?: ResolvedModel;
  readonly provider?: string;
  readonly resolution: 'matched' | 'substituted' | 'unknown';
}

/**
 * Core runtime usage for one logical task (RT-18, RT-19).
 *
 * Aggregated over however many transport calls the runtime needed (RT-3), and
 * carrying **no** provider cost: pricing is not a runtime concern.
 * `availability` exists so that absence is never mistaken for zero.
 */
export interface Usage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly availability: 'reported' | 'partial' | 'unavailable';
}

/** What reasoning configuration was actually applied (RT-17). */
export interface ReasoningApplied {
  readonly requested?: string;
  readonly applied?: string;
  readonly notes?: string;
}

/** Result of a successful invocation. */
export interface RuntimeResult {
  readonly taskId: string;
  readonly output?: RuntimeOutput;
  readonly model?: ModelIdentity;
  readonly reasoning?: ReasoningApplied;
  readonly usage?: Usage;
  readonly durationMs?: number;
  /** Non-fatal observations. Must not contain secrets. */
  readonly warnings?: readonly string[];
}

/** Classified failure kinds (RT-8). */
export type RunErrorKind =
  | 'runtime-unavailable'
  | 'transport-failed'
  | 'model-refused'
  | 'model-returned-empty'
  | 'output-unparseable'
  | 'option-unsupported'
  | 'configuration-invalid'
  | 'unknown';

/**
 * A classified failure.
 *
 * `retryable` states whether a retry is even a candidate. Transport retry is
 * the adapter's job and semantic retry is the orchestrator's (RT-4); the actual
 * policy is out of scope here (RT-16).
 */
export interface RunError {
  readonly kind: RunErrorKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly stage?: 'request' | 'transport' | 'model' | 'decode' | 'unknown';
  /** Neutral, non-secret context only. No DSH types (RT-10). */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Discriminated union so the failure branch cannot be ignored (RT-8). */
export type RuntimeInvocationResult =
  | { readonly ok: true; readonly result: RuntimeResult }
  | { readonly ok: false; readonly error: RunError };

/**
 * The boundary.
 *
 * A deterministic in-memory implementation must be trivially possible for tests
 * (RT-20). This interface moves text in and text out: it must not reference
 * orchestration concepts such as layers, plans or cards (RT-21).
 */
export interface AgentRuntime {
  /** Declared identity and capabilities, without performing work. */
  readonly metadata: RuntimeMetadata;
  /**
   * Run one logical task.
   *
   * Implementations must NOT validate `output.raw` against
   * `request.outputSchemaRef`; the caller does that (RT-7). Transport-safe
   * retry is permitted; semantic retry is not (RT-4).
   */
  invoke(request: TaskRequest): Promise<RuntimeInvocationResult>;
}

/** Contract envelope, mirroring the JSON Schema top level. */
export interface AgentRuntimeBoundaryDocument {
  readonly contractVersion: 'agent-runtime/0.1';
  readonly schemaVersion: SchemaVersion;
  readonly status: ReviewStatus;
  readonly runtimeMetadata?: RuntimeMetadata;
  readonly taskRequest?: TaskRequest;
  readonly invocationResult?: RuntimeInvocationResult;
}
