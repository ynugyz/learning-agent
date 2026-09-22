# AgentRuntime Boundary v0.1 — design specification

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Interface and capability boundary only. **No implementation, no DSH adapter.**
> This contract has **not passed human review**. Milestone M0 itself is still
> awaiting final human approval.

- Requirement IDs: `RT-1` … `RT-22`
- Related: `docs/ARCHITECTURE.md` §4, `AGENTS.md` §3.3, `specs/run-manifest-v0.1.md`
- Machine contract: `schemas/agent-runtime.v0.1.schema.json`
- Type draft: `src/contracts/agent-runtime.ts`
- Decision context: `docs/DECISIONS.md` D-0003 (pinning deferred), D-0005

---

## 1. Design rationale

### RT-1 — This is a boundary, not a framework

The deliverable is the **minimum vocabulary** that lets `src/pipeline` ask for
work without knowing who performs it. Every capability admitted here is a
lifetime commitment for every future runtime, so the bar for admission is high.
`AGENTS.md` §18 forbids building for hypothetical futures; this contract
therefore declares nothing "because it will probably be needed".

### RT-2 — DSH is replaceable, and must be seen to be replaceable

`AGENTS.md` §3.3: core modules must not depend on DSH internal
representations. The mechanical rule: **`src/core`, `src/pipeline`, `src/modules`
may import from `src/contracts` only** — never from `src/runtime/dsh`, and never
a DSH type. The adapter is the only place DSH exists.

### RT-3 — The runtime is a port, the pipeline is the owner

The core decides what runs, with which prompt version, against which schema;
the runtime executes. The runtime never decides pipeline order, never chooses
prompts, never validates business meaning and never writes knowledge. This
ownership split is what makes a second runtime feasible without redesign.

### RT-4 — A runtime that cannot declare its identity is unusable

Every experiment must record the runtime version actually used
(`AGENTS.md` §9, `docs/ENVIRONMENT.md`). Rather than have the pipeline probe
implementation details, the runtime must **declare** its identity and
capabilities up front (`RT-9`, `RT-10`).

### RT-5 — Capability negotiation, not feature probing

Consumers must be able to ask "can you do X?" **before** attempting X. This is
why capabilities are a declared inspection surface rather than something
discovered by trial and error. It also keeps the pipeline from containing
`if (runtimeName === 'dsh')` branches.

### RT-6 — Raw output is preserved; schema validation is not the runtime's job

A runtime that silently repairs or rejects malformed model output becomes an
undebuggable black box and hides the most valuable failure signal. The runtime
returns the model's output **as received**; the core validates it against the
schema. This keeps validation rules in one place, in the language of the
contract, and independent of the runtime.

### RT-7 — Failure must be classified upward, not collapsed

`SYS-TOOL-FAILURE` and "the model returned nothing usable" are different events
requiring different responses (`docs/ERROR_TAXONOMY.md`). An empty result and a
transport failure must never be indistinguishable to the caller.

### RT-8 — Metadata is returned; secrets are not

Model identity, token usage and duration are needed for the run manifest and
the reproducibility record. Credentials are **never** part of any returned
value, log line or artifact (`AGENTS.md` §3.2). The interface shape makes this
explicit rather than relying on discipline.

### RT-9 — Isolation is a closed loop

DSH-specific data may exist inside `src/runtime/dsh`, may be persisted there if
needed, and must be reduced to the neutral shapes here before crossing back.
If the pipeline genuinely needs a DSH concept, the fix is to add a **neutral**
concept to this contract — not to leak the DSH one.

---

## 2. Scope

**In scope:** the capability vocabulary; request/response shapes; error, usage
and model-metadata propagation; the DSH isolation rule; the replacement
boundary.

**Out of scope (deliberately, and explicitly):**

- the DSH adapter implementation — a later milestone;
- prompt text and prompt authoring (`prompts/`);
- pipeline orchestration order;
- schema validation logic (belongs to core, `RT-6`);
- streaming / token-by-token delivery (`RT-14`);
- cancellation and long-running job management (`RT-15`);
- tool use, function calling, multi-agent orchestration;
- cost accounting policy (usage is reported; deciding what it means is not here);
- credential storage or acquisition;
- retry policy (`RT-16`).

