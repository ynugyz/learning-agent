# AgentRuntime Boundary v0.1 — design specification (REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Revised under human adjudication during M1A REV1. Interface and capability
> boundary only. **No implementation, no DSH adapter.**
> This contract has **not passed human review** as a finished design. Milestone
> M0 itself is still awaiting final human approval.

- Requirement IDs: `RT-1` … `RT-24` (see the requirement index in §11)
- Related: `docs/ARCHITECTURE.md` §4, `AGENTS.md` §3.3, `specs/run-manifest-v0.1.md`
- Machine contract: `schemas/agent-runtime.v0.1.schema.json`
- Type draft: `src/contracts/agent-runtime.ts`
- Adjudication record: `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`

---

## 1. Design rationale

### RT-1 — This is a boundary, not a framework

The deliverable is the **minimum vocabulary** that lets `src/pipeline` ask for
work without knowing who performs it. Every capability admitted here is a
lifetime commitment for every future runtime, so the bar for admission is high.
`AGENTS.md` §18 forbids building for hypothetical futures.

### RT-2 — DSH is replaceable, and must be seen to be replaceable

`AGENTS.md` §3.3: core modules must not depend on DSH internal
representations. The mechanical rule: **`src/core`, `src/pipeline`, `src/modules`
may import from `src/contracts` only** — never from `src/runtime/dsh`, and never
a DSH type.

### RT-3 — One `TaskRequest` is one logical runtime task

**Adjudicated (REV1).** A `TaskRequest` is a unit of *intent*, not a transport
operation. A runtime may satisfy one logical task with one or several model
calls, or with no model call at all. Consequences:

- the contract must not imply a 1:1 mapping to an API call (`RT-23`);
- usage is reported **per logical task**, aggregated by the runtime (`RT-18`);
- an implementation that splits a task across calls owns that decision and
  reports one result.

This replaces the previous framing where one request was implicitly one
invocation, which would have forced the orchestrator to reason about transport.

### RT-4 — Transport-safe retry is the adapter's; semantic retry is the orchestrator's

**Adjudicated (REV1).** The boundary must state the split explicitly, because
otherwise both sides retry and the pipeline silently multiplies cost and calls:

| Kind of retry | Owner | Examples |
| --- | --- | --- |
| **Transport-safe** | runtime adapter | connection reset, 5xx, rate-limit backoff, idempotent re-send of the same request |
| **Semantic** | orchestrator (pipeline) | the output was unusable; the prompt or context must change; a different model or effort is wanted |

The adapter must **not** silently change prompt, model, effort, or context in
order to "make it work" — that is a semantic decision and belongs to the
orchestrator (`RT-16`).

### RT-5 — A runtime that cannot declare its identity is unusable

Every experiment must record the runtime version actually used
(`AGENTS.md` §9). The runtime therefore **declares** identity and capabilities
(`RT-9`, `RT-10`) rather than being probed.

### RT-6 — Capability negotiation, not feature probing

Consumers must be able to ask "can you do X?" before attempting X. Capabilities
are a declared inspection surface, so the pipeline never contains
`if (runtimeKind === 'dsh')` branches (`RT-5`).

### RT-7 — Raw output is preserved; schema validation is not the runtime's job

A runtime that silently repairs or rejects malformed model output becomes an
undebuggable black box and hides the most valuable failure signal. The runtime
returns output **as received**; the core validates it. Keeping validation in the
core keeps it in the language of the contract and independent of the runtime.

### RT-8 — Failure must be classified upward, not collapsed

`SYS-TOOL-FAILURE` and "the model returned nothing usable" are different events
requiring different responses (`docs/ERROR_TAXONOMY.md`). An empty result and a
transport failure must never be indistinguishable to the caller.

### RT-9 — Metadata is returned; credentials never are

Model identity, token usage and duration are needed for the reproducibility
record. Credentials are **never** part of any request, returned value, log line
or artifact (`AGENTS.md` §3.2, `RT-22`).

### RT-10 — Isolation is a closed loop

