# `src/contracts/` — core contracts (M1A REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Four contracts designed in M1A and revised under human adjudication in REV1.
> **None has passed human review as a finished design.**
> Milestone M0 itself is still awaiting final human approval.
> TypeScript declaration files only — **no behaviour, no implementation.**

## The four contracts

| Contract | Spec | JSON Schema | Type draft |
| --- | --- | --- | --- |
| SemanticCard v0.1 | [`specs/semantic-card-v0.1.md`](../../specs/semantic-card-v0.1.md) | [`schemas/semantic-card.v0.1.schema.json`](../../schemas/semantic-card.v0.1.schema.json) | [`semantic-card.ts`](semantic-card.ts) |
| SourceMap v0.1 | [`specs/source-map-v0.1.md`](../../specs/source-map-v0.1.md) | [`schemas/source-map.v0.1.schema.json`](../../schemas/source-map.v0.1.schema.json) | [`source-map.ts`](source-map.ts) |
| AgentRuntime Boundary v0.1 | [`specs/agent-runtime-v0.1.md`](../../specs/agent-runtime-v0.1.md) | [`schemas/agent-runtime.v0.1.schema.json`](../../schemas/agent-runtime.v0.1.schema.json) | [`agent-runtime.ts`](agent-runtime.ts) |
| RunManifest v0.1 | [`specs/run-manifest-v0.1.md`](../../specs/run-manifest-v0.1.md) | [`schemas/run-manifest.v0.1.schema.json`](../../schemas/run-manifest.v0.1.schema.json) | [`run-manifest.ts`](run-manifest.ts) |

Why `src/contracts/` and not `src/core/` or `src/runtime/`: the contracts are
shared by `core`, `pipeline`, `modules` and `runtime`. Putting them in `core`
would make `runtime` import product logic; putting them in `runtime` would make
`core` import the replaceable boundary. Either direction is an invented
dependency. See [`docs/DECISIONS.md`](../../docs/DECISIONS.md) D-0011 and D-0012.

## REV1 changes a reader should know about

| Change | Where |
| --- | --- |
| Card-level truth state replaced by a **maintenance** `cardState` | `semantic-card.ts` |
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

## Files here are declarations only

There is no `invoke()`, no loader, no validator, no coherence checker. Those are
implementation and are deliberately absent (`AGENTS.md` §18).

## Consistency with the specs

Each type file carries `TODO(<ID>)` markers for the open questions and known
ambiguities recorded in its spec. Type files are **not** independently
authoritative: the spec is the design, the JSON Schema is the machine contract,
and these are the language-level mirror.

## Not yet done (deliberately)

- no `typescript` dependency and no lockfile — `package.json` declares none;
- **no type-checking has been run**, so these files are unverified by a compiler;
- no schema-to-type consistency check exists — divergence is currently possible
  and undetected. A `CH-*` finding of this class was fixed by hand at REV1 and
  can regress;
- no cross-artifact reference validator (see `CH-11`: JSON Schema validates one
  artifact at a time);
- no runtime implementation.
