# `src/contracts/` — core contracts (M1A)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Four contracts designed in M1A. **None has passed human review.**
> Milestone M0 itself is still awaiting final human approval.
> TypeScript declaration files only — **no behaviour, no implementation.**

## The four contracts

| Contract | Spec | JSON Schema | Type draft |
| --- | --- | --- | --- |
| SemanticCard v0.1 | [`specs/semantic-card-v0.1.md`](../../specs/semantic-card-v0.1.md) | [`schemas/semantic-card.v0.1.schema.json`](../../schemas/semantic-card.v0.1.schema.json) | [`semantic-card.ts`](semantic-card.ts) |
| SourceMap v0.1 | [`specs/source-map-v0.1.md`](../../specs/source-map-v0.1.md) | [`schemas/source-map.v0.1.schema.json`](../../schemas/source-map.v0.1.schema.json) | [`source-map.ts`](source-map.ts) |
| AgentRuntime Boundary v0.1 | [`specs/agent-runtime-v0.1.md`](../../specs/agent-runtime-v0.1.md) | [`schemas/agent-runtime.v0.1.schema.json`](../../schemas/agent-runtime.v0.1.schema.json) | [`agent-runtime.ts`](agent-runtime.ts) |
| RunManifest v0.1 | [`specs/run-manifest-v0.1.md`](../../specs/run-manifest-v0.1.md) | [`schemas/run-manifest.v0.1.schema.json`](../../schemas/run-manifest.v0.1.schema.json) | [`run-manifest.ts`](run-manifest.ts) |

Why `src/contracts/` and not `src/core/`: the contracts are shared by `core`,
`pipeline`, `modules` and `runtime`. Putting them in `core` would make `runtime`
import `core`, inventing a dependency that has no reason to exist. This matches
the dependency rule in `docs/ARCHITECTURE.md` §4 and
`specs/agent-runtime-v0.1.md` §3: **everything may import `src/contracts`;
`core`/`pipeline`/`modules` may not import `src/runtime/dsh`.**

## Files here are declarations only

There is no `invoke()`, no loader, no validator, no coherence checker. Those are
implementation and are deliberately absent (`AGENTS.md` §18: do not build
features merely because they may be useful later).

## Dependency rule

`src/runtime/dsh` is the only place a concrete runtime may be named. A future
composition root that wires the adapter in is the only file permitted to import
it; that file does not exist yet.

## Consistency with the specs

Each type file carries `TODO(<ID>)` markers for the open questions and known
ambiguities recorded in its spec, so a reviewer can find them without leaving
the code. Type files are **not** independently authoritative: the spec is the
design, the JSON Schema is the machine contract, and these are the
language-level mirror.

## Not yet done (deliberately)

- no `typescript` dependency and no lockfile — `package.json` declares none;
- no type-checking has been run, so these files are **unverified**;
- no schema-to-type consistency check exists — divergence is currently possible
  and undetected;
- no runtime implementation.