DSH-specific data may exist inside `src/runtime/dsh`, may be persisted there,
and must be reduced to the neutral shapes here before crossing back. If the
pipeline needs a DSH concept, the fix is to add a **neutral** concept to this
contract — not to leak the DSH one.

### RT-11 — No optional string may carry host-specific information

**Adjudicated (REV1).** The previous `implementationNote` invited free text and
its own example was an install path — the exact host-specific detail a portable
contract must not carry (`RT-21`). It is **removed**. Runtime identity is
`runtimeKind` + `runtimeVersion` only; where a runtime is installed is an
environment fact belonging in `docs/ENVIRONMENT.md`, not in a core contract.

---

## 2. Scope

**In scope:** the capability vocabulary; request/response shapes; error, usage
and model-metadata propagation; the retry-ownership split; the DSH isolation
rule; the replacement boundary.

**Out of scope (deliberately):**

- the DSH adapter implementation — a later milestone;
- prompt text and authoring (`prompts/`);
- pipeline orchestration order;
- schema validation logic (belongs to core, `RT-7`);
- how a logical task is decomposed into transport calls (`RT-3`);
- streaming / token-by-token delivery (`RT-14` is reserved false);
- cancellation and long-running job management (`RT-15` is reserved false);
- tool use, function calling, multi-agent orchestration;
- **cost accounting** — cost is not part of core runtime usage (`RT-19`);
- credential storage, acquisition or transmission (`RT-22`);
- semantic retry policy (`RT-4`), and transport retry parameters such as
  backoff curves (`RT-16`).

---

## 3. The boundary

```
src/pipeline  ──uses──▶  AgentRuntime (contract in src/contracts/agent-runtime.ts)
                              ▲
                              │ implements
                         src/runtime/dsh   ──▶ DSH (external, user-installed)

src/core, src/modules ──uses──▶ src/contracts only
```

Dependency rules (`RT-2`, `RT-10`):

| From | May import |
| --- | --- |
| `src/core` | `src/contracts` |
| `src/modules` | `src/contracts` |
| `src/pipeline` | `src/contracts` |
| `src/runtime/dsh` | `src/contracts`, DSH itself |
| anything | ❌ `src/runtime/dsh` (except an explicit composition root) |

The one place allowed to name a concrete runtime is a **composition root** that
wires the adapter in. That file does not exist yet.

---

## 4. Capability table

| # | Capability | Mandatory? | Request | Unified result |
| --- | --- | --- | --- | --- |
| C1 | `structured-task` | **Yes** | `TaskRequest` | `RuntimeResult` with raw, unvalidated output (`RT-7`) |
| C2 | `identity` | **Yes** | — (property) | `RuntimeMetadata` (`RT-5`, `RT-10`) |
| C3 | `usage-reporting` | **Yes** | — (attached to C1 results) | `Usage`; may be `unavailable` (`RT-18`) |
| C4 | `model-control` | Optional, declared | `TaskRequest.model` | `ModelIdentity` (`RT-13`) |
| C5 | `reasoning-control` | Optional, declared | `TaskRequest.reasoning` | echoed `reasoning` (`RT-17`) |
| C6 | `schema-conformance` | **Never claimed** | — | Not a runtime capability (`RT-7`) |
| C7 | `streaming` | Optional, **deferred** | — | Not in v0.1 (`RT-14`) |
| C8 | `cancellation` | Optional, **deferred** | — | Not in v0.1 (`RT-15`) |
| C9 | `transport-safe-retry` | **Yes**, adapter-owned | — | Classified errors make it possible (`RT-4`, `RT-16`) |

---

## 5. Field table

### 5.1 `RuntimeMetadata` (C2)

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `runtimeKind` | M | string (non-empty) | Neutral runtime family label, e.g. `"dsh"`. The only place a concrete runtime name appears. |
| `runtimeVersion` | M | string (non-empty) | The version actually resolved (`AGENTS.md` §9). |
| `capabilities` | M | `RuntimeCapabilities` | Declared, not probed (`RT-6`). |

> **No `implementationNote`.** Removed at REV1 (`RT-11`). Install locations are
> environment facts, recorded in `docs/ENVIRONMENT.md`.

