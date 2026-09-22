/**
 * AgentRuntime Boundary v0.1 — TypeScript draft
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 * Mirrors `schemas/agent-runtime.v0.1.schema.json` and
 * `specs/agent-runtime-v0.1.md`. Has NOT passed human review.
 * Interfaces ONLY: there is no DSH adapter in this milestone.
 *
 * Core modules (`src/core`, `src/pipeline`, `src/modules`) may depend on THIS
 * file and on nothing in `src/runtime/dsh`. No type here may reference a DSH
 * type, name or session format (RT-2, RT-9).
 *
 * @packageDocumentation
 */

import type { ReviewStatus } from './semantic-card';

/**
 * Declared capabilities, checked BEFORE relying on an optional capability.
 *
 * Declared rather than probed, so the pipeline never contains
 * `if (runtimeKind === 'dsh')` branches (RT-5).
 */
export interface RuntimeCapabilities {
  /** Always supported; declared for symmetry. */
  readonly structuredTask: true;
  readonly modelSelection: boolean;
  readonly reasoningControl: boolean;
  readonly usageReporting: boolean;
  /** Reserved and pinned `false` at v0.1 so nothing can depend on it (RT-14). */
  readonly streaming: false;
  /** Reserved and pinned `false` at v0.1 (RT-15). */
  readonly cancellation: false;
}

/**
 * Declared runtime identity. Obtainable without performing work (RT-10).
 *
 * `runtimeKind` is the only place a concrete runtime name legitimately appears.
 * TODO(RT-A2 / Q2): whether naming a runtime here conflicts with the
 * replacement goal (RT-19) needs a ruling.
 */
export interface RuntimeMetadata {
  readonly runtimeKind: string;
  /** The version actually resolved, not one read from documentation. */
  readonly runtimeVersion: string;
  readonly capabilities: RuntimeCapabilities;
  /** Free-form. Must not contain secrets or personal paths. */
  readonly implementationNote?: string;
}

/** A prompt asset identified by id AND version. */
export interface PromptRef {
  readonly id: string;
  /**
   * Always required: an unversioned prompt cannot be recorded in a run
   * manifest, so the run is not reproducible (RT-11).
   */
  readonly version: string;
  readonly path?: string;
}

/** One context item handed to the model. Context is passed in, never discovered (RT-12). */
export interface TaskInput {
  readonly role: 'system' | 'context' | 'instruction' | 'example';
  readonly content: string;
  /** Where the content came from, when it came from evidence. */
  readonly ref?: {
    readonly sourceId?: string;
    readonly sourceUnitId?: string;
    readonly locator?: string;
  };
}

/** The schema the CALLER will validate against. The runtime does not validate (RT-6). */
export interface OutputSchemaRef {
  readonly id: string;
  readonly path?: string;
}

/** Requested model. May not be what actually runs; see ModelIdentity. */
export interface ModelRequest {
  readonly requested?: string;
}

/** Requested reasoning configuration. */
export interface ReasoningRequest {
  readonly effort?: 'minimal' | 'low' | 'medium' | 'high' | 'unspecified';
  readonly notes?: string;
}

/** Caller-imposed bounds. A runtime may not be able to enforce these (ambiguity A7). */
export interface TaskLimits {
  readonly maxOutputTokens?: number;
}

/**
 * One model-calling unit of work.
 *
 * The core decides what runs, with which prompt version, against which schema;
 * the runtime executes. The runtime never chooses prompts, never validates
 * business meaning and never writes knowledge (RT-3).
 */
export interface TaskRequest {
  readonly taskId: string;
  readonly promptRef: PromptRef;
  /** Inline prompt text for tests and one-off probes. Does not replace `promptRef`. */
  readonly promptText?: string;
  readonly input: readonly TaskInput[];
  readonly outputSchemaRef: OutputSchemaRef;
  readonly model?: ModelRequest;
  readonly reasoning?: ReasoningRequest;
  readonly limits?: TaskLimits;
  /** Free-form caller tags. NEVER secrets (RT-8). */
  readonly metadata?: Readonly<Record<string, string>>;
}

