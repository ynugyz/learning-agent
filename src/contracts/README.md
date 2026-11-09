# `src/contracts/` — core contracts (M1A REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Four contracts designed in M1A and revised under human adjudication in REV1.
> **None has passed human review as a finished design.**
> Milestone M0 itself is still awaiting final human approval.
> TypeScript declaration files only — **no behaviour, no implementation.**

## Core runtime and evidence contracts

| Contract | Spec | JSON Schema | Type draft |
| --- | --- | --- | --- |
| SemanticCard v0.1 | [`specs/semantic-card-v0.1.md`](../../specs/semantic-card-v0.1.md) | [`schemas/semantic-card.v0.1.schema.json`](../../schemas/semantic-card.v0.1.schema.json) | [`semantic-card.ts`](semantic-card.ts) |
| SourceMap v0.1 | [`specs/source-map-v0.1.md`](../../specs/source-map-v0.1.md) | [`schemas/source-map.v0.1.schema.json`](../../schemas/source-map.v0.1.schema.json) | [`source-map.ts`](source-map.ts) |
| AgentRuntime Boundary v0.1 | [`specs/agent-runtime-v0.1.md`](../../specs/agent-runtime-v0.1.md) | [`schemas/agent-runtime.v0.1.schema.json`](../../schemas/agent-runtime.v0.1.schema.json) | [`agent-runtime.ts`](agent-runtime.ts) |
| RunManifest v0.1 | [`specs/run-manifest-v0.1.md`](../../specs/run-manifest-v0.1.md) | [`schemas/run-manifest.v0.1.schema.json`](../../schemas/run-manifest.v0.1.schema.json) | [`run-manifest.ts`](run-manifest.ts) |

## Knowledge-compilation drafts

These three declarations are the current draft handoff after `SourceMap`.
They keep the four required responsibilities explicit without freezing a Human
Note page taxonomy or renderer:

| Contract | Spec | JSON Schema | Type draft |
| --- | --- | --- | --- |
| LessonModel v0.1 | [`specs/lesson-model-v0.1.md`](../../specs/lesson-model-v0.1.md) | [`schemas/lesson-model.v0.1.schema.json`](../../schemas/lesson-model.v0.1.schema.json) | [`lesson-model.ts`](lesson-model.ts) |
| Alignment v0.2 | [`specs/alignment-v0.2.md`](../../specs/alignment-v0.2.md) | [`schemas/alignment.v0.2.schema.json`](../../schemas/alignment.v0.2.schema.json) | [`alignment.ts`](alignment.ts) |
| Alignment v0.1 (historical) | [`specs/alignment-v0.1.md`](../../specs/alignment-v0.1.md) | [`schemas/alignment.v0.1.schema.json`](../../schemas/alignment.v0.1.schema.json) | [`alignment.ts`](alignment.ts) |
| ChangePlan v0.1 | [`specs/change-plan-v0.1.md`](../../specs/change-plan-v0.1.md) | [`schemas/change-plan.v0.1.schema.json`](../../schemas/change-plan.v0.1.schema.json) | [`change-plan.ts`](change-plan.ts) |

`SourceMap` remains the evidence-understanding contract. The workflow and
cross-artifact validator live outside this directory because declarations
carry no behaviour.

Why `src/contracts/` and not `src/core/` or `src/runtime/`: the contracts are
shared by `core`, `pipeline`, `modules` and `runtime`. Putting them in `core`
would make `runtime` import product logic; putting them in `runtime` would make
`core` import the replaceable boundary. Either direction is an invented
dependency. See [`docs/DECISIONS.md`](../../docs/DECISIONS.md) D-0011 and D-0012.

## REV1 changes a reader should know about