### 5.2 `RuntimeCapabilities`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `structuredTask` | M | `true` (const) | Everyone supports C1. |
| `modelSelection` | M | boolean | Whether `TaskRequest.model` is honoured. |
| `reasoningControl` | M | boolean | Whether `TaskRequest.reasoning` is honoured. |
| `usageReporting` | M | boolean | Whether `Usage` carries more than `unavailable`. |
| `transportRetry` | M | boolean | Whether the adapter performs transport-safe retry (`RT-4`). |
| `streaming` | M | `false` (const) | Reserved; pinned so nothing can rely on it (`RT-14`). |
| `cancellation` | M | `false` (const) | Reserved (`RT-15`). |

### 5.3 `TaskRequest`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `taskId` | M | string (non-empty) | Correlates with a run manifest entry. |
| `promptRef` | M | object | Which prompt asset, by **version** (`RT-12`). |
| `promptRef.id` | M (cond.) | string (non-empty) | Prompt identifier. |
| `promptRef.version` | M (cond.) | string (non-empty) | Required — an unversioned prompt breaks reproducibility. |
| `promptRef.path` | O | string (non-empty) | Repo-relative prompt asset path. |
| `promptText` | O | string | Inline prompt text for tests and probes. Does not replace `promptRef`. |
| `input` | M | array | Context handed to the runtime (`RT-10`). |
| `input[].role` | M (cond.) | enum | `system` / `context` / `instruction` / `example`. |
| `input[].content` | M (cond.) | string | The content. |
| `input[].ref` | O | object | Where the content came from, if from evidence. |
| `outputSchemaRef` | **O** | object | **Optional at the boundary** (`RT-20`). |
| `outputSchemaRef.id` | M (cond.) | string (non-empty) | Schema identifier when present. |
| `outputSchemaRef.path` | O | string (non-empty) | Repo-relative schema path. |
| `model` | O | object | Requested model (`RT-13`). |
| `reasoning` | O | object | Requested reasoning configuration (`RT-17`). |
| `limits` | O | object | Caller-imposed bounds; advisory (`RT-24`). |
| `metadata` | O | object | Free-form caller tags. **Never** secrets (`RT-9`). |

> **`RT-20` — `outputSchemaRef` is optional at the boundary.** The boundary must
> not force every caller to name a schema; some tasks are exploratory or
> textual. A **structured module** may and should require it in its own
> signature. Where present, its `id` must be non-empty.
>
> **`RT-22` — credentials may not appear.** No credential, token, API key,
> header or password may appear in `TaskRequest`, `metadata`, `input`, or any
> other part of this contract. Credential acquisition is the adapter's private
> concern and is not representable here.

### 5.4 `RuntimeResult`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `taskId` | M | string (non-empty) | Echoes the request. |
| `output` | O | object | Raw output, **unvalidated** (`RT-7`). |
| `output.raw` | M (cond.) | string | Text as received. |
| `output.format` | M (cond.) | enum | `json` / `text` / `unknown`. |
| `output.parseError` | O | string | Set when the text could not be parsed at all. |
| `model` | O | `ModelIdentity` | See 5.5. |
| `reasoning` | O | object | Reasoning configuration actually applied (`RT-17`). |
| `usage` | O | `Usage` | See 5.6. |
| `durationMs` | O | number | Wall-clock duration. |
| `warnings` | O | array of string | Non-fatal observations. Must not contain secrets. |

> Runtime kind/version are **not** repeated here: identity travels in
> `RuntimeMetadata` and is recorded once in the run manifest (`RT-13`).

### 5.5 `ModelIdentity`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `requested` | O | string (non-empty) | What the caller asked for. |
| `resolved` | O | object | What actually ran (`RT-13`). |
| `resolved.availability` | M (cond.) | enum | `available` / `unavailable` (`RT-18`). |
| `resolved.value` | M (cond.) | string (non-empty) | **Required when `available`.** |
| `resolved.reason` | M (cond.) | string (non-empty) | **Required when `unavailable`.** |
| `provider` | O | string (non-empty) | Provider label. |
| `resolution` | M | enum | `matched` / `substituted` / `unknown` — makes silent substitution visible. |