---

## 3. The boundary

```
src/pipeline  ──uses──▶  AgentRuntime (this contract, src/contracts)
                              ▲
                              │ implements
                         src/runtime/dsh   ──▶ DSH (external, user-installed)

src/core, src/modules ──uses──▶ src/contracts only
```

Dependency rules (`RT-2`, `RT-9`):

| From | May import |
| --- | --- |
| `src/core` | `src/contracts` |
| `src/modules` | `src/contracts` |
| `src/pipeline` | `src/contracts` |
| `src/runtime/dsh` | `src/contracts`, DSH itself |
| anything | ❌ `src/runtime/dsh` (except an explicit composition root) |

The one place allowed to name a concrete runtime is a **composition root** that
wires the adapter in (e.g. an entry point). That file is not in this milestone.

---

## 4. Capability table

Each capability is a request the pipeline may make. `Req` shows whether the
capability is **mandatory for any runtime** or optional-and-declarable.

| # | Capability | Mandatory? | Request | Unified result |
| --- | --- | --- | --- | --- |
| C1 | `structured-task` | **Yes** | `TaskRequest` | `RuntimeResult` whose `output` is raw model output, unvalidated (`RT-6`) |
| C2 | `identity` | **Yes** | — (property, not a call) | `RuntimeMetadata` (`RT-4`, `RT-10`) |
| C3 | `usage-reporting` | **Yes** | — (attached to C1 results) | `Usage` on `RuntimeResult`; fields may be `unknown` (`RT-18`) |
| C4 | `model-control` | Optional, declared | `TaskRequest.model` | `ModelIdentity` in `RuntimeResult.model` |
| C5 | `reasoning-control` | Optional, declared | `TaskRequest.reasoning` | Echoed in `RuntimeResult.reasoning` (`RT-17`) |
| C6 | `schema-conformance` | **Never claimed** | — | Not a runtime capability; see `RT-6` |
| C7 | `streaming` | Optional, **deferred** | — | Not in v0.1 (`RT-14`) |
| C8 | `cancellation` | Optional, **deferred** | — | Not in v0.1 (`RT-15`) |

### RT-9 — Capability declaration

`RuntimeCapabilities` is a small record of booleans/enums covering C4, C5, C7,
C8. A consumer checks it before relying on an optional capability. A consumer
must **not** branch on the runtime's name.

---

## 5. Field table

### 5.1 `RuntimeMetadata` (C2)

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `runtimeKind` | M | string | Neutral runtime family label, e.g. `"dsh"`. **The only place a runtime name legitimately appears.** |
| `runtimeVersion` | M | string | The version actually resolved (`AGENTS.md` §9). |
| `capabilities` | M | `RuntimeCapabilities` | Declared, not probed (`RT-5`). |
| `implementationNote` | O | string | Free-form, e.g. install location. Must not contain secrets or personal paths. |

### 5.2 `RuntimeCapabilities`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `structuredTask` | M | `true` (const) | Everyone must support C1. Declared for symmetry. |
| `modelSelection` | M | boolean | Whether `TaskRequest.model` is honoured. |
| `reasoningControl` | M | boolean | Whether `TaskRequest.reasoning` is honoured. |
| `usageReporting` | M | boolean | Whether `Usage` is populated beyond `unknown`. |
| `streaming` | M | `false` (const at v0.1) | Reserved; pinned false to prevent accidental reliance. |
| `cancellation` | M | `false` (const at v0.1) | Reserved; pinned false. |