| Change | Where |
| --- | --- |
| Card-level truth state replaced by a **maintenance** `maintenanceState` | `semantic-card.ts` |
| `claims[].note` **removed** — no field may carry note prose | `semantic-card.ts` |
| Every present identifier/anchor/fingerprint value is **non-empty** | all four |
| A machine inference may never be `verified` | `semantic-card.ts`, schema `if/then` |
| SourceMap **disposition / knowledgeRefs removed** | `source-map.ts` |
| `retentionClass` → `preservation` (fidelity priority, marked an inference) | `source-map.ts` |
| SourceMap observations are **package-local only** | `source-map.ts` |
| Source-presented status has **no `verified`** value | `source-map.ts` |
| Coverage can no longer claim completeness | `source-map.ts` |
| One `TaskRequest` = one **logical** task, not one API call | `agent-runtime.ts` |
| `outputSchemaRef` optional at the boundary | `agent-runtime.ts` |
| Core `Usage` carries **no cost** | `agent-runtime.ts` |
| `implementationNote` **removed** (host paths banned) | `agent-runtime.ts` |
| Manifest runtime carries **both** requested and resolved | `run-manifest.ts` |
| Absence is `unavailable` + `reason`, never silent | `run-manifest.ts` |
| `ManifestUsage` is **local**, not the runtime `Usage` | `run-manifest.ts` |
| `schemaVersion` required | all four |
| Card truth state gone; `verified` needs `basis: human-verified` + evidence (`SC-28`) | `semantic-card.ts` |
| `relations[].target` required (`SC-29`) | `semantic-card.ts` |
| `coverage` top-level required (`SM-27`) | `source-map.ts` |
| Success/failure union truly exclusive; no empty success (`RT-29`, `RT-30`) | `agent-runtime.ts` |
| Tagged-union branches mutually exclusive (`RM-23`) | `run-manifest.ts` |
| Fingerprint values are 64-hex SHA-256 (`RM-26`) | `common.ts` |

## M1A-V: executably verified

Since M1A-V these declarations are **compiled** and their contracts are
**validated against real fixtures**:

```powershell
npx --no-install tsc --noEmit        # 0 errors required
node tools/contract-tests.mjs        # 84 checks: 4 valid + 75 invalid + 4 spec/fixture identity + 1 declaration coverage
```

`tools/check.ps1` runs both automatically. Evidence — including what is still
**not** machine-verified (cross-artifact references, TS↔schema equivalence,
behaviour) — is in
[`docs/reviews/M1A_EXECUTABLE_VERIFICATION.md`](../../docs/reviews/M1A_EXECUTABLE_VERIFICATION.md).

## Shared primitives

`common.ts` holds only primitives used by **two or more** contracts with
**identical semantics**: `ReviewStatus`, `SchemaVersion`, `Fingerprint`,
`FingerprintAlg`. It exists to stop one contract importing another (the old
`CH-15`). It is deliberately **not** a "universal common" module — its header
lists what is excluded and why.

**No contract module may import another contract module**; `tools/check.ps1`
enforces this.

## Files here are declarations only

There is no `invoke()`, no loader, no coherence checker. Those are
implementation and are deliberately absent (`AGENTS.md` §18). Validation lives
in `tools/contract-tests.mjs`, outside this directory, because these files must
carry no behaviour.

## Consistency with the specs

Each type file carries `TODO(<ID>)` markers for the open questions and known
ambiguities recorded in its spec. Type files are **not** independently
authoritative: the spec is the design, the JSON Schema is the machine contract,
and these are the language-level mirror.

## Not yet done (deliberately)

- no runtime dependency or contract loader; TypeScript and Ajv remain
  dev-only tooling with a committed lockfile;
- `tsc --noEmit` is run by the repository checks; this verifies declaration
  syntax but does not prove semantic correctness;
- no schema-to-type consistency check exists — divergence is currently possible
  and undetected. A `CH-*` finding of this class was fixed by hand at REV1 and
  can regress;
- cross-artifact reference validation is limited to the knowledge-compilation
  drafts in `tools/validate-knowledge-compilation.mjs`; the older four core
  contracts still have no full cross-artifact validator;
- no runtime implementation.