> `RT-13`: `resolution: matched` or `substituted` requires
> `resolved.availability: available` with a non-empty value. A status may not be
> asserted without the data that proves it.

### 5.6 `Usage` (core runtime usage)

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `inputTokens` | O | number | Aggregated over the logical task (`RT-3`). |
| `outputTokens` | O | number | |
| `totalTokens` | O | number | |
| `availability` | M | enum | `reported` / `partial` / `unavailable` (`RT-18`). |

> **`RT-19` — cost is not part of core runtime usage.** Removed at REV1. Cost
> depends on provider pricing that changes independently of the runtime, and
> including it invited pricing policy into the boundary. If cost is ever needed,
> it is derived from token counts by a separate, explicitly-versioned concern.

### 5.7 `RunError`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `kind` | M | enum | See 5.8. |
| `message` | M | string (non-empty) | Human-readable. Must not contain secrets. |
| `retryable` | M | boolean | Whether a retry is a candidate. Policy lives elsewhere (`RT-16`). |
| `stage` | O | enum | `request` / `transport` / `model` / `decode` / `unknown`. |
| `details` | O | object | Neutral, non-secret context. **No DSH types** (`RT-10`). |

### 5.8 Error kinds (`RT-8`)

| Kind | Meaning |
| --- | --- |
| `runtime-unavailable` | The runtime cannot be reached or started. |
| `transport-failed` | The call failed in transit. |
| `model-refused` | The model declined or returned no usable completion. |
| `model-returned-empty` | Syntactically fine but semantically empty. Classified separately so it is never conflated with a failure. |
| `output-unparseable` | Output existed but could not be decoded. |
| `option-unsupported` | A requested optional capability was not honoured. |
| `configuration-invalid` | The request itself is malformed. |
| `unknown` | Escape hatch; its use should be visible in review. |

### 5.9 `RuntimeInvocationResult`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `ok` | M | boolean | Discriminant. |
| `result` | M (cond.) | `RuntimeResult` | Present when `ok` is true. |
| `error` | M (cond.) | `RunError` | Present when `ok` is false. |

A union rather than "result plus nullable error", so callers cannot ignore the
failure branch (`RT-8`).

---

## 6. Required vs optional — with conditions

- **Mandatory for every runtime:** C1, C2, C3, C9.
- **`TaskRequest.promptRef`:** always required, with a version (`RT-12`).
- **`TaskRequest.outputSchemaRef`:** **optional** (`RT-20`). When present, `id`
  must be non-empty.
- **`RuntimeResult`:** when `ok` is true, at least one of `output` / `model` /
  `usage` must be present. A truly empty successful result is
  indistinguishable from a silent failure. Design rule; see ambiguity A3.
- **`ModelIdentity.resolved`:** required to carry a value when
  `availability: available`, and a reason when `unavailable` (`RT-18`).
- **`ModelIdentity.resolution`:** always required when `model` is present.
- **`Usage.availability`:** always required when `usage` is present.
- **`RunError.retryable`:** always required.
- **`RuntimeCapabilities.streaming` / `.cancellation`:** present but pinned
  `false` (`RT-14`, `RT-15`).
- **Every present identifier/version is non-empty** (`RT-24`).

---

## 7. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| RT-2 | No contract type may reference a DSH type, name or session format. |
| RT-7 | The runtime must not validate, repair or reject output against `outputSchemaRef`. |
| RT-8 | A failure is never representable as an empty success. |
| RT-9 | No returned value, warning or error message contains credentials. |
| RT-10 | Context is passed in, never discovered: the runtime does not choose files or vault roots. |
| RT-13 | Requested and resolved model are separately representable, and a resolution status requires the data that proves it. |
| RT-18 | Absent usage or an absent resolved value is distinguishable from a real one, and requires an explicit reason. |
| RT-19 | The contract must be implementable by a non-DSH runtime without changing any core type, and carries no host-specific data. |
| RT-20 | A deterministic in-memory runtime must be trivially implementable for tests (no network required). |
| RT-21 | The interface moves text in and text out; it must not reference orchestration concepts (layers, plans, cards) or host-specific paths. |
| RT-23 | A `TaskRequest` is one logical task and must not be read as one API call. |
| RT-24 | Every present identifier, version and reference is non-empty. |