### 5.3 `TaskRequest`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `taskId` | M | string | Correlates the call with a run manifest entry. |
| `promptRef` | M | object | Which prompt asset, by **version** (`RT-11`). |
| `promptRef.id` | M (cond.) | string | Prompt identifier, e.g. `source-map.extract-units`. |
| `promptRef.version` | M (cond.) | string | Prompt version. Required — an unversioned prompt breaks reproducibility. |
| `promptRef.path` | O | string | Repo-relative path of the prompt asset, if materialised as a file. |
| `promptText` | O | string | Inline prompt text, for tests and one-off probes. If present, `promptRef` is still required. |
| `input` | M | array | Context items handed to the model (`RT-12`). |
| `input[].role` | M (cond.) | enum | `system` / `context` / `instruction` / `example`. |
| `input[].content` | M (cond.) | string | The content. |
| `input[].ref` | O | object | Where the content came from, if from evidence. |
| `outputSchemaRef` | M | object | The schema the caller **will** validate against (`RT-6`). |
| `outputSchemaRef.id` | M (cond.) | string | Schema identifier, e.g. `source-map/0.1`. |
| `outputSchemaRef.path` | O | string | Repo-relative schema path. |
| `model` | O | object | Requested model (`RT-13`). |
| `model.requested` | O | string | Caller's request; may not be what actually runs. |
| `reasoning` | O | object | Requested reasoning configuration (`RT-17`). |
| `reasoning.effort` | O | enum | `minimal` / `low` / `medium` / `high` / `unspecified`. |
| `reasoning.notes` | O | string | Free-form non-secret configuration descriptor. |
| `limits` | O | object | Caller-imposed bounds. |
| `limits.maxOutputTokens` | O | number | Advisory; a runtime may not be able to enforce it. |
| `metadata` | O | object | Free-form caller tags. **Never** secrets (`RT-8`). |

### 5.4 `RuntimeResult`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `taskId` | M | string | Echoes the request. |
| `runtimeKind` | M | string | Which runtime produced this. |
| `runtimeVersion` | M | string | Version actually used, for the run manifest. |
| `output` | O | object | Raw model output, **unvalidated** (`RT-6`). |
| `output.raw` | M (cond.) | string | Text as received. |
| `output.format` | M (cond.) | enum | `json` / `text` / `unknown`. |
| `output.parseError` | O | string | Set when the text could not be parsed at all. Not a runtime failure per se. |
| `model` | O | `ModelIdentity` | See 5.5. |
| `reasoning` | O | object | What reasoning configuration was actually applied (`RT-17`). |
| `usage` | O | `Usage` | See 5.6. |
| `durationMs` | O | number | Wall-clock duration. |
| `warnings` | O | array of string | Non-fatal observations. Must not contain secrets. |

### 5.5 `ModelIdentity`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `requested` | O | string | What the caller asked for. |
| `resolved` | O | string | What actually ran. May differ; both are recorded (`RT-13`). |
| `provider` | O | string | Provider label. |
| `resolution` | M | enum | `matched` / `substituted` / `unknown` — makes silent substitution visible. |

### 5.6 `Usage`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `inputTokens` | O | number | |
| `outputTokens` | O | number | |
| `totalTokens` | O | number | |
| `availability` | M | enum | `reported` / `partial` / `unavailable` — absence must be distinguishable from zero (`RT-18`). |
| `cost` | O | object | Optional; **policy-free**. |
| `cost.amount` | M (cond.) | number | |
| `cost.currency` | M (cond.) | string | |

### 5.7 `RunError`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `kind` | M | enum | See 5.8. |
| `message` | M | string | Human-readable. Must not contain secrets. |
| `retryable` | M | boolean | Whether a retry could plausibly help. Policy lives elsewhere (`RT-16`). |
| `stage` | O | enum | Where it happened: `request` / `transport` / `model` / `decode` / `unknown`. |
| `details` | O | object | Neutral, non-secret extra context. **No DSH types** (`RT-9`). |

### 5.8 Error kinds (`RT-7`)

| Kind | Meaning |
| --- | --- |
| `runtime-unavailable` | The runtime cannot be reached or started. |
| `transport-failed` | The call failed in transit. |
| `model-refused` | The model declined or returned no usable completion. |
| `model-returned-empty` | A syntactically fine but semantically empty result. Individually classified so it is never conflated with a failure. |
| `output-unparseable` | Output existed but could not be decoded. |
| `option-unsupported` | A requested optional capability was not honoured. |
| `configuration-invalid` | The request itself is malformed. |
| `unknown` | Escape hatch. Its use should be visible in review. |