/**
 * Raw model output, deliberately UNVALIDATED.
 *
 * A runtime that silently repairs or rejects malformed output becomes an
 * undebuggable black box and hides the most valuable failure signal (RT-6).
 */
export interface RuntimeOutput {
  readonly raw: string;
  readonly format: 'json' | 'text' | 'unknown';
  /** Set when the text could not be parsed. Not itself a runtime failure. */
  readonly parseError?: string;
}

/**
 * Requested versus resolved model.
 *
 * `resolution` makes silent substitution visible — the most common invisible
 * cause of an invalid experiment comparison (RT-13).
 */
export interface ModelIdentity {
  readonly requested?: string;
  readonly resolved?: string;
  readonly provider?: string;
  readonly resolution: 'matched' | 'substituted' | 'unknown';
}

/**
 * Token usage.
 *
 * `availability` exists so that absent usage is never mistaken for zero (RT-18).
 * Cost is reported but carries no policy.
 */
export interface Usage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly availability: 'reported' | 'partial' | 'unavailable';
  readonly cost?: { readonly amount: number; readonly currency: string };
}

/** What reasoning configuration was actually applied. */
export interface ReasoningApplied {
  readonly requested?: string;
  readonly applied?: string;
  readonly notes?: string;
}

/** Result of a successful invocation. */
export interface RuntimeResult {
  readonly taskId: string;
  readonly runtimeKind: string;
  /** Version actually used, for the run manifest. */
  readonly runtimeVersion: string;
  readonly output?: RuntimeOutput;
  readonly model?: ModelIdentity;
  readonly reasoning?: ReasoningApplied;
  readonly usage?: Usage;
  readonly durationMs?: number;
  /** Non-fatal observations. Must not contain secrets. */
  readonly warnings?: readonly string[];
}

/**
 * Classified failure kinds.
 *
 * `model-returned-empty` is classified separately from a transport failure so
 * the two can never be conflated (RT-7, ERROR_TAXONOMY `SYS-TOOL-FAILURE`).
 */
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
 * `retryable` states whether a retry is even a candidate. Retry POLICY is out
 * of scope for this contract (RT-16).
 */
export interface RunError {
  readonly kind: RunErrorKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly stage?: 'request' | 'transport' | 'model' | 'decode' | 'unknown';
  /** Neutral, non-secret context only. No DSH types (RT-9). */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Discriminated union so the failure branch cannot be ignored.
 *
 * TODO(RT-A3): the design rule "a successful result must carry at least one of
 * output/model/usage" is not expressible cleanly in JSON Schema and is
 * therefore currently unenforced.
 */
export type RuntimeInvocationResult =
  | { readonly ok: true; readonly result: RuntimeResult }
  | { readonly ok: false; readonly error: RunError };

/**
 * The boundary.
 *
 * A deterministic in-memory implementation must be trivially possible for
 * tests, requiring no network (RT-20). This interface moves text in and text
 * out: it must not reference orchestration concepts such as layers, plans or
 * cards (RT-21).
 */
export interface AgentRuntime {
  /** Declared identity and capabilities, without performing work. */
  readonly metadata: RuntimeMetadata;
  /**
   * Run one structured task.
   *
   * Implementations must NOT validate `output.raw` against
   * `request.outputSchemaRef`; the caller does that (RT-6).
   */
  invoke(request: TaskRequest): Promise<RuntimeInvocationResult>;
}

/** Contract envelope, mirroring the JSON Schema top level. */
export interface AgentRuntimeBoundaryDocument {
  readonly contractVersion: 'agent-runtime/0.1';
  readonly status: ReviewStatus;
  readonly runtimeMetadata?: RuntimeMetadata;
  readonly taskRequest?: TaskRequest;
  readonly invocationResult?: RuntimeInvocationResult;
}