---

## 8. Example instances

### 8.1 Request (with a schema — the structured-module case)

```json
{
  "contractVersion": "agent-runtime/0.1",
  "schemaVersion": "0.1",
  "status": "draft",
  "taskRequest": {
    "taskId": "task-20260922T000000-001",
    "promptRef": { "id": "source-map.extract-units", "version": "1", "path": "prompts/source-map/extract-units.v1.md" },
    "input": [
      { "role": "context", "content": "[00:02:10] ...", "ref": { "sourceId": "src-lecture03-transcript" } }
    ],
    "outputSchemaRef": { "id": "source-map/0.1", "path": "schemas/source-map.v0.1.schema.json" },
    "model": { "requested": "example-model-large" },
    "reasoning": { "effort": "medium" },
    "limits": { "maxOutputTokens": 4000 }
  }
}
```

### 8.2 Success result

```json
{
  "ok": true,
  "result": {
    "taskId": "task-20260922T000000-001",
    "output": { "raw": "{\"units\":[ ... ]}", "format": "json" },
    "model": { "requested": "example-model-large", "resolved": { "availability": "available", "value": "example-model-large" }, "resolution": "matched" },
    "usage": { "inputTokens": 1830, "outputTokens": 604, "availability": "reported" },
    "durationMs": 8421,
    "warnings": []
  }
}
```

### 8.3 Result where the resolved model is not reportable

```json
{
  "ok": true,
  "result": {
    "taskId": "task-20260922T000000-002",
    "output": { "raw": "plain text answer", "format": "text" },
    "model": { "requested": "example-model-large", "resolved": { "availability": "unavailable", "reason": "Runtime does not expose the resolved model." }, "resolution": "unknown" }
  }
}
```

### 8.4 Failure result

```json
{
  "ok": false,
  "error": {
    "kind": "transport-failed",
    "message": "Runtime call failed before any output was produced.",
    "retryable": true,
    "stage": "transport"
  }
}
```

---

## 9. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Contract exposes a DSH session object. | `RT-2`, `RT-10`, `RT-19`. |
| F2 | `output.raw` is silently replaced by a validated object. | `RT-7`. |
| F3 | Empty output returned as `ok: true` with everything else absent. | `RT-8` design rule; see ambiguity A3. |
| F4 | Runtime substitutes a cheaper model without saying so. | `ModelIdentity.resolution` must be `substituted`, and both names are recorded (`RT-13`). |
| F5 | Request omits prompt version. | `promptRef.version` required (`RT-12`). |
| F6 | `resolved.availability: "available"` with no value. | Value required when available (`RT-18`). |
| F7 | Adapter chooses which vault files to read. | `RT-10`. |
| F8 | Contract grows a `retryWithBackoff()` helper or backoff curve parameters. | `RT-4`, `RT-16`: transport retry is adapter-internal. |
| F9 | Adapter silently rewrites the prompt on a bad answer. | That is semantic retry; it belongs to the orchestrator (`RT-4`). |
| F10 | Contract grows a `streamTokens()` because streaming "will be needed". | `RT-14`; `AGENTS.md` §18. |
| F11 | Error `details` contains the raw HTTP response with an Authorization header. | `RT-9`. |
| F12 | A credential or API key appears in `TaskRequest.metadata`. | `RT-22`. |
| F13 | A host install path is recorded in returned metadata. | `RT-11`: no such field exists; environment facts live in `docs/ENVIRONMENT.md`. |
| F14 | Pipeline branches on `runtimeKind === 'dsh'`. | `RT-6`: use declared capabilities. |
| F15 | `usage.cost` added back into core usage. | `RT-19`. |
| F16 | A task is assumed to be exactly one API call and usage is counted per call. | `RT-23`, `RT-3`. |

---

## 10. Known ambiguities and open questions

### Known ambiguities (accepted at v0.1)