### 5.9 `RuntimeInvocationResult`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `ok` | M | boolean | Discriminant. |
| `result` | M (cond.) | `RuntimeResult` | Present when `ok` is true. |
| `error` | M (cond.) | `RunError` | Present when `ok` is false. |

A union rather than "result plus nullable error", so that callers cannot ignore
the failure branch (`RT-7`).

---

## 6. Required vs optional — with conditions

- **Mandatory for every runtime:** C1, C2, C3. C3 may report
  `availability: unavailable`, which is honest; omitting `usage` entirely is
  also allowed but must then be treated as unavailable, not zero.
- **`TaskRequest.promptRef`:** always required. `promptText` alone is
  insufficient because an unversioned prompt cannot be recorded in a run
  manifest (`RT-11`).
- **`TaskRequest.outputSchemaRef`:** always required. The caller must state
  what it will validate against, even though the runtime does not validate
  (`RT-6`).
- **`RuntimeResult.output`:** optional, because a failure result has none. When
  `ok` is true, at least one of `output` / `model` / `usage` must be present —
  a truly empty successful result is indistinguishable from a silent failure.
  This is a design rule (see ambiguity A3).
- **`ModelIdentity.resolution`:** always required when `model` is present.
  Silent substitution is the failure this field prevents.
- **`Usage.availability`:** always required when `usage` is present.
- **`RunError.retryable`:** always required. `RT-16` keeps retry **policy**
  out, but whether an error is even a candidate must be stated.
- **`RuntimeCapabilities.streaming` / `.cancellation`:** present but pinned
  `false` at v0.1 so a consumer cannot depend on them (`RT-14`, `RT-15`).

---

## 7. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| RT-2 | No contract type may reference a DSH type, name or session format. |
| RT-6 | The runtime must not validate, repair or reject output against `outputSchemaRef`. |
| RT-7 | A failure is never representable as an empty success. |
| RT-8 | No returned value, warning or error message contains credentials. |
| RT-10 | Identity and version are obtainable without performing work. |
| RT-11 | A request always names a prompt **and a prompt version**. |
| RT-12 | Context is passed in, never discovered: the runtime does not choose files or vault roots. |
| RT-13 | Requested and resolved model are separately representable. |
| RT-18 | Absent usage is distinguishable from zero usage. |
| RT-19 | The contract must be implementable by a non-DSH runtime without changing any core type. |
| RT-20 | A deterministic in-memory runtime must be trivially implementable for tests (no network required). |
| RT-21 | The interface must not reference orchestration concepts (layers, plans, cards); it moves text in, text out. |

---

## 8. Example instances

### 8.1 Request

```json
{
  "taskId": "task.2026-09-22T00-00-00.001",
  "promptRef": { "id": "source-map.extract-units", "version": "1", "path": "prompts/source-map/extract-units.v1.md" },
  "input": [
    { "role": "context", "content": "[00:02:10] ...", "ref": { "sourceId": "src.lecture03.transcript" } }
  ],
  "outputSchemaRef": { "id": "source-map/0.1", "path": "schemas/source-map.v0.1.schema.json" },
  "model": { "requested": "example-model-large" },
  "reasoning": { "effort": "medium" },
  "limits": { "maxOutputTokens": 4000 }
}
```

### 8.2 Success result (unvalidated output)

```json
{
  "taskId": "task.2026-09-22T00-00-00.001",
  "runtimeKind": "dsh",
  "runtimeVersion": "0.1.6-alpha.2",
  "output": { "raw": "{\"units\":[ ... ]}", "format": "json" },
  "model": { "requested": "example-model-large", "resolved": "example-model-large", "resolution": "matched" },
  "usage": { "inputTokens": 1830, "outputTokens": 604, "availability": "reported" },
  "durationMs": 8421,
  "warnings": []
}
```