- **A1 — where schema validation is implemented.** `RT-7` says "core", but no
  core module exists yet. Tracked as **OPEN**.
- **A2 — `runtimeKind` naming.** A neutral label is convenient, but a strict
  reading of `RT-19` might forbid naming any runtime. Needs a ruling.
- **A3 — "empty success" enforcement.** Not expressible cleanly in JSON Schema;
  needs a validator rule or remains unenforced.
- **A4 — decomposition of a logical task.** `RT-3` says a runtime may use
  several calls, but nothing lets a caller observe how many occurred. Possibly
  acceptable; possibly a missing usage dimension. Tracked as **OPEN**.
- **A5 — `input[].ref` shape** remains underspecified and may duplicate the
  SemanticCard `EvidenceRef` (tracked with `CH-09`).

### Open questions requiring human review

| ID | Question |
| --- | --- |
| Q1 | Is a deterministic "null runtime" mandated by the contract, or merely permitted? |
| Q2 | Should `runtimeKind` appear in the contract at all (`RT-19` tension)? |
| Q3 | Must a caller be able to see the transport-call count of a logical task? |
| Q4 | Where does semantic retry policy live concretely, and who records it? |
| Q5 | Is `outputSchemaRef`-optional at the boundary the right call, or should even exploratory tasks name a schema? |

---

## 11. Requirement index

| ID | Requirement |
| --- | --- |
| RT-1 | The contract is a minimum boundary, not a framework. |
| RT-2 | No core/pipeline/modules type may reference a DSH type, name or session format. |
| RT-3 | One `TaskRequest` is one logical runtime task, not one model API call. |
| RT-4 | Transport-safe retry belongs to the adapter; semantic retry belongs to the orchestrator. |
| RT-5 | A runtime must declare its identity and version. |
| RT-6 | Capabilities are declared and checked, never probed; consumers must not branch on the runtime name. |
| RT-7 | The runtime returns raw output and does not validate, repair or reject it against a schema. |
| RT-8 | Failures are classified and a failure is never representable as an empty success. |
| RT-9 | Credentials never appear in any request, result, warning or error. |
| RT-10 | Context is passed in; the runtime discovers nothing, including vault roots. |
| RT-11 | No contract field may carry host-specific information such as an install path. |
| RT-12 | A request always names a prompt and a prompt version. |
| RT-13 | Requested and resolved model are separately representable, and a resolution status requires proof. |
| RT-14 | Streaming is reserved and pinned unavailable at v0.1. |
| RT-15 | Cancellation is reserved and pinned unavailable at v0.1. |
| RT-16 | The boundary states, but does not implement, retry policy; the adapter must not make semantic changes to make a call succeed. |
| RT-17 | The reasoning configuration actually applied is reportable. |
| RT-18 | Absent usage or an absent resolved value is distinguishable from a real one and carries a reason. |
| RT-19 | Core runtime usage carries no provider cost; the contract carries no host-specific data. |
| RT-20 | `outputSchemaRef` is optional at the boundary; a structured module may require it. |
| RT-21 | The interface moves text in and text out and references no orchestration concept. |
| RT-22 | Credentials may not appear anywhere in the contract. |
| RT-23 | A logical task may be satisfied by any number of transport calls. |
| RT-24 | Every present identifier, version and reference is non-empty. |

### Reconciliation with the previous revision

| Previous | Now |
| --- | --- |
| `outputSchemaRef` required | optional at the boundary (`RT-20`) |
| `Usage.cost` | **removed** (`RT-19`) |
| `RuntimeMetadata.implementationNote` | **removed** (`RT-11`) |
| `RuntimeResult.runtimeKind` / `runtimeVersion` | removed; identity travels in metadata and the manifest |
| `ModelIdentity.resolved` as a bare string | tagged availability with value or reason (`RT-18`) |
| "one request = one model call" | one logical task, any number of calls (`RT-3`, `RT-23`) |
| retry ownership unstated | adapter = transport, orchestrator = semantic (`RT-4`, `RT-16`) |
| `RT-22` cited but undefined | defined (`RT-22`) |