### 8.3 Failure result

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
| F1 | Contract exposes a DSH session object. | `RT-2`/`RT-9`/`RT-19`. |
| F2 | `RuntimeResult.output.raw` is the *validated* object, with malformed output silently dropped. | `RT-6`: validation belongs to core; dropping it destroys the failure signal. |
| F3 | Empty output returned as `ok: true` with everything else absent. | `RT-7` design rule; see ambiguity A3 for the enforcement gap. |
| F4 | Runtime substitutes a cheaper model without saying so. | `ModelIdentity.resolution` must be `substituted`, and both names are recorded (`RT-13`). |
| F5 | Request omits prompt version, so an experiment cannot be reproduced. | `promptRef.version` required (`RT-11`). |
| F6 | `usage` omitted, interpreted downstream as zero tokens. | `Usage.availability` exists precisely to distinguish absent from zero (`RT-18`). |
| F7 | Adapter chooses which vault files to read. | `RT-12`: context is passed in; the runtime discovers nothing. |
| F8 | Contract grows a `retryWithBackoff()` helper. | `RT-16`: retry policy is out of scope. |
| F9 | Contract grows a `streamTokens()` because streaming "will be needed". | `RT-14`; `AGENTS.md` §18. |
| F10 | Error `details` contains the raw HTTP response with an Authorization header. | `RT-8`. |
| F11 | Pipeline branches on `runtimeKind === 'dsh'`. | `RT-5`: use declared capabilities; the only legitimate name use is metadata. |
| F12 | Core imports `src/runtime/dsh` for a type. | `RT-2`, dependency table in §3. |

---

## 10. Known ambiguities

- **A1 — Where schema validation lives, concretely.** `RT-6` says "core", but no
  core module exists yet. Unresolved until the first real module.
- **A2 — Is `runtimeKind` too much leakage?** A neutral label is convenient for
  the run manifest, but a strict reading of `RT-19` might forbid naming any
  runtime. Needs a ruling.
- **A3 — "Empty success" enforcement.** The design rule ("at least one of
  output/model/usage present") is not expressible cleanly in JSON Schema; it
  needs a validator rule or is unenforced.
- **A4 — Cost is included but policy-free.** Including `cost` may invite cost
  logic into the boundary. It could be removed until a consumer needs it.
- **A5 — `input[].ref` shape is underspecified**, so context provenance is
  weakly typed and may duplicate `EvidenceRef` from the SemanticCard contract.
  Possibly the same type should be shared.
- **A6 — Multi-call tasks.** Some pipeline steps may genuinely need several
  model calls. v0.1 models one call per request; whether a "task" may span
  calls is undecided.
- **A7 — `limits.maxOutputTokens` may be unenforceable**, so a request can
  appear to honour a bound it cannot.

---

## 11. Open questions requiring human review

| ID | Question | Why it needs a human |
| --- | --- | --- |
| Q1 | Do we want a deterministic "null runtime" mandated by the contract, or just permitted? | Affects test architecture. |
| Q2 | Should `runtimeKind` appear in results and manifests at all? | `RT-19` tension (A2). |
| Q3 | Is one model call per `TaskRequest` the right permanent granularity? | Bounds the whole pipeline's shape (A6). |
| Q4 | Should `cost` be in the boundary before any consumer needs it? | `AGENTS.md` §18. |
| Q5 | Who owns retry policy, and where does it live if not here? | Currently unassigned. |
| Q6 | Is `outputSchemaRef` required, or can the core remember the mapping? | Determines whether provenance of validation is in the request or ambient. |
| Q7 | How does the adapter obtain credentials without the contract ever naming them? | Security-relevant; needs an explicit design, not an omission. |

---

## 12. What this spec deliberately does not decide

- the DSH adapter's implementation, invocation mode and session mapping;
- whether DSH is pinned, and how (`D-0003`, still open);
- streaming, cancellation, tool use, multi-agent orchestration;
- retry/backoff policy;
- where validation is implemented (`A1`);
- prompt content.
